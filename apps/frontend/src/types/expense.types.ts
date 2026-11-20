export type ExpenseCategory =
    | "ticket_booking"
    | "hotel_booking"
    | "cab_booking"
    | "food"
    | "activity"
    | "guide_fees"
    | "permits"
    | "equipment"
    | "miscellaneous";

export type ExpensePaymentType =
    | "advance"
    | "partial"
    | "full"
    | "balance"
    | "reimbursement";

export type ExpensePaymentMode =
    | "bank_transfer"
    | "upi"
    | "cash"
    | "card"
    | "other";

export type ExpenseStatus =
    | "pending"
    | "approved"
    | "sent"
    | "rejected"
    | "cancelled";

export interface IExpenseUserSummary {
    id: string;
    name?: string;
    email?: string;
    profilePhoto?: string;
}

export interface IExpenseBatchSummary {
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    packageId: string;
    package?: {
        id: string;
        name: string;
        destination?: string;
    };
}

export interface IBatchExpense {
    id: string;
    expenseNumber: string;
    organizationId: string;
    batchId: string;
    batch?: IExpenseBatchSummary;
    title: string;
    category: ExpenseCategory;
    paymentType: ExpensePaymentType;
    amount: number | string;
    vendorName?: string | null;
    paymentMode: ExpensePaymentMode;
    transferAccount: string;
    transferDate: string;
    remarks?: string | null;
    billAttachments: string[];
    status: ExpenseStatus;
    requestedById: string;
    requestedBy?: IExpenseUserSummary;
    approvedById?: string | null;
    approvedBy?: IExpenseUserSummary | null;
    approvedAt?: string | null;
    sentById?: string | null;
    sentBy?: IExpenseUserSummary | null;
    sentAt?: string | null;
    transactionReference?: string | null;
    financeRemarks?: string | null;
    paymentProofs: string[];
    createdAt: string;
    updatedAt: string;
}

export interface IBatchExpenseLog {
    id: string;
    expenseId: string;
    changedById: string;
    changedBy?: IExpenseUserSummary;
    action: string;
    previousData?: Record<string, unknown> | null;
    newData?: Record<string, unknown> | null;
    note?: string | null;
    createdAt: string;
}

export interface IExpenseSummary {
    totalAmount: number;
    pendingAmount: number;
    approvedAmount: number;
    sentAmount: number;
    rejectedAmount: number;
    totalCount: number;
    pendingCount: number;
    approvedCount: number;
    sentCount: number;
    rejectedCount: number;
    dueTodayCount: number;
    overdueCount: number;
}

export interface IExpenseListResponse {
    data: IBatchExpense[];
    total: number;
    page: number;
    limit: number;
    summary: IExpenseSummary;
}

export interface IBatchExpensesResponse {
    data: IBatchExpense[];
    total: number;
    summary: IExpenseSummary;
    categoryBreakdown: Record<string, number>;
}

export interface IExpenseFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: ExpenseStatus | "";
    category?: ExpenseCategory | "";
    paymentType?: ExpensePaymentType | "";
    batchId?: string;
    packageId?: string;
    dateFrom?: string;
    dateTo?: string;
    dateField?: "transferDate" | "createdAt";
    mineOnly?: boolean;
}

export interface CreateExpensePayload {
    batchId: string;
    title: string;
    category: ExpenseCategory;
    paymentType: ExpensePaymentType;
    amount: number;
    vendorName?: string;
    paymentMode: ExpensePaymentMode;
    transferAccount: string;
    transferDate: string;
    remarks?: string;
    billAttachments?: string[];
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
    ticket_booking: "Ticket Booking",
    hotel_booking: "Hotel Booking",
    cab_booking: "Cab / Transport",
    food: "Food & Meals",
    activity: "Activities",
    guide_fees: "Guide Fees",
    permits: "Permits & Entry",
    equipment: "Equipment / Gear",
    miscellaneous: "Miscellaneous",
};

export const EXPENSE_PAYMENT_TYPE_LABELS: Record<ExpensePaymentType, string> = {
    advance: "Advance",
    partial: "Partial",
    full: "Full Payment",
    balance: "Balance",
    reimbursement: "Reimbursement",
};

export const EXPENSE_PAYMENT_MODE_LABELS: Record<ExpensePaymentMode, string> = {
    bank_transfer: "Bank Transfer (NEFT/IMPS/RTGS)",
    upi: "UPI",
    cash: "Cash",
    card: "Card",
    other: "Other",
};

export const EXPENSE_STATUS_CONFIG: Record<
    ExpenseStatus,
    {
        label: string;
        badgeClass: string;
        dotClass: string;
        borderAccent: string;
    }
> = {
    pending: {
        label: "Pending Approval",
        badgeClass:
            "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
        dotClass: "bg-amber-500 animate-pulse",
        borderAccent: "bg-amber-500",
    },
    approved: {
        label: "Approved",
        badgeClass:
            "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
        dotClass: "bg-blue-500",
        borderAccent: "bg-blue-500",
    },
    sent: {
        label: "Sent / Disbursed",
        badgeClass:
            "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
        dotClass: "bg-emerald-500",
        borderAccent: "bg-emerald-500",
    },
    rejected: {
        label: "Rejected",
        badgeClass:
            "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
        dotClass: "bg-rose-500",
        borderAccent: "bg-rose-500",
    },
    cancelled: {
        label: "Cancelled",
        badgeClass:
            "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
        dotClass: "bg-gray-500",
        borderAccent: "bg-gray-400",
    },
};
