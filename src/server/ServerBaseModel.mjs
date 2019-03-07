import {EasySyncServerDb} from "./EasySyncServerDb";

export class ServerBaseModel {
    static async saveModel(model) {
        return EasySyncServerDb.getInstance().saveModel(model);
    }

    /**
     * @param where
     * @param orderBy
     * @param limit
     * @param offset
     * @returns {Promise<[ServerBaseModel]>}
     */
    static async select(where, orderBy, limit, offset) {
       return EasySyncServerDb.getInstance().select(this, where, orderBy, limit, offset);
    }

    static async selectOne(where, orderBy, offset) {
        let models = await this.select(where, orderBy, 1, offset);
        if (models.length >= 1) {
            return models[0];
        }
        return null;
    }
}