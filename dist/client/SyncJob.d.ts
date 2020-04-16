import { QueryRunner } from "typeorm";
export declare class SyncJob {
    static SYNC_PATH_PREFIX: any;
    _syncedModels: {};
    _modelNames: any[];
    _relationshipModels: {};
    _lastSyncDates: {};
    _keyedModelClasses: {};
    _savePromise: Promise<void>;
    _queryRunner: QueryRunner;
    _finalRes: any;
    _syncPromise: any;
    _manyToManyRelations: {};
    syncInBackgroundIfDataExists(queries: any): Promise<void>;
    getSyncPromise(): Promise<any>;
    sync(queries: any): Promise<any>;
    private _doRuns;
    /**
     * Extract the Entities and saves them(?) for one model
     *
     * @param modelRes
     * @private
     */
    private _extractEntities;
    private _buildRequestQuery;
    private _getLastSyncModels;
    static _fetchModel(query: any, offset: any): Promise<any>;
    private _insertOrReplace;
    private _deleteModels;
    private _handleManyToManyRelations;
}
