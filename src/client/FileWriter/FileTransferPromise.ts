import { Helper } from 'js-helper/dist/shared/Helper';
import { FilePromise } from './FilePromise';
import { DataManager } from 'cordova-sites/dist/client/js/DataManager';

export class FileTransferPromise {
    private downloadUrl: string;
    private storagePath: string;

    constructor(downloadUrl, storagePath?) {
        this.downloadUrl = downloadUrl;

        if (Helper.isNull(storagePath)) {
            const parts = this.downloadUrl.split('/');
            if (parts.length > 0) {
                storagePath = parts[parts.length - 1];
            }
        }

        this.storagePath = storagePath;
    }

    async download() {
        const blob = DataManager.fetchBlob(this.downloadUrl);
        const filePromise = await FilePromise.open(this.storagePath);
        const fileWriter = await filePromise.createWriter();

        await fileWriter.write(await blob);
    }
}
