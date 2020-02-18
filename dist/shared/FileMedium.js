"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EasySyncBaseModel_1 = require("./EasySyncBaseModel");
const BaseDatabase_1 = require("cordova-sites-database/dist/BaseDatabase");
class FileMedium extends EasySyncBaseModel_1.EasySyncBaseModel {
    static getColumnDefinitions() {
        let columns = super.getColumnDefinitions();
        columns["src"] = BaseDatabase_1.BaseDatabase.TYPES.STRING;
        return columns;
    }
    toString() {
        console.warn("to string called on FileMedium. Only for dependency. Please look inside your sourcecode");
        if (!this.src.startsWith("http") && !this.src.startsWith("//") && !this.src.startsWith("data")) {
            return FileMedium.PUBLIC_PATH + this.src + "?t=" + this.updatedAt.getTime();
        }
        return this.src;
    }
}
exports.FileMedium = FileMedium;
FileMedium.PUBLIC_PATH = "./";
FileMedium.SCHEMA_NAME = "FileMedium";
BaseDatabase_1.BaseDatabase.addModel(FileMedium);
//# sourceMappingURL=FileMedium.js.map