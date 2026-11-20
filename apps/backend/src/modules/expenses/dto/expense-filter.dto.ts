import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  ExpenseCategory,
  ExpensePaymentType,
  ExpenseStatus,
} from 'src/database/entity/batch-expense.entity';

export class ExpenseFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsEnum(ExpensePaymentType)
  paymentType?: ExpensePaymentType;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsOptional()
  @IsUUID()
  packageId?: string;

  @IsOptional()
  @IsUUID()
  requestedById?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(['transferDate', 'createdAt'])
  dateField?: 'transferDate' | 'createdAt' = 'transferDate';

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  mineOnly?: boolean;
}
