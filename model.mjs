import { BaseModel, BaseDatabase } from 'cordova-sites-database';

class EasySyncBaseModel extends BaseModel {
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

    static async _fromJson(jsonObjects, models, includeRelations) {
        models = models || [];
        let isArray = Array.isArray(jsonObjects);
        if (!isArray) {
            jsonObjects = [jsonObjects];
        }
        if (!Array.isArray(models)) {
            models = [models];
        }
        let relations = this.getRelationDefinitions();
        let loadPromises = [];
        jsonObjects.forEach((jsonObject, index) => {
            loadPromises.push(new Promise(async resolve => {
                let model = null;
                if (models.length > index) {
                    model = models[index];
                } else if (jsonObject.id !== null && jsonObject.id !== undefined) {
                    model = await this.findById(jsonObject.id, this.getRelations());
                }

                if (model === null) {
                    model = new this();
                }

                if (!jsonObject.version) {
                    jsonObject.version = 1;
                }
                models[index] = Object.assign(model, jsonObject);
                Object.keys(relations).forEach(relationName => {
                    let values = models[index][relationName];
                    if (typeof values === "number" || (Array.isArray(values) && values.length >= 1 && typeof values[0] === "number")) {
                        if (includeRelations === true) {
                            let loadPromise = null;
                            if (Array.isArray(values)) {
                                loadPromise = BaseDatabase.getModel(relations[relationName].target).findByIds(values);
                            } else {
                                loadPromise = BaseDatabase.getModel(relations[relationName].target).findById(values);
                            }
                            loadPromises.push(loadPromise.then(value => models[index][relationName] = value));
                        } else if (includeRelations === false) {
                            if (relations[relationName].type === "many-to-many" || relations[relationName].type === "one-to-many") {
                                models[index][relationName] = [];
                            } else {
                                models[index][relationName] = null;
                            }
                        }
                    }
                });
                resolve();
            }));
        });
        await Promise.all(loadPromises);
        if (!isArray) {
            models = (models.length > 0) ? models[0] : null;
        }
        return models;
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
                    this[relationName].forEach(child => ids.push(child.id));
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

export { EasySyncBaseModel };
