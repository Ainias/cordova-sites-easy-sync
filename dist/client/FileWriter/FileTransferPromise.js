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
exports.FileTransferPromise = void 0;
const Helper_1 = require("js-helper/dist/shared/Helper");
const FilePromise_1 = require("./FilePromise");
const DataManager_1 = require("cordova-sites/dist/client/js/DataManager");
class FileTransferPromise {
    constructor(downloadUrl, storagePath) {
        this.downloadUrl = downloadUrl;
        if (Helper_1.Helper.isNull(storagePath)) {
            let parts = this.downloadUrl.split("/");
            if (parts.length > 0) {
                storagePath = parts[parts.length - 1];
            }
        }
        this.storagePath = storagePath;
    }
    download() {
        return __awaiter(this, void 0, void 0, function* () {
            let blob = DataManager_1.DataManager.fetchBlob(this.downloadUrl);
            let filePromise = yield FilePromise_1.FilePromise.open(this.storagePath);
            let fileWriter = yield filePromise.createWriter();
            // blob = await blob;
            yield fileWriter.write(yield blob);
        });
    }
}
exports.FileTransferPromise = FileTransferPromise;
//# sourceMappingURL=FileTransferPromise.js.map