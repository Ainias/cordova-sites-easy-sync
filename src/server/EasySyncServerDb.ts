import {BaseDatabase} from "cordova-sites-database";
import {FileMedium} from "../shared/FileMedium";
import {ServerFileMedium} from "./ServerFileMedium";
import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";

export class EasySyncServerDb extends BaseDatabase {

    static CONNECTION_PARAMETERS;

    _createConnectionOptions(database) {
        Object.setPrototypeOf(FileMedium, ServerFileMedium);
        Object.setPrototypeOf(FileMedium.prototype, ServerFileMedium.prototype);

        let options = super._createConnectionOptions(database);

        return Object["assign"](options, EasySyncServerDb.CONNECTION_PARAMETERS);
    }

    async saveEntity(entities) {

        let isArray = true;
        if (!Array.isArray(entities)) {
            entities = [entities];
            isArray = false;
        }

        if (entities.length === 0) {
            return entities;
        }

        let model = entities[0].constructor;

        let entitiesIds = [];
        entities.forEach(entity => {
            entity.updatedAt = new Date();
            if (entity.id !== null) {
                entitiesIds.push(entity.id)
            }
        });
        let indexedCompareEntities = {};
        let compareEntities = await this.findByIds(model, entitiesIds);
        compareEntities.forEach(cEnt => indexedCompareEntities[cEnt.id] = cEnt);

        entities.forEach(entity => {
            if (entity.id !== null) {
                if (!indexedCompareEntities[entity.id] || indexedCompareEntities[entity.id].version === parseInt(entity.version)) {
                    entity.version++;
                } else {
                    throw new Error("optimistic locking exception for id " + entity.id + " and model " + entity.constructor.getSchemaName()) + ": got version " + entity.version + ", but expected " + indexedCompareEntities[entity.id].version;
                }
            }
        });
        let savedEntites = await super.saveEntity(entities);
        if (!isArray) {
            if (savedEntites.length > 0) {
                return savedEntites[0];
            }
            return null;
        }
        return savedEntites;
    }

    async deleteEntity(entities, model, deleteFully?) {
        if (deleteFully) {
            return super.deleteEntity(entities, model);
        }

        // let isArray = true;
        if (!Array.isArray(entities)) {
            entities = [entities];
            // isArray = false;
        }

        if (entities.length === 0) {
            return entities;
        }

        if (!model) {
            model = entities[0].constructor;
        }

        if (typeof entities[0] === "number") {
            entities = await model.findByIds(entities, model.getRelations());
        }

        if (entities[0] instanceof EasySyncBaseModel) {
            entities.forEach(ent => {
                ent.deleted = true;
            });

            return this.saveEntity(entities);
        }
        else {
            return super.deleteEntity(entities, model);
        }
    }
}

EasySyncServerDb.CONNECTION_PARAMETERS = null;