import { LastSyncDates } from './LastSyncDates';
import { DataManager } from 'cordova-sites/dist/client';
import { Helper, JsonHelper, XSSHelper } from 'js-helper/dist/shared';
import { EasySyncClientDb } from './EasySyncClientDb';
import * as typeorm from 'typeorm';
import { QueryRunner } from 'typeorm';
import { EasySyncBaseModel } from '../shared/EasySyncBaseModel';
import { ClientFileMedium } from './ClientFileMedium';
import { FileMedium } from '../shared/FileMedium';
import { BaseDatabase } from 'cordova-sites-database/dist/BaseDatabase';

export class SyncJob {
    static SYNC_PATH_PREFIX;
    private syncedModels = {};
    private modelNames = [];
    private relationshipModels = {};
    private lastSyncDates: Record<string, LastSyncDates> = {};
    private keyedModelClasses = {};
    private savePromise = Promise.resolve();
    private queryRunner: QueryRunner = null;
    private finalRes: any = {};

    private syncPromise;

    private manyToManyRelations = {};

    async syncInBackgroundIfDataExists(queries, downloadImages?: boolean) {
        this.keyedModelClasses = EasySyncClientDb.getAllModels();

        const copiedQuery = JsonHelper.deepCopy(queries);

        const requestQueries = this.buildRequestQuery(copiedQuery);
        this.lastSyncDates = await SyncJob.getLastSyncModels(this.modelNames, requestQueries);

        this.syncPromise = this.sync(queries, downloadImages);

        if (
            Object.values(this.lastSyncDates).some((lastSync) => {
                return lastSync.getLastSynced() === 0;
            })
        ) {
            await this.syncPromise;
        }
    }

    async getSyncPromise() {
        return this.syncPromise;
    }

    async sync(queries, downloadImages?: boolean) {
        downloadImages = Helper.nonNull(downloadImages, true);

        this.keyedModelClasses = EasySyncClientDb.getAllModels();

        const requestQueries = this.buildRequestQuery(queries);
        if (Object.keys(this.lastSyncDates).length === 0) {
            this.lastSyncDates = await SyncJob.getLastSyncModels(this.modelNames, requestQueries);
        }

        await this.doRuns(requestQueries);

        // disabled in doRuns. Cannot be reenabled sooner, but since lastSyncDates should not have any relations, it should be okay
        await EasySyncClientDb.getInstance().rawQuery('PRAGMA foreign_keys = ON;');

        const lastSyncPromises = [];
        Object.keys(this.lastSyncDates).forEach((model) => {
            lastSyncPromises.push(this.lastSyncDates[model].save());
        });
        await Promise.all(lastSyncPromises).catch((e) => {
            console.error('[SYNC JOB] Error while saving lastSyncDates', e);
        });

        if (this.finalRes.FileMedium && this.finalRes.FileMedium.changed && downloadImages) {
            await ClientFileMedium.handleImages(await FileMedium.findByIds(this.finalRes.FileMedium.changed));
        }

        return this.finalRes;
    }

    private async doRuns(requestQueries) {
        let newLastSynced = null;

        let response = null;
        let offset = 0;

        // startTransaction maybe allow read, but not write?
        await EasySyncClientDb.getInstance().rawQuery('PRAGMA foreign_keys = OFF;');
        this.queryRunner = await EasySyncClientDb.getInstance().createQueryRunner();
        if (!EasySyncClientDb.getInstance().isCordova()) {
            this.savePromise = this.queryRunner.startTransaction().catch((e) => {
                console.error('[SYNC JOB] transactionStartError', e);
            });
        } else {
            this.savePromise = Promise.resolve();
        }

        // Ask for next run until no more runs needed
        let shouldAskAgain;
        do {
            shouldAskAgain = false;
            // eslint-disable-next-line no-await-in-loop
            response = await SyncJob.fetchModel(requestQueries, offset);
            offset = response.nextOffset;

            // Update newLastSynced
            if (Helper.isNull(newLastSynced)) {
                newLastSynced = Number(response.newLastSynced);
                // eslint-disable-next-line no-loop-func
                Object.keys(this.lastSyncDates).forEach((key) => {
                    this.lastSyncDates[key].setLastSynced(newLastSynced);
                });
            }

            // create new request query and save changes
            const newRequestQueries = [];
            // eslint-disable-next-line no-loop-func
            response.results.forEach((res: any, i) => {
                if (res && res.shouldAskAgain) {
                    shouldAskAgain = true;
                    newRequestQueries.push(requestQueries[i]);
                }

                // Extract entities
                this.extractEntities(res);
            });
            requestQueries = newRequestQueries;
        } while (shouldAskAgain);

        await this.handleManyToManyRelations();

        // wait for savePromises, stop transaction
        return this.savePromise
            .then(async () => {
                if (!EasySyncClientDb.getInstance().isCordova()) {
                    return this.queryRunner.commitTransaction();
                }
                return Promise.resolve();
            })
            .catch((e) => {
                console.error('[SYNC JOB] Saving error: ', e);
                return this.queryRunner.rollbackTransaction();
            })
            .finally(async () => {
                await this.queryRunner.release();
                // Start Transaction since TypeORM works in transactions
                if (!EasySyncClientDb.getInstance().isCordova()) {
                    await this.queryRunner.startTransaction();
                }
            })
            .catch((e) => {
                console.error('[SYNC JOB] Release error', e);
            });
    }

    /**
     * Extract the Entities and saves them(?) for one model
     *
     * @param modelRes
     * @private
     */
    private extractEntities(modelRes) {
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
            } else {
                changedEntities.push(entity);
            }
        });

        this.syncedModels[modelName] = Helper.nonNull(this.syncedModels[modelName], {});

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
                    } else {
                        ownName = modelClass.getSchemaName();
                        ownName = `${ownName.substr(0, 1).toLowerCase() + ownName.substr(1)}Id`;
                    }

                    let otherName;
                    if (table.inverseJoinColumn && table.inverseJoinColumn.name) {
                        otherName = table.inverseJoinColumn.name;
                    } else {
                        otherName = relations[relation].target;
                        otherName = `${otherName.substr(0, 1).toLowerCase() + otherName.substr(1)}Id`;
                    }

                    this.manyToManyRelations[table.name] = Helper.nonNull(this.manyToManyRelations[table.name], {});
                    this.manyToManyRelations[table.name].values = Helper.nonNull(
                        this.manyToManyRelations[table.name].values,
                        []
                    );
                    this.manyToManyRelations[table.name][`delete_${ownName}`] = Helper.nonNull(
                        this.manyToManyRelations[table.name][`delete_${ownName}`],
                        []
                    );

                    this.manyToManyRelations[table.name][`delete_${ownName}`].push(entity.id);

                    const otherIdsAlreadyInserted = [];
                    const insertedRelations = this.manyToManyRelations[table.name].values.filter(
                        (relValue) => relValue[ownName] === entity.id
                    );
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
                } else if (
                    relations[relation].type === 'many-to-one' ||
                    (relations[relation].type === 'one-to-one' && relations[relation].joinColumn)
                    // DO not check for a value of the relation here. Else If the first entity has no value set, the field
                    // will not be set and therefore ignored for all other entites too
                ) {
                    let fieldName;
                    if (relations[relation].joinColumn && relations[relation].joinColumn.name) {
                        fieldName = relations[relation].joinColumn.name;
                    } else {
                        fieldName = `${relation}Id`;
                    }
                    entity[fieldName] = entity[relation];
                }
                delete entity[relation];
            });
            Object.keys(columns).forEach((columnName) => {
                if (columns[columnName].escapeHTML) {
                    entity[columnName] = XSSHelper.escapeHTML(entity[columnName]);
                }
                if (columns[columnName].escapeJS) {
                    entity[columnName] = XSSHelper.escapeJS(entity[columnName]);
                }
            });
            changedEntityIds.push(entity.id);
        });

        this.savePromise = this.savePromise.then(() => this.insertOrReplace(modelClass, changedEntities));
        this.savePromise = this.savePromise.then(() => this.deleteModels(modelClass, deletedModelsIds));

        this.finalRes[modelName] = Helper.nonNull(this.finalRes[modelName], { deleted: [], changed: [] });
        this.finalRes[modelName].deleted.push(...deletedModelsIds);
        this.finalRes[modelName].changed.push(...changedEntityIds);
    }

    private buildRequestQuery(queries) {
        const requestQueries = [];

        // initializing query
        queries.forEach((query) => {
            if (query.prototype instanceof EasySyncBaseModel) {
                query = {
                    model: query,
                    where: {},
                };
            }
            query.model = query.model.getSchemaName();
            this.modelNames.push(query.model);
            requestQueries.push(query);
            const key = `${query.model}${JSON.stringify(query.where)}`;
            if (Helper.isNotNull(this.lastSyncDates[key])) {
                query.lastSynced = this.lastSyncDates[key].getLastSynced();
            }
        });

        return requestQueries;
    }

    private static async getLastSyncModels(modelNames, requestQueries) {
        // Load syncModels
        const lastSyncModelsArray = <LastSyncDates[]>await LastSyncDates.find({
            model: typeorm.In(modelNames),
        });

        const lastSyncDates = Helper.arrayToObject(
            lastSyncModelsArray,
            (model) => `${model.getModel()}${JSON.stringify(model.where)}`
        );
        requestQueries.forEach((query) => {
            const key = `${query.model}${JSON.stringify(query.where)}`;
            if (Helper.isNull(lastSyncDates[key])) {
                const lastSyncDate = new LastSyncDates();
                lastSyncDate.setModel(query.model);
                lastSyncDate.where = query.where;
                lastSyncDate.setLastSynced(0);
                lastSyncDates[key] = lastSyncDate;
            }
            query.lastSynced = lastSyncDates[key].getLastSynced();
        });
        return lastSyncDates;
    }

    static async fetchModel(query, offset) {
        return DataManager.load(
            SyncJob.SYNC_PATH_PREFIX +
                DataManager.buildQuery({
                    queries: JSON.stringify(query),
                    offset,
                })
        );
    }

    private async insertOrReplace(modelClass: any, changedEntities: any[]) {
        const MAX_INSERT_IN_ONE_GO = 50;

        if (changedEntities.length === 0) {
            return;
        }

        const schemaDefinition = modelClass.getSchemaDefinition();
        let tableName = schemaDefinition.name;
        tableName = Helper.toSnakeCase(tableName);

        const { columns } = schemaDefinition;

        // Get fields from entity for including relation fields
        const fields = Object.keys(changedEntities[0]);

        let values = [];
        let valueStrings = [];
        await Helper.asyncForEach(changedEntities, async (entity) => {
            const valueString = [];

            // Stellt die reihenfolge sicher
            fields.forEach((field) => {
                let val = entity[field];
                if (columns[field] && columns[field].transformer) {
                    val = columns[field].transformer.to(val);
                }
                if (columns[field] && columns[field].type === BaseDatabase.TYPES.SIMPLE_JSON) {
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
                await this.queryRunner.query(sql, values);

                valueStrings = [];
                values = [];
            }
        });

        if (valueStrings.length > 0) {
            const sql = `INSERT
            OR REPLACE INTO
            ${tableName}
            (
            ${fields.join(',')}
            )
            VALUES
            ${valueStrings.join(',')}`;
            await this.queryRunner.query(sql, values);
        }
    }

    private async deleteModels(modelClass: any, deletedModelsIds: any[]) {
        const MAX_DELETES_IN_ONE_GO = 300;

        if (deletedModelsIds.length === 0) {
            return;
        }

        let tableName = modelClass.getSchemaName();
        tableName = Helper.toSnakeCase(tableName);

        let ids = [];
        let valueStrings = [];
        await Helper.asyncForEach(deletedModelsIds, async (entityId) => {
            ids.push(entityId);
            valueStrings.push('?');

            if (valueStrings.length >= MAX_DELETES_IN_ONE_GO) {
                const sql = `DELETE
                             FROM ${tableName}
                             WHERE id IN (${ids.join(',')})`;
                await this.queryRunner.query(sql);

                valueStrings = [];
                ids = [];
            }
        });

        if (valueStrings.length > 0) {
            const sql = `DELETE
                         FROM ${tableName}
                         WHERE id IN (${ids.join(',')})`;
            await this.queryRunner.query(sql);
        }
    }

    private async handleManyToManyRelations() {
        await this.savePromise;

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

            promises.push(
                this.queryRunner.query(sql).then(() => {
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
                })
            );
        });
        await Promise.all(promises);
    }
}

SyncJob.SYNC_PATH_PREFIX = 'sync';
