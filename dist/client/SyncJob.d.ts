export declare class SyncJob {
    static SYNC_PATH_PREFIX: any;
    private syncedModels;
    private modelNames;
    private relationshipModels;
    private lastSyncDates;
    private keyedModelClasses;
    private savePromise;
    private queryRunner;
    private finalRes;
    private syncPromise;
    private manyToManyRelations;
    syncInBackgroundIfDataExists(queries: any, downloadImages?: boolean): Promise<void>;
    getSyncPromise(): Promise<any>;
    sync(queries: any, downloadImages?: boolean): Promise<any>;
    private doRuns;
    /**
     * Extract the Entities and saves them(?) for one model
     *
     * @param modelRes
     * @private
     */
    private extractEntities;
    private buildRequestQuery;
    private static getLastSyncModels;
    static fetchModel(query: any, offset: any): Promise<any>;
    private insertOrReplace;
    private deleteModels;
    private handleManyToManyRelations;
}
