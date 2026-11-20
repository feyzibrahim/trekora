import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Organization } from 'src/database/entity/organization.entity';
import { ApiRequestJWT } from 'src/dto/api-request-jwt.types';
import { AuthGuard } from 'src/modules/auth/guard/auth.guard';
import { OrganizationService } from './organization.service';

@UseGuards(AuthGuard)
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // Create a new organization
  @Post()
  async create(
    @Body() organizationData: Partial<Organization>,
  ): Promise<Organization> {
    return await this.organizationService.create(organizationData);
  }

  // Get all organizations
  @Get()
  async findAll(): Promise<Organization[]> {
    return await this.organizationService.findAll();
  }

  // Get logged-in user's organizations with admin status & pending deletion requests
  @Get('my/managed')
  async getManagedOrganizations(@Request() req: ApiRequestJWT) {
    return await this.organizationService.getManagedOrganizations(
      req.user.userId,
      req.user.organizationId,
    );
  }

  // Leave an organization (for non-admin members)
  @Post(':id/leave')
  async leaveOrganization(
    @Request() req: ApiRequestJWT,
    @Param('id') id: string,
  ) {
    return await this.organizationService.leaveOrganization(
      req.user.userId,
      id,
      req.user.organizationId,
    );
  }

  // Delete an organization (immediate if single admin, creates approval request if multiple admins)
  @Post(':id/request-delete')
  async requestDeleteOrganization(
    @Request() req: ApiRequestJWT,
    @Param('id') id: string,
  ) {
    return await this.organizationService.requestDeleteOrganization(
      req.user.userId,
      id,
      req.user.organizationId,
    );
  }

  // Approve a pending organization deletion request
  @Post(':id/delete-requests/:requestId/approve')
  async approveDeleteRequest(
    @Request() req: ApiRequestJWT,
    @Param('id') id: string,
    @Param('requestId') requestId: string,
  ) {
    return await this.organizationService.approveDeleteRequest(
      req.user.userId,
      id,
      requestId,
      req.user.organizationId,
    );
  }

  // Reject or cancel a pending organization deletion request
  @Post(':id/delete-requests/:requestId/reject')
  async rejectDeleteRequest(
    @Request() req: ApiRequestJWT,
    @Param('id') id: string,
    @Param('requestId') requestId: string,
  ) {
    return await this.organizationService.rejectDeleteRequest(
      req.user.userId,
      id,
      requestId,
    );
  }

  // Get block slots change logs for an organization
  @Get(':id/block-slots-logs')
  async getBlockSlotLogs(@Param('id') id: string) {
    return await this.organizationService.getBlockSlotLogs(id);
  }

  // Get a organization by ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Organization | null> {
    return await this.organizationService.findOne(id);
  }

  // Update a organization by ID
  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'seal', maxCount: 1 },
      { name: 'salarySlipLogo', maxCount: 1 },
      { name: 'salarySlipSeal', maxCount: 1 },
    ]),
  )
  async update(
    @Request() req: ApiRequestJWT,
    @Param('id') id: string,
    @Body() updateData: any,
    @UploadedFiles()
    files?: {
      seal?: Express.Multer.File[];
      salarySlipLogo?: Express.Multer.File[];
      salarySlipSeal?: Express.Multer.File[];
    },
  ): Promise<Organization | null> {
    const sealFile = files?.seal?.[0] || null;
    const salarySlipLogoFile = files?.salarySlipLogo?.[0] || null;
    const salarySlipSealFile = files?.salarySlipSeal?.[0] || null;
    return await this.organizationService.update(
      id,
      updateData,
      req.user?.userId,
      sealFile || undefined,
      salarySlipLogoFile || undefined,
      salarySlipSealFile || undefined,
    );
  }

  // Delete a organization by ID
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.organizationService.remove(id);
  }
}
