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
exports.EasySyncController = void 0;
const EasySyncServerDb_1 = require("./EasySyncServerDb");
const _typeorm = require("typeorm");
const shared_1 = require("js-helper/dist/shared");
const typeorm = _typeorm;
// if (typeorm.default) {
//     typeorm = typeorm.default;
// }
class EasySyncController {
    static doSyncModel(model, lastSynced, offset, where, orderBy) {
        return __awaiter(this, void 0, void 0, function* () {
            const dateLastSynced = new Date(Number(lastSynced || 0));
            const newDateLastSynced = new Date().getTime();
            orderBy = shared_1.Helper.nonNull(orderBy, { id: 'ASC' });
            offset = Number(offset);
            where = where || {};
            Object.keys(where).forEach((key) => {
                if (where[key] && where[key].type && where[key].value && where[key].type === 'like') {
                    where[key] = typeorm.Like(where[key].value);
                }
                else if (where[key] && where[key].type && where[key].value && where[key].type === '>') {
                    where[key] = typeorm.MoreThan(where[key].value);
                }
                else if (where[key] && where[key].type && where[key].value && where[key].type === '>=') {
                    where[key] = typeorm.MoreThanOrEqual(where[key].value);
                }
            });
            where = Object.assign(where, {
                updatedAt: typeorm.MoreThan(dateLastSynced),
            });
            let entities = yield model.find(where, orderBy, this.MAX_MODELS_PER_RUN, offset, model.getRelations());
            if (typeof model.prepareSync === 'function') {
                entities = yield model.prepareSync(entities);
            }
            return {
                model: model.getSchemaName(),
                newLastSynced: newDateLastSynced,
                entities,
                nextOffset: offset + entities.length,
                shouldAskAgain: entities.length === this.MAX_MODELS_PER_RUN,
            };
        });
    }
    static syncModel(model, lastSynced, offset, where, req, order) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!model) {
                throw new Error('tried to sync not defined model!');
            }
            if (model.CAN_BE_SYNCED === false) {
                throw new Error(`tried to sync unsyncable model ${model.getSchemaName()}`);
            }
            return this.doSyncModel(model, lastSynced, offset, where, order);
        });
    }
    static execQuery(query, offset, req) {
        return __awaiter(this, void 0, void 0, function* () {
            let model = null;
            if (shared_1.Helper.isNotNull(query.model)) {
                model = EasySyncServerDb_1.EasySyncServerDb.getModel(query.model);
            }
            const lastSynced = shared_1.Helper.nonNull(query.lastSynced, 0);
            const where = shared_1.Helper.nonNull(query.where, {});
            const orderBy = shared_1.Helper.nonNull(query.orderBy, {});
            return this.syncModel(model, lastSynced, offset, where, req, orderBy);
        });
    }
    static sync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let requestQueries = [];
            if (req.query.queries) {
                requestQueries = JSON.parse(req.query.queries);
            }
            const offset = shared_1.Helper.nonNull(req.query.offset, 0);
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
            const results = yield Promise.all(resultPromises);
            results.forEach((tmpRes) => {
                // TODO merging
                if (tmpRes.shouldAskAgain) {
                    result.nextOffset =
                        result.nextOffset < 0 ? tmpRes.nextOffset : Math.min(tmpRes.nextOffset, result.nextOffset);
                }
                result.results.push(tmpRes);
            });
            return res.json(result);
        });
    }
    static doModifyModel(model, modelData, entities) {
        return __awaiter(this, void 0, void 0, function* () {
            let isArray = true;
            if (!Array.isArray(modelData)) {
                isArray = false;
                modelData = [modelData];
            }
            if (modelData.length === 0) {
                return [];
            }
            if (modelData.length > 0 && shared_1.Helper.isNull(entities) && modelData[0] instanceof model) {
                entities = modelData;
            }
            // get Entities from JSON
            if (shared_1.Helper.isNull(entities)) {
                entities = yield model.fromJson(modelData, undefined, true);
            }
            // Load already existing entities
            const loadedEntityIds = [];
            entities.forEach((entity) => loadedEntityIds.push(entity.id));
            const loadedEntitiesArray = yield model.findByIds(loadedEntityIds, model.getRelations());
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
                savePromises.push(entity.save().then((savedEntity) => {
                    Object.keys(relations).forEach((rel) => {
                        savedEntity[rel] = entityRelations[rel];
                    });
                    return savedEntity.save();
                }));
            });
            yield Promise.all(savePromises);
            let res = {};
            if (!isArray) {
                if (entities.length >= 1) {
                    [res] = entities;
                }
            }
            else {
                res = entities;
            }
            return res;
        });
    }
    static modifyModel(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const modelName = req.body.model;
            const modelData = req.body.values;
            const model = EasySyncServerDb_1.EasySyncServerDb.getModel(modelName);
            if (model.CAN_BE_SYNCED === false) {
                throw new Error(`tried to sync unsyncable model ${model.getSchemaName()}`);
            }
            return res.json(yield this.doModifyModel(model, modelData));
        });
    }
    static doDeleteModel(model, modelIds) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(modelIds)) {
                modelIds = [modelIds];
            }
            yield EasySyncServerDb_1.EasySyncServerDb.getInstance().deleteEntity(modelIds, model);
        });
    }
    static deleteModel(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const modelName = req.body.model;
            const modelIds = req.body.id;
            const model = EasySyncServerDb_1.EasySyncServerDb.getModel(modelName);
            if (model.CAN_BE_SYNCED === false) {
                throw new Error(`tried to delete unsyncable model ${model.getSchemaName()}`);
            }
            yield this.doDeleteModel(model, modelIds);
            return res.json({});
        });
    }
}
exports.EasySyncController = EasySyncController;
EasySyncController.MAX_MODELS_PER_RUN = 50;
//# sourceMappingURL=EasySyncController.js.map