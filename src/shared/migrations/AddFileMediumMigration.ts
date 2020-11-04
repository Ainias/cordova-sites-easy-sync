import {MigrationInterface, QueryRunner} from "typeorm";
import {MigrationHelper} from "js-helper";
import {FileMedium} from "../FileMedium";

export class AddFileMediumMigration1000000011000 implements MigrationInterface {

    async down(queryRunner: QueryRunner): Promise<any> {
        return Promise.resolve(undefined);
    }

    async up(queryRunner: QueryRunner): Promise<any> {
        let table = MigrationHelper.createTableFromModelClass(FileMedium);
        table.columns.forEach(column => {
            if (column.name === "src") {
                column.type = MigrationHelper.isServer() ? "MEDIUMTEXT" : "TEXT";
            }
        });
        await queryRunner.createTable(table);
    }
}