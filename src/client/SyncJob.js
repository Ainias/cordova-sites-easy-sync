import {LastSyncDates} from "./LastSyncDates";
import {DataManager} from "cordova-sites";
import {EasySyncClientDb} from "./EasySyncClientDb";
import {BaseDatabase} from "cordova-sites-database";

export class SyncJob {
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