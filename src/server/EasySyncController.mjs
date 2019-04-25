import {EasySyncServerDb} from "./EasySyncServerDb";
import * as _typeorm from "typeorm";

let typeorm = _typeorm;
if (typeorm.default) {
    typeorm = typeorm.default;
}

const MAX_MODELS_PER_RUN = 200;

export class EasySyncController {

    static async _syncModel(model, lastSynced, offset, where) {
        if (model.CAN_BE_SYNCED === false) {
            throw new Error("tried to sync unsyncable model " + model.getSchemaName());
        }

        let dateLastSynced = new Date(parseInt(lastSynced || 0));
        let newDateLastSynced = new Date().getTime();
        offset = parseInt(offset);

        where = where || {};
        where = Object.assign(where, {
            "updatedAt": typeorm.MoreThan(dateLastSynced),
        });

        let entities = await model.find(where, null, MAX_MODELS_PER_RUN, offset, model.getRelations());

        return {
            "newLastSynced": newDateLastSynced,
            "entities": entities,
            "nextOffset": offset + entities.length,
            "shouldAskAgain": entities.length === MAX_MODELS_PER_RUN
        };
    }

    static async sync(req, res) {
        let requestedModels = {};
        let modelClasses = {};
        if (req.query.models) {
            requestedModels = JSON.parse(req.query.models);
            Object.keys(requestedModels).forEach(model => {
                modelClasses[model] = EasySyncServerDb.getModel(model);
            });
        } else {
            let allModelClasses = EasySyncServerDb.getModel();
            Object.keys(allModelClasses).forEach(name => {
                if (allModelClasses[name].CAN_BE_SYNCED !== false) {
                    requestedModels[name] = {};
                    modelClasses[name] = allModelClasses[name];
                }
            });
        }

        //create lastSynced before the queries to db
        let result = {
            "nextOffset": -1,
            "models": {},
            "newLastSynced": new Date().getTime()
        };

        let requests = [];
        let modelNames = Object.keys(modelClasses);
        modelNames.forEach(modelName => {
            requests.push(EasySyncController._syncModel(modelClasses[modelName], (requestedModels[modelName].lastSynced || 0), (req.query.offset || 0), requestedModels[modelName].where));
        });

        let results = await Promise.all(requests);

        results.forEach((res, i) => {
            if (res.shouldAskAgain) {
                result.nextOffset = result.nextOffset < 0 ? res.nextOffset : Math.min(res.nextOffset, result.nextOffset);
            }
            result.models[modelClasses[modelNames[i]].getSchemaName()] = res;
        });

        res.json(result);
    }

    static async modifyModel(req, res) {
        let modelName = req.body.model;
        let modelData = req.body.values;
        if (!Array.isArray(modelData)) {
            modelData = [modelData];
        }

        // let db = await EasySyncServerDb.getInstance();
        let model = EasySyncServerDb.getModel(modelName);
        let entities = await model._fromJson(modelData, undefined, true);

        let savePromises = [];
        entities.forEach(model => {
            savePromises.push(model.save());
        });
        await Promise.all(savePromises);
        res.json(entities);
    }
}