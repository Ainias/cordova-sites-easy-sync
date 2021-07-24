/// <reference types="node" />
import { EasySyncBaseModel } from "../shared/EasySyncBaseModel";
import { PassThrough } from "stream";
export declare class ServerFileMedium extends EasySyncBaseModel {
    static SAVE_PATH: string;
    private _oldName;
    protected src: any;
    static createDownscalePipe: () => PassThrough;
    setLoaded(isLoaded: any): void;
    save(): Promise<any>;
    static saveMany(entities: any): Promise<any>;
    private static _handleImages;
    writeImgToFile(): Promise<unknown>;
    private static isImage;
}
