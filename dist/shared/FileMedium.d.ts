import { EasySyncBaseModel } from './EasySyncBaseModel';
export declare class FileMedium extends EasySyncBaseModel {
    static PUBLIC_PATH: string;
    protected src: any;
    protected saveOffline: boolean;
    protected isDownloaded: boolean;
    static getColumnDefinitions(): Record<string, string | import("cordova-sites-database").BDColumnType>;
    getServerUrl(appendDate?: any): any;
    getUrlWithoutDownload(): any;
    getUrl(): any;
    setSrc(src: any): void;
    getSrc(): any;
    toString(): string;
}
