import {BaseDatabase, BaseModel} from "cordova-sites-database";
import {DataManager} from "cordova-sites";

export class ClientModel extends BaseModel {
    static getColumnDefinitions() {
        let columns = super.getColumnDefinitions();
        if (columns["id"] && columns["id"]["generated"]) {
            columns["id"]["generated"] = false;
        }
        return columns;
    }

    static async _fromJson(jsonObjects, models, includeRelations) {
    }

    async save(local) {
        if (!local) {
            let values = this.toJSON();
            let data = await DataManager.send(ClientModel.SAVE_PATH, {
                "model": this.constructor.getSchemaName(),
                "values": values
            });

            if (data.error) {
                throw new Error(data.error);
            }
            await this.constructor._fromJson(data, this, true);
        }

        return super.save();
    }

    async delete(local){
        if (!local){
            let data = await DataManager.send(ClientModel.DELETE_PATH, {
                "model": this.constructor.getSchemaName(),
                "id": this.id
            });
            if (data.error){
                throw new Error(data.error);
            }
        }

        return super.delete();
    }

    static getSchemaDefinition() {
        let definitions = super.getSchemaDefinition();

        Object.keys(definitions.columns).forEach(column => {
            if (definitions.columns[column].type === BaseDatabase.TYPES.MEDIUMTEXT) {
                definitions.columns[column].type = BaseDatabase.TYPES.TEXT;
            }
            if (definitions.columns[column].type === BaseDatabase.TYPES.JSON) {
                definitions.columns[column].type = BaseDatabase.TYPES.SIMPLE_JSON;
            }
        });
        return definitions;
    }
}

ClientModel.SAVE_PATH = "/sync";
ClientModel.DELETE_PATH = "/sync/delete";