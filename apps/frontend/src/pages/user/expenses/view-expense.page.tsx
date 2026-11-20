import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/authContext";
import { useHasPermission } from "@/hooks/use-permissions";
import { getFileUrl, getInitials } from "@/lib/utils";
import ExpenseService from "@/services/expense.service";
import {
    EXPENSE_CATEGORY_LABELS,
    EXPENSE_PAYMENT_MODE_LABELS,
    EXPENSE_PAYMENT_TYPE_LABELS,
    EXPENSE_STATUS_CONFIG,
    type IBatchExpense,
    type IBatchExpenseLog,
} from "@/types/expense.types";
import { format } from "date-fns";
import {
    ArrowLeft,
    Ban,
    Building2,
    Calendar,
    Check,
    CheckCircle2,
    Copy,
    CreditCard,
    Edit,
    ExternalLink,
    FileText,
    Image as ImageIcon,
    ImagePlus,
    Layers,
    Send,
    Trash2,
    User,
    XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
    ApproveExpenseDialog,
    MarkSentExpenseDialog,
    RejectExpenseDialog,
    UploadProofsDialog,
} from "./_components/expense-action-dialogs";
import { ExpenseLogsCard } from "./_components/expense-logs-card";

export default function ViewExpensePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const { hasPermission: canApprove } = useHasPermission(
        "expense",
        "approve",
    );
    const { hasPermission: canMarkSent } = useHasPermission(
        "expense",
        "mark_sent",
    );
    const { hasPermission: canUpdateAll } = useHasPermission(
        "expense",
        "update",
    );
    const { hasPermission: canDelete } = useHasPermission("expense", "delete");

    const [expense, setExpense] = useState<IBatchExpense | null>(null);
    const [logs, setLogs] = useState<IBatchExpenseLog[]>([]);
    const [logsTotal, setLogsTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Dialog states
    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [sentOpen, setSentOpen] = useState(false);
    const [uploadProofsOpen, setUploadProofsOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const fetchExpense = useCallback(async () => {
        if (!id) return;
        try {
            const data = await ExpenseService.getById(id);
            setExpense(data);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Failed to load expense",
            );
            navigate("/expenses");
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    const fetchLogs = useCallback(async () => {
        if (!id) return;
        setLoadingLogs(true);
        try {
            const res = await ExpenseService.getLogs(id, 1, 50);
            setLogs(res.data || []);
            setLogsTotal(res.total || 0);
        } catch {
            // Non-fatal
        } finally {
            setLoadingLogs(false);
        }
    }, [id]);

    useEffect(() => {
        fetchExpense();
        fetchLogs();
    }, [fetchExpense, fetchLogs]);

    const handleCopy = (value: string, key: string, label: string) => {
        navigator.clipboard.writeText(value);
        setCopiedKey(key);
        toast.success(`${label} copied`);
        setTimeout(() => setCopiedKey(null), 1800);
    };

    const handleRefresh = (updated: IBatchExpense) => {
        setExpense(updated);
        fetchLogs();
    };

    const handleCancelExpense = async () => {
        if (!expense) return;
        if (
            !window.confirm(
                `Are you sure you want to cancel expense #${expense.expenseNumber}?`,
            )
        ) {
            return;
        }
        try {
            const updated = await ExpenseService.cancel(expense.id);
            toast.success("Expense request cancelled");
            handleRefresh(updated);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Failed to cancel expense",
            );
        }
    };

    const handleDeleteExpense = async () => {
        if (!expense) return;
        if (
            !window.confirm(
                `Permanently delete expense #${expense.expenseNumber}? This cannot be undone.`,
            )
        ) {
            return;
        }
        try {
            await ExpenseService.remove(expense.id);
            toast.success("Expense deleted");
            navigate("/expenses");
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Failed to delete expense",
            );
        }
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-44 w-full rounded-xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-64 w-full rounded-xl" />
                        <Skeleton className="h-56 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-80 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (!expense) return null;

    const statusCfg = EXPENSE_STATUS_CONFIG[expense.status];
    const isOwner = currentUser?.id === expense.requestedById;
    const canEdit =
        expense.status !== "sent" &&
        expense.status !== "cancelled" &&
        (canUpdateAll || (isOwner && expense.status === "pending"));
    const canCancel =
        (expense.status === "pending" && (isOwner || canApprove)) ||
        (expense.status === "approved" && canApprove);

    return (
        <div className="p-6 space-y-6">
            {/* 1. Top Navigation & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link
                                    to="/expenses"
                                    className="inline-flex items-center gap-1.5"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Expenses
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="font-mono">
                                #{expense.expenseNumber}
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="flex items-center gap-2 flex-wrap">
                    {canEdit && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                                navigate(`/expenses/edit/${expense.id}`)
                            }
                        >
                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                        </Button>
                    )}
                    {expense.status === "pending" && canApprove && (
                        <Button
                            size="sm"
                            onClick={() => setApproveOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Approve
                        </Button>
                    )}
                    {(expense.status === "approved" ||
                        (expense.status === "pending" && canApprove)) &&
                        canMarkSent && (
                            <Button
                                size="sm"
                                onClick={() => setSentOpen(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                Mark as Sent
                            </Button>
                        )}
                    {(expense.status === "pending" ||
                        expense.status === "approved") &&
                        canApprove && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setRejectOpen(true)}
                            >
                                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                Reject
                            </Button>
                        )}
                    {canDelete && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={handleDeleteExpense}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* 2. Hero Summary Banner Card */}
            <Card className="relative overflow-hidden border-border/80 shadow-xs">
                <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${statusCfg.borderAccent}`}
                />
                <CardContent className="p-6 pt-7">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleCopy(
                                            expense.expenseNumber,
                                            "expNum",
                                            "Expense ID",
                                        )
                                    }
                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-muted hover:bg-muted/80 font-mono text-xs font-semibold transition-colors"
                                >
                                    #{expense.expenseNumber}
                                    {copiedKey === "expNum" ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                        <Copy className="w-3 h-3 text-muted-foreground" />
                                    )}
                                </button>

                                <Badge
                                    variant="outline"
                                    className={`text-xs font-semibold inline-flex items-center gap-1.5 ${statusCfg.badgeClass}`}
                                >
                                    <span
                                        className={`w-2 h-2 rounded-full ${statusCfg.dotClass}`}
                                    />
                                    {statusCfg.label}
                                </Badge>

                                <Badge
                                    variant="secondary"
                                    className="text-xs font-medium"
                                >
                                    {EXPENSE_CATEGORY_LABELS[
                                        expense.category
                                    ] || expense.category}
                                </Badge>

                                <Badge
                                    variant="outline"
                                    className="text-xs font-medium"
                                >
                                    {EXPENSE_PAYMENT_TYPE_LABELS[
                                        expense.paymentType
                                    ] || expense.paymentType}
                                </Badge>
                            </div>

                            <div>
                                <p className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                                    {ExpenseService.formatCurrency(
                                        expense.amount,
                                    )}
                                </p>
                                <p className="text-base font-semibold text-foreground/90 mt-1">
                                    {expense.title}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                                {expense.batch?.package?.name && (
                                    <>
                                        <span className="font-medium text-foreground">
                                            {expense.batch.package.name}
                                        </span>
                                        <span>•</span>
                                    </>
                                )}
                                <span>
                                    Required by{" "}
                                    <strong className="text-foreground">
                                        {format(
                                            new Date(expense.transferDate),
                                            "MMM d, yyyy",
                                        )}
                                    </strong>
                                </span>
                                <span>•</span>
                                <span>
                                    Requested{" "}
                                    {format(
                                        new Date(expense.createdAt),
                                        "MMM d, yyyy • h:mm a",
                                    )}
                                </span>
                            </div>
                        </div>

                        <div className="shrink-0">
                            <div
                                className={`rounded-xl border px-4 py-3 text-right space-y-0.5 ${statusCfg.badgeClass}`}
                            >
                                <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">
                                    {expense.status === "sent"
                                        ? "Disbursed On"
                                        : "Transfer Schedule"}
                                </p>
                                <p className="text-sm font-bold font-mono">
                                    {expense.status === "sent" && expense.sentAt
                                        ? format(
                                              new Date(expense.sentAt),
                                              "MMM d, yyyy • h:mm a",
                                          )
                                        : format(
                                              new Date(expense.transferDate),
                                              "MMM d, yyyy",
                                          )}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Main 2-Column Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left Column (2 Cols) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Transfer & Account Details Card */}
                    <Card className="border-border/80 shadow-xs">
                        <CardHeader className="pb-4 border-b">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-primary" />
                                Transfer & Payment Details
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Destination account, payment mode, and
                                coordinator remarks
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="rounded-xl border bg-muted/30 p-4 flex items-start justify-between gap-4">
                                <div className="space-y-1 min-w-0">
                                    <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                                        Transfer Account / UPI Details
                                    </p>
                                    <p className="text-sm font-mono font-semibold text-foreground whitespace-pre-wrap break-words">
                                        {expense.transferAccount}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="shrink-0 h-8"
                                    onClick={() =>
                                        handleCopy(
                                            expense.transferAccount,
                                            "account",
                                            "Transfer account",
                                        )
                                    }
                                >
                                    {copiedKey === "account" ? (
                                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                    ) : (
                                        <Copy className="w-3.5 h-3.5 mr-1" />
                                    )}
                                    Copy
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                        Payment Mode
                                    </p>
                                    <p className="font-medium">
                                        {EXPENSE_PAYMENT_MODE_LABELS[
                                            expense.paymentMode
                                        ] || expense.paymentMode}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                        Vendor / Payee
                                    </p>
                                    <p className="font-medium">
                                        {expense.vendorName || "—"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                        Required Transfer Date
                                    </p>
                                    <p className="font-medium flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                        {format(
                                            new Date(expense.transferDate),
                                            "MMM d, yyyy",
                                        )}
                                    </p>
                                </div>
                            </div>

                            {expense.remarks && (
                                <>
                                    <Separator />
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-muted-foreground">
                                            Coordinator Remarks
                                        </p>
                                        <p className="text-sm text-foreground whitespace-pre-wrap">
                                            {expense.remarks}
                                        </p>
                                    </div>
                                </>
                            )}

                            {expense.financeRemarks && (
                                <>
                                    <Separator />
                                    <div className="rounded-lg border p-3 bg-muted/20 space-y-1">
                                        <p className="text-xs font-semibold text-muted-foreground">
                                            Finance Remarks
                                        </p>
                                        <p className="text-sm text-foreground whitespace-pre-wrap">
                                            {expense.financeRemarks}
                                        </p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Linked Batch Card */}
                    {expense.batch && (
                        <Card className="border-border/80 shadow-xs">
                            <CardHeader className="pb-4 border-b">
                                <div className="flex items-center justify-between gap-3">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-primary" />
                                        Linked Trip Batch
                                    </CardTitle>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        asChild
                                    >
                                        <Link to={`/batches/${expense.batchId}`}>
                                            View Batch
                                            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">
                                            Package
                                        </p>
                                        <p className="font-semibold flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                            {expense.batch.package?.name || "—"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">
                                            Batch Dates
                                        </p>
                                        <p className="font-medium">
                                            {format(
                                                new Date(
                                                    expense.batch.startDate,
                                                ),
                                                "MMM d",
                                            )}{" "}
                                            –{" "}
                                            {format(
                                                new Date(expense.batch.endDate),
                                                "MMM d, yyyy",
                                            )}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">
                                            Batch Status
                                        </p>
                                        <Badge
                                            variant="secondary"
                                            className="capitalize"
                                        >
                                            {expense.batch.status}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Finance Disbursement & Payment Proof Screenshots Card */}
                    <Card className="border-border/80 shadow-xs">
                        <CardHeader className="pb-4 border-b">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                                        Payment Proof & Evidence
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Transfer reference and screenshots
                                        uploaded by the finance team
                                    </CardDescription>
                                </div>
                                {canMarkSent &&
                                    (expense.status === "sent" ||
                                        expense.status === "approved") && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                setUploadProofsOpen(true)
                                            }
                                        >
                                            <ImagePlus className="w-3.5 h-3.5 mr-1.5" />
                                            Upload Proof
                                        </Button>
                                    )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {expense.transactionReference && (
                                <div className="flex items-center justify-between rounded-lg border bg-emerald-500/5 border-emerald-500/20 px-4 py-2.5">
                                    <div>
                                        <p className="text-[11px] text-muted-foreground">
                                            UTR / Transaction Reference
                                        </p>
                                        <p className="font-mono text-sm font-bold text-foreground">
                                            {expense.transactionReference}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                            handleCopy(
                                                expense.transactionReference!,
                                                "utr",
                                                "Transaction reference",
                                            )
                                        }
                                    >
                                        {copiedKey === "utr" ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                        )}
                                    </Button>
                                </div>
                            )}

                            {expense.paymentProofs &&
                            expense.paymentProofs.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {expense.paymentProofs.map((path, idx) => {
                                        const url = getFileUrl(path);
                                        const isPdf = path
                                            .toLowerCase()
                                            .endsWith(".pdf");
                                        return isPdf ? (
                                            <a
                                                key={idx}
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex flex-col items-center justify-center gap-2 rounded-lg border p-4 hover:bg-muted/40 transition-colors h-32"
                                            >
                                                <FileText className="w-7 h-7 text-primary" />
                                                <span className="text-xs font-medium">
                                                    Receipt PDF #{idx + 1}
                                                </span>
                                            </a>
                                        ) : (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() =>
                                                    setPreviewImage(url)
                                                }
                                                className="group relative rounded-lg overflow-hidden border h-32 bg-muted text-left"
                                            >
                                                <img
                                                    src={url}
                                                    alt={`Payment proof ${idx + 1}`}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] px-2 py-1">
                                                    Screenshot #{idx + 1}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                                    No payment proof screenshots uploaded yet.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Coordinator Supporting Bills */}
                    {expense.billAttachments &&
                        expense.billAttachments.length > 0 && (
                            <Card className="border-border/80 shadow-xs">
                                <CardHeader className="pb-4 border-b">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-primary" />
                                        Supporting Bills / Quotations
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {expense.billAttachments.map(
                                            (path, idx) => {
                                                const url = getFileUrl(path);
                                                const isPdf = path
                                                    .toLowerCase()
                                                    .endsWith(".pdf");
                                                return isPdf ? (
                                                    <a
                                                        key={idx}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex flex-col items-center justify-center gap-2 rounded-lg border p-4 hover:bg-muted/40 transition-colors h-28"
                                                    >
                                                        <FileText className="w-6 h-6 text-primary" />
                                                        <span className="text-xs font-medium">
                                                            Bill PDF #{idx + 1}
                                                        </span>
                                                    </a>
                                                ) : (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() =>
                                                            setPreviewImage(url)
                                                        }
                                                        className="group relative rounded-lg overflow-hidden border h-28 bg-muted"
                                                    >
                                                        <img
                                                            src={url}
                                                            alt={`Bill ${idx + 1}`}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                        />
                                                    </button>
                                                );
                                            },
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                </div>

                {/* Right Sidebar Column (1 Col) */}
                <div className="space-y-6">
                    {/* Stakeholders Card */}
                    <Card className="border-border/80 shadow-xs">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <User className="w-4 h-4 text-primary" />
                                Stakeholders
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {expense.requestedBy && (
                                <div className="space-y-1.5">
                                    <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                                        Requested By
                                    </p>
                                    <div className="flex items-center gap-2.5">
                                        <Avatar className="h-8 w-8">
                                            {expense.requestedBy
                                                .profilePhoto && (
                                                <AvatarImage
                                                    src={getFileUrl(
                                                        expense.requestedBy
                                                            .profilePhoto,
                                                    )}
                                                />
                                            )}
                                            <AvatarFallback className="text-xs">
                                                {getInitials(
                                                    expense.requestedBy.name,
                                                    expense.requestedBy.email,
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate">
                                                {expense.requestedBy.name ||
                                                    "Coordinator"}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {expense.requestedBy.email}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {expense.approvedBy && (
                                <>
                                    <Separator />
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                                            {expense.status === "rejected"
                                                ? "Rejected By"
                                                : "Approved By"}
                                        </p>
                                        <div className="flex items-center gap-2.5">
                                            <Avatar className="h-8 w-8">
                                                {expense.approvedBy
                                                    .profilePhoto && (
                                                    <AvatarImage
                                                        src={getFileUrl(
                                                            expense.approvedBy
                                                                .profilePhoto,
                                                        )}
                                                    />
                                                )}
                                                <AvatarFallback className="text-xs">
                                                    {getInitials(
                                                        expense.approvedBy.name,
                                                        expense.approvedBy
                                                            .email,
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate">
                                                    {expense.approvedBy.name ||
                                                        "Finance"}
                                                </p>
                                                {expense.approvedAt && (
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {format(
                                                            new Date(
                                                                expense.approvedAt,
                                                            ),
                                                            "MMM d, yyyy • h:mm a",
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {expense.sentBy && (
                                <>
                                    <Separator />
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                                            Disbursed By
                                        </p>
                                        <div className="flex items-center gap-2.5">
                                            <Avatar className="h-8 w-8">
                                                {expense.sentBy
                                                    .profilePhoto && (
                                                    <AvatarImage
                                                        src={getFileUrl(
                                                            expense.sentBy
                                                                .profilePhoto,
                                                        )}
                                                    />
                                                )}
                                                <AvatarFallback className="text-xs">
                                                    {getInitials(
                                                        expense.sentBy.name,
                                                        expense.sentBy.email,
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate">
                                                    {expense.sentBy.name ||
                                                        "Finance"}
                                                </p>
                                                {expense.sentAt && (
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {format(
                                                            new Date(
                                                                expense.sentAt,
                                                            ),
                                                            "MMM d, yyyy • h:mm a",
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions Card */}
                    {canCancel && (
                        <Card className="border-border/80 shadow-xs">
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-sm font-bold">
                                    Quick Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start text-muted-foreground hover:text-destructive"
                                    onClick={handleCancelExpense}
                                >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Cancel Expense Request
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Audit & Activity Logs Card */}
                    <ExpenseLogsCard
                        logs={logs}
                        total={logsTotal}
                        loading={loadingLogs}
                    />
                </div>
            </div>

            {/* Workflow Dialogs */}
            <ApproveExpenseDialog
                open={approveOpen}
                onOpenChange={setApproveOpen}
                expense={expense}
                canMarkSent={canMarkSent}
                onSuccess={handleRefresh}
            />
            <RejectExpenseDialog
                open={rejectOpen}
                onOpenChange={setRejectOpen}
                expense={expense}
                onSuccess={handleRefresh}
            />
            <MarkSentExpenseDialog
                open={sentOpen}
                onOpenChange={setSentOpen}
                expense={expense}
                onSuccess={handleRefresh}
            />
            <UploadProofsDialog
                open={uploadProofsOpen}
                onOpenChange={setUploadProofsOpen}
                expense={expense}
                onSuccess={handleRefresh}
            />

            {/* Image Lightbox Preview */}
            <Dialog
                open={!!previewImage}
                onOpenChange={(o) => !o && setPreviewImage(null)}
            >
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Attachment Preview</DialogTitle>
                    </DialogHeader>
                    {previewImage && (
                        <div className="flex flex-col items-center gap-3">
                            <img
                                src={previewImage}
                                alt="Preview"
                                className="max-h-[70vh] w-auto rounded-lg object-contain border"
                            />
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href={previewImage}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Open Original in New Tab
                                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                                </a>
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
