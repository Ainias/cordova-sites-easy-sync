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
const Helper_1 = require("js-helper/dist/shared/Helper");
const EasySyncBaseModel_1 = require("../shared/EasySyncBaseModel");
const crypto = require("crypto");
const fs = require("fs");
class ServerFileMedium extends EasySyncBaseModel_1.EasySyncBaseModel {
    setLoaded(isLoaded) {
        // @ts-ignore
        super.setLoaded(isLoaded);
        this._oldName = this.src;
    }
    save() {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield ServerFileMedium._handleImages(this);
            return _super.save.call(this);
        });
    }
    static saveMany(entities) {
        return __awaiter(this, void 0, void 0, function* () {
            yield ServerFileMedium._handleImages(entities);
            return this._database.saveEntity(entities);
        });
    }
    static _handleImages(entities) {
        return __awaiter(this, void 0, void 0, function* () {
            let isArray = Array.isArray(entities);
            if (!isArray) {
                entities = [entities];
            }
            yield Helper_1.Helper.asyncForEach(entities, (entity) => __awaiter(this, void 0, void 0, function* () { return entity.writeImgToFile(); }), true);
        });
    }
    writeImgToFile() {
        return __awaiter(this, void 0, void 0, function* () {
            let matches = this.src.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
            //file is already a url
            if (matches === null || matches.length !== 3) {
                debugger;
                return;
            }
            let name = this._oldName;
            if (Helper_1.Helper.isNull(name) || name.startsWith("data:")) {
                let seed = crypto.randomBytes(20);
                name = crypto
                    .createHash('sha1')
                    .update(seed)
                    .digest('hex')
                    + "." + matches[1];
            }
            return new Promise(r => fs.writeFile(ServerFileMedium.SAVE_PATH + name, matches[2], { encoding: "base64" }, r)).then(this.src = name);
        });
    }
}
exports.ServerFileMedium = ServerFileMedium;
ServerFileMedium.SAVE_PATH = "./img_";
//# sourceMappingURL=ServerFileMedium.js.map