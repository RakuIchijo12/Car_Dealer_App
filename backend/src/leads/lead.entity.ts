import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Car } from '../cars/car.entity';

export enum LeadType {
  INQUIRY = 'inquiry',
  TEST_DRIVE = 'test_drive',
  TRADE_IN = 'trade_in',
  FINANCING = 'financing',
  CONTACT = 'contact',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  NEGOTIATING = 'negotiating',
  WON = 'won',
  LOST = 'lost',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  phone: string;

  @Column({ type: 'enum', enum: LeadType, default: LeadType.INQUIRY })
  type: LeadType;

  @Index()
  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Column({ type: 'text', nullable: true })
  message: string;

  /** Vehicle the customer is asking about (null for general contact). */
  @ManyToOne(() => Car, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'carId' })
  car: Car;

  @Column({ nullable: true })
  carId: number;

  /** Preferred date for a test drive. */
  @Column({ type: 'date', nullable: true })
  preferredDate: string;

  /** Free-text description of a trade-in vehicle. */
  @Column({ nullable: true })
  tradeInVehicle: string;

  /** Budget / financing details supplied by the customer. */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  budget: number;

  /** Internal notes added by staff. */
  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
