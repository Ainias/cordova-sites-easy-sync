import { EasySyncServerDb } from './EasySyncServerDb';
import * as _typeorm from 'typeorm';
import { Helper } from 'js-helper/dist/shared';

const typeorm = _typeorm;
// if (typeorm.default) {
//     typeorm = typeorm.default;
// }

export class EasySyncController {
    static MAX_MODELS_PER_RUN = 50;

    protected static async doSyncModel(model, lastSynced, offset, where, orderBy?) {
        const dateLastSynced = new Date(Number(lastSynced || 0));
        const newDateLastSynced = new Date().getTime();

        orderBy = Helper.nonNull(orderBy, { id: 'ASC' });

        offset = Number(offset);

        where = where || {};
        Object.keys(where).forEach((key) => {
            if (where[key] && where[key].type && where[key].value && where[key].type === 'like') {
                where[key] = typeorm.Like(where[key].value);
            } else if (where[key] && where[key].type && where[key].value && where[key].type === '>') {
                where[key] = typeorm.MoreThan(where[key].value);
            } else if (where[key] && where[key].type && where[key].value && where[key].type === '>=') {
                where[key] = typeorm.MoreThanOrEqual(where[key].value);
            }
        });

        where = Object.assign(where, {
            updatedAt: typeorm.MoreThan(dateLastSynced),
        });

        let entities = await model.find(where, orderBy, this.MAX_MODELS_PER_RUN, offset, model.getRelations());
        if (typeof model.prepareSync === 'function') {
            entities = await model.prepareSync(entities);
        }

        return {
            model: model.getSchemaName(),
            newLastSynced: newDateLastSynced,
            entities,
            nextOffset: offset + entities.length,
            shouldAskAgain: entities.length === this.MAX_MODELS_PER_RUN,
        };
    }

    protected static async syncModel(model, lastSynced, offset, where, req, order?) {
        if (!model) {
            throw new Error('tried to sync not defined model!');
        }
        if (model.CAN_BE_SYNCED === false) {
            throw new Error(`tried to sync unsyncable model ${model.getSchemaName()}`);
        }
        return this.doSyncModel(model, lastSynced, offset, where, order);
    }

    protected static async execQuery(query, offset, req) {
        let model = null;
        if (Helper.isNotNull(query.model)) {
            model = EasySyncServerDb.getModel(query.model);
        }

        const lastSynced = Helper.nonNull(query.lastSynced, 0);
        const where = Helper.nonNull(query.where, {});
        const orderBy = Helper.nonNull(query.orderBy, {});
        return this.syncModel(model, lastSynced, offset, where, req, orderBy);
    }

    static async sync(req, res) {
        let requestQueries = [];
        if (req.query.queries) {
            requestQueries = JSON.parse(req.query.queries);
        }
        const offset = Helper.nonNull(req.query.offset, 0);

        // Before execQuery because of newLastSynced set here
        const result = {
            nextOffset: -1,
            newLastSynced: new Date().getTime(),
            results: [],
        };

        const resultPromises = [];
        requestQueries.forEach((query) => {
            resultPromises.push(this.execQuery(query, offset, req));
        });

        const results = await Promise.all(resultPromises);

        results.forEach((tmpRes) => {
            // TODO merging
            if (tmpRes.shouldAskAgain) {
                result.nextOffset =
                    result.nextOffset < 0 ? tmpRes.nextOffset : Math.min(tmpRes.nextOffset, result.nextOffset);
            }
            result.results.push(tmpRes);
        });

        return res.json(result);
    }

    protected static async doModifyModel(model, modelData, entities?) {
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

        // get Entities from JSON
        if (Helper.isNull(entities)) {
            entities = await model.fromJson(modelData, undefined, true);
        }

        // Load already existing entities
        const loadedEntityIds = [];
        entities.forEach((entity) => loadedEntityIds.push(entity.id));
        const loadedEntitiesArray = await model.findByIds(loadedEntityIds, model.getRelations());

        // Index loaded entities
        const loadedEntities = {};
        loadedEntitiesArray.forEach((loadedEntity) => (loadedEntities[loadedEntity.id] = loadedEntity));

        const relations = model.getRelationDefinitions();
        entities.forEach((entity) => {
            // Wenn bereits vorhanden, dann...
            if (entity.id && loadedEntities[entity.id]) {
                const loadedEntity = loadedEntities[entity.id];
                Object.keys(relations).forEach((relationName) => {
                    // ...und entsprechende Relation nicht gesetzt, setze relation
                    if (!entity[relationName]) {
                        entity[relationName] = loadedEntity[relationName];
                    }
                });
            }
        });

        // save entities
        const savePromises = [];
        entities.forEach((entity) => {
            const entityRelations = {};
            Object.keys(relations).forEach((rel) => {
                entityRelations[rel] = entity[rel];
                entity[rel] = null;
            });
            savePromises.push(
                entity.save().then((savedEntity) => {
                    Object.keys(relations).forEach((rel) => {
                        savedEntity[rel] = entityRelations[rel];
                    });
                    return savedEntity.save();
                })
            );
        });
        await Promise.all(savePromises);

        let res = {};
        if (!isArray) {
            if (entities.length >= 1) {
                [res] = entities;
            }
        } else {
            res = entities;
        }

        return res;
    }

    static async modifyModel(req, res) {
        const modelName = req.body.model;
        const modelData = req.body.values;

        const model = EasySyncServerDb.getModel(modelName);
        if (model.CAN_BE_SYNCED === false) {
            throw new Error(`tried to sync unsyncable model ${model.getSchemaName()}`);
        }

        return res.json(await this.doModifyModel(model, modelData));
    }

    protected static async doDeleteModel(model, modelIds) {
        if (!Array.isArray(modelIds)) {
            modelIds = [modelIds];
        }

        await EasySyncServerDb.getInstance().deleteEntity(modelIds, model);
    }

    static async deleteModel(req, res) {
        const modelName = req.body.model;
        const modelIds = req.body.id;

        const model = EasySyncServerDb.getModel(modelName);

        if (model.CAN_BE_SYNCED === false) {
            throw new Error(`tried to delete unsyncable model ${model.getSchemaName()}`);
        }

        await this.doDeleteModel(model, modelIds);

        return res.json({});
    }
}
