import { BaseDatabase, BaseModel } from 'cordova-sites-database/dist/cordova-sites-database';
import { DataManager } from 'cordova-sites/dist/client';
import { Helper } from 'js-helper/dist/shared';

export class ClientModel extends BaseModel {
    static SAVE_PATH: string;
    static DELETE_PATH: string;

    static getColumnDefinitions() {
        const columns = super.getColumnDefinitions();
        if (columns.id && typeof columns.id !== 'string' && columns.id.generated) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            columns.id.generated = false;
        }
        return columns;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    static async fromJson(jsonObjects, models, includeRelations) {}

    // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    toJSON(includeFull?) {}

    async save(local?) {
        if (!local) {
            const values = this.toJSON();
            const data = await DataManager.send((<typeof ClientModel>this.constructor).SAVE_PATH, {
                model: (<typeof ClientModel>this.constructor).getSchemaName(),
                values,
            });

            if (data.success === false) {
                throw new Error(data.errors);
            }
            await (<typeof ClientModel>this.constructor).fromJson(data, this, true);
        }
        return super.save();
    }

    async delete(local?) {
        if (!local) {
            const data = await DataManager.send((<typeof ClientModel>this.constructor).DELETE_PATH, {
                model: (<typeof ClientModel>this.constructor).getSchemaName(),
                id: this.id,
            });
            if (data.success === false) {
                throw new Error(data.errors);
            }
        }

        return super.delete();
    }

    static async saveMany(entities, local?) {
        if (!local) {
            const values = [];

            entities.forEach((entity) => {
                values.push(entity.toJSON());
            });

            const data = await DataManager.send(this.SAVE_PATH, {
                model: this.getSchemaName(),
                values,
            });

            if (data.success === false) {
                throw new Error(data.errors);
            }
            entities = await this.fromJson(data, undefined, true);
        }

        return super.saveMany(entities);
    }

    static getSchemaDefinition() {
        const TYPES_FOR_DEFAULT_ESCAPING = [
            BaseDatabase.TYPES.MEDIUMTEXT,
            BaseDatabase.TYPES.STRING,
            BaseDatabase.TYPES.TEXT,
        ];

        const definitions = super.getSchemaDefinition();
        const { columns } = definitions;

        Object.keys(columns).forEach((column) => {
            if (columns[column].type === BaseDatabase.TYPES.MEDIUMTEXT) {
                columns[column].type = BaseDatabase.TYPES.TEXT;
            }
            if (columns[column].type === BaseDatabase.TYPES.JSON) {
                columns[column].type = BaseDatabase.TYPES.SIMPLE_JSON;
            }

            if (TYPES_FOR_DEFAULT_ESCAPING.indexOf(columns[column].type) !== -1) {
                columns[column].escapeJS = Helper.nonNull(columns[column].escapeJS, true);
                columns[column].escapeHTML = Helper.nonNull(columns[column].escapeHTML, true);
            }
        });
        return definitions;
    }
}

ClientModel.SAVE_PATH = '/sync';
ClientModel.DELETE_PATH = '/sync/delete';
