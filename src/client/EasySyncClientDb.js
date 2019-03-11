import {App} from "cordova-sites";
import {BaseDatabase} from "cordova-sites-database";
import {ClientModel} from "./ClientModel";

export class EasySyncClientDb extends BaseDatabase {
    constructor() {
        super("EasySync");
    }

    _createConnectionOptions(database) {
        Object.setPrototypeOf(ClientModel, EasySyncClientDb.BASE_MODEL);
        Object.keys(BaseDatabase._models).forEach(modelName => {
            Object.setPrototypeOf(BaseDatabase._models[modelName], ClientModel);
        });
        return super._createConnectionOptions(database);
    }
}

EasySyncClientDb.BASE_MODEL = null;
App.addInitialization(async () => {
    await EasySyncClientDb.getInstance()._connectionPromise;
});