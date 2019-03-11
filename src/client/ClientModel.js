import {EasySyncBaseModel} from "../shared/EasySyncBaseModel";

export class ClientModel extends EasySyncBaseModel{
    static getColumnDefinitions(){
        let columns = super.getColumnDefinitions();
        if (columns["id"] && columns["id"]["generated"]){
            columns["id"]["generated"] = false;
        }
        return columns;
    }
}