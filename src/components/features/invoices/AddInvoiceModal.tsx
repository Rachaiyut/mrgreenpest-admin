import React, { useState, useEffect, useMemo, useRef, useCallback, FC } from 'react';
import { FormField, Input, Select, Button, Textarea } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { PlusIcon, TrashIcon, DocumentTextIcon } from '../../../assets/icons/Icons';
import { useData } from '../../../contexts/DataContext';
import { CustomerApi } from '../../../api/customer';
import { ContractApi } from '../../../api/contract';
import { QuotationApi } from '../../../api/quotation';
import { InvoiceApi } from '../../../api/invoice';
import { Customer } from '../../../types/entity/customer.interface';
import { Status } from '../../../types/entity/core.interface';
import { Invoice, Contract, Quotation } from '../../../types/entity/financial.interface';
import { InvoiceStatus } from '../../../types/enums/financial';

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'ร่าง',
  PENDING: 'รอชำระ',
  SENT: 'ส่งแล้ว',
  PAID: 'ชำระแล้ว',
  PARTIAL: 'ชำระบางส่วน',
  OVERDUE: 'เกินกำหนด',
  CANCELLED: 'ยกเลิก',
};

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
  initialContractId?: string;
  embedded?: boolean;
}

export const InvoiceForm: FC<InvoiceFormProps> = ({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  initialContractId,
  embedded = false,
}) => {
  const { customers, products, invoices, fetchData } = useData();
  
  // -- Master Data States --
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [invoiceSchedules, setInvoiceSchedules] = useState<any[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  // 💡 State ใหม่สำหรับรองรับการออกบิลอิสระ (Ad-hoc)
  const [isAdhocMode, setIsAdhocMode] = useState<boolean>(false);

  // -- Form States --
  const [formData, setFormData] = useState({
    code: initialValues?.code || '',
    issuedDate: initialValues?.issued_at 
      ? new Date(initialValues.issued_at).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0],
    dueDate: initialValues?.due_at 
      ? new Date(initialValues.due_at).toISOString().split('T')[0] 
      : '',
    status: (initialValues?.status as InvoiceStatus) || InvoiceStatus.DRAFT,
    notes: initialValues?.notes || '',
    includeVat: initialValues?.include_vat ?? true,
    customerId: initialValues?.customer_id || '',
    contractId: (initialValues as any)?.contract_id || initialContractId || '',
    quotationId: initialValues?.quotation_id || '',
    term: initialValues?.term || null as number | null,
    selectedScheduleId: null as string | null, // 💡 เก็บ ID ของงวดที่เลือก (รองรับ ID จำลองตอนปิดยอด)
  });

  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (initialValues?.items && initialValues.items.length > 0) {
      return initialValues.items.map((i: any) => ({
        id: i.id || crypto.randomUUID(),
        product_id: i.product_id,
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unit_price),
        amount: Number(i.amount),
      }));
    }
    return [{ id: crypto.randomUUID(), description: '', quantity: 1, unit: 'รายการ', unitPrice: 0, amount: 0 }];
  });

  // -- Initialization & Effects --
  useEffect(() => {
    if (mode === 'create' && !formData.dueDate) {
      const d = new Date(formData.issuedDate);
      d.setDate(d.getDate() + 30);
      setFormData(prev => ({ ...prev, dueDate: d.toISOString().split('T')[0] }));
    }
  }, [mode, formData.issuedDate, formData.dueDate]);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [contractsRes, quotationsRes] = await Promise.all([
          ContractApi.getAll({ status: 'ACTIVE', limit: 50 }),
          QuotationApi.getAll({ status: 'APPROVED', limit: 50 })
        ]);
        if (contractsRes?.data) setContracts(contractsRes.data);
        if (quotationsRes?.data) setQuotations(quotationsRes.data);
      } catch (error) {
        console.error('Error fetching master data:', error);
      }
    };
    loadMasterData();
  }, []);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (formData.contractId) {
        setIsLoadingSchedules(true);
        try {
          const res = await InvoiceApi.getAllInvoiceSchedule(formData.contractId);
          const data = (res as any).data || res;
          setInvoiceSchedules(Array.isArray(data) ? data : []);
          
          // รีเซ็ตโหมด Ad-hoc เมื่อเปลี่ยนสัญญา
          setIsAdhocMode(false);
          setFormData(prev => ({ ...prev, term: null, selectedScheduleId: null }));
        } catch (error) {
          console.error('Error fetching invoice schedules:', error);
          setInvoiceSchedules([]);
        } finally {
          setIsLoadingSchedules(false);
        }
      } else {
        setInvoiceSchedules([]);
      }
    };

    fetchSchedules();
  }, [formData.contractId]);

  // -- Derived Data & Calculations --
  const totals = useMemo(() => {
    const itemsTotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    if (formData.includeVat) {
      const vatAmount = Number((itemsTotal * (7 / 107)).toFixed(2));
      const subtotal = Number((itemsTotal - vatAmount).toFixed(2));
      return { subtotal, vatAmount, netTotal: itemsTotal };
    } else {
      return { subtotal: itemsTotal, vatAmount: 0, netTotal: itemsTotal };
    }
  }, [items, formData.includeVat]);

  const selectedCustomer = useMemo(() => 
    [...customers, ...searchedCustomers].find(c => c.id === formData.customerId), 
  [customers, searchedCustomers, formData.customerId]);

  const selectedContract = useMemo(() => 
    contracts.find(c => c.id === formData.contractId), 
  [contracts, formData.contractId]);

  const selectedQuotation = useMemo(() => 
    quotations.find(q => q.id === formData.quotationId), 
  [quotations, formData.quotationId]);

  const referenceSource = selectedContract || selectedQuotation;

  const availableInstallments = useMemo(() => {
    if (formData.contractId && invoiceSchedules.length > 0) {
      return invoiceSchedules.filter((inst: any) => {
        const term = inst.installment_no || inst.sequence;
        const status = String(inst.status).toUpperCase();
        
        if (initialValues?.id && initialValues.term === term) return true;
        // ปล่อยให้ตัวเลือก PAY_ALL ผ่านมาด้วย
        if (inst.is_pay_all) return true;
        
        return status === 'PENDING' || status === 'PARTIAL';
      }).map((inst: any) => ({
        id: inst.id,
        term: inst.installment_no || inst.sequence,
        description: inst.description || inst.notes || `งวดที่ ${inst.installment_no || inst.sequence}`,
        percentage: inst.percentage || 0,
        amount: Number(inst.amount || inst.expected_amount || 0),
        is_pay_all: inst.is_pay_all || false, // 💡 แมพ Flag กลับมาให้ React รู้จัก
      }));
    }

    if (!referenceSource?.installments || referenceSource.installments.length === 0) return [];
    
    const sourceId = referenceSource.id;
    const invoicedTerms = new Set(
      invoices
        .filter(inv => (inv.contract_id === sourceId || inv.quotation_id === sourceId) && inv.status !== InvoiceStatus.CANCELLED && inv.id !== initialValues?.id)
        .map(inv => inv.term).filter(Boolean)
    );

    return referenceSource.installments.filter((inst: any) => {
      const term = inst.term || inst.installment_no;
      const isPaid = inst.status === Status.Paid || (inst.status as string) === 'PAID';
      
      if (initialValues?.id && initialValues.term === term) return true;
      return !invoicedTerms.has(term) && !isPaid;
    }).map((inst: any) => ({
      id: inst.id,
      term: inst.term || inst.installment_no,
      description: inst.description || inst.notes || `งวดที่ ${inst.term || inst.installment_no}`,
      percentage: inst.percentage || 0,
      amount: Number(inst.amount),
      is_pay_all: false,
    }));
  }, [referenceSource, invoices, initialValues, formData.contractId, invoiceSchedules]);

  // -- Handlers --
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleCustomerSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      if (!query.trim()) return setSearchedCustomers([]);
      try {
        const res = await CustomerApi.getCustomers({ search: query, limit: 20 });
        if (res?.data) setSearchedCustomers(res.data);
      } catch (err) { console.error(err); }
    }, 500);
  }, []);

  const handleRefChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'contractId' && value) {
        const contract = contracts.find(c => c.id === value);
        if (contract) {
          updated.customerId = contract.customer_id;
          updated.quotationId = contract.quotation_id || prev.quotationId;
          updated.term = null;
          updated.selectedScheduleId = null;
        }
      }
      if (field === 'quotationId' && value && !prev.contractId) {
        const quote = quotations.find(q => q.id === value);
        if (quote) {
          updated.customerId = quote.customer_id;
          updated.term = null;
          updated.selectedScheduleId = null;
        }
      }
      return updated;
    });
  };

  // 💡 เมื่อแอดมินเลือกงวด (ปกติ หรือ ปิดยอด)
  const handleSelectInstallment = (inst: any) => {
    setIsAdhocMode(false); // ปิดโหมดคีย์อิสระ
    setFormData(prev => ({ 
      ...prev, 
      term: inst.term,
      selectedScheduleId: inst.id 
    }));
    
    setItems([{
      id: crypto.randomUUID(),
      description: inst.description,
      quantity: 1,
      unit: inst.is_pay_all ? 'สัญญา' : 'งวด',
      unitPrice: inst.amount,
      amount: inst.amount
    }]);
  };

  // 💡 เมื่อแอดมินกดปุ่ม "สร้างใบแจ้งหนี้พิเศษ (คีย์รายการเอง)"
  const handleEnableAdhocMode = () => {
    setIsAdhocMode(true);
    setFormData(prev => ({ ...prev, term: null, selectedScheduleId: null }));
    setItems([{ id: crypto.randomUUID(), description: 'บริการเพิ่มเติม (นอกเหนือสัญญา)', quantity: 1, unit: 'รายการ', unitPrice: 0, amount: 0 }]);
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        updated.amount = Number(updated.quantity) * Number(updated.unitPrice);
      }
      return updated;
    }));
  };

  const handleProductSelect = (itemId: string, productName: string) => {
    const product = products.find(p => p.name === productName);
    if (product) {
      setItems(prev => prev.map(item => item.id === itemId ? {
        ...item,
        description: product.name,
        unit: (typeof product.unit === 'string' ? product.unit : (product.unit as any)?.name) || 'รายการ',
        unitPrice: Number(product.price),
        amount: Number(product.price) * item.quantity,
      } : item));
    } else {
      updateItem(itemId, 'description', productName);
    }
  };

  const addItem = () => setItems(prev => [...prev, { id: crypto.randomUUID(), description: '', quantity: 1, unit: 'รายการ', unitPrice: 0, amount: 0 }]);
  const removeItem = (id: string) => { if (items.length > 1) setItems(prev => prev.filter(i => i.id !== id)); };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!formData.customerId) {
      alert('กรุณาเลือกลูกค้า');
      return;
    }

    // 💡 Validation: ถ้าไม่ได้เปิดโหมด Ad-hoc และมีตารางงวดอยู่ ต้องบังคับเลือก
    if (!isAdhocMode && availableInstallments.length > 0 && !formData.selectedScheduleId) {
      alert('กรุณาเลือกงวดที่ต้องการเรียกเก็บเงิน หรือ กดปุ่ม "ออกบิลแบบกำหนดเอง"');
      return;
    }

    setIsSaving(true);
    try {
      const selectedInst = availableInstallments.find((i: any) => i.id === formData.selectedScheduleId);

      const payload = {
        contract_id: formData.contractId || undefined,
        quotation_id: formData.quotationId || undefined,
        customer_id: formData.customerId,
        customer_name: selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Unknown',
        issued_at: formData.issuedDate,
        due_at: formData.dueDate,
        subtotal: totals.subtotal,
        vat_amount: totals.vatAmount,
        include_vat: formData.includeVat,
        total: totals.netTotal,
        status: formData.status,
        notes: formData.notes,
        
        // 💡 ส่ง Flag ให้ตรงกับ Backend
        is_pay_all: selectedInst?.is_pay_all || undefined,
        is_ad_hoc: isAdhocMode || undefined,
        term: (!selectedInst?.is_pay_all && !isAdhocMode) ? formData.term : undefined, // ส่ง term เฉพาะงวดปกติ
        invoice_schedule_id: (!selectedInst?.is_pay_all && !isAdhocMode) ? selectedInst?.id : undefined,

        items: items.map((item, index) => ({
          id: item.id,
          sequence: index + 1,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: Number(item.unitPrice),
          amount: Number(item.amount),
        })),
      };

      if (mode === 'create') {
        await InvoiceApi.create(payload);
        alert('สร้างใบแจ้งหนี้สำเร็จ!');
        fetchData(['invoices']);
        onCancel();
      } else {
        await onSubmit(payload);
      }
    } catch (error) {
      console.error('Submit Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submitForm} className={embedded ? 'space-y-8' : 'bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-8'}>
      {/* ... ส่วน Top Section และ Customer Data (เหมือนเดิมเป๊ะ) ... */}
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
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as InvoiceStatus }))}
                  className={`w-40 font-medium border-0 ring-1 ring-inset py-1.5 h-9 text-sm ${
                    formData.status === InvoiceStatus.PAID ? 'text-green-700 bg-green-50 ring-green-600/20'
                    : formData.status === InvoiceStatus.OVERDUE ? 'text-red-700 bg-red-50 ring-red-600/20'
                    : 'text-slate-700 bg-slate-50 ring-slate-300'
                  }`}
                >
                  {Object.values(InvoiceStatus).map((s) => (
                    <option key={s} value={s}>{INVOICE_STATUS_LABELS[s] || s}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField label="เลขที่ใบแจ้งหนี้">
             <Input
                value={formData.code || "ระบบจะสร้างเลขที่อัตโนมัติ"}
                disabled
                className="font-mono bg-slate-100 text-slate-500 text-lg font-bold tracking-wide border-slate-300 h-11"
              />
          </FormField>
          <FormField label="วันที่ออกเอกสาร *">
            <Input type="date" value={formData.issuedDate} onChange={(e) => setFormData(prev => ({ ...prev, issuedDate: e.target.value }))} required className="bg-white h-11" />
          </FormField>
          <FormField label="วันครบกำหนดชำระ *">
            <Input type="date" value={formData.dueDate} onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))} required className="bg-white h-11" />
          </FormField>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6 h-full">
          <div className="bg-white p-6 rounded-xl border border-slate-200 h-full shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
              <span className="w-1 h-6 bg-primary rounded-full"></span>
              ข้อมูลลูกค้า
            </h3>
            <div className="space-y-6">
              <FormField label="ลูกค้า *">
                <SearchableSelect
                  value={formData.customerId}
                  onChange={(val) => setFormData(prev => ({ ...prev, customerId: val }))}
                  onSearchChange={handleCustomerSearch}
                  options={[...customers, ...searchedCustomers].map((c) => ({
                    value: c.id,
                    label: `${c.first_name} ${c.last_name}`,
                    description: c.phone,
                  }))}
                  placeholder="ค้นหาและเลือกลูกค้า..."
                  required
                  className="bg-white h-11"
                />
              </FormField>

              {formData.customerId ? (
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
                  {(() => {
                    const c = selectedCustomer;
                    return c ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-1">
                          <span className="font-medium text-slate-500 flex items-center gap-2"><span className="w-8">โทร</span></span>
                          <span className="text-slate-800 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">{c.phone || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="font-medium text-slate-500 flex items-center gap-2"><span className="w-8">อีเมล</span></span>
                          <span className="text-slate-800 font-medium">{c.email || '-'}</span>
                        </div>
                        <div className="flex justify-between items-start py-1 gap-4">
                          <span className="font-medium text-slate-500 whitespace-nowrap flex items-center gap-2"><span className="w-8">ที่อยู่</span></span>
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

        <div className="space-y-6 h-full">
          <div className="bg-white p-6 rounded-xl border border-slate-200 h-full shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
              <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
              เอกสารอ้างอิง
            </h3>
            <div className="space-y-5">
              <FormField label="อ้างอิงสัญญา">
                <SearchableSelect
                  value={formData.contractId}
                  onChange={(val) => handleRefChange('contractId', val)}
                  options={contracts.map((c) => ({
                    value: c.id,
                    label: `${c.code} - ${c.customer_name}`,
                  }))}
                  placeholder="-- เลือกสัญญา (ถ้ามี) --"
                  className="bg-white h-11"
                />
              </FormField>

              <FormField label="อ้างอิงใบเสนอราคา">
                <SearchableSelect
                  value={formData.quotationId}
                  onChange={(val) => handleRefChange('quotationId', val)}
                  options={(quotations || [])
                    .filter((q) => !formData.customerId || q.customer_id === formData.customerId)
                    .map((q) => ({
                      value: q.id,
                      label: q.code || `QT-${q.id.slice(0, 8)}`,
                      description: `${q.customer_name} - ${Number(q.total).toLocaleString()} บาท`,
                    }))}
                  placeholder="-- เลือกใบเสนอราคา (ถ้ามี) --"
                  className="bg-white h-11"
                />
              </FormField>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Items / Installments */}
      <div className="pt-8 border-t border-slate-200">
        
        {isLoadingSchedules ? (
          <div className="flex items-center justify-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 font-medium gap-3">
            <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
            กำลังดึงข้อมูลตารางการวางบิล...
          </div>
        ) : referenceSource && availableInstallments.length > 0 && !isAdhocMode ? (
          // --- 1. แสดงตารางงวดชำระ (ถ้าไม่ได้อยู่ในโหมด Ad-hoc) ---
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-lg">
                รายการเรียกเก็บเงินตามงวด (อ้างอิงจากแผนการวางบิล)
              </h3>
              {/* 💡 ปุ่มสำหรับสลับไปออกบิลอิสระ (Ad-hoc) */}
              <Button type="button" variant="outline" onClick={handleEnableAdhocMode} className="text-orange-600 border-orange-200 hover:bg-orange-50 text-sm">
                <PlusIcon className="w-4 h-4 mr-2" /> สร้างบิลพิเศษ (กำหนดรายการเอง)
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-center w-16 text-xs font-semibold text-slate-600 uppercase">เลือก</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">งวดที่</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">รายละเอียด</th>
                    {availableInstallments.some(i => i.percentage > 0) && (
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">เปอร์เซ็น</th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">ยอดชำระ (รวม VAT)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {availableInstallments.map((inst: any) => (
                    <tr 
                      key={inst.id} 
                      onClick={() => handleSelectInstallment(inst)}
                      className={`cursor-pointer transition-colors ${formData.selectedScheduleId === inst.id ? (inst.is_pay_all ? 'bg-amber-50' : 'bg-indigo-50/50') : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="radio"
                          name="selected_installment"
                          checked={formData.selectedScheduleId === inst.id}
                          onChange={() => handleSelectInstallment(inst)}
                          className="w-4 h-4 text-primary focus:ring-primary cursor-pointer border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-900">
                        {inst.is_pay_all ? '⭐ รวบยอด' : `งวดที่ ${inst.term}`}
                      </td>
                      <td className={`px-4 py-4 text-sm ${inst.is_pay_all ? 'text-amber-700 font-medium' : 'text-slate-600'}`}>
                        {inst.description}
                      </td>
                      {availableInstallments.some(i => i.percentage > 0) && (
                        <td className="px-4 py-4 text-sm text-right text-slate-600">
                          {!inst.is_pay_all && inst.percentage > 0 ? `${inst.percentage}%` : '-'}
                        </td>
                      )}
                      <td className="px-4 py-4 text-sm text-right font-bold text-slate-900">
                        ฿{Number(inst.amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // --- 2. แสดงตาราง Items & Services (โหมดปกติ หรือ โหมด Ad-hoc) ---
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                  รายการสินค้าและบริการ (Items & Services)
                </h3>
                {/* 💡 ป้ายบอกสถานะ Ad-hoc */}
                {isAdhocMode && (
                   <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold border border-orange-200">
                     โหมดกำหนดรายการเอง (Ad-hoc)
                   </span>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto items-center">
                 {/* 💡 ปุ่มยกเลิกโหมด Ad-hoc เพื่อกลับไปเลือกตารางงวด */}
                 {isAdhocMode && availableInstallments.length > 0 && (
                   <Button type="button" variant="ghost" onClick={() => setIsAdhocMode(false)} className="text-slate-500 text-sm">
                     กลับไปเลือกงวด
                   </Button>
                 )}
                <Button type="button" variant="outline" onClick={addItem} className="flex-1 sm:flex-none text-primary border-primary hover:bg-primary/5 shadow-sm">
                  <PlusIcon className="w-4 h-4 mr-2" /> เพิ่มรายการ
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => window.confirm('ลบรายการทั้งหมด?') && setItems([{ id: crypto.randomUUID(), description: '', quantity: 1, unit: 'รายการ', unitPrice: 0, amount: 0 }])}
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
                              onChange={(e) => handleProductSelect(item.id, e.target.value)}
                              placeholder="รายละเอียดสินค้า/บริการ"
                              className="h-10 text-sm w-full border-0 bg-transparent focus:ring-0 p-0 placeholder:text-slate-300 font-medium text-slate-700"
                              autoComplete="off"
                            />
                          </div>
                          <datalist id={`products-${item.id}`}>
                            {products.map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name} ({p.price} บาท/{typeof p.unit === 'string' ? p.unit : (p.unit as any)?.name})
                              </option>
                            ))}
                          </datalist>
                        </td>
                        <td className="px-4 py-2">
                          <Input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="h-9 text-sm text-center bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white transition-all" min={1} step="any" />
                        </td>
                        <td className="px-4 py-2">
                          <Input value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className="h-9 text-sm text-center bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white transition-all" />
                        </td>
                        <td className="px-4 py-2">
                          <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className="h-9 text-sm text-right bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white transition-all" min={0} />
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-slate-700">{item.amount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-center">
                          <button type="button" onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100" disabled={items.length <= 1} title="ลบรายการ">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ยอดรวม (Subtotal & Total) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <div className="space-y-4">
            <FormField label="หมายเหตุ">
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={5}
                placeholder="ระบุเงื่อนไขการชำระเงิน หรือหมายเหตุเพิ่มเติม..."
                className="resize-none bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              />
            </FormField>
          </div>

          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4 shadow-sm">
            <div className="flex justify-between text-sm text-slate-600">
              <span>มูลค่าสินค้า/บริการ (Subtotal)</span>
              <span className="font-medium text-slate-900">
                {totals.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeVat"
                  checked={formData.includeVat}
                  onChange={(e) => setFormData(prev => ({ ...prev, includeVat: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="includeVat" className="cursor-pointer select-none">รวมภาษีมูลค่าเพิ่ม 7% (ถอด VAT)</label>
              </div>
              <span className="font-medium text-slate-900">
                {totals.vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
              </span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t border-slate-200 pt-4 text-slate-800 items-end">
              <span>ยอดรวมสุทธิ (Net Total)</span>
              <span className="text-3xl text-primary">
                {totals.netTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-slate-500 font-normal">บาท</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 sticky bottom-0 bg-white/80 backdrop-blur-sm p-4 -mx-6 -mb-6 rounded-b-xl z-10">
        <Button type="button" variant="outline" onClick={onCancel} className="px-6 h-10 border-slate-300 text-slate-700 hover:bg-slate-50">
          ยกเลิก
        </Button>
        <Button type="submit" disabled={isSaving || isLoadingSchedules} variant="primary" className="px-8 h-10 shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all transform hover:-translate-y-0.5">
          {isSaving ? 'กำลังบันทึก...' : mode === 'create' ? 'สร้างใบแจ้งหนี้' : 'บันทึกการแก้ไข'}
        </Button>
      </div>
    </form>
  );
};