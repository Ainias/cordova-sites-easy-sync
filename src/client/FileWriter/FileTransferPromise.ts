import {Helper} from "js-helper/dist/shared/Helper";
import {FilePromise} from "./FilePromise";
import {DataManager} from "cordova-sites/dist/client/js/DataManager";

export class FileTransferPromise {

    private downloadUrl: string;
    private storagePath: string;

    constructor(downloadUrl, storagePath?) {

        this.downloadUrl = downloadUrl;

        if (Helper.isNull(storagePath)) {
            let parts = this.downloadUrl.split("/");
            if (parts.length > 0) {
                storagePath = parts[parts.length - 1];
            }
        }

        this.storagePath = storagePath;
    }

    async download() {
        let blob = DataManager.fetchBlob(this.downloadUrl);
        let filePromise = await FilePromise.open(this.storagePath);
        let fileWriter = await filePromise.createWriter();

        await fileWriter.write(await blob);
    }
}
