export declare class EasySyncController {
    static MAX_MODELS_PER_RUN: number;
    static _doSyncModel(model: any, lastSynced: any, offset: any, where: any, orderBy?: any): Promise<{
        model: any;
        newLastSynced: number;
        entities: any;
        nextOffset: any;
        shouldAskAgain: boolean;
    }>;
    static _syncModel(model: any, lastSynced: any, offset: any, where: any, req: any, order?: any): Promise<{
        model: any;
        newLastSynced: number;
        entities: any;
        nextOffset: any;
        shouldAskAgain: boolean;
    }>;
    static _execQuery(query: any, offset: any, req: any): Promise<{
        model: any;
        newLastSynced: number;
        entities: any;
        nextOffset: any;
        shouldAskAgain: boolean;
    }>;
    static sync(req: any, res: any): Promise<any>;
    static _doModifyModel(model: any, modelData: any, entities?: any): Promise<{}>;
    static modifyModel(req: any, res: any): Promise<any>;
    static _doDeleteModel(model: any, modelIds: any): Promise<void>;
    static deleteModel(req: any, res: any): Promise<any>;
}
