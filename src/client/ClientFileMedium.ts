import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";
import {FileTransferPromise} from "./FileWriter/FileTransferPromise";
import {Helper} from "js-helper/dist/shared/Helper";
import {PromiseWithHandlers} from "js-helper";
import {FilePromise} from "./FileWriter/FilePromise";
import {FileMedium} from "../shared/FileMedium";

declare const device;

export class ClientFileMedium extends EasySyncBaseModel {

    protected src: any;
    protected saveOffline: boolean = true;
    protected _isDownloaded: boolean = false;
    protected _isDownloadedPromise: PromiseWithHandlers<boolean> = new PromiseWithHandlers()

    async isDownloadedState(){
        return this._isDownloadedPromise;
    }

    setLoaded(isLoaded: any): void {
        super.setLoaded(isLoaded);
        FilePromise.open(this.src, {create: false}).then(() => this._isDownloaded = true).catch(e => {
            console.log("not downloaded, yet!");
            this._isDownloaded = false;
            // ClientFileMedium._handleImages(this)
        }).finally(() => {
            this._isDownloadedPromise.resolve(this._isDownloaded);
        })
    }

    getUrlWithoutDownload() {
        return "";
    }

    getUrl() {
        ClientFileMedium._handleImages(this);
        return this.getUrlWithoutDownload();
    }

    async save(): Promise<any> {
        // await ClientFileMedium._handleImages(this);
        return super.save();
    }

    static async saveMany(entities) {
        // await ClientFileMedium._handleImages(entities);
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

    static async deleteMany(entities: ClientFileMedium[]){
        if (device.platform !== "browser") {
            const res = await Helper.asyncForEach(entities, entity => FilePromise.delete(entity.src).catch(e => console.error(e)), true);
            console.log("res", res);
        }
        return super.deleteMany.call(this, entities);
    }
}
