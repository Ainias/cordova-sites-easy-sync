"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EasySyncClientDb = void 0;
const client_1 = require("cordova-sites/dist/client");
const cordova_sites_database_1 = require("cordova-sites-database/dist/cordova-sites-database");
const ClientModel_1 = require("./ClientModel");
const EasySyncBaseModel_1 = require("../shared/EasySyncBaseModel");
const EasySyncPartialModel_1 = require("../shared/EasySyncPartialModel");
const ClientPartialModel_1 = require("./ClientPartialModel");
const FileMedium_1 = require("../shared/FileMedium");
const ClientFileMedium_1 = require("./ClientFileMedium");
class EasySyncClientDb extends cordova_sites_database_1.BaseDatabase {
    constructor(dbName) {
        super(dbName || 'EasySync');
    }
    createConnectionOptions(database) {
        JSObject.setPrototypeOf(EasySyncBaseModel_1.EasySyncBaseModel, ClientModel_1.ClientModel);
        JSObject.setPrototypeOf(EasySyncPartialModel_1.EasySyncPartialModel, ClientPartialModel_1.ClientPartialModel);
        JSObject.setPrototypeOf(EasySyncBaseModel_1.EasySyncBaseModel.prototype, ClientModel_1.ClientModel.prototype);
        JSObject.setPrototypeOf(EasySyncPartialModel_1.EasySyncPartialModel.prototype, ClientPartialModel_1.ClientPartialModel.prototype);
        JSObject.setPrototypeOf(FileMedium_1.FileMedium, ClientFileMedium_1.ClientFileMedium);
        JSObject.setPrototypeOf(FileMedium_1.FileMedium.prototype, ClientFileMedium_1.ClientFileMedium.prototype);
        const options = super.createConnectionOptions(database);
        options.migrationsTableName = 'migrations';
        return options;
    }
}
exports.EasySyncClientDb = EasySyncClientDb;
EasySyncClientDb.BASE_MODEL = null;
client_1.App.addInitialization(() => __awaiter(void 0, void 0, void 0, function* () {
    yield EasySyncClientDb.getInstance()
        .getConnectionPromise()
        .catch((...args) => {
        if (typeof EasySyncClientDb.errorListener === 'function') {
            return EasySyncClientDb.errorListener(...args);
        }
        throw args[0];
    });
}));
//# sourceMappingURL=EasySyncClientDb.js.map