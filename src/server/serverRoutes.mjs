import express from 'express';
import {EasySyncController} from "./EasySyncController";

const easySyncRoutes = express.Router();

const errorHandler = (fn, context) => {
    return (req, res, next) => {
        const resPromise = fn.call(context, req,res,next);
        if (resPromise && resPromise.catch){
            resPromise.catch(err => next(err));
        }
    }
};

easySyncRoutes.get("", errorHandler(EasySyncController.sync, EasySyncController));
easySyncRoutes.post("", errorHandler(EasySyncController.modifyModel, EasySyncController));

export {easySyncRoutes};