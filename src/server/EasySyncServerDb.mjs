import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";
import {EasySync} from "../shared/EasySync";

import Sequelize from "sequelize";
import {ServerBaseModel} from "./ServerBaseModel";

export class EasySyncServerDb {
    constructor() {
        this._models = {};
        this._sequelize = EasySyncServerDb._sequelize;
        this._updateBaseModel();
        this._createModels();
        this._syncPromise = this._sequelize.sync({alter: true}).catch(e => {
            console.error(e);
            return Promise.reject(e);
        });
    }

    _createModels() {
        EasySyncServerDb._easySync._models.forEach(model => {
            model.relationships = {};
            Object.setPrototypeOf(model, EasySyncBaseModel);
            let definition = EasySyncServerDb._getSequelizeDefinitionFromModel(model);
            let {columns} = model.getTableDefinition();
            Object.keys(definition).forEach((name, i) => {
                if (EasySync.isRelationship(definition[name].type)) {
                    model.relationships[name] = columns[i];
                    delete definition[name];
                }
            });
            model.sequelizeModelDefinition = this._sequelize.define(model.getModelName(),
                definition, EasySyncServerDb.TABLE_SETTINGS);
            this._models[model.getModelName()] = model;
        });
        Object.keys(this._models).forEach(modelName => {
            Object.keys(this._models[modelName].relationships).forEach(name => {
                let column = this._models[modelName].relationships[name];
                let definition = {};

                if (!column["target"]) {
                    column["target"] = name;
                }

                if (!column["as"]) {
                    column["as"] = name;
                }

                let copyKeys = [
                    "as",
                    "through"
                ];
                copyKeys.forEach(key => {
                    if (column[key]) {
                        definition[key] = column[key];
                    }
                });
                let target = column["target"];
                let targetModel = this._models[target];
                column.targetModel = targetModel;

                switch (column.type) {
                    case EasySync.TYPES.MANY_TO_MANY: {
                        this._models[modelName].sequelizeModelDefinition.belongsToMany(targetModel.sequelizeModelDefinition, definition);
                        break;
                    }
                    case EasySync.TYPES.ONE_TO_MANY: {
                        this._models[modelName].sequelizeModelDefinition.hasMany(targetModel.sequelizeModelDefinition, definition);
                        break;
                    }
                }
            });
        });
    }

    _updateBaseModel() {
        Object.setPrototypeOf(EasySyncBaseModel, ServerBaseModel);
    }

    /**
     *
     * @param model
     * @returns {{EasySyncBaseModel}|EasySyncBaseModel}
     */
    getModel(model) {
        if (model) {
            if (this._models[model]) {
                return this._models[model];
            }
            return null;
        } else {
            return this._models;
        }
    }

    async saveModels(models) {
        await this._syncPromise;

        let res = [];
        models.forEach(model => res.push(this.saveModel(model)));
        return Promise.all(res);
    }

    /**
     * @param {EasySyncBaseModel} model
     * @returns {Promise<{EasySyncBaseModel}>}
     */
    async saveModel(model) {
        await this._syncPromise;

        if (Array.isArray(model)) {
            return this.saveModels(model);
        }

        let values = model.constructor._modelToJson(model);
        if (model.getId()) {
            //update
            if (!model.sequelizeModel) {
                model.sequelizeModel = await this._models[model.constructor.getModelName()].sequelizeModelDefinition.findById(model.getId());
            }
            if (model.sequelizeModel.version !== model.getVersion()) {
                throw new Error("wrong version for model with id " + model.getId() + "!");
            }
            // console.log(model.sequelizeModel);

            let {columns} = model.constructor.getTableDefinition();
            let forEachPromise = Promise.resolve();
            columns.forEach(column => {
                forEachPromise = forEachPromise.then(async () => {
                    if (EasySync.isRelationship(column.type)) {

                        let getter = "get" + column.key.substr(0, 1).toUpperCase() + column.key.substr(1)+"s";
                        let value = await this.saveModel(model[getter]());

                        if (Array.isArray(value))
                        {
                            let sequelizeValues = [];
                            value.forEach(val => sequelizeValues.push(val.sequelizeModel));
                            value =sequelizeValues;
                        }

                        model.sequelizeModel["set" + column.key.substr(0, 1).toUpperCase() + column.key.substr(1)](value);
                    } else {
                        model.sequelizeModel[column.key] = values[column.key];
                    }
                });
            });
            await forEachPromise;
            model.sequelizeModel = await model.sequelizeModel.save();
        } else {
            //create
            model.sequelizeModel = await this._models[model.constructor.getModelName()].sequelizeModelDefinition.create(values);
        }
        let newValues = {};
        for (let k in values) {
            if (model.sequelizeModel[k]) {
                newValues[k] = model.sequelizeModel[k];
            }
        }
        model.constructor._inflate(newValues, model);
        return model;
    }

    /**
     *
     * @param model
     */
    static _getSequelizeDefinitionFromModel(model) {
        let definitions = {};
        let {columns} = model.getTableDefinition();
        columns.forEach(column => {
            let definition = {
                type: EasySyncServerDb._getSequelizeType(column.type),
                allowNull: false
            };
            if (column.ai) {
                definition.autoIncrement = true;
            }
            if (column.pk) {
                definition.primaryKey = true;
            }
            if (column.n) {
                definition.allowNull = true;
            }
            definitions[column.key] = definition;
        });
        return definitions;
    }

    static _getSequelizeType(easySyncType) {
        switch (easySyncType) {
            case EasySync.TYPES.INTEGER: {
                return Sequelize.DataTypes.INTEGER
            }
            case EasySync.TYPES.BOOLEAN: {
                return Sequelize.DataTypes.BOOLEAN
            }
            case EasySync.TYPES.DATE: {
                return Sequelize.DataTypes.DATE
            }
            case EasySync.TYPES.JSON:
            case EasySync.TYPES.STRING: {
                return Sequelize.DataTypes.STRING
            }
        }
        return easySyncType;
    }

    async select(model, where, orderBy, limit, offset, includeRelationships) {
        let query = {};
        if (where) {
            query.where = where;
        }
        if (limit) {
            query.limit = limit;
        }
        if (offset) {
            query.offset = offset;
        }
        if (orderBy) {
            if (!Array.isArray(orderBy) && typeof orderBy === "object") {
                let newOrderBy = [];
                Object.keys(orderBy).forEach(column => {
                    newOrderBy.push([column, orderBy[column]]);
                });
                orderBy = newOrderBy;
            }
            query.order = orderBy;
        }
        if (includeRelationships) {
            query.include = [];
            Object.keys(this._models[model.getModelName()].relationships).forEach(targetName => {
                query.include.push({
                    model: this._models[this._models[model.getModelName()].relationships[targetName].target].sequelizeModelDefinition,
                    as: this._models[model.getModelName()].relationships[targetName]["as"]
                });
            });
        }
        await this._syncPromise;
        let sequelizeModels = await this._models[model.getModelName()].sequelizeModelDefinition.findAll(query);
        let models = this._models[model.getModelName()]._inflate(sequelizeModels);

        models.forEach((model, i) => {
            model.sequelizeModel = sequelizeModels[i];
        });

        return models;
    }

    static getInstance() {
        if (!(EasySyncServerDb._instance)) {
            EasySyncServerDb._instance = new EasySyncServerDb();
        }
        return EasySyncServerDb._instance;
    }

    static setSequelize(sequelize) {
        EasySyncServerDb._sequelize = sequelize;
    }

    static setEasySync(easySync) {
        EasySyncServerDb._easySync = easySync;
    }
}

EasySyncServerDb.TABLE_SETTINGS = {
    timestamps: true,
    paranoid: true,
    freezeTableName: true,
    version: true
};

EasySyncServerDb._easySync = null;
EasySyncServerDb._sequelize = null;
EasySyncServerDb._instance = null;