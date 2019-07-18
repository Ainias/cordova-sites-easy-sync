import {App} from "cordova-sites";
import {BaseDatabase} from "cordova-sites-database";
import {ClientModel} from "./ClientModel";
import {EasySyncBaseModel} from "../../model";
import {EasySyncPartialModel} from "../shared/EasySyncPartialModel";
import {ClientPartialModel} from "./ClientPartialModel";

export class EasySyncClientDb extends BaseDatabase {
    constructor(dbName) {
        super(dbName || "EasySync");
    }

    _createConnectionOptions(database) {
        Object.setPrototypeOf(EasySyncBaseModel, ClientModel);
        Object.setPrototypeOf(EasySyncPartialModel, ClientPartialModel);
        Object.setPrototypeOf(EasySyncBaseModel.prototype, ClientModel.prototype);
        Object.setPrototypeOf(EasySyncPartialModel.prototype, ClientPartialModel.prototype);
        return super._createConnectionOptions(database);
    }
}

EasySyncClientDb.BASE_MODEL = null;
App.addInitialization(async () => {
    await EasySyncClientDb.getInstance()._connectionPromise;
});