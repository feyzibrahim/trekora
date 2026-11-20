import axiosInstance from "@/lib/axios";

export interface IOrganizationAdminInfo {
    userId: string;
    name: string;
    email: string;
}

export interface IOrganizationDeletionRequestSummary {
    id: string;
    requestedByUserId: string;
    requestedByName: string;
    requiredAdminUserIds: string[];
    approvedByUserIds: string[];
    hasCurrentUserApproved: boolean;
    status: "pending" | "approved" | "rejected" | "cancelled";
    createdAt: string;
}

export interface IManagedOrganization {
    id: string;
    name: string;
    domain?: string | null;
    industry?: string | null;
    size?: string | null;
    createdAt: string;
    relation: string;
    isCurrent: boolean;
    isAdmin: boolean;
    adminCount: number;
    admins: IOrganizationAdminInfo[];
    pendingDeletionRequest: IOrganizationDeletionRequestSummary | null;
}

export interface IOrgActionSwitchResult {
    switchedToOrganizationId: string | null;
    accessToken?: string;
    refreshToken?: string;
    noRemainingOrganizations: boolean;
}

export interface IRequestDeleteOrgResponse extends IOrgActionSwitchResult {
    deleted: boolean;
    requiresApproval: boolean;
    organizationName: string;
    approvedCount?: number;
    requiredCount?: number;
    requestId?: string;
}

export interface IApproveDeleteOrgResponse extends IOrgActionSwitchResult {
    deleted: boolean;
    organizationName: string;
    approvedCount: number;
    requiredCount: number;
}

export interface ILeaveOrgResponse extends IOrgActionSwitchResult {
    left: boolean;
    organizationName: string;
}

export class OrganizationService {
    static async getManagedOrganizations(): Promise<IManagedOrganization[]> {
        const res = await axiosInstance.get<IManagedOrganization[]>(
            "/organization/my/managed"
        );
        return res.data;
    }

    static async leaveOrganization(orgId: string): Promise<ILeaveOrgResponse> {
        const res = await axiosInstance.post<ILeaveOrgResponse>(
            `/organization/${orgId}/leave`
        );
        return res.data;
    }

    static async requestDeleteOrganization(
        orgId: string
    ): Promise<IRequestDeleteOrgResponse> {
        const res = await axiosInstance.post<IRequestDeleteOrgResponse>(
            `/organization/${orgId}/request-delete`
        );
        return res.data;
    }

    static async approveDeleteRequest(
        orgId: string,
        requestId: string
    ): Promise<IApproveDeleteOrgResponse> {
        const res = await axiosInstance.post<IApproveDeleteOrgResponse>(
            `/organization/${orgId}/delete-requests/${requestId}/approve`
        );
        return res.data;
    }

    static async rejectDeleteRequest(
        orgId: string,
        requestId: string
    ): Promise<{ status: string; organizationName: string }> {
        const res = await axiosInstance.post<{
            status: string;
            organizationName: string;
        }>(`/organization/${orgId}/delete-requests/${requestId}/reject`);
        return res.data;
    }
}
