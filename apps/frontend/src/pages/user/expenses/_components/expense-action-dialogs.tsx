import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getFileUrl } from "@/lib/utils";
import ExpenseService from "@/services/expense.service";
import type { IBatchExpense } from "@/types/expense.types";
import {
    CheckCircle2,
    ImagePlus,
    Loader2,
    Send,
    Trash2,
    Upload,
    XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface BaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    expense: IBatchExpense | null;
    onSuccess: (updated: IBatchExpense) => void;
}

/* ==================== APPROVE DIALOG ==================== */
export function ApproveExpenseDialog({
    open,
    onOpenChange,
    expense,
    onSuccess,
    canMarkSent = false,
}: BaseDialogProps & { canMarkSent?: boolean }) {
    const [financeRemarks, setFinanceRemarks] = useState("");
    const [markAsSent, setMarkAsSent] = useState(false);
    const [transactionReference, setTransactionReference] = useState("");
    const [proofPaths, setProofPaths] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const uploaded: string[] = [];
            for (const file of Array.from(files)) {
                const path = await ExpenseService.uploadFile(file);
                uploaded.push(path);
            }
            setProofPaths((prev) => [...prev, ...uploaded]);
            toast.success(`Uploaded ${uploaded.length} screenshot(s)`);
        } catch {
            toast.error("Failed to upload screenshot");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!expense) return;
        setSubmitting(true);
        try {
            const updated = await ExpenseService.approve(expense.id, {
                financeRemarks: financeRemarks.trim() || undefined,
                markAsSent,
                transactionReference: markAsSent
                    ? transactionReference.trim() || undefined
                    : undefined,
                paymentProofs: markAsSent ? proofPaths : undefined,
            });
            toast.success(
                markAsSent
                    ? "Expense approved and marked as sent"
                    : "Expense request approved",
            );
            setFinanceRemarks("");
            setMarkAsSent(false);
            setTransactionReference("");
            setProofPaths([]);
            onOpenChange(false);
            onSuccess(updated);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Failed to approve expense",
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        Approve Expense Request
                    </DialogTitle>
                    <DialogDescription>
                        {expense && (
                            <>
                                Approve{" "}
                                <span className="font-mono font-semibold text-foreground">
                                    #{expense.expenseNumber}
                                </span>{" "}
                                for{" "}
                                <span className="font-mono font-semibold text-foreground">
                                    {ExpenseService.formatCurrency(
                                        expense.amount,
                                    )}
                                </span>
                                .
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="approve-remarks">
                            Finance Remarks (Optional)
                        </Label>
                        <Textarea
                            id="approve-remarks"
                            placeholder="Add approval note or instructions..."
                            value={financeRemarks}
                            onChange={(e) => setFinanceRemarks(e.target.value)}
                            rows={2}
                        />
                    </div>

                    {canMarkSent && (
                        <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">
                                    Also mark as Sent immediately
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Record disbursement reference & upload
                                    screenshots now
                                </p>
                            </div>
                            <Switch
                                checked={markAsSent}
                                onCheckedChange={setMarkAsSent}
                            />
                        </div>
                    )}

                    {markAsSent && (
                        <div className="space-y-3 rounded-lg border p-3 bg-emerald-500/5 border-emerald-500/20">
                            <div className="space-y-1.5">
                                <Label htmlFor="approve-tx-ref">
                                    UTR / Transaction Reference (Optional)
                                </Label>
                                <Input
                                    id="approve-tx-ref"
                                    placeholder="e.g., UTR1234567890"
                                    value={transactionReference}
                                    onChange={(e) =>
                                        setTransactionReference(e.target.value)
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Proof Screenshots</Label>
                                <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted/40 transition-colors text-xs text-muted-foreground">
                                    {uploading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4" />
                                    )}
                                    <span>
                                        {uploading
                                            ? "Uploading..."
                                            : "Click to upload payment screenshots"}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        multiple
                                        className="hidden"
                                        onChange={(e) =>
                                            handleUpload(e.target.files)
                                        }
                                        disabled={uploading}
                                    />
                                </label>
                                {proofPaths.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {proofPaths.map((p, idx) => (
                                            <div
                                                key={idx}
                                                className="relative group rounded-md overflow-hidden border h-16 bg-muted"
                                            >
                                                <img
                                                    src={getFileUrl(p)}
                                                    alt="Proof"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setProofPaths((prev) =>
                                                            prev.filter(
                                                                (_, i) =>
                                                                    i !== idx,
                                                            ),
                                                        )
                                                    }
                                                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || uploading}
                        className={
                            markAsSent
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : ""
                        }
                    >
                        {submitting && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        {markAsSent ? "Approve & Mark Sent" : "Approve Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ==================== MARK AS SENT DIALOG ==================== */
export function MarkSentExpenseDialog({
    open,
    onOpenChange,
    expense,
    onSuccess,
}: BaseDialogProps) {
    const [transactionReference, setTransactionReference] = useState("");
    const [financeRemarks, setFinanceRemarks] = useState("");
    const [proofPaths, setProofPaths] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const uploaded: string[] = [];
            for (const file of Array.from(files)) {
                const path = await ExpenseService.uploadFile(file);
                uploaded.push(path);
            }
            setProofPaths((prev) => [...prev, ...uploaded]);
            toast.success(`Uploaded ${uploaded.length} screenshot(s)`);
        } catch {
            toast.error("Failed to upload screenshot");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!expense) return;
        setSubmitting(true);
        try {
            const updated = await ExpenseService.markAsSent(expense.id, {
                transactionReference: transactionReference.trim() || undefined,
                financeRemarks: financeRemarks.trim() || undefined,
                paymentProofs: proofPaths,
            });
            toast.success("Expense marked as sent");
            setTransactionReference("");
            setFinanceRemarks("");
            setProofPaths([]);
            onOpenChange(false);
            onSuccess(updated);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message ||
                    "Failed to mark expense as sent",
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-emerald-600" />
                        Mark Payment as Sent
                    </DialogTitle>
                    <DialogDescription>
                        {expense && (
                            <>
                                Confirm transfer of{" "}
                                <span className="font-mono font-semibold text-foreground">
                                    {ExpenseService.formatCurrency(
                                        expense.amount,
                                    )}
                                </span>{" "}
                                to{" "}
                                <span className="font-medium text-foreground">
                                    {expense.transferAccount}
                                </span>
                                .
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="sent-tx-ref">
                            UTR / Transaction Reference (Optional)
                        </Label>
                        <Input
                            id="sent-tx-ref"
                            placeholder="e.g., UTR / IMPS / UPI Ref No."
                            value={transactionReference}
                            onChange={(e) =>
                                setTransactionReference(e.target.value)
                            }
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="sent-remarks">
                            Finance Remarks (Optional)
                        </Label>
                        <Textarea
                            id="sent-remarks"
                            placeholder="Any notes about the transfer..."
                            value={financeRemarks}
                            onChange={(e) => setFinanceRemarks(e.target.value)}
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Proof Screenshots (Optional)</Label>
                        <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/40 transition-colors text-xs text-muted-foreground">
                            {uploading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            ) : (
                                <ImagePlus className="w-5 h-5 text-primary" />
                            )}
                            <span className="font-medium text-foreground">
                                {uploading
                                    ? "Uploading screenshots..."
                                    : "Upload transfer screenshots or receipts"}
                            </span>
                            <span className="text-[11px]">
                                PNG, JPG, WEBP or PDF
                            </span>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                multiple
                                className="hidden"
                                onChange={(e) => handleUpload(e.target.files)}
                                disabled={uploading}
                            />
                        </label>
                        {proofPaths.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {proofPaths.map((p, idx) => (
                                    <div
                                        key={idx}
                                        className="relative group rounded-md overflow-hidden border h-20 bg-muted"
                                    >
                                        <img
                                            src={getFileUrl(p)}
                                            alt={`Proof ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setProofPaths((prev) =>
                                                    prev.filter(
                                                        (_, i) => i !== idx,
                                                    ),
                                                )
                                            }
                                            className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || uploading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {submitting && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Confirm & Mark Sent
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ==================== REJECT DIALOG ==================== */
export function RejectExpenseDialog({
    open,
    onOpenChange,
    expense,
    onSuccess,
}: BaseDialogProps) {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!expense) return;
        if (!reason.trim()) {
            toast.error("Please provide a rejection reason");
            return;
        }
        setSubmitting(true);
        try {
            const updated = await ExpenseService.reject(
                expense.id,
                reason.trim(),
            );
            toast.success("Expense request rejected");
            setReason("");
            onOpenChange(false);
            onSuccess(updated);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Failed to reject expense",
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-rose-600">
                        <XCircle className="w-5 h-5" />
                        Reject Expense Request
                    </DialogTitle>
                    <DialogDescription>
                        Provide a clear reason for rejecting{" "}
                        <span className="font-mono font-semibold text-foreground">
                            #{expense?.expenseNumber}
                        </span>
                        .
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 py-2">
                    <Label htmlFor="reject-reason">Rejection Reason *</Label>
                    <Textarea
                        id="reject-reason"
                        placeholder="e.g., Duplicate request, missing invoice, wrong amount..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                    />
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleSubmit}
                        disabled={submitting || !reason.trim()}
                    >
                        {submitting && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Reject Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ==================== UPLOAD ADDITIONAL PROOFS DIALOG ==================== */
export function UploadProofsDialog({
    open,
    onOpenChange,
    expense,
    onSuccess,
}: BaseDialogProps) {
    const [proofPaths, setProofPaths] = useState<string[]>([]);
    const [note, setNote] = useState("");
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const uploaded: string[] = [];
            for (const file of Array.from(files)) {
                const path = await ExpenseService.uploadFile(file);
                uploaded.push(path);
            }
            setProofPaths((prev) => [...prev, ...uploaded]);
            toast.success(`Uploaded ${uploaded.length} file(s)`);
        } catch {
            toast.error("Failed to upload file");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!expense || proofPaths.length === 0) return;
        setSubmitting(true);
        try {
            const updated = await ExpenseService.addProofs(
                expense.id,
                proofPaths,
                note.trim() || undefined,
            );
            toast.success("Payment proof screenshots added");
            setProofPaths([]);
            setNote("");
            onOpenChange(false);
            onSuccess(updated);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Failed to attach proofs",
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImagePlus className="w-5 h-5 text-primary" />
                        Upload Payment Evidence
                    </DialogTitle>
                    <DialogDescription>
                        Attach additional screenshots or receipts to{" "}
                        <span className="font-mono font-semibold text-foreground">
                            #{expense?.expenseNumber}
                        </span>
                        .
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-lg p-5 cursor-pointer hover:bg-muted/40 transition-colors text-xs text-muted-foreground">
                        {uploading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        ) : (
                            <Upload className="w-5 h-5 text-primary" />
                        )}
                        <span className="font-medium text-foreground">
                            {uploading
                                ? "Uploading..."
                                : "Click to select screenshots"}
                        </span>
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            multiple
                            className="hidden"
                            onChange={(e) => handleUpload(e.target.files)}
                            disabled={uploading}
                        />
                    </label>

                    {proofPaths.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            {proofPaths.map((p, idx) => (
                                <div
                                    key={idx}
                                    className="relative group rounded-md overflow-hidden border h-20 bg-muted"
                                >
                                    <img
                                        src={getFileUrl(p)}
                                        alt={`Proof ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setProofPaths((prev) =>
                                                prev.filter(
                                                    (_, i) => i !== idx,
                                                ),
                                            )
                                        }
                                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="proof-note">Note (Optional)</Label>
                        <Input
                            id="proof-note"
                            placeholder="e.g., Bank statement screenshot"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={
                            submitting || uploading || proofPaths.length === 0
                        }
                    >
                        {submitting && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Save Screenshots
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
