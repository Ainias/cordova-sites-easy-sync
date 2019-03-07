import express from 'express';
import {EasySyncController} from "./EasySyncController";

const easySyncRoutes = express.Router();

const errorHandler = (fn) => {
    return (req, res, next) => {
        const resPromise = fn(req,res,next);
        if (resPromise.catch){
            resPromise.catch(err => next(err));
        }
    }
};

easySyncRoutes.get("", errorHandler(EasySyncController.sync));
easySyncRoutes.post("", errorHandler(EasySyncController.modifyModel));

export {easySyncRoutes};