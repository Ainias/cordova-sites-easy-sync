import { FileWriterPromise } from './FileWriterPromise';
export declare class FilePromise {
    private fileEntry;
    constructor(fileEntry: any);
    createWriter(): Promise<FileWriterPromise>;
    static open(file: any, options?: any): Promise<FilePromise>;
    static delete(file: any): Promise<FilePromise>;
}
