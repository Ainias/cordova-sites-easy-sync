export declare class EasySyncController {
    static MAX_MODELS_PER_RUN: number;
    protected static doSyncModel(model: any, lastSynced: any, offset: any, where: any, orderBy?: any): Promise<{
        model: any;
        newLastSynced: number;
        entities: any;
        nextOffset: any;
        shouldAskAgain: boolean;
    }>;
    protected static syncModel(model: any, lastSynced: any, offset: any, where: any, req: any, order?: any): Promise<{
        model: any;
        newLastSynced: number;
        entities: any;
        nextOffset: any;
        shouldAskAgain: boolean;
    }>;
    protected static execQuery(query: any, offset: any, req: any): Promise<{
        model: any;
        newLastSynced: number;
        entities: any;
        nextOffset: any;
        shouldAskAgain: boolean;
    }>;
    static sync(req: any, res: any): Promise<any>;
    protected static doModifyModel(model: any, modelData: any, entities?: any): Promise<{}>;
    static modifyModel(req: any, res: any): Promise<any>;
    protected static doDeleteModel(model: any, modelIds: any): Promise<void>;
    static deleteModel(req: any, res: any): Promise<any>;
}
