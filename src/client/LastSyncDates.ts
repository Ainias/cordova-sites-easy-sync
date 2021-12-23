import { BaseDatabase, BaseModel } from 'cordova-sites-database/dist/cordova-sites-database';

export class LastSyncDates extends BaseModel {
    model: string;
    lastSynced: number;
    where;

    constructor() {
        super();
        this.model = '';
        this.lastSynced = 0;
        this.where = {};
    }

    getModel() {
        return this.model;
    }

    setModel(model) {
        this.model = model;
    }

    getLastSynced() {
        return this.lastSynced;
    }

    setLastSynced(lastSynced) {
        this.lastSynced = lastSynced;
    }

    static getColumnDefinitions() {
        const columns = super.getColumnDefinitions();
        columns.model = { type: BaseDatabase.TYPES.STRING, nullable: true };
        columns.lastSynced = { type: BaseDatabase.TYPES.INTEGER, nullable: true };
        columns.where = { type: BaseDatabase.TYPES.SIMPLE_JSON };
        return columns;
    }
}

LastSyncDates.SCHEMA_NAME = 'easy-sync-last-sync-dates';
BaseDatabase.addModel(LastSyncDates);
