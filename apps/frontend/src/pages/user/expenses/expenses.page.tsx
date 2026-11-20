import DataTableFooter from "@/components/data-table-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useHasPermission } from "@/hooks/use-permissions";
import axiosInstance from "@/lib/axios";
import ExpenseService from "@/services/expense.service";
import type { IBatches } from "@/types/batches.types";
import {
    EXPENSE_CATEGORY_LABELS,
    EXPENSE_PAYMENT_TYPE_LABELS,
    EXPENSE_STATUS_CONFIG,
    type ExpenseCategory,
    type ExpensePaymentType,
    type ExpenseStatus,
    type IBatchExpense,
    type IExpenseSummary,
} from "@/types/expense.types";
import { format } from "date-fns";
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    Eye,
    FilterX,
    Image as ImageIcon,
    Plus,
    Receipt,
    Search,
    Send,
    Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
    ApproveExpenseDialog,
    MarkSentExpenseDialog,
} from "./_components/expense-action-dialogs";

interface IPackageOption {
    id: string;
    name: string;
}

const EMPTY_SUMMARY: IExpenseSummary = {
    totalAmount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    sentAmount: 0,
    rejectedAmount: 0,
    totalCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    sentCount: 0,
    rejectedCount: 0,
    dueTodayCount: 0,
    overdueCount: 0,
};

function getTodayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ExpensesPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { hasPermission: canApprove } = useHasPermission(
        "expense",
        "approve",
    );
    const { hasPermission: canMarkSent } = useHasPermission(
        "expense",
        "mark_sent",
    );
    const { hasPermission: canReadAll } = useHasPermission("expense", "read");

    const [expenses, setExpenses] = useState<IBatchExpense[]>([]);
    const [summary, setSummary] = useState<IExpenseSummary>(EMPTY_SUMMARY);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [status, setStatus] = useState<ExpenseStatus | "all">(
        (searchParams.get("status") as ExpenseStatus) || "all",
    );
    const [category, setCategory] = useState<ExpenseCategory | "all">("all");
    const [paymentType, setPaymentType] = useState<ExpensePaymentType | "all">(
        "all",
    );
    const [packageId, setPackageId] = useState<string>(
        searchParams.get("packageId") || "all",
    );
    const [batchId, setBatchId] = useState<string>(
        searchParams.get("batchId") || "all",
    );
    const [dateField, setDateField] = useState<"transferDate" | "createdAt">(
        "transferDate",
    );
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [mineOnly, setMineOnly] = useState(false);

    // Filter option lists
    const [packages, setPackages] = useState<IPackageOption[]>([]);
    const [batches, setBatches] = useState<IBatches[]>([]);

    // Quick action dialogs
    const [approveTarget, setApproveTarget] = useState<IBatchExpense | null>(
        null,
    );
    const [sentTarget, setSentTarget] = useState<IBatchExpense | null>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setPage(1);
        }, 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const [pkgRes, batchRes] = await Promise.all([
                    axiosInstance.get("/packages", {
                        params: { page: 1, limit: 200 },
                    }),
                    axiosInstance.get("/batches", {
                        params: { page: 1, limit: 200 },
                    }),
                ]);
                const pkgList = Array.isArray(pkgRes.data)
                    ? pkgRes.data
                    : pkgRes.data?.data || [];
                const batchList = Array.isArray(batchRes.data)
                    ? batchRes.data
                    : batchRes.data?.data || [];
                setPackages(pkgList);
                setBatches(batchList);
            } catch {
                // Non-fatal; filters remain usable
            }
        };
        loadFilterOptions();
    }, []);

    const filteredBatches = useMemo(() => {
        if (packageId === "all") return batches;
        return batches.filter((b) => b.packageId === packageId);
    }, [batches, packageId]);

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await ExpenseService.getAll({
                page,
                limit,
                search: debouncedSearch || undefined,
                status: status === "all" ? undefined : status,
                category: category === "all" ? undefined : category,
                paymentType: paymentType === "all" ? undefined : paymentType,
                packageId: packageId === "all" ? undefined : packageId,
                batchId: batchId === "all" ? undefined : batchId,
                dateField,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                mineOnly: mineOnly || undefined,
            });
            setExpenses(res.data || []);
            setTotal(res.total || 0);
            setSummary(res.summary || EMPTY_SUMMARY);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Failed to load expenses",
            );
        } finally {
            setLoading(false);
        }
    }, [
        page,
        limit,
        debouncedSearch,
        status,
        category,
        paymentType,
        packageId,
        batchId,
        dateField,
        dateFrom,
        dateTo,
        mineOnly,
    ]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const hasActiveFilters =
        !!searchInput ||
        status !== "all" ||
        category !== "all" ||
        paymentType !== "all" ||
        packageId !== "all" ||
        batchId !== "all" ||
        !!dateFrom ||
        !!dateTo ||
        mineOnly;

    const clearFilters = () => {
        setSearchInput("");
        setDebouncedSearch("");
        setStatus("all");
        setCategory("all");
        setPaymentType("all");
        setPackageId("all");
        setBatchId("all");
        setDateFrom("");
        setDateTo("");
        setMineOnly(false);
        setPage(1);
    };

    const todayStr = getTodayStr();
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Batch Expenses
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Track trip expense requests, finance approvals,
                        disbursements, and payment proof across batches &
                        packages.
                    </p>
                </div>
                <Button onClick={() => navigate("/expenses/create")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Request Expense
                </Button>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border/80 shadow-xs">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                            <span>Pending Approval</span>
                            <Clock className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-2xl font-extrabold font-mono text-amber-700 dark:text-amber-400">
                            {ExpenseService.formatCurrency(
                                summary.pendingAmount,
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {summary.pendingCount} request
                            {summary.pendingCount === 1 ? "" : "s"} awaiting
                            review
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/80 shadow-xs">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                            <span>Approved (Ready to Send)</span>
                            <CheckCircle2 className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-2xl font-extrabold font-mono text-blue-700 dark:text-blue-400">
                            {ExpenseService.formatCurrency(
                                summary.approvedAmount,
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {summary.approvedCount} approved
                            {(summary.dueTodayCount > 0 ||
                                summary.overdueCount > 0) && (
                                <span className="text-amber-600 dark:text-amber-400 font-medium ml-1">
                                    • {summary.dueTodayCount} due today
                                    {summary.overdueCount > 0
                                        ? `, ${summary.overdueCount} overdue`
                                        : ""}
                                </span>
                            )}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/80 shadow-xs">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                            <span>Total Sent / Disbursed</span>
                            <Send className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                            {ExpenseService.formatCurrency(summary.sentAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {summary.sentCount} payment
                            {summary.sentCount === 1 ? "" : "s"} completed
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/80 shadow-xs">
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                            <span>Total Active Expenses</span>
                            <Wallet className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-2xl font-extrabold font-mono text-foreground">
                            {ExpenseService.formatCurrency(summary.totalAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {summary.totalCount} total record
                            {summary.totalCount === 1 ? "" : "s"} (excl.
                            rejected/cancelled)
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Bar */}
            <Card className="border-border/80 shadow-xs">
                <CardContent className="p-4 space-y-4">
                    {/* Row 1: Search + Quick Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by expense #, title, vendor, transfer account, or remarks..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="pl-9 w-full"
                            />
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            {canReadAll && (
                                <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/30 text-xs font-medium cursor-pointer select-none">
                                    <Switch
                                        checked={mineOnly}
                                        onCheckedChange={(v) => {
                                            setMineOnly(v);
                                            setPage(1);
                                        }}
                                    />
                                    <span>My Requests</span>
                                </label>
                            )}

                            {hasActiveFilters && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-9 text-xs"
                                >
                                    <FilterX className="w-3.5 h-3.5 mr-1.5" />
                                    Reset Filters
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Structured Labeled Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-3 border-t border-border/60">
                        <div className="lg:col-span-2 space-y-1.5">
                            <label className="text-[11px] font-medium text-muted-foreground block">
                                Status
                            </label>
                            <Select
                                value={status}
                                onValueChange={(v) => {
                                    setStatus(v as ExpenseStatus | "all");
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Statuses
                                    </SelectItem>
                                    {(
                                        Object.entries(EXPENSE_STATUS_CONFIG) as [
                                            ExpenseStatus,
                                            { label: string },
                                        ][]
                                    ).map(([val, cfg]) => (
                                        <SelectItem key={val} value={val}>
                                            {cfg.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="lg:col-span-2 space-y-1.5">
                            <label className="text-[11px] font-medium text-muted-foreground block">
                                Category
                            </label>
                            <Select
                                value={category}
                                onValueChange={(v) => {
                                    setCategory(v as ExpenseCategory | "all");
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Categories
                                    </SelectItem>
                                    {(
                                        Object.entries(EXPENSE_CATEGORY_LABELS) as [
                                            ExpenseCategory,
                                            string,
                                        ][]
                                    ).map(([val, label]) => (
                                        <SelectItem key={val} value={val}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="lg:col-span-2 space-y-1.5">
                            <label className="text-[11px] font-medium text-muted-foreground block">
                                Payment Type
                            </label>
                            <Select
                                value={paymentType}
                                onValueChange={(v) => {
                                    setPaymentType(v as ExpensePaymentType | "all");
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Payment Types
                                    </SelectItem>
                                    {(
                                        Object.entries(
                                            EXPENSE_PAYMENT_TYPE_LABELS,
                                        ) as [ExpensePaymentType, string][]
                                    ).map(([val, label]) => (
                                        <SelectItem key={val} value={val}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="lg:col-span-2 space-y-1.5">
                            <label className="text-[11px] font-medium text-muted-foreground block">
                                Package
                            </label>
                            <Select
                                value={packageId}
                                onValueChange={(v) => {
                                    setPackageId(v);
                                    setBatchId("all");
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All Packages" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Packages
                                    </SelectItem>
                                    {packages.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="lg:col-span-2 space-y-1.5">
                            <label className="text-[11px] font-medium text-muted-foreground block">
                                Batch
                            </label>
                            <Select
                                value={batchId}
                                onValueChange={(v) => {
                                    setBatchId(v);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All Batches" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Batches</SelectItem>
                                    {filteredBatches.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.package?.name || "Batch"} (
                                            {format(
                                                new Date(b.startDate),
                                                "MMM d, yy",
                                            )}
                                            )
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="lg:col-span-2 space-y-1.5">
                            <label className="text-[11px] font-medium text-muted-foreground block">
                                Date Field
                            </label>
                            <Select
                                value={dateField}
                                onValueChange={(v) => {
                                    setDateField(
                                        v as "transferDate" | "createdAt",
                                    );
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="transferDate">
                                        Transfer Date
                                    </SelectItem>
                                    <SelectItem value="createdAt">
                                        Request Date
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 3: Date Range */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                            {dateField === "transferDate"
                                ? "Transfer Date Range:"
                                : "Request Date Range:"}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:max-w-md w-full">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-10 shrink-0">
                                    From
                                </span>
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        setDateFrom(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-10 shrink-0 sm:w-6">
                                    To
                                </span>
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => {
                                        setDateTo(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Expenses Table */}
            <Card className="border-border/80 shadow-xs overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                            <Receipt className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-semibold">
                            No expenses found
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            {hasActiveFilters
                                ? "Try adjusting your filters or date range to see matching expenses."
                                : "Start tracking batch expenses by submitting your first payment request."}
                        </p>
                        <div className="pt-2 flex items-center justify-center gap-2">
                            {hasActiveFilters && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFilters}
                                >
                                    Clear Filters
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={() => navigate("/expenses/create")}
                            >
                                <Plus className="w-4 h-4 mr-1.5" />
                                Request Expense
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Expense</TableHead>
                                        <TableHead>Batch & Package</TableHead>
                                        <TableHead>Category & Stage</TableHead>
                                        <TableHead>Transfer Date</TableHead>
                                        <TableHead className="text-right">
                                            Amount
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Requested By</TableHead>
                                        <TableHead className="text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.map((exp) => {
                                        const statusCfg =
                                            EXPENSE_STATUS_CONFIG[exp.status];
                                        const tDate = exp.transferDate.slice(
                                            0,
                                            10,
                                        );
                                        const isActionable =
                                            exp.status === "pending" ||
                                            exp.status === "approved";
                                        const isOverdue =
                                            isActionable && tDate < todayStr;
                                        const isDueToday =
                                            isActionable && tDate === todayStr;

                                        return (
                                            <TableRow
                                                key={exp.id}
                                                className="cursor-pointer hover:bg-muted/40"
                                                onClick={() =>
                                                    navigate(
                                                        `/expenses/${exp.id}`,
                                                    )
                                                }
                                            >
                                                <TableCell>
                                                    <div className="space-y-0.5 max-w-[240px]">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-xs text-muted-foreground">
                                                                #
                                                                {
                                                                    exp.expenseNumber
                                                                }
                                                            </span>
                                                            {exp.paymentProofs
                                                                ?.length >
                                                                0 && (
                                                                <span
                                                                    title={`${exp.paymentProofs.length} payment proof screenshot(s)`}
                                                                    className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400"
                                                                >
                                                                    <ImageIcon className="w-3 h-3 mr-0.5" />
                                                                    {
                                                                        exp
                                                                            .paymentProofs
                                                                            .length
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="font-semibold text-sm truncate">
                                                            {exp.title}
                                                        </p>
                                                        {exp.vendorName && (
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {exp.vendorName}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {exp.batch ? (
                                                        <div
                                                            className="space-y-0.5"
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        >
                                                            <Link
                                                                to={`/batches/${exp.batchId}`}
                                                                className="text-xs font-semibold hover:underline block"
                                                            >
                                                                {exp.batch
                                                                    .package
                                                                    ?.name ||
                                                                    "View Batch"}
                                                            </Link>
                                                            <span className="text-[11px] text-muted-foreground">
                                                                {format(
                                                                    new Date(
                                                                        exp.batch.startDate,
                                                                    ),
                                                                    "MMM d",
                                                                )}{" "}
                                                                –{" "}
                                                                {format(
                                                                    new Date(
                                                                        exp.batch.endDate,
                                                                    ),
                                                                    "MMM d, yyyy",
                                                                )}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[11px] font-medium"
                                                        >
                                                            {EXPENSE_CATEGORY_LABELS[
                                                                exp.category
                                                            ] || exp.category}
                                                        </Badge>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {EXPENSE_PAYMENT_TYPE_LABELS[
                                                                exp.paymentType
                                                            ] ||
                                                                exp.paymentType}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1.5 text-xs font-medium">
                                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                                            {format(
                                                                new Date(
                                                                    exp.transferDate,
                                                                ),
                                                                "MMM d, yyyy",
                                                            )}
                                                        </div>
                                                        {isOverdue && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                Overdue
                                                            </span>
                                                        )}
                                                        {isDueToday && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                                <Clock className="w-3 h-3" />
                                                                Due Today
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-sm">
                                                    {ExpenseService.formatCurrency(
                                                        exp.amount,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[11px] font-semibold inline-flex items-center gap-1.5 ${statusCfg.badgeClass}`}
                                                    >
                                                        <span
                                                            className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`}
                                                        />
                                                        {statusCfg.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-muted-foreground">
                                                        {exp.requestedBy
                                                            ?.name ||
                                                            exp.requestedBy
                                                                ?.email ||
                                                            "—"}
                                                    </span>
                                                </TableCell>
                                                <TableCell
                                                    className="text-right"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {exp.status ===
                                                            "pending" &&
                                                            canApprove && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/50"
                                                                    onClick={() =>
                                                                        setApproveTarget(
                                                                            exp,
                                                                        )
                                                                    }
                                                                >
                                                                    Approve
                                                                </Button>
                                                            )}
                                                        {exp.status ===
                                                            "approved" &&
                                                            canMarkSent && (
                                                                <Button
                                                                    size="sm"
                                                                    className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                    onClick={() =>
                                                                        setSentTarget(
                                                                            exp,
                                                                        )
                                                                    }
                                                                >
                                                                    Mark Sent
                                                                </Button>
                                                            )}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/expenses/${exp.id}`,
                                                                )
                                                            }
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="p-4 border-t">
                            <DataTableFooter
                                page={page}
                                limit={limit}
                                total={total}
                                totalPages={totalPages}
                                onPageChange={setPage}
                                onLimitChange={(newLimit) => {
                                    setLimit(newLimit);
                                    setPage(1);
                                }}
                                entityName="expenses"
                            />
                        </div>
                    </>
                )}
            </Card>

            {/* Quick Action Dialogs */}
            <ApproveExpenseDialog
                open={!!approveTarget}
                onOpenChange={(open) => !open && setApproveTarget(null)}
                expense={approveTarget}
                canMarkSent={canMarkSent}
                onSuccess={() => fetchExpenses()}
            />

            <MarkSentExpenseDialog
                open={!!sentTarget}
                onOpenChange={(open) => !open && setSentTarget(null)}
                expense={sentTarget}
                onSuccess={() => fetchExpenses()}
            />
        </div>
    );
}
