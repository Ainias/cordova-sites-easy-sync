import {LastSyncDates} from "./LastSyncDates";
import {DataManager} from "cordova-sites/dist/cordova-sites";
import {Helper, JsonHelper} from "js-helper";
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
    _syncedModels = {};
    _modelNames = [];
    _relationshipModels = {};
    _lastSyncDates: any = null;
    _keyedModelClasses = {};
    _savePromises = [];

    async syncInBackgroundIfDataExists(queries) {
        this._keyedModelClasses = EasySyncClientDb.getModel();

        let copiedQuery = JsonHelper.deepCopy(queries);

        let requestQueries = this._buildRequestQuery(copiedQuery);
        this._lastSyncDates = await this._getLastSyncModels(this._modelNames, requestQueries);

        let syncPromise = this.sync(queries);

        if (Object["values"](this._lastSyncDates).some(lastSync => {
            return lastSync["getLastSynced"]() === 0;
        })){
            await syncPromise;
        }
    }

    async sync(queries) {

        this._keyedModelClasses = EasySyncClientDb.getModel();

        let requestQueries = this._buildRequestQuery(queries);
        if (Helper.isNull(this._lastSyncDates)) {
            this._lastSyncDates = await this._getLastSyncModels(this._modelNames, requestQueries);
        }

        let saveResults = await this._doRuns(requestQueries);
        await this._handleRelations();

        //Save new lastSync models
        let lastSyncPromises = [];
        Object.keys(this._lastSyncDates).forEach(model => {
            lastSyncPromises.push(this._lastSyncDates[model].save())
        });
        await Promise.all(lastSyncPromises);

        console.log(saveResults);

        //Calculate final result and give it back
        let finalRes = {};
        saveResults.forEach(res => {
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

    private async _doRuns(requestQueries) {
        //Initialize some variables
        let newLastSynced = null;

        let response = null;
        let offset = 0;

        let shouldAskAgain = false;

        //Ask for next run until no more runs needed
        do {
            shouldAskAgain = false;
            response = await SyncJob._fetchModel(requestQueries, offset);
            offset = response["nextOffset"];

            //Update newLastSynced
            if (Helper.isNull(newLastSynced)) {
                newLastSynced = parseInt(response["newLastSynced"]);
                Object.keys(this._lastSyncDates).forEach(key => {
                    this._lastSyncDates[key].setLastSynced(newLastSynced);
                });
            }

            //create new request query
            let newRequestQueries = [];

            response.results.forEach((res, i) => {
                if (this._extractEntities(res)) {
                    shouldAskAgain = true;
                    newRequestQueries.push(requestQueries[i]);
                }
            });
            requestQueries = newRequestQueries;
        }
        while (shouldAskAgain);

        return Promise.all(this._savePromises);
    }

    private async _handleRelations() {

        let mergedRelations = {};
        let relationPromises = [];

        Object.keys(this._relationshipModels).forEach(modelClassName => {
            let relationDefinitions = this._keyedModelClasses[modelClassName].getRelationDefinitions();

            Object.keys(this._relationshipModels[modelClassName]).forEach(id => {
                let entity = this._relationshipModels[modelClassName][id]["entity"];
                let relations = this._relationshipModels[modelClassName][id]["relations"];
                let entityRelationPromises = [];

                //foreach relation load other models and save them here
                Object.keys(relations).forEach(relation => {
                    let valuePromise = Promise.resolve(undefined);
                    let target = relationDefinitions[relation]["target"];
                    let shouldSync = (relationDefinitions[relation].sync !== false);

                    if (Array.isArray(relations[relation])) {
                        if (shouldSync || relations[relation].every(id => !Helper.isSet(this._syncedModels, target, id))) {
                            valuePromise = this._keyedModelClasses[target].findByIds(relations[relation]);
                        } else {
                            let targetRelationDefinition = this._keyedModelClasses[target].getRelationDefinitions()[relationDefinitions[relation]["inverseSide"]];
                            relations[relation].filter(id => !Helper.isSet(this._relationshipModels, target, id)).forEach(id => {
                                mergedRelations[target] = Helper.nonNull(mergedRelations[target], {});
                                mergedRelations[target][id] = Helper.nonNull(mergedRelations[target][id], {});

                                let otherRelationValue = null;
                                if (targetRelationDefinition.type === "many-to-many" || targetRelationDefinition.type === "one-to-many") {
                                    otherRelationValue = Helper.nonNull(mergedRelations[target][id][relationDefinitions[relation]["inverseSide"]], []);
                                    otherRelationValue.push(entity);
                                } else {
                                    otherRelationValue = entity;
                                }
                                mergedRelations[target][id][relationDefinitions[relation]["inverseSide"]] = otherRelationValue;
                            });
                        }
                    } else if (shouldSync || !Helper.isSet(this._syncedModels, target, relations[relation])) {
                        valuePromise = this._keyedModelClasses[target].findById(relations[relation]);
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

        await Helper.asyncForEach(Object.keys(mergedRelations), async model => {
            let entities = Helper.arrayToObject(await this._keyedModelClasses[model].findByIds(Object.keys(mergedRelations[model])), e => e.id);
            Object.keys(mergedRelations[model]).forEach(id => {
                if (entities[id]) {
                    Object.keys(mergedRelations[model][id]).forEach(relation => {
                        if (Array.isArray(mergedRelations[model][id][relation])) {
                            entities[id][relation] = [].push.apply(Helper.nonNull(entities[id][relation], []), mergedRelations[model][id][relation])
                        } else {
                            entities[id][relation] = mergedRelations[model][id][relation];
                        }
                    });
                }
            });
            await EasySyncClientDb.getInstance().saveEntity(Object.values(entities));
        }, true);
    }

    private _extractEntities(modelRes) {
        if (!modelRes) {
            return false;
        }

        let shouldAskAgain = false;

        let modelClass = this._keyedModelClasses[modelRes["model"]];
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

        this._syncedModels[modelName] = Helper.nonNull(this._syncedModels[modelName], {});

        //convert json to entity and save it
        this._savePromises.push(modelClass._fromJson(changedModels).then(async changedEntities => {
            let relations = modelClass.getRelationDefinitions();
            let newIds = [];
            changedEntities.forEach(entity => {
                this._syncedModels[modelName][entity.id] = entity;

                newIds.push(entity.id);
                Object.keys(relations).forEach(relation => {
                    if (entity[relation]) {
                        this._addRelation(modelName, entity, relation);

                        //clear relation
                        entity[relation] = null;
                    }
                });
            });

            //Handle partial Models (different ids on client than server)
            if (modelClass.prototype instanceof EasySyncPartialModel) {
                let oldObjects = await modelClass.findByIds(newIds);
                let keyedEntities = Helper.arrayToObject(changedEntities, changedEntities => changedEntities.id);
                oldObjects.forEach(old => {
                    keyedEntities[old.id].clientId = old.clientId;
                });
            }

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
        this._savePromises.push(EasySyncClientDb.getInstance().deleteEntity(deletedModelsIds, modelClass).then(res => {
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

    private _buildRequestQuery(queries) {
        let requestQueries = [];

        //initializing query
        queries.forEach(query => {
            if (query.prototype instanceof EasySyncBaseModel) {
                query = {
                    model: query,
                    where: {}
                }
            }
            query.model = query.model.getSchemaName();
            this._modelNames.push(query.model);
            requestQueries.push(query);
        });

        return requestQueries;
    }

    private async _getLastSyncModels(modelNames, requestQueries) {
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
        return lastSyncDates;
    }

    private _addRelation(modelName, entity, relation) {
        this._relationshipModels[modelName] = Helper.nonNull(this._relationshipModels[modelName], {});
        this._relationshipModels[modelName][entity.id] = Helper.nonNull(this._relationshipModels[modelName][entity.id], {});
        this._relationshipModels[modelName][entity.id]["entity"] = entity;
        this._relationshipModels[modelName][entity.id]["relations"] = Helper.nonNull(this._relationshipModels[modelName][entity.id]["relations"], {});
        this._relationshipModels[modelName][entity.id]["relations"][relation] = entity[relation];
        return this._relationshipModels;
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