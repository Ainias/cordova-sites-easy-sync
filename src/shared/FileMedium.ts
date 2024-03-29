import { EasySyncBaseModel } from './EasySyncBaseModel';
import { BaseDatabase } from 'cordova-sites-database/dist/BaseDatabase';
import { Helper } from 'js-helper/dist/shared/Helper';

declare const device;

export class FileMedium extends EasySyncBaseModel {
    static PUBLIC_PATH = './';
    protected src: any;
    protected saveOffline = true;
    protected isDownloaded = false;

    static getColumnDefinitions() {
        const columns = super.getColumnDefinitions();
        columns.src = BaseDatabase.TYPES.MEDIUMTEXT;
        columns.saveOffline = { type: BaseDatabase.TYPES.BOOLEAN, default: 1 };
        return columns;
    }

    getServerUrl(appendDate?) {
        appendDate = Helper.nonNull(appendDate, true);
        if (
            !Helper.imageUrlIsEmpty(this.src) &&
            !this.src.startsWith('http') &&
            !this.src.startsWith('//') &&
            !this.src.startsWith('data')
        ) {
            let path = FileMedium.PUBLIC_PATH + this.src;
            if (appendDate) {
                path += `?t=${new Date(this.updatedAt).getTime()}`;
            }
            return path;
        }
        return this.src;
    }

    getUrlWithoutDownload() {
        if (
            device.platform !== 'browser' &&
            this.saveOffline &&
            this.isDownloaded &&
            Helper.isNotNull(this.id) &&
            !this.src.startsWith('data') &&
            !this.src.startsWith('http')
        ) {
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

    toString(): string {
        console.warn('to string called on FileMedium. Only for dependency. Please look inside your sourcecode');
        return this.getUrl();
    }
}

FileMedium.SCHEMA_NAME = 'FileMedium';
BaseDatabase.addModel(FileMedium);
