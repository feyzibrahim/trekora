import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import axiosInstance from "@/lib/axios";
import { cn } from "@/lib/utils";
import type { IExpenseBatchSummary } from "@/types/expense.types";
import { format } from "date-fns";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface BatchOption {
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    packageId: string;
    package?: {
        id: string;
        name: string;
    };
}

interface BatchComboboxProps {
    value: string;
    onChange: (value: string, batch?: BatchOption) => void;
    packageId?: string;
    initialBatch?: IExpenseBatchSummary | BatchOption | null;
    placeholder?: string;
    includeAllOption?: boolean;
    allOptionLabel?: string;
    disabled?: boolean;
}

const PAGE_SIZE = 15;

function formatBatchLabel(batch: BatchOption): string {
    const pkgName = batch.package?.name || "Package";
    const start = format(new Date(batch.startDate), "MMM d, yyyy");
    const end = format(new Date(batch.endDate), "MMM d, yyyy");
    return `${pkgName} • ${start} – ${end}`;
}

export function BatchCombobox({
    value,
    onChange,
    packageId,
    initialBatch,
    placeholder = "Search and select a trip batch...",
    includeAllOption = false,
    allOptionLabel = "All Batches",
    disabled = false,
}: BatchComboboxProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    const [items, setItems] = useState<BatchOption[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<BatchOption | null>(
        initialBatch || null,
    );
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [resolvingSelected, setResolvingSelected] = useState(false);

    const requestIdRef = useRef(0);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Sync initialBatch prop if provided
    useEffect(() => {
        if (initialBatch && initialBatch.id === value) {
            setSelectedBatch(initialBatch);
        }
    }, [initialBatch, value]);

    // If a value is pre-selected (e.g. ?batchId=... or edit mode) and we don't have its label yet, fetch only that single batch
    useEffect(() => {
        if (!value || value === "all") {
            setSelectedBatch(null);
            return;
        }
        if (selectedBatch?.id === value) return;
        const foundInItems = items.find((b) => b.id === value);
        if (foundInItems) {
            setSelectedBatch(foundInItems);
            return;
        }
        if (initialBatch?.id === value) {
            setSelectedBatch(initialBatch);
            return;
        }

        let cancelled = false;
        setResolvingSelected(true);
        axiosInstance
            .get<BatchOption>(`/batches/${value}`)
            .then((res) => {
                if (!cancelled && res.data) {
                    setSelectedBatch(res.data);
                }
            })
            .catch(() => {
                // Ignore; fallback label will be shown
            })
            .finally(() => {
                if (!cancelled) setResolvingSelected(false);
            });

        return () => {
            cancelled = true;
        };
    }, [value, items, selectedBatch, initialBatch]);

    const fetchPage = useCallback(
        async (targetPage: number, append: boolean) => {
            const reqId = ++requestIdRef.current;
            if (append) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }

            try {
                const params: Record<string, string | number | boolean> = {
                    page: targetPage,
                    limit: PAGE_SIZE,
                    lite: true,
                };
                if (debouncedQuery) params.search = debouncedQuery;
                if (packageId && packageId !== "all") {
                    params.packageId = packageId;
                }

                const res = await axiosInstance.get<{
                    data: BatchOption[];
                    pagination?: {
                        page: number;
                        limit: number;
                        total: number;
                        totalPages: number;
                    };
                }>("/batches", { params });

                if (reqId !== requestIdRef.current) return;

                const fetched = Array.isArray(res.data)
                    ? (res.data as unknown as BatchOption[])
                    : res.data?.data || [];
                const pagination = Array.isArray(res.data)
                    ? undefined
                    : res.data?.pagination;

                setItems((prev) => {
                    if (!append) return fetched;
                    const seen = new Set(prev.map((i) => i.id));
                    const next = [...prev];
                    for (const item of fetched) {
                        if (!seen.has(item.id)) {
                            seen.add(item.id);
                            next.push(item);
                        }
                    }
                    return next;
                });

                setPage(targetPage);
                if (pagination) {
                    setTotal(pagination.total);
                    setHasMore(targetPage < pagination.totalPages);
                } else {
                    setTotal(fetched.length);
                    setHasMore(false);
                }
            } catch {
                if (reqId === requestIdRef.current && !append) {
                    setItems([]);
                    setHasMore(false);
                }
            } finally {
                if (reqId === requestIdRef.current) {
                    setLoading(false);
                    setLoadingMore(false);
                }
            }
        },
        [debouncedQuery, packageId],
    );

    // Fetch first page only when popover opens or search/packageId changes while open
    useEffect(() => {
        if (!open) return;
        fetchPage(1, false);
    }, [open, fetchPage]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (loading || loadingMore || !hasMore) return;
        const el = e.currentTarget;
        const distanceFromBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom < 40) {
            fetchPage(page + 1, true);
        }
    };

    const buttonLabel = resolvingSelected
        ? "Loading batch..."
        : includeAllOption && value === "all"
          ? allOptionLabel
          : selectedBatch
            ? formatBatchLabel(selectedBatch)
            : placeholder;

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    setQuery("");
                    setDebouncedQuery("");
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between font-normal h-9 px-3",
                        !selectedBatch &&
                            !(includeAllOption && value === "all") &&
                            "text-muted-foreground",
                    )}
                >
                    <span className="truncate text-left">{buttonLabel}</span>
                    {resolvingSelected ? (
                        <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-60" />
                    ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0"
                align="start"
            >
                <div className="flex items-center border-b px-3 py-2 gap-2">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by package, date, or status..."
                        className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                        autoFocus
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <div
                    className="max-h-64 overflow-y-auto p-1"
                    onScroll={handleScroll}
                >
                    {includeAllOption && !debouncedQuery && (
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedBatch(null);
                                onChange("all");
                                setOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                                value === "all" && "bg-accent/60 font-medium",
                            )}
                        >
                            <Check
                                className={cn(
                                    "h-4 w-4 shrink-0",
                                    value === "all"
                                        ? "opacity-100"
                                        : "opacity-0",
                                )}
                            />
                            <span>{allOptionLabel}</span>
                        </button>
                    )}

                    {loading ? (
                        <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading batches...</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                            No matching trip batches found.
                        </div>
                    ) : (
                        <>
                            {items.map((b) => {
                                const isSelected = b.id === value;
                                return (
                                    <button
                                        key={b.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedBatch(b);
                                            onChange(b.id, b);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                                            isSelected && "bg-accent/60",
                                        )}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Check
                                                className={cn(
                                                    "h-4 w-4 shrink-0",
                                                    isSelected
                                                        ? "opacity-100"
                                                        : "opacity-0",
                                                )}
                                            />
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">
                                                    {b.package?.name ||
                                                        "Package"}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {format(
                                                        new Date(b.startDate),
                                                        "MMM d, yyyy",
                                                    )}{" "}
                                                    –{" "}
                                                    {format(
                                                        new Date(b.endDate),
                                                        "MMM d, yyyy",
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px] capitalize shrink-0"
                                        >
                                            {b.status}
                                        </Badge>
                                    </button>
                                );
                            })}

                            {loadingMore && (
                                <div className="py-2.5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Loading more...</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {!loading && items.length > 0 && (
                    <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground flex items-center justify-between bg-muted/20">
                        <span>
                            Showing {items.length} of {total}
                        </span>
                        {hasMore && <span>Scroll for more</span>}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
