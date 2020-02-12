import { BaseModel } from "cordova-sites-database/dist/cordova-sites-database";
export declare class ClientModel extends BaseModel {
    static SAVE_PATH: string;
    static DELETE_PATH: string;
    static getColumnDefinitions(): {
        id: {
            primary: boolean;
            type: any;
            generated: boolean;
        };
    };
    static _fromJson(jsonObjects: any, models: any, includeRelations: any): Promise<void>;
    toJSON(includeFull?: any): void;
    save(local?: any): Promise<any>;
    delete(local?: any): Promise<any>;
    static saveMany(entities: any, local?: any): Promise<any>;
    static getSchemaDefinition(): {
        name: string;
        target: typeof BaseModel;
        columns: {
            id: {
                primary: boolean;
                type: any;
                generated: boolean;
            };
        };
        relations: {};
    };
}
