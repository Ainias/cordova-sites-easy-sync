import {EasySyncServerDb} from "./EasySyncServerDb";
import * as _typeorm from "typeorm";
import {Helper} from "js-helper/dist/shared";

let typeorm = _typeorm;
// if (typeorm.default) {
//     typeorm = typeorm.default;
// }

export class EasySyncController {
    static MAX_MODELS_PER_RUN: number = 50;

    static async _doSyncModel(model, lastSynced, offset, where, orderBy?) {
        let dateLastSynced = new Date(parseInt(lastSynced || 0));
        let newDateLastSynced = new Date().getTime();

        orderBy = Helper.nonNull(orderBy, {"id": "ASC"});

        offset = parseInt(offset);

        where = where || {};
        Object.keys(where).forEach(key => {
            if (where[key] && where[key].type && where[key].value && where[key].type === "like"){
                where[key] = typeorm.Like(where[key].value);
            }
        });

        where = Object["assign"](where, {
            "updatedAt": typeorm.MoreThan(dateLastSynced),
        });


        let entities = await model.find(where, orderBy, this.MAX_MODELS_PER_RUN, offset, model.getRelations());
        if (typeof model.prepareSync === "function") {
            entities = await model.prepareSync(entities);
        }

        return {
            "model": model.getSchemaName(),
            "newLastSynced": newDateLastSynced,
            "entities": entities,
            "nextOffset": offset + entities.length,
            "shouldAskAgain": entities.length === this.MAX_MODELS_PER_RUN
        };
    }

    static async _syncModel(model, lastSynced, offset, where, req, order?) {
        if (!model) {
            throw new Error("tried to sync not defined model!");
        }
        if (model.CAN_BE_SYNCED === false) {
            throw new Error("tried to sync unsyncable model " + model.getSchemaName());
        }
        return this._doSyncModel(model, lastSynced, offset, where, order);
    }

    static async _execQuery(query, offset, req) {
        let model = null;
        if (Helper.isNotNull(query.model)) {
            model = EasySyncServerDb.getModel(query.model);
        }

        let lastSynced = Helper.nonNull(query.lastSynced, 0);
        let where = Helper.nonNull(query.where, {});
        let orderBy = Helper.nonNull(query.orderBy, {});
        return this._syncModel(model, lastSynced, offset, where, req, orderBy);
    }

    static async sync(req, res) {
        let requestQueries = [];
        if (req.query.queries) {
            requestQueries = JSON.parse(req.query.queries);
        }
        let offset = Helper.nonNull(req.query.offset, 0);

        //Before execQuery because of newLastSynced set here
        let result = {
            "nextOffset": -1,
            "newLastSynced": new Date().getTime(),
            "results": []
        };

        let resultPromises = [];
        requestQueries.forEach(query => {
            resultPromises.push(this._execQuery(query, offset, req));
        });

        let results = await Promise.all(resultPromises);

        results.forEach((res) => {
            //TODO merging
            if (res.shouldAskAgain) {
                result.nextOffset = result.nextOffset < 0 ? res.nextOffset : Math.min(res.nextOffset, result.nextOffset);
            }
            result.results.push(res)
        });

        return res.json(result);
    }

    static async _doModifyModel(model, modelData, entities?) {

        let isArray = true;
        if (!Array.isArray(modelData)) {
            isArray = false;
            modelData = [modelData];
        }

        if (modelData.length === 0) {
            return [];
        }

        if (modelData.length > 0 && Helper.isNull(entities) && modelData[0] instanceof model) {
            entities = modelData;
        }

        //get Entities from JSON
        if (Helper.isNull(entities)) {
            entities = await model._fromJson(modelData, undefined, true);
        }

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
                Object.keys(relations).forEach(rel => {
                    entity[rel] = entityRelations[rel];
                });
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

        return res.json(await this._doModifyModel(model, modelData));
    }

    static async _doDeleteModel(model, modelIds) {
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

        return res.json({});
    }
}