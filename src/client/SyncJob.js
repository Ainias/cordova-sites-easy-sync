import {LastSyncDates} from "./LastSyncDates";
import {DataManager, Helper} from "cordova-sites";
import {EasySyncClientDb} from "./EasySyncClientDb";

export class SyncJob {
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