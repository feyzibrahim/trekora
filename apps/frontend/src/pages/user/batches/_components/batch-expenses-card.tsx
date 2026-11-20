import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useHasPermission } from "@/hooks/use-permissions";
import ExpenseService from "@/services/expense.service";
import {
    EXPENSE_CATEGORY_LABELS,
    EXPENSE_PAYMENT_TYPE_LABELS,
    EXPENSE_STATUS_CONFIG,
    type IBatchExpense,
    type IExpenseSummary,
} from "@/types/expense.types";
import { format } from "date-fns";
import {
    ExternalLink,
    Image as ImageIcon,
    Plus,
    Receipt,
    Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ApproveExpenseDialog,
    MarkSentExpenseDialog,
} from "../../expenses/_components/expense-action-dialogs";

interface BatchExpensesCardProps {
    batchId: string;
}

export function BatchExpensesCard({ batchId }: BatchExpensesCardProps) {
    const navigate = useNavigate();
    const { hasPermission: canApprove } = useHasPermission(
        "expense",
        "approve",
    );
    const { hasPermission: canMarkSent } = useHasPermission(
        "expense",
        "mark_sent",
    );

    const [expenses, setExpenses] = useState<IBatchExpense[]>([]);
    const [summary, setSummary] = useState<IExpenseSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [approveTarget, setApproveTarget] = useState<IBatchExpense | null>(
        null,
    );
    const [sentTarget, setSentTarget] = useState<IBatchExpense | null>(null);

    const fetchBatchExpenses = useCallback(async () => {
        if (!batchId) return;
        setLoading(true);
        try {
            const res = await ExpenseService.getByBatch(batchId);
            setExpenses(res.data || []);
            setSummary(res.summary || null);
        } catch (err) {
            console.error("Failed to fetch batch expenses", err);
        } finally {
            setLoading(false);
        }
    }, [batchId]);

    useEffect(() => {
        fetchBatchExpenses();
    }, [fetchBatchExpenses]);

    return (
        <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-primary" />
                            Batch Expenses
                            <Badge
                                variant="secondary"
                                className="font-mono text-xs font-normal"
                            >
                                {expenses.length}
                            </Badge>
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Coordinator trip expense requests, finance
                            approvals, and disbursements for this batch
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link to={`/expenses?batchId=${batchId}`}>
                                View All
                                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                            </Link>
                        </Button>
                        <Button
                            size="sm"
                            onClick={() =>
                                navigate(`/expenses/create?batchId=${batchId}`)
                            }
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Request Expense
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
                {loading ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-16 rounded-lg" />
                            ))}
                        </div>
                        <Skeleton className="h-32 w-full rounded-lg" />
                    </div>
                ) : (
                    <>
                        {/* Compact Summary Metrics */}
                        {summary && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3 rounded-xl bg-muted/30 border">
                                    <span className="text-[11px] text-muted-foreground block font-medium">
                                        Total Active
                                    </span>
                                    <span className="text-base font-extrabold font-mono text-foreground">
                                        {ExpenseService.formatCurrency(
                                            summary.totalAmount,
                                        )}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <span className="text-[11px] text-amber-800 dark:text-amber-300 block font-medium">
                                        Pending ({summary.pendingCount})
                                    </span>
                                    <span className="text-base font-extrabold font-mono text-amber-700 dark:text-amber-300">
                                        {ExpenseService.formatCurrency(
                                            summary.pendingAmount,
                                        )}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <span className="text-[11px] text-blue-800 dark:text-blue-300 block font-medium">
                                        Approved ({summary.approvedCount})
                                    </span>
                                    <span className="text-base font-extrabold font-mono text-blue-700 dark:text-blue-300">
                                        {ExpenseService.formatCurrency(
                                            summary.approvedAmount,
                                        )}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block font-medium">
                                        Sent ({summary.sentCount})
                                    </span>
                                    <span className="text-base font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                                        {ExpenseService.formatCurrency(
                                            summary.sentAmount,
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}

                        {expenses.length === 0 ? (
                            <div className="text-center py-8 border border-dashed rounded-xl space-y-2">
                                <Receipt className="w-7 h-7 text-muted-foreground mx-auto" />
                                <p className="text-sm font-medium">
                                    No expenses recorded for this batch yet
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Coordinators can request ticket, hotel, cab,
                                    or food payments here.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-lg border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Expense</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Transfer Date</TableHead>
                                            <TableHead className="text-right">
                                                Amount
                                            </TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">
                                                Action
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {expenses.map((exp) => {
                                            const cfg =
                                                EXPENSE_STATUS_CONFIG[
                                                    exp.status
                                                ];
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
                                                        <div className="space-y-0.5 max-w-[200px]">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                                    #
                                                                    {
                                                                        exp.expenseNumber
                                                                    }
                                                                </span>
                                                                {exp
                                                                    .paymentProofs
                                                                    ?.length >
                                                                    0 && (
                                                                    <ImageIcon className="w-3 h-3 text-emerald-600" />
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-semibold truncate">
                                                                {exp.title}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs">
                                                            <span className="font-medium block">
                                                                {EXPENSE_CATEGORY_LABELS[
                                                                    exp.category
                                                                ] ||
                                                                    exp.category}
                                                            </span>
                                                            <span className="text-[11px] text-muted-foreground">
                                                                {EXPENSE_PAYMENT_TYPE_LABELS[
                                                                    exp
                                                                        .paymentType
                                                                ] ||
                                                                    exp.paymentType}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {format(
                                                            new Date(
                                                                exp.transferDate,
                                                            ),
                                                            "MMM d, yyyy",
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-xs">
                                                        {ExpenseService.formatCurrency(
                                                            exp.amount,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] font-semibold ${cfg.badgeClass}`}
                                                        >
                                                            {cfg.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell
                                                        className="text-right"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        <div className="flex items-center justify-end gap-1">
                                                            {exp.status ===
                                                                "pending" &&
                                                                canApprove && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-7 px-2 text-[11px]"
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
                                                                        className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                        onClick={() =>
                                                                            setSentTarget(
                                                                                exp,
                                                                            )
                                                                        }
                                                                    >
                                                                        Mark
                                                                        Sent
                                                                    </Button>
                                                                )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </>
                )}
            </CardContent>

            <ApproveExpenseDialog
                open={!!approveTarget}
                onOpenChange={(o) => !o && setApproveTarget(null)}
                expense={approveTarget}
                canMarkSent={canMarkSent}
                onSuccess={() => fetchBatchExpenses()}
            />
            <MarkSentExpenseDialog
                open={!!sentTarget}
                onOpenChange={(o) => !o && setSentTarget(null)}
                expense={sentTarget}
                onSuccess={() => fetchBatchExpenses()}
            />
        </Card>
    );
}
