import {BaseModel} from "cordova-sites-database";

export class ClientModel extends BaseModel{
    static getColumnDefinitions(){
        let columns = super.getColumnDefinitions();
        if (columns["id"] && columns["id"]["generated"]){
            columns["id"]["generated"] = false;
        }
        return columns;
    }
}