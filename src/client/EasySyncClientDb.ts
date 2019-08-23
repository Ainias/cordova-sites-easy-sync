import {App} from "cordova-sites/dist/cordova-sites";
import {BaseDatabase} from "cordova-sites-database/dist/cordova-sites-database";
import {ClientModel} from "./ClientModel";
import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";
import {EasySyncPartialModel} from "../shared/EasySyncPartialModel";
import {ClientPartialModel} from "./ClientPartialModel";

declare var JSObject;

export class EasySyncClientDb extends BaseDatabase {

    static BASE_MODEL;

    constructor(dbName) {
        super(dbName || "EasySync");
    }

    _createConnectionOptions(database) {
        JSObject.setPrototypeOf(EasySyncBaseModel, ClientModel);
        JSObject.setPrototypeOf(EasySyncPartialModel, ClientPartialModel);
        JSObject.setPrototypeOf(EasySyncBaseModel.prototype, ClientModel.prototype);
        JSObject.setPrototypeOf(EasySyncPartialModel.prototype, ClientPartialModel.prototype);

        return super._createConnectionOptions(database);
    }
}

EasySyncClientDb.BASE_MODEL = null;
App.addInitialization(async () => {
    await EasySyncClientDb.getInstance()._connectionPromise;
});