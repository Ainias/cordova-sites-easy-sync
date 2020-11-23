import {EasySyncBaseModel} from "./EasySyncBaseModel";
import {BaseDatabase} from "cordova-sites-database/dist/BaseDatabase";
import {Helper} from "js-helper/dist/shared/Helper";

declare const device;

export class FileMedium extends EasySyncBaseModel {

    static PUBLIC_PATH = "./";
    protected src: any;
    protected saveOffline: boolean = true;
    protected _isDownloaded: boolean = true;

    static getColumnDefinitions() {
        let columns = super.getColumnDefinitions();
        columns["src"] = BaseDatabase.TYPES.MEDIUMTEXT;
        columns["saveOffline"] = {type: BaseDatabase.TYPES.BOOLEAN, default: 1};
        return columns;
    }

    getServerUrl(appendDate?) {
        appendDate = Helper.nonNull(appendDate, true);
        if (!this.src.startsWith("http") && !this.src.startsWith("//") && !this.src.startsWith("data")) {
            let path = FileMedium.PUBLIC_PATH + this.src;
            if (appendDate) {
                path += "?t=" + new Date(this.updatedAt).getTime();
            }
            return path
        }
        return this.src;
    }

    getUrl() {
        if (device.platform !== "browser" && this.saveOffline && this._isDownloaded && Helper.isNotNull(this.id) && !this.src.startsWith("data") && !this.src.startsWith("http")) {
            return "cdvfile://localhost/persistent/" + this.src;
        } else {
            return this.getServerUrl();
        }
    }

    setSrc(src){
        this.src = src;
    }

    toString(): string {
        console.warn("to string called on FileMedium. Only for dependency. Please look inside your sourcecode");
        return this.getUrl();
    }

}

FileMedium.SCHEMA_NAME = "FileMedium";
BaseDatabase.addModel(FileMedium);