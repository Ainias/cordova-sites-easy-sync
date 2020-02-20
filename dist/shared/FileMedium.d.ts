import { EasySyncBaseModel } from "./EasySyncBaseModel";
export declare class FileMedium extends EasySyncBaseModel {
    static PUBLIC_PATH: string;
    protected src: any;
    protected saveOffline: boolean;
    protected _isDownloaded: boolean;
    static getColumnDefinitions(): {
        id: {
            primary: boolean;
            type: any;
            generated: boolean;
        };
    };
    getServerUrl(appendDate?: any): any;
    getUrl(): any;
    toString(): string;
}
