import {MenuSite} from "cordova-sites/dist/client/js/Context/MenuSite";
import {Form} from "cordova-sites/dist/client";
import {Helper} from "js-helper";
import {EasySyncBaseModel} from "../../shared/EasySyncBaseModel";

declare let CKEditor: any;

export class ModifyEntitySite extends MenuSite {
    protected _formSelector: string;
    protected _ckEditorConfig;
    private _entity;
    private _model: any;
    private _form: any;

    constructor(siteManager, view, model, menuTemplate) {
        super(siteManager, view, menuTemplate);
        this._formSelector = ".entity-form";
        this._ckEditorConfig = {
            ".editor": {
                toolbar: ['bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote'],
                removePlugins: ["Heading", "Image", "ImageCaption", "ImageStyle", "ImageToolbar", "ImageUpload", "Table", "TableToolbar", "MediaEmbed", "CKFinderUploadAdapter"],
                language: "de"
            }
        };

        this._entity = null;
        this._model = model;
    }

    async getEntityFromParameters(constructParameters) {

        if (!(this._model.prototype instanceof EasySyncBaseModel)) {
            throw {
                "error": "wrong class given! Expected EasySyncBaseModel, given " + this._model.name
            };
        }

        let entity = null;
        if (Helper.isSet(constructParameters, "id")) {
            entity = this._model.findById(constructParameters["id"], this._model.getRelations());
        }

        if (Helper.isNull(entity)) {
            entity = new this._model();
        }
        return entity;
    }

    async onConstruct(constructParameters) {
        let res = super.onConstruct(constructParameters);
        let entity = await this.getEntityFromParameters(constructParameters);
        if (entity !== null) {
            this.setEntity(entity);
        }
        return res;
    }

    async setEntity(entity) {
        this._entity = entity;

        await this._viewLoadedPromise;
        let values = await this.dehydrate(this._entity);
        if (Helper.isNotNull(values)) {
            await this._form.setValues(values);
        }
    }

    async hydrate(values, entity) {
        let schemaDefinition = entity.constructor.getSchemaDefinition();
        Object.keys(schemaDefinition.columns).forEach(column => {
            if (Helper.isSet(values, column)) {
                entity[column] = values[column];
            }
        });
        return entity;
    }

    async dehydrate(entity) {
        let values = {};
        let schemaDefinition = entity.constructor.getSchemaDefinition();
        Object.keys(schemaDefinition.columns).forEach(column => {
            if (Helper.isSet(entity, column)) {
                values[column] = entity[column];
            }
        });
        return values;
    }

    async validate(values, form) {
        return true;
    }

    saveListener() {
        this.finish();
    }

    async save(values){
        let entity = await this.hydrate(values, this._entity);
        await entity.save();
    }

    async onViewLoaded() {
        let res = super.onViewLoaded();

        this._form = new Form(this.findBy(this._formSelector), async values => {
            this.showLoadingSymbol();

            try {
                await this.save(values);
                this.saveListener();
            } catch (e) {
                console.error(e);
                this._form.setErrors({"error": e.message});
            } finally {
                this.removeLoadingSymbol();
            }
        });

        if (Helper.isNotNull(window["CKEditor"])) {
            Object.keys(this._ckEditorConfig).forEach(selector => {
                this.findBy(selector, true).forEach(async e => {
                    this._form.addEditor(await CKEditor.create(e, this._ckEditorConfig[selector]));
                });
            });
        }

        this._form.addValidator(async values => {
            return await this.validate(values, this._form);
        });

        return res;
    }
}
