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
exports.ClientModel = void 0;
const cordova_sites_database_1 = require("cordova-sites-database/dist/cordova-sites-database");
const client_1 = require("cordova-sites/dist/client");
const shared_1 = require("js-helper/dist/shared");
class ClientModel extends cordova_sites_database_1.BaseModel {
    static getColumnDefinitions() {
        const columns = super.getColumnDefinitions();
        if (columns.id && typeof columns.id !== 'string' && columns.id.generated) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            columns.id.generated = false;
        }
        return columns;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    static fromJson(jsonObjects, models, includeRelations) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    toJSON(includeFull) { }
    save(local) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!local) {
                const values = this.toJSON();
                const data = yield client_1.DataManager.send(this.constructor.SAVE_PATH, {
                    model: this.constructor.getSchemaName(),
                    values,
                });
                if (data.success === false) {
                    throw new Error(data.errors);
                }
                yield this.constructor.fromJson(data, this, true);
            }
            return _super.save.call(this);
        });
    }
    delete(local) {
        const _super = Object.create(null, {
            delete: { get: () => super.delete }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!local) {
                const data = yield client_1.DataManager.send(this.constructor.DELETE_PATH, {
                    model: this.constructor.getSchemaName(),
                    id: this.id,
                });
                if (data.success === false) {
                    throw new Error(data.errors);
                }
            }
            return _super.delete.call(this);
        });
    }
    static saveMany(entities, local) {
        const _super = Object.create(null, {
            saveMany: { get: () => super.saveMany }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!local) {
                const values = [];
                entities.forEach((entity) => {
                    values.push(entity.toJSON());
                });
                const data = yield client_1.DataManager.send(this.SAVE_PATH, {
                    model: this.getSchemaName(),
                    values,
                });
                if (data.success === false) {
                    throw new Error(data.errors);
                }
                entities = yield this.fromJson(data, undefined, true);
            }
            return _super.saveMany.call(this, entities);
        });
    }
    static getSchemaDefinition() {
        const TYPES_FOR_DEFAULT_ESCAPING = [
            cordova_sites_database_1.BaseDatabase.TYPES.MEDIUMTEXT,
            cordova_sites_database_1.BaseDatabase.TYPES.STRING,
            cordova_sites_database_1.BaseDatabase.TYPES.TEXT,
        ];
        const definitions = super.getSchemaDefinition();
        const { columns } = definitions;
        Object.keys(columns).forEach((column) => {
            if (columns[column].type === cordova_sites_database_1.BaseDatabase.TYPES.MEDIUMTEXT) {
                columns[column].type = cordova_sites_database_1.BaseDatabase.TYPES.TEXT;
            }
            if (columns[column].type === cordova_sites_database_1.BaseDatabase.TYPES.JSON) {
                columns[column].type = cordova_sites_database_1.BaseDatabase.TYPES.SIMPLE_JSON;
            }
            if (TYPES_FOR_DEFAULT_ESCAPING.indexOf(columns[column].type) !== -1) {
                columns[column].escapeJS = shared_1.Helper.nonNull(columns[column].escapeJS, true);
                columns[column].escapeHTML = shared_1.Helper.nonNull(columns[column].escapeHTML, true);
            }
        });
        return definitions;
    }
}
exports.ClientModel = ClientModel;
ClientModel.SAVE_PATH = '/sync';
ClientModel.DELETE_PATH = '/sync/delete';
//# sourceMappingURL=ClientModel.js.map