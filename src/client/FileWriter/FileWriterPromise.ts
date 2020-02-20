export class FileWriterPromise {
    private fileWriter: any;
    private _isWritingPromise: Promise<any>;

    constructor(fileWriter: any) {
        this.fileWriter = fileWriter;
        this._isWritingPromise = Promise.resolve();
    }

    async write(data) {
        let promise = this._isWritingPromise.then(() => new Promise((res, rej) => {
            this.fileWriter.onwriteend = res;
            this.fileWriter.onerror = rej;

            this.fileWriter.write(data);
        }));
        this._isWritingPromise = promise.catch(console.error);
        return promise;
    }
}