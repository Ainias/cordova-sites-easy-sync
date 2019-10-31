import {MenuSite} from "cordova-sites/src/client/js/Context/MenuSite";
import {Form} from "cordova-sites/src/client/js/Form";
import {Helper} from "js-helper/src/shared/Helper";

export class ModifyEntitySite extends MenuSite {

    constructor(siteManager, view, menuTemplate) {
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

    async onViewLoaded() {
        let res = super.onViewLoaded();

        this._form = new Form(this.findBy(this._formSelector), async values => {
            this.showLoadingSymbol();

            try {
                let entity = await this.hydrate(values, this._entity);
                await entity.save();
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