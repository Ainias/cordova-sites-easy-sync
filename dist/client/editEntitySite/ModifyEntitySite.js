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
const client_1 = require("cordova-sites/dist/client");
const js_helper_1 = require("js-helper");
const EasySyncBaseModel_1 = require("../../shared/EasySyncBaseModel");
class ModifyEntitySite extends MenuSite_1.MenuSite {
    constructor(siteManager, view, model, menuTemplate) {
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
    getEntityFromParameters(constructParameters) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(this.model.prototype instanceof EasySyncBaseModel_1.EasySyncBaseModel)) {
                // eslint-disable-next-line no-throw-literal
                throw {
                    error: `wrong class given! Expected EasySyncBaseModel, given ${this.model.name}`,
                };
            }
            let entity = null;
            if (js_helper_1.ObjectHelper.isSet(constructParameters, 'id')) {
                entity = this.model.findById(constructParameters.id, this.model.getRelations());
            }
            if (js_helper_1.Helper.isNull(entity)) {
                // eslint-disable-next-line new-cap
                entity = new this.model();
            }
            return entity;
        });
    }
    onConstruct(constructParameters) {
        const _super = Object.create(null, {
            onConstruct: { get: () => super.onConstruct }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const res = _super.onConstruct.call(this, constructParameters);
            const entity = yield this.getEntityFromParameters(constructParameters);
            if (entity !== null) {
                this.setEntity(entity);
            }
            return res;
        });
    }
    setEntity(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            this.entity = entity;
            yield this.getViewLoadedPromise();
            const values = yield this.dehydrate(this.entity);
            if (js_helper_1.Helper.isNotNull(values)) {
                yield this.form.setValues(values);
            }
        });
    }
    hydrate(values, entity) {
        return __awaiter(this, void 0, void 0, function* () {
            const schemaDefinition = this.model.getSchemaDefinition();
            Object.keys(schemaDefinition.columns).forEach((column) => {
                if (js_helper_1.Helper.isSet(values, column)) {
                    entity[column] = values[column];
                }
            });
            return entity;
        });
    }
    dehydrate(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            const values = {};
            const schemaDefinition = this.model.getSchemaDefinition();
            Object.keys(schemaDefinition.columns).forEach((column) => {
                if (js_helper_1.Helper.isSet(entity, column)) {
                    values[column] = entity[column];
                }
            });
            return values;
        });
    }
    // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-unused-vars
    validate(values, form) {
        return __awaiter(this, void 0, void 0, function* () {
            return true;
        });
    }
    onSaved() {
        this.finish();
    }
    save(values) {
        return __awaiter(this, void 0, void 0, function* () {
            const entity = yield this.hydrate(values, this.entity);
            yield entity.save();
        });
    }
    onViewLoaded() {
        const _super = Object.create(null, {
            onViewLoaded: { get: () => super.onViewLoaded }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const res = _super.onViewLoaded.call(this);
            this.form = new client_1.Form(this.findBy(this.formSelector), (values) => __awaiter(this, void 0, void 0, function* () {
                this.showLoadingSymbol();
                try {
                    yield this.save(values);
                    this.onSaved();
                }
                catch (e) {
                    console.error(e);
                    this.form.setErrors({ error: e.message });
                }
                finally {
                    this.removeLoadingSymbol();
                }
            }));
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (js_helper_1.Helper.isNotNull(window.CKEditor)) {
                Object.keys(this.ckEditorConfig).forEach((selector) => {
                    console.log('add CK-Editor', selector);
                    this.findBy(selector, true).forEach((e) => __awaiter(this, void 0, void 0, function* () {
                        this.form.addEditor(yield CKEditor.create(e, this.ckEditorConfig[selector]));
                    }));
                });
            }
            this.form.addValidator((values) => __awaiter(this, void 0, void 0, function* () {
                return this.validate(values, this.form);
            }));
            return res;
        });
    }
    getEntity() {
        return this.entity;
    }
}
exports.ModifyEntitySite = ModifyEntitySite;
//# sourceMappingURL=ModifyEntitySite.js.map