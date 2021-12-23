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
        this.isDownloaded = false;
        this.isDownloadedPromise = new js_helper_1.PromiseWithHandlers();
    }
    isDownloadedState() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.isDownloadedPromise;
        });
    }
    setLoaded(isLoaded) {
        super.setLoaded(isLoaded);
        FilePromise_1.FilePromise.open(this.src, { create: false })
            .then(() => (this.isDownloaded = true))
            .catch((e) => {
            console.log('not downloaded, yet!', e);
            this.isDownloaded = false;
            // ClientFileMedium._handleImages(this)
        })
            .finally(() => {
            this.isDownloadedPromise.resolve(this.isDownloaded);
        });
    }
    // eslint-disable-next-line class-methods-use-this
    getUrlWithoutDownload() {
        return '';
    }
    getUrl() {
        ClientFileMedium.handleImages(this);
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
    static handleImages(entities) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(entities)) {
                entities = [entities];
            }
            yield js_helper_1.ArrayHelper.asyncForEach(entities, (entity) => __awaiter(this, void 0, void 0, function* () {
                if (entity.saveOffline &&
                    device.platform !== 'browser' &&
                    !entity.src.startsWith('data') &&
                    !entity.src.startsWith('http') &&
                    !entity.src.startsWith('//')) {
                    yield new FileTransferPromise_1.FileTransferPromise(entity.getServerUrl(false), entity.src)
                        .download()
                        .catch((e) => console.log(e));
                    entity.isDownloaded = true;
                }
            }), true);
        });
    }
    static deleteMany(entities) {
        const _super = Object.create(null, {
            deleteMany: { get: () => super.deleteMany }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (device.platform !== 'browser') {
                const res = yield Helper_1.Helper.asyncForEach(entities, (entity) => FilePromise_1.FilePromise.delete(entity.src).catch((e) => console.error(e)), true);
                console.log('res', res);
            }
            return _super.deleteMany.call(this, entities);
        });
    }
    // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-unused-vars
    getServerUrl(appendDate) {
        return '';
    }
}
exports.ClientFileMedium = ClientFileMedium;
//# sourceMappingURL=ClientFileMedium.js.map