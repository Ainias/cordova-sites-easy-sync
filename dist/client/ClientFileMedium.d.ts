import { EasySyncBaseModel } from "../shared/EasySyncBaseModel";
export declare class ClientFileMedium extends EasySyncBaseModel {
    protected src: any;
    protected saveOffline: boolean;
    protected _isDownloaded: boolean;
    setLoaded(isLoaded: any): void;
    save(): Promise<any>;
    static saveMany(entities: any): Promise<any>;
    static _handleImages(entities: any): Promise<void>;
}
