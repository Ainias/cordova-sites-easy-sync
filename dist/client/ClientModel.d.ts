import { BaseModel } from 'cordova-sites-database/dist/cordova-sites-database';
export declare class ClientModel extends BaseModel {
    static SAVE_PATH: string;
    static DELETE_PATH: string;
    static getColumnDefinitions(): Record<string, string | import("cordova-sites-database/dist/BDColumnType").BDColumnType>;
    static fromJson(jsonObjects: any, models: any, includeRelations: any): Promise<void>;
    toJSON(includeFull?: any): void;
    save(local?: any): Promise<any>;
    delete(local?: any): Promise<any[] | import("typeorm").DeleteResult>;
    static saveMany(entities: any, local?: any): Promise<any>;
    static getSchemaDefinition(): {
        name: string;
        target: typeof BaseModel;
        columns: Record<string, import("cordova-sites-database/dist/BDColumnType").BDColumnType>;
        relations: Record<string, import("cordova-sites-database/dist/BDRelationshipType").BDRelationshipType>;
    };
}
