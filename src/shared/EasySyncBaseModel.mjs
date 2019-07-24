import {BaseModel, BaseDatabase} from "cordova-sites-database";

export class EasySyncBaseModel extends BaseModel {
    constructor() {
        super();
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.version = 1;
        this.deleted = false;
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
        let relations = this.getRelationDefinitions();
        let loadPromises = [];
        let addLoadPromises = [];
        jsonObjects.forEach((jsonObject, index) => {
             addLoadPromises.push(new Promise(async resolve => {
                let entity = null;
                if (entities.length > index) {
                    entity = entities[index];
                } else if (jsonObject.id !== null && jsonObject.id !== undefined) {
                    entity = await this.findById(jsonObject.id, this.getRelations());
                }

                if (entity === null) {
                    entity = new this();
                }
                if (!jsonObject.version) {
                    jsonObject.version = 1;
                }

                entities[index] = Object.assign(entity, jsonObject);
                Object.keys(relations).forEach(relationName => {

                    let values = entities[index][relationName];
                    if (typeof values === "number" || (Array.isArray(values) && values.length >= 1 && typeof values[0] === "number")) {
                        if (includeRelations === true) {
                            let loadPromise = null;
                            if (Array.isArray(values)) {
                                loadPromise = BaseDatabase.getModel(relations[relationName].target).findByIds(values);
                            } else {
                                loadPromise = BaseDatabase.getModel(relations[relationName].target).findById(values);
                            }
                            loadPromises.push(loadPromise.then(value => {
                                entities[index][relationName] = value;
                            }));

                        } else if (includeRelations === false) {
                            if (relations[relationName].type === "many-to-many" || relations[relationName].type === "one-to-many") {
                                entities[index][relationName] = [];
                            } else {
                                entities[index][relationName] = null;
                            }
                        }
                    }
                });
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

    toJSON(includeFull) {
        let relations = this.constructor.getRelationDefinitions();
        let columns = this.constructor.getColumnDefinitions();

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
}

EasySyncBaseModel.CAN_BE_SYNCED = true;