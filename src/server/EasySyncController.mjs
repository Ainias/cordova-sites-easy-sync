import {EasySyncServerDb} from "./EasySyncServerDb";
import Sequelize from 'sequelize';

const Op = Sequelize.Op;

const MAX_MODELS_PER_RUN = 200;

export class EasySyncController {

    static async _syncModel(Model, lastSynced, offset, where) {
        let dateLastSynced = new Date(parseInt(lastSynced || 0));
        let newDateLastSynced = new Date().getTime();
        offset = parseInt(offset);

        where = where || {};
        where = Object.assign(where, {
            "updatedAt": {[Op.gte]: dateLastSynced}
        });

        let entities = await Model.select(where, null, MAX_MODELS_PER_RUN, offset, true);

        return {
            "newLastSynced": newDateLastSynced,
            "entities": entities,
            "nextOffset": offset + entities.length,
            "shouldAskAgain": entities.length === MAX_MODELS_PER_RUN
        };
    }

    static async sync(req, res) {

        let db = await EasySyncServerDb.getInstance();

        let requestedModels = {};
        let modelClasses = {};
        if (req.query.models) {
            requestedModels = JSON.parse(req.query.models);
            Object.keys(requestedModels).forEach(model => {
                modelClasses[model] = db.getModel(model);
            });
        } else {
            modelClasses = db.getModel();
            Object.keys(modelClasses).forEach(name => requestedModels[name] = {});
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
            result.models[modelClasses[modelNames[i]].getModelName()] = res;
        });

        res.json(result);
    }

    static async modifyModel(req, res) {
        let modelName = req.body.model;
        let modelData = req.body.values;
        if (!Array.isArray(modelData)) {
            modelData = [modelData];
        }

        let db = await EasySyncServerDb.getInstance();
        let ModelClass = db.getModel(modelName);
        let models = ModelClass._inflate(modelData);

        let savePromises = [];
        models.forEach(model => {
            savePromises.push(model.save());
        });
        await Promise.all(savePromises);
        res.json(models);
    }
}