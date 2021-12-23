import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class SetupEasySync1000000000500 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<any>;
    private addLastSyncDates;
    down(): Promise<any>;
}
