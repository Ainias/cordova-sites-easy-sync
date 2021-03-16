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
exports.EasySyncBaseModel = void 0;
const cordova_sites_database_1 = require("cordova-sites-database/dist/cordova-sites-database");
const shared_1 = require("js-helper/dist/shared");
class EasySyncBaseModel extends cordova_sites_database_1.BaseModel {
    constructor() {
        super();
        this._delegate = null;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.version = 1;
        this.deleted = false;
    }
    toJSON(includeFull) {
        let relations = this.constructor.getRelationDefinitions();
        let columns = this.constructor.getColumnDefinitions();
        let obj = {};
        Object.keys(columns).forEach(attribute => {
            obj[attribute] = this[attribute];
        });
        Object.keys(relations).forEach(relationName => {
            if (includeFull === true) {
                obj[relationName] = this[relationName];
            }
            else {
                if (Array.isArray(this[relationName])) {
                    let ids = [];
                    this[relationName].forEach(child => (child && ids.push(child.id)));
                    obj[relationName] = ids;
                }
                else if (this[relationName] instanceof cordova_sites_database_1.BaseModel) {
                    obj[relationName] = this[relationName].id;
                }
                else {
                    obj[relationName] = null;
                }
            }
        });
        return obj;
    }
    static getColumnDefinitions() {
        let columns = super.getColumnDefinitions();
        columns["createdAt"] = {
            type: cordova_sites_database_1.BaseDatabase.TYPES.DATE
        };
        columns["updatedAt"] = {
            type: cordova_sites_database_1.BaseDatabase.TYPES.DATE
        };
        columns["version"] = {
            type: cordova_sites_database_1.BaseDatabase.TYPES.INTEGER
        };
        columns["deleted"] = {
            type: cordova_sites_database_1.BaseDatabase.TYPES.BOOLEAN
        };
        return columns;
    }
    static _fromJson(jsonObjects, entities, includeRelations) {
        return __awaiter(this, void 0, void 0, function* () {
            entities = entities || [];
            let isArray = Array.isArray(jsonObjects);
            if (!isArray) {
                jsonObjects = [jsonObjects];
            }
            if (!Array.isArray(entities)) {
                entities = [entities];
            }
            let loadPromises = [];
            let addLoadPromises = [];
            jsonObjects.forEach((jsonObject, index) => {
                addLoadPromises.push(new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                    let entity = null;
                    if (entities.length > index) {
                        entity = entities[index];
                    }
                    else if (shared_1.Helper.isNotNull(jsonObject.id)) {
                        entity = yield this.findById(jsonObject.id, this.getRelations());
                    }
                    if (entity === null) {
                        entity = new this();
                    }
                    if (!jsonObject.version && jsonObject.version !== 0) {
                        jsonObject.version = 1;
                    }
                    entities[index] = Object.assign(entity, jsonObject);
                    this._handleColumns(entities[index]);
                    this._handleRelations(entities[index], includeRelations, loadPromises);
                    resolve();
                })));
            });
            //addLoadPromises adds other loadPromises. Therefore wait until done, then wait for other
            yield Promise.all(addLoadPromises);
            yield Promise.all(loadPromises);
            if (!isArray) {
                entities = (entities.length > 0) ? entities[0] : null;
            }
            return entities;
        });
    }
    static _handleRelations(entity, includeRelations, loadPromises) {
        let relations = this.getRelationDefinitions();
        Object.keys(relations).forEach(relationName => {
            let values = entity[relationName];
            if (typeof values === "number" || (Array.isArray(values) && values.length >= 1 && typeof values[0] === "number")) {
                if (includeRelations === true) {
                    let loadPromise = null;
                    if (Array.isArray(values)) {
                        loadPromise = cordova_sites_database_1.BaseDatabase.getModel(relations[relationName].target).findByIds(values);
                    }
                    else {
                        loadPromise = cordova_sites_database_1.BaseDatabase.getModel(relations[relationName].target).findById(values);
                    }
                    loadPromises.push(loadPromise.then(value => {
                        entity[relationName] = value;
                    }));
                }
                else if (includeRelations === false) {
                    if (relations[relationName].type === "many-to-many" || relations[relationName].type === "one-to-many") {
                        entity[relationName] = [];
                    }
                    else {
                        entity[relationName] = null;
                    }
                }
            }
        });
    }
    static _handleColumns(entity) {
        let schemaDefinition = this.getSchemaDefinition();
        let columns = schemaDefinition["columns"];
        Object.keys(columns).forEach(columnName => {
            if (columns[columnName].escapeHTML) {
                entity[columnName] = shared_1.XSSHelper.escapeHTML(entity[columnName]);
            }
            if (columns[columnName].escapeJS) {
                entity[columnName] = shared_1.XSSHelper.escapeJS(entity[columnName]);
            }
            if (columns[columnName].type === cordova_sites_database_1.BaseDatabase.TYPES.DATE
                && !(entity[columnName] instanceof Date || shared_1.Helper.isNull(entity[columnName]))) {
                entity[columnName] = new Date(entity[columnName]);
            }
        });
    }
    static prepareSync(entities) {
        return entities;
    }
}
exports.EasySyncBaseModel = EasySyncBaseModel;
EasySyncBaseModel.delegateClass = null;
EasySyncBaseModel.CAN_BE_SYNCED = true;
//# sourceMappingURL=EasySyncBaseModel.js.map