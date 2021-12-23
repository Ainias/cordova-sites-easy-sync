export class FileWriterPromise {
    private fileWriter: any;
    private isWritingPromise: Promise<any>;

    constructor(fileWriter: any) {
        this.fileWriter = fileWriter;
        this.isWritingPromise = Promise.resolve();
    }

    async write(data) {
        const promise = this.isWritingPromise.then(
            () =>
                new Promise((res, rej) => {
                    this.fileWriter.onwriteend = res;
                    this.fileWriter.onerror = rej;

                    this.fileWriter.write(data);
                })
        );
        this.isWritingPromise = promise.catch(console.error);
        return promise;
    }
}
