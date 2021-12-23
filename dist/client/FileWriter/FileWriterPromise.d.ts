export declare class FileWriterPromise {
    private fileWriter;
    private isWritingPromise;
    constructor(fileWriter: any);
    write(data: any): Promise<unknown>;
}
