import React, { useState, useEffect, useMemo, useRef, useCallback, FC } from 'react';
import {
    FormField,
    Input,
    Select,
    Button,
    Textarea,
} from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { PlusIcon, TrashIcon, DocumentTextIcon } from '../../../assets/icons/Icons';
import { useData } from '../../../contexts/DataContext';
import { CustomerApi } from '../../../api/customer';
import { ContractApi } from '../../../api/contract';
import { QuotationApi } from '../../../api/quotation';
import { Customer } from '../../../types/entity/customer.interface';
import { Status } from '../../../types/entity/core.interface';
import { Invoice, Contract, Quotation } from '../../../types/entity/financial.interface';
import { InvoiceStatus } from '../../../types/enums/financial';

interface InvoiceItem {
    id: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    amount: number;
}

export interface InvoiceFormProps {
    mode: 'create' | 'edit';
    initialValues?: Partial<Invoice>;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
    initialContractId?: string; // For auto-fill when creating from contract
    embedded?: boolean;
}

const invoiceStatusLabels: Record<string, string> = {
    DRAFT: 'ร่าง (Draft)',
    PENDING: 'รอชำระ (Pending)',
    SENT: 'ส่งแล้ว (Sent)',
    PAID: 'ชำระแล้ว (Paid)',
    PARTIAL: 'ชำระบางส่วน (Partial)',
    OVERDUE: 'เกินกำหนด (Overdue)',
    CANCELLED: 'ยกเลิก (Cancelled)',
};

export const InvoiceForm: FC<InvoiceFormProps> = ({
    mode,
    initialValues,
    onSubmit,
    onCancel,
    initialContractId,
    embedded = false,
}) => {
    const { customers, products, invoices } = useData();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch Contracts
    useEffect(() => {
        const fetchContracts = async () => {
            try {
                const res = await ContractApi.getAll({ status: 'ACTIVE', limit: 10 });
                if (res && res.data) {
                    setContracts(res.data);
                }
            } catch (error) {
                console.error("Error fetching contracts:", error);
            }
        };
        fetchContracts();
    }, []);

    // Fetch Quotations
    useEffect(() => {
        const fetchQuotations = async () => {
            try {
                const res = await QuotationApi.getAll({ status: 'APPROVED', limit: 10 });
                if (res && res.data) {
                    setQuotations(res.data);
                }
            } catch (error) {
                console.error("Error fetching quotations:", error);
            }
        };
        fetchQuotations();
    }, []);

    // Product Autocomplete Helper
    const handleProductSelect = (itemId: string, productName: string) => {
        const product = products.find(p => p.name === productName);
        if (product) {
            setItems(prev => prev.map(item => {
                if (item.id !== itemId) return item;
                return {
                    ...item,
                    description: product.name,
                    unit: (typeof product.unit === 'string' ? product.unit : (product.unit as any)?.name || 'รายการ') as string,
                    unitPrice: Number(product.price) || item.unitPrice,
                    amount: Number(product.price) * item.quantity // Recalc amount
                };
            }));
        } else {
            handleItemChange(itemId, 'description', productName);
        }
    };

    // Invoice info
    const [invoiceCode, setInvoiceCode] = useState(initialValues?.code || '');
    const [issuedDate, setIssuedDate] = useState(
        initialValues?.issued_at
            ? new Date(initialValues.issued_at).toISOString().substring(0, 10)
            : new Date().toISOString().substring(0, 10)
    );
    const [dueDate, setDueDate] = useState(
        initialValues?.due_at
            ? new Date(initialValues.due_at).toISOString().substring(0, 10)
            : ''
    );
    const [status, setStatus] = useState<InvoiceStatus>((initialValues?.status as InvoiceStatus) || InvoiceStatus.DRAFT);
    const [notes, setNotes] = useState(initialValues?.notes || '');

    // Set default due date if create
    useEffect(() => {
        if (mode === 'create' && !dueDate) {
            const date = new Date(issuedDate);
            date.setDate(date.getDate() + 30);
            setDueDate(date.toISOString().substring(0, 10));
        }
    }, [mode, issuedDate]);

    // Generate code if create
    useEffect(() => {
        if (mode === 'create' && !invoiceCode) {
            const now = new Date();
            const code = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            setInvoiceCode(code);
        }
    }, [mode]);

    // References
    // Use type casting to avoid linter error since Partial<Invoice> might not strictly match if fields are missing in type
    const [selectedContractId, setSelectedContractId] = useState((initialValues as any)?.contract_id || initialContractId || '');
    const [selectedInstallmentTerm, setSelectedInstallmentTerm] = useState<number | null>(initialValues?.term || null);
    const [selectedCustomerId, setSelectedCustomerId] = useState(initialValues?.customer_id || '');
    const [selectedQuotationId, setSelectedQuotationId] = useState(initialValues?.quotation_id || '');

    // Auto-generate code for contract invoices
    const [autoGeneratedCode, setAutoGeneratedCode] = useState<string>('');

    // Helper to estimate next code (Purely frontend estimation, real one happens on backend)
    // We will just show a placeholder or let the user know it will be auto-generated
    useEffect(() => {
        if (selectedContractId && selectedInstallmentTerm) {
            const contract = contracts.find(c => c.id === selectedContractId);
            if (contract) {
                // Preview format: InvoiceRunning-VisitNumber-Term
                // Visit number is calculated by backend (completed jobs + 1)
                // Term = installment number
                setAutoGeneratedCode(`IVxxxx-{ครั้งที่}-${selectedInstallmentTerm}`);
            }
        } else {
            setAutoGeneratedCode('');
        }
    }, [selectedContractId, selectedInstallmentTerm, contracts]);

    // Items
    const [items, setItems] = useState<InvoiceItem[]>(
        (initialValues as any)?.items?.map((item: any) => ({
            id: crypto.randomUUID(),
            product_id: item.product_id,
            description: item.description,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitPrice: Number(item.unit_price),
            amount: Number(item.amount),
        })) || [
            {
                id: crypto.randomUUID(),
                description: '',
                quantity: 1,
                unit: 'รายการ',
                unitPrice: 0,
                amount: 0,
            }
        ]
    );

    // VAT settings
    const [includeVat, setIncludeVat] = useState(initialValues?.include_vat ?? true);
    const vatRate = 0.07;

    // Calculations
    const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.amount, 0), [items]);
    const vatAmount = useMemo(() => includeVat ? subtotal * vatRate : 0, [subtotal, includeVat]);
    const netTotal = useMemo(() => subtotal + vatAmount, [subtotal, vatAmount]);

    // Customer Search
    const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleCustomerSearch = useCallback((query: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(async () => {
            if (!query.trim()) {
                setSearchedCustomers([]);
                return;
            }
            try {
                const res = await CustomerApi.getCustomers({ search: query, limit: 50 });
                if (res && res.data) {
                    setSearchedCustomers(res.data);
                }
            } catch (error) {
                console.error("Error searching customers:", error);
            }
        }, 500);
    }, []);

    // Contract options
    const contractOptions = useMemo(() => {
        return (contracts || [])
            .filter((c) => c.status === 'ACTIVE')
            .map((c) => ({
                value: c.id,
                label: `${c.code || `CT-${c.id.slice(0, 8)}`} - ${c.customer_name}`,
                description: `฿${Number(c.total_amount).toLocaleString('th-TH')}`,
            }));
    }, [contracts]);

    // Selected contract details
    const selectedContract = useMemo(() => {
        return contracts?.find((c) => c.id === selectedContractId);
    }, [contracts, selectedContractId]);

    // Selected quotation details - Fetch full details when selected to ensure we have installments
    const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

    useEffect(() => {
        if (selectedQuotationId) {
            const fetchFullQuotation = async () => {
                try {
                    // Try to find in loaded list first
                    const found = quotations.find(q => q.id === selectedQuotationId);

                    // Always fetch fresh to ensure installments are loaded
                    const res = await QuotationApi.getById(selectedQuotationId);
                    if (res) {
                        setSelectedQuotation(res);
                    } else if (found) {
                        setSelectedQuotation(found);
                    }
                } catch (err) {
                    console.error("Error fetching full quotation:", err);
                    // Fallback
                    const found = quotations.find(q => q.id === selectedQuotationId);
                    if (found) setSelectedQuotation(found);
                }
            };
            fetchFullQuotation();
        } else {
            setSelectedQuotation(null);
        }
    }, [selectedQuotationId, quotations]);

    // Quotation Installments
    const quotationInstallments = useMemo(() => {
        if (!selectedQuotation?.installments) return [];
        return selectedQuotation.installments.sort((a, b) => a.term - b.term);
    }, [selectedQuotation]);

    // Auto-select first installment for Quotation
    useEffect(() => {
        if (selectedQuotation && quotationInstallments.length > 0 && mode === 'create') {
            // Auto-select the first installment
            const firstInst = quotationInstallments[0];

            // Set items to this installment
            setItems([
                {
                    id: crypto.randomUUID(),
                    description: firstInst.description || `งวดที่ ${firstInst.term}`,
                    quantity: 1,
                    unit: 'งวด',
                    unitPrice: Number(firstInst.amount),
                    amount: Number(firstInst.amount),
                },
            ]);

            // We also set the term/installment_id in payload state implicitly
            // But we need to make sure we don't conflict with Contract logic
            // We'll add selectedInstallmentTerm state usage for Quotation too if needed, 
            // but the user said "Don't show the box".
            // So we just set the items. The payload construction needs to know about this.
            setSelectedInstallmentTerm(firstInst.term);

            // Note: We are reusing selectedInstallmentTerm. 
            // We should ensure that when submitting, we map it correctly.
        }
    }, [selectedQuotation, quotationInstallments, mode]);

    const contractInstallments = useMemo(() => {
        if (!selectedContract?.installments) return [];

        // Find existing invoices for this contract to exclude already invoiced installments
        // If we are editing, we should NOT exclude the current invoice's term
        const currentInvoiceId = initialValues?.id;

        const existingInvoices = invoices.filter(inv =>
            inv.contract_id === selectedContract.id &&
            inv.status !== InvoiceStatus.CANCELLED &&
            inv.id !== currentInvoiceId // Exclude current invoice from the "already invoiced" list
        );

        const invoicedTerms = new Set(existingInvoices.map(inv => inv.term).filter(t => t !== undefined));

        return selectedContract.installments
            .filter(inst => {
                // If this is the installment currently being edited (matches initialValues.term), allow it even if status is Paid
                if (currentInvoiceId && initialValues?.term === inst.term) {
                    return true;
                }

                // Otherwise apply standard filters: not already invoiced AND not Paid
                return !invoicedTerms.has(inst.term) && inst.status !== Status.Paid;
            })
            .map(inst => ({
                id: inst.id,
                term: inst.term,
                description: inst.description,
                amount: Number(inst.amount),
                status: inst.status
            }));
    }, [selectedContract, invoices, initialValues]);

    // Auto-select first available installment
    useEffect(() => {
        if (contractInstallments.length > 0 && mode === 'create') {
            // Only auto-select if nothing is selected or the selected one is no longer available
            const isSelectedAvailable = contractInstallments.some(i => i.term === selectedInstallmentTerm);
            if (!selectedInstallmentTerm || !isSelectedAvailable) {
                setSelectedInstallmentTerm(contractInstallments[0].term);
            }
        }
    }, [contractInstallments, mode, selectedInstallmentTerm]);

    // Auto-fill from contract
    useEffect(() => {
        if (selectedContract && mode === 'create') {
            setSelectedCustomerId(selectedContract.customer_id);
            if (selectedContract.quotation_id) setSelectedQuotationId(selectedContract.quotation_id);
        }
    }, [selectedContract, mode]);

    // Auto-fill from installment selection
    useEffect(() => {
        if (selectedInstallmentTerm && contractInstallments.length > 0 && mode === 'create') {
            const inst = contractInstallments.find((i) => i.term === selectedInstallmentTerm);
            if (inst) {
                setItems([
                    {
                        id: crypto.randomUUID(),
                        description: inst.description,
                        quantity: 1,
                        unit: 'งวด',
                        unitPrice: inst.amount,
                        amount: inst.amount,
                    },
                ]);
            }
        }
    }, [selectedInstallmentTerm, contractInstallments, mode]);

    // Handlers
    const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };

            if (field === 'quantity' || field === 'unitPrice') {
                updated.amount = Number(updated.quantity) * Number(updated.unitPrice);
            }
            return updated;
        }));
    };

    const addItem = () => {
        setItems(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                description: '',
                quantity: 1,
                unit: 'รายการ',
                unitPrice: 0,
                amount: 0,
            }
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent double submission
        if (isSaving) return;

        if (!selectedCustomerId) {
            alert('กรุณาเลือกลูกค้า');
            return;
        }

        setIsSaving(true);
        try {
            const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || searchedCustomers.find(c => c.id === selectedCustomerId);

            let selectedInstallment = contractInstallments.find(i => i.term === selectedInstallmentTerm);
            if (!selectedInstallment && selectedQuotationId) {
                // Use any casting because quotation installment interface might slightly differ or just be compatible
                selectedInstallment = quotationInstallments.find(i => i.term === selectedInstallmentTerm) as any;
            }

            const payload = {
                // If manual code was entered (and it differs from auto-gen pattern), use it.
                // Otherwise, let backend generate.
                // If autoGeneratedCode is present (contract linked), we send undefined to let backend generate the complex format.
                code: (invoiceCode && !autoGeneratedCode) ? invoiceCode : undefined,
                contract_id: selectedContractId || undefined,
                term: selectedInstallmentTerm || undefined,
                installment_id: selectedInstallment?.id || undefined,
                quotation_id: selectedQuotationId || undefined,
                customer_id: selectedCustomerId,
                customer_name: selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Unknown',
                issued_at: issuedDate,
                due_at: dueDate,
                subtotal: subtotal,
                vat_amount: vatAmount,
                include_vat: includeVat,
                total: netTotal,
                status: status,
                notes: notes,
                items: items.map((item, index) => ({
                    sequence: index + 1,
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                    unit_price: item.unitPrice,
                    amount: item.amount,
                })),
            };

            await onSubmit(payload);
        } catch (error) {
            console.error("Submit Error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={embedded ? "space-y-8" : "bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-8"}>

            {/* Top Section: Document Header */}
            <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center mb-6 border-b border-slate-200 pb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg">
                                <DocumentTextIcon className="w-5 h-5" />
                            </span>
                            รายละเอียดเอกสาร (Document Details)
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 ml-11">ข้อมูลสำคัญของใบแจ้งหนี้</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {mode === 'edit' && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-600">สถานะ:</span>
                                <Select
                                    value={status}
                                    onChange={e => setStatus(e.target.value as InvoiceStatus)}
                                    className={`w-40 font-medium border-0 ring-1 ring-inset py-1.5 h-9 text-sm ${status === InvoiceStatus.PAID ? 'text-green-700 bg-green-50 ring-green-600/20' :
                                            status === InvoiceStatus.OVERDUE ? 'text-red-700 bg-red-50 ring-red-600/20' :
                                                'text-slate-700 bg-slate-50 ring-slate-300'
                                        }`}
                                >
                                    {Object.values(InvoiceStatus).map(s => (
                                        <option key={s} value={s}>{invoiceStatusLabels[s] || s}</option>
                                    ))}
                                </Select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField label="เลขที่ใบแจ้งหนี้ (Invoice No.)" htmlFor="invoiceCode">
                        <div className="relative">
                            <Input
                                id="invoiceCode"
                                value={invoiceCode}
                                onChange={e => setInvoiceCode(e.target.value)}
                                className="font-mono bg-white text-lg font-bold tracking-wide border-slate-300 h-11"
                                placeholder={autoGeneratedCode ? `Auto: ${autoGeneratedCode}` : "Auto-generated"}
                                disabled={!!autoGeneratedCode || mode === 'edit'}
                            />
                        </div>
                        {autoGeneratedCode && (
                            <p className="text-xs text-green-600 mt-1">
                                * ระบบจะสร้างเลขที่อัตโนมัติตามรูปแบบสัญญา: {autoGeneratedCode}
                            </p>
                        )}
                    </FormField>

                    <FormField label="วันที่ออกเอกสาร (Issue Date) *" htmlFor="issuedDate">
                        <Input
                            id="issuedDate"
                            type="date"
                            value={issuedDate}
                            onChange={e => setIssuedDate(e.target.value)}
                            required
                            className="bg-white h-11"
                        />
                    </FormField>

                    <FormField label="วันครบกำหนดชำระ (Due Date) *" htmlFor="dueDate">
                        <Input
                            id="dueDate"
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            required
                            className="bg-white h-11"
                        />
                    </FormField>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Customer */}
                <div className="space-y-6 h-full">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 h-full shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
                            <span className="w-1 h-6 bg-primary rounded-full"></span>
                            ข้อมูลลูกค้า (Customer)
                        </h3>
                        <div className="space-y-6">
                            <FormField label="ลูกค้า (Customer) *" htmlFor="customer">
                                <SearchableSelect
                                    value={selectedCustomerId}
                                    onChange={setSelectedCustomerId}
                                    onSearchChange={handleCustomerSearch}
                                    options={[...customers, ...searchedCustomers].map(c => ({
                                        value: c.id,
                                        label: `${c.first_name} ${c.last_name}`,
                                        description: c.phone
                                    }))}
                                    placeholder="ค้นหาและเลือกลูกค้า..."
                                    required
                                    className="bg-white h-11"
                                />
                            </FormField>

                            {selectedCustomerId ? (
                                <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
                                    {(() => {
                                        const c = customers.find(x => x.id === selectedCustomerId) || searchedCustomers.find(x => x.id === selectedCustomerId);
                                        return c ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="font-medium text-slate-500 flex items-center gap-2">
                                                        <span className="w-8">โทร</span>
                                                    </span>
                                                    <span className="text-slate-800 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">{c.phone || '-'}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="font-medium text-slate-500 flex items-center gap-2">
                                                        <span className="w-8">อีเมล</span>
                                                    </span>
                                                    <span className="text-slate-800 font-medium">{c.email || '-'}</span>
                                                </div>
                                                <div className="flex justify-between items-start py-1 gap-4">
                                                    <span className="font-medium text-slate-500 whitespace-nowrap flex items-center gap-2">
                                                        <span className="w-8">ที่อยู่</span>
                                                    </span>
                                                    <span className="text-slate-800 font-medium text-right leading-relaxed max-w-[70%]">
                                                        {c.address_house_no || '-'} {c.sub_district} {c.district} {c.province} {c.postal_code}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            ) : (
                                <div className="h-32 border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm bg-slate-50/50">
                                    กรุณาเลือกลูกค้าเพื่อแสดงข้อมูล
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: References */}
                <div className="space-y-6 h-full">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 h-full shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
                            <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                            เอกสารอ้างอิง (References)
                        </h3>
                        <div className="space-y-5">
                            <FormField label="อ้างอิงสัญญา (Contract)" htmlFor="contract">
                                <SearchableSelect
                                    value={selectedContractId}
                                    onChange={(val) => {
                                        setSelectedContractId(val);
                                        setSelectedInstallmentTerm(null);
                                    }}
                                    options={contractOptions}
                                    placeholder="-- เลือกสัญญา (ถ้ามี) --"
                                    className="bg-white h-11"
                                />
                            </FormField>

                            {selectedContractId && contractInstallments.length > 0 && (
                                <div className="pl-4 border-l-2 border-indigo-100 ml-1">
                                    <FormField label="งวดสัญญา (Installment)" htmlFor="installment">
                                        <Select
                                            id="installment"
                                            value={selectedInstallmentTerm || ''}
                                            onChange={e => setSelectedInstallmentTerm(Number(e.target.value) || null)}
                                            className="bg-white border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 h-11"
                                        >
                                            <option value="">-- เลือกงวดที่ต้องการเรียกเก็บ --</option>
                                            {contractInstallments.map(inst => (
                                                <option key={inst.term} value={inst.term}>
                                                    งวดที่ {inst.term} ({inst.description}) - {inst.amount.toLocaleString()} บาท
                                                </option>
                                            ))}
                                        </Select>
                                    </FormField>
                                </div>
                            )}

                            <FormField label="อ้างอิงใบเสนอราคา (Quotation)" htmlFor="quotation">
                                <SearchableSelect
                                    value={selectedQuotationId}
                                    onChange={setSelectedQuotationId}
                                    options={(quotations || [])
                                        .filter(q => !selectedCustomerId || q.customer_id === selectedCustomerId)
                                        .map(q => ({
                                            value: q.id,
                                            label: q.code || `QT-${q.id.slice(0, 8)}`,
                                            description: `${q.customer_name} - ${Number(q.total).toLocaleString()} บาท`
                                        }))}
                                    placeholder="-- เลือกใบเสนอราคา (ถ้ามี) --"
                                    className="bg-white h-11"
                                />
                            </FormField>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Items */}
            <div className="pt-8 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                        รายการสินค้าและบริการ (Items & Services)
                    </h3>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addItem}
                            className="flex-1 sm:flex-none text-primary border-primary hover:bg-primary/5 shadow-sm"
                        >
                            <PlusIcon className="w-4 h-4 mr-2" /> เพิ่มรายการ
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                if (window.confirm('ลบรายการทั้งหมด?')) {
                                    setItems([{
                                        id: crypto.randomUUID(),
                                        description: '',
                                        quantity: 1,
                                        unit: 'รายการ',
                                        unitPrice: 0,
                                        amount: 0,
                                    }]);
                                }
                            }}
                            className="flex-1 sm:flex-none text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                            ล้างรายการ
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 min-w-[300px]">รายการ (Description)</th>
                                    <th className="px-4 py-3 w-24 text-center">จำนวน</th>
                                    <th className="px-4 py-3 w-24 text-center">หน่วย</th>
                                    <th className="px-4 py-3 w-32 text-right">ราคา/หน่วย</th>
                                    <th className="px-4 py-3 w-32 text-right">รวม</th>
                                    <th className="px-4 py-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-400 font-mono w-4">{index + 1}.</span>
                                                <Input
                                                    list={`products-${item.id}`}
                                                    value={item.description}
                                                    onChange={e => handleProductSelect(item.id, e.target.value)}
                                                    placeholder="รายละเอียดสินค้า/บริการ"
                                                    className="h-10 text-sm w-full border-0 bg-transparent focus:ring-0 p-0 placeholder:text-slate-300 font-medium text-slate-700"
                                                    autoComplete="off"
                                                />
                                            </div>
                                            <datalist id={`products-${item.id}`}>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.name}>
                                                        {p.name} ({p.price} บาท/{typeof p.unit === 'string' ? p.unit : (p.unit as any)?.name})
                                                    </option>
                                                ))}
                                            </datalist>
                                        </td>
                                        <td className="px-4 py-2">
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
                                                className="h-9 text-sm text-center bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white transition-all"
                                                min={1}
                                                step="any"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <Input
                                                value={item.unit}
                                                onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                                                className="h-9 text-sm text-center bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white transition-all"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <Input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={e => handleItemChange(item.id, 'unitPrice', e.target.value)}
                                                className="h-9 text-sm text-right bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white transition-all"
                                                min={0}
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-right font-bold text-slate-700">
                                            {item.amount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100"
                                                disabled={items.length <= 1}
                                                title="ลบรายการ"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    <div className="space-y-4">
                        <FormField label="หมายเหตุ (Notes)" htmlFor="notes">
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={5}
                                placeholder="ระบุเงื่อนไขการชำระเงิน หรือหมายเหตุเพิ่มเติม..."
                                className="resize-none bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            />
                        </FormField>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4 shadow-sm">
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>รวมเป็นเงิน (Subtotal)</span>
                            <span className="font-medium text-slate-900">{subtotal.toLocaleString()} บาท</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="includeVat"
                                    checked={includeVat}
                                    onChange={e => setIncludeVat(e.target.checked)}
                                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                />
                                <label htmlFor="includeVat" className="cursor-pointer select-none">ภาษีมูลค่าเพิ่ม 7% (VAT)</label>
                            </div>
                            <span className="font-medium text-slate-900">{vatAmount.toLocaleString()} บาท</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold border-t border-slate-200 pt-4 text-slate-800 items-end">
                            <span>ยอดรวมสุทธิ (Net Total)</span>
                            <span className="text-3xl text-primary">{netTotal.toLocaleString()} <span className="text-sm text-slate-500 font-normal">บาท</span></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 sticky bottom-0 bg-white/80 backdrop-blur-sm p-4 -mx-6 -mb-6 rounded-b-xl z-10">
                <Button type="button" variant="outline" onClick={onCancel} className="px-6 h-10 border-slate-300 text-slate-700 hover:bg-slate-50">
                    ยกเลิก
                </Button>
                <Button
                    type="submit"
                    disabled={isSaving}
                    variant="primary"
                    className="px-8 h-10 shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all transform hover:-translate-y-0.5"
                >
                    {isSaving ? 'กำลังบันทึก...' : (mode === 'create' ? 'สร้างใบแจ้งหนี้' : 'บันทึกการแก้ไข')}
                </Button>
            </div>
        </form>
    );
};
