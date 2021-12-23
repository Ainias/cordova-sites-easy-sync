import { BaseDatabase } from 'cordova-sites-database';
import { EasySyncBaseModel } from '../shared/EasySyncBaseModel';
export declare class EasySyncServerDb extends BaseDatabase {
    static CONNECTION_PARAMETERS: any;
    createConnectionOptions(database: any): any;
    saveEntity(entities: any): Promise<any>;
    deleteEntity(entities: any, model: any, deleteFully?: any): Promise<any>;
    static getModel(model: string): typeof EasySyncBaseModel;
}
