import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { BaseDatabase } from 'cordova-sites-database/dist/cordova-sites-database';

export class SetupEasySync1000000000500 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.dropTable('last_sync_dates', true);
        await this.addLastSyncDates(queryRunner);
    }

    private async addLastSyncDates(queryRunner: QueryRunner) {
        const lastSyncDatesTable = new Table({
            name: 'last_sync_dates',
            columns: [
                {
                    name: 'id',
                    type: 'Integer',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'increment' as const,
                },
                {
                    name: 'model',
                    type: BaseDatabase.TYPES.STRING,
                    isNullable: true,
                },
                {
                    name: 'lastSynced',
                    type: BaseDatabase.TYPES.DATE,
                    isNullable: true,
                },
                {
                    name: 'where',
                    type: BaseDatabase.TYPES.TEXT,
                },
            ],
        });
        return queryRunner.createTable(lastSyncDatesTable, true);
    }

    down(): Promise<any> {
        return undefined;
    }
}
