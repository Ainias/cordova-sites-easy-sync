import {EasySync} from "./EasySync";

export class EasySyncBaseModel {
    constructor() {
        this._id = null;
        this._createdAt = new Date();
        this._updatedAt = new Date();
        this._version = 1;
        this._deleted = false;
    }

    getId() {
        return this._id;
    }

    setId(id) {
        this._id = id;
    }

    /**
     * @returns {Date}
     */
    getCreatedAt() {
        return this._createdAt;
    }

    /**
     * @param {Date} createdAt
     *
     */
    setCreatedAt(createdAt) {
        this._createdAt = createdAt;
    }

    /**
     * @returns {Date}
     */
    getUpdatedAt() {
        return this._updatedAt;
    }

    /**
     * @param {Date} lastUpdated
     */
    setUpdatedAt(lastUpdated) {
        this.updatedAt = lastUpdated;
    }

    /**
     * @returns {number}
     */
    getVersion() {
        return this._version;
    }

    /**
     * @param {number} version
     */
    setVersion(version) {
        this._version = version;
    }

    /**
     * @returns {boolean}
     */
    getDeleted() {
        return this._deleted;
    }

    /**
     * @param {boolean} deleted
     */
    setDeleted(deleted) {
        this._deleted = (deleted === true);
    }

    async save() {
        //Wenn direkt BaseModel.saveModel aufgerufen wird, später ein Fehler geschmissen (_method not defined), da der
        // falsche Kontext am Objekt existiert
        return this.constructor.saveModel(this);
    }

    static _modelsToJson(models) {
        let jsonArray = [];
        models.forEach(model => jsonArray.push(this._modelToJson(model)));
        return jsonArray;
    }

    static _modelToJson(model) {
        if (Array.isArray(model)) {
            return this._modelsToJson(model);
        }

        let {columns} = this.getTableDefinition();
        let jsonObject = {};
        columns.forEach(column => {
            let getterName = ["get", column.key.substr(0, 1).toUpperCase(), column.key.substr(1)].join('');
            if (column.type === EasySync.TYPES.MANY_TO_MANY || column.type === EasySync.TYPES.ONE_TO_MANY) {
                getterName += "s";
            }
            if (typeof model[getterName] === "function") {
                jsonObject[column.key] = model[getterName]();
                if (column.type === EasySync.TYPES.JSON) {
                    jsonObject[column.key] = JSON.stringify(jsonObject[column.key]);
                }
                if (EasySync.isRelationship(column.type)) {
                    jsonObject[column.key] = this.relationships[column.key].targetModel._modelToJson(jsonObject[column.key])
                }

            }
        });
        return jsonObject;
    }

    static getTableDefinition() {
        return {
            name: this.getModelName(),
            columns: [
                {key: "id", type: EasySync.TYPES.INTEGER, ai: true, pk: true, allowNull: false},
                {key: "createdAt", type: EasySync.TYPES.DATE},
                {key: "updatedAt", type: EasySync.TYPES.DATE},
                {key: "version", type: EasySync.TYPES.INTEGER},
                {key: "deleted", type: EasySync.TYPES.BOOLEAN},
            ]
        }
    }

    /**
     * @returns {null|string}
     */
    static getModelName() {
        if (this.modelName) {
            return this.modelName;
        } else {
            return this.name;
        }
    }

    /**
     * @param {string} name
     */
    static setModelName(name) {
        this.modelName = name;
    }

    static _newModel() {
        return new this();
    }

    static getTableSchema() {
        let {columns} = this.getTableDefinition();
        let newColumns = [];

        columns.forEach(definition => {
            let newColumn = Object.assign({}, definition);
            if (!EasySync.isRelationship(definition.type)) {
                newColumn.props = [];
                if (definition.ai) {
                    newColumn.props.push("ai");
                }
                if (definition.pk) {
                    newColumn.props.push("pk");
                }
                if (definition.type === EasySync.TYPES.JSON) {
                    newColumn.type = EasySync.TYPES.STRING;
                }
            } else {
                if (definition.type === EasySync.TYPES.ONE_TO_MANY || definition.type === EasySync.TYPES.MANY_TO_MANY) {
                    let target = EasySync.TYPES.INTEGER+"[]";
                    newColumn.type = target;
                }
            }
            newColumns.push(newColumn);
        });
        return newColumns;
    }

    static _getDBInstance() {
        return EasySyncBaseModel.dbInstance;
    }

    static _inflate(jsonObjects, models) {
        models = models || [];

        let isArray = Array.isArray(jsonObjects);
        if (!isArray) {
            jsonObjects = [jsonObjects];
        }
        if (!Array.isArray(models)) {
            models = [models];
        }

        let {columns} = this.getTableDefinition();
        jsonObjects.forEach((jsonObject, index) => {
            let model = (models.length > index) ? models[index] : new this();
            columns.forEach(column => {
                if (jsonObject[column.key] !== undefined) {
                    let setterName = ["set", column.key.substr(0, 1).toUpperCase(), column.key.substr(1)].join('');
                    if (column.type === EasySync.TYPES.MANY_TO_MANY || column.type === EasySync.TYPES.ONE_TO_MANY) {
                        setterName += "s";
                    }
                    if (typeof model[setterName] === "function") {
                        if (column.type === EasySync.TYPES.JSON && typeof jsonObject[column.key] === "string") {
                            jsonObject[column.key] = JSON.parse(jsonObject[column.key]);
                        }
                        if (EasySync.isRelationship(column.type)) {
                            jsonObject[column.key] = this.relationships[column.key].targetModel._inflate(jsonObject[column.key])//change to model
                        }
                        model[setterName](jsonObject[column.key]);
                    }
                }
            });
            models[index] = model;
        });
        if (!isArray) {
            models = (models.length > 0) ? models[0] : null;
        }
        return models;
    }

    _get(key){
        let getterName = ["get", key.substr(0, 1).toUpperCase(), key.substr(1)].join('');
        return this[getterName]();
    }
    _set(key, value){
        let setterName = ["set", key.substr(0, 1).toUpperCase(), key.substr(1)].join('');
        return this[setterName]();
    }

    toJSON() {
        let res = this.constructor._modelToJson(this);
        let {columns} = this.constructor.getTableDefinition();
        columns.forEach(column => {
           if (EasySync.isRelationship(column.type)){
               if (Array.isArray(res[column.key])){
                   let ids = [];
                   res[column.key].forEach(jsonModel => ids.push({id: jsonModel.id}));
                   res[column.key] = ids;
               }
               else {
                   res[column.key] = res[column.key].id;
               }
           }
        });
        return res;
    }
}

EasySyncBaseModel.dbInstance = null;