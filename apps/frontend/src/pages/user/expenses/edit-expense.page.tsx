import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import ExpenseService from "@/services/expense.service";
import type {
    CreateExpensePayload,
    IBatchExpense,
} from "@/types/expense.types";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ExpenseForm } from "./_components/expense-form";

export default function EditExpensePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [expense, setExpense] = useState<IBatchExpense | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            setLoading(true);
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
        };
        load();
    }, [id, navigate]);

    const handleSubmit = async (payload: CreateExpensePayload) => {
        if (!id) return;
        setSubmitting(true);
        try {
            const updated = await ExpenseService.update(id, payload);
            toast.success(`Expense #${updated.expenseNumber} updated`);
            navigate(`/expenses/${updated.id}`);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Failed to update expense",
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-72" />
                <Skeleton className="h-96 w-full rounded-xl" />
            </div>
        );
    }

    if (!expense) return null;

    return (
        <div className="p-6 space-y-6">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link
                                to={`/expenses/${expense.id}`}
                                className="inline-flex items-center gap-1.5"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />#
                                {expense.expenseNumber}
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Edit Expense</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Edit Expense Request{" "}
                    <span className="font-mono text-muted-foreground text-xl">
                        #{expense.expenseNumber}
                    </span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Update payment details, transfer account, or required date.
                    All modifications are logged automatically.
                </p>
            </div>

            <ExpenseForm
                initialData={expense}
                isEdit
                onSubmit={handleSubmit}
                onCancel={() => navigate(`/expenses/${expense.id}`)}
                submitting={submitting}
            />
        </div>
    );
}
