import { BaseModel, BaseDatabase } from 'cordova-sites-database';
import { App, DataManager } from 'cordova-sites';

class EasySyncBaseModel extends BaseModel {
    constructor() {
        super();
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.version = 1;
        this.deleted = false;
    }

    static getColumnDefinitions() {
        let columns = super.getColumnDefinitions();
        columns["createdAt"] = {
            type: BaseDatabase.TYPES.DATE
        };
        columns["updatedAt"] = {
            type: BaseDatabase.TYPES.DATE
        };
        columns["version"] = {
            type: BaseDatabase.TYPES.INTEGER
        };
        columns["deleted"] = {
            type: BaseDatabase.TYPES.BOOLEAN
        };
        return columns;
    }

    static async _fromJson(jsonObjects, models, includeRelations) {
        models = models || [];
        let isArray = Array.isArray(jsonObjects);
        if (!isArray) {
            jsonObjects = [jsonObjects];
        }
        if (!Array.isArray(models)) {
            models = [models];
        }
        let relations = this.getRelationDefinitions();
        let loadPromises = [];
        jsonObjects.forEach((jsonObject, index) => {
            loadPromises.push(new Promise(async resolve => {
                let model = null;
                if (models.length > index) {
                    model = models[index];
                } else if (jsonObject.id !== null) {
                    model = await this.findById(jsonObject.id, this.getRelations());
                }

                if (model === null) {
                    model = new this();
                }

                if (!jsonObject.version) {
                    jsonObject.version = 1;
                }
                models[index] = Object.assign(model, jsonObject);
                Object.keys(relations).forEach(relationName => {
                    let values = models[index][relationName];
                    if (typeof values === "number" || (Array.isArray(values) && values.length >= 1 && typeof values[0] === "number")) {
                        if (includeRelations === true) {
                            let loadPromise = null;
                            if (Array.isArray(values)) {
                                loadPromise = BaseDatabase.getModel(relations[relationName].target).findByIds(values);
                            } else {
                                loadPromise = BaseDatabase.getModel(relations[relationName].target).findById(values);
                            }
                            loadPromises.push(loadPromise.then(value => models[index][relationName] = value));
                        } else if (includeRelations === false) {
                            if (relations[relationName].type === "many-to-many" || relations[relationName].type === "one-to-many") {
                                models[index][relationName] = [];
                            } else {
                                models[index][relationName] = null;
                            }
                        }
                    }
                });
                resolve();
            }));
        });
        await Promise.all(loadPromises);
        if (!isArray) {
            models = (models.length > 0) ? models[0] : null;
        }
        return models;
    }

    toJSON(includeFull) {
        let relations = this.constructor.getRelationDefinitions();
        let columns = this.constructor.getColumnDefinitions();

        let obj = {};
        Object.keys(columns).forEach(attribute => {
            obj[attribute] = this[attribute];
        });
        Object.keys(relations).forEach(relationName => {
            if (includeFull === true) {
                obj[relationName] = this[relationName];
            } else {
                if (Array.isArray(this[relationName])) {
                    let ids = [];
                    this[relationName].forEach(child => ids.push(child.id));
                    obj[relationName] = ids;
                } else if (this[relationName] instanceof BaseModel) {
                    obj[relationName] = this[relationName].id;
                } else {
                    obj[relationName] = null;
                }
            }
        });
        return obj;
    }
}

class ClientModel extends EasySyncBaseModel{
    static getColumnDefinitions(){
        let columns = super.getColumnDefinitions();
        if (columns["id"] && columns["id"]["generated"]){
            columns["id"]["generated"] = false;
        }
        return columns;
    }
}

class EasySyncClientDb extends BaseDatabase {
    constructor() {
        super("EasySync");
    }

    _createConnectionOptions(database) {
        Object.setPrototypeOf(ClientModel, EasySyncClientDb.BASE_MODEL);
        Object.keys(BaseDatabase._models).forEach(modelName => {
            Object.setPrototypeOf(BaseDatabase._models[modelName], ClientModel);
        });
        return super._createConnectionOptions(database);
    }
}

EasySyncClientDb.BASE_MODEL = null;
App.addInitialization(async () => {
    await EasySyncClientDb.getInstance()._connectionPromise;
});

class LastSyncDates extends BaseModel{
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
        columns.model = {type: BaseDatabase.TYPES.STRING};
        columns.lastSynced= {type: BaseDatabase.TYPES.DATE};
        columns.where= {type: BaseDatabase.TYPES.JSON};
        return columns;
    }
}
LastSyncDates.SCHEMA_NAME="easy-sync-last-sync-dates";
BaseDatabase.addModel(LastSyncDates);

class SyncJob {
    async syncAll() {
        return this.sync(Object.values(EasySyncClientDb._models));
    }

    async sync(modelClasses) {
        let modelNames = [];
        let requestQuery = {};

        let keyedModelClasses = {};
        modelClasses.forEach(async cl => {
            modelNames.push(cl.getSchemaName());
            requestQuery[cl.getSchemaName()] = {};
            keyedModelClasses[cl.getSchemaName()] = cl;
        });

        let lastSyncModels = {};
        let lastSyncModelsArray = await LastSyncDates.find({
            "model":
                BaseDatabase.typeorm.In(modelNames)
        });
        lastSyncModelsArray.forEach(lastSyncModel => {
            requestQuery[lastSyncModel.getModel()]["lastSynced"] = lastSyncModel.getLastSynced().getTime();
            lastSyncModels[lastSyncModel.getModel()] = lastSyncModel;
        });

        let newLastSynced = null;

        let results = [];
        let offset = 0;

        let savePromises = [];

        let shouldAskAgain = false;
        let relationshipModels = {};
        do {
            shouldAskAgain = false;
            results = await SyncJob._fetchModel(requestQuery, offset);
            offset = results["nextOffset"];
            if (!newLastSynced) {
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
            modelNames.forEach((name) => {
                if (this._processModelResult(results["models"][name], keyedModelClasses[name], savePromises, relationshipModels)) {
                    shouldAskAgain = true;
                    newRequestQuery[name] = {};
                    if (requestQuery[name].lastSynced) {
                        newRequestQuery[name].lastSynced = requestQuery[name].lastSynced;
                    }
                }
            });
            requestQuery = newRequestQuery;
        } while (shouldAskAgain);

        results = await Promise.all(savePromises);

        //TODO ids aflösen

        let lastSyncPromises = [];
        Object.keys(lastSyncModels).forEach(lastSyncModelName => {
            lastSyncPromises.push(lastSyncModels[lastSyncModelName].save());
        });
        await Promise.all(lastSyncPromises);

        let finalRes = {};
        results.forEach(res => {
            if (res) {
                if (!finalRes[res.model]) {
                    finalRes[res.model] = {
                        "deleted": [],
                        "changed": []
                    };
                }
                if (res.deleted) {
                    finalRes[res.model]["deleted"] = finalRes[res.model]["deleted"].concat(res.entities);
                } else {
                    finalRes[res.model]["changed"] = finalRes[res.model]["changed"].concat(res.entities);
                }
            }
        });
        return finalRes;
    }

    _processModelResult(modelRes, modelClass, savePromises, relationshipModels) {
        let shouldAskAgain = false;
        if (modelRes) {
            let name = modelClass.getSchemaName();
            let deletedModelsIds = [];
            let changedModels = [];

            modelRes["entities"].forEach(entity => {
                if (entity.deleted) {
                    deletedModelsIds.push(entity.id);
                } else {
                    changedModels.push(entity);
                }
            });

            savePromises.push(modelClass._fromJson(changedModels, undefined, false).then(changedModels => {
                savePromises.push(EasySyncClientDb.getInstance().saveEntity(changedModels).then(res => {
                    return {
                        "model": name,
                        "entities": res,
                        "deleted": false
                    };
                }).catch(e => {
                    console.error(e);
                    return Promise.reject(e)
                }));
            }));
            savePromises.push(EasySyncClientDb.getInstance().deleteEntity(deletedModelsIds, modelClass).then(res => {
                return {
                    "model": name,
                    "entities": res,
                    "deleted": true
                };
            }));

            if (modelRes.shouldAskAgain) {
                shouldAskAgain = true;
            }
        }
        return shouldAskAgain
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

export { ClientModel, EasySyncClientDb, LastSyncDates, SyncJob };
