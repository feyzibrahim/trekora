import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getFileUrl, getInitials } from "@/lib/utils";
import type { IBatchExpenseLog } from "@/types/expense.types";
import { format } from "date-fns";
import {
    Activity,
    ArrowRight,
    CheckCircle2,
    CreditCard,
    Edit3,
    History,
    ImagePlus,
    PlusCircle,
    XCircle,
} from "lucide-react";

interface ExpenseLogsCardProps {
    logs: IBatchExpenseLog[];
    total?: number;
    loading?: boolean;
}

const ACTION_META: Record<
    string,
    {
        label: string;
        nodeBg: string;
        badgeColor: string;
        icon: React.ComponentType<{ className?: string }>;
    }
> = {
    created: {
        label: "Requested",
        nodeBg: "bg-emerald-500",
        badgeColor:
            "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
        icon: PlusCircle,
    },
    updated: {
        label: "Updated",
        nodeBg: "bg-indigo-500",
        badgeColor:
            "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
        icon: Edit3,
    },
    approved: {
        label: "Approved",
        nodeBg: "bg-blue-500",
        badgeColor:
            "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
        icon: CheckCircle2,
    },
    marked_sent: {
        label: "Marked as Sent",
        nodeBg: "bg-emerald-600",
        badgeColor:
            "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
        icon: CreditCard,
    },
    proof_uploaded: {
        label: "Proof Uploaded",
        nodeBg: "bg-purple-500",
        badgeColor:
            "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
        icon: ImagePlus,
    },
    rejected: {
        label: "Rejected",
        nodeBg: "bg-rose-500",
        badgeColor:
            "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
        icon: XCircle,
    },
    cancelled: {
        label: "Cancelled",
        nodeBg: "bg-gray-500",
        badgeColor:
            "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
        icon: XCircle,
    },
};

export function ExpenseLogsCard({
    logs,
    total,
    loading = false,
}: ExpenseLogsCardProps) {
    return (
        <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        Audit & Activity Logs
                    </CardTitle>
                    <Badge
                        variant="secondary"
                        className="font-normal text-xs font-mono"
                    >
                        {total ?? logs.length} entries
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-5">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-20 w-full rounded-lg" />
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                        No activity recorded yet.
                    </p>
                ) : (
                    <div className="relative space-y-5 before:absolute before:top-3 before:bottom-3 before:left-[11px] before:w-[2px] before:bg-border/80">
                        {logs.map((log) => {
                            const meta = ACTION_META[log.action] || {
                                label: log.action,
                                nodeBg: "bg-blue-500",
                                badgeColor:
                                    "bg-muted text-foreground border-border",
                                icon: Activity,
                            };
                            const Icon = meta.icon;
                            const prevStatus = log.previousData?.status as
                                | string
                                | undefined;
                            const nextStatus = log.newData?.status as
                                | string
                                | undefined;
                            const txRef = log.newData?.transactionReference as
                                | string
                                | undefined;
                            const proofCount = log.newData?.proofCount as
                                | number
                                | undefined;
                            const addedCount = log.newData?.addedCount as
                                | number
                                | undefined;

                            return (
                                <div
                                    key={log.id}
                                    className="relative flex gap-3 items-start"
                                >
                                    <div
                                        className={`h-6 w-6 rounded-full shrink-0 z-10 border-2 border-background flex items-center justify-center text-white shadow-xs mt-0.5 ${meta.nodeBg}`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0 bg-muted/30 hover:bg-muted/50 transition-colors p-3 rounded-lg border border-border/60 space-y-2">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <Badge
                                                variant="outline"
                                                className={`font-semibold text-[11px] px-2 py-0.5 border ${meta.badgeColor}`}
                                            >
                                                {meta.label}
                                            </Badge>
                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                {format(
                                                    new Date(log.createdAt),
                                                    "MMM d, yyyy • h:mm a",
                                                )}
                                            </span>
                                        </div>

                                        {log.changedBy && (
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <span>By</span>
                                                <HoverCard>
                                                    <HoverCardTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
                                                        >
                                                            <Avatar className="h-4 w-4">
                                                                {log.changedBy
                                                                    .profilePhoto && (
                                                                    <AvatarImage
                                                                        src={getFileUrl(
                                                                            log
                                                                                .changedBy
                                                                                .profilePhoto,
                                                                        )}
                                                                    />
                                                                )}
                                                                <AvatarFallback className="text-[9px]">
                                                                    {getInitials(
                                                                        log
                                                                            .changedBy
                                                                            .name,
                                                                        log
                                                                            .changedBy
                                                                            .email,
                                                                    )}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span>
                                                                {log.changedBy
                                                                    .name ||
                                                                    log
                                                                        .changedBy
                                                                        .email}
                                                            </span>
                                                        </button>
                                                    </HoverCardTrigger>
                                                    <HoverCardContent className="w-64">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9">
                                                                {log.changedBy
                                                                    .profilePhoto && (
                                                                    <AvatarImage
                                                                        src={getFileUrl(
                                                                            log
                                                                                .changedBy
                                                                                .profilePhoto,
                                                                        )}
                                                                    />
                                                                )}
                                                                <AvatarFallback>
                                                                    {getInitials(
                                                                        log
                                                                            .changedBy
                                                                            .name,
                                                                        log
                                                                            .changedBy
                                                                            .email,
                                                                    )}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold truncate">
                                                                    {log
                                                                        .changedBy
                                                                        .name ||
                                                                        "User"}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {
                                                                        log
                                                                            .changedBy
                                                                            .email
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </HoverCardContent>
                                                </HoverCard>
                                            </div>
                                        )}

                                        {prevStatus &&
                                            nextStatus &&
                                            prevStatus !== nextStatus && (
                                                <div className="flex items-center gap-1.5 text-[11px]">
                                                    <Badge
                                                        variant="outline"
                                                        className="capitalize text-[10px] px-1.5 py-0"
                                                    >
                                                        {prevStatus}
                                                    </Badge>
                                                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                                    <Badge
                                                        variant="outline"
                                                        className="capitalize text-[10px] px-1.5 py-0 font-semibold"
                                                    >
                                                        {nextStatus}
                                                    </Badge>
                                                </div>
                                            )}

                                        {log.action === "updated" &&
                                            log.newData && (
                                                <div className="text-[11px] text-muted-foreground space-y-0.5">
                                                    Updated:{" "}
                                                    <span className="font-medium text-foreground">
                                                        {Object.keys(
                                                            log.newData,
                                                        ).join(", ")}
                                                    </span>
                                                </div>
                                            )}

                                        {txRef && (
                                            <p className="text-[11px] text-muted-foreground">
                                                Ref:{" "}
                                                <span className="font-mono font-medium text-foreground">
                                                    {txRef}
                                                </span>
                                            </p>
                                        )}

                                        {log.action === "proof_uploaded" &&
                                            addedCount && (
                                                <p className="text-[11px] text-muted-foreground">
                                                    Uploaded {addedCount}{" "}
                                                    screenshot
                                                    {addedCount > 1 ? "s" : ""}{" "}
                                                    ({proofCount} total)
                                                </p>
                                            )}

                                        {log.action === "marked_sent" &&
                                            proofCount !== undefined &&
                                            proofCount > 0 && (
                                                <p className="text-[11px] text-muted-foreground">
                                                    Attached {proofCount} payment
                                                    proof screenshot
                                                    {proofCount > 1 ? "s" : ""}
                                                </p>
                                            )}

                                        {log.note && (
                                            <p className="text-[11px] text-muted-foreground italic">
                                                Note: &ldquo;{log.note}&rdquo;
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
