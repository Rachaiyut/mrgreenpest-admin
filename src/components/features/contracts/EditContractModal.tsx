import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    FormField,
    Input,
    Select,
    Button,
    Textarea,
} from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';
import { useData } from '../../../contexts/DataContext';
import { CustomerApi } from '../../../api/customer';
import { Modal } from '../../common/Modal';
import { Contract, InstallmentPlan } from '@/src/types/entity/financial.interface';
import { Customer } from '@/src/types/entity/customer.interface';
import { QuotationApi } from '@/src/api/quotation';
import { ContractStatus } from '@/src/types/enums/financial';

interface EditContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    contract: Contract | null;
}

export const EditContractModal: React.FC<EditContractModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    contract,
}) => {
    const { customers, quotations, handlers } = useData();

    // Contract info
    const [contractCode, setContractCode] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [contractDuration, setContractDuration] = useState('1 ปี');
    const [status, setStatus] = useState<ContractStatus>(ContractStatus.DRAFT);

    // References
    const [selectedQuotationId, setSelectedQuotationId] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');

    // Service info
    const [serviceLocation, setServiceLocation] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [systemUsed, setSystemUsed] = useState('');
    const [serviceCount, setServiceCount] = useState(7);
    const [notes, setNotes] = useState('');

    // Pricing
    const [totalAmount, setTotalAmount] = useState(0);

    // Customer Search Handling
    const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Installment plan
    const [installments, setInstallments] = useState<InstallmentPlan[]>([]);

    useEffect(() => {
        if (isOpen && contract) {
            // Fill form with contract data
            setContractCode(contract.code || '');
            setStartDate(contract.start_date ? new Date(contract.start_date).toISOString().substring(0, 10) : '');
            setEndDate(contract.end_date ? new Date(contract.end_date).toISOString().substring(0, 10) : '');
            
            setContractDuration(contract.contract_duration || '1 ปี');
            setStatus((contract.status as ContractStatus) || ContractStatus.DRAFT);
            setSelectedQuotationId(contract.quotation_id || '');
            setSelectedCustomerId(contract.customer_id || '');
            setServiceLocation(contract.service_location || '');
            setServiceType(contract.service_type || '');
            setSystemUsed(contract.system_used || '');
            setServiceCount(contract.service_count || 7);
            setNotes(contract.notes || '');
            setTotalAmount(Number(contract.total_amount) || 0);
            
            if (contract.installments && contract.installments.length > 0) {
                setInstallments(contract.installments.map(inst => ({
                    id: inst.id || crypto.randomUUID(),
                    term: inst.term,
                    description: inst.description,
                    percentage: Number(inst.percentage),
                    amount: Number(inst.amount),
                    due_date: inst.due_date ? new Date(inst.due_date).toISOString().substring(0, 10) : '',
                    status: inst.status
                })));
            } else {
                // Default installments if none
                 setInstallments([
                    {
                        id: crypto.randomUUID(),
                        term: 1,
                        description: 'งวดที่ 1 - ชำระเมื่อเซ็นสัญญา',
                        percentage: 30,
                        amount: 0,
                        due_date: '',
                        status: 'PENDING' as any,
                    },
                    {
                        id: crypto.randomUUID(),
                        term: 2,
                        description: 'งวดที่ 2 - ชำระหลังบริการครั้งที่ 3',
                        percentage: 35,
                        amount: 0,
                        due_date: '',
                        status: 'PENDING' as any,
                    },
                    {
                        id: crypto.randomUUID(),
                        term: 3,
                        description: 'งวดที่ 3 - ชำระหลังบริการครั้งสุดท้าย',
                        percentage: 35,
                        amount: 0,
                        due_date: '',
                        status: 'PENDING' as any,
                    },
                ]);
            }
        }
    }, [isOpen, contract]);

    useEffect(() => {
        if (customers.length > 0 && searchedCustomers.length === 0) {
            setSearchedCustomers(customers);
        }
    }, [customers]);

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleCustomerSearch = (query: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(async () => {
            if (!query.trim()) {
                setSearchedCustomers(customers);
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
    };

    // Quotation options for dropdown
    const quotationOptions = useMemo(() => {
        return (quotations || [])
            .filter((q) => q.status === 'APPROVED')
            .map((q) => ({
                value: q.id,
                label: `QT-${q.id.slice(0, 8)} - ${q.customer_name}`,
                description: `฿${Number(q.total).toLocaleString('th-TH')}`,
            }));
    }, [quotations]);

    // Selected quotation details
    const selectedQuotation = useMemo(() => {
        return quotations?.find((q) => q.id === selectedQuotationId);
    }, [quotations, selectedQuotationId]);

    // Auto-fill from quotation when selected
    const isInitialLoad = useRef(true);

    useEffect(() => {
        // Reset initial load state when modal opens
        if (isOpen) {
            isInitialLoad.current = true;
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchQuotationDetails = async () => {
            if (selectedQuotationId) {
                // If it's the initial load (opening the modal with existing data), 
                // do NOT overwrite contract data with quotation data.
                if (isInitialLoad.current) {
                     isInitialLoad.current = false;
                     return;
                }

                try {
                    const fullQuotation = await QuotationApi.getById(selectedQuotationId);
                    
                    if (fullQuotation) {
                        setSelectedCustomerId(fullQuotation.customer_id);
                        setTotalAmount(Number(fullQuotation.total) || 0);
                        
                        if (fullQuotation.service_location) setServiceLocation(fullQuotation.service_location);
                        if (fullQuotation.service_type) setServiceType(fullQuotation.service_type);
                        if (fullQuotation.system_used) setSystemUsed(fullQuotation.system_used);
                        if (fullQuotation.contract_duration) setContractDuration(fullQuotation.contract_duration);
                        if (fullQuotation.service_count) setServiceCount(Number(fullQuotation.service_count));
                        if (fullQuotation.notes) setNotes(fullQuotation.notes);

                        if (fullQuotation.installments && fullQuotation.installments.length > 0) {
                             // Cast to any because the backend response structure might differ from the strict frontend interface
                             // Backend returns: installment_no, service_date, amount, notes
                             const backendInstallments = fullQuotation.installments as any[];
                             
                             const mappedInstallments: InstallmentPlan[] = backendInstallments.map((inst) => {
                                let dueDate = '';
                                try {
                                    if (inst.service_date) {
                                        dueDate = new Date(inst.service_date).toISOString().substring(0, 10);
                                    } else if (inst.due_date) {
                                        dueDate = new Date(inst.due_date).toISOString().substring(0, 10);
                                    }
                                } catch (e) {
                                    console.warn('Invalid date in installment', inst);
                                }

                                return {
                                    id: crypto.randomUUID(),
                                    term: Number(inst.installment_no || inst.term || 0),
                                    description: inst.notes || inst.description || `งวดที่ ${inst.installment_no || inst.term}`,
                                    percentage: fullQuotation.total > 0 ? (Number(inst.amount) / Number(fullQuotation.total)) * 100 : 0,
                                    amount: Number(inst.amount),
                                    due_date: dueDate,
                                    status: 'PENDING' as any
                                } as InstallmentPlan;
                            });
                            setInstallments(mappedInstallments);
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch quotation details:", error);
                }
            }
        };

        fetchQuotationDetails();
    }, [selectedQuotationId, contract]); // Added contract to dependency to check against original ID

    // Selected customer details
    const selectedCustomer = useMemo(() => {
        return customers.find((c) => c.id === selectedCustomerId) || searchedCustomers.find((c) => c.id === selectedCustomerId);
    }, [customers, searchedCustomers, selectedCustomerId]);

    // Recalculate installment amounts when total changes
    // Only if not initial load to avoid overwriting existing amounts if they vary slightly?
    // Actually, consistency is better.
    useEffect(() => {
        setInstallments((prev) =>
            prev.map((inst) => ({
                ...inst,
                amount: (totalAmount * inst.percentage) / 100,
            }))
        );
    }, [totalAmount]);

    // Handle installment change
    const handleInstallmentChange = (
        id: string,
        field: keyof InstallmentPlan,
        value: string | number
    ) => {
        setInstallments((prev) =>
            prev.map((inst) => {
                if (inst.id !== id) return inst;

                const updated = { ...inst, [field]: value };

                // Recalculate amount if percentage changes
                if (field === 'percentage') {
                    updated.amount = (totalAmount * Number(value)) / 100;
                }

                return updated;
            })
        );
    };

    // Add installment
    const addInstallment = () => {
        const newTerm = installments.length + 1;
        setInstallments((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                term: newTerm,
                description: `งวดที่ ${newTerm}`,
                percentage: 0,
                amount: 0,
                due_date: '',
                status: 'PENDING' as any,
            } as InstallmentPlan,
        ]);
    };

    // Remove installment
    const removeInstallment = (id: string) => {
        if (installments.length <= 1) return;
        setInstallments((prev) => {
            const filtered = prev.filter((inst) => inst.id !== id);
            // Re-number terms
            return filtered.map((inst, index) => ({
                ...inst,
                term: index + 1,
            }));
        });
    };

    // Calculate total percentage
    const totalPercentage = useMemo(() => {
        return installments.reduce((sum, inst) => sum + inst.percentage, 0);
    }, [installments]);

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!contract) return;

        if (!selectedCustomerId || !selectedCustomer) {
            alert('กรุณาเลือกลูกค้า');
            return;
        }

        if (Math.abs(totalPercentage - 100) > 0.1) {
            alert('สัดส่วนการแบ่งงวดรวมกันต้องเท่ากับ 100%');
            return;
        }

        setIsSaving(true);
        try {
            const contractData = {
                id: contract.id,
                code: contractCode,
                quotation_id: selectedQuotationId || undefined,
                customer_id: selectedCustomerId,
                customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
                service_location: serviceLocation,
                service_type: serviceType,
                system_used: systemUsed,
                contract_duration: contractDuration,
                service_count: serviceCount,
                total_amount: totalAmount,
                // Do not reset status on edit unless logic requires it
                start_date: startDate,
                end_date: endDate,
                notes: notes,
                installments: installments.map((inst) => ({
                    term: inst.term,
                    description: inst.description,
                    percentage: inst.percentage,
                    amount: inst.amount,
                    due_date: inst.due_date,
                    status: inst.status || 'PENDING',
                    id: inst.id.length < 36 ? undefined : inst.id // Basic check if it's a UUID or new ID
                })),
            };

            await handlers.contracts.update(contractData);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating contract:', error);
            alert('เกิดข้อผิดพลาดในการแก้ไขใบสัญญา');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !contract) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`แก้ไขใบสัญญา: ${contract.code}`}
            size="5xl"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                        ยกเลิก
                    </Button>
                    <Button 
                        type="submit" 
                        form="edit-contract-form"
                        disabled={isSaving}
                    >
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                    </Button>
                </div>
            }
        >
            <form id="edit-contract-form" onSubmit={handleSubmit} className="space-y-8">
                {/* General Information */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                        ข้อมูลทั่วไป (General Information)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label="เลขที่สัญญา">
                            <Input
                                value={contractCode}
                                onChange={(e) => setContractCode(e.target.value)}
                                placeholder="Auto-generated"
                                disabled
                            />
                        </FormField>

                        <FormField label="สถานะ">
                            <Select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as ContractStatus)}
                            >
                                <option value={ContractStatus.DRAFT}>ร่าง</option>
                                <option value={ContractStatus.PENDING}>รอดำเนินการ</option>
                                <option value={ContractStatus.ACTIVE}>ดำเนินการ</option>
                                <option value={ContractStatus.COMPLETED}>เสร็จสิ้น</option>
                                <option value={ContractStatus.CANCELLED}>ยกเลิก</option>
                                <option value={ContractStatus.EXPIRED}>หมดอายุ</option>
                            </Select>
                        </FormField>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label="วันที่เริ่มสัญญา">
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </FormField>
                        <FormField label="วันที่สิ้นสุดสัญญา">
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </FormField>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <FormField label="อ้างอิงใบเสนอราคา (ถ้ามี)" htmlFor="quotation-select">
                            <SearchableSelect
                                value={selectedQuotationId}
                                onChange={(value) => setSelectedQuotationId(value)}
                                placeholder="-- เลือกใบเสนอราคา (ไม่บังคับ) --"
                                options={quotationOptions}
                            />
                        </FormField>

                        {selectedQuotation && (
                            <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">ข้อมูลจากใบเสนอราคา</h4>
                                            <p className="text-xs text-slate-500">QT-{selectedQuotation.id.slice(0, 8)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-slate-500 block">ยอดรวม</span>
                                        <span className="text-sm font-bold text-slate-700">
                                            ฿{Number(selectedQuotation.total).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Client & Service Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Customer Info */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-5 bg-primary rounded-full"></span>
                                ข้อมูลลูกค้า (Customer)
                            </h3>

                            <div className="space-y-4">
                                <FormField label="ลูกค้า" htmlFor="customer-select">
                                    <SearchableSelect
                                        value={selectedCustomerId}
                                        onChange={setSelectedCustomerId}
                                        onSearchChange={handleCustomerSearch}
                                        placeholder="ค้นหาและเลือกลูกค้า..."
                                        required
                                        options={(searchedCustomers.length > 0 ? searchedCustomers : customers).map((c) => ({
                                            value: c.id,
                                            label: `${c.code} - ${c.first_name} ${c.last_name}`,
                                            description: c.phone || '',
                                        }))}
                                    />
                                </FormField>

                                <FormField label="เบอร์ติดต่อ" htmlFor="customer-phone">
                                    <Input
                                        id="customer-phone"
                                        type="text"
                                        value={selectedCustomer?.phone || ''}
                                        disabled
                                        className="bg-slate-50 text-slate-500"
                                    />
                                </FormField>

                                {selectedCustomer && (
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">ประเภท:</span>
                                            <span className="font-medium text-slate-700">{selectedCustomer.type}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block mb-1">ที่อยู่:</span>
                                            <span className="font-medium text-slate-700">
                                                {[
                                                    selectedCustomer.address_house_no,
                                                    selectedCustomer.road_line,
                                                    selectedCustomer.sub_district,
                                                    selectedCustomer.district,
                                                    selectedCustomer.province,
                                                    selectedCustomer.postal_code
                                                ].filter(Boolean).join(' ')}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Service Details */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-5 bg-orange-500 rounded-full"></span>
                                รายละเอียดงานบริการ (Service Details)
                            </h3>

                            <div className="space-y-4">
                                <FormField label="สถานที่ให้บริการ" htmlFor="service-location">
                                    <Textarea
                                        id="service-location"
                                        value={serviceLocation}
                                        onChange={(e) => setServiceLocation(e.target.value)}
                                        rows={3}
                                        placeholder="ระบุสถานที่ให้บริการ..."
                                        className="bg-slate-50"
                                    />
                                </FormField>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="ประเภทบริการ" htmlFor="service-type">
                                        <Select
                                            id="service-type"
                                            value={serviceType}
                                            onChange={(e) => setServiceType(e.target.value)}
                                        >
                                            <option value="">-- ระบุ --</option>
                                            <option value="กำจัดปลวก">กำจัดปลวก</option>
                                            <option value="กำจัดแมลง">กำจัดแมลง</option>
                                            <option value="กำจัดหนู">กำจัดหนู</option>
                                            <option value="กำจัดมด">กำจัดมด</option>
                                            <option value="บริการครบวงจร">บริการครบวงจร</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="ระบบที่ใช้" htmlFor="system-used">
                                        <Input
                                            id="system-used"
                                            value={systemUsed}
                                            onChange={(e) => setSystemUsed(e.target.value)}
                                            placeholder="ระบุระบบที่ใช้..."
                                        />
                                    </FormField>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="ระยะเวลาสัญญา" htmlFor="contract-duration">
                                        <Select
                                            id="contract-duration"
                                            value={contractDuration}
                                            onChange={(e) => setContractDuration(e.target.value)}
                                        >
                                            <option value="1 ปี">1 ปี</option>
                                            <option value="6 เดือน">6 เดือน</option>
                                            <option value="3 เดือน">3 เดือน</option>
                                            <option value="ครั้งเดียว">ครั้งเดียว</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="จำนวนครั้งเข้าบริการ" htmlFor="service-count">
                                        <Input
                                            id="service-count"
                                            type="number"
                                            value={serviceCount}
                                            onChange={(e) => setServiceCount(Number(e.target.value))}
                                            min={1}
                                        />
                                    </FormField>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pricing & Installments */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-green-500 rounded-full"></span>
                        การชำระเงินและงวดงาน (Payment & Installments)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <FormField label="มูลค่าสัญญารวม (บาท)" htmlFor="total-amount">
                                <Input
                                    id="total-amount"
                                    type="number"
                                    value={totalAmount}
                                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                                    min={0}
                                    step={0.01}
                                    className="text-right font-bold text-lg text-primary"
                                />
                            </FormField>
                        </div>
                        <div className="flex items-center">
                            <div className={`flex-1 p-4 rounded-lg border ${Math.abs(totalPercentage - 100) < 0.1 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-600">สัดส่วนการแบ่งงวดรวม</span>
                                    <span className={`text-xl font-bold ${Math.abs(totalPercentage - 100) < 0.1 ? 'text-green-700' : 'text-red-700'}`}>
                                        {totalPercentage}%
                                    </span>
                                </div>
                                {Math.abs(totalPercentage - 100) >= 0.1 && (
                                    <p className="text-xs text-red-600 mt-1 text-right">ต้องเท่ากับ 100%</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-300 mb-6">
                        <table className="min-w-full divide-y divide-slate-300">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-16 border-r border-slate-300">งวด</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase border-r border-slate-300">รายละเอียด (Description)</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-24 border-r border-slate-300">สัดส่วน (%)</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase w-32 border-r border-slate-300">จำนวนเงิน</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-40 border-r border-slate-300">กำหนดชำระ</th>
                                    <th className="px-2 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {installments.map((inst, index) => (
                                    <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2 text-center text-sm text-slate-500 font-medium border-r border-slate-200 bg-slate-50/50">
                                            {inst.term}
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-200">
                                            <Input
                                                type="text"
                                                value={inst.description}
                                                onChange={(e) =>
                                                    handleInstallmentChange(inst.id, 'description', e.target.value)
                                                }
                                                className="!py-1 h-9"
                                            />
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-200">
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={inst.percentage}
                                                    onChange={(e) =>
                                                        handleInstallmentChange(inst.id, 'percentage', Number(e.target.value))
                                                    }
                                                    min={0}
                                                    max={100}
                                                    className="!py-1 text-center h-9 pr-6"
                                                />
                                                <span className="absolute right-2 top-2 text-xs text-slate-400">%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm font-bold text-slate-800 font-mono bg-slate-50/30 border-r border-slate-200">
                                            {inst.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-200">
                                            <Input
                                                type="date"
                                                value={inst.due_date}
                                                onChange={(e) =>
                                                    handleInstallmentChange(inst.id, 'due_date', e.target.value)
                                                }
                                                className="!py-1 h-9"
                                            />
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => removeInstallment(inst.id)}
                                                className="!p-1 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                disabled={installments.length <= 1}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-start mb-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addInstallment}
                            className="w-auto border-dashed border-2 border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 py-2 px-6 flex items-center gap-2 transition-all font-medium"
                        >
                            <PlusIcon className="w-5 h-5" />
                            เพิ่มงวดชำระ (Add Installment)
                        </Button>
                    </div>

                    <div className="md:col-span-2">
                        <FormField label="หมายเหตุ" htmlFor="notes">
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                                className="bg-slate-50"
                            />
                        </FormField>
                    </div>
                </div>
            </form>
        </Modal>
    );
};
