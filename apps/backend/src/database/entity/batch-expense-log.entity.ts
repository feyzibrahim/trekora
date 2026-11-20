import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BatchExpense } from './batch-expense.entity';
import { User } from './user.entity';

@Entity('batch_expense_logs')
export class BatchExpenseLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'expense_id' })
  expenseId: string;

  @ManyToOne(() => BatchExpense, (expense) => expense.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'expense_id' })
  expense: BatchExpense;

  @Column({ type: 'uuid', name: 'changed_by_id' })
  changedById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by_id' })
  changedBy: User;

  @Column()
  action: string; // 'created' | 'updated' | 'approved' | 'rejected' | 'marked_sent' | 'proof_uploaded' | 'cancelled'

  @Column({ type: 'jsonb', nullable: true, name: 'previous_data' })
  previousData?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'new_data' })
  newData?: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
