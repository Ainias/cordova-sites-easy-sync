import { MigrationInterface, QueryRunner } from "typeorm";
export declare class SetupEasySync1000000000500 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<any>;
    _addLastSyncDates(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<any>;
}
