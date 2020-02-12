import { EasySyncBaseModel } from "./EasySyncBaseModel";
export declare class EasySyncPartialModel extends EasySyncBaseModel {
    static findByIds(ids: any, relations?: any): Promise<any>;
    static findById(id: any, relations?: any): Promise<any>;
    static findByClientId(id: any, relations?: any): Promise<any>;
    static findByClientIds(ids: any, relations?: any): Promise<any>;
    toJSON(includeFull?: any): {};
    static _fromJson(jsonObjects: any, entities: any, includeRelations: any): Promise<any>;
    private static _handleRelations_;
    private static _handleColumns_;
}
