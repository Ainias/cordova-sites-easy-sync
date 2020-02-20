import {Helper} from "js-helper/dist/shared/Helper";
import {FileWriterPromise} from "./FileWriterPromise";

declare const cordova;

export class FilePromise {

    private fileEntry: any;

    constructor(fileEntry: any) {
        this.fileEntry = fileEntry;
    }

    async createWriter(): Promise<FileWriterPromise> {
        return new Promise((res) => {
            this.fileEntry.createWriter(writer => {
                res(new FileWriterPromise(writer));
            });
        });
    }

    static async open(file, options?): Promise<FilePromise> {
        options = Helper.nonNull(options, {create: true, exclusive: false});

        return new Promise((r, rej) => {
            window["resolveLocalFileSystemURL"]("cdvfile://localhost/persistent/", dirEntry => {
                dirEntry.getFile(file, options, fileEntry => {
                    r(new FilePromise(fileEntry));
                }, rej);
            }, rej);
        });
    }
}