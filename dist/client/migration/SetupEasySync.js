"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const cordova_sites_database_1 = require("cordova-sites-database/dist/cordova-sites-database");
class SetupEasySync1000000000500 {
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.dropTable("last_sync_dates", true);
            yield this._addLastSyncDates(queryRunner);
        });
    }
    _addLastSyncDates(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            let lastSyncDatesTable = new typeorm_1.Table({
                name: "last_sync_dates",
                columns: [
                    {
                        name: "id",
                        type: "Integer",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "model",
                        type: cordova_sites_database_1.BaseDatabase.TYPES.STRING,
                        isNullable: true
                    },
                    {
                        name: "lastSynced",
                        type: cordova_sites_database_1.BaseDatabase.TYPES.DATE,
                        isNullable: true
                    },
                    {
                        name: "where",
                        type: cordova_sites_database_1.BaseDatabase.TYPES.TEXT,
                    }
                ]
            });
            return yield queryRunner.createTable(lastSyncDatesTable, true);
        });
    }
    down(queryRunner) {
        return undefined;
    }
}
exports.SetupEasySync1000000000500 = SetupEasySync1000000000500;
//# sourceMappingURL=SetupEasySync.js.map