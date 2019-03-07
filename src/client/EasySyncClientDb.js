import {App, BaseModel, Helper, NanoSQLWrapper} from "cordova-sites";
import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";
import {EasySync} from "../shared/EasySync";

export class EasySyncClientDb extends NanoSQLWrapper {
    constructor() {
        super("EasySync");
    }

    /**
     * Definiert das Datenbank-Schema für die MBB-Datenbank
     * @override
     */
    setupDatabase() {
        EasySyncClientDb._easySync._models.forEach(model => {
            Object.setPrototypeOf(model, EasySyncBaseModel);
            this.declareModel(model.getModelName(), model.getTableSchema());
        });
        EasySyncClientDb._models.forEach(model => {
            this.declareModel(model.getModelName(), model.getTableSchema());
        });
    }

    static getInstance() {
        if (Helper.isNull(EasySyncClientDb._instance)) {
            EasySyncClientDb._instance = new EasySyncClientDb();
        }
        return EasySyncClientDb._instance;
    }

    static addModel(model){
        this._models.push(model);
    }
}
EasySyncClientDb._models = [];
EasySyncClientDb._easySync = null;
EasySyncClientDb._instance = null;
App.addInitialization(async () => {
    Object.setPrototypeOf(EasySyncBaseModel, BaseModel);
    EasySyncBaseModel.dbInstance = EasySyncClientDb.getInstance();
    await EasySyncClientDb._instance.waitForConnection();
});