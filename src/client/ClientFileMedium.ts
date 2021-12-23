import { EasySyncBaseModel } from '../shared/EasySyncBaseModel';
import { FileTransferPromise } from './FileWriter/FileTransferPromise';
import { Helper } from 'js-helper/dist/shared/Helper';
import { ArrayHelper, PromiseWithHandlers } from 'js-helper';
import { FilePromise } from './FileWriter/FilePromise';

declare const device;

export class ClientFileMedium extends EasySyncBaseModel {
    protected src: any;
    protected saveOffline = true;
    protected isDownloaded = false;
    protected isDownloadedPromise: PromiseWithHandlers<boolean> = new PromiseWithHandlers();

    async isDownloadedState() {
        return this.isDownloadedPromise;
    }

    setLoaded(isLoaded: any): void {
        super.setLoaded(isLoaded);
        FilePromise.open(this.src, { create: false })
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

    async save(): Promise<any> {
        // await ClientFileMedium._handleImages(this);
        return super.save();
    }

    static async saveMany(entities) {
        // await ClientFileMedium._handleImages(entities);
        return super.saveMany(entities);
    }

    static async handleImages(entities: ClientFileMedium | ClientFileMedium[]) {
        if (!Array.isArray(entities)) {
            entities = [entities];
        }

        await ArrayHelper.asyncForEach(
            entities,
            async (entity) => {
                if (
                    entity.saveOffline &&
                    device.platform !== 'browser' &&
                    !entity.src.startsWith('data') &&
                    !entity.src.startsWith('http') &&
                    !entity.src.startsWith('//')
                ) {
                    await new FileTransferPromise(entity.getServerUrl(false), entity.src)
                        .download()
                        .catch((e) => console.log(e));
                    entity.isDownloaded = true;
                }
            },
            true
        );
    }

    static async deleteMany(entities: ClientFileMedium[]) {
        if (device.platform !== 'browser') {
            const res = await Helper.asyncForEach(
                entities,
                (entity) => FilePromise.delete(entity.src).catch((e) => console.error(e)),
                true
            );
            console.log('res', res);
        }
        return super.deleteMany.call(this, entities);
    }

    // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-unused-vars
    getServerUrl(appendDate?: boolean) {
        return '';
    }
}
