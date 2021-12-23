import { BaseModel } from 'cordova-sites-database/dist/cordova-sites-database';
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
    static getColumnDefinitions(): Record<string, string | import("cordova-sites-database/dist/BDColumnType").BDColumnType>;
    static fromJson(jsonObjects: any, entities: any, includeRelations: any): Promise<any>;
    private static handleRelations;
    private static handleColumns;
    static prepareSync(entities: any): any;
    static deleteMany(entities: any, deleteFully?: boolean): Promise<any>;
}
