import { EasySyncBaseModel } from './EasySyncBaseModel';
import * as _typeorm from 'typeorm';
import { Helper } from 'js-helper/dist/shared/Helper';
import { XSSHelper } from 'js-helper/dist/shared/XSSHelper';
import { BaseModel, BaseDatabase } from 'cordova-sites-database/dist/cordova-sites-database';

const typeorm = _typeorm;
// if (typeorm.default) {
//     typeorm = typeorm.default;
// }

export class EasySyncPartialModel extends EasySyncBaseModel {
    static async findByIds(ids, relations?) {
        return this.find(
            {
                id: typeorm.In(ids),
            },
            null,
            null,
            null,
            relations
        );
    }

    static async findById(id, relations?) {
        return this.findOne(
            {
                id,
            },
            null,
            null,
            relations
        );
    }

    static async findByClientId(id, relations?) {
        return super.findById(id, relations);
    }

    static async findByClientIds(ids, relations?) {
        return super.findById(ids, relations);
    }

    toJSON(includeFull?) {
        const relations = (<typeof EasySyncPartialModel>this.constructor).getRelationDefinitions();
        const columns = (<typeof EasySyncPartialModel>this.constructor).getColumnDefinitions();

        const obj = {};
        Object.keys(columns).forEach((attribute) => {
            if (attribute !== 'clientId') {
                obj[attribute] = this[attribute];
            }
        });
        Object.keys(relations).forEach((relationName) => {
            if (includeFull === true) {
                obj[relationName] = this[relationName];
            } else if (Array.isArray(this[relationName])) {
                const ids = [];
                this[relationName].forEach((child) => child && ids.push(child.id));
                obj[relationName] = ids;
            } else if (this[relationName] instanceof BaseModel) {
                obj[relationName] = this[relationName].id;
            } else {
                obj[relationName] = null;
            }
        });
        return obj;
    }

    static async fromJson(jsonObjects, entities, includeRelations) {
        entities = entities || [];
        const isArray = Array.isArray(jsonObjects);
        if (!isArray) {
            jsonObjects = [jsonObjects];
        }
        if (!Array.isArray(entities)) {
            entities = [entities];
        }

        const loadPromises = [];
        const addLoadPromises = [];
        jsonObjects.forEach((jsonObject, index) => {
            addLoadPromises.push(
                new Promise<void>((resolve) => {
                    (async () => {
                        let entity = null;
                        if (entities.length > index) {
                            entity = entities[index];
                        } else if (Helper.isNotNull(jsonObject.id)) {
                            entity = await this.findById(jsonObject.id, this.getRelations());
                        }

                        if (entity === null) {
                            entity = new this();
                        }
                        if (!jsonObject.version) {
                            jsonObject.version = 1;
                        }

                        entities[index] = Object.assign(entity, jsonObject);

                        this.myHandleColumns(entities[index]);
                        this.myHandleRelations(entities[index], includeRelations, loadPromises);
                        resolve();
                    })();
                })
            );
        });
        // addLoadPromises adds other loadPromises. Therefore wait until done, then wait for other
        await Promise.all(addLoadPromises);
        await Promise.all(loadPromises);
        if (!isArray) {
            entities = entities.length > 0 ? entities[0] : null;
        }
        return entities;
    }

    private static myHandleRelations(entity, includeRelations, loadPromises) {
        const relations = this.getRelationDefinitions();
        Object.keys(relations).forEach((relationName) => {
            const values = entity[relationName];
            if (
                typeof values === 'number' ||
                (Array.isArray(values) && values.length >= 1 && typeof values[0] === 'number')
            ) {
                if (includeRelations === true) {
                    let loadPromise = null;
                    if (Array.isArray(values)) {
                        loadPromise = BaseDatabase.getModel(relations[relationName].target).findByIds(values);
                    } else {
                        loadPromise = BaseDatabase.getModel(relations[relationName].target).findById(values);
                    }
                    loadPromises.push(
                        loadPromise.then((value) => {
                            entity[relationName] = value;
                        })
                    );
                } else if (includeRelations === false) {
                    if (
                        relations[relationName].type === 'many-to-many' ||
                        relations[relationName].type === 'one-to-many'
                    ) {
                        entity[relationName] = [];
                    } else {
                        entity[relationName] = null;
                    }
                }
            }
        });
    }

    private static myHandleColumns(entity) {
        const schemaDefinition = this.getSchemaDefinition();
        const { columns } = schemaDefinition;

        Object.keys(columns).forEach((columnName) => {
            if (columns[columnName].escapeHTML) {
                entity[columnName] = XSSHelper.escapeHTML(entity[columnName]);
            }
            if (columns[columnName].escapeJS) {
                entity[columnName] = XSSHelper.escapeJS(entity[columnName]);
            }
        });
    }
}

EasySyncPartialModel.CAN_BE_SYNCED = true;
