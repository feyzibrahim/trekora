import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/lib/auth-utils";
import {
    type IManagedOrganization,
    type IOrgActionSwitchResult,
    OrganizationService,
} from "@/services/organization.service";
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    Clock,
    Loader2,
    LogOut,
    Shield,
    Trash2,
    User,
    XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ManageOrganizationsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOrganizationsChanged?: () => void;
}

type ConfirmAction =
    | { type: "delete"; org: IManagedOrganization }
    | { type: "leave"; org: IManagedOrganization }
    | null;

export function ManageOrganizationsDialog({
    open,
    onOpenChange,
    onOrganizationsChanged,
}: ManageOrganizationsDialogProps) {
    const [orgs, setOrgs] = useState<IManagedOrganization[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

    const fetchOrganizations = useCallback(async () => {
        setLoading(true);
        try {
            const data = await OrganizationService.getManagedOrganizations();
            setOrgs(data || []);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Failed to load organizations"
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchOrganizations();
        }
    }, [open, fetchOrganizations]);

    const handlePostSwitch = (res: IOrgActionSwitchResult): boolean => {
        if (res.accessToken && res.refreshToken) {
            localStorage.setItem("accessToken", res.accessToken);
            localStorage.setItem("refreshToken", res.refreshToken);
            window.location.href = "/";
            return true;
        }
        if (res.noRemainingOrganizations) {
            logout();
            window.location.href = "/login";
            return true;
        }
        return false;
    };

    const handleConfirmAction = async () => {
        if (!confirmAction) return;
        const { type, org } = confirmAction;
        setConfirmAction(null);
        setBusyKey(`${type}-${org.id}`);

        try {
            if (type === "delete") {
                const res = await OrganizationService.requestDeleteOrganization(
                    org.id
                );
                if (res.deleted) {
                    toast.success(
                        `Organization "${res.organizationName}" has been deleted`
                    );
                    if (handlePostSwitch(res)) return;
                } else if (res.requiresApproval) {
                    toast.success(
                        `Deletion requested for "${res.organizationName}". All ${res.requiredCount} admins have been notified.`
                    );
                }
            } else if (type === "leave") {
                const res = await OrganizationService.leaveOrganization(org.id);
                toast.success(`You left "${res.organizationName}"`);
                if (handlePostSwitch(res)) return;
            }

            await fetchOrganizations();
            onOrganizationsChanged?.();
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message ||
                    `Failed to ${type} organization`
            );
        } finally {
            setBusyKey(null);
        }
    };

    const handleApprove = async (org: IManagedOrganization) => {
        if (!org.pendingDeletionRequest) return;
        const reqId = org.pendingDeletionRequest.id;
        setBusyKey(`approve-${reqId}`);
        try {
            const res = await OrganizationService.approveDeleteRequest(
                org.id,
                reqId
            );
            if (res.deleted) {
                toast.success(
                    `All admins approved. Organization "${res.organizationName}" has been deleted.`
                );
                if (handlePostSwitch(res)) return;
            } else {
                toast.success(
                    `Approved deletion (${res.approvedCount}/${res.requiredCount} admins approved)`
                );
            }
            await fetchOrganizations();
            onOrganizationsChanged?.();
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Failed to approve deletion"
            );
        } finally {
            setBusyKey(null);
        }
    };

    const handleReject = async (org: IManagedOrganization) => {
        if (!org.pendingDeletionRequest) return;
        const reqId = org.pendingDeletionRequest.id;
        setBusyKey(`reject-${reqId}`);
        try {
            const res = await OrganizationService.rejectDeleteRequest(
                org.id,
                reqId
            );
            toast.success(
                res.status === "cancelled"
                    ? `Cancelled deletion request for "${res.organizationName}"`
                    : `Rejected deletion request for "${res.organizationName}"`
            );
            await fetchOrganizations();
            onOrganizationsChanged?.();
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Failed to reject deletion"
            );
        } finally {
            setBusyKey(null);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary" />
                            Manage Organizations
                        </DialogTitle>
                        <DialogDescription>
                            Delete organizations you administer or leave
                            organizations you are a member of. Organizations
                            with multiple admins require approval from all
                            admins before deletion.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {loading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-24 w-full rounded-lg" />
                                <Skeleton className="h-24 w-full rounded-lg" />
                            </div>
                        ) : orgs.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                You do not belong to any active organizations.
                            </div>
                        ) : (
                            orgs.map((org) => {
                                const pending = org.pendingDeletionRequest;
                                const isDeleting =
                                    busyKey === `delete-${org.id}`;
                                const isLeaving = busyKey === `leave-${org.id}`;
                                const isApproving =
                                    pending &&
                                    busyKey === `approve-${pending.id}`;
                                const isRejecting =
                                    pending &&
                                    busyKey === `reject-${pending.id}`;
                                const isAnyBusy = busyKey !== null;

                                return (
                                    <div
                                        key={org.id}
                                        className="rounded-lg border p-4 space-y-3 bg-card"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center flex-wrap gap-1.5">
                                                        <span className="font-semibold text-sm truncate">
                                                            {org.name}
                                                        </span>
                                                        {org.isCurrent && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                                            >
                                                                Current
                                                            </Badge>
                                                        )}
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] px-1.5 py-0 h-4 gap-1"
                                                        >
                                                            {org.isAdmin ? (
                                                                <>
                                                                    <Shield className="w-2.5 h-2.5 text-primary" />
                                                                    Admin
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <User className="w-2.5 h-2.5" />
                                                                    Member
                                                                </>
                                                            )}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                                                        {org.domain && (
                                                            <span>
                                                                {org.domain}
                                                            </span>
                                                        )}
                                                        {org.adminCount > 0 && (
                                                            <span>
                                                                {org.domain
                                                                    ? "• "
                                                                    : ""}
                                                                {org.adminCount}{" "}
                                                                {org.adminCount ===
                                                                1
                                                                    ? "Admin"
                                                                    : "Admins"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Primary action button when no deletion request is pending */}
                                            {!pending && (
                                                <div className="shrink-0">
                                                    {org.isAdmin ? (
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={isAnyBusy}
                                                            onClick={() =>
                                                                setConfirmAction(
                                                                    {
                                                                        type: "delete",
                                                                        org,
                                                                    }
                                                                )
                                                            }
                                                            className="h-8 text-xs gap-1.5 cursor-pointer"
                                                        >
                                                            {isDeleting ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            )}
                                                            Delete
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={isAnyBusy}
                                                            onClick={() =>
                                                                setConfirmAction(
                                                                    {
                                                                        type: "leave",
                                                                        org,
                                                                    }
                                                                )
                                                            }
                                                            className="h-8 text-xs gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                                        >
                                                            {isLeaving ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <LogOut className="w-3.5 h-3.5" />
                                                            )}
                                                            Leave
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Pending Multi-Admin Deletion Approval Banner */}
                                        {pending && (
                                            <div className="rounded-md border border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/30 p-3 space-y-2.5">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2">
                                                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                                        <div className="text-xs">
                                                            <div className="font-semibold text-amber-900 dark:text-amber-200">
                                                                Deletion Pending
                                                                Admin Approval (
                                                                {
                                                                    pending
                                                                        .approvedByUserIds
                                                                        .length
                                                                }
                                                                /
                                                                {
                                                                    pending
                                                                        .requiredAdminUserIds
                                                                        .length
                                                                }{" "}
                                                                approved)
                                                            </div>
                                                            <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                                                                Requested by{" "}
                                                                <span className="font-medium">
                                                                    {
                                                                        pending.requestedByName
                                                                    }
                                                                </span>
                                                                . Organization
                                                                will be deleted
                                                                once all admins
                                                                approve.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Admin approval status chips */}
                                                {org.admins.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {org.admins.map(
                                                            (admin) => {
                                                                const approved =
                                                                    pending.approvedByUserIds.includes(
                                                                        admin.userId
                                                                    );
                                                                return (
                                                                    <span
                                                                        key={
                                                                            admin.userId
                                                                        }
                                                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                                                                            approved
                                                                                ? "bg-emerald-100/80 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                                                                : "bg-background text-muted-foreground border-border"
                                                                        }`}
                                                                    >
                                                                        {approved ? (
                                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                        ) : (
                                                                            <Clock className="w-3 h-3 text-amber-600" />
                                                                        )}
                                                                        {
                                                                            admin.name
                                                                        }
                                                                    </span>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                )}

                                                {/* Approval / Reject / Cancel actions for admins */}
                                                {org.isAdmin && (
                                                    <div className="flex items-center gap-2 pt-1">
                                                        {!pending.hasCurrentUserApproved ? (
                                                            <>
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    disabled={
                                                                        isAnyBusy
                                                                    }
                                                                    onClick={() =>
                                                                        handleApprove(
                                                                            org
                                                                        )
                                                                    }
                                                                    className="h-7 text-xs gap-1.5 cursor-pointer"
                                                                >
                                                                    {isApproving ? (
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    ) : (
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    )}
                                                                    Approve
                                                                    Deletion
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={
                                                                        isAnyBusy
                                                                    }
                                                                    onClick={() =>
                                                                        handleReject(
                                                                            org
                                                                        )
                                                                    }
                                                                    className="h-7 text-xs gap-1.5 cursor-pointer"
                                                                >
                                                                    {isRejecting ? (
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    ) : (
                                                                        <XCircle className="w-3.5 h-3.5" />
                                                                    )}
                                                                    Reject
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={
                                                                    isAnyBusy
                                                                }
                                                                onClick={() =>
                                                                    handleReject(
                                                                        org
                                                                    )
                                                                }
                                                                className="h-7 text-xs gap-1.5 cursor-pointer"
                                                            >
                                                                {isRejecting ? (
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                ) : (
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                )}
                                                                Cancel Request
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirmation Alert Dialog */}
            <AlertDialog
                open={confirmAction !== null}
                onOpenChange={(isOpen) => {
                    if (!isOpen) setConfirmAction(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmAction?.type === "delete"
                                ? confirmAction.org.adminCount > 1
                                    ? `Request deletion of "${confirmAction.org.name}"?`
                                    : `Delete "${confirmAction.org.name}"?`
                                : `Leave "${confirmAction?.org.name}"?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction?.type === "delete" ? (
                                confirmAction.org.adminCount > 1 ? (
                                    <>
                                        This organization has{" "}
                                        <strong>
                                            {confirmAction.org.adminCount}{" "}
                                            admins
                                        </strong>
                                        . A notification will be sent to all
                                        admins, and the organization will only
                                        be deleted once{" "}
                                        <strong>all admins approve</strong>.
                                    </>
                                ) : (
                                    <>
                                        This action will permanently remove{" "}
                                        <strong>
                                            {confirmAction.org.name}
                                        </strong>{" "}
                                        and revoke access for all members. This
                                        cannot be undone.
                                    </>
                                )
                            ) : (
                                <>
                                    Are you sure you want to leave{" "}
                                    <strong>{confirmAction?.org.name}</strong>?
                                    You will lose access to this organization
                                    unless an admin invites you again.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmAction}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                        >
                            {confirmAction?.type === "delete"
                                ? confirmAction.org.adminCount > 1
                                    ? "Send Deletion Request"
                                    : "Delete Organization"
                                : "Leave Organization"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
