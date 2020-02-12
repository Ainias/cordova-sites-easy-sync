import { BaseDatabase } from "cordova-sites-database";
export declare class EasySyncServerDb extends BaseDatabase {
    static CONNECTION_PARAMETERS: any;
    _createConnectionOptions(database: any): any;
    saveEntity(entities: any): Promise<any>;
    deleteEntity(entities: any, model: any, deleteFully?: any): Promise<any>;
}
