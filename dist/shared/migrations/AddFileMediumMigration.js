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
exports.AddFileMediumMigration1000000011000 = void 0;
const js_helper_1 = require("js-helper");
const FileMedium_1 = require("../FileMedium");
class AddFileMediumMigration1000000011000 {
    down() {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.resolve(undefined);
        });
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            const table = js_helper_1.MigrationHelper.createTableFromModelClass(FileMedium_1.FileMedium);
            table.columns.forEach((column) => {
                if (column.name === 'src') {
                    column.type = js_helper_1.MigrationHelper.isServer() ? 'MEDIUMTEXT' : 'TEXT';
                }
            });
            yield queryRunner.createTable(table);
        });
    }
}
exports.AddFileMediumMigration1000000011000 = AddFileMediumMigration1000000011000;
//# sourceMappingURL=AddFileMediumMigration.js.map