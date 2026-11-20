import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Batch } from './batch.entity';
import { BatchExpenseLog } from './batch-expense-log.entity';
import { Organization } from './organization.entity';
import { User } from './user.entity';

export enum ExpenseCategory {
  TICKET_BOOKING = 'ticket_booking',
  HOTEL_BOOKING = 'hotel_booking',
  CAB_BOOKING = 'cab_booking',
  FOOD = 'food',
  ACTIVITY = 'activity',
  GUIDE_FEES = 'guide_fees',
  PERMITS = 'permits',
  EQUIPMENT = 'equipment',
  MISCELLANEOUS = 'miscellaneous',
}

export enum ExpensePaymentType {
  ADVANCE = 'advance',
  PARTIAL = 'partial',
  FULL = 'full',
  BALANCE = 'balance',
  REIMBURSEMENT = 'reimbursement',
}

export enum ExpensePaymentMode {
  BANK_TRANSFER = 'bank_transfer',
  UPI = 'upi',
  CASH = 'cash',
  CARD = 'card',
  OTHER = 'other',
}

export enum ExpenseStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SENT = 'sent',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('batch_expenses')
@Index(['organizationId', 'batchId'])
@Index(['organizationId', 'status'])
@Index(['organizationId', 'transferDate'])
export class BatchExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'expense_number' })
  expenseNumber: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'uuid', name: 'batch_id' })
  batchId: string;

  @ManyToOne(() => Batch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: ExpenseCategory,
    default: ExpenseCategory.MISCELLANEOUS,
  })
  category: ExpenseCategory;

  @Column({
    type: 'enum',
    enum: ExpensePaymentType,
    default: ExpensePaymentType.FULL,
    name: 'payment_type',
  })
  paymentType: ExpensePaymentType;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'vendor_name' })
  vendorName?: string | null;

  @Column({
    type: 'enum',
    enum: ExpensePaymentMode,
    default: ExpensePaymentMode.BANK_TRANSFER,
    name: 'payment_mode',
  })
  paymentMode: ExpensePaymentMode;

  @Column({ type: 'text', name: 'transfer_account' })
  transferAccount: string;

  @Column({ type: 'date', name: 'transfer_date' })
  transferDate: Date | string;

  @Column({ type: 'text', nullable: true })
  remarks?: string | null;

  @Column({
    type: 'jsonb',
    default: () => "'[]'",
    name: 'bill_attachments',
  })
  billAttachments: string[];

  @Column({
    type: 'enum',
    enum: ExpenseStatus,
    default: ExpenseStatus.PENDING,
  })
  status: ExpenseStatus;

  @Column({ type: 'uuid', name: 'requested_by_id' })
  requestedById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy: User;

  @Column({ type: 'uuid', nullable: true, name: 'approved_by_id' })
  approvedById?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy?: User | null;

  @Column({ type: 'timestamp', nullable: true, name: 'approved_at' })
  approvedAt?: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'sent_by_id' })
  sentById?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sent_by_id' })
  sentBy?: User | null;

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at' })
  sentAt?: Date | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'transaction_reference',
  })
  transactionReference?: string | null;

  @Column({ type: 'text', nullable: true, name: 'finance_remarks' })
  financeRemarks?: string | null;

  @Column({
    type: 'jsonb',
    default: () => "'[]'",
    name: 'payment_proofs',
  })
  paymentProofs: string[];

  @OneToMany(() => BatchExpenseLog, (log) => log.expense)
  logs: BatchExpenseLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
