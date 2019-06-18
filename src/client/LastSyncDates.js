import {BaseDatabase, BaseModel} from "cordova-sites-database";

export class LastSyncDates extends BaseModel{
    constructor() {
        super();
        this.model = "";
        this.lastSynced = new Date(0);
        this.where = {};
    }

    getModel(){
        return this.model;
    }

    setModel(model){
        this.model = model;
    }

    getLastSynced(){
        return this.lastSynced;
    }

    setLastSynced(lastSynced){
        this.lastSynced = lastSynced;
    }

    static getColumnDefinitions() {
        let columns = BaseModel.getColumnDefinitions();
        columns.model = {type: BaseDatabase.TYPES.STRING, nullable:true};
        columns.lastSynced= {type: BaseDatabase.TYPES.DATE, nullable: true};
        columns.where= {type: BaseDatabase.TYPES.SIMPLE_JSON};
        return columns;
    }
}
LastSyncDates.SCHEMA_NAME="easy-sync-last-sync-dates";
BaseDatabase.addModel(LastSyncDates);