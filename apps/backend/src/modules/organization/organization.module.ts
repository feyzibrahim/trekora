import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CancellationTierTemplate } from 'src/database/entity/cancellation-tier-template.entity';
import { Employee } from 'src/database/entity/employee.entity';
import { OrganizationDeletionRequest } from 'src/database/entity/organization-deletion-request.entity';
import { Organization } from 'src/database/entity/organization.entity';
import { PaymentStructureTemplate } from 'src/database/entity/payment-structure-template.entity';
import { UserOrganization } from 'src/database/entity/user-organization.entity';
import { User } from 'src/database/entity/user.entity';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { NotificationModule } from '../notification/notification.module';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      PaymentStructureTemplate,
      CancellationTierTemplate,
      UserOrganization,
      Employee,
      User,
      OrganizationDeletionRequest,
    ]),
    JwtModule.register({}),
    forwardRef(() => ActivityLogModule),
    NotificationModule,
  ],
  exports: [OrganizationService],
  controllers: [OrganizationController],
  providers: [OrganizationService],
})
export class OrganizationModule { }
