class EasySync{
    static addModel(model){
        EasySync._models.push(model);
    }
}
EasySync._models = [];
EasySync.TYPES = {
    JSON: "json",
    INTEGER: "int",
    STRING: "string",
    DATE: "timeId",
    BOOLEAN: "bool",
};

class EasySyncBaseModel {
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

    static _modelToJson(model) {
        let {columns} = this.getTableDefinition();
        let jsonObject = {};
        columns.forEach(column => {
            let getterName = ["get", column.key.substr(0, 1).toUpperCase(), column.key.substr(1)].join('');
            if (typeof model[getterName] === "function") {
                jsonObject[column.key] = model[getterName]();
                if (column.type === EasySync.TYPES.JSON) {
                    jsonObject[column.key] = JSON.stringify(jsonObject[column.key]);
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
                if (jsonObject[column.key] !== undefined){
                    let setterName = ["set", column.key.substr(0, 1).toUpperCase(), column.key.substr(1)].join('');
                    if (typeof model[setterName] === "function") {
                        if (column.type === EasySync.TYPES.JSON && typeof jsonObject[column.key] === "string"){
                            jsonObject[column.key] = JSON.parse(jsonObject[column.key]);
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

    toJSON() {
        return this.constructor._modelToJson(this);
    }
}

EasySyncBaseModel.dbInstance = null;

export { EasySync, EasySyncBaseModel };
