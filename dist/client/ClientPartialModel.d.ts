import { EasySyncBaseModel } from '../shared/EasySyncBaseModel';
export declare class ClientPartialModel extends EasySyncBaseModel {
    clientId: number;
    static SAVE_PATH: string;
    static DELETE_PATH: string;
    constructor();
    static getColumnDefinitions(): Record<string, string | import("cordova-sites-database/dist/BDColumnType").BDColumnType>;
    toJSON(includeFull?: any): {};
    save(local?: any): Promise<any>;
    delete(local?: any): Promise<any>;
    static saveMany(entities: any, local?: any): Promise<any>;
}
