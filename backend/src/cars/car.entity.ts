import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Make } from '../makes/make.entity';

export enum CarStatus {
  AVAILABLE = 'available',
  SOLD = 'sold',
  RESERVED = 'reserved',
}

export enum BodyType {
  SEDAN = 'sedan',
  SUV = 'suv',
  MPV = 'mpv',
  PICKUP = 'pickup',
  HATCHBACK = 'hatchback',
  VAN = 'van',
  CROSSOVER = 'crossover',
}

export enum Transmission {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  CVT = 'cvt',
}

export enum FuelType {
  GASOLINE = 'gasoline',
  DIESEL = 'diesel',
  HYBRID = 'hybrid',
  ELECTRIC = 'electric',
}

@Entity('cars')
export class Car {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Make, (make) => make.cars, { eager: true, nullable: true })
  @JoinColumn({ name: 'makeId' })
  make: Make;

  @Column({ nullable: true })
  makeId: number;

  @Column()
  model: string;

  @Column()
  year: number;

  @Column({ nullable: true })
  color: string;

  @Column({ type: 'int', default: 0 })
  mileage: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  /** Optional strike-through "was" price, drives the SALE badge. */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  originalPrice: number;

  @Index()
  @Column({ type: 'enum', enum: CarStatus, default: CarStatus.AVAILABLE })
  status: CarStatus;

  @Column({ type: 'enum', enum: BodyType, nullable: true })
  bodyType: BodyType;

  @Column({ type: 'enum', enum: Transmission, nullable: true })
  transmission: Transmission;

  @Column({ type: 'enum', enum: FuelType, nullable: true })
  fuelType: FuelType;

  @Column({ type: 'int', nullable: true })
  seats: number;

  @Column({ nullable: true })
  engine: string;

  @Column({ nullable: true })
  driveTrain: string;

  /** PH-specific: last digit of the plate (number-coding scheme). */
  @Column({ type: 'int', nullable: true })
  plateEnding: number;

  @Column({ nullable: true })
  vin: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  /** Primary/cover photo filename. */
  @Column({ nullable: true })
  photo: string;

  /** Additional gallery photo filenames. */
  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @Column({ type: 'simple-array', nullable: true })
  features: string[];

  @Index()
  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ type: 'int', default: 0 })
  views: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
