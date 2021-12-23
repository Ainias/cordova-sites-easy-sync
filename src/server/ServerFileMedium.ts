import { Helper } from 'js-helper/dist/shared/Helper';
import { EasySyncBaseModel } from '../shared/EasySyncBaseModel';
import { PassThrough, Readable } from 'stream';

import { randomBytes, createHash } from 'crypto';
import { createWriteStream } from 'fs';
import { ArrayHelper } from 'js-helper';

export class ServerFileMedium extends EasySyncBaseModel {
    static SAVE_PATH = './img_';
    private oldName: any;
    protected src: any;

    static createDownscalePipe: () => PassThrough = null;

    setLoaded(isLoaded: any): void {
        super.setLoaded(isLoaded);
        this.oldName = this.src;
    }

    async save(): Promise<any> {
        await ServerFileMedium.handleImages(this);
        return super.save();
    }

    static async saveMany(entities) {
        await ServerFileMedium.handleImages(entities);
        return super.saveMany(entities);
    }

    private static async handleImages(entities: ServerFileMedium | ServerFileMedium[]) {
        if (!Array.isArray(entities)) {
            entities = [entities];
        }

        await ArrayHelper.asyncForEach(entities, async (entity) => entity.writeImgToFile(), true);
    }

    async writeImgToFile() {
        const matches = this.src.match(/^data:([A-Za-z]+)\/([A-Za-z-+0-9/]+);base64,(.+)$/);

        // file is already a url
        if (matches === null || matches.length !== 4) {
            return Promise.resolve();
        }

        let name = this.oldName;
        if (Helper.isNull(name) || name.startsWith('data:') || name.startsWith('http') || name.trim() === '') {
            const seed = randomBytes(20);
            name = `${createHash('sha1').update(seed).digest('hex')}.${matches[2]}`;
            // + ".webp";
        }

        const dataBuffer = Buffer.from(matches[3], 'base64');
        const inputStream = new Readable();
        let dataStream = new PassThrough();

        const writeStream = createWriteStream(ServerFileMedium.SAVE_PATH + name);
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
    }

    private static isImage(ending: string) {
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
