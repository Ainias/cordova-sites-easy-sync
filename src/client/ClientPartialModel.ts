import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";
import {BaseDatabase, BaseModel} from "cordova-sites-database/dist/cordova-sites-database";
import {ClientModel} from "./ClientModel";
import {DataManager} from "cordova-sites/dist/cordova-sites";
import {Helper} from "js-helper/dist/shared/Helper";

export class ClientPartialModel extends EasySyncBaseModel {

    clientId: number;

    static SAVE_PATH: string;
    static DELETE_PATH: string;

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
        }
        columns["clientId"] = {
            type: "integer",
            primary: true,
            generated: true,
        };

        return columns;
    }

    toJSON(includeFull?) {
        let relations = (<typeof ClientPartialModel>this.constructor).getRelationDefinitions();
        let columns = (<typeof ClientPartialModel>this.constructor).getColumnDefinitions();

        let obj = {};
        Object.keys(columns).forEach(attribute => {
            if (attribute !== "clientId") {
                obj[attribute] = this[attribute];
            }
        });
        Object.keys(relations).forEach(relationName => {
            if (includeFull === true) {
                obj[relationName] = this[relationName];
            } else {
                if (Array.isArray(this[relationName])) {
                    let ids = [];
                    this[relationName].forEach(child => (child && ids.push(child.id)));
                    obj[relationName] = ids;
                } else if (this[relationName] instanceof BaseModel) {
                    obj[relationName] = this[relationName].id;
                } else {
                    obj[relationName] = null;
                }
            }
        });
        return obj;
    }

    async save(local?): Promise<any> {
        local = Helper.nonNull(local, true);

        if (typeof this.clientId !== "number"){
            this.clientId = undefined;
        }

        if (!local) {
            let values = this.toJSON();
            let data = await DataManager.send((<typeof ClientModel>this.constructor).SAVE_PATH, {
                "model": (<typeof ClientModel>this.constructor).getSchemaName(),
                "values": values
            });

            if (data.success !== false) {
                await (<typeof ClientModel>this.constructor)._fromJson(data, this, true);
            }
        }

        return super.save.call(this, true);
    }

    async delete(local?) {

        if (!local) {
            let data = await DataManager.send((<typeof ClientModel>this.constructor).DELETE_PATH, {
                "model": (<typeof ClientModel>this.constructor).getSchemaName(),
                "id": this.id
            });
            if (data.success === false) {
                throw new Error(data.errors);
            }
        }

        return super.delete.call(this, true);
    }

    static async saveMany(entities, local?) {
        local = Helper.nonNull(local, true);

        entities.forEach(entity => {
            if (typeof entity.clientId !== "number"){
                entity.clientId = undefined;
            }
        });

        if (!local) {
            let values = [];

            entities.forEach(entity => {
                values.push(entity.toJSON())
            });

            let data = await DataManager.send(this.SAVE_PATH, {
                "model": this.getSchemaName(),
                "values": values
            });

            if (data.success !== false) {
                entities = await this._fromJson(data, entities, true);
            }
        }

        return super.saveMany.call(this, entities, true);
    }
}