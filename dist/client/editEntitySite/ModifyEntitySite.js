"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModifyEntitySite = void 0;
const MenuSite_1 = require("cordova-sites/dist/client/js/Context/MenuSite");
const Form_1 = require("cordova-sites/dist/client/js/Form");
const js_helper_1 = require("js-helper");
const EasySyncBaseModel_1 = require("../../shared/EasySyncBaseModel");
class ModifyEntitySite extends MenuSite_1.MenuSite {
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
    getEntityFromParameters(constructParameters) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(this._model.prototype instanceof EasySyncBaseModel_1.EasySyncBaseModel)) {
                throw {
                    "error": "wrong class given! Expected EasySyncBaseModel, given " + this._model.name
                };
            }
            let entity = null;
            if (js_helper_1.Helper.isSet(constructParameters, "id")) {
                entity = this._model.findById(constructParameters["id"], this._model.getRelations());
            }
            if (js_helper_1.Helper.isNull(entity)) {
                entity = new this._model();
            }
            return entity;
        });
    }
    onConstruct(constructParameters) {
        const _super = Object.create(null, {
            onConstruct: { get: () => super.onConstruct }
        });
        return __awaiter(this, void 0, void 0, function* () {
            let res = _super.onConstruct.call(this, constructParameters);
            let entity = yield this.getEntityFromParameters(constructParameters);
            if (entity !== null) {
                this.setEntity(entity);
            }
            return res;
        });
    }
    setEntity(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            this._entity = entity;
            yield this._viewLoadedPromise;
            let values = yield this.dehydrate(this._entity);
            if (js_helper_1.Helper.isNotNull(values)) {
                yield this._form.setValues(values);
            }
        });
    }
    hydrate(values, entity) {
        return __awaiter(this, void 0, void 0, function* () {
            let schemaDefinition = entity.constructor.getSchemaDefinition();
            Object.keys(schemaDefinition.columns).forEach(column => {
                if (js_helper_1.Helper.isSet(values, column)) {
                    entity[column] = values[column];
                }
            });
            return entity;
        });
    }
    dehydrate(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            let values = {};
            let schemaDefinition = entity.constructor.getSchemaDefinition();
            Object.keys(schemaDefinition.columns).forEach(column => {
                if (js_helper_1.Helper.isSet(entity, column)) {
                    values[column] = entity[column];
                }
            });
            return values;
        });
    }
    validate(values, form) {
        return __awaiter(this, void 0, void 0, function* () {
            return true;
        });
    }
    saveListener() {
        this.finish();
    }
    save(values) {
        return __awaiter(this, void 0, void 0, function* () {
            let entity = yield this.hydrate(values, this._entity);
            yield entity.save();
        });
    }
    onViewLoaded() {
        const _super = Object.create(null, {
            onViewLoaded: { get: () => super.onViewLoaded }
        });
        return __awaiter(this, void 0, void 0, function* () {
            let res = _super.onViewLoaded.call(this);
            this._form = new Form_1.Form(this.findBy(this._formSelector), (values) => __awaiter(this, void 0, void 0, function* () {
                this.showLoadingSymbol();
                try {
                    yield this.save(values);
                    this.saveListener();
                }
                catch (e) {
                    console.error(e);
                    this._form.setErrors({ "error": e.message });
                }
                finally {
                    this.removeLoadingSymbol();
                }
            }));
            if (js_helper_1.Helper.isNotNull(window["CKEditor"])) {
                Object.keys(this._ckEditorConfig).forEach(selector => {
                    this.findBy(selector, true).forEach((e) => __awaiter(this, void 0, void 0, function* () {
                        this._form.addEditor(yield CKEditor.create(e, this._ckEditorConfig[selector]));
                    }));
                });
            }
            this._form.addValidator((values) => __awaiter(this, void 0, void 0, function* () {
                return yield this.validate(values, this._form);
            }));
            return res;
        });
    }
}
exports.ModifyEntitySite = ModifyEntitySite;
//# sourceMappingURL=ModifyEntitySite.js.map