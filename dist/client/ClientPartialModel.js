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
exports.ClientPartialModel = void 0;
const EasySyncBaseModel_1 = require("../shared/EasySyncBaseModel");
const cordova_sites_database_1 = require("cordova-sites-database/dist/cordova-sites-database");
const client_1 = require("cordova-sites/dist/client");
const Helper_1 = require("js-helper/dist/shared/Helper");
class ClientPartialModel extends EasySyncBaseModel_1.EasySyncBaseModel {
    constructor() {
        super();
        this.clientId = null;
    }
    static getColumnDefinitions() {
        let columns = super.getColumnDefinitions();
        if (columns["id"]) {
            columns["id"]["primary"] = false;
            columns["id"]["generated"] = false;
            columns["id"]["nullable"] = true;
            columns["id"]["unique"] = true;
        }
        columns["clientId"] = {
            type: "integer",
            primary: true,
            generated: true,
        };
        return columns;
    }
    toJSON(includeFull) {
        let relations = this.constructor.getRelationDefinitions();
        let columns = this.constructor.getColumnDefinitions();
        let obj = {};
        Object.keys(columns).forEach(attribute => {
            if (attribute !== "clientId") {
                obj[attribute] = this[attribute];
            }
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
    save(local) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            local = Helper_1.Helper.nonNull(local, true);
            if (typeof this.clientId !== "number") {
                this.clientId = undefined;
            }
            if (!local) {
                let values = this.toJSON();
                let data = yield client_1.DataManager.send(this.constructor.SAVE_PATH, {
                    "model": this.constructor.getSchemaName(),
                    "values": values
                });
                if (data.success !== false) {
                    yield this.constructor._fromJson(data, this, true);
                }
            }
            return _super.save.call(this, true);
        });
    }
    delete(local) {
        const _super = Object.create(null, {
            delete: { get: () => super.delete }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!local) {
                let data = yield client_1.DataManager.send(this.constructor.DELETE_PATH, {
                    "model": this.constructor.getSchemaName(),
                    "id": this.id
                });
                if (data.success === false) {
                    throw new Error(data.errors);
                }
            }
            return _super.delete.call(this, true);
        });
    }
    static saveMany(entities, local) {
        const _super = Object.create(null, {
            saveMany: { get: () => super.saveMany }
        });
        return __awaiter(this, void 0, void 0, function* () {
            local = Helper_1.Helper.nonNull(local, true);
            entities.forEach(entity => {
                if (typeof entity.clientId !== "number") {
                    entity.clientId = undefined;
                }
            });
            if (!local) {
                let values = [];
                entities.forEach(entity => {
                    values.push(entity.toJSON());
                });
                let data = yield client_1.DataManager.send(this.SAVE_PATH, {
                    "model": this.getSchemaName(),
                    "values": values
                });
                if (data.success !== false) {
                    entities = yield this._fromJson(data, entities, true);
                }
            }
            return _super.saveMany.call(this, entities, true);
        });
    }
}
exports.ClientPartialModel = ClientPartialModel;
//# sourceMappingURL=ClientPartialModel.js.map