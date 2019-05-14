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
        if (!model){
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

    static async modifyModel(req, res) {
        let modelName = req.body.model;
        let modelData = req.body.values;

        let isArray = true;
        if (!Array.isArray(modelData)) {
            isArray = false;
            modelData = [modelData];
        }

        let model = EasySyncServerDb.getModel(modelName);
        let entities = await model._fromJson(modelData, undefined, true);


        let savedEntityIds = [];
        entities.forEach(entity => savedEntityIds.push(entity.id));
        let savedEntitiesArray = model.findByIds(savedEntityIds);
        let savedEntities = {};
        savedEntitiesArray.forEach(savedEntity => savedEntities[savedEntity.id] = savedEntity);

        let relations = model.getRelationDefinitions();
        entities.forEach(entity => {
            if (entity.id && savedEntities[entity.id]) {
                let savedEntity = savedEntities[entity.id];
                Object.keys(relations).forEach(relationName => {
                    if (!entity[relationName]){
                        entity[relationName] = savedEntity[relationName];
                    }
                });
            }
        });

        let savePromises = [];
        entities.forEach(model => {
            savePromises.push(model.save());
        });
        await Promise.all(savePromises);
        if (!isArray) {
            if (entities.length >= 1) {
                res.json(entities[0]);
            } else {
                res.json({});
            }
        } else {
            res.json(entities);
        }
    }
}