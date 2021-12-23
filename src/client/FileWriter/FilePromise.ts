import { Helper } from 'js-helper/dist/shared/Helper';
import { FileWriterPromise } from './FileWriterPromise';

export class FilePromise {
    private fileEntry: any;

    constructor(fileEntry: any) {
        this.fileEntry = fileEntry;
    }

    async createWriter(): Promise<FileWriterPromise> {
        return new Promise((res) => {
            this.fileEntry.createWriter((writer) => {
                res(new FileWriterPromise(writer));
            });
        });
    }

    static async open(file, options?): Promise<FilePromise> {
        options = Helper.nonNull(options, { create: true, exclusive: false });

        return new Promise((r, rej) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            window.resolveLocalFileSystemURL(
                'cdvfile://localhost/persistent/',
                (dirEntry) => {
                    dirEntry.getFile(
                        file,
                        options,
                        (fileEntry) => {
                            r(new FilePromise(fileEntry));
                        },
                        rej
                    );
                },
                rej
            );
        });
    }

    static async delete(file): Promise<FilePromise> {
        return new Promise((r, rej) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            window.resolveLocalFileSystemURL(
                'cdvfile://localhost/persistent/',
                (dirEntry) => {
                    dirEntry.getFile(
                        file,
                        { create: false },
                        (fileEntry) => {
                            fileEntry.remove(r, rej, r);
                        },
                        rej
                    );
                },
                rej
            );
        });
    }
}
