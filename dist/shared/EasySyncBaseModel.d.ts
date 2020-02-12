import { BaseModel } from "cordova-sites-database/dist/cordova-sites-database";
export declare class EasySyncBaseModel extends BaseModel {
    static CAN_BE_SYNCED: boolean;
    static delegateClass: any;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    deleted: boolean;
    _delegate: any;
    constructor();
    toJSON(includeFull: any): {};
    static getColumnDefinitions(): {
        id: {
            primary: boolean;
            type: any;
            generated: boolean;
        };
    };
    static _fromJson(jsonObjects: any, entities: any, includeRelations: any): Promise<any>;
    private static _handleRelations;
    private static _handleColumns;
}
