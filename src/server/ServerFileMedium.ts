import {Helper} from "js-helper/dist/shared/Helper";
import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";
import {PassThrough, Readable} from "stream";

const crypto = require("crypto");
const fs = require("fs");

export class ServerFileMedium extends EasySyncBaseModel {

    static SAVE_PATH: string = "./img_";
    private _oldName: any;
    protected src: any;

    static createDownscalePipe: () => PassThrough = null;

    setLoaded(isLoaded: any): void {
        // @ts-ignore
        super.setLoaded(isLoaded);
        this._oldName = this.src;
    }

    async save(): Promise<any> {
        await ServerFileMedium._handleImages(this);
        return super.save();
    }

    static async saveMany(entities) {
        await ServerFileMedium._handleImages(entities);
        return super.saveMany(entities);
    }

    private static async _handleImages(entities) {
        let isArray = Array.isArray(entities);
        if (!isArray) {
            entities = [entities];
        }

        await Helper.asyncForEach(entities, async entity => entity.writeImgToFile(), true)
    }

    async writeImgToFile() {
        let matches = this.src.match(/^data:([A-Za-z]+)\/([A-Za-z-+0-9\/]+);base64,(.+)$/);

        //file is already a url
        if (matches === null || matches.length !== 4) {
            return;
        }

        let name = this._oldName;
        if (Helper.isNull(name) || name.startsWith("data:") || name.startsWith("http") || name.trim() === "") {
            let seed = crypto.randomBytes(20);
            name = crypto
                    .createHash('sha1')
                    .update(seed)
                    .digest('hex')
                + "." + matches[2];
                // + ".webp";
        }

        const dataBuffer = Buffer.from(matches[3], 'base64');
        const inputStream = new Readable();
        let dataStream = new PassThrough();

        const writeStream = fs.createWriteStream(ServerFileMedium.SAVE_PATH + name);
        if (ServerFileMedium.createDownscalePipe && ServerFileMedium.isImage(matches[2])) {
            dataStream = ServerFileMedium.createDownscalePipe();
        }
        inputStream.pipe(dataStream);

        inputStream.push(dataBuffer);
        inputStream.push(null);

        const resultPromise = new Promise(r => writeStream.addListener("finish", r)).then(this.src = name);
        dataStream.pipe(writeStream);
        return resultPromise;
        // return new Promise(r => fs.writeFile(ServerFileMedium.SAVE_PATH+name, , {encoding:"base64"}, r)).then(this.src = name);
    }

    private static isImage(ending: string) {
        switch (ending.toLowerCase()) {
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'webp':
                return true;
            default:
                return false
        }
    }
}
