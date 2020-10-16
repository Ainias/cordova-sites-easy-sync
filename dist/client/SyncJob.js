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
exports.SyncJob = void 0;
const LastSyncDates_1 = require("./LastSyncDates");
const client_1 = require("cordova-sites/dist/client");
const shared_1 = require("js-helper/dist/shared");
const EasySyncClientDb_1 = require("./EasySyncClientDb");
const typeorm = require("typeorm");
const EasySyncBaseModel_1 = require("../shared/EasySyncBaseModel");
const ClientFileMedium_1 = require("./ClientFileMedium");
const FileMedium_1 = require("../shared/FileMedium");
const BaseDatabase_1 = require("cordova-sites-database/dist/BaseDatabase");
class SyncJob {
    constructor() {
        this._syncedModels = {};
        this._modelNames = [];
        this._relationshipModels = {};
        this._lastSyncDates = {};
        this._keyedModelClasses = {};
        this._savePromise = Promise.resolve();
        this._queryRunner = null;
        this._finalRes = {};
        this._manyToManyRelations = {};
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
            if (Object.keys(this._lastSyncDates).length === 0) {
                this._lastSyncDates = yield this._getLastSyncModels(this._modelNames, requestQueries);
            }
            yield this._doRuns(requestQueries);
            //Save new lastSync models
            let lastSyncPromises = [];
            Object.keys(this._lastSyncDates).forEach(model => {
                lastSyncPromises.push(this._lastSyncDates[model].save());
            });
            yield Promise.all(lastSyncPromises);
            //disabled in doRuns. Cannot be reenabled sooner, but since lastSyncDates should not have any relations, it should be okay
            yield EasySyncClientDb_1.EasySyncClientDb.getInstance().rawQuery("PRAGMA foreign_keys = ON;");
            if (this._finalRes["FileMedium"] && this._finalRes["FileMedium"]["changed"]) {
                yield ClientFileMedium_1.ClientFileMedium._handleImages(yield FileMedium_1.FileMedium.findByIds(this._finalRes["FileMedium"]["changed"]));
            }
            return this._finalRes;
        });
    }
    _doRuns(requestQueries) {
        return __awaiter(this, void 0, void 0, function* () {
            //Initialize some variables
            let newLastSynced = null;
            let response = null;
            let offset = 0;
            //startTransaction maybe allow read, but not write?
            this._queryRunner = yield EasySyncClientDb_1.EasySyncClientDb.getInstance().createQueryRunner();
            this._savePromise = this._queryRunner.query("PRAGMA foreign_keys = OFF;").then(() => {
                return this._queryRunner.startTransaction();
            });
            //Ask for next run until no more runs needed
            let shouldAskAgain;
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
                //create new request query and save changes
                let newRequestQueries = [];
                response.results.forEach((res, i) => {
                    if (res && res.shouldAskAgain) {
                        shouldAskAgain = true;
                        newRequestQueries.push(requestQueries[i]);
                    }
                    //Extract entities
                    this._extractEntities(res);
                });
                requestQueries = newRequestQueries;
            } while (shouldAskAgain);
            yield this._handleManyToManyRelations();
            //wait for savePromises, stop transaction
            return this._savePromise.then(() => __awaiter(this, void 0, void 0, function* () {
                yield this._queryRunner.commitTransaction();
            })).catch((e) => __awaiter(this, void 0, void 0, function* () {
                console.error(e);
                yield this._queryRunner.rollbackTransaction();
            })).finally(() => __awaiter(this, void 0, void 0, function* () {
                yield this._queryRunner.release();
            }));
        });
    }
    /**
     * Extract the Entities and saves them(?) for one model
     *
     * @param modelRes
     * @private
     */
    _extractEntities(modelRes) {
        if (!modelRes) {
            return;
        }
        let modelClass = this._keyedModelClasses[modelRes["model"]];
        let modelName = modelClass.getSchemaName();
        let deletedModelsIds = [];
        let changedEntities = [];
        //split result into deleted and changed/new entities
        modelRes["entities"].forEach(entity => {
            if (entity.deleted) {
                deletedModelsIds.push(entity.id);
            }
            else {
                changedEntities.push(entity);
            }
        });
        this._syncedModels[modelName] = shared_1.Helper.nonNull(this._syncedModels[modelName], {});
        //convert json to entity and save it
        let schemaDefinition = modelClass.getSchemaDefinition();
        let relations = schemaDefinition["relations"];
        let columns = schemaDefinition["columns"];
        let changedEntityIds = [];
        changedEntities.forEach(entity => {
            Object.keys(relations).forEach(relation => {
                if (relations[relation].type === "many-to-many" && Array.isArray(entity[relation])) {
                    let table = relations[relation].joinTable;
                    let ownName;
                    if (table.joinColumn && table.joinColumn.name) {
                        ownName = table.joinColumn.name;
                    }
                    else {
                        ownName = modelClass.getSchemaName();
                        ownName = ownName.substr(0, 1).toLowerCase() + ownName.substr(1) + "Id";
                    }
                    let otherName;
                    if (table.inverseJoinColumn && table.inverseJoinColumn.name) {
                        otherName = table.inverseJoinColumn.name;
                    }
                    else {
                        otherName = relations[relation].target;
                        otherName = otherName.substr(0, 1).toLowerCase() + otherName.substr(1) + "Id";
                    }
                    this._manyToManyRelations[table.name] = shared_1.Helper.nonNull(this._manyToManyRelations[table.name], {});
                    this._manyToManyRelations[table.name]["values"] = shared_1.Helper.nonNull(this._manyToManyRelations[table.name]["values"], []);
                    this._manyToManyRelations[table.name]["delete_" + ownName] = shared_1.Helper.nonNull(this._manyToManyRelations[table.name]["delete_" + ownName], []);
                    this._manyToManyRelations[table.name]["delete_" + ownName].push(entity.id);
                    let otherIdsAlreadyInserted = [];
                    let insertedRelations = this._manyToManyRelations[table.name]["values"].filter(relValue => relValue[ownName] === entity.id);
                    insertedRelations.forEach(relValue => otherIdsAlreadyInserted.push(relValue[otherName]));
                    entity[relation].forEach(otherId => {
                        let index = otherIdsAlreadyInserted.indexOf(otherId);
                        if (index === -1) {
                            let value = {};
                            value[ownName] = entity.id;
                            value[otherName] = otherId;
                            this._manyToManyRelations[table.name]["values"].push(value);
                        }
                    });
                }
                else if ((relations[relation].type === "many-to-one"
                    || (relations[relation].type === "one-to-one" && relations[relation].joinColumn))
                //DO not check for a value of the relation here. Else If the first entity has no value set, the field
                // will not be set and therefore ignored for all other entites too
                ) {
                    let fieldName;
                    if (relations[relation].joinColumn && relations[relation].joinColumn.name) {
                        fieldName = relations[relation].joinColumn.name;
                    }
                    else {
                        fieldName = relation + "Id";
                    }
                    entity[fieldName] = entity[relation];
                }
                delete entity[relation];
            });
            Object.keys(columns).forEach(columnName => {
                if (columns[columnName].escapeHTML) {
                    entity[columnName] = shared_1.XSSHelper.escapeHTML(entity[columnName]);
                }
                if (columns[columnName].escapeJS) {
                    entity[columnName] = shared_1.XSSHelper.escapeJS(entity[columnName]);
                }
            });
            changedEntityIds.push(entity.id);
        });
        this._savePromise = this._savePromise.then(() => __awaiter(this, void 0, void 0, function* () { return yield this._insertOrReplace(modelClass, changedEntities); }));
        this._savePromise = this._savePromise.then(() => __awaiter(this, void 0, void 0, function* () { return yield this._deleteModels(modelClass, deletedModelsIds); }));
        this._finalRes[modelName] = shared_1.Helper.nonNull(this._finalRes[modelName], { "deleted": [], "changed": [] });
        this._finalRes[modelName]["deleted"].push(...deletedModelsIds);
        this._finalRes[modelName]["changed"].push(...changedEntityIds);
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
            let key = "" + query.model + JSON.stringify(query.where);
            if (shared_1.Helper.isNotNull(this._lastSyncDates[key])) {
                query["lastSynced"] = this._lastSyncDates[key].getLastSynced();
            }
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
    static _fetchModel(query, offset) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield client_1.DataManager.load(SyncJob.SYNC_PATH_PREFIX +
                client_1.DataManager.buildQuery({
                    "queries": JSON.stringify(query),
                    "offset": offset
                }));
        });
    }
    _insertOrReplace(modelClass, changedEntities) {
        return __awaiter(this, void 0, void 0, function* () {
            const MAX_INSERT_IN_ONE_GO = 300;
            if (changedEntities.length === 0) {
                return;
            }
            let schemaDefinition = modelClass.getSchemaDefinition();
            let tableName = schemaDefinition.name;
            tableName = shared_1.Helper.toSnakeCase(tableName);
            let columns = schemaDefinition.columns;
            //Get fields from entity for including relation fields
            const fields = Object.keys(changedEntities[0]);
            let values = [];
            let valueStrings = [];
            yield shared_1.Helper.asyncForEach(changedEntities, (entity) => __awaiter(this, void 0, void 0, function* () {
                let valueString = [];
                //Stellt die reihenfolge sicher
                fields.forEach(field => {
                    let val = entity[field];
                    if (columns[field] && columns[field].transformer) {
                        val = columns[field].transformer.to(val);
                    }
                    if (columns[field] && columns[field].type === BaseDatabase_1.BaseDatabase.TYPES.SIMPLE_JSON) {
                        val = JSON.stringify(val);
                    }
                    values.push(val);
                    valueString.push("?");
                });
                valueStrings.push("(" + valueString.join(",") + ")");
                if (valueStrings.length >= MAX_INSERT_IN_ONE_GO) {
                    let sql = "INSERT OR REPLACE INTO " + tableName + " (" + fields.join(",") + ") VALUES " + valueStrings.join(",");
                    yield this._queryRunner.query(sql, values);
                    valueStrings = [];
                    values = [];
                }
            }));
            if (valueStrings.length > 0) {
                let sql = "INSERT OR REPLACE INTO " + tableName + " (" + fields.join(",") + ") VALUES " + valueStrings.join(",");
                yield this._queryRunner.query(sql, values);
            }
        });
    }
    _deleteModels(modelClass, deletedModelsIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const MAX_DELETES_IN_ONE_GO = 300;
            if (deletedModelsIds.length === 0) {
                return;
            }
            let tableName = modelClass.getSchemaName();
            tableName = shared_1.Helper.toSnakeCase(tableName);
            let ids = [];
            let valueStrings = [];
            yield shared_1.Helper.asyncForEach(deletedModelsIds, (entityId) => __awaiter(this, void 0, void 0, function* () {
                ids.push(entityId);
                valueStrings.push("?");
                if (valueStrings.length >= MAX_DELETES_IN_ONE_GO) {
                    let sql = "DELETE FROM " + tableName + " WHERE id IN (" + ids.join(",") + ")";
                    yield this._queryRunner.query(sql);
                    valueStrings = [];
                    ids = [];
                }
            }));
            if (valueStrings.length > 0) {
                let sql = "DELETE FROM " + tableName + " WHERE id IN (" + ids.join(",") + ")";
                yield this._queryRunner.query(sql);
            }
        });
    }
    _handleManyToManyRelations() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._savePromise;
            let promises = [];
            Object.keys(this._manyToManyRelations).forEach(table => {
                let sql = "DELETE FROM " + table + " WHERE ";
                let deleteSqls = [];
                Object.keys(this._manyToManyRelations[table]).forEach(field => {
                    if (field.startsWith("delete_")) {
                        deleteSqls.push(field.substr(7) + " IN (" + this._manyToManyRelations[table][field].join(",") + ")");
                    }
                });
                sql += deleteSqls.join(" OR ") + ";";
                promises.push(this._queryRunner.query(sql).then(() => {
                    if (this._manyToManyRelations[table].values.length > 0) {
                        let fields = Object.keys(this._manyToManyRelations[table].values[0]);
                        let valueStrings = [];
                        this._manyToManyRelations[table].values.forEach(valuePair => {
                            let values = [];
                            fields.forEach(field => {
                                values.push(valuePair[field]);
                            });
                            valueStrings.push("(" + values.join(",") + ")");
                        });
                        let sql = "INSERT OR REPLACE INTO " + table + "(" + fields.join(",") + ") VALUES " + valueStrings.join(",") + ";";
                        return this._queryRunner.query(sql);
                    }
                }));
            });
            yield Promise.all(promises);
        });
    }
}
exports.SyncJob = SyncJob;
SyncJob.SYNC_PATH_PREFIX = "sync";
//# sourceMappingURL=SyncJob.js.map