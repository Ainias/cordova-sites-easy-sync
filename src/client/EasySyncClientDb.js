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
        this._easySyncModels = {};
        EasySyncClientDb._easySync._models.forEach(model => {
            Object.setPrototypeOf(model, EasySyncBaseModel);
            this._easySyncModels[model.getModelName()] = model;
            this.declareModel(model.getModelName(), model.getTableSchema());
        });
        EasySyncClientDb._models.forEach(model => {
            this.declareModel(model.getModelName(), model.getTableSchema());
        });

        Object.keys(this._easySyncModels).forEach(modelName => {
            let model = this._easySyncModels[modelName];
            model.relationships = {};

            let {columns} = model.getTableDefinition();
            columns.forEach((column, i) => {
                if (EasySync.isRelationship(column.type)) {

                    if (!column["target"]) {
                        column["target"] = column.key;
                    }

                    let target = column["target"];
                    let targetModel = this._easySyncModels[target];

                    model.relationships[column.key] = {
                        targetModel: targetModel
                    }

                    // switch (column.type) {
                        // case EasySync.TYPES.MANY_TO_MANY: {
                        //     this._models[modelName].sequelizeModelDefinition.belongsToMany(targetModel.sequelizeModelDefinition, definition);
                        //     break;
                        // }
                        // case EasySync.TYPES.ONE_TO_MANY: {
                        //     this._models[modelName].sequelizeModelDefinition.hasMany(targetModel.sequelizeModelDefinition, definition);
                        //     break;
                        // }
                    // }
                }
            });
        });
    }

    static getInstance() {
        if (Helper.isNull(EasySyncClientDb._instance)) {
            EasySyncClientDb._instance = new EasySyncClientDb();
        }
        return EasySyncClientDb._instance;
    }

    static addModel(model) {
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