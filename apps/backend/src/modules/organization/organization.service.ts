import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import { Employee, EmployeeStatus } from 'src/database/entity/employee.entity';
import { OrganizationDeletionRequest } from 'src/database/entity/organization-deletion-request.entity';
import { Organization } from 'src/database/entity/organization.entity';
import { UserOrganization } from 'src/database/entity/user-organization.entity';
import { User } from 'src/database/entity/user.entity';
import { In, Repository } from 'typeorm';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { NotificationService } from '../notification/notification.service';
import { UploadService } from '../upload/upload.service';
import { seedDefaultTemplates } from './seed-templates.helper';

export interface OrganizationAdminInfo {
  userId: string;
  name: string;
  email: string;
}

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepository: Repository<UserOrganization>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OrganizationDeletionRequest)
    private readonly deletionRequestRepository: Repository<OrganizationDeletionRequest>,
    @Inject(forwardRef(() => ActivityLogService))
    private readonly activityLogService: ActivityLogService,
    private readonly uploadService: UploadService,
    private readonly notificationService: NotificationService,
  ) { }

  // Create a new organization
  async create(organizationData: Partial<Organization>): Promise<Organization> {
    const newUser = this.organizationRepository.create(organizationData);
    const org = await this.organizationRepository.save(newUser);

    try {
      // Find the first user in the database to associate as the creator
      const anyUser = await this.organizationRepository.manager.findOne(User, { where: {} });
      if (anyUser) {
        await seedDefaultTemplates(this.organizationRepository.manager, org.id, anyUser.id);
      }
    } catch (err) {
      console.error('Failed to seed default templates for new organization in OrganizationService:', err);
    }

    return org;
  }

  // Find all organizations
  async findAll(): Promise<Organization[]> {
    return await this.organizationRepository.find();
  }

  // Find a organization by ID
  async findOne(id: string): Promise<Organization | null> {
    return await this.organizationRepository.findOne({ where: { id } });
  }
  // Find a organization by ID
  async findOneByName(name: string): Promise<Organization | null> {
    return await this.organizationRepository.findOne({ where: { name } });
  }

  // Update a organization by ID
  async update(
    id: string,
    updateData: any,
    userId?: string,
    sealFile?: Express.Multer.File,
    salarySlipLogoFile?: Express.Multer.File,
    salarySlipSealFile?: Express.Multer.File,
  ): Promise<Organization | null> {
    const existingOrg = await this.findOne(id);
    const previousDays = existingOrg?.defaultBlockDays ?? 3;

    const payload: Partial<Organization> = { ...updateData };

    if (sealFile) {
      const sealUrl = await this.uploadService.uploadSingle(sealFile, 'organization-seals');
      payload.invoiceSeal = sealUrl;
    }

    if (salarySlipLogoFile) {
      const logoUrl = await this.uploadService.uploadSingle(salarySlipLogoFile, 'organization-logos');
      payload.salarySlipLogo = logoUrl;
    } else if (payload.salarySlipLogo === 'null' || payload.salarySlipLogo === '') {
      payload.salarySlipLogo = null;
    }

    if (salarySlipSealFile) {
      const slipSealUrl = await this.uploadService.uploadSingle(salarySlipSealFile, 'organization-seals');
      payload.salarySlipSeal = slipSealUrl;
    } else if (payload.salarySlipSeal === 'null' || payload.salarySlipSeal === '') {
      payload.salarySlipSeal = null;
    }

    if (payload.invoiceFields && typeof payload.invoiceFields === 'string') {
      try {
        payload.invoiceFields = JSON.parse(payload.invoiceFields);
      } catch (err) {
        console.error('Failed to parse invoiceFields JSON:', err);
      }
    }

    if (payload.salarySlipFields && typeof payload.salarySlipFields === 'string') {
      try {
        payload.salarySlipFields = JSON.parse(payload.salarySlipFields);
      } catch (err) {
        console.error('Failed to parse salarySlipFields JSON:', err);
      }
    }

    // Clean up temporary form file fields
    delete (payload as any).seal;

    await this.organizationRepository.update(id, payload);
    const updatedOrg = await this.findOne(id);

    if (
      userId &&
      updateData.defaultBlockDays !== undefined &&
      previousDays !== updateData.defaultBlockDays
    ) {
      try {
        await this.activityLogService.log(
          id,
          userId,
          'block_slots_default_updated',
          `Updated default block duration from ${previousDays} ${previousDays === 1 ? 'day' : 'days'} to ${updateData.defaultBlockDays} ${updateData.defaultBlockDays === 1 ? 'day' : 'days'}`,
          {
            previousValue: previousDays,
            newValue: updateData.defaultBlockDays,
          },
        );
      } catch (err) {
        console.error('Failed to log block slots default update:', err);
      }
    }

    return updatedOrg;
  }

  // Fetch block slot audit logs for an organization
  async getBlockSlotLogs(organizationId: string) {
    return await this.activityLogService.findByAction(
      organizationId,
      'block_slots_default_updated',
    );
  }

  // Delete a organization by ID
  async remove(id: string): Promise<void> {
    await this.organizationRepository.delete(id);
  }

  private signTokensForOrg(userId: string, organizationId: string) {
    const accessSecret =
      process.env.JWT_ACCESS_SECRET || 'your_access_token_secret';
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET || 'your_refresh_token_secret';
    const accessToken = jwt.sign({ userId, organizationId }, accessSecret, {
      expiresIn: (process.env.JWT_ACCESS_SECRET_EXPIRATION ?? '15m') as any,
    });
    const refreshToken = jwt.sign({ userId, organizationId }, refreshSecret, {
      expiresIn: (process.env.JWT_REFRESH_SECRET_EXPIRATION ?? '7d') as any,
    });
    return { accessToken, refreshToken };
  }

  private async resolveNextOrgTokens(
    userId: string,
    removedOrgId: string,
    currentOrganizationId: string,
  ): Promise<{
    switchedToOrganizationId: string | null;
    accessToken?: string;
    refreshToken?: string;
    noRemainingOrganizations: boolean;
  }> {
    if (removedOrgId !== currentOrganizationId) {
      return {
        switchedToOrganizationId: null,
        noRemainingOrganizations: false,
      };
    }

    const remainingUserOrgs = await this.userOrgRepository.find({
      where: { userId, isActive: true },
      relations: ['organization'],
      order: { createdAt: 'ASC' },
    });

    const nextOrg = remainingUserOrgs.find(
      (uo) =>
        uo.organizationId !== removedOrgId &&
        uo.organization &&
        uo.organization.isActive !== false,
    );

    if (nextOrg) {
      await this.userRepository.update(userId, {
        lastAccessedOrganizationId: nextOrg.organizationId,
      });
      const tokens = this.signTokensForOrg(userId, nextOrg.organizationId);
      return {
        switchedToOrganizationId: nextOrg.organizationId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        noRemainingOrganizations: false,
      };
    }

    await this.userRepository.update(userId, {
      lastAccessedOrganizationId: null as any,
    });
    return {
      switchedToOrganizationId: null,
      noRemainingOrganizations: true,
    };
  }

  async getOrganizationAdmins(
    organizationId: string,
  ): Promise<OrganizationAdminInfo[]> {
    const userOrgs = await this.userOrgRepository.find({
      where: { organizationId, isActive: true },
      relations: ['user'],
    });

    const activeUserIds = new Set(userOrgs.map((uo) => uo.userId));
    const adminMap = new Map<string, OrganizationAdminInfo>();

    // 1. Users whose UserOrganization.relation is owner or admin
    for (const uo of userOrgs) {
      const rel = (uo.relation || '').toLowerCase();
      if ((rel === 'owner' || rel === 'admin') && uo.user) {
        adminMap.set(uo.userId, {
          userId: uo.userId,
          name: uo.user.name || uo.user.email,
          email: uo.user.email,
        });
      }
    }

    // 2. Active employees in this org who hold an Admin permission set
    if (activeUserIds.size > 0) {
      const employees = await this.employeeRepository.find({
        where: {
          organizationId,
          userId: In(Array.from(activeUserIds)),
          isActive: true,
          isArchived: false,
        },
        relations: [
          'user',
          'profilePermissionSets',
          'profilePermissionSets.permissionSet',
        ],
      });

      for (const emp of employees) {
        if (!emp.userId || !emp.user) continue;
        // Skip legacy mismatched employee rows whose email doesn't match the user's email
        if (
          emp.email &&
          emp.user.email &&
          emp.email.toLowerCase() !== emp.user.email.toLowerCase()
        ) {
          continue;
        }
        const hasAdminSet = (emp.profilePermissionSets || []).some((pps) => {
          const psName = (pps.permissionSet?.name || '').toLowerCase();
          return (
            pps.permissionSet?.organizationId === organizationId &&
            (psName === 'admin - full access' || psName === 'admin')
          );
        });
        if (hasAdminSet && !adminMap.has(emp.userId)) {
          adminMap.set(emp.userId, {
            userId: emp.userId,
            name: emp.user.name || emp.name || emp.user.email,
            email: emp.user.email,
          });
        }
      }
    }

    return Array.from(adminMap.values());
  }

  async getManagedOrganizations(
    userId: string,
    currentOrganizationId: string,
  ) {
    const userOrgs = await this.userOrgRepository.find({
      where: { userId, isActive: true },
      relations: ['organization'],
      order: { createdAt: 'ASC' },
    });

    const activeUserOrgs = userOrgs.filter(
      (uo) => uo.organization && uo.organization.isActive !== false,
    );

    const orgIds = activeUserOrgs.map((uo) => uo.organizationId);
    const pendingRequests =
      orgIds.length > 0
        ? await this.deletionRequestRepository.find({
            where: {
              organizationId: In(orgIds),
              status: 'pending',
            },
            relations: ['requestedBy'],
            order: { createdAt: 'DESC' },
          })
        : [];

    const requestByOrg = new Map<string, OrganizationDeletionRequest>();
    for (const req of pendingRequests) {
      if (!requestByOrg.has(req.organizationId)) {
        requestByOrg.set(req.organizationId, req);
      }
    }

    const result = await Promise.all(
      activeUserOrgs.map(async (uo) => {
        const org = uo.organization;
        const admins = await this.getOrganizationAdmins(org.id);
        const isAdmin = admins.some((a) => a.userId === userId);
        const pendingReq = requestByOrg.get(org.id) || null;

        return {
          id: org.id,
          name: org.name || 'Unnamed Organization',
          domain: org.domain || null,
          industry: org.industry || null,
          size: org.size || null,
          createdAt: org.createdAt,
          relation: uo.relation || 'member',
          isCurrent: org.id === currentOrganizationId,
          isAdmin,
          adminCount: admins.length,
          admins,
          pendingDeletionRequest: pendingReq
            ? {
                id: pendingReq.id,
                requestedByUserId: pendingReq.requestedByUserId,
                requestedByName:
                  pendingReq.requestedBy?.name ||
                  pendingReq.requestedBy?.email ||
                  'Admin',
                requiredAdminUserIds: pendingReq.requiredAdminUserIds || [],
                approvedByUserIds: pendingReq.approvedByUserIds || [],
                hasCurrentUserApproved: (
                  pendingReq.approvedByUserIds || []
                ).includes(userId),
                status: pendingReq.status,
                createdAt: pendingReq.createdAt,
              }
            : null,
        };
      }),
    );

    return result;
  }

  private async executeOrganizationDeletion(organizationId: string) {
    // 1. Find all users who had this org as lastAccessedOrganizationId
    const affectedUsers = await this.userRepository.find({
      where: { lastAccessedOrganizationId: organizationId },
    });

    // 2. Remove all UserOrganization memberships for this org
    await this.userOrgRepository.delete({ organizationId });

    // 3. Re-point affected users to another active org (or null)
    for (const user of affectedUsers) {
      const another = await this.userOrgRepository.findOne({
        where: { userId: user.id, isActive: true },
        relations: ['organization'],
        order: { createdAt: 'ASC' },
      });
      const nextOrgId =
        another?.organization && another.organization.isActive !== false
          ? another.organizationId
          : null;
      await this.userRepository.update(user.id, {
        lastAccessedOrganizationId: nextOrgId as any,
      });
    }

    // 4. Mark organization inactive first so it's immediately inaccessible
    await this.organizationRepository.update(organizationId, {
      isActive: false,
    });

    // 5. Attempt hard delete; if legacy FK constraints without CASCADE exist, keep soft-deleted safely
    try {
      await this.organizationRepository.delete(organizationId);
    } catch (err) {
      console.warn(
        `Soft-deleted organization ${organizationId} (hard delete blocked by foreign key references):`,
        (err as Error)?.message,
      );
    }
  }

  async leaveOrganization(
    userId: string,
    organizationId: string,
    currentOrganizationId: string,
  ) {
    const membership = await this.userOrgRepository.findOne({
      where: { userId, organizationId, isActive: true },
      relations: ['organization'],
    });
    if (!membership || membership.organization?.isActive === false) {
      throw new NotFoundException('Organization membership not found');
    }

    const admins = await this.getOrganizationAdmins(organizationId);
    const isAdmin = admins.some((a) => a.userId === userId);
    if (isAdmin) {
      throw new BadRequestException(
        'Admins cannot leave an organization. Delete the organization or transfer admin rights first.',
      );
    }

    // Remove membership and deactivate linked employee in this org
    await this.userOrgRepository.delete({ userId, organizationId });
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      const empMatches = await this.employeeRepository.find({
        where: { userId, organizationId },
      });
      for (const emp of empMatches) {
        if (
          !emp.email ||
          !user.email ||
          emp.email.toLowerCase() === user.email.toLowerCase()
        ) {
          emp.isActive = false;
          emp.status = EmployeeStatus.INACTIVE;
          await this.employeeRepository.save(emp);
        }
      }
    }

    const switchResult = await this.resolveNextOrgTokens(
      userId,
      organizationId,
      currentOrganizationId,
    );

    return {
      left: true,
      organizationName: membership.organization?.name || 'Organization',
      ...switchResult,
    };
  }

  async requestDeleteOrganization(
    userId: string,
    organizationId: string,
    currentOrganizationId: string,
  ) {
    const org = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!org || org.isActive === false) {
      throw new NotFoundException('Organization not found');
    }

    const admins = await this.getOrganizationAdmins(organizationId);
    const requester = admins.find((a) => a.userId === userId);
    if (!requester) {
      throw new ForbiddenException(
        'Only an organization admin can delete this organization',
      );
    }

    // Single admin -> delete immediately
    if (admins.length <= 1) {
      await this.executeOrganizationDeletion(organizationId);
      const switchResult = await this.resolveNextOrgTokens(
        userId,
        organizationId,
        currentOrganizationId,
      );
      return {
        deleted: true,
        requiresApproval: false,
        organizationName: org.name || 'Organization',
        ...switchResult,
      };
    }

    // Multiple admins -> check for existing pending request
    const existingPending = await this.deletionRequestRepository.findOne({
      where: { organizationId, status: 'pending' },
    });
    if (existingPending) {
      throw new BadRequestException(
        'A deletion approval request is already pending for this organization',
      );
    }

    const requiredAdminUserIds = admins.map((a) => a.userId);
    const request = this.deletionRequestRepository.create({
      organizationId,
      requestedByUserId: userId,
      requiredAdminUserIds,
      approvedByUserIds: [userId],
      status: 'pending',
    });
    const saved = await this.deletionRequestRepository.save(request);

    // Notify all admins
    const orgName = org.name || 'Organization';
    await Promise.all(
      admins.map((admin) => {
        const msg =
          admin.userId === userId
            ? `You requested to delete organization "${orgName}". Waiting for all ${admins.length} admins to approve.`
            : `${requester.name} requested to delete organization "${orgName}". Open Manage Organizations to approve or reject.`;
        return this.notificationService
          .create(admin.userId, msg)
          .catch((err) =>
            console.error('Failed to send org deletion notification:', err),
          );
      }),
    );

    return {
      deleted: false,
      requiresApproval: true,
      organizationName: orgName,
      approvedCount: 1,
      requiredCount: requiredAdminUserIds.length,
      requestId: saved.id,
    };
  }

  async approveDeleteRequest(
    userId: string,
    organizationId: string,
    requestId: string,
    currentOrganizationId: string,
  ) {
    const request = await this.deletionRequestRepository.findOne({
      where: { id: requestId, organizationId },
      relations: ['organization'],
    });
    if (!request || request.status !== 'pending') {
      throw new NotFoundException('Pending deletion request not found');
    }

    const admins = await this.getOrganizationAdmins(organizationId);
    const currentAdmin = admins.find((a) => a.userId === userId);
    if (
      !currentAdmin &&
      !(request.requiredAdminUserIds || []).includes(userId)
    ) {
      throw new ForbiddenException(
        'Only an organization admin can approve this request',
      );
    }

    const approvedSet = new Set(request.approvedByUserIds || []);
    approvedSet.add(userId);
    request.approvedByUserIds = Array.from(approvedSet);

    const requiredIds = request.requiredAdminUserIds || [];
    const allApproved =
      requiredIds.length > 0 &&
      requiredIds.every((adminId) => approvedSet.has(adminId));

    const orgName = request.organization?.name || 'Organization';

    if (allApproved) {
      request.status = 'approved';
      await this.deletionRequestRepository.save(request);

      // Notify all admins that the organization has been deleted
      await Promise.all(
        requiredIds.map((adminId) =>
          this.notificationService
            .create(
              adminId,
              `Organization "${orgName}" has been deleted after all admins approved.`,
            )
            .catch((err) =>
              console.error('Failed to send org deleted notification:', err),
            ),
        ),
      );

      await this.executeOrganizationDeletion(organizationId);
      const switchResult = await this.resolveNextOrgTokens(
        userId,
        organizationId,
        currentOrganizationId,
      );

      return {
        deleted: true,
        organizationName: orgName,
        approvedCount: request.approvedByUserIds.length,
        requiredCount: requiredIds.length,
        ...switchResult,
      };
    }

    await this.deletionRequestRepository.save(request);

    // Notify other admins of approval progress
    const approverName = currentAdmin?.name || 'An admin';
    await Promise.all(
      requiredIds
        .filter((adminId) => adminId !== userId)
        .map((adminId) =>
          this.notificationService
            .create(
              adminId,
              `${approverName} approved deleting "${orgName}" (${request.approvedByUserIds.length}/${requiredIds.length} admins approved).`,
            )
            .catch((err) =>
              console.error('Failed to send approval progress notification:', err),
            ),
        ),
    );

    return {
      deleted: false,
      organizationName: orgName,
      approvedCount: request.approvedByUserIds.length,
      requiredCount: requiredIds.length,
    };
  }

  async rejectDeleteRequest(
    userId: string,
    organizationId: string,
    requestId: string,
  ) {
    const request = await this.deletionRequestRepository.findOne({
      where: { id: requestId, organizationId },
      relations: ['organization'],
    });
    if (!request || request.status !== 'pending') {
      throw new NotFoundException('Pending deletion request not found');
    }

    const admins = await this.getOrganizationAdmins(organizationId);
    const currentAdmin = admins.find((a) => a.userId === userId);
    if (
      !currentAdmin &&
      !(request.requiredAdminUserIds || []).includes(userId)
    ) {
      throw new ForbiddenException(
        'Only an organization admin can reject or cancel this request',
      );
    }

    const isRequester = request.requestedByUserId === userId;
    request.status = isRequester ? 'cancelled' : 'rejected';
    request.rejectedByUserId = userId;
    await this.deletionRequestRepository.save(request);

    const orgName = request.organization?.name || 'Organization';
    const actorName = currentAdmin?.name || 'An admin';
    const verb = isRequester ? 'cancelled' : 'rejected';

    await Promise.all(
      (request.requiredAdminUserIds || [])
        .filter((adminId) => adminId !== userId)
        .map((adminId) =>
          this.notificationService
            .create(
              adminId,
              `${actorName} ${verb} the deletion request for organization "${orgName}".`,
            )
            .catch((err) =>
              console.error('Failed to send rejection notification:', err),
            ),
        ),
    );

    return {
      status: request.status,
      organizationName: orgName,
    };
  }
}
