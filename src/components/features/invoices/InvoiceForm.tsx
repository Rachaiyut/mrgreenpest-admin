import React, { useState, useEffect, useMemo, useRef, useCallback, FC } from 'react';
import { FormField, Input, Select, Button, Textarea } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { PlusIcon, TrashIcon, DocumentTextIcon, CurrencyDollarIcon } from '../../../assets/icons/Icons';
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

  const [isAdhocMode, setIsAdhocMode] = useState<boolean>(false);

  // -- Ad-hoc State --
  const [adhocData, setAdhocData] = useState({
    description: 'บริการเพิ่มเติม (นอกเหนือสัญญา)',
    amount: 0,
  });

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
    selectedScheduleId: null as string | null,
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
    const itemsTotal = isAdhocMode 
      ? Number(adhocData.amount || 0) 
      : items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    if (formData.includeVat) {
      const vatAmount = Number((itemsTotal * (7 / 107)).toFixed(2));
      const subtotal = Number((itemsTotal - vatAmount).toFixed(2));
      return { subtotal, vatAmount, netTotal: itemsTotal };
    } else {
      return { subtotal: itemsTotal, vatAmount: 0, netTotal: itemsTotal };
    }
  }, [items, formData.includeVat, isAdhocMode, adhocData.amount]);

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
        if (inst.is_pay_all) return true;
        
        return status === 'PENDING' || status === 'PARTIAL';
      }).map((inst: any) => ({
        id: inst.id,
        term: inst.installment_no || inst.sequence,
        description: inst.description || inst.notes || `งวดที่ ${inst.installment_no || inst.sequence}`,
        percentage: inst.percentage || 0,
        amount: Number(inst.amount || inst.expected_amount || 0),
        is_pay_all: inst.is_pay_all || false,
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

  const productOptions = useMemo(() => {
    return products
      .filter((p: any) => p.type !== 'PACKAGE')
      .map((p) => ({
        value: p.id,
        label: `${p.code} - ${p.name}`,
        description: (typeof p.unit === 'string' ? p.unit : p.unit?.name) || '',
      }));
  }, [products]);

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

  const handleSelectInstallment = (inst: any) => {
    setIsAdhocMode(false);
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

  const handleEnableAdhocMode = () => {
    setIsAdhocMode(true);
    setFormData(prev => ({ ...prev, term: null, selectedScheduleId: null }));
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

  const handleProductSelect = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                product_id: productId,
                description: product.name,
                unit: (typeof product.unit === 'string' ? product.unit : (product.unit as any)?.name) || 'รายการ',
                unitPrice: Number(product.price) || 0,
                amount: item.quantity * (Number(product.price) || 0),
              }
            : item
        )
      );
    } else {
      updateItem(itemId, 'product_id', productId);
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

    if (!isAdhocMode && availableInstallments.length > 0 && !formData.selectedScheduleId) {
      alert('กรุณาเลือกงวดที่ต้องการเรียกเก็บเงิน หรือ กดปุ่ม "สร้างบิลพิเศษ"');
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
        
        is_pay_all: selectedInst?.is_pay_all || undefined,
        is_ad_hoc: isAdhocMode || undefined,
        term: (!selectedInst?.is_pay_all && !isAdhocMode) ? formData.term : undefined,
        invoice_schedule_id: (!selectedInst?.is_pay_all && !isAdhocMode) ? selectedInst?.id : undefined,

        items: isAdhocMode ? [{
          id: crypto.randomUUID(), // เพิ่ม id เพื่อแก้ปัญหา Type Error
          sequence: 1,
          description: adhocData.description || 'บริการเพิ่มเติม',
          quantity: 1,
          unit: 'รายการ',
          unit_price: Number(adhocData.amount),
          amount: Number(adhocData.amount),
        }] : items.map((item, index) => ({
          id: item.id.length > 36 ? undefined : item.id,
          sequence: index + 1,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: Number(item.unitPrice),
          amount: Number(item.amount),
          product_id: item.product_id || undefined
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
      {/* Top Header Section */}
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

      {/* Customer & Reference Section */}
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

      {/* Bottom Section: Installments & Items */}
      <div className="pt-8 border-t border-slate-200">
        {isLoadingSchedules ? (
          <div className="flex items-center justify-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 font-medium gap-3">
            <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
            กำลังดึงข้อมูลตารางการวางบิล...
          </div>
        ) : !isAdhocMode && referenceSource && availableInstallments.length > 0 ? (
          
          /* 🌟 INSTALLMENT UI */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
                  <DocumentTextIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">รายการเรียกเก็บเงินตามงวด (อ้างอิงจากแผนการวางบิล)</h3>
                  <p className="text-sm text-slate-500 mt-0.5 font-medium">เลือกงวดชำระเงินที่ต้องการออกใบแจ้งหนี้</p>
                </div>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleEnableAdhocMode} 
                className="text-sm px-4 py-2 h-auto text-slate-600 hover:text-slate-800 hover:bg-slate-50 bg-white shadow-sm border-slate-300 rounded-md transition-colors flex items-center"
              >
                <PlusIcon className="w-4 h-4 mr-1.5" /> สร้างบิลพิเศษ (กำหนดรายการเอง)
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm mt-2">
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
        ) : isAdhocMode ? (
          
          /* 🌟 AD-HOC UI */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-orange-50 rounded-lg text-orange-600">
                  <CurrencyDollarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">สร้างบิลพิเศษ</h3>
                  <p className="text-sm text-slate-500 mt-0.5 font-medium">ระบุรายละเอียดและยอดเงินที่ต้องการเรียกเก็บ</p>
                </div>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAdhocMode(false)} 
                className="text-sm px-4 py-2 h-auto text-slate-600 hover:text-slate-800 hover:bg-slate-50 bg-white shadow-sm border-slate-300 rounded-md transition-colors"
              >
                สลับกลับไปโหมดปกติ
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start mt-2">
              <div className="md:col-span-8">
                <FormField label="รายละเอียดที่ต้องการแสดงในบิล *">
                  <Input
                    value={adhocData.description}
                    onChange={(e) => setAdhocData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="เช่น ค่าบริการติดตั้งเพิ่มเติม, ค่าอุปกรณ์นอกเหนือสัญญา..."
                    className="bg-white h-11 text-base border-slate-300 focus:ring-primary focus:border-primary"
                    required
                  />
                </FormField>
              </div>
              
              <div className="md:col-span-4">
                <FormField label="จำนวนเงิน (รวมในบิล) *">
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      value={adhocData.amount || ''}
                      onChange={(e) => setAdhocData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                      className="bg-white h-11 text-right pr-12 text-lg font-bold text-slate-900 border-slate-300 focus:ring-primary focus:border-primary shadow-sm"
                      placeholder="0.00"
                      required
                    />
                    <div className="absolute right-4 top-2.5 text-slate-400 font-bold">฿</div>
                  </div>
                </FormField>
              </div>
            </div>
          </div>

        ) : (
          
          /* NORMAL ITEMS: รายการสินค้าและบริการ */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
                  <CurrencyDollarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">รายการสินค้าและบริการ</h3>
                  <p className="text-sm text-slate-500 mt-0.5 font-medium">ระบุรายการสินค้า จำนวน และราคาต่อหน่วย</p>
                </div>
              </div>

              <div className="flex gap-3 w-full sm:w-auto items-center">
                 {/* 🌟 ลบปุ่ม "สลับไปเปิดบิลพิเศษแบบรวบยอด" ออกไปแล้วจากตรงนี้ */}
                 <Button type="button" variant="outline" onClick={addItem} className="text-sm px-4 py-2 h-auto text-slate-600 hover:text-slate-800 hover:bg-slate-50 bg-white shadow-sm border-slate-300 rounded-md transition-colors flex items-center">
                    <PlusIcon className="w-4 h-4 mr-1.5" /> เพิ่มรายการ
                 </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 relative group">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-1 flex items-center justify-center bg-white h-10 w-10 rounded-full border border-slate-200 text-slate-500 font-semibold text-sm">
                      {index + 1}
                    </div>

                    <div className="md:col-span-4">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">สินค้า/บริการ</label>
                      <SearchableSelect
                        value={item.product_id || ''}
                        onChange={(val) => handleProductSelect(item.id, val)}
                        options={productOptions}
                        placeholder="เลือกสินค้า..."
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">รายละเอียดเพิ่มเติม</label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="รายละเอียด..."
                      />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">จำนวน</label>
                        <Input
                          type="number" min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                          className="text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">ราคา/หน่วย</label>
                        <Input
                          type="number" min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                          className="text-right"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 text-right">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">รวม</label>
                      <div className="h-10 flex items-center justify-end px-3 font-semibold text-slate-900 bg-white rounded border border-slate-200">
                        {item.amount.toLocaleString()}
                      </div>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="ลบรายการ"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals Section */}
        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
            
            {/* กล่องหมายเหตุ */}
            <div className="flex-1 min-w-0 w-full flex flex-col">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                หมายเหตุ
              </label>
              <div className="w-full">
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  placeholder="หมายเหตุเพิ่มเติม..."
                  className="!w-full !max-w-none resize-none" 
                />
              </div>
            </div>

            {/* กล่องสรุปยอด */}
            <div className="w-full lg:w-80 shrink-0 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">รวมเป็นเงิน (Subtotal)</span>
                <span className="font-medium text-slate-900">
                  {totals.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={formData.includeVat}
                    onChange={(e) => setFormData(prev => ({ ...prev, includeVat: e.target.checked }))}
                    className="rounded border-slate-300 text-green-600 focus:ring-green-500 h-4 w-4"
                  />
                  ภาษีมูลค่าเพิ่ม 7% (VAT)
                </label>
                <span className="font-medium text-slate-900">
                  {totals.vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                </span>
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-slate-800">
                  จำนวนเงินรวมทั้งสิ้น
                </span>
                <span className="text-xl font-bold text-green-600">
                  {totals.netTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                </span>
              </div>
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