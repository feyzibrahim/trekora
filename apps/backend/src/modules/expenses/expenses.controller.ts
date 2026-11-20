import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiRequestJWT } from 'src/dto/api-request-jwt.types';
import { RequirePermission } from '../auth/decorator/require-permission.decorator';
import { AuthGuard } from '../auth/guard/auth.guard';
import { PermissionGuard } from '../auth/guard/permission.guard';
import { PermissionCheckService } from '../permission/permission-check.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import {
  AddProofsDto,
  ApproveExpenseDto,
  CancelExpenseDto,
  MarkSentExpenseDto,
  RejectExpenseDto,
} from './dto/expense-action.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@UseGuards(AuthGuard, PermissionGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly permissionCheckService: PermissionCheckService,
  ) {}

  @Get()
  async findAll(
    @Request() req: ApiRequestJWT,
    @Query() filters: ExpenseFilterDto,
  ) {
    const canReadAll = await this.permissionCheckService.hasPermission(
      req.user.userId,
      req.user.organizationId,
      'expense',
      'read',
    );
    return this.expensesService.findAll(
      req.user.organizationId,
      req.user.userId,
      canReadAll,
      filters,
    );
  }

  @Get('batch/:batchId')
  async findByBatch(
    @Request() req: ApiRequestJWT,
    @Param('batchId') batchId: string,
  ) {
    const canReadAll = await this.permissionCheckService.hasPermission(
      req.user.userId,
      req.user.organizationId,
      'expense',
      'read',
    );
    return this.expensesService.findByBatch(
      batchId,
      req.user.organizationId,
      req.user.userId,
      canReadAll,
    );
  }

  @Get(':id')
  async findOne(@Request() req: ApiRequestJWT, @Param('id') id: string) {
    const canReadAll = await this.permissionCheckService.hasPermission(
      req.user.userId,
      req.user.organizationId,
      'expense',
      'read',
    );
    return this.expensesService.findOne(
      id,
      req.user.organizationId,
      req.user.userId,
      canReadAll,
    );
  }

  @Get(':id/logs')
  async getLogs(
    @Request() req: ApiRequestJWT,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const canReadAll = await this.permissionCheckService.hasPermission(
      req.user.userId,
      req.user.organizationId,
      'expense',
      'read',
    );
    return this.expensesService.getLogs(
      id,
      req.user.organizationId,
      req.user.userId,
      canReadAll,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post()
  async create(@Request() req: ApiRequestJWT, @Body() dto: CreateExpenseDto) {
    const hasCreatePermission = await this.permissionCheckService.hasPermission(
      req.user.userId,
      req.user.organizationId,
      'expense',
      'create',
    );
    return this.expensesService.create(
      req.user.organizationId,
      req.user.userId,
      dto,
      hasCreatePermission,
    );
  }

  @Patch(':id')
  async update(
    @Request() req: ApiRequestJWT,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    const canUpdateAll = await this.permissionCheckService.hasPermission(
      req.user.userId,
      req.user.organizationId,
      'expense',
      'update',
    );
    return this.expensesService.update(
      id,
      req.user.organizationId,
      req.user.userId,
      dto,
      canUpdateAll,
    );
  }

  @Post(':id/approve')
  @RequirePermission('expense', 'approve')
  async approve(
    @Request() req: ApiRequestJWT,
    @Param('id') id: string,
    @Body() dto: ApproveExpenseDto,
  ) {
    const canMarkSent = await this.permissionCheckService.hasPermission(
      req.user.userId,
      req.user.organizationId,
      'expense',
      'mark_sent',
    );
    return this.expensesService.approve(
      id,
      req.user.organizationId,
      req.user.userId,
      dto,
      canMarkSent,
    );
  }

  @Post(':id/reject')
  @RequirePermission('expense', 'approve')
  async reject(
    @Request() req: ApiRequestJWT,
    @Param('id') id: string,
    @Body() dto: RejectExpenseDto,
  ) {
    return this.expensesService.reject(
      id,
      req.user.organizationId,
      req.user.userId,
      dto,
    );
  }

  @Post(':id/mark-sent')
  @RequirePermission('expense', 'mark_sent')
  async markAsSent(
    @Request() req: ApiRequestJWT,
    @Param('id') id: string,
    @Body() dto: MarkSentExpenseDto,
  ) {
    const canApprove = await this.permissionCheckService.hasPermission(
      req.user.userId,
      req.user.organizationId,
      'expense',
      'approve',
    );
    return this.expensesService.markAsSent(
      id,
      req.user.organizationId,
      req.user.userId,
      dto,
      canApprove,
    );
  }

  @Post(':id/proofs')
  @RequirePermission('expense', 'mark_sent')
  async addProofs(
    @Request() req: ApiRequestJWT,
    @Param('id') id: string,
    @Body() dto: AddProofsDto,
  ) {
    return this.expensesService.addProofs(
      id,
      req.user.organizationId,
      req.user.userId,
      dto,
    );
  }

  @Post(':id/cancel')
  async cancel(
    @Request() req: ApiRequestJWT,
    @Param('id') id: string,
    @Body() dto: CancelExpenseDto,
  ) {
    const canManageAll = await this.permissionCheckService.hasPermission(
      req.user.userId,
      req.user.organizationId,
      'expense',
      'approve',
    );
    return this.expensesService.cancel(
      id,
      req.user.organizationId,
      req.user.userId,
      canManageAll,
      dto.note,
    );
  }

  @Delete(':id')
  @RequirePermission('expense', 'delete')
  async remove(@Request() req: ApiRequestJWT, @Param('id') id: string) {
    return this.expensesService.remove(id, req.user.organizationId);
  }
}
