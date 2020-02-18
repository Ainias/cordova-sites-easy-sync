import {EasySyncBaseModel} from "./EasySyncBaseModel";
import {BaseDatabase} from "cordova-sites-database/dist/BaseDatabase";

export class FileMedium extends EasySyncBaseModel {

    static PUBLIC_PATH = "./";
    protected src: any;

    static getColumnDefinitions() {
        let columns = super.getColumnDefinitions();
        columns["src"] = BaseDatabase.TYPES.STRING;
        return columns;
    }

    toString(): string {
        console.warn("to string called on FileMedium. Only for dependency. Please look inside your sourcecode");
        if (!this.src.startsWith("http") && !this.src.startsWith("//") && !this.src.startsWith("data")) {
            return FileMedium.PUBLIC_PATH + this.src+"?t="+this.updatedAt.getTime();
        }
        return this.src;
    }

}

FileMedium.SCHEMA_NAME = "FileMedium";
BaseDatabase.addModel(FileMedium);