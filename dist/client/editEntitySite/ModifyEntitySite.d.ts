import { MenuSite } from "cordova-sites/dist/client/js/Context/MenuSite";
import { EasySyncBaseModel } from "../../shared/EasySyncBaseModel";
export declare class ModifyEntitySite<Model extends EasySyncBaseModel> extends MenuSite {
    protected formSelector: string;
    protected ckEditorConfig: any;
    private entity;
    private readonly model;
    private form;
    constructor(siteManager: any, view: any, model: any, menuTemplate?: any);
    getEntityFromParameters(constructParameters: any): Promise<Model>;
    onConstruct(constructParameters: any): Promise<any[]>;
    setEntity(entity: Model): Promise<void>;
    hydrate(values: {
        [key: string]: string;
    }, entity: Model): Promise<Model>;
    dehydrate(entity: Model): Promise<{
        [key: string]: string | number | Date;
    }>;
    validate(values: any, form: any): Promise<boolean>;
    onSaved(): void;
    save(values: any): Promise<void>;
    onViewLoaded(): Promise<any[]>;
    getEntity(): Model;
}
