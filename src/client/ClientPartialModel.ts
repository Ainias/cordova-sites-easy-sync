import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";
import {BaseDatabase, BaseModel} from "cordova-sites-database/dist/cordova-sites-database";

export class ClientPartialModel extends EasySyncBaseModel{

    clientId: number;

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
            type: BaseDatabase.TYPES.INTEGER,
            primary: true
        };
        return columns;
    }

    toJSON(includeFull) {
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
}