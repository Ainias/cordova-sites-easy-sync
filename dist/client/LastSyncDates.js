"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LastSyncDates = void 0;
const cordova_sites_database_1 = require("cordova-sites-database/dist/cordova-sites-database");
class LastSyncDates extends cordova_sites_database_1.BaseModel {
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
        columns.model = { type: cordova_sites_database_1.BaseDatabase.TYPES.STRING, nullable: true };
        columns.lastSynced = { type: cordova_sites_database_1.BaseDatabase.TYPES.INTEGER, nullable: true };
        columns.where = { type: cordova_sites_database_1.BaseDatabase.TYPES.SIMPLE_JSON };
        return columns;
    }
}
exports.LastSyncDates = LastSyncDates;
LastSyncDates.SCHEMA_NAME = 'easy-sync-last-sync-dates';
cordova_sites_database_1.BaseDatabase.addModel(LastSyncDates);
//# sourceMappingURL=LastSyncDates.js.map