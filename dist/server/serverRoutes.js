"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const EasySyncController_1 = require("./EasySyncController");
const easySyncRoutes = express.Router();
exports.easySyncRoutes = easySyncRoutes;
const errorHandler = (fn, context) => {
    return (req, res, next) => {
        const resPromise = fn.call(context, req, res, next);
        if (resPromise && resPromise.catch) {
            resPromise.catch(err => next(err));
        }
    };
};
easySyncRoutes.get("", errorHandler(EasySyncController_1.EasySyncController.sync, EasySyncController_1.EasySyncController));
easySyncRoutes.post("", errorHandler(EasySyncController_1.EasySyncController.modifyModel, EasySyncController_1.EasySyncController));
easySyncRoutes.post("/delete", errorHandler(EasySyncController_1.EasySyncController.deleteModel, EasySyncController_1.EasySyncController));
//# sourceMappingURL=serverRoutes.js.map