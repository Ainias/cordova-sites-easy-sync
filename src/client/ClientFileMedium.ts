import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";
import {FileTransferPromise} from "./FileWriter/FileTransferPromise";
import {Helper} from "js-helper/dist/shared/Helper";
import {FilePromise} from "./FileWriter/FilePromise";

declare const device;

export class ClientFileMedium extends EasySyncBaseModel {

    protected src: any;
    protected saveOffline: boolean = true;
    protected _isDownloaded: boolean = true;

    setLoaded(isLoaded: any): void {
        // @ts-ignore
        super.setLoaded(isLoaded);
        this._isDownloaded = true;
        FilePromise.open(this.src, {create: false}).then(() => this._isDownloaded = true).catch(e => {
            console.log("not downloaded, yet!");
            this._isDownloaded = false;
            ClientFileMedium._handleImages(this)
        })
    }

    async save(): Promise<any> {
        await ClientFileMedium._handleImages(this);
        return super.save();
    }

    static async saveMany(entities) {
        await ClientFileMedium._handleImages(entities);
        return super.saveMany(entities);
    }

    static async _handleImages(entities) {
        let isArray = Array.isArray(entities);
        if (!isArray) {
            entities = [entities];
        }

        await Helper.asyncForEach(entities, async entity => {
            if (entity.saveOffline && device.platform !== "browser" && !entity.src.startsWith("data") && !entity.src.startsWith("http") && !entity.src.startsWith("//")) {
                await new FileTransferPromise(entity.getServerUrl(false), entity.src).download().catch(e => console.log(e));
                entity._isDownloaded = true;
            }
        }, true);
    }
}