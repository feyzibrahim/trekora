import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';

export type OrganizationDeletionRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

@Entity('organization_deletion_request')
export class OrganizationDeletionRequest {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'uuid', name: 'requested_by_user_id' })
  requestedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedBy: User;

  @Column({ type: 'jsonb', name: 'required_admin_user_ids', default: [] })
  requiredAdminUserIds: string[];

  @Column({ type: 'jsonb', name: 'approved_by_user_ids', default: [] })
  approvedByUserIds: string[];

  @Column({ type: 'uuid', nullable: true, name: 'rejected_by_user_id' })
  rejectedByUserId?: string | null;

  @Column({
    type: 'varchar',
    default: 'pending',
    name: 'status',
  })
  status: OrganizationDeletionRequestStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
