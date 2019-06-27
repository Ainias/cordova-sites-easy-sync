import {EasySyncServerDb} from "./EasySyncServerDb";
import * as _typeorm from "typeorm";
import {BaseDatabase} from "cordova-sites-database";

let typeorm = _typeorm;
if (typeorm.default) {
    typeorm = typeorm.default;
}

const MAX_MODELS_PER_RUN = 50;

export class EasySyncController {

    static async _doSyncModel(model, lastSynced, offset, where) {
        let dateLastSynced = new Date(parseInt(lastSynced || 0));
        let newDateLastSynced = new Date().getTime();
        offset = parseInt(offset);

        where = where || {};
        where = Object.assign(where, {
            "updatedAt": typeorm.MoreThan(dateLastSynced),
        });

        let entities = await model.find(where, null, MAX_MODELS_PER_RUN, offset, model.getRelations());

        return {
            "newLastSynced": newDateLastSynced,
            "entities": entities,
            "nextOffset": offset + entities.length,
            "shouldAskAgain": entities.length === MAX_MODELS_PER_RUN
        };
    }

    static async _syncModel(model, lastSynced, offset, where, req) {
        if (!model) {
            throw new Error("tried to sync not defined model!");
        }
        if (model.CAN_BE_SYNCED === false) {
            throw new Error("tried to sync unsyncable model " + model.getSchemaName());
        }
        return this._doSyncModel(model, lastSynced, offset, where);
    }

    static async sync(req, res) {
        let requestedModels = {};
        let modelClasses = {};
        if (req.query.models) {
            requestedModels = JSON.parse(req.query.models);
            Object.keys(requestedModels).forEach(model => {
                modelClasses[model] = EasySyncServerDb.getModel(model);
            });
        } else {
            let allModelClasses = EasySyncServerDb.getModel();
            Object.keys(allModelClasses).forEach(name => {
                if (allModelClasses[name].CAN_BE_SYNCED !== false) {
                    requestedModels[name] = {};
                    modelClasses[name] = allModelClasses[name];
                }
            });
        }

        //create lastSynced before the queries to db
        let result = {
            "nextOffset": -1,
            "models": {},
            "newLastSynced": new Date().getTime()
        };

        let requests = [];
        let modelNames = Object.keys(modelClasses);
        modelNames.forEach(modelName => {
            requests.push(this._syncModel(modelClasses[modelName], (requestedModels[modelName].lastSynced || 0), (req.query.offset || 0), requestedModels[modelName].where, req));
        });

        let results = await Promise.all(requests);

        results.forEach((res, i) => {
            if (res.shouldAskAgain) {
                result.nextOffset = result.nextOffset < 0 ? res.nextOffset : Math.min(res.nextOffset, result.nextOffset);
            }
            result.models[modelClasses[modelNames[i]].getSchemaName()] = res;
        });

        res.json(result);
    }

    static async _doModifyModel(model, modelData) {

        let isArray = true;
        if (!Array.isArray(modelData)) {
            isArray = false;
            modelData = [modelData];
        }

        //get Entities from JSON
        let entities = await model._fromJson(modelData, undefined, true);

        //Load already existing entities
        let loadedEntityIds = [];
        entities.forEach(entity => loadedEntityIds.push(entity.id));
        let loadedEntitiesArray = await model.findByIds(loadedEntityIds, model.getRelations());

        //Index loaded entities
        let loadedEntities = {};
        loadedEntitiesArray.forEach(loadedEntity => loadedEntities[loadedEntity.id] = loadedEntity);

        let relations = model.getRelationDefinitions();
        entities.forEach(entity => {
            //Wenn bereits vorhanden, dann...
            if (entity.id && loadedEntities[entity.id]) {
                let loadedEntity = loadedEntities[entity.id];
                Object.keys(relations).forEach(relationName => {
                    //...und entsprechende Relation nicht gesetzt, setze relation
                    if (!entity[relationName]) {
                        entity[relationName] = loadedEntity[relationName];
                    }
                });
            }
        });

        //save entities
        let savePromises = [];
        entities.forEach(entity => {
            let entityRelations = {};
            Object.keys(relations).forEach(rel => {
                entityRelations[rel] = entity[rel];
                entity[rel] = null;
            });
            savePromises.push(entity.save().then(entity => {
                debugger;
                console.log("saved ent", entity);

                Object.keys(relations).forEach(rel => {
                    entity[rel] = entityRelations[rel];
                });

                debugger;
                return entity.save();
            }));
        });
        await Promise.all(savePromises);

        let res = {};
        if (!isArray) {
            if (entities.length >= 1) {
                res = entities[0];
            }
        } else {
            res = entities;
        }

        return res;
    }

    static async modifyModel(req, res) {
        let modelName = req.body.model;
        let modelData = req.body.values;

        let model = EasySyncServerDb.getModel(modelName);
        if (model.CAN_BE_SYNCED === false) {
            throw new Error("tried to sync unsyncable model " + model.getSchemaName());
        }

        res.json(await this._doModifyModel(model, modelData));
    }

    static async _doDeleteModel(model, modelIds){
        if (!Array.isArray(modelIds)) {
            modelIds = [modelIds];
        }

        await EasySyncServerDb.getInstance().deleteEntity(modelIds, model);
    }

    static async deleteModel(req, res) {
        let modelName = req.body.model;
        let modelIds = req.body.id;

        let model = EasySyncServerDb.getModel(modelName);

        if (model.CAN_BE_SYNCED === false) {
            throw new Error("tried to delete unsyncable model " + model.getSchemaName());
        }

        await this._doDeleteModel(model, modelIds);

        res.json({});
    }
}