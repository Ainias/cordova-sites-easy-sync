"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilePromise = void 0;
const Helper_1 = require("js-helper/dist/shared/Helper");
const FileWriterPromise_1 = require("./FileWriterPromise");
class FilePromise {
    constructor(fileEntry) {
        this.fileEntry = fileEntry;
    }
    createWriter() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((res) => {
                this.fileEntry.createWriter(writer => {
                    res(new FileWriterPromise_1.FileWriterPromise(writer));
                });
            });
        });
    }
    static open(file, options) {
        return __awaiter(this, void 0, void 0, function* () {
            options = Helper_1.Helper.nonNull(options, { create: true, exclusive: false });
            return new Promise((r, rej) => {
                window["resolveLocalFileSystemURL"]("cdvfile://localhost/persistent/", dirEntry => {
                    dirEntry.getFile(file, options, fileEntry => {
                        r(new FilePromise(fileEntry));
                    }, rej);
                }, rej);
            });
        });
    }
}
exports.FilePromise = FilePromise;
//# sourceMappingURL=FilePromise.js.map