import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ExpenseCategory,
  ExpensePaymentMode,
  ExpensePaymentType,
} from 'src/database/entity/batch-expense.entity';

export class CreateExpenseDto {
  @IsUUID()
  @IsNotEmpty()
  batchId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsEnum(ExpensePaymentType)
  paymentType: ExpensePaymentType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendorName?: string;

  @IsOptional()
  @IsEnum(ExpensePaymentMode)
  paymentMode?: ExpensePaymentMode;

  @IsString()
  @IsNotEmpty()
  transferAccount: string;

  @IsDateString()
  @IsNotEmpty()
  transferDate: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  billAttachments?: string[];
}
