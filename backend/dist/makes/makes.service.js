"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const make_entity_1 = require("./make.entity");
let MakesService = class MakesService {
    makeRepo;
    constructor(makeRepo) {
        this.makeRepo = makeRepo;
    }
    findAll() {
        return this.makeRepo.find({ order: { name: 'ASC' } });
    }
    async findOne(id) {
        const make = await this.makeRepo.findOne({ where: { id } });
        if (!make)
            throw new common_1.NotFoundException('Make not found');
        return make;
    }
    async create(dto) {
        const existing = await this.makeRepo.findOne({ where: { name: dto.name } });
        if (existing)
            throw new common_1.ConflictException('Make already exists');
        const make = this.makeRepo.create(dto);
        return this.makeRepo.save(make);
    }
    async update(id, dto) {
        const make = await this.findOne(id);
        Object.assign(make, dto);
        return this.makeRepo.save(make);
    }
    async remove(id) {
        const make = await this.findOne(id);
        return this.makeRepo.remove(make);
    }
};
exports.MakesService = MakesService;
exports.MakesService = MakesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(make_entity_1.Make)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MakesService);
//# sourceMappingURL=makes.service.js.map