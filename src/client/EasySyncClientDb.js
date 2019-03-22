import {App} from "cordova-sites";
import {BaseDatabase} from "cordova-sites-database";
import {ClientModel} from "./ClientModel";
import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";

export class EasySyncClientDb extends BaseDatabase {
    constructor(dbName) {
        super(dbName || "EasySync");
    }

    _createConnectionOptions(database) {
        Object.setPrototypeOf(EasySyncBaseModel, ClientModel);
        // Object.keys(BaseDatabase._models).forEach(modelName => {
        //     console.log(EasySyncBaseModel.isPrototypeOf(BaseDatabase._models[modelName]), "instanceof", BaseDatabase._models[modelName].getSchemaName());
        //     Object.setPrototypeOf(BaseDatabase._models[modelName], ClientModel);
        // });
        return super._createConnectionOptions(database);
    }
}

EasySyncClientDb.BASE_MODEL = null;
App.addInitialization(async () => {
    await EasySyncClientDb.getInstance()._connectionPromise;
});