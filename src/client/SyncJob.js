import {LastSyncDates} from "./LastSyncDates";
import {DataManager, Helper} from "cordova-sites";
import {EasySyncClientDb} from "./EasySyncClientDb";
import * as _typeorm from "typeorm";
import {EasySyncPartialModel} from "../shared/EasySyncPartialModel";

let typeorm = _typeorm;
if (typeorm.default) {
    typeorm = typeorm.default;
}

export class SyncJob {

    async sync(modelClasses) {
        let modelNames = [];
        let requestQuery = {};

        //initializing query
        let keyedModelClasses = EasySyncClientDb.getModel();
        await Helper.asyncForEach(modelClasses, async cl => {
            modelNames.push(cl.getSchemaName());
            requestQuery[cl.getSchemaName()] = {};
            requestQuery[cl.getSchemaName()]["where"] = await cl.getSyncWhere();
        }, true);

        let lastSyncModels = {};

        //Load syncModels
        let lastSyncModelsArray = await LastSyncDates.find({
            "model":
                typeorm.In(modelNames)
        });

        //make to array and update query
        lastSyncModelsArray.forEach(lastSyncModel => {
            requestQuery[lastSyncModel.getModel()]["lastSynced"] = lastSyncModel.getLastSynced().getTime();
            lastSyncModels[lastSyncModel.getModel()] = lastSyncModel;
        });

        //Initialize some variables
        let newLastSynced = null;

        let results = [];
        let offset = 0;

        let savePromises = [];

        let shouldAskAgain = false;
        let relationshipModels = {};

        //Ask for next run until no more runs needed
        do {
            shouldAskAgain = false;
            results = await SyncJob._fetchModel(requestQuery, offset);
            offset = results["nextOffset"];

            //Update newLastSynced
            if (!newLastSynced) {
                newLastSynced = results["newLastSynced"];
                modelNames.forEach(name => {
                    //if old last synced not exists => create it
                    if (!lastSyncModels[name]) {
                        lastSyncModels[name] = new LastSyncDates();
                        lastSyncModels[name].setModel(name);
                    }
                    lastSyncModels[name].setLastSynced(new Date(newLastSynced));
                });
            }

            //create new request query
            let newRequestQuery = {};
            modelNames.forEach((name) => {
                //trigger save of result (and returns if it should run again)
                if (this._processModelResult(results["models"][name], keyedModelClasses[name], savePromises, relationshipModels)) {
                    shouldAskAgain = true;
                    newRequestQuery[name] = {};
                    if (requestQuery[name].lastSynced) {
                        newRequestQuery[name].lastSynced = requestQuery[name].lastSynced;
                        newRequestQuery[name].where = requestQuery[name].where;
                    }
                }
            });
            requestQuery = newRequestQuery;
        } while (shouldAskAgain);

        //wait for all saves & deletions (without relations)
        results = await Promise.all(savePromises);

        let relationPromises = [];
        Object.keys(relationshipModels).forEach(modelClassName => {
            let relationDefinitions = keyedModelClasses[modelClassName].getRelationDefinitions();

            Object.keys(relationshipModels[modelClassName]).forEach(id => {
                let entity = relationshipModels[modelClassName][id]["entity"];
                let relations = relationshipModels[modelClassName][id]["relations"];
                let entityRelationPromises = [];

                //foreach relation load other models and save them here
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

                //Save after all relationships has been set
                relationPromises.push(Promise.all(entityRelationPromises).then(() => {
                    return entity.save(true);
                }))
            });
        });

        //Wait for relation-promises
        await Promise.all(relationPromises);

        //Save new lastSync models
        let lastSyncPromises = [];
        Object.keys(lastSyncModels).forEach(model => {
            lastSyncPromises.push(lastSyncModels[model].save())
        });
        await Promise.all(lastSyncPromises);

        //Calculate final result and give it back
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
        if (!modelRes) {
            return false;
        }
        let name = modelClass.getSchemaName();
        let deletedModelsIds = [];
        let changedModels = [];

        //split result into deleted and changed/new entities
        modelRes["entities"].forEach(entity => {
            if (entity.deleted) {
                deletedModelsIds.push(entity.id);
            } else {
                changedModels.push(entity);
            }
        });

        //convert json to entity and save it
        savePromises.push(modelClass._fromJson(changedModels).then(async changedEntities => {
            let relations = modelClass.getRelationDefinitions();

            let newIds = [];
            changedEntities.forEach(entity => {
                newIds.push(entity.id);
                Object.keys(relations).forEach(relation => {
                    if (entity[relation]) {
                        //if relation should be synced
                        if (relations[relation].sync !== false) {

                            //save relation into specific variable
                            relationshipModels[name] = Helper.nonNull(relationshipModels[name], {});
                            relationshipModels[name][entity.id] = Helper.nonNull(relationshipModels[name][entity.id], {});
                            relationshipModels[name][entity.id]["entity"] = entity;
                            relationshipModels[name][entity.id]["relations"] = Helper.nonNull(relationshipModels[name][entity.id]["relations"], {});
                            relationshipModels[name][entity.id]["relations"][relation] = entity[relation];
                        }

                        //clear relation
                        entity[relation] = null;
                    }
                })
            });

            if (modelClass.prototype instanceof EasySyncPartialModel){
                let oldObjects = await modelClass.findByIds(newIds);
                let keyedEntities = Helper.arrayToObject(changedEntities, changedEntities => changedEntities.id);
                oldObjects.forEach(old => {
                    keyedEntities[old.id].clientId = old.clientId;
                });
            }

            //returns a save of the entities
            return EasySyncClientDb.getInstance().saveEntity(changedEntities).then(res => {
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

        //Deletion of the entities
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