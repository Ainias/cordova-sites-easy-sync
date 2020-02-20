export declare class FileTransferPromise {
    private downloadUrl;
    private storagePath;
    constructor(downloadUrl: any, storagePath?: any);
    download(): Promise<void>;
}
