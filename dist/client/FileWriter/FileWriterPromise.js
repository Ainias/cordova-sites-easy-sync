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
class FileWriterPromise {
    constructor(fileWriter) {
        this.fileWriter = fileWriter;
        this._isWritingPromise = Promise.resolve();
    }
    write(data) {
        return __awaiter(this, void 0, void 0, function* () {
            let promise = this._isWritingPromise.then(() => new Promise((res, rej) => {
                this.fileWriter.onwriteend = res;
                this.fileWriter.onerror = rej;
                this.fileWriter.write(data);
            }));
            this._isWritingPromise = promise.catch(console.error);
            return promise;
        });
    }
}
exports.FileWriterPromise = FileWriterPromise;
//# sourceMappingURL=FileWriterPromise.js.map