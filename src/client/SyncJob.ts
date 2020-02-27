import {LastSyncDates} from "./LastSyncDates";
import {DataManager} from "cordova-sites/dist/client";
import {Helper, JsonHelper, XSSHelper} from "js-helper/dist/shared";
import {EasySyncClientDb} from "./EasySyncClientDb";
import * as typeorm from "typeorm";
import {EasySyncPartialModel} from "../shared/EasySyncPartialModel";
import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";
import {ClientFileMedium} from "./ClientFileMedium";
import {QueryRunner} from "typeorm";

export class SyncJob {

    static SYNC_PATH_PREFIX;
    _syncedModels = {};
    _modelNames = [];
    _relationshipModels = {};
    _lastSyncDates = {};
    _keyedModelClasses = {};
    _savePromise = Promise.resolve();
    _queryRunner: QueryRunner = null;
    _finalRes: any = {};

    _syncPromise;

    _manyToManyRelations: {};

    async syncInBackgroundIfDataExists(queries) {
        this._keyedModelClasses = EasySyncClientDb.getModel();

        let copiedQuery = JsonHelper.deepCopy(queries);

        let requestQueries = this._buildRequestQuery(copiedQuery);
        this._lastSyncDates = await this._getLastSyncModels(this._modelNames, requestQueries);

        this._syncPromise = this.sync(queries);

        if (Object["values"](this._lastSyncDates).some(lastSync => {
            return lastSync["getLastSynced"]() === 0;
        })) {
            await this._syncPromise;
        }
    }

    async getSyncPromise() {
        return this._syncPromise;
    }

    async sync(queries) {

        this._keyedModelClasses = EasySyncClientDb.getModel();

        let requestQueries = this._buildRequestQuery(queries);
        if (Helper.isNull(this._lastSyncDates)) {
            this._lastSyncDates = await this._getLastSyncModels(this._modelNames, requestQueries);
        }

        let saveResults = await this._doRuns(requestQueries);
        // await this._handleRelations();

        //Save new lastSync models
        let lastSyncPromises = [];
        Object.keys(this._lastSyncDates).forEach(model => {
            lastSyncPromises.push(this._lastSyncDates[model].save());
        });
        await Promise.all(lastSyncPromises);

        //Calculate final result and give it back

        if (this._finalRes["FileMedium"] && this._finalRes["FileMedium"]["changed"]) {
            await ClientFileMedium._handleImages(await ClientFileMedium.findByIds(this._finalRes["FileMedium"]["changed"]));
        }

        return this._finalRes;
    }

    private async _doRuns(requestQueries) {
        //Initialize some variables
        let newLastSynced = null;

        let response = null;
        let offset = 0;


        //startTransaction
        this._queryRunner = await EasySyncClientDb.getInstance().createQueryRunner();
        this._savePromise = this._queryRunner.startTransaction().then(() => {
            return this._queryRunner.query("PRAGMA foreign_keys = OFF");
        });

        //Ask for next run until no more runs needed
        let shouldAskAgain = false;
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
                if (res && res.shouldAskAgain) {
                    shouldAskAgain = true;
                    newRequestQueries.push(requestQueries[i]);
                }
                this._extractEntities(res)
            });
            requestQueries = newRequestQueries;
        }
        while (shouldAskAgain);

        //wait for savePromises, stop transaction
        return this._savePromise.then(async () => {
            await this._queryRunner.query("PRAGMA foreign_keys = ON");
            return this._queryRunner.commitTransaction();
        }).catch(e => {
            console.error(e);
            return this._queryRunner.rollbackTransaction();
        }).finally(() => {
            return this._queryRunner.release();
        });
    }

    /**
     * Extract the Entities and saves them(?) for one model
     *
     * @param modelRes
     * @private
     */
    private async _extractEntities(modelRes) {
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
            } else {
                changedEntities.push(entity);
            }
        });

        this._syncedModels[modelName] = Helper.nonNull(this._syncedModels[modelName], {});

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
                    } else {
                        ownName = modelClass.getSchemaName();
                        ownName = ownName.substr(0, 1).toLowerCase() + ownName.substr(1) + "Id";
                    }

                    let otherName;
                    if (table.inverseJoinColumn && table.inverseJoinColumn.name) {
                        otherName = table.inverseJoinColumn.name;
                    } else {
                        otherName = relations[relation].target;
                        ownName = otherName.substr(0, 1).toLowerCase() + otherName.substr(1) + "Id";
                    }

                    this._manyToManyRelations[table.name] = Helper.nonNull(this._manyToManyRelations[table.name], []);

                    let otherIdsAlreadyInserted = [];
                    let insertedRelations = this._manyToManyRelations[table.name].filter(relValue => relValue[ownName] === entity.id);
                    insertedRelations.forEach(relValue => otherIdsAlreadyInserted.push(relValue[otherName]));

                    entity[relation].forEach(otherId => {
                        if (otherIdsAlreadyInserted.indexOf(otherId) === -1) {
                            let value = {};
                            value[ownName] = entity.id;
                            value[otherName] = otherId;
                            this._manyToManyRelations[table.name].push(value);
                        }
                    });
                } else if ((relations[relation].type === "many-to-one" || (relations[relation].type === "one-to-one" && relations[relation].joinColumn)) && entity[relation]) {
                    let fieldName;
                    if (relations[relation].joinColumn && relations[relation].joinColumn.name) {
                        fieldName = relations[relation].joinColumn.name;
                    } else {
                        fieldName = relations[relation].target;
                        fieldName = fieldName.substr(0, 1).toLowerCase() + fieldName.substr(1) + "Id";
                    }
                    entity[fieldName] = entity[relation];
                }
                delete entity[relation];
            });
            Object.keys(columns).forEach(columnName => {
                if (columns[columnName].escapeHTML) {
                    entity[columnName] = XSSHelper.escapeHTML(entity[columnName]);
                }
                if (columns[columnName].escapeJS) {
                    entity[columnName] = XSSHelper.escapeJS(entity[columnName]);
                }
            });
            changedEntityIds.push(entity.id);
        });

        this._savePromise = this._savePromise.then(() => this._insertOrReplace(modelClass, changedEntities));
        this._savePromise = this._savePromise.then(() => this._deleteModels(modelClass, deletedModelsIds));
        //TODO delete old models

        this._finalRes[modelName] = Helper.nonNull(this._finalRes[modelName], {"deleted":[], "changed":[]});
        this._finalRes[modelName]["deleted"].push(...deletedModelsIds);
        this._finalRes[modelName]["changed"].push(...changedEntityIds);
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
            let key = "" + query.model + JSON.stringify(query.where);
            if (Helper.isNotNull(this._lastSyncDates[key])) {
                query["lastSynced"] = this._lastSyncDates[key].getLastSynced();
            }
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

    static async _fetchModel(query, offset) {
        return await DataManager.load(SyncJob.SYNC_PATH_PREFIX +
            DataManager.buildQuery({
                "queries": JSON.stringify(query),
                "offset": offset
            }));
    }

    private async _insertOrReplace(modelClass: any, changedEntities: any[]) {

        const MAX_INSERT_IN_ONE_GO = 300;

        if (changedEntities.length === 0) {
            return;
        }

        let tableName = modelClass.getSchemaName();
        tableName = tableName.substr(0, 1).toLowerCase() + tableName.substr(1);

        let fields = Object.keys(changedEntities[0]);
        let values = [];
        let valueStrings = [];
        await Helper.asyncForEach(changedEntities, async (entity, index) => {
            let valueString = [];

            //Stellt die reihenfolge sicher
            fields.forEach(field => {
                values.push(entity[field]);
                valueString.push("?");
            });

            valueStrings.push("(" + valueString.join(",") + ")");

            if (valueStrings.length >= MAX_INSERT_IN_ONE_GO) {
                let sql = "INSERT OR REPLACE INTO " + tableName + " (" + fields.join(",") + ") VALUES " + valueStrings.join(",");
                await this._queryRunner.query(sql, values);

                valueStrings = [];
                values = [];
            }
        });

        if (valueStrings.length > 0) {
            let sql = "INSERT OR REPLACE INTO " + tableName + " (" + fields.join(",") + ") VALUES " + valueStrings.join(",");
            await this._queryRunner.query(sql, values);
        }
    }

    private async _deleteModels(modelClass: any, deletedModelsIds: any[]) {
        const MAX_DELETES_IN_ONE_GO = 300;

        if (deletedModelsIds.length === 0) {
            return;
        }

        let tableName = modelClass.getSchemaName();
        tableName = tableName.substr(0, 1).toLowerCase() + tableName.substr(1);

        let ids = [];
        let valueStrings = [];
        await Helper.asyncForEach(deletedModelsIds, async entityId => {
            ids.push(entityId);
            valueStrings.push("?");

            if (valueStrings.length >= MAX_DELETES_IN_ONE_GO) {
                let sql = "DELETE FROM " + tableName + " WHERE id IN (" + ids.join(",") + ")";
                await this._queryRunner.query(sql, ids);

                valueStrings = [];
                ids = [];
            }
        });

        if (valueStrings.length > 0) {
            let sql = "DELETE FROM " + tableName + " WHERE id IN (" + ids.join(",") + ")";
            await this._queryRunner.query(sql, ids);
        }
    }
}

SyncJob.SYNC_PATH_PREFIX = "sync";