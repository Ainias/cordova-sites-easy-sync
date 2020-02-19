import {Helper} from "js-helper/dist/shared/Helper";
import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";
const crypto = require("crypto");
const fs = require("fs");

export class ServerFileMedium extends EasySyncBaseModel{

    static SAVE_PATH: string = "./img_";
    private _oldName: any;
    protected src: any;

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
        return this._database.saveEntity(entities);
    }

    static async _handleImages(entities){
        let isArray = Array.isArray(entities);
        if (!isArray){
            entities = [entities];
        }

        await Helper.asyncForEach(entities, async entity => entity.writeImgToFile(), true)
    }

    async writeImgToFile() {
        let matches = this.src.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);

        //file is already a url
        if (matches === null || matches.length !== 3) {
            return;
        }

        let name = this._oldName;
        if (Helper.isNull(name) || name.startsWith("data:")) {
            let seed = crypto.randomBytes(20);
            name = crypto
                    .createHash('sha1')
                    .update(seed)
                    .digest('hex')
                +"."+matches[1];
        }
        return new Promise(r => fs.writeFile(ServerFileMedium.SAVE_PATH+name, matches[2], {encoding:"base64"}, r)).then(this.src = name);
    }
}