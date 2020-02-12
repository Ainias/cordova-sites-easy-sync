export declare class SyncJob {
    static SYNC_PATH_PREFIX: any;
    _syncedModels: {};
    _modelNames: any[];
    _relationshipModels: {};
    _lastSyncDates: {};
    _keyedModelClasses: {};
    _savePromises: any[];
    _syncPromise: any;
    syncInBackgroundIfDataExists(queries: any): Promise<void>;
    getSyncPromise(): Promise<any>;
    sync(queries: any): Promise<{}>;
    private _doRuns;
    private _handleRelations;
    private _handleSingleRelation;
    /**
     * Extract the Entities and saves them(?) for one model
     *
     * @param modelRes
     * @private
     */
    private _extractEntities;
    private _buildRequestQuery;
    private _getLastSyncModels;
    private _addRelation;
    static _fetchModel(query: any, offset: any): Promise<any>;
}
