import {App} from "cordova-sites/dist/client";
import {BaseDatabase} from "cordova-sites-database/dist/cordova-sites-database";
import {ClientModel} from "./ClientModel";
import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";
import {EasySyncPartialModel} from "../shared/EasySyncPartialModel";
import {ClientPartialModel} from "./ClientPartialModel";
import {FileMedium} from "../shared/FileMedium";
import {ClientFileMedium} from "./ClientFileMedium";

declare var JSObject;

export class EasySyncClientDb extends BaseDatabase {

    static BASE_MODEL;
    static errorListener;

    constructor(dbName?) {
        super(dbName || "EasySync");
    }

    _createConnectionOptions(database) {
        JSObject.setPrototypeOf(EasySyncBaseModel, ClientModel);
        JSObject.setPrototypeOf(EasySyncPartialModel, ClientPartialModel);
        JSObject.setPrototypeOf(EasySyncBaseModel.prototype, ClientModel.prototype);
        JSObject.setPrototypeOf(EasySyncPartialModel.prototype, ClientPartialModel.prototype);
        JSObject.setPrototypeOf(FileMedium, ClientFileMedium);
        JSObject.setPrototypeOf(FileMedium.prototype, ClientFileMedium.prototype);

        let options = super._createConnectionOptions(database);
        options["migrationsTableName"] = "migrations";
        return options;
    }
}

EasySyncClientDb.BASE_MODEL = null;
App.addInitialization(async () => {
    await EasySyncClientDb.getInstance()._connectionPromise.catch(function (e) {
        if (typeof EasySyncClientDb.errorListener === "function") {
            return EasySyncClientDb.errorListener(...arguments)
        } else {
            throw(e);
        }
    });
});