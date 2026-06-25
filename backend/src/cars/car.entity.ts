import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Make } from '../makes/make.entity';

export enum CarStatus {
  AVAILABLE = 'available',
  SOLD = 'sold',
  RESERVED = 'reserved',
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

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'enum', enum: CarStatus, default: CarStatus.AVAILABLE })
  status: CarStatus;

  @Column({ nullable: true })
  vin: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  photo: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
