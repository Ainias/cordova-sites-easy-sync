import {MigrationInterface, QueryRunner, Table} from "typeorm";
import {BaseDatabase} from "cordova-sites-database/dist/cordova-sites-database";

export class SetupEasySync1566377719950 implements MigrationInterface {

    async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.dropTable("las_sync_dates", true);
        await this._addLastSyncDates(queryRunner);
    }


    async _addLastSyncDates(queryRunner: QueryRunner) {
        let lastSyncDatesTable = new Table({
            name: "last_sync_dates",
            columns: [
                {
                    name: "id",
                    isGenerated: true,
                    isPrimary: true,
                    type: BaseDatabase.TYPES.INTEGER,
                },
                {
                    name: "model",
                    type: BaseDatabase.TYPES.STRING,
                    isNullable: true
                },
                {
                    name: "lastSynced",
                    type: BaseDatabase.TYPES.DATE,
                    isNullable: true
                },
                {
                    name: "where",
                    type: BaseDatabase.TYPES.TEXT,
                }
            ]
        });
        return await queryRunner.createTable(lastSyncDatesTable, true)
    }

    down(queryRunner: QueryRunner): Promise<any> {
        return undefined;
    }

}