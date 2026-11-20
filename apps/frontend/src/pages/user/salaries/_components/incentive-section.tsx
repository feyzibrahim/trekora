import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SalarySlipService } from "@/services/salary-slip.service";
import type { IncentiveMode, ISalaryIncentiveItem } from "@/types/salary.types";
import { Plus, Table2, Trash2, Wallet } from "lucide-react";

export interface IncentiveRowDraft {
    id: string;
    name: string;
    type: string;
    amount: string;
    count: string;
}

export function createEmptyIncentiveRow(): IncentiveRowDraft {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: "",
        type: "",
        amount: "",
        count: "1",
    };
}

export function toIncentiveRowDrafts(
    items?: ISalaryIncentiveItem[] | null
): IncentiveRowDraft[] {
    if (!items || items.length === 0) {
        return [createEmptyIncentiveRow()];
    }
    return items.map((item, idx) => ({
        id: `loaded-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        name: item.name || "",
        type: item.type || "",
        amount:
            Number(item.amount) !== 0 && Number.isFinite(Number(item.amount))
                ? String(item.amount)
                : "",
        count:
            Number(item.count) !== 0 && Number.isFinite(Number(item.count))
                ? String(item.count)
                : "",
    }));
}

export function serializeIncentiveRows(
    rows: IncentiveRowDraft[]
): ISalaryIncentiveItem[] {
    return rows
        .map((row) => {
            const amount = Number(row.amount) || 0;
            const count = Number(row.count) || 0;
            const total = Math.round(amount * count * 100) / 100;
            return {
                name: row.name.trim(),
                type: row.type.trim(),
                amount,
                count,
                total,
            };
        })
        .filter(
            (item) =>
                item.name !== "" ||
                item.type !== "" ||
                item.amount !== 0 ||
                item.count !== 0
        );
}

export function computeIncentiveRowsTotal(rows: IncentiveRowDraft[]): number {
    const sum = rows.reduce((acc, row) => {
        const amount = Number(row.amount) || 0;
        const count = Number(row.count) || 0;
        return acc + amount * count;
    }, 0);
    return Math.round(sum * 100) / 100;
}

interface IncentiveSectionProps {
    mode: IncentiveMode;
    onModeChange: (mode: IncentiveMode) => void;
    simpleAmount: string;
    onSimpleAmountChange: (val: string) => void;
    simpleNote: string;
    onSimpleNoteChange: (val: string) => void;
    rows: IncentiveRowDraft[];
    onRowsChange: (rows: IncentiveRowDraft[]) => void;
}

export function IncentiveSection({
    mode,
    onModeChange,
    simpleAmount,
    onSimpleAmountChange,
    simpleNote,
    onSimpleNoteChange,
    rows,
    onRowsChange,
}: IncentiveSectionProps) {
    const fmt = (v: number) => SalarySlipService.formatCurrency(v);
    const tableTotal = computeIncentiveRowsTotal(rows);

    const handleAddRow = () => {
        onRowsChange([...rows, createEmptyIncentiveRow()]);
    };

    const handleRemoveRow = (id: string) => {
        if (rows.length <= 1) {
            onRowsChange([createEmptyIncentiveRow()]);
            return;
        }
        onRowsChange(rows.filter((r) => r.id !== id));
    };

    const handleUpdateRow = (
        id: string,
        field: keyof Omit<IncentiveRowDraft, "id">,
        value: string
    ) => {
        onRowsChange(
            rows.map((row) =>
                row.id === id ? { ...row, [field]: value } : row
            )
        );
    };

    return (
        <div className="p-4 rounded-lg border-2 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-4">
            {/* Header & Mode Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        Additional Incentive / Bonus
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                        {mode === "simple"
                            ? "Enter a single lump-sum incentive amount and optional note."
                            : "Add multiple incentive rows with amount × count. Table total is added to gross earnings."}
                    </div>
                </div>

                <div className="inline-flex items-center rounded-md border border-emerald-500/30 bg-background p-0.5 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => onModeChange("simple")}
                        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                            mode === "simple"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Wallet className="w-3.5 h-3.5" />
                        Simple
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (rows.length === 0) {
                                onRowsChange([createEmptyIncentiveRow()]);
                            }
                            onModeChange("itemized");
                        }}
                        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                            mode === "itemized"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Table2 className="w-3.5 h-3.5" />
                        Itemized Table
                    </button>
                </div>
            </div>

            {mode === "simple" ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            Additional Incentive / Bonus (₹)
                        </Label>
                        <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={simpleAmount}
                            onChange={(e) =>
                                onSimpleAmountChange(e.target.value)
                            }
                            className="border-emerald-300 font-mono font-bold bg-background"
                        />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs font-semibold">
                            Incentive Description / Note (Optional)
                        </Label>
                        <Input
                            placeholder="e.g., Sales Target Achievement / Festival Bonus"
                            value={simpleNote}
                            onChange={(e) => onSimpleNoteChange(e.target.value)}
                            className="bg-background"
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="overflow-x-auto rounded-md border border-emerald-500/30 bg-background">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200">
                                    <th className="px-2.5 py-2 text-left font-semibold min-w-[140px]">
                                        Name
                                    </th>
                                    <th className="px-2.5 py-2 text-left font-semibold min-w-[120px]">
                                        Type
                                    </th>
                                    <th className="px-2.5 py-2 text-right font-semibold w-[110px]">
                                        Amount (₹)
                                    </th>
                                    <th className="px-2.5 py-2 text-right font-semibold w-[85px]">
                                        Count
                                    </th>
                                    <th className="px-2.5 py-2 text-right font-semibold w-[115px]">
                                        Total (₹)
                                    </th>
                                    <th className="px-2 py-2 w-[40px]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {rows.map((row) => {
                                    const rowTotal =
                                        Math.round(
                                            (Number(row.amount) || 0) *
                                                (Number(row.count) || 0) *
                                                100
                                        ) / 100;
                                    return (
                                        <tr key={row.id}>
                                            <td className="p-1.5">
                                                <Input
                                                    placeholder="e.g., Goa Trip"
                                                    value={row.name}
                                                    onChange={(e) =>
                                                        handleUpdateRow(
                                                            row.id,
                                                            "name",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="h-8 text-xs"
                                                />
                                            </td>
                                            <td className="p-1.5">
                                                <Input
                                                    placeholder="e.g., Booking"
                                                    value={row.type}
                                                    onChange={(e) =>
                                                        handleUpdateRow(
                                                            row.id,
                                                            "type",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="h-8 text-xs"
                                                />
                                            </td>
                                            <td className="p-1.5">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    placeholder="0"
                                                    value={row.amount}
                                                    onChange={(e) =>
                                                        handleUpdateRow(
                                                            row.id,
                                                            "amount",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="h-8 text-xs text-right font-mono"
                                                />
                                            </td>
                                            <td className="p-1.5">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    placeholder="0"
                                                    value={row.count}
                                                    onChange={(e) =>
                                                        handleUpdateRow(
                                                            row.id,
                                                            "count",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="h-8 text-xs text-right font-mono"
                                                />
                                            </td>
                                            <td className="px-2.5 py-1.5 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                                                {fmt(rowTotal)}
                                            </td>
                                            <td className="p-1.5 text-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleRemoveRow(row.id)
                                                    }
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                                                    title="Remove row"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/40">
                                    <td
                                        colSpan={4}
                                        className="px-2.5 py-2 text-right font-bold text-emerald-800 dark:text-emerald-200"
                                    >
                                        Incentive Table Total
                                    </td>
                                    <td className="px-2.5 py-2 text-right font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-300">
                                        {fmt(tableTotal)}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddRow}
                            className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Incentive Row
                        </Button>
                        <div className="text-xs text-muted-foreground">
                            {rows.length} {rows.length === 1 ? "row" : "rows"} •{" "}
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                Total: {fmt(tableTotal)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
