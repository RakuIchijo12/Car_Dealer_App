import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFiles, ParseIntPipe, BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { CarsService, CarFilters } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CarStatus } from './car.entity';

// Multer resolves its destination at module load, so this has to exist before
// the controller is constructed. A serverless filesystem is read-only apart
// from /tmp, and failing to create it must not take the whole API down with it
// — uploads just do not persist there. See the deployment notes in the README.
const UPLOAD_DEST =
  process.env.UPLOAD_DIR ?? (process.env.VERCEL ? '/tmp/uploads' : './uploads');
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

try {
  if (!existsSync(UPLOAD_DEST)) mkdirSync(UPLOAD_DEST, { recursive: true });
} catch {
  /* read-only filesystem — uploads are unavailable, the rest of the API is not */
}

const uploadOptions = {
  storage: diskStorage({
    destination: UPLOAD_DEST,
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `car-${unique}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE, files: 72 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new BadRequestException('Only JPG, PNG, WEBP or AVIF images are allowed'), false);
    }
    cb(null, true);
  },
};

/** `photo` is the cover image, `images` the extra gallery shots. */
const carPhotoFields = FileFieldsInterceptor(
  [
    { name: 'photo', maxCount: 1 },
    { name: 'images', maxCount: 8 },
  ],
  uploadOptions,
);

type CarUploads = { photo?: Express.Multer.File[]; images?: Express.Multer.File[] };

@UseGuards(JwtAuthGuard)
@Controller('cars')
export class CarsController {
  constructor(private carsService: CarsService) {}

  @Get()
  findAll(
    @Query('makeId') makeId?: string,
    @Query('status') status?: CarStatus,
    @Query('yearMin') yearMin?: string,
    @Query('yearMax') yearMax?: string,
    @Query('priceMin') priceMin?: string,
    @Query('priceMax') priceMax?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'year' | 'price' | 'mileage' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const filters: CarFilters = {
      makeId: makeId ? +makeId : undefined,
      status,
      yearMin: yearMin ? +yearMin : undefined,
      yearMax: yearMax ? +yearMax : undefined,
      priceMin: priceMin ? +priceMin : undefined,
      priceMax: priceMax ? +priceMax : undefined,
      search,
      sortBy,
      sortOrder,
    };
    return this.carsService.findAll(filters);
  }

  @Get('stats')
  getStats() {
    return this.carsService.getStats();
  }

  @Get('recent')
  getRecent(@Query('limit') limit?: string) {
    return this.carsService.getRecent(limit ? +limit : 5);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.findOne(id);
  }

  @Post()
  @UseInterceptors(carPhotoFields)
  create(@Body() dto: CreateCarDto, @UploadedFiles() files?: CarUploads) {
    return this.carsService.create(
      dto,
      files?.photo?.[0]?.filename,
      (files?.images ?? []).map((f) => f.filename),
    );
  }

  @Patch(':id')
  @UseInterceptors(carPhotoFields)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCarDto,
    @UploadedFiles() files?: CarUploads,
  ) {
    return this.carsService.update(
      id,
      dto,
      files?.photo?.[0]?.filename,
      (files?.images ?? []).map((f) => f.filename),
    );
  }

  @Patch(':id/sell')
  markAsSold(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.markAsSold(id);
  }

  @Patch(':id/status')
  setStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: CarStatus) {
    if (!Object.values(CarStatus).includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    return this.carsService.setStatus(id, status);
  }

  @Patch(':id/featured')
  toggleFeatured(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.toggleFeatured(id);
  }

  /**
   * Upload a 360 turntable. Send the frames in shot order as `frames`;
   * anything already stored for this vehicle is replaced.
   */
  @Post(':id/spin')
  @UseInterceptors(FilesInterceptor('frames', 72, uploadOptions))
  setSpin(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() frames?: Express.Multer.File[],
  ) {
    if (!frames?.length || frames.length < 8) {
      // Multer has already written these to disk, so a rejected request must
      // sweep them up or they accumulate as orphans.
      for (const f of frames ?? []) {
        try {
          unlinkSync(f.path);
        } catch {
          /* already gone */
        }
      }
      throw new BadRequestException('A turntable needs at least 8 frames (24–36 is ideal)');
    }
    return this.carsService.setSpin(id, frames);
  }

  @Delete(':id/spin')
  clearSpin(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.clearSpin(id);
  }

  @Delete(':id/images/:filename')
  removeImage(@Param('id', ParseIntPipe) id: number, @Param('filename') filename: string) {
    // Guard against traversal — only a bare filename may be deleted.
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      throw new BadRequestException('Invalid filename');
    }
    return this.carsService.removeImage(id, filename);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.remove(id);
  }
}
