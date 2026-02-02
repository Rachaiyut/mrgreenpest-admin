import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import {
    FormField,
    Input,
    Select,
    Button,
    Textarea,
} from '../../components/common/FormControls';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { LeftArrowIcon, PlusIcon, TrashIcon } from '../../assets/icons/Icons';
import { useData } from '../../contexts/DataContext';

interface InstallmentPlan {
    id: string;
    term: number;
    description: string;
    percentage: number;
    amount: number;
    due_date: string;
}

const CreateContractPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { customers, quotations, handlers } = useData();

    // Contract info
    const [contractCode, setContractCode] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [contractDuration, setContractDuration] = useState('1 ปี');

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

    // Installment plan
    const [installments, setInstallments] = useState<InstallmentPlan[]>([
        {
            id: crypto.randomUUID(),
            term: 1,
            description: 'งวดที่ 1 - ชำระเมื่อเซ็นสัญญา',
            percentage: 30,
            amount: 0,
            due_date: '',
        },
        {
            id: crypto.randomUUID(),
            term: 2,
            description: 'งวดที่ 2 - ชำระหลังบริการครั้งที่ 3',
            percentage: 35,
            amount: 0,
            due_date: '',
        },
        {
            id: crypto.randomUUID(),
            term: 3,
            description: 'งวดที่ 3 - ชำระหลังบริการครั้งสุดท้าย',
            percentage: 35,
            amount: 0,
            due_date: '',
        },
    ]);

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

    // Selected customer details
    const selectedCustomer = useMemo(() => {
        return customers.find((c) => c.id === selectedCustomerId);
    }, [customers, selectedCustomerId]);

    // Initialize from URL params
    useEffect(() => {
        const quotationIdFromUrl = searchParams.get('quotationId');
        if (quotationIdFromUrl) {
            setSelectedQuotationId(quotationIdFromUrl);
        }

        // Generate contract code
        const now = new Date();
        const code = `CT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        setContractCode(code);

        // Set default dates
        setStartDate(now.toISOString().substring(0, 10));
        const endDateObj = new Date(now);
        endDateObj.setFullYear(endDateObj.getFullYear() + 1);
        setEndDate(endDateObj.toISOString().substring(0, 10));
    }, [searchParams]);

    // Auto-fill from quotation when selected
    useEffect(() => {
        if (selectedQuotation) {
            setSelectedCustomerId(selectedQuotation.customer_id);
            setTotalAmount(Number(selectedQuotation.total) || 0);
        }
    }, [selectedQuotation]);

    // Auto-fill customer info
    useEffect(() => {
        if (selectedCustomer) {
            const address = [
                selectedCustomer.address_house_no,
                selectedCustomer.road_line,
                selectedCustomer.sub_district,
                selectedCustomer.district,
                selectedCustomer.province,
                selectedCustomer.postal_code,
            ]
                .filter(Boolean)
                .join(' ');
            setServiceLocation(address);
        }
    }, [selectedCustomer]);

    // Recalculate installment amounts when total changes
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
            },
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

        if (!selectedCustomerId || !selectedCustomer) {
            alert('กรุณาเลือกลูกค้า');
            return;
        }

        if (totalPercentage !== 100) {
            alert('สัดส่วนการแบ่งงวดรวมกันต้องเท่ากับ 100%');
            return;
        }

        try {
            const contractData = {
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
                status: 'DRAFT',
                start_date: startDate,
                end_date: endDate,
                notes: notes,
                installments: installments.map((inst) => ({
                    term: inst.term,
                    description: inst.description,
                    percentage: inst.percentage,
                    amount: inst.amount,
                    due_date: inst.due_date,
                    status: 'PENDING',
                })),
            };

            await handlers.contracts.create(contractData);
            navigate('/contracts');
        } catch (error) {
            console.error('Error creating contract:', error);
            alert('เกิดข้อผิดพลาดในการสร้างใบสัญญา');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/contracts')}
                    className="!p-2"
                >
                    <LeftArrowIcon className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">สร้างใบสัญญาใหม่</h1>
                    <p className="text-slate-500 mt-1">
                        สร้างใบสัญญาพร้อมกำหนดแผนการแบ่งชำระ
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Contract Details */}
                <Card title="ข้อมูลสัญญา">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField label="เลขที่สัญญา" htmlFor="contract-code">
                            <Input
                                id="contract-code"
                                type="text"
                                value={contractCode}
                                onChange={(e) => setContractCode(e.target.value)}
                                required
                            />
                        </FormField>

                        <FormField label="วันเริ่มต้นสัญญา" htmlFor="start-date">
                            <Input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </FormField>

                        <FormField label="วันสิ้นสุดสัญญา" htmlFor="end-date">
                            <Input
                                id="end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </FormField>
                    </div>
                </Card>

                {/* Quotation Reference */}
                <Card title="อ้างอิงใบเสนอราคา (ถ้ามี)">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="เลือกใบเสนอราคา" htmlFor="quotation-select">
                            <SearchableSelect
                                value={selectedQuotationId}
                                onChange={(value) => setSelectedQuotationId(value)}
                                placeholder="-- เลือกใบเสนอราคา (ไม่บังคับ) --"
                                options={quotationOptions}
                            />
                        </FormField>

                        {selectedQuotation && (
                            <div className="flex items-center">
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                                    <span className="text-green-700 font-medium">
                                        ✓ เชื่อมกับใบเสนอราคา: QT-{selectedQuotation.id.slice(0, 8)}
                                    </span>
                                    <p className="text-green-600 mt-1">
                                        มูลค่า: ฿{Number(selectedQuotation.total).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Customer Selection */}
                <Card title="ข้อมูลลูกค้า">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="เลือกลูกค้า" htmlFor="customer-select">
                            <SearchableSelect
                                value={selectedCustomerId}
                                onChange={setSelectedCustomerId}
                                placeholder="-- เลือกลูกค้า --"
                                required
                                options={customers.map((c) => ({
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
                                className="bg-slate-50"
                            />
                        </FormField>
                    </div>

                    {selectedCustomer && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">
                                ข้อมูลลูกค้า
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-slate-500">ชื่อ:</span>{' '}
                                    <span className="font-medium">
                                        {selectedCustomer.first_name} {selectedCustomer.last_name}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500">ประเภท:</span>{' '}
                                    <span className="font-medium">{selectedCustomer.type}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">อีเมล:</span>{' '}
                                    <span className="font-medium">
                                        {selectedCustomer.email || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500">เลขประจำตัวผู้เสียภาษี:</span>{' '}
                                    <span className="font-medium">
                                        {selectedCustomer.tax_id || '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Service Details */}
                <Card title="รายละเอียดบริการ">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="สถานที่ให้บริการ" htmlFor="service-location">
                            <Input
                                id="service-location"
                                type="text"
                                value={serviceLocation}
                                onChange={(e) => setServiceLocation(e.target.value)}
                                placeholder="ที่อยู่สถานที่ให้บริการ"
                            />
                        </FormField>

                        <FormField label="ประเภทบริการ" htmlFor="service-type">
                            <Select
                                id="service-type"
                                value={serviceType}
                                onChange={(e) => setServiceType(e.target.value)}
                            >
                                <option value="">-- เลือกประเภทบริการ --</option>
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
                                type="text"
                                value={systemUsed}
                                onChange={(e) => setSystemUsed(e.target.value)}
                                placeholder="ระบบที่ใช้ในการบริการ"
                            />
                        </FormField>

                        <FormField label="ระยะเวลาสัญญา" htmlFor="contract-duration">
                            <Select
                                id="contract-duration"
                                value={contractDuration}
                                onChange={(e) => setContractDuration(e.target.value)}
                            >
                                <option value="1 ปี">สัญญา 1 ปี</option>
                                <option value="6 เดือน">สัญญา 6 เดือน</option>
                                <option value="3 เดือน">สัญญา 3 เดือน</option>
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

                        <FormField label="มูลค่าสัญญารวม" htmlFor="total-amount">
                            <Input
                                id="total-amount"
                                type="number"
                                value={totalAmount}
                                onChange={(e) => setTotalAmount(Number(e.target.value))}
                                min={0}
                                step={0.01}
                            />
                        </FormField>

                        <div className="md:col-span-2">
                            <FormField label="หมายเหตุ" htmlFor="notes">
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                                />
                            </FormField>
                        </div>
                    </div>
                </Card>

                {/* Installment Plan */}
                <Card title="แผนการแบ่งชำระ">
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-700 font-medium">มูลค่าสัญญารวม</p>
                                <p className="text-2xl font-bold text-blue-800">
                                    ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className={`text-right ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                                <p className="text-sm font-medium">สัดส่วนรวม</p>
                                <p className="text-2xl font-bold">{totalPercentage}%</p>
                                {totalPercentage !== 100 && (
                                    <p className="text-xs">ต้องเท่ากับ 100%</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-16">
                                        งวด
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                                        รายละเอียด
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-24">
                                        สัดส่วน (%)
                                    </th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase w-32">
                                        จำนวนเงิน
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-40">
                                        กำหนดชำระ
                                    </th>
                                    <th className="px-3 py-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {installments.map((inst) => (
                                    <tr key={inst.id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-center text-sm text-slate-500 font-medium">
                                            {inst.term}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Input
                                                type="text"
                                                value={inst.description}
                                                onChange={(e) =>
                                                    handleInstallmentChange(inst.id, 'description', e.target.value)
                                                }
                                                className="!py-1"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <Input
                                                type="number"
                                                value={inst.percentage}
                                                onChange={(e) =>
                                                    handleInstallmentChange(inst.id, 'percentage', Number(e.target.value))
                                                }
                                                min={0}
                                                max={100}
                                                className="!py-1 text-center"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-right text-sm text-slate-700 font-medium">
                                            ฿{inst.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Input
                                                type="date"
                                                value={inst.due_date}
                                                onChange={(e) =>
                                                    handleInstallmentChange(inst.id, 'due_date', e.target.value)
                                                }
                                                className="!py-1"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => removeInstallment(inst.id)}
                                                className="!p-1 text-red-500 hover:text-red-700"
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

                    <div className="mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addInstallment}
                            className="flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            เพิ่มงวดชำระ
                        </Button>
                    </div>
                </Card>

                {/* Submit */}
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/contracts')}
                    >
                        ยกเลิก
                    </Button>
                    <Button type="submit">
                        สร้างใบสัญญา
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CreateContractPage;

