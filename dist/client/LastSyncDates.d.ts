import { BaseModel } from 'cordova-sites-database/dist/cordova-sites-database';
export declare class LastSyncDates extends BaseModel {
    model: string;
    lastSynced: number;
    where: any;
    constructor();
    getModel(): string;
    setModel(model: any): void;
    getLastSynced(): number;
    setLastSynced(lastSynced: any): void;
    static getColumnDefinitions(): Record<string, string | import("cordova-sites-database/dist/BDColumnType").BDColumnType>;
}
