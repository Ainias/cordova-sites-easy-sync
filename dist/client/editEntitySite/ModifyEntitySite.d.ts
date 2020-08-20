import { MenuSite } from "cordova-sites/dist/client/js/Context/MenuSite";
export declare class ModifyEntitySite extends MenuSite {
    protected _formSelector: string;
    protected _ckEditorConfig: any;
    private _entity;
    private _model;
    private _form;
    constructor(siteManager: any, view: any, model: any, menuTemplate: any);
    getEntityFromParameters(constructParameters: any): Promise<any>;
    onConstruct(constructParameters: any): Promise<any[]>;
    setEntity(entity: any): Promise<void>;
    hydrate(values: any, entity: any): Promise<any>;
    dehydrate(entity: any): Promise<{}>;
    validate(values: any, form: any): Promise<boolean>;
    saveListener(): void;
    save(values: any): Promise<void>;
    onViewLoaded(): Promise<any[]>;
}
