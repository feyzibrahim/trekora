import axiosInstance from "@/lib/axios";
import type { IEmployeeOption } from "@/types/employee.types";

export class EmployeeService {
    static async getEmployeeOptions(
        archived = false
    ): Promise<IEmployeeOption[]> {
        const res = await axiosInstance.get<IEmployeeOption[]>(
            "/employee/options",
            {
                params: archived ? { archived: true } : undefined,
            }
        );
        return res.data;
    }
}
