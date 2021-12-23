"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMedium = void 0;
const EasySyncBaseModel_1 = require("./EasySyncBaseModel");
const BaseDatabase_1 = require("cordova-sites-database/dist/BaseDatabase");
const Helper_1 = require("js-helper/dist/shared/Helper");
class FileMedium extends EasySyncBaseModel_1.EasySyncBaseModel {
    constructor() {
        super(...arguments);
        this.saveOffline = true;
        this.isDownloaded = false;
    }
    static getColumnDefinitions() {
        const columns = super.getColumnDefinitions();
        columns.src = BaseDatabase_1.BaseDatabase.TYPES.MEDIUMTEXT;
        columns.saveOffline = { type: BaseDatabase_1.BaseDatabase.TYPES.BOOLEAN, default: 1 };
        return columns;
    }
    getServerUrl(appendDate) {
        appendDate = Helper_1.Helper.nonNull(appendDate, true);
        if (!Helper_1.Helper.imageUrlIsEmpty(this.src) &&
            !this.src.startsWith('http') &&
            !this.src.startsWith('//') &&
            !this.src.startsWith('data')) {
            let path = FileMedium.PUBLIC_PATH + this.src;
            if (appendDate) {
                path += `?t=${new Date(this.updatedAt).getTime()}`;
            }
            return path;
        }
        return this.src;
    }
    getUrlWithoutDownload() {
        if (device.platform !== 'browser' &&
            this.saveOffline &&
            this.isDownloaded &&
            Helper_1.Helper.isNotNull(this.id) &&
            !this.src.startsWith('data') &&
            !this.src.startsWith('http')) {
            return `cdvfile://localhost/persistent/${this.src}`;
        }
        return this.getServerUrl();
    }
    getUrl() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (typeof super.getUrl === 'function') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return super.getUrl();
        }
        return this.getUrlWithoutDownload();
    }
    setSrc(src) {
        this.src = src;
    }
    getSrc() {
        return this.src;
    }
    toString() {
        console.warn('to string called on FileMedium. Only for dependency. Please look inside your sourcecode');
        return this.getUrl();
    }
}
exports.FileMedium = FileMedium;
FileMedium.PUBLIC_PATH = './';
FileMedium.SCHEMA_NAME = 'FileMedium';
BaseDatabase_1.BaseDatabase.addModel(FileMedium);
//# sourceMappingURL=FileMedium.js.map