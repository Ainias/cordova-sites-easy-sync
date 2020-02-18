import { EasySyncBaseModel } from "../shared/EasySyncBaseModel";
export declare class ServerFileMedium extends EasySyncBaseModel {
    static SAVE_PATH: string;
    private _oldName;
    protected src: any;
    setLoaded(isLoaded: any): void;
    save(): Promise<any>;
    static saveMany(entities: any): Promise<any>;
    static _handleImages(entities: any): Promise<void>;
    writeImgToFile(): Promise<unknown>;
}
