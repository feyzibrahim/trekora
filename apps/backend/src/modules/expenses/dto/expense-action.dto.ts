import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ApproveExpenseDto {
  @IsOptional()
  @IsString()
  financeRemarks?: string;

  @IsOptional()
  @IsBoolean()
  markAsSent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionReference?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paymentProofs?: string[];
}

export class RejectExpenseDto {
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  financeRemarks: string;
}

export class MarkSentExpenseDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionReference?: string;

  @IsOptional()
  @IsString()
  financeRemarks?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paymentProofs?: string[];

  @IsOptional()
  @IsDateString()
  sentAt?: string;
}

export class AddProofsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  paymentProofs: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class CancelExpenseDto {
  @IsOptional()
  @IsString()
  note?: string;
}
