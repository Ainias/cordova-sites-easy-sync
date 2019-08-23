import {LastSyncDates} from "./LastSyncDates";
import {DataManager, Helper} from "cordova-sites/dist/cordova-sites";
import {EasySyncClientDb} from "./EasySyncClientDb";
import * as _typeorm from "typeorm";
import {EasySyncPartialModel} from "../shared/EasySyncPartialModel";
import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";

let typeorm = _typeorm;
// if (typeorm.default) {
//     typeorm = typeorm.default;
// }

export class SyncJob {

    static SYNC_PATH_PREFIX;

    async sync(queries) {
        let modelNames = [];
        let requestQueries = [];

        //initializing query
        let keyedModelClasses = EasySyncClientDb.getModel();
        queries.forEach(query => {
            if (query.prototype instanceof EasySyncBaseModel) {
                query = {
                    model: query,
                    where: {}
                }
            }
            query.model = query.model.getSchemaName();
            modelNames.push(query.model);
            requestQueries.push(query);
        });

        //Load syncModels
        let lastSyncModelsArray = await LastSyncDates.find({
            "model":
                typeorm.In(modelNames)
        });
        let lastSyncDates = Helper.arrayToObject(lastSyncModelsArray, model => "" + model.getModel() + JSON.stringify(model.where));
        requestQueries.forEach(query => {
            let key = "" + query.model + JSON.stringify(query.where);
            if (Helper.isNull(lastSyncDates[key])) {
                let lastSyncDate = new LastSyncDates();
                lastSyncDate.setModel(query.model);
                lastSyncDate.where = query.where;
                lastSyncDate.setLastSynced(0);
                lastSyncDates[key] = lastSyncDate;
            }
            query["lastSynced"] = lastSyncDates[key].getLastSynced();
        });

        //Initialize some variables
        let newLastSynced = null;

        let response = null;
        let offset = 0;

        let savePromises = [];

        let shouldAskAgain = false;
        let relationshipModels = {};

        //Ask for next run until no more runs needed
        do {
            shouldAskAgain = false;
            response = await SyncJob._fetchModel(requestQueries, offset);
            offset = response["nextOffset"];

            //Update newLastSynced
            if (Helper.isNull(newLastSynced)) {
                newLastSynced = parseInt(response["newLastSynced"]);
                Object.keys(lastSyncDates).forEach(key => {
                    lastSyncDates[key].setLastSynced(newLastSynced);
                });
            }

            //create new request query
            let newRequestQueries = [];

            response.results.forEach((res, i) => {
                if (this._processModelResult(res, keyedModelClasses[res["model"]], savePromises, relationshipModels)) {
                    shouldAskAgain = true;
                    newRequestQueries.push(requestQueries[i]);
                }
            });
            requestQueries = newRequestQueries;
        }
        while (shouldAskAgain) ;

        //wait for all saves & deletions (without relations)
        let results = await Promise.all(savePromises);

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
        Object.keys(lastSyncDates).forEach(model => {
            lastSyncPromises.push(lastSyncDates[model].save())
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
        //TODO update?
        if (!modelRes) {
            return false;
        }

        let shouldAskAgain = false;
        let modelName = modelClass.getSchemaName();

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
                            relationshipModels[modelName] = Helper.nonNull(relationshipModels[modelName], {});
                            relationshipModels[modelName][entity.id] = Helper.nonNull(relationshipModels[modelName][entity.id], {});
                            relationshipModels[modelName][entity.id]["entity"] = entity;
                            relationshipModels[modelName][entity.id]["relations"] = Helper.nonNull(relationshipModels[modelName][entity.id]["relations"], {});
                            relationshipModels[modelName][entity.id]["relations"][relation] = entity[relation];
                        }

                        //clear relation
                        entity[relation] = null;
                    }
                })
            });

            //Handle partial Models (different ids on client than server)
            if (modelClass.prototype instanceof EasySyncPartialModel) {
                let oldObjects = await modelClass.findByIds(newIds);
                let keyedEntities = Helper.arrayToObject(changedEntities, changedEntities => changedEntities.id);
                oldObjects.forEach(old => {
                    keyedEntities[old.id].clientId = old.clientId;
                });
            }

            //returns a save of the entities
            return EasySyncClientDb.getInstance().saveEntity(changedEntities).then(res => {
                return {
                    "model": modelName,
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
                "model": modelName,
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
        return await DataManager.load(SyncJob.SYNC_PATH_PREFIX +
            DataManager.buildQuery({
                "queries": JSON.stringify(query),
                "offset": offset
            }));
    }
}

SyncJob.SYNC_PATH_PREFIX = "sync";