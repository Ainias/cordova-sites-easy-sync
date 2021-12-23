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
exports.ServerFileMedium = void 0;
const Helper_1 = require("js-helper/dist/shared/Helper");
const EasySyncBaseModel_1 = require("../shared/EasySyncBaseModel");
const stream_1 = require("stream");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const js_helper_1 = require("js-helper");
class ServerFileMedium extends EasySyncBaseModel_1.EasySyncBaseModel {
    setLoaded(isLoaded) {
        super.setLoaded(isLoaded);
        this.oldName = this.src;
    }
    save() {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield ServerFileMedium.handleImages(this);
            return _super.save.call(this);
        });
    }
    static saveMany(entities) {
        const _super = Object.create(null, {
            saveMany: { get: () => super.saveMany }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield ServerFileMedium.handleImages(entities);
            return _super.saveMany.call(this, entities);
        });
    }
    static handleImages(entities) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(entities)) {
                entities = [entities];
            }
            yield js_helper_1.ArrayHelper.asyncForEach(entities, (entity) => __awaiter(this, void 0, void 0, function* () { return entity.writeImgToFile(); }), true);
        });
    }
    writeImgToFile() {
        return __awaiter(this, void 0, void 0, function* () {
            const matches = this.src.match(/^data:([A-Za-z]+)\/([A-Za-z-+0-9/]+);base64,(.+)$/);
            // file is already a url
            if (matches === null || matches.length !== 4) {
                return Promise.resolve();
            }
            let name = this.oldName;
            if (Helper_1.Helper.isNull(name) || name.startsWith('data:') || name.startsWith('http') || name.trim() === '') {
                const seed = crypto_1.randomBytes(20);
                name = `${crypto_1.createHash('sha1').update(seed).digest('hex')}.${matches[2]}`;
                // + ".webp";
            }
            const dataBuffer = Buffer.from(matches[3], 'base64');
            const inputStream = new stream_1.Readable();
            let dataStream = new stream_1.PassThrough();
            const writeStream = fs_1.createWriteStream(ServerFileMedium.SAVE_PATH + name);
            if (ServerFileMedium.createDownscalePipe && ServerFileMedium.isImage(matches[2])) {
                dataStream = ServerFileMedium.createDownscalePipe();
            }
            inputStream.pipe(dataStream);
            inputStream.push(dataBuffer);
            inputStream.push(null);
            const resultPromise = new Promise((r) => {
                writeStream.addListener('finish', r);
            }).then((this.src = name));
            dataStream.pipe(writeStream);
            return resultPromise;
        });
    }
    static isImage(ending) {
        switch (ending.toLowerCase()) {
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'webp':
                return true;
            default:
                return false;
        }
    }
}
exports.ServerFileMedium = ServerFileMedium;
ServerFileMedium.SAVE_PATH = './img_';
ServerFileMedium.createDownscalePipe = null;
//# sourceMappingURL=ServerFileMedium.js.map