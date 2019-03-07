export class EasySync{
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