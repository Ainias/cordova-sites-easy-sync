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
        this.syncedModels = {};
        this.modelNames = [];
        this.relationshipModels = {};
        this.lastSyncDates = {};
        this.keyedModelClasses = {};
        this.savePromise = Promise.resolve();
        this.queryRunner = null;
        this.finalRes = {};
        this.manyToManyRelations = {};
    }
    syncInBackgroundIfDataExists(queries, downloadImages) {
        return __awaiter(this, void 0, void 0, function* () {
            this.keyedModelClasses = EasySyncClientDb_1.EasySyncClientDb.getAllModels();
            const copiedQuery = shared_1.JsonHelper.deepCopy(queries);
            const requestQueries = this.buildRequestQuery(copiedQuery);
            this.lastSyncDates = yield SyncJob.getLastSyncModels(this.modelNames, requestQueries);
            this.syncPromise = this.sync(queries, downloadImages);
            if (Object.values(this.lastSyncDates).some((lastSync) => {
                return lastSync.getLastSynced() === 0;
            })) {
                yield this.syncPromise;
            }
        });
    }
    getSyncPromise() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.syncPromise;
        });
    }
    sync(queries, downloadImages) {
        return __awaiter(this, void 0, void 0, function* () {
            downloadImages = shared_1.Helper.nonNull(downloadImages, true);
            this.keyedModelClasses = EasySyncClientDb_1.EasySyncClientDb.getAllModels();
            const requestQueries = this.buildRequestQuery(queries);
            if (Object.keys(this.lastSyncDates).length === 0) {
                this.lastSyncDates = yield SyncJob.getLastSyncModels(this.modelNames, requestQueries);
            }
            yield this.doRuns(requestQueries);
            // disabled in doRuns. Cannot be reenabled sooner, but since lastSyncDates should not have any relations, it should be okay
            yield EasySyncClientDb_1.EasySyncClientDb.getInstance().rawQuery('PRAGMA foreign_keys = ON;');
            const lastSyncPromises = [];
            Object.keys(this.lastSyncDates).forEach((model) => {
                lastSyncPromises.push(this.lastSyncDates[model].save());
            });
            yield Promise.all(lastSyncPromises).catch((e) => {
                console.error('[SYNC JOB] Error while saving lastSyncDates', e);
            });
            if (this.finalRes.FileMedium && this.finalRes.FileMedium.changed && downloadImages) {
                yield ClientFileMedium_1.ClientFileMedium.handleImages(yield FileMedium_1.FileMedium.findByIds(this.finalRes.FileMedium.changed));
            }
            return this.finalRes;
        });
    }
    doRuns(requestQueries) {
        return __awaiter(this, void 0, void 0, function* () {
            let newLastSynced = null;
            let response = null;
            let offset = 0;
            // startTransaction maybe allow read, but not write?
            yield EasySyncClientDb_1.EasySyncClientDb.getInstance().rawQuery('PRAGMA foreign_keys = OFF;');
            this.queryRunner = yield EasySyncClientDb_1.EasySyncClientDb.getInstance().createQueryRunner();
            if (!EasySyncClientDb_1.EasySyncClientDb.getInstance().isCordova()) {
                this.savePromise = this.queryRunner.startTransaction().catch((e) => {
                    console.error('[SYNC JOB] transactionStartError', e);
                });
            }
            else {
                this.savePromise = Promise.resolve();
            }
            // Ask for next run until no more runs needed
            let shouldAskAgain;
            do {
                shouldAskAgain = false;
                // eslint-disable-next-line no-await-in-loop
                response = yield SyncJob.fetchModel(requestQueries, offset);
                offset = response.nextOffset;
                // Update newLastSynced
                if (shared_1.Helper.isNull(newLastSynced)) {
                    newLastSynced = Number(response.newLastSynced);
                    // eslint-disable-next-line no-loop-func
                    Object.keys(this.lastSyncDates).forEach((key) => {
                        this.lastSyncDates[key].setLastSynced(newLastSynced);
                    });
                }
                // create new request query and save changes
                const newRequestQueries = [];
                // eslint-disable-next-line no-loop-func
                response.results.forEach((res, i) => {
                    if (res && res.shouldAskAgain) {
                        shouldAskAgain = true;
                        newRequestQueries.push(requestQueries[i]);
                    }
                    // Extract entities
                    this.extractEntities(res);
                });
                requestQueries = newRequestQueries;
            } while (shouldAskAgain);
            yield this.handleManyToManyRelations();
            // wait for savePromises, stop transaction
            return this.savePromise
                .then(() => __awaiter(this, void 0, void 0, function* () {
                if (!EasySyncClientDb_1.EasySyncClientDb.getInstance().isCordova()) {
                    return this.queryRunner.commitTransaction();
                }
                return Promise.resolve();
            }))
                .catch((e) => {
                console.error('[SYNC JOB] Saving error: ', e);
                return this.queryRunner.rollbackTransaction();
            })
                .finally(() => __awaiter(this, void 0, void 0, function* () {
                yield this.queryRunner.release();
                // Start Transaction since TypeORM works in transactions
                if (!EasySyncClientDb_1.EasySyncClientDb.getInstance().isCordova()) {
                    yield this.queryRunner.startTransaction();
                }
            }))
                .catch((e) => {
                console.error('[SYNC JOB] Release error', e);
            });
        });
    }
    /**
     * Extract the Entities and saves them(?) for one model
     *
     * @param modelRes
     * @private
     */
    extractEntities(modelRes) {
        if (!modelRes) {
            return;
        }
        const modelClass = this.keyedModelClasses[modelRes.model];
        const modelName = modelClass.getSchemaName();
        const deletedModelsIds = [];
        const changedEntities = [];
        // split result into deleted and changed/new entities
        modelRes.entities.forEach((entity) => {
            if (entity.deleted) {
                deletedModelsIds.push(entity.id);
            }
            else {
                changedEntities.push(entity);
            }
        });
        this.syncedModels[modelName] = shared_1.Helper.nonNull(this.syncedModels[modelName], {});
        // convert json to entity and save it
        const schemaDefinition = modelClass.getSchemaDefinition();
        const { relations } = schemaDefinition;
        const { columns } = schemaDefinition;
        const changedEntityIds = [];
        changedEntities.forEach((entity) => {
            Object.keys(relations).forEach((relation) => {
                if (relations[relation].type === 'many-to-many' && Array.isArray(entity[relation])) {
                    const table = relations[relation].joinTable;
                    let ownName;
                    if (table.joinColumn && table.joinColumn.name) {
                        ownName = table.joinColumn.name;
                    }
                    else {
                        ownName = modelClass.getSchemaName();
                        ownName = `${ownName.substr(0, 1).toLowerCase() + ownName.substr(1)}Id`;
                    }
                    let otherName;
                    if (table.inverseJoinColumn && table.inverseJoinColumn.name) {
                        otherName = table.inverseJoinColumn.name;
                    }
                    else {
                        otherName = relations[relation].target;
                        otherName = `${otherName.substr(0, 1).toLowerCase() + otherName.substr(1)}Id`;
                    }
                    this.manyToManyRelations[table.name] = shared_1.Helper.nonNull(this.manyToManyRelations[table.name], {});
                    this.manyToManyRelations[table.name].values = shared_1.Helper.nonNull(this.manyToManyRelations[table.name].values, []);
                    this.manyToManyRelations[table.name][`delete_${ownName}`] = shared_1.Helper.nonNull(this.manyToManyRelations[table.name][`delete_${ownName}`], []);
                    this.manyToManyRelations[table.name][`delete_${ownName}`].push(entity.id);
                    const otherIdsAlreadyInserted = [];
                    const insertedRelations = this.manyToManyRelations[table.name].values.filter((relValue) => relValue[ownName] === entity.id);
                    insertedRelations.forEach((relValue) => otherIdsAlreadyInserted.push(relValue[otherName]));
                    entity[relation].forEach((otherId) => {
                        const index = otherIdsAlreadyInserted.indexOf(otherId);
                        if (index === -1) {
                            const value = {};
                            value[ownName] = entity.id;
                            value[otherName] = otherId;
                            this.manyToManyRelations[table.name].values.push(value);
                        }
                    });
                }
                else if (relations[relation].type === 'many-to-one' ||
                    (relations[relation].type === 'one-to-one' && relations[relation].joinColumn)
                // DO not check for a value of the relation here. Else If the first entity has no value set, the field
                // will not be set and therefore ignored for all other entites too
                ) {
                    let fieldName;
                    if (relations[relation].joinColumn && relations[relation].joinColumn.name) {
                        fieldName = relations[relation].joinColumn.name;
                    }
                    else {
                        fieldName = `${relation}Id`;
                    }
                    entity[fieldName] = entity[relation];
                }
                delete entity[relation];
            });
            Object.keys(columns).forEach((columnName) => {
                if (columns[columnName].escapeHTML) {
                    entity[columnName] = shared_1.XSSHelper.escapeHTML(entity[columnName]);
                }
                if (columns[columnName].escapeJS) {
                    entity[columnName] = shared_1.XSSHelper.escapeJS(entity[columnName]);
                }
            });
            changedEntityIds.push(entity.id);
        });
        this.savePromise = this.savePromise.then(() => this.insertOrReplace(modelClass, changedEntities));
        this.savePromise = this.savePromise.then(() => this.deleteModels(modelClass, deletedModelsIds));
        this.finalRes[modelName] = shared_1.Helper.nonNull(this.finalRes[modelName], { deleted: [], changed: [] });
        this.finalRes[modelName].deleted.push(...deletedModelsIds);
        this.finalRes[modelName].changed.push(...changedEntityIds);
    }
    buildRequestQuery(queries) {
        const requestQueries = [];
        // initializing query
        queries.forEach((query) => {
            if (query.prototype instanceof EasySyncBaseModel_1.EasySyncBaseModel) {
                query = {
                    model: query,
                    where: {},
                };
            }
            query.model = query.model.getSchemaName();
            this.modelNames.push(query.model);
            requestQueries.push(query);
            const key = `${query.model}${JSON.stringify(query.where)}`;
            if (shared_1.Helper.isNotNull(this.lastSyncDates[key])) {
                query.lastSynced = this.lastSyncDates[key].getLastSynced();
            }
        });
        return requestQueries;
    }
    static getLastSyncModels(modelNames, requestQueries) {
        return __awaiter(this, void 0, void 0, function* () {
            // Load syncModels
            const lastSyncModelsArray = yield LastSyncDates_1.LastSyncDates.find({
                model: typeorm.In(modelNames),
            });
            const lastSyncDates = shared_1.Helper.arrayToObject(lastSyncModelsArray, (model) => `${model.getModel()}${JSON.stringify(model.where)}`);
            requestQueries.forEach((query) => {
                const key = `${query.model}${JSON.stringify(query.where)}`;
                if (shared_1.Helper.isNull(lastSyncDates[key])) {
                    const lastSyncDate = new LastSyncDates_1.LastSyncDates();
                    lastSyncDate.setModel(query.model);
                    lastSyncDate.where = query.where;
                    lastSyncDate.setLastSynced(0);
                    lastSyncDates[key] = lastSyncDate;
                }
                query.lastSynced = lastSyncDates[key].getLastSynced();
            });
            return lastSyncDates;
        });
    }
    static fetchModel(query, offset) {
        return __awaiter(this, void 0, void 0, function* () {
            return client_1.DataManager.load(SyncJob.SYNC_PATH_PREFIX +
                client_1.DataManager.buildQuery({
                    queries: JSON.stringify(query),
                    offset,
                }));
        });
    }
    insertOrReplace(modelClass, changedEntities) {
        return __awaiter(this, void 0, void 0, function* () {
            const MAX_INSERT_IN_ONE_GO = 50;
            if (changedEntities.length === 0) {
                return;
            }
            const schemaDefinition = modelClass.getSchemaDefinition();
            let tableName = schemaDefinition.name;
            tableName = shared_1.Helper.toSnakeCase(tableName);
            const { columns } = schemaDefinition;
            // Get fields from entity for including relation fields
            const fields = Object.keys(changedEntities[0]);
            let values = [];
            let valueStrings = [];
            yield shared_1.Helper.asyncForEach(changedEntities, (entity) => __awaiter(this, void 0, void 0, function* () {
                const valueString = [];
                // Stellt die reihenfolge sicher
                fields.forEach((field) => {
                    let val = entity[field];
                    if (columns[field] && columns[field].transformer) {
                        val = columns[field].transformer.to(val);
                    }
                    if (columns[field] && columns[field].type === BaseDatabase_1.BaseDatabase.TYPES.SIMPLE_JSON) {
                        val = JSON.stringify(val);
                    }
                    values.push(val);
                    valueString.push('?');
                });
                valueStrings.push(`(${valueString.join(',')})`);
                if (valueStrings.length >= MAX_INSERT_IN_ONE_GO) {
                    const sql = `INSERT
                OR REPLACE INTO
                ${tableName}
                (
                ${fields.join(',')}
                )
                VALUES
                ${valueStrings.join(',')}`;
                    yield this.queryRunner.query(sql, values);
                    valueStrings = [];
                    values = [];
                }
            }));
            if (valueStrings.length > 0) {
                const sql = `INSERT
            OR REPLACE INTO
            ${tableName}
            (
            ${fields.join(',')}
            )
            VALUES
            ${valueStrings.join(',')}`;
                yield this.queryRunner.query(sql, values);
            }
        });
    }
    deleteModels(modelClass, deletedModelsIds) {
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
                valueStrings.push('?');
                if (valueStrings.length >= MAX_DELETES_IN_ONE_GO) {
                    const sql = `DELETE
                             FROM ${tableName}
                             WHERE id IN (${ids.join(',')})`;
                    yield this.queryRunner.query(sql);
                    valueStrings = [];
                    ids = [];
                }
            }));
            if (valueStrings.length > 0) {
                const sql = `DELETE
                         FROM ${tableName}
                         WHERE id IN (${ids.join(',')})`;
                yield this.queryRunner.query(sql);
            }
        });
    }
    handleManyToManyRelations() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.savePromise;
            const promises = [];
            Object.keys(this.manyToManyRelations).forEach((table) => {
                let sql = `DELETE
                       FROM ${table}
                       WHERE `;
                const deleteSqls = [];
                Object.keys(this.manyToManyRelations[table]).forEach((field) => {
                    if (field.startsWith('delete_')) {
                        deleteSqls.push(`${field.substr(7)} IN (${this.manyToManyRelations[table][field].join(',')})`);
                    }
                });
                sql += `${deleteSqls.join(' OR ')};`;
                promises.push(this.queryRunner.query(sql).then(() => {
                    if (this.manyToManyRelations[table].values.length > 0) {
                        const fields = Object.keys(this.manyToManyRelations[table].values[0]);
                        const valueStrings = [];
                        this.manyToManyRelations[table].values.forEach((valuePair) => {
                            const values = [];
                            fields.forEach((field) => {
                                values.push(valuePair[field]);
                            });
                            valueStrings.push(`(${values.join(',')})`);
                        });
                        return this.queryRunner.query(`INSERT
                        OR REPLACE INTO
                        ${table}
                        (
                        ${fields.join(',')}
                        )
                        VALUES
                        ${valueStrings.join(',')};`);
                    }
                    return Promise.resolve();
                }));
            });
            yield Promise.all(promises);
        });
    }
}
exports.SyncJob = SyncJob;
SyncJob.SYNC_PATH_PREFIX = 'sync';
//# sourceMappingURL=SyncJob.js.map