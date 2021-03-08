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
exports.ClientFileMedium = void 0;
const EasySyncBaseModel_1 = require("../shared/EasySyncBaseModel");
const FileTransferPromise_1 = require("./FileWriter/FileTransferPromise");
const Helper_1 = require("js-helper/dist/shared/Helper");
const js_helper_1 = require("js-helper");
const FilePromise_1 = require("./FileWriter/FilePromise");
class ClientFileMedium extends EasySyncBaseModel_1.EasySyncBaseModel {
    constructor() {
        super(...arguments);
        this.saveOffline = true;
        this._isDownloaded = false;
        this._isDownloadedPromise = new js_helper_1.PromiseWithHandlers();
    }
    isDownloadedState() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._isDownloadedPromise;
        });
    }
    setLoaded(isLoaded) {
        super.setLoaded(isLoaded);
        FilePromise_1.FilePromise.open(this.src, { create: false }).then(() => this._isDownloaded = true).catch(e => {
            console.log("not downloaded, yet!");
            this._isDownloaded = false;
            // ClientFileMedium._handleImages(this)
        }).finally(() => {
            this._isDownloadedPromise.resolve(this._isDownloaded);
        });
    }
    getUrlWithoutDownload() {
        return "";
    }
    getUrl() {
        ClientFileMedium._handleImages(this);
        return this.getUrlWithoutDownload();
    }
    save() {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // await ClientFileMedium._handleImages(this);
            return _super.save.call(this);
        });
    }
    static saveMany(entities) {
        const _super = Object.create(null, {
            saveMany: { get: () => super.saveMany }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // await ClientFileMedium._handleImages(entities);
            return _super.saveMany.call(this, entities);
        });
    }
    static _handleImages(entities) {
        return __awaiter(this, void 0, void 0, function* () {
            let isArray = Array.isArray(entities);
            if (!isArray) {
                entities = [entities];
            }
            yield Helper_1.Helper.asyncForEach(entities, (entity) => __awaiter(this, void 0, void 0, function* () {
                if (entity.saveOffline && device.platform !== "browser" && !entity.src.startsWith("data") && !entity.src.startsWith("http") && !entity.src.startsWith("//")) {
                    yield new FileTransferPromise_1.FileTransferPromise(entity.getServerUrl(false), entity.src).download().catch(e => console.log(e));
                    entity._isDownloaded = true;
                }
            }), true);
        });
    }
}
exports.ClientFileMedium = ClientFileMedium;
//# sourceMappingURL=ClientFileMedium.js.map