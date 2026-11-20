import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BatchExpenseLog } from 'src/database/entity/batch-expense-log.entity';
import {
  BatchExpense,
  ExpensePaymentMode,
  ExpenseStatus,
} from 'src/database/entity/batch-expense.entity';
import { Batch } from 'src/database/entity/batch.entity';
import { Employee } from 'src/database/entity/employee.entity';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateExpenseDto } from './dto/create-expense.dto';
import {
  AddProofsDto,
  ApproveExpenseDto,
  MarkSentExpenseDto,
  RejectExpenseDto,
} from './dto/expense-action.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

export interface ExpenseSummary {
  totalAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  sentAmount: number;
  rejectedAmount: number;
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  sentCount: number;
  rejectedCount: number;
  dueTodayCount: number;
  overdueCount: number;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(BatchExpense)
    private readonly expenseRepo: Repository<BatchExpense>,
    @InjectRepository(BatchExpenseLog)
    private readonly logRepo: Repository<BatchExpenseLog>,
    @InjectRepository(Batch)
    private readonly batchRepo: Repository<Batch>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly dataSource: DataSource,
  ) {}

  private getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeDateOnly(dateInput: string | Date): string {
    if (typeof dateInput === 'string') {
      return dateInput.slice(0, 10);
    }
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async generateExpenseNumber(organizationId: string): Promise<string> {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `EXP-${ym}-`;

    const latest = await this.expenseRepo
      .createQueryBuilder('expense')
      .where('expense.organizationId = :organizationId', { organizationId })
      .andWhere('expense.expenseNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('expense.expenseNumber', 'DESC')
      .getOne();

    let nextSeq = 1;
    if (latest?.expenseNumber) {
      const parts = latest.expenseNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  private async isBatchCoordinator(
    batchId: string,
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const employee = await this.employeeRepo.findOne({
      where: { userId, organizationId },
      select: ['id'],
    });
    if (!employee) return false;

    const count = await this.batchRepo
      .createQueryBuilder('batch')
      .innerJoin('batch.coordinators', 'coord', 'coord.id = :employeeId', {
        employeeId: employee.id,
      })
      .where('batch.id = :batchId', { batchId })
      .andWhere('batch.organizationId = :organizationId', { organizationId })
      .getCount();

    return count > 0;
  }

  private async getCoordinatorBatchIds(
    userId: string,
    organizationId: string,
  ): Promise<string[]> {
    const employee = await this.employeeRepo.findOne({
      where: { userId, organizationId },
      select: ['id'],
    });
    if (!employee) return [];

    const batches = await this.batchRepo
      .createQueryBuilder('batch')
      .innerJoin('batch.coordinators', 'coord', 'coord.id = :employeeId', {
        employeeId: employee.id,
      })
      .where('batch.organizationId = :organizationId', { organizationId })
      .select(['batch.id'])
      .getMany();

    return batches.map((b) => b.id);
  }

  private async createLog(
    expenseId: string,
    changedById: string,
    action: string,
    previousData?: Record<string, any> | null,
    newData?: Record<string, any> | null,
    note?: string | null,
  ): Promise<BatchExpenseLog> {
    const log = this.logRepo.create({
      expenseId,
      changedById,
      action,
      previousData: previousData ?? null,
      newData: newData ?? null,
      note: note ?? null,
    });
    return this.logRepo.save(log);
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateExpenseDto,
    hasCreatePermission: boolean,
  ): Promise<BatchExpense> {
    const batch = await this.batchRepo.findOne({
      where: { id: dto.batchId, organizationId },
      relations: ['package'],
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (!hasCreatePermission) {
      const isCoord = await this.isBatchCoordinator(
        dto.batchId,
        userId,
        organizationId,
      );
      if (!isCoord) {
        throw new ForbiddenException(
          'Only batch coordinators or authorized users can request expenses for this batch',
        );
      }
    }

    const transferDateStr = this.normalizeDateOnly(dto.transferDate);
    const todayStr = this.getTodayDateString();
    if (transferDateStr < todayStr) {
      throw new BadRequestException(
        'Transfer date must be today or a future date',
      );
    }

    const expenseNumber = await this.generateExpenseNumber(organizationId);

    const saved = await this.dataSource.transaction(async (manager) => {
      const expense = manager.create(BatchExpense, {
        expenseNumber,
        organizationId,
        batchId: dto.batchId,
        title: dto.title.trim(),
        category: dto.category,
        paymentType: dto.paymentType,
        amount: Number(dto.amount),
        vendorName: dto.vendorName?.trim() || null,
        paymentMode: dto.paymentMode || ExpensePaymentMode.BANK_TRANSFER,
        transferAccount: dto.transferAccount.trim(),
        transferDate: transferDateStr,
        remarks: dto.remarks?.trim() || null,
        billAttachments: dto.billAttachments || [],
        status: ExpenseStatus.PENDING,
        requestedById: userId,
        paymentProofs: [],
      });

      const created = await manager.save(BatchExpense, expense);

      const log = manager.create(BatchExpenseLog, {
        expenseId: created.id,
        changedById: userId,
        action: 'created',
        previousData: null,
        newData: {
          status: created.status,
          amount: created.amount,
          category: created.category,
          paymentType: created.paymentType,
          transferDate: created.transferDate,
          transferAccount: created.transferAccount,
        },
        note: created.remarks || null,
      });
      await manager.save(BatchExpenseLog, log);

      return created;
    });

    return this.findOne(saved.id, organizationId, userId, true);
  }

  private applyFilters(
    qb: SelectQueryBuilder<BatchExpense>,
    organizationId: string,
    filters: ExpenseFilterDto,
    scopedUserId?: string,
    coordinatorBatchIds?: string[],
  ) {
    qb.where('expense.organizationId = :organizationId', { organizationId });

    if (scopedUserId) {
      if (coordinatorBatchIds && coordinatorBatchIds.length > 0) {
        qb.andWhere(
          '(expense.requestedById = :scopedUserId OR expense.batchId IN (:...coordinatorBatchIds))',
          { scopedUserId, coordinatorBatchIds },
        );
      } else {
        qb.andWhere('expense.requestedById = :scopedUserId', { scopedUserId });
      }
    }

    if (filters.status) {
      qb.andWhere('expense.status = :status', { status: filters.status });
    }

    if (filters.category) {
      qb.andWhere('expense.category = :category', {
        category: filters.category,
      });
    }

    if (filters.paymentType) {
      qb.andWhere('expense.paymentType = :paymentType', {
        paymentType: filters.paymentType,
      });
    }

    if (filters.batchId) {
      qb.andWhere('expense.batchId = :batchId', { batchId: filters.batchId });
    }

    if (filters.packageId) {
      qb.andWhere('batch.packageId = :packageId', {
        packageId: filters.packageId,
      });
    }

    if (filters.requestedById) {
      qb.andWhere('expense.requestedById = :requestedById', {
        requestedById: filters.requestedById,
      });
    }

    const dateCol =
      filters.dateField === 'createdAt'
        ? 'expense.createdAt'
        : 'expense.transferDate';

    if (filters.dateFrom) {
      qb.andWhere(`${dateCol} >= :dateFrom`, { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      const dateToValue =
        filters.dateField === 'createdAt'
          ? `${filters.dateTo.slice(0, 10)} 23:59:59`
          : filters.dateTo.slice(0, 10);
      qb.andWhere(`${dateCol} <= :dateTo`, { dateTo: dateToValue });
    }

    if (filters.search && filters.search.trim()) {
      const search = `%${filters.search.trim()}%`;
      qb.andWhere(
        '(expense.expenseNumber ILIKE :search OR expense.title ILIKE :search OR expense.vendorName ILIKE :search OR expense.transferAccount ILIKE :search OR expense.remarks ILIKE :search OR pkg.name ILIKE :search)',
        { search },
      );
    }
  }

  private computeSummary(rows: BatchExpense[]): ExpenseSummary {
    const todayStr = this.getTodayDateString();
    const summary: ExpenseSummary = {
      totalAmount: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      sentAmount: 0,
      rejectedAmount: 0,
      totalCount: rows.length,
      pendingCount: 0,
      approvedCount: 0,
      sentCount: 0,
      rejectedCount: 0,
      dueTodayCount: 0,
      overdueCount: 0,
    };

    for (const row of rows) {
      const amt = Number(row.amount) || 0;
      const tDate = this.normalizeDateOnly(row.transferDate);

      if (
        row.status !== ExpenseStatus.REJECTED &&
        row.status !== ExpenseStatus.CANCELLED
      ) {
        summary.totalAmount += amt;
      }

      switch (row.status) {
        case ExpenseStatus.PENDING:
          summary.pendingAmount += amt;
          summary.pendingCount += 1;
          break;
        case ExpenseStatus.APPROVED:
          summary.approvedAmount += amt;
          summary.approvedCount += 1;
          break;
        case ExpenseStatus.SENT:
          summary.sentAmount += amt;
          summary.sentCount += 1;
          break;
        case ExpenseStatus.REJECTED:
          summary.rejectedAmount += amt;
          summary.rejectedCount += 1;
          break;
      }

      if (
        row.status === ExpenseStatus.PENDING ||
        row.status === ExpenseStatus.APPROVED
      ) {
        if (tDate === todayStr) {
          summary.dueTodayCount += 1;
        } else if (tDate < todayStr) {
          summary.overdueCount += 1;
        }
      }
    }

    return summary;
  }

  async findAll(
    organizationId: string,
    userId: string,
    canReadAll: boolean,
    filters: ExpenseFilterDto,
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;

    let scopedUserId: string | undefined;
    let coordinatorBatchIds: string[] | undefined;

    if (!canReadAll || filters.mineOnly) {
      scopedUserId = userId;
      if (!filters.mineOnly) {
        coordinatorBatchIds = await this.getCoordinatorBatchIds(
          userId,
          organizationId,
        );
      }
    }

    const qb = this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.batch', 'batch')
      .leftJoinAndSelect('batch.package', 'pkg')
      .leftJoinAndSelect('expense.requestedBy', 'requestedBy')
      .leftJoinAndSelect('expense.approvedBy', 'approvedBy')
      .leftJoinAndSelect('expense.sentBy', 'sentBy');

    this.applyFilters(
      qb,
      organizationId,
      filters,
      scopedUserId,
      coordinatorBatchIds,
    );

    const summaryQb = this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoin('expense.batch', 'batch')
      .leftJoin('batch.package', 'pkg')
      .select([
        'expense.id',
        'expense.amount',
        'expense.status',
        'expense.transferDate',
      ]);

    this.applyFilters(
      summaryQb,
      organizationId,
      filters,
      scopedUserId,
      coordinatorBatchIds,
    );

    const [allForSummary, [data, total]] = await Promise.all([
      summaryQb.getMany(),
      qb
        .orderBy('expense.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      summary: this.computeSummary(allForSummary),
    };
  }

  async findByBatch(
    batchId: string,
    organizationId: string,
    userId: string,
    canReadAll: boolean,
  ) {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId, organizationId },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const qb = this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.requestedBy', 'requestedBy')
      .leftJoinAndSelect('expense.approvedBy', 'approvedBy')
      .leftJoinAndSelect('expense.sentBy', 'sentBy')
      .where('expense.organizationId = :organizationId', { organizationId })
      .andWhere('expense.batchId = :batchId', { batchId })
      .orderBy('expense.transferDate', 'ASC')
      .addOrderBy('expense.createdAt', 'DESC');

    if (!canReadAll) {
      const isCoord = await this.isBatchCoordinator(
        batchId,
        userId,
        organizationId,
      );
      if (!isCoord) {
        qb.andWhere('expense.requestedById = :userId', { userId });
      }
    }

    const expenses = await qb.getMany();
    const summary = this.computeSummary(expenses);

    const categoryBreakdown: Record<string, number> = {};
    for (const exp of expenses) {
      if (
        exp.status !== ExpenseStatus.REJECTED &&
        exp.status !== ExpenseStatus.CANCELLED
      ) {
        categoryBreakdown[exp.category] =
          (categoryBreakdown[exp.category] || 0) + (Number(exp.amount) || 0);
      }
    }

    return {
      data: expenses,
      total: expenses.length,
      summary,
      categoryBreakdown,
    };
  }

  async findOne(
    id: string,
    organizationId: string,
    userId: string,
    canReadAll: boolean,
  ): Promise<BatchExpense> {
    const expense = await this.expenseRepo.findOne({
      where: { id, organizationId },
      relations: [
        'batch',
        'batch.package',
        'batch.coordinators',
        'requestedBy',
        'approvedBy',
        'sentBy',
      ],
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (!canReadAll && expense.requestedById !== userId) {
      const isCoord = await this.isBatchCoordinator(
        expense.batchId,
        userId,
        organizationId,
      );
      if (!isCoord) {
        throw new ForbiddenException('You do not have access to this expense');
      }
    }

    return expense;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateExpenseDto,
    canUpdateAll: boolean,
  ): Promise<BatchExpense> {
    const expense = await this.expenseRepo.findOne({
      where: { id, organizationId },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (!canUpdateAll && expense.requestedById !== userId) {
      throw new ForbiddenException('You can only edit your own expense requests');
    }

    if (expense.status !== ExpenseStatus.PENDING && !canUpdateAll) {
      throw new BadRequestException(
        'Only pending expense requests can be edited',
      );
    }

    if (
      expense.status === ExpenseStatus.SENT ||
      expense.status === ExpenseStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot edit an expense that is already ${expense.status}`,
      );
    }

    if (dto.batchId && dto.batchId !== expense.batchId) {
      const batch = await this.batchRepo.findOne({
        where: { id: dto.batchId, organizationId },
      });
      if (!batch) {
        throw new NotFoundException('Target batch not found');
      }
    }

    const previousData: Record<string, any> = {};
    const newData: Record<string, any> = {};
    const trackFields: Array<keyof UpdateExpenseDto> = [
      'batchId',
      'title',
      'category',
      'paymentType',
      'amount',
      'vendorName',
      'paymentMode',
      'transferAccount',
      'transferDate',
      'remarks',
      'billAttachments',
    ];

    for (const field of trackFields) {
      if (dto[field] !== undefined) {
        const prevVal = (expense as any)[field];
        const nextVal =
          field === 'transferDate'
            ? this.normalizeDateOnly(dto[field] as string)
            : field === 'amount'
              ? Number(dto[field])
              : dto[field];

        if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
          previousData[field] = prevVal;
          newData[field] = nextVal;
          (expense as any)[field] = nextVal;
        }
      }
    }

    await this.expenseRepo.save(expense);

    if (Object.keys(newData).length > 0) {
      await this.createLog(
        expense.id,
        userId,
        'updated',
        previousData,
        newData,
      );
    }

    return this.findOne(expense.id, organizationId, userId, true);
  }

  async approve(
    id: string,
    organizationId: string,
    userId: string,
    dto: ApproveExpenseDto,
    canMarkSent: boolean,
  ): Promise<BatchExpense> {
    const expense = await this.expenseRepo.findOne({
      where: { id, organizationId },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status !== ExpenseStatus.PENDING) {
      throw new BadRequestException(
        `Only pending expenses can be approved (current status: ${expense.status})`,
      );
    }

    const previousStatus = expense.status;
    const now = new Date();

    expense.approvedById = userId;
    expense.approvedAt = now;
    if (dto.financeRemarks !== undefined) {
      expense.financeRemarks = dto.financeRemarks.trim() || null;
    }

    if (dto.markAsSent) {
      if (!canMarkSent) {
        throw new ForbiddenException(
          'You do not have permission to mark expenses as sent',
        );
      }
      expense.status = ExpenseStatus.SENT;
      expense.sentById = userId;
      expense.sentAt = now;
      if (dto.transactionReference) {
        expense.transactionReference = dto.transactionReference.trim();
      }
      if (dto.paymentProofs && dto.paymentProofs.length > 0) {
        expense.paymentProofs = [
          ...(expense.paymentProofs || []),
          ...dto.paymentProofs,
        ];
      }
    } else {
      expense.status = ExpenseStatus.APPROVED;
    }

    await this.expenseRepo.save(expense);

    await this.createLog(
      expense.id,
      userId,
      dto.markAsSent ? 'marked_sent' : 'approved',
      { status: previousStatus },
      {
        status: expense.status,
        transactionReference: expense.transactionReference || undefined,
        proofCount: dto.paymentProofs?.length || 0,
      },
      dto.financeRemarks?.trim() || null,
    );

    return this.findOne(expense.id, organizationId, userId, true);
  }

  async reject(
    id: string,
    organizationId: string,
    userId: string,
    dto: RejectExpenseDto,
  ): Promise<BatchExpense> {
    const expense = await this.expenseRepo.findOne({
      where: { id, organizationId },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (
      expense.status !== ExpenseStatus.PENDING &&
      expense.status !== ExpenseStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Cannot reject an expense with status "${expense.status}"`,
      );
    }

    const previousStatus = expense.status;
    expense.status = ExpenseStatus.REJECTED;
    expense.approvedById = userId;
    expense.approvedAt = new Date();
    expense.financeRemarks = dto.financeRemarks.trim();

    await this.expenseRepo.save(expense);

    await this.createLog(
      expense.id,
      userId,
      'rejected',
      { status: previousStatus },
      { status: ExpenseStatus.REJECTED },
      expense.financeRemarks,
    );

    return this.findOne(expense.id, organizationId, userId, true);
  }

  async markAsSent(
    id: string,
    organizationId: string,
    userId: string,
    dto: MarkSentExpenseDto,
    canApprove: boolean,
  ): Promise<BatchExpense> {
    const expense = await this.expenseRepo.findOne({
      where: { id, organizationId },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status === ExpenseStatus.PENDING) {
      if (!canApprove) {
        throw new BadRequestException(
          'This expense must be approved before it can be marked as sent',
        );
      }
      expense.approvedById = userId;
      expense.approvedAt = new Date();
    } else if (expense.status !== ExpenseStatus.APPROVED) {
      throw new BadRequestException(
        `Only approved expenses can be marked as sent (current status: ${expense.status})`,
      );
    }

    const previousStatus = expense.status;
    expense.status = ExpenseStatus.SENT;
    expense.sentById = userId;
    expense.sentAt = dto.sentAt ? new Date(dto.sentAt) : new Date();

    if (dto.transactionReference !== undefined) {
      expense.transactionReference = dto.transactionReference.trim() || null;
    }
    if (dto.financeRemarks !== undefined) {
      expense.financeRemarks = dto.financeRemarks.trim() || null;
    }
    if (dto.paymentProofs && dto.paymentProofs.length > 0) {
      expense.paymentProofs = [
        ...(expense.paymentProofs || []),
        ...dto.paymentProofs,
      ];
    }

    await this.expenseRepo.save(expense);

    await this.createLog(
      expense.id,
      userId,
      'marked_sent',
      { status: previousStatus },
      {
        status: ExpenseStatus.SENT,
        transactionReference: expense.transactionReference || undefined,
        proofCount: dto.paymentProofs?.length || 0,
      },
      dto.financeRemarks?.trim() || null,
    );

    return this.findOne(expense.id, organizationId, userId, true);
  }

  async addProofs(
    id: string,
    organizationId: string,
    userId: string,
    dto: AddProofsDto,
  ): Promise<BatchExpense> {
    const expense = await this.expenseRepo.findOne({
      where: { id, organizationId },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    const existing = expense.paymentProofs || [];
    expense.paymentProofs = [...existing, ...dto.paymentProofs];
    await this.expenseRepo.save(expense);

    await this.createLog(
      expense.id,
      userId,
      'proof_uploaded',
      { proofCount: existing.length },
      {
        proofCount: expense.paymentProofs.length,
        addedCount: dto.paymentProofs.length,
      },
      dto.note?.trim() || null,
    );

    return this.findOne(expense.id, organizationId, userId, true);
  }

  async cancel(
    id: string,
    organizationId: string,
    userId: string,
    canManageAll: boolean,
    note?: string,
  ): Promise<BatchExpense> {
    const expense = await this.expenseRepo.findOne({
      where: { id, organizationId },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (!canManageAll && expense.requestedById !== userId) {
      throw new ForbiddenException(
        'You can only cancel your own pending expense requests',
      );
    }

    if (
      expense.status !== ExpenseStatus.PENDING &&
      !(expense.status === ExpenseStatus.APPROVED && canManageAll)
    ) {
      throw new BadRequestException(
        `Cannot cancel an expense with status "${expense.status}"`,
      );
    }

    const previousStatus = expense.status;
    expense.status = ExpenseStatus.CANCELLED;
    await this.expenseRepo.save(expense);

    await this.createLog(
      expense.id,
      userId,
      'cancelled',
      { status: previousStatus },
      { status: ExpenseStatus.CANCELLED },
      note?.trim() || null,
    );

    return this.findOne(expense.id, organizationId, userId, true);
  }

  async remove(id: string, organizationId: string): Promise<{ deleted: true }> {
    const expense = await this.expenseRepo.findOne({
      where: { id, organizationId },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    await this.expenseRepo.remove(expense);
    return { deleted: true };
  }

  async getLogs(
    id: string,
    organizationId: string,
    userId: string,
    canReadAll: boolean,
    page = 1,
    limit = 20,
  ) {
    // Verify access to expense first
    await this.findOne(id, organizationId, userId, canReadAll);

    const [data, total] = await this.logRepo.findAndCount({
      where: { expenseId: id },
      relations: ['changedBy'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }
}
