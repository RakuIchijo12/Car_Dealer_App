"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMakeDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_make_dto_1 = require("./create-make.dto");
class UpdateMakeDto extends (0, mapped_types_1.PartialType)(create_make_dto_1.CreateMakeDto) {
}
exports.UpdateMakeDto = UpdateMakeDto;
//# sourceMappingURL=update-make.dto.js.map