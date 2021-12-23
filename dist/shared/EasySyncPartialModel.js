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
exports.EasySyncPartialModel = void 0;
const EasySyncBaseModel_1 = require("./EasySyncBaseModel");
const _typeorm = require("typeorm");
const Helper_1 = require("js-helper/dist/shared/Helper");
const XSSHelper_1 = require("js-helper/dist/shared/XSSHelper");
const cordova_sites_database_1 = require("cordova-sites-database/dist/cordova-sites-database");
const typeorm = _typeorm;
// if (typeorm.default) {
//     typeorm = typeorm.default;
// }
class EasySyncPartialModel extends EasySyncBaseModel_1.EasySyncBaseModel {
    static findByIds(ids, relations) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.find({
                id: typeorm.In(ids),
            }, null, null, null, relations);
        });
    }
    static findById(id, relations) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.findOne({
                id,
            }, null, null, relations);
        });
    }
    static findByClientId(id, relations) {
        const _super = Object.create(null, {
            findById: { get: () => super.findById }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return _super.findById.call(this, id, relations);
        });
    }
    static findByClientIds(ids, relations) {
        const _super = Object.create(null, {
            findById: { get: () => super.findById }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return _super.findById.call(this, ids, relations);
        });
    }
    toJSON(includeFull) {
        const relations = this.constructor.getRelationDefinitions();
        const columns = this.constructor.getColumnDefinitions();
        const obj = {};
        Object.keys(columns).forEach((attribute) => {
            if (attribute !== 'clientId') {
                obj[attribute] = this[attribute];
            }
        });
        Object.keys(relations).forEach((relationName) => {
            if (includeFull === true) {
                obj[relationName] = this[relationName];
            }
            else if (Array.isArray(this[relationName])) {
                const ids = [];
                this[relationName].forEach((child) => child && ids.push(child.id));
                obj[relationName] = ids;
            }
            else if (this[relationName] instanceof cordova_sites_database_1.BaseModel) {
                obj[relationName] = this[relationName].id;
            }
            else {
                obj[relationName] = null;
            }
        });
        return obj;
    }
    static fromJson(jsonObjects, entities, includeRelations) {
        return __awaiter(this, void 0, void 0, function* () {
            entities = entities || [];
            const isArray = Array.isArray(jsonObjects);
            if (!isArray) {
                jsonObjects = [jsonObjects];
            }
            if (!Array.isArray(entities)) {
                entities = [entities];
            }
            const loadPromises = [];
            const addLoadPromises = [];
            jsonObjects.forEach((jsonObject, index) => {
                addLoadPromises.push(new Promise((resolve) => {
                    (() => __awaiter(this, void 0, void 0, function* () {
                        let entity = null;
                        if (entities.length > index) {
                            entity = entities[index];
                        }
                        else if (Helper_1.Helper.isNotNull(jsonObject.id)) {
                            entity = yield this.findById(jsonObject.id, this.getRelations());
                        }
                        if (entity === null) {
                            entity = new this();
                        }
                        if (!jsonObject.version) {
                            jsonObject.version = 1;
                        }
                        entities[index] = Object.assign(entity, jsonObject);
                        this.myHandleColumns(entities[index]);
                        this.myHandleRelations(entities[index], includeRelations, loadPromises);
                        resolve();
                    }))();
                }));
            });
            // addLoadPromises adds other loadPromises. Therefore wait until done, then wait for other
            yield Promise.all(addLoadPromises);
            yield Promise.all(loadPromises);
            if (!isArray) {
                entities = entities.length > 0 ? entities[0] : null;
            }
            return entities;
        });
    }
    static myHandleRelations(entity, includeRelations, loadPromises) {
        const relations = this.getRelationDefinitions();
        Object.keys(relations).forEach((relationName) => {
            const values = entity[relationName];
            if (typeof values === 'number' ||
                (Array.isArray(values) && values.length >= 1 && typeof values[0] === 'number')) {
                if (includeRelations === true) {
                    let loadPromise = null;
                    if (Array.isArray(values)) {
                        loadPromise = cordova_sites_database_1.BaseDatabase.getModel(relations[relationName].target).findByIds(values);
                    }
                    else {
                        loadPromise = cordova_sites_database_1.BaseDatabase.getModel(relations[relationName].target).findById(values);
                    }
                    loadPromises.push(loadPromise.then((value) => {
                        entity[relationName] = value;
                    }));
                }
                else if (includeRelations === false) {
                    if (relations[relationName].type === 'many-to-many' ||
                        relations[relationName].type === 'one-to-many') {
                        entity[relationName] = [];
                    }
                    else {
                        entity[relationName] = null;
                    }
                }
            }
        });
    }
    static myHandleColumns(entity) {
        const schemaDefinition = this.getSchemaDefinition();
        const { columns } = schemaDefinition;
        Object.keys(columns).forEach((columnName) => {
            if (columns[columnName].escapeHTML) {
                entity[columnName] = XSSHelper_1.XSSHelper.escapeHTML(entity[columnName]);
            }
            if (columns[columnName].escapeJS) {
                entity[columnName] = XSSHelper_1.XSSHelper.escapeJS(entity[columnName]);
            }
        });
    }
}
exports.EasySyncPartialModel = EasySyncPartialModel;
EasySyncPartialModel.CAN_BE_SYNCED = true;
//# sourceMappingURL=EasySyncPartialModel.js.map