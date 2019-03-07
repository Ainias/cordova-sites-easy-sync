import {BaseModel} from "cordova-sites";
import {EasySyncClientDb} from "./EasySyncClientDb";

export class LastSyncDates extends BaseModel{
    constructor() {
        super();
        this._model = "";
        this._lastSynced = new Date(0);
    }

    getModel(){
        return this._model;
    }

    setModel(model){
        this._model = model;
    }

    getLastSynced(){
        return this._lastSynced;
    }

    setLastSynced(lastSynced){
        this._lastSynced = lastSynced;
    }

    static getModelName() {
        return "easySyncLastSyncedDates";
    }

    static _getDBInstance(){
        return EasySyncClientDb.getInstance();
    }

    static getTableSchema() {
        return [
            {key: "id", type: "int", props: ["pk", "ai"]}, //pk = primary Key, ai = auto_increment
            {key: "model", type: "string"},
            {key: "lastSynced", type: "date"},
        ]
    }
}
EasySyncClientDb.addModel(LastSyncDates);