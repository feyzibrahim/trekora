import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TypableDatePicker } from "@/components/ui/typable-date-picker";
import axiosInstance from "@/lib/axios";
import { getFileUrl } from "@/lib/utils";
import ExpenseService from "@/services/expense.service";
import type { IBatches } from "@/types/batches.types";
import {
    EXPENSE_CATEGORY_LABELS,
    EXPENSE_PAYMENT_MODE_LABELS,
    EXPENSE_PAYMENT_TYPE_LABELS,
    type CreateExpensePayload,
    type ExpenseCategory,
    type ExpensePaymentMode,
    type ExpensePaymentType,
    type IBatchExpense,
} from "@/types/expense.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

function getTodayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const createExpenseSchema = (isEdit: boolean) =>
    z.object({
        batchId: z.string().min(1, "Please select a batch"),
        title: z.string().trim().min(2, "Expense title is required").max(255),
        category: z.enum([
            "ticket_booking",
            "hotel_booking",
            "cab_booking",
            "food",
            "activity",
            "guide_fees",
            "permits",
            "equipment",
            "miscellaneous",
        ]),
        paymentType: z.enum([
            "advance",
            "partial",
            "full",
            "balance",
            "reimbursement",
        ]),
        amount: z.coerce
            .number()
            .positive("Amount must be greater than 0"),
        vendorName: z.string().max(255).optional().or(z.literal("")),
        paymentMode: z.enum([
            "bank_transfer",
            "upi",
            "cash",
            "card",
            "other",
        ]),
        transferAccount: z
            .string()
            .trim()
            .min(3, "Transfer account / UPI details are required"),
        transferDate: z
            .string()
            .min(1, "Transfer date is required")
            .refine(
                (val) => isEdit || val >= getTodayString(),
                "Transfer date must be today or a future date",
            ),
        remarks: z.string().optional().or(z.literal("")),
    });

type FormValues = z.infer<ReturnType<typeof createExpenseSchema>>;

interface ExpenseFormProps {
    initialData?: IBatchExpense;
    defaultBatchId?: string;
    isEdit?: boolean;
    onSubmit: (payload: CreateExpensePayload) => Promise<void>;
    onCancel: () => void;
    submitting?: boolean;
}

export function ExpenseForm({
    initialData,
    defaultBatchId,
    isEdit = false,
    onSubmit,
    onCancel,
    submitting = false,
}: ExpenseFormProps) {
    const [batches, setBatches] = useState<IBatches[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(true);
    const [billAttachments, setBillAttachments] = useState<string[]>(
        initialData?.billAttachments || [],
    );
    const [uploading, setUploading] = useState(false);

    const todayStr = getTodayString();

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(createExpenseSchema(isEdit)) as any,
        defaultValues: {
            batchId: initialData?.batchId || defaultBatchId || "",
            title: initialData?.title || "",
            category: (initialData?.category ||
                "ticket_booking") as ExpenseCategory,
            paymentType: (initialData?.paymentType ||
                "advance") as ExpensePaymentType,
            amount: initialData ? Number(initialData.amount) : undefined,
            vendorName: initialData?.vendorName || "",
            paymentMode: (initialData?.paymentMode ||
                "bank_transfer") as ExpensePaymentMode,
            transferAccount: initialData?.transferAccount || "",
            transferDate: initialData?.transferDate
                ? initialData.transferDate.slice(0, 10)
                : todayStr,
            remarks: initialData?.remarks || "",
        },
    });

    useEffect(() => {
        const fetchBatches = async () => {
            setLoadingBatches(true);
            try {
                const res = await axiosInstance.get("/batches", {
                    params: { page: 1, limit: 200 },
                });
                const list = Array.isArray(res.data)
                    ? res.data
                    : res.data?.data || [];
                setBatches(list);
            } catch {
                toast.error("Failed to load batches");
            } finally {
                setLoadingBatches(false);
            }
        };
        fetchBatches();
    }, []);

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const uploaded: string[] = [];
            for (const file of Array.from(files)) {
                const path = await ExpenseService.uploadFile(file);
                uploaded.push(path);
            }
            setBillAttachments((prev) => [...prev, ...uploaded]);
            toast.success(`Attached ${uploaded.length} file(s)`);
        } catch {
            toast.error("Failed to upload supporting document");
        } finally {
            setUploading(false);
        }
    };

    const handleFormSubmit = async (values: FormValues) => {
        await onSubmit({
            batchId: values.batchId,
            title: values.title.trim(),
            category: values.category,
            paymentType: values.paymentType,
            amount: Number(values.amount),
            vendorName: values.vendorName?.trim() || undefined,
            paymentMode: values.paymentMode,
            transferAccount: values.transferAccount.trim(),
            transferDate: values.transferDate,
            remarks: values.remarks?.trim() || undefined,
            billAttachments,
        });
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <Card className="border-border/80 shadow-xs">
                <CardHeader className="border-b pb-4">
                    <CardTitle className="text-base font-bold">
                        Expense & Batch Details
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Select the trip batch, expense category, payment stage,
                        and requested amount.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2 md:col-span-2">
                            <Label>Trip Batch *</Label>
                            <Controller
                                control={control}
                                name="batchId"
                                render={({ field }) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        disabled={loadingBatches}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue
                                                placeholder={
                                                    loadingBatches
                                                        ? "Loading batches..."
                                                        : "Select a batch"
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {batches.map((b) => (
                                                <SelectItem
                                                    key={b.id}
                                                    value={b.id}
                                                >
                                                    {b.package?.name ||
                                                        "Package"}{" "}
                                                    •{" "}
                                                    {format(
                                                        new Date(b.startDate),
                                                        "MMM d, yyyy",
                                                    )}{" "}
                                                    –{" "}
                                                    {format(
                                                        new Date(b.endDate),
                                                        "MMM d, yyyy",
                                                    )}{" "}
                                                    ({b.status})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.batchId && (
                                <p className="text-xs text-destructive">
                                    {errors.batchId.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Expense Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Hotel Snow Peak Group Advance"
                                {...register("title")}
                            />
                            {errors.title && (
                                <p className="text-xs text-destructive">
                                    {errors.title.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="vendorName">
                                Vendor / Payee Name (Optional)
                            </Label>
                            <Input
                                id="vendorName"
                                placeholder="e.g., IndiGo / Snow Peak Resorts / Rajesh Cabs"
                                {...register("vendorName")}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Category *</Label>
                            <Controller
                                control={control}
                                name="category"
                                render={({ field }) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(
                                                Object.entries(
                                                    EXPENSE_CATEGORY_LABELS,
                                                ) as [ExpenseCategory, string][]
                                            ).map(([val, label]) => (
                                                <SelectItem
                                                    key={val}
                                                    value={val}
                                                >
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Type / Stage *</Label>
                            <Controller
                                control={control}
                                name="paymentType"
                                render={({ field }) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(
                                                Object.entries(
                                                    EXPENSE_PAYMENT_TYPE_LABELS,
                                                ) as [
                                                    ExpensePaymentType,
                                                    string,
                                                ][]
                                            ).map(([val, label]) => (
                                                <SelectItem
                                                    key={val}
                                                    value={val}
                                                >
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (₹) *</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                className="font-mono"
                                {...register("amount")}
                            />
                            {errors.amount && (
                                <p className="text-xs text-destructive">
                                    {errors.amount.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="transferDate">
                                Required Transfer Date *
                            </Label>
                            <Controller
                                control={control}
                                name="transferDate"
                                render={({ field }) => (
                                    <TypableDatePicker
                                        id="transferDate"
                                        value={field.value}
                                        onChange={field.onChange}
                                        min={isEdit ? undefined : todayStr}
                                        placeholder="DD-MM-YYYY"
                                        required
                                    />
                                )}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Select today or a future date when this payment
                                must be sent.
                            </p>
                            {errors.transferDate && (
                                <p className="text-xs text-destructive">
                                    {errors.transferDate.message}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs">
                <CardHeader className="border-b pb-4">
                    <CardTitle className="text-base font-bold">
                        Transfer Account & Remarks
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Provide payee bank or UPI details for the finance team
                        to execute the transfer.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <Label>Payment Mode *</Label>
                            <Controller
                                control={control}
                                name="paymentMode"
                                render={({ field }) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(
                                                Object.entries(
                                                    EXPENSE_PAYMENT_MODE_LABELS,
                                                ) as [
                                                    ExpensePaymentMode,
                                                    string,
                                                ][]
                                            ).map(([val, label]) => (
                                                <SelectItem
                                                    key={val}
                                                    value={val}
                                                >
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="transferAccount">
                                Transfer Account Details (Bank A/C + IFSC or UPI
                                ID) *
                            </Label>
                            <Textarea
                                id="transferAccount"
                                rows={2}
                                placeholder="e.g., A/C Name: Snow Peak Resorts | A/C: 123456789012 | IFSC: HDFC0001234  OR  UPI: snowpeak@okhdfcbank"
                                {...register("transferAccount")}
                            />
                            {errors.transferAccount && (
                                <p className="text-xs text-destructive">
                                    {errors.transferAccount.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="remarks">Remarks (Optional)</Label>
                            <Textarea
                                id="remarks"
                                rows={3}
                                placeholder="Add context, breakdown (e.g., 12 rooms x 2 nights advance), or urgency notes..."
                                {...register("remarks")}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>
                                Supporting Bills / Quotes (Optional)
                            </Label>
                            <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/40 transition-colors text-xs text-muted-foreground">
                                {uploading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                ) : (
                                    <Upload className="w-4 h-4 text-primary" />
                                )}
                                <span>
                                    {uploading
                                        ? "Uploading files..."
                                        : "Click to attach quotation, proforma invoice, or bill screenshot"}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    multiple
                                    className="hidden"
                                    onChange={(e) =>
                                        handleFileUpload(e.target.files)
                                    }
                                    disabled={uploading}
                                />
                            </label>
                            {billAttachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {billAttachments.map((filePath, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-muted/40 text-xs"
                                        >
                                            <FileText className="w-3.5 h-3.5 text-primary" />
                                            <a
                                                href={getFileUrl(filePath)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="hover:underline max-w-[180px] truncate"
                                            >
                                                Attachment {idx + 1}
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setBillAttachments((prev) =>
                                                        prev.filter(
                                                            (_, i) => i !== idx,
                                                        ),
                                                    )
                                                }
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={submitting || uploading}>
                    {submitting && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {isEdit ? "Save Changes" : "Submit Expense Request"}
                </Button>
            </div>
        </form>
    );
}
