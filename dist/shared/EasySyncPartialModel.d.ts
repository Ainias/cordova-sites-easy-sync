import { EasySyncBaseModel } from './EasySyncBaseModel';
import { BaseModel } from 'cordova-sites-database/dist/cordova-sites-database';
export declare class EasySyncPartialModel extends EasySyncBaseModel {
    static findByIds(ids: any, relations?: any): Promise<BaseModel[]>;
    static findById(id: any, relations?: any): Promise<any>;
    static findByClientId(id: any, relations?: any): Promise<any>;
    static findByClientIds(ids: any, relations?: any): Promise<any>;
    toJSON(includeFull?: any): {};
    static fromJson(jsonObjects: any, entities: any, includeRelations: any): Promise<any>;
    private static myHandleRelations;
    private static myHandleColumns;
}
