export declare class FileWriterPromise {
    private fileWriter;
    private _isWritingPromise;
    constructor(fileWriter: any);
    write(data: any): Promise<unknown>;
}
