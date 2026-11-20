import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import ExpenseService from "@/services/expense.service";
import type { CreateExpensePayload } from "@/types/expense.types";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ExpenseForm } from "./_components/expense-form";

export default function CreateExpensePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const defaultBatchId = searchParams.get("batchId") || undefined;
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (payload: CreateExpensePayload) => {
        setSubmitting(true);
        try {
            const created = await ExpenseService.create(payload);
            toast.success(
                `Expense request #${created.expenseNumber} submitted`,
            );
            navigate(`/expenses/${created.id}`);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message ||
                    "Failed to create expense request",
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link
                                to={
                                    defaultBatchId
                                        ? `/batches/${defaultBatchId}`
                                        : "/expenses"
                                }
                                className="inline-flex items-center gap-1.5"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                {defaultBatchId ? "Back to Batch" : "Expenses"}
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Request Expense</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Request Batch Expense
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Submit a payment request for trip expenses (tickets, hotels,
                    cabs, food, etc.) to the finance team.
                </p>
            </div>

            <ExpenseForm
                defaultBatchId={defaultBatchId}
                onSubmit={handleSubmit}
                onCancel={() =>
                    navigate(
                        defaultBatchId
                            ? `/batches/${defaultBatchId}`
                            : "/expenses",
                    )
                }
                submitting={submitting}
            />
        </div>
    );
}
