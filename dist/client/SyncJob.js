"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const LastSyncDates_1 = require("./LastSyncDates");
const client_1 = require("cordova-sites/dist/client");
const shared_1 = require("js-helper/dist/shared");
const EasySyncClientDb_1 = require("./EasySyncClientDb");
const _typeorm = require("typeorm");
const EasySyncPartialModel_1 = require("../shared/EasySyncPartialModel");
const EasySyncBaseModel_1 = require("../shared/EasySyncBaseModel");
let typeorm = _typeorm;
// if (typeorm.default) {
//     typeorm = typeorm.default;
// }
class SyncJob {
    constructor() {
        this._syncedModels = {};
        this._modelNames = [];
        this._relationshipModels = {};
        this._lastSyncDates = {};
        this._keyedModelClasses = {};
        this._savePromises = [];
    }
    syncInBackgroundIfDataExists(queries) {
        return __awaiter(this, void 0, void 0, function* () {
            this._keyedModelClasses = EasySyncClientDb_1.EasySyncClientDb.getModel();
            let copiedQuery = shared_1.JsonHelper.deepCopy(queries);
            let requestQueries = this._buildRequestQuery(copiedQuery);
            this._lastSyncDates = yield this._getLastSyncModels(this._modelNames, requestQueries);
            this._syncPromise = this.sync(queries);
            if (Object["values"](this._lastSyncDates).some(lastSync => {
                return lastSync["getLastSynced"]() === 0;
            })) {
                yield this._syncPromise;
            }
        });
    }
    getSyncPromise() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._syncPromise;
        });
    }
    sync(queries) {
        return __awaiter(this, void 0, void 0, function* () {
            this._keyedModelClasses = EasySyncClientDb_1.EasySyncClientDb.getModel();
            let requestQueries = this._buildRequestQuery(queries);
            if (shared_1.Helper.isNull(this._lastSyncDates)) {
                this._lastSyncDates = yield this._getLastSyncModels(this._modelNames, requestQueries);
            }
            let saveResults = yield this._doRuns(requestQueries);
            yield this._handleRelations();
            //Save new lastSync models
            let lastSyncPromises = [];
            Object.keys(this._lastSyncDates).forEach(model => {
                lastSyncPromises.push(this._lastSyncDates[model].save());
            });
            yield Promise.all(lastSyncPromises);
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
                    }
                    else {
                        finalRes[res.model]["changed"] = finalRes[res.model]["changed"].concat(res.entities);
                    }
                }
            });
            return finalRes;
        });
    }
    _doRuns(requestQueries) {
        return __awaiter(this, void 0, void 0, function* () {
            //Initialize some variables
            let newLastSynced = null;
            let response = null;
            let offset = 0;
            let shouldAskAgain = false;
            //Ask for next run until no more runs needed
            do {
                shouldAskAgain = false;
                response = yield SyncJob._fetchModel(requestQueries, offset);
                offset = response["nextOffset"];
                //Update newLastSynced
                if (shared_1.Helper.isNull(newLastSynced)) {
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
            } while (shouldAskAgain);
            return Promise.all(this._savePromises);
        });
    }
    _handleRelations() {
        return __awaiter(this, void 0, void 0, function* () {
            let mergedRelations = {};
            let relationPromises = [];
            Object.keys(this._relationshipModels).forEach(modelClassName => {
                let relationDefinitions = this._keyedModelClasses[modelClassName].getRelationDefinitions();
                Object.keys(this._relationshipModels[modelClassName]).forEach(id => {
                    let entity = this._relationshipModels[modelClassName][id]["entity"];
                    let relations = this._relationshipModels[modelClassName][id]["relations"];
                    let entityRelationPromises = [];
                    Object.keys(relations).forEach(relation => {
                        //foreach relation load other models and save them here
                        let valuePromise = this._handleSingleRelation(relationDefinitions, relation, relations, mergedRelations, entity);
                        entityRelationPromises.push(valuePromise.then(value => {
                            entity[relation] = value;
                        }));
                    });
                    //Save after all relationships has been set
                    relationPromises.push(Promise.all(entityRelationPromises).then(() => {
                        return entity.save(true);
                    }));
                });
            });
            //Wait for relation-promises
            yield Promise.all(relationPromises);
            yield shared_1.Helper.asyncForEach(Object.keys(mergedRelations), (model) => __awaiter(this, void 0, void 0, function* () {
                let entities = shared_1.Helper.arrayToObject(yield this._keyedModelClasses[model].findByIds(Object.keys(mergedRelations[model]), this._keyedModelClasses[model].getRelations()), e => e.id);
                Object.keys(mergedRelations[model]).forEach(id => {
                    if (entities[id]) {
                        Object.keys(mergedRelations[model][id]).forEach(relation => {
                            if (Array.isArray(mergedRelations[model][id][relation])) {
                                entities[id][relation] = shared_1.Helper.nonNull(entities[id][relation], []);
                                entities[id][relation].push.apply(entities[id][relation], mergedRelations[model][id][relation]);
                            }
                            else {
                                entities[id][relation] = mergedRelations[model][id][relation];
                            }
                        });
                    }
                });
                yield EasySyncClientDb_1.EasySyncClientDb.getInstance().saveEntity(Object.values(entities));
            }), true);
        });
    }
    _handleSingleRelation(relationDefinitions, relationName, relations, mergedRelations, entity) {
        let valuePromise = Promise.resolve(undefined);
        let target = relationDefinitions[relationName]["target"];
        let shouldSync = (relationDefinitions[relationName].sync !== false);
        //is relation a *-to-many relation?
        if (Array.isArray(relations[relationName])) {
            if (shouldSync || relations[relationName].every(id => !shared_1.Helper.isSet(this._syncedModels, target, id))) {
                valuePromise = this._keyedModelClasses[target].findByIds(relations[relationName]);
            }
            else {
                let targetRelationDefinition = this._keyedModelClasses[target].getRelationDefinitions()[relationDefinitions[relationName]["inverseSide"]];
                relations[relationName].filter(id => !shared_1.Helper.isSet(this._relationshipModels, target, id)).forEach(id => {
                    mergedRelations[target] = shared_1.Helper.nonNull(mergedRelations[target], {});
                    mergedRelations[target][id] = shared_1.Helper.nonNull(mergedRelations[target][id], {});
                    let otherRelationValue = null;
                    if (targetRelationDefinition.type === "many-to-many" || targetRelationDefinition.type === "one-to-many") {
                        otherRelationValue = shared_1.Helper.nonNull(mergedRelations[target][id][relationDefinitions[relationName]["inverseSide"]], []);
                        otherRelationValue.push(entity);
                    }
                    else {
                        otherRelationValue = entity;
                    }
                    mergedRelations[target][id][relationDefinitions[relationName]["inverseSide"]] = otherRelationValue;
                });
            }
        }
        else if (shouldSync || !shared_1.Helper.isSet(this._syncedModels, target, relations[relationName])) {
            valuePromise = this._keyedModelClasses[target].findById(relations[relationName]);
        }
        return valuePromise;
    }
    /**
     * Extract the Entities and saves them(?) for one model
     *
     * @param modelRes
     * @private
     */
    _extractEntities(modelRes) {
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
            }
            else {
                changedModels.push(entity);
            }
        });
        this._syncedModels[modelName] = shared_1.Helper.nonNull(this._syncedModels[modelName], {});
        //convert json to entity and save it
        this._savePromises.push(modelClass._fromJson(changedModels).then((changedEntities) => __awaiter(this, void 0, void 0, function* () {
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
            if (modelClass.prototype instanceof EasySyncPartialModel_1.EasySyncPartialModel) {
                let oldObjects = yield modelClass.findByIds(newIds);
                let keyedEntities = shared_1.Helper.arrayToObject(changedEntities, changedEntities => changedEntities.id);
                oldObjects.forEach(old => {
                    keyedEntities[old.id].clientId = old.clientId;
                });
            }
            return EasySyncClientDb_1.EasySyncClientDb.getInstance().saveEntity(changedEntities).then(res => {
                return {
                    "model": modelName,
                    "entities": res,
                    "deleted": false
                };
            }).catch(e => {
                console.error(e);
                return Promise.reject(e);
            });
        })));
        //Deletion of the entities
        this._savePromises.push(EasySyncClientDb_1.EasySyncClientDb.getInstance().deleteEntity(deletedModelsIds, modelClass).then(res => {
            return {
                "model": modelName,
                "entities": res,
                "deleted": true
            };
        }).catch(e => {
            console.error(e);
            return Promise.reject(e);
        }));
        if (modelRes.shouldAskAgain) {
            shouldAskAgain = true;
        }
        return shouldAskAgain;
    }
    _buildRequestQuery(queries) {
        let requestQueries = [];
        //initializing query
        queries.forEach(query => {
            if (query.prototype instanceof EasySyncBaseModel_1.EasySyncBaseModel) {
                query = {
                    model: query,
                    where: {}
                };
            }
            query.model = query.model.getSchemaName();
            this._modelNames.push(query.model);
            requestQueries.push(query);
        });
        return requestQueries;
    }
    _getLastSyncModels(modelNames, requestQueries) {
        return __awaiter(this, void 0, void 0, function* () {
            //Load syncModels
            let lastSyncModelsArray = yield LastSyncDates_1.LastSyncDates.find({
                "model": typeorm.In(modelNames)
            });
            let lastSyncDates = shared_1.Helper.arrayToObject(lastSyncModelsArray, model => "" + model.getModel() + JSON.stringify(model.where));
            requestQueries.forEach(query => {
                let key = "" + query.model + JSON.stringify(query.where);
                if (shared_1.Helper.isNull(lastSyncDates[key])) {
                    let lastSyncDate = new LastSyncDates_1.LastSyncDates();
                    lastSyncDate.setModel(query.model);
                    lastSyncDate.where = query.where;
                    lastSyncDate.setLastSynced(0);
                    lastSyncDates[key] = lastSyncDate;
                }
                query["lastSynced"] = lastSyncDates[key].getLastSynced();
            });
            return lastSyncDates;
        });
    }
    _addRelation(modelName, entity, relation) {
        this._relationshipModels[modelName] = shared_1.Helper.nonNull(this._relationshipModels[modelName], {});
        this._relationshipModels[modelName][entity.id] = shared_1.Helper.nonNull(this._relationshipModels[modelName][entity.id], {});
        this._relationshipModels[modelName][entity.id]["entity"] = entity;
        this._relationshipModels[modelName][entity.id]["relations"] = shared_1.Helper.nonNull(this._relationshipModels[modelName][entity.id]["relations"], {});
        this._relationshipModels[modelName][entity.id]["relations"][relation] = entity[relation];
        return this._relationshipModels;
    }
    static _fetchModel(query, offset) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield client_1.DataManager.load(SyncJob.SYNC_PATH_PREFIX +
                client_1.DataManager.buildQuery({
                    "queries": JSON.stringify(query),
                    "offset": offset
                }));
        });
    }
}
exports.SyncJob = SyncJob;
SyncJob.SYNC_PATH_PREFIX = "sync";
//# sourceMappingURL=SyncJob.js.map