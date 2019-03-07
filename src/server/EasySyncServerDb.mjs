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
        this._syncPromise = this._sequelize.sync({alter: true});
    }

    _createModels() {
        EasySyncServerDb._easySync._models.forEach(model => {
            Object.setPrototypeOf(model, EasySyncBaseModel);
            model.sequelizeModelDefinition = this._sequelize.define(model.getModelName(),
                EasySyncServerDb._getSequelizeDefinitionFromModel(model), EasySyncServerDb.TABLE_SETTINGS);
            this._models[model.getModelName()] = model;
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

    /**
     * @param {EasySyncBaseModel} model
     * @returns {Promise<{EasySyncBaseModel}>}
     */
    async saveModel(model) {
        await this._syncPromise;

        // model.setLastUpdated(new Date());

        let values = model.constructor._modelToJson(model);
        if (model.getId()) {
            //update
            if (!model.sequelizeModel){
                model.sequelizeModel = await this._models[model.constructor.getModelName()].sequelizeModelDefinition.findById(model.getId());
            }
            if (model.sequelizeModel.version !== model.getVersion()){
                throw new Error("wrong version for model with id "+model.getId()+"!");
            }
            Object.assign(model.sequelizeModel, values);
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
    }

    async select(model, where, orderBy, limit, offset) {
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