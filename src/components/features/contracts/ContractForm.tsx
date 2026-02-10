import React, { useState, useEffect, useMemo, useRef, useCallback, FC } from 'react';
import {
    FormField,
    Input,
    Select,
    Button,
    Textarea,
} from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { 
    PlusIcon, 
    TrashIcon, 
    DocumentTextIcon, 
    HomeIcon, 
    MapIcon, 
    CurrencyDollarIcon,
    MapPinIcon,
    ClipboardDocumentListIcon
} from '../../../assets/icons/Icons';
import { useData } from '../../../contexts/DataContext';
import { CategoryApi } from '../../../api/category';
import { CategoryType } from '../../../types';
import { CustomerApi } from '../../../api/customer';
import { QuotationApi } from '../../../api/quotation';
import { Customer } from '../../../types/entity/customer.interface';
import { Contract, InstallmentPlan } from '../../../types/entity/financial.interface';
import { ContractStatus } from '../../../types/enums/financial';
import { Quotation } from '../../../types/entity/financial.interface';

export interface ContractFormProps {
    mode: 'create' | 'edit';
    initialValues?: Partial<Contract>;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
    isSaving?: boolean;
}

export const ContractForm: FC<ContractFormProps> = ({
    mode,
    initialValues,
    onSubmit,
    onCancel,
    isSaving = false,
}) => {
    const { customers, categories } = useData();
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    
    // Local state for fetched data
    const [fetchedCategories, setFetchedCategories] = useState<any[]>([]);

    // Contract info
    const [contractCode, setContractCode] = useState(initialValues?.code || '');
    const [status, setStatus] = useState<ContractStatus>((initialValues?.status as ContractStatus) || ContractStatus.DRAFT);
    const [startDate, setStartDate] = useState(
        initialValues?.start_date ? new Date(initialValues.start_date).toISOString().substring(0, 10) : ''
    );
    const [endDate, setEndDate] = useState(
        initialValues?.end_date ? new Date(initialValues.end_date).toISOString().substring(0, 10) : ''
    );
    const [contractDuration, setContractDuration] = useState(initialValues?.contract_duration || '1 ปี');

    // References
    const [selectedQuotationId, setSelectedQuotationId] = useState(initialValues?.quotation_id || '');
    const [selectedCustomerId, setSelectedCustomerId] = useState(initialValues?.customer_id || '');
    const [fullQuotation, setFullQuotation] = useState<any>(null);

    // Service info
    const [serviceLocation, setServiceLocation] = useState(initialValues?.service_location || '');
    
    // Convert comma-separated string back to array if needed, or default to empty array
    const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>(
        initialValues?.service_type 
            ? initialValues.service_type.split(',').map(s => s.trim()).filter(Boolean)
            : []
    );
    const [serviceType, setServiceType] = useState(initialValues?.service_type || '');
    const [buildingType, setBuildingType] = useState(initialValues?.building_type || '');
    
    // Sync serviceType string when selectedServiceTypes changes
    useEffect(() => {
        setServiceType(selectedServiceTypes.join(', '));
    }, [selectedServiceTypes]);

    const [systemUsed, setSystemUsed] = useState(initialValues?.system_used || '');
    const [serviceCount, setServiceCount] = useState(initialValues?.service_count || 7);
    const [notes, setNotes] = useState(initialValues?.notes || '');

    // Pricing
    const [totalAmount, setTotalAmount] = useState(Number(initialValues?.total_amount) || 0);

    // Installment Plan
    const [installments, setInstallments] = useState<InstallmentPlan[]>([]);

    // Customer Search
    const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize logic
    useEffect(() => {
        // Fetch categories
        const fetchCategories = async () => {
            try {
                const res = await CategoryApi.getCategories({ type: CategoryType.SERVICE });
                if (res && res.data) {
                    setFetchedCategories(res.data);
                }
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        fetchCategories();

        // Fetch approved quotations
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

        // Init create mode defaults
        if (mode === 'create' && !initialValues) {
            const now = new Date();
            const code = `CT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            setContractCode(code);
            setStartDate(now.toISOString().substring(0, 10));
            const end = new Date(now);
            end.setFullYear(end.getFullYear() + 1);
            setEndDate(end.toISOString().substring(0, 10));
            
            // Default installments
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
                }
            ]);
        } else if (initialValues?.installments) {
            // Load existing installments
            setInstallments(initialValues.installments.map(inst => ({
                id: inst.id || crypto.randomUUID(),
                term: inst.term,
                description: inst.description,
                percentage: Number(inst.percentage),
                amount: Number(inst.amount),
                due_date: inst.due_date ? new Date(inst.due_date).toISOString().substring(0, 10) : '',
                status: inst.status as any
            })));
        }
    }, [mode]);

    // Initialize searched customers
    useEffect(() => {
        if (customers.length > 0 && searchedCustomers.length === 0) {
            setSearchedCustomers(customers);
        }
    }, [customers]);

    const handleCustomerSearch = useCallback((query: string) => {
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
    }, [customers]);

    // Service Type Options derived from categories
    const serviceTypeOptions = useMemo(() => {
        const sourceCategories = fetchedCategories.length > 0 ? fetchedCategories : (categories || []);
        const options = sourceCategories
            .filter((c: any) => c.type === 'SERVICE')
            .map((c: any) => ({
                value: c.name, // Use name as value to match backend expectation of string
                label: c.name,
                id: c.id // Keep ID for reference if needed
            }));

        // Add "Other" option if not present
        // Check for Thai "อื่นๆ" or English "Other"
        const hasOther = options.some(o => o.value === 'อื่นๆ' || o.value === 'Other');
        if (!hasOther) {
            options.push({
                value: 'อื่นๆ',
                label: 'อื่นๆ',
                id: 'other-option'
            });
        }

        return options;
    }, [categories, fetchedCategories]);

    // Quotation options
    const quotationOptions = useMemo(() => {
        return quotations.map((q) => ({
            value: q.id,
            label: `${q.code || `QT-${q.id.slice(0, 8)}`} - ${q.customer_name}`,
            description: `฿${Number(q.total).toLocaleString('th-TH')}`,
        }));
    }, [quotations]);

    // Selected customer
    const selectedCustomer = useMemo(() => {
        return customers.find((c) => c.id === selectedCustomerId) || searchedCustomers.find((c) => c.id === selectedCustomerId);
    }, [customers, searchedCustomers, selectedCustomerId]);

    // Auto-fill from Quotation
    const isInitialLoad = useRef(true);
    useEffect(() => {
        // Skip on initial mount if editing to avoid overwriting
        if (mode === 'edit' && isInitialLoad.current) {
            isInitialLoad.current = false;
            return;
        }

        const fetchQuotationDetails = async () => {
            if (selectedQuotationId) {
                try {
                    const response = await QuotationApi.getById(selectedQuotationId);
                    const fullQuotationData = (response as any).data || response;
                    setFullQuotation(fullQuotationData);
                    
                    if (fullQuotationData) {
                        // Only set if not already set or if explicitly changing quotation
                        if (mode === 'create' || !selectedCustomerId) {
                            setSelectedCustomerId(fullQuotationData.customer_id);
                        }
                        
                        setTotalAmount(Number(fullQuotationData.total) || 0);
                        if (fullQuotationData.service_location) setServiceLocation(fullQuotationData.service_location);
                        if (fullQuotationData.building_type) setBuildingType(fullQuotationData.building_type);
                        if (fullQuotationData.service_type) {
                            setServiceType(fullQuotationData.service_type);
                            setSelectedServiceTypes(fullQuotationData.service_type.split(',').map((s: string) => s.trim()).filter(Boolean));
                        }
                        
                        if (fullQuotationData.system_used) {
                            setSystemUsed(fullQuotationData.system_used);
                        } else if (fullQuotationData.service_type) {
                             if (fullQuotationData.service_type.includes('เหยื่อ') || fullQuotationData.service_type.includes('Bait')) {
                                setSystemUsed('ระบบเหยื่อ');
                            } else if (fullQuotationData.service_type.includes('เคมี') || fullQuotationData.service_type.includes('Chemical')) {
                                setSystemUsed('ระบบสารเคมีกึ่งชีวภาพ');
                            } else if (fullQuotationData.service_type.includes('ฉีดพ่น') || fullQuotationData.service_type.includes('Spray')) {
                                setSystemUsed('ระบบฉีดพ่น');
                            }
                        }

                        if (fullQuotationData.contract_duration) setContractDuration(fullQuotationData.contract_duration);
                        if (fullQuotationData.service_count) setServiceCount(parseInt(String(fullQuotationData.service_count)) || 7);
                        if (fullQuotationData.notes) setNotes(fullQuotationData.notes);

                        // Auto-fill installments from quotation if available
                        if (fullQuotationData.installments && fullQuotationData.installments.length > 0) {
                             const backendInstallments = fullQuotationData.installments as any[];
                             
                             // Parsing Duration
                             let durationMonths = 12;
                             if (contractDuration.includes('ปี')) {
                                 durationMonths = parseFloat(contractDuration) * 12;
                             } else if (contractDuration.includes('เดือน')) {
                                 durationMonths = parseFloat(contractDuration);
                             }

                             let creditTermDays = 30;
                             if (fullQuotationData.payment_terms) {
                                 const match = fullQuotationData.payment_terms.match(/(\d+)\s*(วัน|Day)/i);
                                 if (match) creditTermDays = parseInt(match[1]);
                             }

                             const totalVisits = Number(fullQuotationData.service_count) || 1;
                             const totalInst = backendInstallments.length;
                             const visitsPerInst = Math.ceil(totalVisits / totalInst);
                             const startDateObj = startDate ? new Date(startDate) : new Date();

                             const mappedInstallments: InstallmentPlan[] = backendInstallments.map((inst, index) => {
                                 const startVisit = (index * visitsPerInst) + 1;
                                 const endVisit = Math.min((index + 1) * visitsPerInst, totalVisits);
                                 
                                 let calculatedDueDate = '';
                                 if (startDate) {
                                    const monthsToAdd = (endVisit / totalVisits) * durationMonths;
                                    const serviceDateObj = new Date(startDateObj);
                                    serviceDateObj.setMonth(serviceDateObj.getMonth() + Math.floor(monthsToAdd));
                                    serviceDateObj.setDate(serviceDateObj.getDate() + creditTermDays);
                                    calculatedDueDate = serviceDateObj.toISOString().substring(0, 10);
                                 } else {
                                     if (inst.service_date) calculatedDueDate = new Date(inst.service_date).toISOString().substring(0, 10);
                                     else if (inst.due_date) calculatedDueDate = new Date(inst.due_date).toISOString().substring(0, 10);
                                 }

                                 const term = Number(inst.installment_no || inst.term || 0);
                                 let description = inst.notes || inst.description || `งวดที่ ${term}`;
                                 const coverageText = `(ครอบคลุมบริการครั้งที่ ${startVisit}-${endVisit})`;
                                 if (!description.includes('ครอบคลุมบริการ')) {
                                     description = `${description} ${coverageText}`;
                                 }

                                 const amount = Number(inst.amount);
                                 const total = Number(fullQuotationData.total) || 0;
                                 const percentage = total > 0 ? Number(((amount / total) * 100).toFixed(2)) : 0;

                                 return {
                                     id: crypto.randomUUID(),
                                     term: term,
                                     description: description,
                                     percentage: percentage,
                                     amount: amount,
                                     due_date: calculatedDueDate,
                                     status: 'PENDING' as any
                                 };
                             });
                             
                             mappedInstallments.sort((a, b) => a.term - b.term);
                             setInstallments(mappedInstallments);
                        } else if (mode === 'create') {
                             // If no installments in quotation, default to full payment
                             setInstallments([{
                                 id: crypto.randomUUID(),
                                 term: 1,
                                 description: 'งวดที่ 1 - ชำระเต็มจำนวน (Full Payment)',
                                 percentage: 100,
                                 amount: Number(fullQuotationData.total) || 0,
                                 due_date: '',
                                 status: 'PENDING' as any
                             }]);
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch quotation details:", error);
                }
            } else {
                setFullQuotation(null);
            }
        };
        fetchQuotationDetails();
    }, [selectedQuotationId, mode, startDate]);

    // Auto-fill address
    useEffect(() => {
        if (selectedCustomer && !serviceLocation) {
             const address = [
                selectedCustomer.address_house_no,
                selectedCustomer.road_line,
                selectedCustomer.sub_district,
                selectedCustomer.district,
                selectedCustomer.province,
                selectedCustomer.postal_code,
            ].filter(Boolean).join(' ');
            setServiceLocation(address);
        }
    }, [selectedCustomer]);

    // Recalculate Installments
    useEffect(() => {
        setInstallments(prev => prev.map(inst => ({
            ...inst,
            amount: Math.round(totalAmount * (inst.percentage / 100))
        })));
    }, [totalAmount]);

    const handleInstallmentChange = (id: string, field: keyof InstallmentPlan, value: any) => {
        setInstallments(prev => prev.map(inst => {
            if (inst.id !== id) return inst;
            const updated = { ...inst, [field]: value };
            if (field === 'percentage') {
                updated.amount = Math.round(totalAmount * (Number(value) / 100));
            }
            if (field === 'amount') {
                updated.percentage = totalAmount > 0 ? (Number(value) / totalAmount) * 100 : 0;
            }
            return updated;
        }));
    };

    const addInstallment = () => {
        const newTerm = installments.length + 1;
        setInstallments(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                term: newTerm,
                description: `งวดที่ ${newTerm}`,
                percentage: 0,
                amount: 0,
                due_date: '',
                status: 'PENDING' as any,
            }
        ]);
    };

    const removeInstallment = (id: string) => {
        if (installments.length <= 1) return;
        setInstallments(prev => {
            const filtered = prev.filter(inst => inst.id !== id);
            return filtered.map((inst, index) => ({
                ...inst,
                term: index + 1
            }));
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedCustomerId) {
            alert('กรุณาเลือกลูกค้า');
            return;
        }

        const totalPercentage = installments.reduce((sum, inst) => sum + Number(inst.percentage), 0);
        if (Math.abs(totalPercentage - 100) > 0.5) {
            alert(`สัดส่วนการแบ่งงวดรวมกันต้องเท่ากับ 100% (ปัจจุบัน: ${totalPercentage}%)`);
            return;
        }

        const selectedCustomerObj = customers.find(c => c.id === selectedCustomerId) || searchedCustomers.find(c => c.id === selectedCustomerId);
            
        const payload = {
            ...initialValues,
            code: contractCode,
            quotation_id: selectedQuotationId || undefined,
            customer_id: selectedCustomerId,
            customer_name: selectedCustomerObj ? `${selectedCustomerObj.first_name} ${selectedCustomerObj.last_name}` : 'Unknown',
            service_location: serviceLocation,
            building_type: buildingType,
            service_type: serviceType,
            system_used: systemUsed,
            contract_duration: contractDuration,
            service_count: serviceCount,
            total_amount: totalAmount,
            status: status,
            start_date: startDate,
            end_date: endDate,
            notes: notes,
            installments: installments.map(inst => ({
                id: inst.id.length < 36 ? undefined : inst.id, 
                term: inst.term,
                description: inst.description,
                percentage: inst.percentage,
                amount: inst.amount,
                due_date: inst.due_date ? inst.due_date : undefined,
                status: inst.status
            }))
        };
        
        await onSubmit(payload);
    };

    const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
                <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
        </div>
    );

    const totalPercentage = installments.reduce((sum, inst) => sum + Number(inst.percentage), 0);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: General Information */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <SectionHeader icon={DocumentTextIcon} title="ข้อมูลทั่วไป (General Information)" />
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="เลขที่สัญญา" htmlFor="code">
                                <Input
                                    id="code"
                                    value={contractCode}
                                    onChange={(e) => setContractCode(e.target.value)}
                                    readOnly={mode === 'create'}
                                    className={mode === 'create' ? 'bg-gray-50 font-mono' : 'font-mono'}
                                />
                            </FormField>
                            <FormField label="สถานะ" htmlFor="status">
                                <Select
                                    id="status"
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

                        <FormField label="ลูกค้า" htmlFor="customer">
                            <SearchableSelect
                                options={searchedCustomers.map(c => ({
                                    value: c.id,
                                    label: `${c.code} - ${c.first_name} ${c.last_name}`,
                                    description: c.phone
                                }))}
                                value={selectedCustomerId}
                                onChange={setSelectedCustomerId}
                                onSearchChange={handleCustomerSearch}
                                placeholder="ค้นหาลูกค้า..."
                            />
                        </FormField>

                        <FormField label="อ้างอิงใบเสนอราคา (ถ้ามี)" htmlFor="quotation">
                            <SearchableSelect
                                options={quotationOptions}
                                value={selectedQuotationId}
                                onChange={setSelectedQuotationId}
                                placeholder="เลือกใบเสนอราคา..."
                            />
                        </FormField>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="วันที่เริ่มสัญญา" htmlFor="startDate">
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </FormField>
                            <FormField label="วันที่สิ้นสุดสัญญา" htmlFor="endDate">
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </FormField>
                        </div>
                    </div>
                </div>

                {/* Right Column: Address Information */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <SectionHeader icon={HomeIcon} title="ข้อมูลที่อยู่ (Address Information)" />
                    
                    <div className="space-y-4">
                        <FormField label="สถานที่ให้บริการ" htmlFor="location">
                            <Textarea
                                id="location"
                                value={serviceLocation}
                                onChange={(e) => setServiceLocation(e.target.value)}
                                rows={4}
                                placeholder="ที่อยู่สำหรับเข้าให้บริการ..."
                            />
                        </FormField>

                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                             <h4 className="text-sm font-semibold text-yellow-800 mb-2">Google Map</h4>
                             {selectedCustomer?.google_map_link ? (
                                 <a 
                                    href={selectedCustomer.google_map_link} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                 >
                                    <MapPinIcon className="w-4 h-4" /> เปิดแผนที่ลูกค้า
                                 </a>
                             ) : (
                                 <span className="text-sm text-slate-500">ไม่พบลิงก์แผนที่ในข้อมูลลูกค้า</span>
                             )}
                        </div>
                    </div>
                </div>

                {(() => {
                    const areasToDisplay = fullQuotation?.quotation_areas?.length > 0
                        ? fullQuotation.quotation_areas
                        : fullQuotation?.assessment?.assessment_areas;

                    if (!areasToDisplay || areasToDisplay.length === 0) return null;

                    return (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
                            <SectionHeader icon={ClipboardDocumentListIcon} title="รายละเอียดพื้นที่ (Area Breakdown)" />

                            <div className="space-y-4">
                                {areasToDisplay.map((area: any, index: number) => {
                                    const itemsTotal = area.items?.reduce((sum: number, item: any) => sum + (Number(item.total_price || item.amount) || 0), 0) || 0;
                                    const basePrice = (Number(area.total_price) || 0) - itemsTotal;
                                    return (
                                        <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                                                    <h4 className="font-semibold text-slate-800">{area.area_name}</h4>
                                                </div>
                                                <div className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full text-sm">
                                                    ฿{Number(area.total_price || 0).toLocaleString()}
                                                </div>
                                            </div>

                                            <div className="p-4">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                    <div>
                                                        <div className="text-xs text-slate-500 mb-1">ประเภทสิ่งปลูกสร้าง</div>
                                                        <div className="font-medium text-slate-800">{area.building_type || '-'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 mb-1">พื้นที่ (ตร.ม.)</div>
                                                        <div className="font-medium text-slate-800">{Number(area.area_size || 0).toLocaleString()}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 mb-1">ระบบที่ใช้</div>
                                                        <div className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                                            {area.service_system === 'PREY' ? 'เหยื่อ' : area.service_system === 'CHEMICAL' ? 'สารเคมี' : area.service_system || '-'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 mb-1">ราคาบริการหลัก</div>
                                                        <div className="font-medium text-slate-800">฿{Number(basePrice).toLocaleString()}</div>
                                                    </div>
                                                </div>


                                                {/* Package Information */}
                                                {area.packagePriceRelation && (
                                                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                            <div className="text-sm font-semibold text-blue-900">แพ็กเกจที่เลือก</div>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                            <div>
                                                                <div className="text-xs text-blue-600 mb-1">ชื่อแพ็กเกจ</div>
                                                                <div className="font-medium text-blue-900">
                                                                    {area.packagePriceRelation.package?.name || area.packagePriceRelation.name || '-'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-blue-600 mb-1">จำนวนครั้งบริการ</div>
                                                                <div className="font-medium text-blue-900">
                                                                    {area.packagePriceRelation.package?.visit_limit || '-'} ครั้ง
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-blue-600 mb-1">ระยะเวลาสัญญา</div>
                                                                <div className="font-medium text-blue-900">
                                                                    {area.packagePriceRelation.package?.contract_period
                                                                        ? `${area.packagePriceRelation.package.contract_period >= 12
                                                                            ? (area.packagePriceRelation.package.contract_period / 12) + ' ปี'
                                                                            : area.packagePriceRelation.package.contract_period + ' เดือน'}`
                                                                        : '-'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="mb-4">
                                                    <label className="block text-xs text-slate-500 mb-2">
                                                        ประเภทบริการ
                                                    </label>
                                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                            {serviceTypeOptions.map((option) => {
                                                                const isChecked = area.category_services?.some((cat: any) => {
                                                                    const matchId = (cat.category_id && cat.category_id === option.id) ||
                                                                        (cat.category?.id && cat.category.id === option.id);
                                                                    const matchName = (cat.name && cat.name === option.value) ||
                                                                        (cat.category?.name && cat.category.name === option.value);
                                                                    return matchId || matchName;
                                                                });

                                                                return (
                                                                    <label key={option.id} className="flex items-center gap-2 cursor-default">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            disabled={true}
                                                                            className="rounded border-slate-300 text-green-600 focus:ring-green-500 disabled:opacity-100 bg-white"
                                                                            readOnly
                                                                        />
                                                                        <span className={`text-sm ${isChecked ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                                                                            {option.label}
                                                                        </span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {area.items && area.items.length > 0 && (
                                                    <div className="mt-4 border rounded-lg overflow-hidden">
                                                        <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 border-b">
                                                            สินค้า/บริการเพิ่มเติม
                                                        </div>
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="text-xs text-slate-500 bg-white border-b">
                                                                <tr>
                                                                    <th className="px-4 py-2 font-medium">รายการ</th>
                                                                    <th className="px-4 py-2 font-medium text-center w-20">จำนวน</th>
                                                                    <th className="px-4 py-2 font-medium text-right w-32">ราคา/หน่วย</th>
                                                                    <th className="px-4 py-2 font-medium text-right w-32">รวม</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {area.items.map((item: any, i: number) => (
                                                                    <tr key={i} className="hover:bg-slate-50">
                                                                        <td className="px-4 py-2 text-slate-800">{item.product_name || item.description}</td>
                                                                        <td className="px-4 py-2 text-center text-slate-600">{item.quantity}</td>
                                                                        <td className="px-4 py-2 text-right text-slate-600">{Number(item.product_price || item.unit_price).toLocaleString()}</td>
                                                                        <td className="px-4 py-2 text-right font-medium text-slate-800">{Number(item.total_price || item.amount).toLocaleString()}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* Service Details - Full Width */}
                {!selectedQuotationId && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
                    <SectionHeader icon={MapIcon} title="รายละเอียดการบริการ (Service Details)" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FormField label="ประเภทสิ่งปลูกสร้าง" htmlFor="buildingType">
                            <Select
                                id="buildingType"
                                value={buildingType}
                                onChange={(e) => setBuildingType(e.target.value)}
                            >
                                <option value="">เลือกประเภทสิ่งปลูกสร้าง</option>
                                <option value="HOUSE">บ้าน</option>
                                <option value="OFFICE">ออฟฟิศ</option>
                            </Select>
                        </FormField>


                        <FormField label="ระบบที่ใช้" htmlFor="systemUsed">
                            <Input
                                id="systemUsed"
                                value={systemUsed}
                                onChange={(e) => setSystemUsed(e.target.value)}
                                placeholder="เช่น ระบบเหยื่อ, ระบบฉีดพ่น"
                            />
                        </FormField>

                        <FormField label="ระยะเวลาสัญญา" htmlFor="duration">
                            <Select
                                id="duration"
                                value={contractDuration}
                                onChange={(e) => setContractDuration(e.target.value)}
                            >
                                <option value="1 ปี">1 ปี</option>
                                <option value="6 เดือน">6 เดือน</option>
                                <option value="3 เดือน">3 เดือน</option>
                                <option value="ครั้งเดียว">ครั้งเดียว</option>
                            </Select>
                        </FormField>

                         <FormField label="จำนวนครั้งเข้าบริการ" htmlFor="serviceCount">
                            <Input
                                id="serviceCount"
                                type="number"
                                value={serviceCount}
                                onChange={(e) => setServiceCount(Number(e.target.value))}
                            />
                        </FormField>

												  <div className="col-span-1 md:col-span-2 lg:col-span-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                ประเภทบริการ<span className="text-red-500">*</span>
                            </label>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {serviceTypeOptions.map((option) => (
                                        <label key={option.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedServiceTypes.includes(option.value)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedServiceTypes([...selectedServiceTypes, option.value]);
                                                    } else {
                                                        setSelectedServiceTypes(selectedServiceTypes.filter(t => t !== option.value));
                                                    }
                                                }}
                                                className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                                            />
                                            <span className="text-sm text-slate-700">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                                {selectedServiceTypes.length === 0 && (
                                    <p className="text-xs text-red-500 mt-2">กรุณาเลือกอย่างน้อย 1 รายการ</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {/* Payment & Installments - Full Width */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
                    <SectionHeader icon={CurrencyDollarIcon} title="การชำระเงินและงวดงาน (Payment & Installments)" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                        <div>
                            <FormField label="มูลค่าสัญญารวม (บาท)" htmlFor="totalAmount">
                                <Input
                                    id="totalAmount"
                                    type="number"
                                    value={totalAmount}
                                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                                    className="text-right font-bold text-lg text-primary"
                                />
                            </FormField>
                        </div>
                         <div className="flex items-center">
                            <div className={`flex-1 p-4 rounded-lg border ${Math.abs(totalPercentage - 100) < 0.5 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-600">สัดส่วนการแบ่งงวดรวม</span>
                                    <span className={`text-xl font-bold ${Math.abs(totalPercentage - 100) < 0.5 ? 'text-green-700' : 'text-red-700'}`}>
                                        {totalPercentage.toFixed(0)}%
                                    </span>
                                </div>
                                {Math.abs(totalPercentage - 100) >= 0.5 && (
                                    <p className="text-xs text-red-600 mt-1 text-right">ต้องเท่ากับ 100%</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto border rounded-lg border-slate-200 mb-6">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-16">งวด</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">รายละเอียด (Description)</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-24">%</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase w-32">จำนวนเงิน</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-40">กำหนดชำระ</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-32">สถานะ</th>
                                    <th className="px-2 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {installments.map((inst, index) => (
                                    <tr key={inst.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-center text-sm font-medium text-slate-500 bg-slate-50/50">{inst.term}</td>
                                        <td className="px-4 py-2">
                                            <Input
                                                value={inst.description}
                                                onChange={(e) => handleInstallmentChange(inst.id, 'description', e.target.value)}
                                                className="!py-1 h-9"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <Input
                                                type="number"
                                                value={inst.percentage}
                                                onChange={(e) => handleInstallmentChange(inst.id, 'percentage', e.target.value)}
                                                className="!py-1 text-center h-9"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <Input
                                                type="number"
                                                value={inst.amount}
                                                onChange={(e) => handleInstallmentChange(inst.id, 'amount', e.target.value)}
                                                className="!py-1 text-right h-9 font-mono"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <Input
                                                type="date"
                                                value={inst.due_date}
                                                onChange={(e) => handleInstallmentChange(inst.id, 'due_date', e.target.value)}
                                                className="!py-1 h-9"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                             <Select
                                                value={inst.status as any}
                                                onChange={(e) => handleInstallmentChange(inst.id, 'status', e.target.value)}
                                                className="!py-1 h-9 text-xs"
                                            >
                                                <option value="PENDING">รอชำระ</option>
                                                <option value="PAID">ชำระแล้ว</option>
                                                <option value="OVERDUE">เกินกำหนด</option>
                                            </Select>
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeInstallment(inst.id)}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                                disabled={installments.length <= 1}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
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

                    <div className="border-t pt-4 mt-4">
                        <FormField label="หมายเหตุ" htmlFor="notes">
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder="หมายเหตุเพิ่มเติม..."
                            />
                        </FormField>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                <Button type="button" variant="outline" onClick={onCancel} className="px-6">
                    ยกเลิก
                </Button>
                <Button type="submit" disabled={isSaving} variant="primary" className="px-8">
                    {isSaving ? 'กำลังบันทึก...' : (mode === 'create' ? 'สร้างใบสัญญา' : 'บันทึกการแก้ไข')}
                </Button>
            </div>
        </form>
    );
};
