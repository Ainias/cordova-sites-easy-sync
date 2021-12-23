import { EasySyncBaseModel } from '../shared/EasySyncBaseModel';
import { PromiseWithHandlers } from 'js-helper';
export declare class ClientFileMedium extends EasySyncBaseModel {
    protected src: any;
    protected saveOffline: boolean;
    protected isDownloaded: boolean;
    protected isDownloadedPromise: PromiseWithHandlers<boolean>;
    isDownloadedState(): Promise<boolean>;
    setLoaded(isLoaded: any): void;
    getUrlWithoutDownload(): string;
    getUrl(): string;
    save(): Promise<any>;
    static saveMany(entities: any): Promise<any>;
    static handleImages(entities: ClientFileMedium | ClientFileMedium[]): Promise<void>;
    static deleteMany(entities: ClientFileMedium[]): Promise<any>;
    getServerUrl(appendDate?: boolean): string;
}
