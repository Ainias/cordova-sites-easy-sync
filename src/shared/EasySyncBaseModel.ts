import {BaseModel, BaseDatabase} from "cordova-sites-database/dist/cordova-sites-database";
import {Helper, XSSHelper} from "js-helper/dist/shared";

export class EasySyncBaseModel extends BaseModel {

    static CAN_BE_SYNCED: boolean;
    static delegateClass = null;

    createdAt: Date;
    updatedAt: Date;
    version: number;
    deleted: boolean;
    _delegate = null;

    constructor() {
        super();
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.version = 1;
        this.deleted = false;
    }

    toJSON(includeFull) {
        let relations = (<typeof EasySyncBaseModel>this.constructor).getRelationDefinitions();
        let columns = (<typeof EasySyncBaseModel>this.constructor).getColumnDefinitions();

        let obj = {};
        Object.keys(columns).forEach(attribute => {
            obj[attribute] = this[attribute];
        });
        Object.keys(relations).forEach(relationName => {
            if (includeFull === true) {
                obj[relationName] = this[relationName];
            } else {
                if (Array.isArray(this[relationName])) {
                    let ids = [];
                    this[relationName].forEach(child => (child && ids.push(child.id)));
                    obj[relationName] = ids;
                } else if (this[relationName] instanceof BaseModel) {
                    obj[relationName] = this[relationName].id;
                } else {
                    obj[relationName] = null;
                }
            }
        });
        return obj;
    }

    static getColumnDefinitions() {
        let columns = super.getColumnDefinitions();
        columns["createdAt"] = {
            type: BaseDatabase.TYPES.DATE
        };
        columns["updatedAt"] = {
            type: BaseDatabase.TYPES.DATE
        };
        columns["version"] = {
            type: BaseDatabase.TYPES.INTEGER
        };
        columns["deleted"] = {
            type: BaseDatabase.TYPES.BOOLEAN
        };
        return columns;
    }

    static async _fromJson(jsonObjects, entities, includeRelations) {
        entities = entities || [];
        let isArray = Array.isArray(jsonObjects);
        if (!isArray) {
            jsonObjects = [jsonObjects];
        }
        if (!Array.isArray(entities)) {
            entities = [entities];
        }

        let loadPromises = [];
        let addLoadPromises = [];
        jsonObjects.forEach((jsonObject, index) => {
            addLoadPromises.push(new Promise<void>(async resolve => {
                let entity = null;
                if (entities.length > index) {
                    entity = entities[index];
                } else if (Helper.isNotNull(jsonObject.id)) {
                    entity = await this.findById(jsonObject.id, this.getRelations());
                }

                if (entity === null) {
                    entity = new this();
                }
                if (!jsonObject.version && jsonObject.version !== 0) {
                    jsonObject.version = 1;
                }

                entities[index] = Object.assign(entity, jsonObject);

                this._handleColumns(entities[index]);
                this._handleRelations(entities[index], includeRelations, loadPromises);
                resolve();
            }));
        });
        //addLoadPromises adds other loadPromises. Therefore wait until done, then wait for other
        await Promise.all(addLoadPromises);
        await Promise.all(loadPromises);
        if (!isArray) {
            entities = (entities.length > 0) ? entities[0] : null;
        }
        return entities;
    }

    private static _handleRelations(entity, includeRelations, loadPromises) {
        let relations = this.getRelationDefinitions();
        Object.keys(relations).forEach(relationName => {
            let values = entity[relationName];
            if (typeof values === "number" || (Array.isArray(values) && values.length >= 1 && typeof values[0] === "number")) {
                if (includeRelations === true) {
                    let loadPromise = null;
                    if (Array.isArray(values)) {
                        loadPromise = BaseDatabase.getModel(relations[relationName].target).findByIds(values);
                    } else {
                        loadPromise = BaseDatabase.getModel(relations[relationName].target).findById(values);
                    }
                    loadPromises.push(loadPromise.then(value => {
                        entity[relationName] = value;
                    }));

                } else if (includeRelations === false) {
                    if (relations[relationName].type === "many-to-many" || relations[relationName].type === "one-to-many") {
                        entity[relationName] = [];
                    } else {
                        entity[relationName] = null;
                    }
                }
            }
        });
    }

    private static _handleColumns(entity) {
        let schemaDefinition = this.getSchemaDefinition();
        let columns = schemaDefinition["columns"];

        Object.keys(columns).forEach(columnName => {
            if (columns[columnName].escapeHTML) {
                entity[columnName] = XSSHelper.escapeHTML(entity[columnName]);
            }
            if (columns[columnName].escapeJS) {
                entity[columnName] = XSSHelper.escapeJS(entity[columnName]);
            }
            if (columns[columnName].type === BaseDatabase.TYPES.DATE
                && !(entity[columnName] instanceof Date || Helper.isNull(entity[columnName]))
            ) {
                entity[columnName] = new Date(entity[columnName]);
            }
        })

    }

    public static prepareSync(entities) {
        return entities;
    }

    public static deleteMany(entities, deleteFully?: boolean){
        // @ts-ignore
        return this._database.deleteEntity(entities, undefined, deleteFully);
    }
}

EasySyncBaseModel.CAN_BE_SYNCED = true;
