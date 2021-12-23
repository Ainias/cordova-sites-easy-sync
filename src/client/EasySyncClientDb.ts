import { App } from 'cordova-sites/dist/client';
import { BaseDatabase } from 'cordova-sites-database/dist/cordova-sites-database';
import { ClientModel } from './ClientModel';
import { EasySyncBaseModel } from '../shared/EasySyncBaseModel';
import { EasySyncPartialModel } from '../shared/EasySyncPartialModel';
import { ClientPartialModel } from './ClientPartialModel';
import { FileMedium } from '../shared/FileMedium';
import { ClientFileMedium } from './ClientFileMedium';

declare let JSObject;

export class EasySyncClientDb extends BaseDatabase {
    static BASE_MODEL;
    static errorListener;

    constructor(dbName?) {
        super(dbName || 'EasySync');
    }

    createConnectionOptions(database) {
        JSObject.setPrototypeOf(EasySyncBaseModel, ClientModel);
        JSObject.setPrototypeOf(EasySyncPartialModel, ClientPartialModel);
        JSObject.setPrototypeOf(EasySyncBaseModel.prototype, ClientModel.prototype);
        JSObject.setPrototypeOf(EasySyncPartialModel.prototype, ClientPartialModel.prototype);
        JSObject.setPrototypeOf(FileMedium, ClientFileMedium);
        JSObject.setPrototypeOf(FileMedium.prototype, ClientFileMedium.prototype);

        const options = super.createConnectionOptions(database);
        options.migrationsTableName = 'migrations';
        return options;
    }
}

EasySyncClientDb.BASE_MODEL = null;
App.addInitialization(async () => {
    await EasySyncClientDb.getInstance()
        .getConnectionPromise()
        .catch((...args) => {
            if (typeof EasySyncClientDb.errorListener === 'function') {
                return EasySyncClientDb.errorListener(...args);
            }
            throw args[0];
        });
});
