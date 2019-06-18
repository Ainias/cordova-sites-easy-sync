import {LastSyncDates} from "./LastSyncDates";
import {DataManager, Helper} from "cordova-sites";
import {EasySyncClientDb} from "./EasySyncClientDb";
import * as _typeorm from "typeorm";
import {BaseModel} from "cordova-sites-database";

let typeorm = _typeorm;
if (typeorm.default) {
    typeorm = typeorm.default;
}

export class SyncJob {

    async sync(modelClasses) {
        let modelNames = [];
        let requestQuery = {};


        let keyedModelClasses = EasySyncClientDb.getModel();
        modelClasses.forEach(cl => {
            modelNames.push(cl.getSchemaName());
            requestQuery[cl.getSchemaName()] = {};
        });

        let lastSyncModels = {};

        let lastSyncModelsArray = await LastSyncDates.find({
            "model":
                typeorm.In(modelNames)
        });

        // debugger;

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

        let relationPromises = [];
        Object.keys(relationshipModels).forEach(modelClassName => {
            let relationDefinitions = keyedModelClasses[modelClassName].getRelationDefinitions();
            Object.keys(relationshipModels[modelClassName]).forEach(id => {
                let entity = relationshipModels[modelClassName][id]["entity"];
                let relations = relationshipModels[modelClassName][id]["relations"];
                let entityRelationPromises = [];
                Object.keys(relations).forEach(relation => {
                    let valuePromise = null;
                    if (Array.isArray(relations[relation])) {
                        valuePromise = keyedModelClasses[relationDefinitions[relation]["target"]].findByIds(relations[relation]);
                    } else {
                        valuePromise = keyedModelClasses[relationDefinitions[relation]["target"]].findById(relations[relation]);
                    }

                    entityRelationPromises.push(valuePromise.then(value => {
                        entity[relation] = value;
                    }));
                });
                relationPromises.push(Promise.all(entityRelationPromises).then(() => {
                    return entity.save(true);
                }))
            });
        });
        await Promise.all(relationPromises);

        let lastSyncPromises = [];
        Object.keys(lastSyncModels).forEach(model => {
            lastSyncPromises.push(lastSyncModels[model].save())
        });

        await Promise.all(lastSyncPromises).catch(e => {
            console.error(e);
            return Promise.reject(e);
        });

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

            savePromises.push(modelClass._fromJson(changedModels).then(changedEntity => {
                let relations = modelClass.getRelationDefinitions();
                changedEntity.forEach(entity => {
                    Object.keys(relations).forEach(relation => {
                        if (entity[relation]) {
                            // if ((relations[relation].type !== BaseModel.RELATION.MANY_TO_MANY || !relations[relation].inverseSide) || (name < relations[relation].target || (name === relations[relation].target && relation < relations[relation].inverseSide))) {
                            if (relations[relation].sync !== false) {
                                //save relation
                                relationshipModels[name] = Helper.nonNull(relationshipModels[name], {});
                                relationshipModels[name][entity.id] = Helper.nonNull(relationshipModels[name][entity.id], {});
                                relationshipModels[name][entity.id]["entity"] = entity;
                                relationshipModels[name][entity.id]["relations"] = Helper.nonNull(relationshipModels[name][entity.id]["relations"], {});
                                relationshipModels[name][entity.id]["relations"][relation] = entity[relation];
                            }
                            entity[relation] = null;
                        }
                    })
                });

                return EasySyncClientDb.getInstance().saveEntity(changedEntity).then(res => {
                    return {
                        "model": name,
                        "entities": res,
                        "deleted": false
                    };
                }).catch(e => {
                    console.error(e);
                    return Promise.reject(e)
                });
            }));
            savePromises.push(EasySyncClientDb.getInstance().deleteEntity(deletedModelsIds, modelClass).then(res => {
                return {
                    "model": name,
                    "entities": res,
                    "deleted": true
                };
            }).catch(e => {
                console.error(e);
                return Promise.reject(e)
            }));

            if (modelRes.shouldAskAgain) {
                shouldAskAgain = true;
            }
        }
        return shouldAskAgain
    }

    static async _fetchModel(query, offset) {
        let res = await DataManager.load(SyncJob.SYNC_PATH_PREFIX +
            DataManager.buildQuery({
                "models": JSON.stringify(query),
                "offset": offset
            }));

        return res;
    }
}

SyncJob.SYNC_PATH_PREFIX = "sync";