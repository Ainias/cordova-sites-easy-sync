import {BaseDatabase, BaseModel} from "cordova-sites-database/dist/cordova-sites-database";
import {DataManager} from "cordova-sites/dist/client";
import {Helper} from "js-helper/dist/shared";

export class ClientModel extends BaseModel {

    static SAVE_PATH: string;
    static DELETE_PATH: string;

    static getColumnDefinitions() {
        let columns = super.getColumnDefinitions();
        if (columns["id"] && columns["id"]["generated"]) {
            columns["id"]["generated"] = false;
        }
        return columns;
    }

    static async _fromJson(jsonObjects, models, includeRelations) {
    }

    toJSON(includeFull?) {
    };

    async save(local?) {
        if (!local) {
            let values = this.toJSON();
            let data = await DataManager.send((<typeof ClientModel>this.constructor).SAVE_PATH, {
                "model": (<typeof ClientModel>this.constructor).getSchemaName(),
                "values": values
            });

            if (data.error) {
                throw new Error(data.error);
            }
            await (<typeof ClientModel>this.constructor)._fromJson(data, this, true);
        }
        return super.save();
    }

    async delete(local?) {
        if (!local) {
            let data = await DataManager.send((<typeof ClientModel>this.constructor).DELETE_PATH, {
                "model": (<typeof ClientModel>this.constructor).getSchemaName(),
                "id": this.id
            });
            if (data.error) {
                throw new Error(data.error);
            }
        }

        return super.delete();
    }

    static async saveMany(entities, local?) {
        if (!local) {
            let values = [];

            entities.forEach(entity => {
                values.push(entity.toJSON())
            });

            let data = await DataManager.send(this.SAVE_PATH, {
                "model": this.getSchemaName(),
                "values": values
            });

            if (data.error) {
                throw new Error(data.error);
            }
            entities = await this._fromJson(data, undefined, true);
        }

        return super.saveMany(entities);
    }

    static getSchemaDefinition() {
        const TYPES_FOR_DEFAULT_ESCAPING = [
            BaseDatabase.TYPES.MEDIUMTEXT,
            BaseDatabase.TYPES.STRING,
            BaseDatabase.TYPES.TEXT,
        ];

        let definitions = super.getSchemaDefinition();
        let columns = definitions["columns"];

        Object.keys(columns).forEach(column => {
            if (columns[column].type === BaseDatabase.TYPES.MEDIUMTEXT) {
                columns[column].type = BaseDatabase.TYPES.TEXT;
            }
            if (columns[column].type === BaseDatabase.TYPES.JSON) {
                columns[column].type = BaseDatabase.TYPES.SIMPLE_JSON;
            }

            if (TYPES_FOR_DEFAULT_ESCAPING.indexOf(columns[column].type) !== -1) {
                columns[column].escapeJS = Helper.nonNull(columns[column].escapeJS, true);
                columns[column].escapeHTML = Helper.nonNull(columns[column].escapeHTML, true);
            }
        });
        return definitions;
    }
}

ClientModel.SAVE_PATH = "/sync";
ClientModel.DELETE_PATH = "/sync/delete";