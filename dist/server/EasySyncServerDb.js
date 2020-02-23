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
const cordova_sites_database_1 = require("cordova-sites-database");
const FileMedium_1 = require("../shared/FileMedium");
const ServerFileMedium_1 = require("./ServerFileMedium");
const EasySyncBaseModel_1 = require("../shared/EasySyncBaseModel");
class EasySyncServerDb extends cordova_sites_database_1.BaseDatabase {
    _createConnectionOptions(database) {
        Object.setPrototypeOf(FileMedium_1.FileMedium, ServerFileMedium_1.ServerFileMedium);
        Object.setPrototypeOf(FileMedium_1.FileMedium.prototype, ServerFileMedium_1.ServerFileMedium.prototype);
        let options = super._createConnectionOptions(database);
        return Object["assign"](options, EasySyncServerDb.CONNECTION_PARAMETERS);
    }
    saveEntity(entities) {
        const _super = Object.create(null, {
            saveEntity: { get: () => super.saveEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
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
                    entitiesIds.push(entity.id);
                }
            });
            let indexedCompareEntities = {};
            let compareEntities = yield this.findByIds(model, entitiesIds);
            compareEntities.forEach(cEnt => indexedCompareEntities[cEnt.id] = cEnt);
            entities.forEach(entity => {
                if (entity.id !== null) {
                    if (!indexedCompareEntities[entity.id] || indexedCompareEntities[entity.id].version === parseInt(entity.version)) {
                        entity.version++;
                    }
                    else {
                        throw new Error("optimistic locking exception for id " + entity.id + " and model " + entity.constructor.getSchemaName()) + ": got version " + entity.version + ", but expected " + indexedCompareEntities[entity.id].version;
                    }
                }
            });
            let savedEntites = yield _super.saveEntity.call(this, entities);
            if (!isArray) {
                if (savedEntites.length > 0) {
                    return savedEntites[0];
                }
                return null;
            }
            return savedEntites;
        });
    }
    deleteEntity(entities, model, deleteFully) {
        const _super = Object.create(null, {
            deleteEntity: { get: () => super.deleteEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (deleteFully) {
                return _super.deleteEntity.call(this, entities, model);
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
                entities = yield model.findByIds(entities);
            }
            if (entities[0] instanceof EasySyncBaseModel_1.EasySyncBaseModel) {
                entities.forEach(ent => {
                    ent.deleted = true;
                });
                return this.saveEntity(entities);
            }
            else {
                return _super.deleteEntity.call(this, entities, model);
            }
        });
    }
}
exports.EasySyncServerDb = EasySyncServerDb;
EasySyncServerDb.CONNECTION_PARAMETERS = null;
//# sourceMappingURL=EasySyncServerDb.js.map