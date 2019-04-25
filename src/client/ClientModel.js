import {BaseDatabase, BaseModel} from "cordova-sites-database";

export class ClientModel extends BaseModel{
    static getColumnDefinitions(){
        let columns = super.getColumnDefinitions();
        if (columns["id"] && columns["id"]["generated"]){
            columns["id"]["generated"] = false;
        }
        return columns;
    }

    static getSchemaDefinition(){
        let definitions = super.getSchemaDefinition();

        Object.keys(definitions.columns).forEach(column => {
            if (definitions.columns[column].type === BaseDatabase.TYPES.MEDIUMTEXT){
                definitions.columns[column].type = BaseDatabase.TYPES.TEXT;
            }
        });
        return definitions;
    }
}