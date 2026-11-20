import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchExpenseLog } from 'src/database/entity/batch-expense-log.entity';
import { BatchExpense } from 'src/database/entity/batch-expense.entity';
import { Batch } from 'src/database/entity/batch.entity';
import { Employee } from 'src/database/entity/employee.entity';
import { AuthModule } from '../auth/auth.module';
import { PermissionModule } from '../permission/permission.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BatchExpense, BatchExpenseLog, Batch, Employee]),
    JwtModule.register({}),
    AuthModule,
    PermissionModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
