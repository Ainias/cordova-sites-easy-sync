import { BaseDatabase } from 'cordova-sites-database/dist/cordova-sites-database';
export declare class EasySyncClientDb extends BaseDatabase {
    static BASE_MODEL: any;
    static errorListener: any;
    constructor(dbName?: any);
    createConnectionOptions(database: any): any;
}
