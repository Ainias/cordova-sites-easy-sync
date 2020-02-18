import { EasySyncBaseModel } from "./EasySyncBaseModel";
export declare class FileMedium extends EasySyncBaseModel {
    static PUBLIC_PATH: string;
    protected src: any;
    static getColumnDefinitions(): {
        id: {
            primary: boolean;
            type: any;
            generated: boolean;
        };
    };
    toString(): string;
}
