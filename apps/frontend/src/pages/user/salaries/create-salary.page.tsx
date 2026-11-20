import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn, getFileUrl, getInitials } from "@/lib/utils";
import { EmployeeService } from "@/services/employee.service";
import {
    MONTH_NAMES,
    SalarySlipService,
} from "@/services/salary-slip.service";
import { SalaryService } from "@/services/salary.service";
import type { IEmployeeOption } from "@/types/employee.types";
import type { IncentiveMode, SalaryStatus } from "@/types/salary.types";
import {
    computeIncentiveRowsTotal,
    createEmptyIncentiveRow,
    IncentiveSection,
    type IncentiveRowDraft,
    serializeIncentiveRows,
} from "./_components/incentive-section";
import {
    ArrowLeft,
    Banknote,
    Building,
    Calculator,
    Calendar,
    Check,
    ChevronsUpDown,
    Loader2,
    Phone,
    Save,
    Search,
    Sparkles,
    X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const toNum = (v: string | number | undefined): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const toInputVal = (v: string | number | undefined | null): string => {
    const n = Number(v);
    return Number.isFinite(n) && n !== 0 ? String(n) : "";
};

export default function CreateSalaryPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedEmpId = searchParams.get("employeeId") || "";

    const now = new Date();
    const [employees, setEmployees] = useState<IEmployeeOption[]>([]);
    const [employeeId, setEmployeeId] = useState<string>(preselectedEmpId);
    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [month, setMonth] = useState<number>(now.getMonth() + 1);
    const [year, setYear] = useState<number>(now.getFullYear());

    const selectedEmployee = useMemo(
        () => employees.find((emp) => emp.id === employeeId),
        [employees, employeeId]
    );

    const filteredEmployees = useMemo(() => {
        const q = employeeSearch.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter(
            (emp) =>
                emp.name.toLowerCase().includes(q) ||
                emp.designation?.toLowerCase().includes(q) ||
                emp.phone?.toLowerCase().includes(q)
        );
    }, [employees, employeeSearch]);

    // Working Days & Leaves
    const [totalWorkingDays, setTotalWorkingDays] = useState<string>("30");
    const [paidLeaves, setPaidLeaves] = useState<string>("");
    const [unpaidLeaves, setUnpaidLeaves] = useState<string>("");
    const [autoLop, setAutoLop] = useState<boolean>(true);

    // Indian Earnings
    const [basicSalary, setBasicSalary] = useState<string>("");
    const [hra, setHra] = useState<string>("");
    const [da, setDa] = useState<string>("");
    const [conveyanceAllowance, setConveyanceAllowance] = useState<string>("");
    const [medicalAllowance, setMedicalAllowance] = useState<string>("");
    const [specialAllowance, setSpecialAllowance] = useState<string>("");
    const [incentiveMode, setIncentiveMode] = useState<IncentiveMode>("simple");
    const [additionalIncentive, setAdditionalIncentive] = useState<string>("");
    const [incentiveNote, setIncentiveNote] = useState<string>("");
    const [incentiveRows, setIncentiveRows] = useState<IncentiveRowDraft[]>([
        createEmptyIncentiveRow(),
    ]);
    const [otherEarnings] = useState<number>(0);

    // Indian Deductions
    const [pfDeduction, setPfDeduction] = useState<string>("");
    const [esiDeduction, setEsiDeduction] = useState<string>("");
    const [professionalTax, setProfessionalTax] = useState<string>("");
    const [tdsDeduction, setTdsDeduction] = useState<string>("");
    const [lopDeduction, setLopDeduction] = useState<string>("");
    const [otherDeductions, setOtherDeductions] = useState<string>("");

    // Statutory & Bank
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifscCode, setIfscCode] = useState("");
    const [panNumber, setPanNumber] = useState("");
    const [uanNumber, setUanNumber] = useState("");
    const [pfNumber, setPfNumber] = useState("");
    const [saveToStructure, setSaveToStructure] = useState<boolean>(true);

    // Status & Payment info
    const [status, setStatus] = useState<SalaryStatus>("processed");
    const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
    const [paymentReference, setPaymentReference] = useState<string>("");
    const [paymentDate, setPaymentDate] = useState<string>(
        now.toISOString().split("T")[0]
    );
    const [remarks, setRemarks] = useState<string>("");

    const [loadingPreview, setLoadingPreview] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        EmployeeService.getEmployeeOptions()
            .then((data) => setEmployees(data || []))
            .catch(() => { });
    }, []);

    const loadPreviewForEmployee = useCallback(
        async (empId: string, m: number, y: number, workDays: number) => {
            if (!empId) return;
            setLoadingPreview(true);
            try {
                const res = await SalaryService.calculatePreview({
                    employeeId: empId,
                    month: m,
                    year: y,
                    totalWorkingDays: workDays,
                });
                const p = res.preview;
                const s = res.structure;
                setPaidLeaves(toInputVal(p.paidLeaves));
                setUnpaidLeaves(toInputVal(p.unpaidLeaves));
                setBasicSalary(toInputVal(p.basicSalary));
                setHra(toInputVal(p.hra));
                setDa(toInputVal(p.da));
                setConveyanceAllowance(toInputVal(p.conveyanceAllowance));
                setMedicalAllowance(toInputVal(p.medicalAllowance));
                setSpecialAllowance(toInputVal(p.specialAllowance));
                setPfDeduction(toInputVal(p.pfDeduction));
                setEsiDeduction(toInputVal(p.esiDeduction));
                setProfessionalTax(toInputVal(p.professionalTax));
                setTdsDeduction(toInputVal(p.tdsDeduction));
                setLopDeduction(toInputVal(p.lopDeduction));

                setBankName(s?.bankName || "");
                setAccountNumber(s?.accountNumber || "");
                setIfscCode(s?.ifscCode || "");
                setPanNumber(s?.panNumber || "");
                setUanNumber(s?.uanNumber || "");
                setPfNumber(s?.pfNumber || "");
            } catch (err) {
                console.error("Failed to load salary preview:", err);
            } finally {
                setLoadingPreview(false);
            }
        },
        []
    );

    useEffect(() => {
        if (employeeId) {
            loadPreviewForEmployee(
                employeeId,
                month,
                year,
                toNum(totalWorkingDays) || 30
            );
        }
    }, [employeeId, month, year]);

    const workingDaysNum = toNum(totalWorkingDays);
    const paidLeavesNum = toNum(paidLeaves);
    const unpaidLeavesNum = toNum(unpaidLeaves);

    const baseFixedGross =
        toNum(basicSalary) +
        toNum(hra) +
        toNum(da) +
        toNum(conveyanceAllowance) +
        toNum(medicalAllowance) +
        toNum(specialAllowance);

    // Auto-recompute LOP when autoLop is enabled
    useEffect(() => {
        if (autoLop) {
            const calcLop =
                workingDaysNum > 0 && unpaidLeavesNum > 0
                    ? Math.round(
                        (baseFixedGross / workingDaysNum) *
                        unpaidLeavesNum *
                        100
                    ) / 100
                    : 0;
            setLopDeduction(toInputVal(calcLop));
        }
    }, [autoLop, baseFixedGross, workingDaysNum, unpaidLeavesNum]);

    const payableDays = Math.max(0, workingDaysNum - unpaidLeavesNum);
    const daysWorked = Math.max(0, payableDays - paidLeavesNum);
    const effectiveIncentive =
        incentiveMode === "itemized"
            ? computeIncentiveRowsTotal(incentiveRows)
            : toNum(additionalIncentive);
    const grossEarnings =
        baseFixedGross +
        effectiveIncentive +
        toNum(otherEarnings);
    const totalDeductions =
        toNum(pfDeduction) +
        toNum(esiDeduction) +
        toNum(professionalTax) +
        toNum(tdsDeduction) +
        toNum(lopDeduction) +
        toNum(otherDeductions);
    const netSalary = Math.max(0, grossEarnings - totalDeductions);

    const handleAutoFillIndianDefaults = () => {
        const basic = toNum(basicSalary);
        if (basic <= 0) {
            toast.error("Enter Basic Salary first to auto-calculate HRA & EPF");
            return;
        }
        setHra(String(Math.round(basic * 0.4)));
        setConveyanceAllowance("1600");
        setMedicalAllowance("1250");
        setPfDeduction(String(Math.min(1800, Math.round(basic * 0.12))));
        setProfessionalTax("200");
        toast.success("Filled Indian standard HRA (40%), EPF (12%), and PT (₹200)");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employeeId) {
            toast.error("Please select an employee");
            return;
        }
        setSubmitting(true);
        try {
            const created = await SalaryService.createSalary({
                employeeId,
                month,
                year,
                totalWorkingDays: workingDaysNum,
                daysWorked,
                paidLeaves: paidLeavesNum,
                unpaidLeaves: unpaidLeavesNum,
                payableDays,
                basicSalary: toNum(basicSalary),
                hra: toNum(hra),
                da: toNum(da),
                conveyanceAllowance: toNum(conveyanceAllowance),
                medicalAllowance: toNum(medicalAllowance),
                specialAllowance: toNum(specialAllowance),
                incentiveMode,
                additionalIncentive: effectiveIncentive,
                incentiveNote:
                    incentiveMode === "simple"
                        ? incentiveNote.trim() || undefined
                        : undefined,
                incentiveItems:
                    incentiveMode === "itemized"
                        ? serializeIncentiveRows(incentiveRows)
                        : null,
                otherEarnings,
                pfDeduction: toNum(pfDeduction),
                esiDeduction: toNum(esiDeduction),
                professionalTax: toNum(professionalTax),
                tdsDeduction: toNum(tdsDeduction),
                lopDeduction: toNum(lopDeduction),
                otherDeductions: toNum(otherDeductions),
                status,
                paymentMethod: paymentMethod || undefined,
                paymentReference: paymentReference.trim() || undefined,
                paymentDate: status === "paid" ? paymentDate : undefined,
                remarks: remarks.trim() || undefined,
                saveToStructure,
                bankName: bankName.trim() || undefined,
                accountNumber: accountNumber.trim() || undefined,
                ifscCode: ifscCode.trim().toUpperCase() || undefined,
                panNumber: panNumber.trim().toUpperCase() || undefined,
                uanNumber: uanNumber.trim() || undefined,
                pfNumber: pfNumber.trim() || undefined,
            });
            toast.success("Salary slip generated successfully");
            navigate(`/salaries/${created.id}`);
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || "Failed to generate salary slip"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const fmt = (v: any) => SalarySlipService.formatCurrency(v);

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link
                                to="/salaries"
                                className="flex items-center gap-1.5"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Salaries
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Generate Salary Slip</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                        <Banknote className="w-7 h-7 text-primary" />
                        Generate Monthly Salary Slip
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        Select an employee and payroll period. Approved leaves and saved salary structure will auto-populate.
                    </p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
            >
                {/* Left 2 Columns */}
                <div className="lg:col-span-2 space-y-6">
                    {/* 1. Employee & Period */}
                    <Card className="border border-border/60 shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    1. Employee & Payroll Period
                                </span>
                                {loadingPreview && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-normal">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Loading structure & leaves...
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    Select Employee *
                                </Label>
                                <Popover
                                    open={employeeDropdownOpen}
                                    onOpenChange={setEmployeeDropdownOpen}
                                >
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={employeeDropdownOpen}
                                            className="w-full justify-between bg-background h-9 px-3 text-left font-normal border-input hover:bg-accent/50"
                                        >
                                            {selectedEmployee ? (
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Avatar className="h-5 w-5 shrink-0">
                                                        {selectedEmployee.profilePhoto && (
                                                            <AvatarImage
                                                                src={getFileUrl(
                                                                    selectedEmployee.profilePhoto
                                                                )}
                                                                alt={
                                                                    selectedEmployee.name
                                                                }
                                                                className="object-cover"
                                                            />
                                                        )}
                                                        <AvatarFallback className="text-[10px] font-semibold">
                                                            {getInitials(
                                                                selectedEmployee.name
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="truncate text-sm">
                                                        {selectedEmployee.name}
                                                        {selectedEmployee.designation
                                                            ? ` (${selectedEmployee.designation})`
                                                            : ""}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">
                                                    Choose employee
                                                </span>
                                            )}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-[320px] sm:w-[360px] p-0 shadow-lg"
                                        align="start"
                                    >
                                        <div className="p-2.5 border-b flex items-center gap-2 bg-muted/20">
                                            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <Input
                                                placeholder="Search name, designation, or phone..."
                                                value={employeeSearch}
                                                onChange={(e) =>
                                                    setEmployeeSearch(
                                                        e.target.value
                                                    )
                                                }
                                                className="h-8 text-xs bg-background border-none shadow-none focus-visible:ring-0"
                                                autoFocus
                                            />
                                            {employeeSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEmployeeSearch("")
                                                    }
                                                    className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-64 overflow-y-auto p-1 divide-y divide-border/30">
                                            {filteredEmployees.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-muted-foreground">
                                                    {employeeSearch
                                                        ? `No employees found matching "${employeeSearch}"`
                                                        : "No employees available"}
                                                </div>
                                            ) : (
                                                filteredEmployees.map((emp) => {
                                                    const isSelected =
                                                        emp.id === employeeId;
                                                    return (
                                                        <button
                                                            key={emp.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setEmployeeId(
                                                                    emp.id
                                                                );
                                                                setEmployeeDropdownOpen(
                                                                    false
                                                                );
                                                                setEmployeeSearch(
                                                                    ""
                                                                );
                                                            }}
                                                            className={cn(
                                                                "w-full p-2 rounded-md cursor-pointer text-left transition-colors flex items-center justify-between gap-2.5",
                                                                isSelected
                                                                    ? "bg-accent text-accent-foreground"
                                                                    : "hover:bg-accent/60 text-foreground"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                <Avatar className="h-8 w-8 shrink-0">
                                                                    {emp.profilePhoto && (
                                                                        <AvatarImage
                                                                            src={getFileUrl(
                                                                                emp.profilePhoto
                                                                            )}
                                                                            alt={
                                                                                emp.name
                                                                            }
                                                                            className="object-cover"
                                                                        />
                                                                    )}
                                                                    <AvatarFallback className="text-xs font-semibold">
                                                                        {getInitials(
                                                                            emp.name
                                                                        )}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="text-xs font-semibold truncate">
                                                                        {
                                                                            emp.name
                                                                        }
                                                                        {emp.designation && (
                                                                            <span className="font-normal text-muted-foreground ml-1">
                                                                                (
                                                                                {
                                                                                    emp.designation
                                                                                }
                                                                                )
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {emp.phone && (
                                                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                                                            <Phone className="w-3 h-3 shrink-0" />
                                                                            <span className="truncate">
                                                                                {
                                                                                    emp.phone
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {isSelected && (
                                                                <Check className="w-4 h-4 text-primary shrink-0" />
                                                            )}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    Payroll Month *
                                </Label>
                                <Select
                                    value={String(month)}
                                    onValueChange={(v) => setMonth(Number(v))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTH_NAMES.map((m, idx) => (
                                            <SelectItem
                                                key={m}
                                                value={String(idx + 1)}
                                            >
                                                {m}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    Payroll Year *
                                </Label>
                                <Select
                                    value={String(year)}
                                    onValueChange={(v) => setYear(Number(v))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[
                                            now.getFullYear() - 1,
                                            now.getFullYear(),
                                            now.getFullYear() + 1,
                                        ].map((yr) => (
                                            <SelectItem
                                                key={yr}
                                                value={String(yr)}
                                            >
                                                {yr}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Working Days & Leaves */}
                    <Card className="border border-border/60 shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-primary" />
                                2. Working Days, Paid Leaves & LOP
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Approved leaves from Leave Management are automatically populated for the selected month.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">
                                        Working Days
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min={1}
                                        max={31}
                                        placeholder="30"
                                        value={totalWorkingDays}
                                        onChange={(e) =>
                                            setTotalWorkingDays(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-emerald-700">
                                        Paid Leaves
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min={0}
                                        placeholder="0"
                                        value={paidLeaves}
                                        onChange={(e) =>
                                            setPaidLeaves(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-rose-600">
                                        Unpaid / LOP Days
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min={0}
                                        placeholder="0"
                                        value={unpaidLeaves}
                                        onChange={(e) =>
                                            setUnpaidLeaves(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">
                                        Days Worked
                                    </Label>
                                    <Input
                                        type="number"
                                        value={daysWorked}
                                        disabled
                                        className="bg-muted font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-primary">
                                        Payable Days
                                    </Label>
                                    <Input
                                        type="number"
                                        value={payableDays}
                                        disabled
                                        className="bg-primary/5 border-primary/30 font-mono font-bold text-primary"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                                <div>
                                    <div className="text-xs font-semibold">
                                        Auto-calculate Loss of Pay (LOP) Deduction
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        Deducts (Fixed Gross ÷ Working Days) × Unpaid Leaves automatically.
                                    </div>
                                </div>
                                <Switch
                                    checked={autoLop}
                                    onCheckedChange={setAutoLop}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Indian Earnings & Additional Incentive */}
                    <Card className="border border-border/60 shadow-xs">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-600" />
                                    3. Earnings & Additional Incentive (₹)
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Standard Indian salary components plus monthly performance incentive or bonus.
                                </CardDescription>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAutoFillIndianDefaults}
                                className="h-7 text-xs cursor-pointer"
                            >
                                Auto-Fill HRA (40%) & EPF
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">
                                        Basic Salary (₹)
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={basicSalary}
                                        onChange={(e) =>
                                            setBasicSalary(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">
                                        House Rent Allowance (HRA)
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={hra}
                                        onChange={(e) => setHra(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">
                                        Dearness Allowance (DA)
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={da}
                                        onChange={(e) => setDa(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">
                                        Conveyance Allowance
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={conveyanceAllowance}
                                        onChange={(e) =>
                                            setConveyanceAllowance(
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">
                                        Medical Allowance
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={medicalAllowance}
                                        onChange={(e) =>
                                            setMedicalAllowance(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">
                                        Special Allowance
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={specialAllowance}
                                        onChange={(e) =>
                                            setSpecialAllowance(e.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            {/* Highlighted Additional Incentive Box */}
                            <IncentiveSection
                                mode={incentiveMode}
                                onModeChange={setIncentiveMode}
                                simpleAmount={additionalIncentive}
                                onSimpleAmountChange={setAdditionalIncentive}
                                simpleNote={incentiveNote}
                                onSimpleNoteChange={setIncentiveNote}
                                rows={incentiveRows}
                                onRowsChange={setIncentiveRows}
                            />
                        </CardContent>
                    </Card>

                    {/* 4. Deductions */}
                    <Card className="border border-border/60 shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-rose-600">
                                4. Statutory & Other Deductions (₹)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs">
                                    Provident Fund (EPF)
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={pfDeduction}
                                    onChange={(e) =>
                                        setPfDeduction(e.target.value)
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">
                                    Employee State Insurance (ESI)
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={esiDeduction}
                                    onChange={(e) =>
                                        setEsiDeduction(e.target.value)
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">
                                    Professional Tax (PT)
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={professionalTax}
                                    onChange={(e) =>
                                        setProfessionalTax(e.target.value)
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">
                                    Income Tax (TDS)
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={tdsDeduction}
                                    onChange={(e) =>
                                        setTdsDeduction(e.target.value)
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-rose-600 font-semibold">
                                    Loss of Pay (LOP) Deduction
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={lopDeduction}
                                    onChange={(e) => {
                                        setAutoLop(false);
                                        setLopDeduction(e.target.value);
                                    }}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">
                                    Other Deductions / Advance
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={otherDeductions}
                                    onChange={(e) =>
                                        setOtherDeductions(e.target.value)
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 5. Bank & Statutory Identifiers */}
                    <Card className="border border-border/60 shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Building className="w-4 h-4 text-primary" />
                                5. Bank & Statutory Identifiers (Printed on Payslip)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">Bank Name</Label>
                                    <Input
                                        placeholder="e.g., HDFC Bank"
                                        value={bankName}
                                        onChange={(e) =>
                                            setBankName(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">
                                        Account Number
                                    </Label>
                                    <Input
                                        placeholder="Account Number"
                                        value={accountNumber}
                                        onChange={(e) =>
                                            setAccountNumber(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">IFSC Code</Label>
                                    <Input
                                        placeholder="IFSC Code"
                                        value={ifscCode}
                                        onChange={(e) =>
                                            setIfscCode(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">
                                        PAN Number
                                    </Label>
                                    <Input
                                        placeholder="ABCDE1234F"
                                        value={panNumber}
                                        onChange={(e) =>
                                            setPanNumber(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">
                                        UAN (EPF)
                                    </Label>
                                    <Input
                                        placeholder="UAN Number"
                                        value={uanNumber}
                                        onChange={(e) =>
                                            setUanNumber(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">
                                        PF / ESI Number
                                    </Label>
                                    <Input
                                        placeholder="PF / ESI Number"
                                        value={pfNumber}
                                        onChange={(e) =>
                                            setPfNumber(e.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                                <div>
                                    <div className="text-xs font-semibold">
                                        Save as Employee's Default Salary Structure
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        Updates this employee's permanent salary template for future months.
                                    </div>
                                </div>
                                <Switch
                                    checked={saveToStructure}
                                    onCheckedChange={setSaveToStructure}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Sticky Summary Column */}
                <div className="space-y-6 lg:sticky lg:top-6">
                    <Card className="border-2 border-primary/30 shadow-sm p-0">
                        <CardHeader className="pt-5 pb-3 bg-primary/5 border-b">
                            <CardTitle className="text-base font-bold">
                                Payroll Calculation Summary
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {MONTH_NAMES[(month || 1) - 1]} {year} •{" "}
                                {payableDays}/{workingDaysNum} Payable Days
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Base Fixed Earnings:
                                    </span>
                                    <span className="font-mono font-semibold">
                                        {fmt(baseFixedGross)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-emerald-600">
                                    <span>
                                        + Additional Incentive
                                        {incentiveMode === "itemized"
                                            ? " (Table)"
                                            : ""}
                                        :
                                    </span>
                                    <span className="font-mono font-semibold">
                                        {fmt(effectiveIncentive)}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t pt-2 font-bold text-sm">
                                    <span>Gross Earnings:</span>
                                    <span className="font-mono">
                                        {fmt(grossEarnings)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-rose-600">
                                    <span>- Total Deductions:</span>
                                    <span className="font-mono font-semibold">
                                        -{fmt(totalDeductions)}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t-2 border-primary pt-3 text-base font-extrabold text-primary">
                                    <span>Net Salary Payable:</span>
                                    <span className="font-mono text-xl">
                                        {fmt(netSalary)}
                                    </span>
                                </div>
                                <p className="text-[11px] italic text-muted-foreground pt-1">
                                    {SalarySlipService.numberToIndianWords(
                                        netSalary
                                    )}
                                </p>
                            </div>

                            <div className="space-y-3 pt-3 border-t">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">
                                        Salary Slip Status
                                    </Label>
                                    <Select
                                        value={status}
                                        onValueChange={(v) =>
                                            setStatus(v as SalaryStatus)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">
                                                Draft
                                            </SelectItem>
                                            <SelectItem value="processed">
                                                Processed (Ready for Dispersion)
                                            </SelectItem>
                                            <SelectItem value="paid">
                                                Paid (Disbursed)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">
                                        Payment Mode
                                    </Label>
                                    <Select
                                        value={paymentMethod}
                                        onValueChange={setPaymentMethod}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bank_transfer">
                                                NEFT / IMPS / Bank Transfer
                                            </SelectItem>
                                            <SelectItem value="upi">
                                                UPI Transfer
                                            </SelectItem>
                                            <SelectItem value="cheque">
                                                Cheque
                                            </SelectItem>
                                            <SelectItem value="cash">
                                                Cash
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {status === "paid" && (
                                    <>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold">
                                                Payment Date
                                            </Label>
                                            <Input
                                                type="date"
                                                value={paymentDate}
                                                onChange={(e) =>
                                                    setPaymentDate(
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold">
                                                UTR / Transaction Reference
                                            </Label>
                                            <Input
                                                placeholder="UTR / Reference ID"
                                                value={paymentReference}
                                                onChange={(e) =>
                                                    setPaymentReference(
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">
                                        Remarks (Optional)
                                    </Label>
                                    <Textarea
                                        rows={2}
                                        placeholder="Any payroll remarks..."
                                        value={remarks}
                                        onChange={(e) =>
                                            setRemarks(e.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={submitting}
                                className="w-full gap-2 cursor-pointer"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Generate Salary Slip
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </form>
        </div>
    );
}
