export class EasySync {
    static addModel(model) {
        EasySync._models.push(model);
    }

    static isRelationship(type) {
        return (type === EasySync.TYPES.ONE_TO_ONE ||
            type === EasySync.TYPES.ONE_TO_MANY ||
            type === EasySync.TYPES.MANY_TO_ONE ||
            type === EasySync.TYPES.MANY_TO_MANY)
    }
}

EasySync._models = [];
EasySync.TYPES = {
    JSON: "json",
    INTEGER: "int",
    STRING: "string",
    DATE: "timeId",
    BOOLEAN: "bool",
    ONE_TO_ONE: "oneToOne",
    ONE_TO_MANY: "oneToMany",
    MANY_TO_ONE: "manyToOne",
    MANY_TO_MANY: "manyToMany"
};