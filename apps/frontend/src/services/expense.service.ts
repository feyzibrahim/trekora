import axiosInstance from "@/lib/axios";
import type {
    CreateExpensePayload,
    IBatchExpense,
    IBatchExpenseLog,
    IBatchExpensesResponse,
    IExpenseFilters,
    IExpenseListResponse,
    UpdateExpensePayload,
} from "@/types/expense.types";

export class ExpenseService {
    static async getAll(filters: IExpenseFilters = {}): Promise<IExpenseListResponse> {
        const params: Record<string, string | number | boolean> = {};
        if (filters.page) params.page = filters.page;
        if (filters.limit) params.limit = filters.limit;
        if (filters.search?.trim()) params.search = filters.search.trim();
        if (filters.status) params.status = filters.status;
        if (filters.category) params.category = filters.category;
        if (filters.paymentType) params.paymentType = filters.paymentType;
        if (filters.batchId) params.batchId = filters.batchId;
        if (filters.packageId) params.packageId = filters.packageId;
        if (filters.dateFrom) params.dateFrom = filters.dateFrom;
        if (filters.dateTo) params.dateTo = filters.dateTo;
        if (filters.dateField) params.dateField = filters.dateField;
        if (filters.mineOnly) params.mineOnly = true;

        const res = await axiosInstance.get<IExpenseListResponse>("/expenses", {
            params,
        });
        return res.data;
    }

    static async getByBatch(batchId: string): Promise<IBatchExpensesResponse> {
        const res = await axiosInstance.get<IBatchExpensesResponse>(
            `/expenses/batch/${batchId}`,
        );
        return res.data;
    }

    static async getById(id: string): Promise<IBatchExpense> {
        const res = await axiosInstance.get<IBatchExpense>(`/expenses/${id}`);
        return res.data;
    }

    static async getLogs(
        id: string,
        page = 1,
        limit = 20,
    ): Promise<{ data: IBatchExpenseLog[]; total: number; page: number; limit: number }> {
        const res = await axiosInstance.get(`/expenses/${id}/logs`, {
            params: { page, limit },
        });
        return res.data;
    }

    static async create(payload: CreateExpensePayload): Promise<IBatchExpense> {
        const res = await axiosInstance.post<IBatchExpense>("/expenses", payload);
        return res.data;
    }

    static async update(
        id: string,
        payload: UpdateExpensePayload,
    ): Promise<IBatchExpense> {
        const res = await axiosInstance.patch<IBatchExpense>(
            `/expenses/${id}`,
            payload,
        );
        return res.data;
    }

    static async approve(
        id: string,
        payload: {
            financeRemarks?: string;
            markAsSent?: boolean;
            transactionReference?: string;
            paymentProofs?: string[];
        } = {},
    ): Promise<IBatchExpense> {
        const res = await axiosInstance.post<IBatchExpense>(
            `/expenses/${id}/approve`,
            payload,
        );
        return res.data;
    }

    static async reject(
        id: string,
        financeRemarks: string,
    ): Promise<IBatchExpense> {
        const res = await axiosInstance.post<IBatchExpense>(
            `/expenses/${id}/reject`,
            { financeRemarks },
        );
        return res.data;
    }

    static async markAsSent(
        id: string,
        payload: {
            transactionReference?: string;
            financeRemarks?: string;
            paymentProofs?: string[];
            sentAt?: string;
        },
    ): Promise<IBatchExpense> {
        const res = await axiosInstance.post<IBatchExpense>(
            `/expenses/${id}/mark-sent`,
            payload,
        );
        return res.data;
    }

    static async addProofs(
        id: string,
        paymentProofs: string[],
        note?: string,
    ): Promise<IBatchExpense> {
        const res = await axiosInstance.post<IBatchExpense>(
            `/expenses/${id}/proofs`,
            { paymentProofs, note },
        );
        return res.data;
    }

    static async cancel(id: string, note?: string): Promise<IBatchExpense> {
        const res = await axiosInstance.post<IBatchExpense>(
            `/expenses/${id}/cancel`,
            { note },
        );
        return res.data;
    }

    static async remove(id: string): Promise<void> {
        await axiosInstance.delete(`/expenses/${id}`);
    }

    static async uploadFile(file: File): Promise<string> {
        const formData = new FormData();
        formData.append("file", file);
        const res = await axiosInstance.post<{ filePath: string }>(
            "/file-manager/upload",
            formData,
            {
                headers: { "Content-Type": "multipart/form-data" },
            },
        );
        return res.data.filePath;
    }

    static formatCurrency(amount: number | string | undefined | null): string {
        const num = Number(amount) || 0;
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        }).format(num);
    }
}

export default ExpenseService;
