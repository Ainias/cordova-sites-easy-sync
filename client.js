import { NanoSQLWrapper, Helper, App, BaseModel, DataManager } from 'cordova-sites';

class EasySync{
    static addModel(model){
        EasySync._models.push(model);
    }
}
EasySync._models = [];
EasySync.TYPES = {
    JSON: "json",
    INTEGER: "int",
    STRING: "string",
    DATE: "timeId",
    BOOLEAN: "bool",
};

class EasySyncBaseModel {
    constructor() {
        this._id = null;
        this._createdAt = new Date();
        this._updatedAt = new Date();
        this._version = 1;
        this._deleted = false;
    }

    getId() {
        return this._id;
    }

    setId(id) {
        this._id = id;
    }

    /**
     * @returns {Date}
     */
    getCreatedAt() {
        return this._createdAt;
    }

    /**
     * @param {Date} createdAt
     *
     */
    setCreatedAt(createdAt) {
        this._createdAt = createdAt;
    }

    /**
     * @returns {Date}
     */
    getUpdatedAt() {
        return this._updatedAt;
    }

    /**
     * @param {Date} lastUpdated
     */
    setUpdatedAt(lastUpdated) {
        this.updatedAt = lastUpdated;
    }

    /**
     * @returns {number}
     */
    getVersion() {
        return this._version;
    }

    /**
     * @param {number} version
     */
    setVersion(version) {
        this._version = version;
    }

    /**
     * @returns {boolean}
     */
    getDeleted() {
        return this._deleted;
    }

    /**
     * @param {boolean} deleted
     */
    setDeleted(deleted) {
        this._deleted = (deleted === true);
    }

    async save() {
        //Wenn direkt BaseModel.saveModel aufgerufen wird, später ein Fehler geschmissen (_method not defined), da der
        // falsche Kontext am Objekt existiert
        return this.constructor.saveModel(this);
    }

    static _modelToJson(model) {
        let {columns} = this.getTableDefinition();
        let jsonObject = {};
        columns.forEach(column => {
            let getterName = ["get", column.key.substr(0, 1).toUpperCase(), column.key.substr(1)].join('');
            if (typeof model[getterName] === "function") {
                jsonObject[column.key] = model[getterName]();
                if (column.type === EasySync.TYPES.JSON) {
                    jsonObject[column.key] = JSON.stringify(jsonObject[column.key]);
                }
            }
        });
        return jsonObject;
    }

    static getTableDefinition() {
        return {
            name: this.getModelName(),
            columns: [
                {key: "id", type: EasySync.TYPES.INTEGER, ai: true, pk: true, allowNull: false},
                {key: "createdAt", type: EasySync.TYPES.DATE},
                {key: "updatedAt", type: EasySync.TYPES.DATE},
                {key: "version", type: EasySync.TYPES.INTEGER},
                {key: "deleted", type: EasySync.TYPES.BOOLEAN},
            ]
        }
    }

    /**
     * @returns {null|string}
     */
    static getModelName() {
        if (this.modelName) {
            return this.modelName;
        } else {
            return this.name;
        }
    }

    /**
     * @param {string} name
     */
    static setModelName(name) {
        this.modelName = name;
    }

    static _newModel() {
        return new this();
    }

    static getTableSchema() {
        let {columns} = this.getTableDefinition();
        let newColumns = [];

        columns.forEach(definition => {
            let newColumn = Object.assign({}, definition);
            newColumn.props = [];
            if (definition.ai) {
                newColumn.props.push("ai");
            }
            if (definition.pk) {
                newColumn.props.push("pk");
            }
            if (definition.type === EasySync.TYPES.JSON) {
                newColumn.type = EasySync.TYPES.STRING;
            }
            newColumns.push(newColumn);
        });
        return newColumns;
    }

    static _getDBInstance() {
        return EasySyncBaseModel.dbInstance;
    }

    static _inflate(jsonObjects, models) {
        models = models || [];

        let isArray = Array.isArray(jsonObjects);
        if (!isArray) {
            jsonObjects = [jsonObjects];
        }
        if (!Array.isArray(models)) {
            models = [models];
        }

        let {columns} = this.getTableDefinition();
        jsonObjects.forEach((jsonObject, index) => {
            let model = (models.length > index) ? models[index] : new this();
            columns.forEach(column => {
                if (jsonObject[column.key] !== undefined){
                    let setterName = ["set", column.key.substr(0, 1).toUpperCase(), column.key.substr(1)].join('');
                    if (typeof model[setterName] === "function") {
                        if (column.type === EasySync.TYPES.JSON && typeof jsonObject[column.key] === "string"){
                            jsonObject[column.key] = JSON.parse(jsonObject[column.key]);
                        }
                        model[setterName](jsonObject[column.key]);
                    }
                }
            });
            models[index] = model;
        });
        if (!isArray) {
            models = (models.length > 0) ? models[0] : null;
        }
        return models;
    }

    toJSON() {
        return this.constructor._modelToJson(this);
    }
}

EasySyncBaseModel.dbInstance = null;

class EasySyncClientDb extends NanoSQLWrapper {
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

class LastSyncDates extends BaseModel{
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

class SyncJob {
    async syncAll() {
        return this.sync(EasySyncClientDb._models);
    }

    async sync(modelClasses) {
        let modelNames = [];
        let requestQuery = {};

        let keyedModelClasses = {};
        modelClasses.forEach(async cl => {
            modelNames.push(cl.getModelName());
            requestQuery[cl.getModelName()] = {};
            keyedModelClasses[cl.getModelName()] = cl;
        });

        let lastSyncModels = {};
        let lastSyncModelsArray = await LastSyncDates.select(["model", "IN", modelNames]);
        lastSyncModelsArray.forEach(lastSyncModel => {
            requestQuery[lastSyncModel.getModel()]["lastSynced"] = lastSyncModel.getLastSynced().getTime();
            lastSyncModels[lastSyncModel.getModel()] = lastSyncModel;
        });

        let newLastSynced = null;

        let results = [];
        let offset = 0;

        let upsertPromises = [];

        let shouldAskAgain = false;
        do {
            shouldAskAgain = false;
            results = await SyncJob._fetchModel(requestQuery, offset);
            offset = results["nextOffset"];
            if (Helper.isNull(newLastSynced)) {
                newLastSynced = results["newLastSynced"];
                modelNames.forEach(name => {
                    if (!lastSyncModels[name]) {
                        lastSyncModels[name] = new LastSyncDates();
                        lastSyncModels[name].setModel(name);
                    }
                    lastSyncModels[name].setLastSynced(new Date(newLastSynced));
                });
            }
            let newRequestQuery = {};
            modelNames.forEach((name, i) => {
                let modelRes = results["models"][name];
                if (modelRes) {
                    let deletedModelsIds = [];
                    let changedModels = [];

                    modelRes["entities"].forEach(entity => {
                        if (entity.deleted) {
                            deletedModelsIds.push(entity.id);
                        } else {
                            changedModels.push(entity);
                        }
                    });

                    upsertPromises.push(keyedModelClasses[name].getTable().query("upsert", changedModels).exec().then(async res => {
                        return {
                            "model": name,
                            "entities": await modelClasses[i]._inflate(res[0]["affectedRows"]),
                            "deleted": false
                        };
                    }));
                    upsertPromises.push(keyedModelClasses[name].getTable().query("delete").where(["id", "IN", deletedModelsIds]).exec().then(async res => {
                        return {
                            "model": name,
                            "entities": await modelClasses[i]._inflate(res[0]["affectedRows"]),
                            "deleted": true
                        };
                    }));

                    if (modelRes.shouldAskAgain) {
                        shouldAskAgain = true;
                        newRequestQuery[name] = {};
                        if (requestQuery[name].lastSynced) {
                            newRequestQuery[name].lastSynced = requestQuery[name].lastSynced;
                        }
                    }
                }
            });
            requestQuery = newRequestQuery;
        } while (shouldAskAgain);

        results = await Promise.all(upsertPromises);

        let lastSyncPromises = [];
        Object.keys(lastSyncModels).forEach(lastSyncModelName => {
            lastSyncPromises.push(lastSyncModels[lastSyncModelName].save());
        });
        await Promise.all(lastSyncPromises);

        let finalRes = {};
        results.forEach(res => {
            if (!finalRes[res.model]) {
                finalRes[res.model] = {
                    "deleted": [],
                    "changed":[]
                };
            }
            if (res.deleted) {
                finalRes[res.model]["deleted"] = finalRes[res.model]["deleted"].concat(res.entities);
            }
            else {
                finalRes[res.model]["changed"] = finalRes[res.model]["changed"].concat(res.entities);
            }
        });
        return finalRes;
    }

    static async _fetchModel(query, offset) {
        return await DataManager.load(SyncJob.SYNC_PATH_PREFIX +
            DataManager.buildQuery({
                "models": JSON.stringify(query),
                "offset": offset
            }));
    }
}

SyncJob.SYNC_PATH_PREFIX = "sync";

export { EasySyncClientDb, LastSyncDates, SyncJob };
