import { MenuSite } from 'cordova-sites/dist/client/js/Context/MenuSite';
import { Form } from 'cordova-sites/dist/client';
import { Helper, ObjectHelper } from 'js-helper';
import { EasySyncBaseModel } from '../../shared/EasySyncBaseModel';

declare let CKEditor: any;

export class ModifyEntitySite<Model extends EasySyncBaseModel> extends MenuSite {
    protected formSelector: string;
    protected ckEditorConfig;
    private entity: Model;
    private readonly model: any;
    private form: any;

    constructor(siteManager, view, model, menuTemplate?) {
        super(siteManager, view, menuTemplate);
        this.formSelector = '.entity-form';
        this.ckEditorConfig = {
            '.editor': {
                toolbar: ['bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote'],
                removePlugins: [
                    'Heading',
                    'Image',
                    'ImageCaption',
                    'ImageStyle',
                    'ImageToolbar',
                    'ImageUpload',
                    'Table',
                    'TableToolbar',
                    'MediaEmbed',
                    'CKFinderUploadAdapter',
                ],
                language: 'de',
            },
        };

        this.entity = null;
        this.model = model;
    }

    async getEntityFromParameters(constructParameters): Promise<Model> {
        if (!(this.model.prototype instanceof EasySyncBaseModel)) {
            // eslint-disable-next-line no-throw-literal
            throw {
                error: `wrong class given! Expected EasySyncBaseModel, given ${this.model.name}`,
            };
        }

        let entity = null;
        if (ObjectHelper.isSet(constructParameters, 'id')) {
            entity = this.model.findById(constructParameters.id, this.model.getRelations());
        }

        if (Helper.isNull(entity)) {
            // eslint-disable-next-line new-cap
            entity = new this.model();
        }
        return entity;
    }

    async onConstruct(constructParameters) {
        const res = super.onConstruct(constructParameters);
        const entity = await this.getEntityFromParameters(constructParameters);
        if (entity !== null) {
            this.setEntity(entity);
        }
        return res;
    }

    async setEntity(entity: Model) {
        this.entity = entity;

        await this.getViewLoadedPromise();
        const values = await this.dehydrate(this.entity);
        if (Helper.isNotNull(values)) {
            await this.form.setValues(values);
        }
    }

    async hydrate(values: { [key: string]: string }, entity: Model) {
        const schemaDefinition = this.model.getSchemaDefinition();
        Object.keys(schemaDefinition.columns).forEach((column) => {
            if (Helper.isSet(values, column)) {
                entity[column] = values[column];
            }
        });
        return entity;
    }

    async dehydrate(entity: Model): Promise<{ [key: string]: string | number | Date }> {
        const values = {};
        const schemaDefinition = this.model.getSchemaDefinition();
        Object.keys(schemaDefinition.columns).forEach((column) => {
            if (Helper.isSet(entity, column)) {
                values[column] = entity[column];
            }
        });
        return values;
    }

    // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-unused-vars
    async validate(values, form) {
        return true;
    }

    onSaved() {
        this.finish();
    }

    async save(values) {
        const entity = await this.hydrate(values, this.entity);
        await entity.save();
    }

    async onViewLoaded() {
        const res = super.onViewLoaded();

        this.form = new Form(this.findBy(this.formSelector), async (values) => {
            this.showLoadingSymbol();

            try {
                await this.save(values);
                this.onSaved();
            } catch (e) {
                console.error(e);
                this.form.setErrors({ error: e.message });
            } finally {
                this.removeLoadingSymbol();
            }
        });

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (Helper.isNotNull(window.CKEditor)) {
            Object.keys(this.ckEditorConfig).forEach((selector) => {
                console.log('add CK-Editor', selector);
                this.findBy(selector, true).forEach(async (e) => {
                    this.form.addEditor(await CKEditor.create(e, this.ckEditorConfig[selector]));
                });
            });
        }

        this.form.addValidator(async (values) => {
            return this.validate(values, this.form);
        });

        return res;
    }

    getEntity() {
        return this.entity;
    }
}
