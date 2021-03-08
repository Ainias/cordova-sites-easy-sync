import { EasySyncBaseModel } from "../shared/EasySyncBaseModel";
import { PromiseWithHandlers } from "js-helper";
export declare class ClientFileMedium extends EasySyncBaseModel {
    protected src: any;
    protected saveOffline: boolean;
    protected _isDownloaded: boolean;
    protected _isDownloadedPromise: PromiseWithHandlers<boolean>;
    isDownloadedState(): Promise<boolean>;
    setLoaded(isLoaded: any): void;
    getUrlWithoutDownload(): string;
    getUrl(): string;
    save(): Promise<any>;
    static saveMany(entities: any): Promise<any>;
    static _handleImages(entities: any): Promise<void>;
}
