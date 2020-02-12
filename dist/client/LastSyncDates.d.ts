import { BaseModel } from "cordova-sites-database/dist/cordova-sites-database";
export declare class LastSyncDates extends BaseModel {
    model: string;
    lastSynced: number;
    where: any;
    constructor();
    getModel(): string;
    setModel(model: any): void;
    getLastSynced(): number;
    setLastSynced(lastSynced: any): void;
    static getColumnDefinitions(): {
        id: {
            primary: boolean;
            type: any;
            generated: boolean;
        };
    };
}
