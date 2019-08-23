import {EasySyncBaseModel} from "./EasySyncBaseModel";
import * as _typeorm from "typeorm";

let typeorm = _typeorm;
// if (typeorm.default) {
//     typeorm = typeorm.default;
// }

export class EasySyncPartialModel extends EasySyncBaseModel {

    static async findByIds(ids){
        return this.find({
            "id":
                typeorm.In(ids)
        });
    }

    static async findById(id){
        return this.findOne({
            "id": id
        });
    }

    static async findByClientId(id){
        return super.findById(id)
    }

    static async findByClientIds(ids){
        return super.findById(ids)
    }

}

EasySyncPartialModel.CAN_BE_SYNCED = true;