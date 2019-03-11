import {BaseDatabase} from "cordova-sites-database";
import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";

export class EasySyncServerDb extends BaseDatabase {

    _createConnectionOptions(database) {
        let options = super._createConnectionOptions(database);
        return Object.assign(options, EasySyncServerDb.CONNECTION_PARAMETERS);
    }

    async saveEntity(entity) {
        entity.updatedAt = new Date();
        if (entity.id !== null) {
            let compareEntity = await this.findById(entity.constructor, entity.id);
            if (compareEntity && compareEntity.version === parseInt(entity.version)){
                entity.version++;
                return super.saveEntity(entity);
            }
            else {
                throw new Error("optimistic locking exception for id "+ entity.id);
            }

            // let repository = await this._getRepository(entity.constructor);
            // let columns = Object.keys(entity.constructor.getColumnDefinitions());
            // // columns.push(...entity.constructor.getRelations());
            //
            // let values = {};
            // columns.forEach(column => {
            //     values[column] = entity[column];
            // });
            //
            // let res = await repository.createQueryBuilder()
            //     .update(entity.constructor)
            //     .set(values)
            //     .where("id = :id AND version = :version", {id: entity.id, version: version})
            //     .execute();
            // console.log(res);
            // return entity;
        } else {
            return super.saveEntity(entity);
        }
    }
}

EasySyncServerDb.CONNECTION_PARAMETERS = null;