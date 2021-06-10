import {LastSyncDates} from "./LastSyncDates";
import {DataManager} from "cordova-sites/dist/client";
import {Helper, JsonHelper, XSSHelper} from "js-helper/dist/shared";
import {EasySyncClientDb} from "./EasySyncClientDb";
import * as typeorm from "typeorm";
import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";
import {ClientFileMedium} from "./ClientFileMedium";
import {QueryRunner} from "typeorm";
import {FileMedium} from "../shared/FileMedium";
import {BaseDatabase} from "cordova-sites-database/dist/BaseDatabase";

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

    _manyToManyRelations = {};


    async syncInBackgroundIfDataExists(queries, downloadImages?:boolean) {
        this._keyedModelClasses = EasySyncClientDb.getModel();

        let copiedQuery = JsonHelper.deepCopy(queries);

        let requestQueries = this._buildRequestQuery(copiedQuery);
        this._lastSyncDates = await this._getLastSyncModels(this._modelNames, requestQueries);

        this._syncPromise = this.sync(queries, downloadImages);

        if (Object["values"](this._lastSyncDates).some(lastSync => {
            return lastSync["getLastSynced"]() === 0;
        })) {
            await this._syncPromise;
        }
    }

    async getSyncPromise() {
        return this._syncPromise;
    }

    async sync(queries, downloadImages?: boolean) {
        downloadImages = Helper.nonNull(downloadImages, true);

        this._keyedModelClasses = EasySyncClientDb.getModel();

        let requestQueries = this._buildRequestQuery(queries);
        if (Object.keys(this._lastSyncDates).length === 0) {
            this._lastSyncDates = await this._getLastSyncModels(this._modelNames, requestQueries);
        }

        await this._doRuns(requestQueries);

        //Save new lastSync models
        let lastSyncPromises = [];
        Object.keys(this._lastSyncDates).forEach(model => {
            lastSyncPromises.push(this._lastSyncDates[model].save());
        });
        await Promise.all(lastSyncPromises);

        //disabled in doRuns. Cannot be reenabled sooner, but since lastSyncDates should not have any relations, it should be okay
        await EasySyncClientDb.getInstance().rawQuery("PRAGMA foreign_keys = ON;");

        if (this._finalRes["FileMedium"] && this._finalRes["FileMedium"]["changed"] && downloadImages) {
            await ClientFileMedium._handleImages(await FileMedium.findByIds(this._finalRes["FileMedium"]["changed"]));
        }

        return this._finalRes;
    }

    private async _doRuns(requestQueries) {
        let newLastSynced = null;

        let response = null;
        let offset = 0;

        //startTransaction maybe allow read, but not write?
        this._queryRunner = await EasySyncClientDb.getInstance().createQueryRunner();
        this._savePromise = this._queryRunner.query("PRAGMA foreign_keys = OFF;").then(() => {
            return this._queryRunner.startTransaction();
        });

        //Ask for next run until no more runs needed
        let shouldAskAgain;
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

            //create new request query and save changes
            let newRequestQueries = [];
            response.results.forEach((res, i) => {
                if (res && res.shouldAskAgain) {
                    shouldAskAgain = true;
                    newRequestQueries.push(requestQueries[i]);
                }

                //Extract entities
                this._extractEntities(res)
            });
            requestQueries = newRequestQueries;
        }
        while (shouldAskAgain);

        await this._handleManyToManyRelations();

        //wait for savePromises, stop transaction
        return this._savePromise.then(async () => {
            await this._queryRunner.commitTransaction();
        }).catch(async e => {
            console.error(e);
            await this._queryRunner.rollbackTransaction();
        }).finally(async () => {
            await this._queryRunner.release();
        });
    }

    /**
     * Extract the Entities and saves them(?) for one model
     *
     * @param modelRes
     * @private
     */
    private _extractEntities(modelRes) {
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
                        otherName = otherName.substr(0, 1).toLowerCase() + otherName.substr(1) + "Id";
                    }

                    this._manyToManyRelations[table.name] = Helper.nonNull(this._manyToManyRelations[table.name], {});
                    this._manyToManyRelations[table.name]["values"] = Helper.nonNull(this._manyToManyRelations[table.name]["values"], []);
                    this._manyToManyRelations[table.name]["delete_" + ownName] = Helper.nonNull(this._manyToManyRelations[table.name]["delete_" + ownName], []);

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
                } else if (
                    (relations[relation].type === "many-to-one"
                        || (relations[relation].type === "one-to-one" && relations[relation].joinColumn))
                    //DO not check for a value of the relation here. Else If the first entity has no value set, the field
                    // will not be set and therefore ignored for all other entites too
                ) {
                    let fieldName;
                    if (relations[relation].joinColumn && relations[relation].joinColumn.name) {
                        fieldName = relations[relation].joinColumn.name;
                    } else {
                        fieldName = relation + "Id";
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

        this._savePromise = this._savePromise.then(async () => await this._insertOrReplace(modelClass, changedEntities));
        this._savePromise = this._savePromise.then(async () => await this._deleteModels(modelClass, deletedModelsIds));

        this._finalRes[modelName] = Helper.nonNull(this._finalRes[modelName], {"deleted": [], "changed": []});
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

        const MAX_INSERT_IN_ONE_GO = 50;

        if (changedEntities.length === 0) {
            return;
        }

        let schemaDefinition = modelClass.getSchemaDefinition();
        let tableName = schemaDefinition.name;
        tableName = Helper.toSnakeCase(tableName);

        let columns = schemaDefinition.columns;

        //Get fields from entity for including relation fields
        const fields = Object.keys(changedEntities[0]);

        let values = [];
        let valueStrings = [];
        await Helper.asyncForEach(changedEntities, async (entity) => {

            let valueString = [];

            //Stellt die reihenfolge sicher
            fields.forEach(field => {
                let val = entity[field];
                if (columns[field] && columns[field].transformer) {
                    val = columns[field].transformer.to(val);
                }
                if (columns[field] && columns[field].type === BaseDatabase.TYPES.SIMPLE_JSON) {
                    val = JSON.stringify(val);
                }
                values.push(val);
                valueString.push("?");
            });

            valueStrings.push("(" + valueString.join(",") + ")");

            if (valueStrings.length >= MAX_INSERT_IN_ONE_GO) {
                console.log("value string", valueStrings.length);
                let sql = "INSERT OR REPLACE INTO " + tableName + " (" + fields.join(",") + ") VALUES " + valueStrings.join(",");
                if (tableName === "event"){
                    debugger;
                }
                await this._queryRunner.query(sql, values);

                valueStrings = [];
                values = [];
            }
        });

        if (valueStrings.length > 0) {
            console.log("value string 2", valueStrings.length);
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
        tableName = Helper.toSnakeCase(tableName)

        let ids = [];
        let valueStrings = [];
        await Helper.asyncForEach(deletedModelsIds, async entityId => {
            ids.push(entityId);
            valueStrings.push("?");

            if (valueStrings.length >= MAX_DELETES_IN_ONE_GO) {
                let sql = "DELETE FROM " + tableName + " WHERE id IN (" + ids.join(",") + ")";
                await this._queryRunner.query(sql);

                valueStrings = [];
                ids = [];
            }
        });

        if (valueStrings.length > 0) {
            let sql = "DELETE FROM " + tableName + " WHERE id IN (" + ids.join(",") + ")";
            await this._queryRunner.query(sql);
        }
    }

    private async _handleManyToManyRelations() {

        await this._savePromise;

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
        await Promise.all(promises);
    }
}

SyncJob.SYNC_PATH_PREFIX = "sync";
