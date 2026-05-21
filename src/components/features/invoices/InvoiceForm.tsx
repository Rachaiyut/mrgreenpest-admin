import React, { useState, useEffect, useMemo, useRef, useCallback, FC } from 'react';
import { createPortal } from 'react-dom';
import Swal from '@/src/utils/swal';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import { FormField, Input, Button, Textarea } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { DocumentTextIcon, CurrencyDollarIcon, EyeIcon } from '../../../assets/icons/Icons';
import ItemsSection from '../../common/ItemsSection';
import { useData } from '../../../contexts/DataContext';
import { CustomerApi } from '../../../api/customer';
import { ContractApi } from '../../../api/contract';
import { QuotationApi } from '../../../api/quotation';
import { InvoiceApi } from '../../../api/invoice';
import { Customer } from '../../../types/entity/customer.interface';
import { Status } from '../../../types/entity/core.interface';
import { Invoice, Contract } from '../../../types/entity/financial.interface';
import { InvoiceStatus } from '../../../types/enums/invoice';
import { ContractStatus } from '../../../types/enums/contract';
import { Quotation } from '@/src/types';
import { QuotationStatus } from '@/src/types/enums/quotaton';
import { formatPhoneNumber } from '../../../utils/format';

const resolveFileUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  const backendBaseUrl = (import.meta as any).env?.VITE_API_URL
    ? String((import.meta as any).env.VITE_API_URL).replace(/\/api\/?$/, '')
    : 'http://localhost:3000';
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${backendBaseUrl}/${cleanPath}`;
};

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
  mode: 'create' | 'edit' | 'detail';
  initialValues?: Partial<Invoice>;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  embedded?: boolean;
}

export const InvoiceForm: FC<InvoiceFormProps> = ({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  embedded = false,
}) => {
  const { customers, products, invoices, fetchData } = useData();
  
  // -- Master Data States --
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
  const [fetchedSingleCustomer, setFetchedSingleCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFullInvoice, setIsLoadingFullInvoice] = useState(false);

  const [invoiceSchedules, setInvoiceSchedules] = useState<any[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  // Payments fetched from backend (only populated for non-create modes)
  const [paymentsInfo, setPaymentsInfo] = useState<any[]>([]);
  // Slip image lightbox URL (null = closed)
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);

  // 🌟 FIX: Initialize isAdhocMode based on initialValues if editing
  const [isAdhocMode, setIsAdhocMode] = useState<boolean>(() => {
    return initialValues?.is_ad_hoc || false;
  });

  // 🌟 FIX: Initialize adhocData based on initialValues if editing an adhoc invoice
  const [adhocData, setAdhocData] = useState(() => {
    if (initialValues?.is_ad_hoc && initialValues.items && initialValues.items.length > 0) {
      return {
        description: initialValues.items[0].description,
        amount: Number(initialValues.items[0].amount),
      };
    }
    return {
      description: 'บริการเพิ่มเติม (นอกเหนือสัญญา)',
      amount: 0,
    };
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
    contractId: (initialValues as unknown as Record<string, string>)?.contract_id || undefined, // Make sure this matches your DB
    quotationId: initialValues?.quotation_id || '',
    term: initialValues?.term || null as number | null,
    selectedScheduleId:
      (initialValues as unknown as Record<string, string>)?.invoice_schedule_id ||
      (initialValues as unknown as Record<string, string>)?.installment_id ||
      null as string | null,
  });

  const [items, setItems] = useState<InvoiceItem[]>(() => {
    // ถ้ามีข้อมูล items จากอ้างอิง (edit mode / ad-hoc) → แสดงเลย
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
    // สร้างใหม่ → เริ่มต้นว่าง ไม่แสดงแถว จนกว่าจะกดเพิ่ม
    return [];
  });

  const [formErrors, setFormErrors] = useState<{ customer?: string; installment?: string; adhocDescription?: string; adhocAmount?: string }>({});

  // -- Initialization & Effects --
  useEffect(() => {
    if (mode === 'create' && !formData.dueDate) {
      const d = new Date(formData.issuedDate);
      d.setDate(d.getDate() + 30);
      setFormData(prev => ({ ...prev, dueDate: d.toISOString().split('T')[0] }));
    }
  }, [mode, formData.issuedDate, formData.dueDate]);

  // Edit/Detail mode: fetch full invoice (items, customer_id, totals may be missing from list payload)
  useEffect(() => {
    if (mode === 'create' || !initialValues?.id) return;
    const hasFullData = (initialValues.items && initialValues.items.length > 0) || initialValues.is_ad_hoc;
    if (hasFullData && initialValues.customer_id) return;

    setIsLoadingFullInvoice(true);
    InvoiceApi.getById(initialValues.id)
      .then((res) => {
        const full = ((res as unknown as Record<string, unknown>).data || res) as Partial<Invoice> & Record<string, any>;
        if (!full) return;

        setFormData(prev => ({
          ...prev,
          customerId: prev.customerId || full.customer_id || '',
          contractId: prev.contractId || full.contract_id || undefined,
          quotationId: prev.quotationId || full.quotation_id || '',
          term: prev.term || full.term || null,
          selectedScheduleId: prev.selectedScheduleId || full.invoice_schedule_id || full.installment_id || null,
          includeVat: full.include_vat ?? prev.includeVat,
        }));

        if (full.is_ad_hoc && full.items && full.items.length > 0) {
          setIsAdhocMode(true);
          setAdhocData({
            description: full.items[0].description || '',
            amount: Number(full.items[0].amount) || 0,
          });
        } else if (full.items && full.items.length > 0) {
          setItems(full.items.map((i: any) => ({
            id: i.id || crypto.randomUUID(),
            product_id: i.product_id,
            description: i.description,
            quantity: Number(i.quantity),
            unit: i.unit,
            unitPrice: Number(i.unit_price),
            amount: Number(i.amount),
          })));
        } else if (full.total && Number(full.total) > 0) {
          // fallback — no items but has a total (legacy data)
          setIsAdhocMode(true);
          setAdhocData({ description: full.notes || 'ใบแจ้งหนี้', amount: Number(full.total) });
        }

        // Capture payments for the detail-view payment section
        if (Array.isArray(full.payments)) setPaymentsInfo(full.payments);

        // Seed contracts/quotations dropdowns with the linked records so the
        // detail view can display the reference even when the contract is not
        // ACTIVE / the quotation isn't SIGNED (which the loaders filter out).
        if (full.contract) {
          setContracts((prev) =>
            prev.some((c) => c.id === full.contract.id) ? prev : [full.contract as Contract, ...prev],
          );
        }
        if (full.quotation) {
          setQuotations((prev) =>
            prev.some((q) => q.id === full.quotation.id) ? prev : [full.quotation as Quotation, ...prev],
          );
        }
      })
      .catch((err) => console.error('Failed to load full invoice:', err))
      .finally(() => setIsLoadingFullInvoice(false));
  }, [mode, initialValues?.id]);

  // Fetch customer by id if not in context/search lists
  useEffect(() => {
    if (!formData.customerId) return;
    const foundInContext = customers.find((c) => c.id === formData.customerId);
    const foundInSearch = searchedCustomers.find((c) => c.id === formData.customerId);
    if (foundInContext || foundInSearch) return;
    if (fetchedSingleCustomer?.id === formData.customerId) return;

    CustomerApi.getCustomerById(formData.customerId)
      .then((res) => {
        const cust = ((res as unknown as Record<string, unknown>).data || res) as Customer;
        if (cust) setFetchedSingleCustomer(cust);
      })
      .catch((err) => console.error('Failed to fetch customer:', err));
  }, [formData.customerId, customers, searchedCustomers, fetchedSingleCustomer]);

  useEffect(() => {
    const loadMasterData = async () => {
      if (!formData.customerId) {
        setContracts([]);
        setQuotations([]);
        return;
      }

      try {
        const [contractsRes, quotationsRes] = await Promise.all([
          ContractApi.getAll({ status: ContractStatus.ACTIVE, customer_id: formData.customerId }),
          QuotationApi.getAll({ status: QuotationStatus.SIGNED, customer_id: formData.customerId })
        ]);
        if (contractsRes?.data) setContracts(contractsRes.data);
        if (quotationsRes?.data) setQuotations(quotationsRes.data);
      } catch (error) {
        console.error('Error fetching master data:', error);
      }
    };

    loadMasterData();
  }, [formData.customerId]);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (formData.contractId) {
        setIsLoadingSchedules(true);
        try {
          const res = await InvoiceApi.getAllInvoiceSchedule(formData.contractId);
          const data = res.data || res;
          setInvoiceSchedules(Array.isArray(data) ? data : []);
          
          // Only reset these if we are CHANGING the contract, not on initial load of an edit
          if(mode === 'create' || (mode === 'edit' && formData.contractId !== (initialValues as unknown as Record<string, string>)?.contract_id)) {
              setIsAdhocMode(false);
              setFormData(prev => ({ ...prev, term: null, selectedScheduleId: null }));
          }
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
  }, [formData.contractId, mode, initialValues]);

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

  const selectedCustomer = useMemo(() => {
    const list = [...customers, ...searchedCustomers];
    if (fetchedSingleCustomer) list.push(fetchedSingleCustomer);
    return list.find(c => c.id === formData.customerId);
  }, [customers, searchedCustomers, fetchedSingleCustomer, formData.customerId]);

  const selectedContract = useMemo(() => 
    contracts.find(c => c.id === formData.contractId), 
  [contracts, formData.contractId]);

  const selectedQuotation = useMemo(() => 
    quotations.find(q => q.id === formData.quotationId), 
  [quotations, formData.quotationId]);

  const referenceSource = selectedContract || selectedQuotation;

  const availableInstallments = useMemo(() => {
    // Detail mode: แสดงทุกงวดจาก contract.installments (แผนการวางบิล) ทั้งหมด
    // ไม่ filter ตาม invoice_schedule status เพราะ status เปลี่ยนแล้วงวดจะหาย
    if (mode === 'detail' && referenceSource?.installments && referenceSource.installments.length > 0) {
      const scheduleByTerm = new Map<number, any>();
      invoiceSchedules.forEach((s: any) => {
        const t = s.installment_no || s.sequence;
        if (t) scheduleByTerm.set(Number(t), s);
      });

      // หา invoice ของสัญญานี้ — เช็คทั้ง contract_id และ term เพื่อจับคู่ใบบิลจริงกับงวดในแผน
      const contractIdNow = (initialValues as unknown as Record<string, unknown>)?.contract_id || referenceSource.id;
      const invoiceByTerm = new Map<number, any>();
      (invoices || []).forEach((inv: any) => {
        if (String(inv.contract_id) !== String(contractIdNow)) return;
        const t = Number(inv.term || 0);
        if (t > 0) invoiceByTerm.set(t, inv);
      });

      const sorted = referenceSource.installments
        .slice()
        .sort((a: any, b: any) => (a.term || a.installment_no || 0) - (b.term || b.installment_no || 0));

      // ทบจากงวดก่อนหน้าที่เป็น PARTIAL (paid < total ของใบจริง) — แสดงให้รู้ว่าเลขรวมไม่ตรงกับแผนเพราะอะไร
      let carryFromPartial = 0;
      return sorted.map((inst: any) => {
        const term = Number(inst.term || inst.installment_no);
        const schedule = scheduleByTerm.get(term);
        const invoice = invoiceByTerm.get(term);
        const planAmt = Number(inst.amount || 0);

        let description = inst.description || inst.notes || `งวดที่ ${term}`;
        let displayAmount = invoice ? Number(invoice.total || planAmt) : planAmt;

        if (invoice) {
          const invTotal = Number(invoice.total || 0);
          const invPaid = Number(invoice.paid_amount || 0);
          const invStatus = String(invoice.status || '').toUpperCase();
          const remaining = invTotal - invPaid;
          const isPartial = invPaid > 0 && remaining > 0.01 && invStatus !== 'PAID';

          if (isPartial) {
            description = `${description} (จ่ายแล้ว ${invPaid.toLocaleString()} — ส่วนที่เหลือ ${remaining.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท ทบเข้างวดถัดไป)`;
            carryFromPartial += remaining;
          } else if (invTotal > planAmt + 0.01) {
            // ใบบิลจริง > แผน → มี carry-over baked in
            const carry = invTotal - planAmt;
            description = `${description} (รวมยอดค้างจากงวดก่อน ${carry.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท)`;
            carryFromPartial = 0;
          }
        } else if (carryFromPartial > 0) {
          // ไม่มีใบบิล แต่งวดก่อนหน้า partial → คาดว่าจะทบเข้างวดนี้
          displayAmount = planAmt + carryFromPartial;
          description = `${description} (รวมยอดค้างจากงวดก่อน ${carryFromPartial.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท)`;
          carryFromPartial = 0;
        }

        return {
          id: schedule?.id || inst.id,
          term,
          description,
          percentage: inst.percentage || 0,
          amount: displayAmount,
          is_pay_all: false,
          disabled: true,
        };
      });
    }

    if (formData.contractId && invoiceSchedules.length > 0) {
      // หา term สูงสุดที่มี invoice ค้างชำระ (INVOICED) เพื่อ disable งวดก่อนหน้า
      const invoicedTerms = invoiceSchedules
        .filter((inst: any) => String(inst.status).toUpperCase() === 'INVOICED')
        .map((inst: any) => inst.installment_no || inst.sequence);
      const maxInvoicedTerm = invoicedTerms.length > 0 ? Math.max(...invoicedTerms) : 0;

      const linkedScheduleId =
        formData.selectedScheduleId ||
        (initialValues as unknown as Record<string, string>)?.invoice_schedule_id ||
        (initialValues as unknown as Record<string, string>)?.installment_id;
      const linkedTerm = formData.term || initialValues?.term;

      return invoiceSchedules.filter((inst: any) => {
        const term = inst.installment_no || inst.sequence;
        const status = String(inst.status).toUpperCase();

        if (initialValues?.id) {
          if (linkedScheduleId && String(inst.id) === String(linkedScheduleId)) return true;
          if (linkedTerm && linkedTerm === term) return true;
        }
        if (inst.is_pay_all) return true;

        return status === 'PENDING' || status === 'PARTIAL' || status === 'INVOICED';
      }).map((inst: any) => {
        const term = inst.installment_no || inst.sequence;
        const status = String(inst.status).toUpperCase();
        // disabled: งวดที่ค้าง (INVOICED) แต่มีงวดถัดไปที่พร้อมวางบิลแล้ว
        const isOlderInvoiced = status === 'INVOICED' && term < maxInvoicedTerm;

        return {
          id: inst.id,
          term,
          description: inst.description || inst.notes || `งวดที่ ${term}`,
          percentage: inst.percentage || 0,
          amount: Number(inst.amount || inst.expected_amount || 0),
          is_pay_all: inst.is_pay_all || false,
          disabled: isOlderInvoiced,
        };
      }).sort((a, b) => {
        // PAY_ALL/CARRY ไว้ท้ายสุด, ที่เหลือเรียงตามเลขงวด
        if (a.is_pay_all) return 1;
        if (b.is_pay_all) return -1;
        return Number(a.term || 9999) - Number(b.term || 9999);
      });
    }

    if (!referenceSource?.installments || referenceSource.installments.length === 0) {
      // ชำระเต็มจำนวน: สร้าง option เดียวจาก contract total
      if (formData.contractId) {
        const contract = contracts.find((c: any) => c.id === formData.contractId);
        if (contract) {
          return [{
            id: 'full-payment',
            term: 1,
            description: 'ชำระเต็มจำนวน',
            percentage: 100,
            amount: Number(contract.total_amount || 0),
            is_pay_all: true,
          }];
        }
      }
      return [];
    }
    
    const linkedScheduleId =
      formData.selectedScheduleId ||
      (initialValues as unknown as Record<string, string>)?.invoice_schedule_id ||
      (initialValues as unknown as Record<string, string>)?.installment_id;
    const linkedTerm = formData.term || initialValues?.term;

    return referenceSource.installments.filter((inst: any) => {
      const term = inst.term || inst.installment_no;
      const isPaid = inst.status === Status.Paid || (inst.status as string) === 'PAID';

      if (initialValues?.id) {
        if (linkedScheduleId && String(inst.id) === String(linkedScheduleId)) return true;
        if (linkedTerm && linkedTerm === term) return true;
      }
      // แสดงงวดที่ยังไม่จ่ายครบ — ให้สร้าง invoice ซ้ำได้ (วางบิลหลายครั้ง)
      return !isPaid;
    }).map((inst: any) => ({
      id: inst.id,
      term: inst.term || inst.installment_no,
      description: inst.description || inst.notes || `งวดที่ ${inst.term || inst.installment_no}`,
      percentage: inst.percentage || 0,
      amount: Number(inst.amount),
      is_pay_all: false,
    }));
  }, [mode, referenceSource, invoices, initialValues, formData.contractId, formData.selectedScheduleId, formData.term, invoiceSchedules, contracts]);

  // ชำระเต็มจำนวน: auto-select + auto-set items
  const isFullPayment = useMemo(() => {
    return availableInstallments.length === 1 && availableInstallments[0].is_pay_all;
  }, [availableInstallments]);

  useEffect(() => {
    if (isFullPayment && !formData.selectedScheduleId && mode === 'create') {
      const inst = availableInstallments[0];
      handleSelectInstallment(inst);
    }
  }, [isFullPayment]);

  const productOptions = useMemo(() => {
    return products
      .filter((p: any) => p.type !== 'PACKAGE' && p.is_active !== false)
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
      if (!query.trim()) return; 

      try {
        const res = await CustomerApi.getCustomers({ search: query, limit: 20 });
        if (res?.data) {
          setSearchedCustomers(prev => {
            const newCustomers = res.data;
            const combined = [...newCustomers, ...prev];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
          });
        }
      } catch (err) { 
        console.error(err); 
      }
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
    if (formErrors.installment) setFormErrors(prev => ({ ...prev, installment: undefined }));
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
                unit: (typeof product.unit === 'string' ? product.unit : (product.unit as unknown as Record<string, string>)?.name) || 'รายการ',
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


  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const errors: { customer?: string; installment?: string; adhocDescription?: string; adhocAmount?: string } = {};
    if (!formData.customerId) errors.customer = 'กรุณาเลือกลูกค้า';
    if (!isAdhocMode && !isFullPayment && availableInstallments.length > 0 && !formData.selectedScheduleId) errors.installment = 'กรุณาเลือกงวดที่ต้องการเรียกเก็บเงิน';
    if (isAdhocMode && !adhocData.description?.trim()) errors.adhocDescription = 'กรุณากรอกรายละเอียด';
    if (isAdhocMode && (!adhocData.amount || adhocData.amount <= 0)) errors.adhocAmount = 'กรุณากรอกจำนวนเงิน';
    if (errors.customer || errors.installment || errors.adhocDescription || errors.adhocAmount) {
      setFormErrors(errors);
      setTimeout(() => document.querySelector('.text-red-500.text-xs')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      return;
    }
    setFormErrors({});

    setIsSaving(true);
    try {
      const selectedInst = availableInstallments.find((i: { id: string }) => i.id === formData.selectedScheduleId);

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
        // ส่ง term เสมอ (ทุก invoice ต้องมีงวด)
        term: selectedInst?.is_pay_all ? undefined : formData.term,
        invoice_schedule_id: selectedInst?.is_pay_all ? undefined : selectedInst?.id,

        // ถ้ากำหนดยอดเอง → ใช้ custom amount + description
        ...(isAdhocMode && adhocData.amount ? {
          subtotal: Number(adhocData.amount),
          total: formData.includeVat ? Number((Number(adhocData.amount) * 1.07).toFixed(2)) : Number(adhocData.amount),
          vat_amount: formData.includeVat ? Number((Number(adhocData.amount) * 0.07).toFixed(2)) : 0,
        } : {}),

        items: (isAdhocMode && adhocData.amount) ? [{
          id: crypto.randomUUID(),
          sequence: 1,
          description: adhocData.description || `ชำระบางส่วน งวดที่ ${formData.term}`,
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
        Swal.fire({ icon: 'success', title: 'สร้างใบแจ้งหนี้สำเร็จ!', timer: 1500, showConfirmButton: false });
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

  if (isLoadingFullInvoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></span>
        <p className="text-sm font-medium text-slate-500">กำลังโหลดข้อมูลใบแจ้งหนี้...</p>
      </div>
    );
  }

  return (
    <>
    <form id="invoice-form" onSubmit={submitForm} className="space-y-8">
      <fieldset
        disabled={mode === 'detail'}
        className={`space-y-8 border-0 p-0 m-0 min-w-0 ${mode === 'detail' ? '[&_*]:pointer-events-none' : ''}`}
      >
      {/* Top Header Section */}
      <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center mb-6 border-b border-slate-200 pb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg">
                <DocumentTextIcon className="w-5 h-5" />
              </span>
              รายละเอียดเอกสาร
            </h3>
            <p className="text-sm text-slate-500 mt-1 ml-11">ข้อมูลสำคัญของใบแจ้งหนี้</p>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${mode === 'create' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6`}>
          {mode !== 'create' && (
            <FormField label="เลขที่ใบแจ้งหนี้">
              <Input
                value={formData.code || "ระบบจะสร้างเลขที่อัตโนมัติ"}
                disabled
                className="bg-slate-100 text-slate-500 cursor-not-allowed border-slate-300 text-sm h-11"
              />
            </FormField>
          )}
          <FormField label="วันที่ออกเอกสาร *">
            <DatePicker
              selected={formData.issuedDate ? new Date(formData.issuedDate) : null}
              onChange={(date: Date | null) => setFormData(prev => ({ ...prev, issuedDate: date ? date.toISOString().substring(0, 10) : '' }))}
              dateFormat="dd/MM/yyyy"
              locale="th"
              placeholderText="dd/mm/yyyy"
              maxDate={formData.dueDate ? new Date(formData.dueDate) : undefined}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-11"
              wrapperClassName="w-full"
            />
          </FormField>
          <FormField label="วันครบกำหนดชำระ *">
            <DatePicker
              selected={formData.dueDate ? new Date(formData.dueDate) : null}
              onChange={(date: Date | null) => setFormData(prev => ({ ...prev, dueDate: date ? date.toISOString().substring(0, 10) : '' }))}
              dateFormat="dd/MM/yyyy"
              locale="th"
              placeholderText="dd/mm/yyyy"
              minDate={formData.issuedDate ? new Date(formData.issuedDate) : undefined}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-11"
              wrapperClassName="w-full"
            />
          </FormField>
        </div>
      </div>

      {/* Customer & Reference Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, customerId: val }));
                    if (formErrors.customer) setFormErrors(prev => ({ ...prev, customer: undefined }));
                  }}
                  onSearchChange={handleCustomerSearch}
                  options={(() => {
                    const list = [...customers, ...searchedCustomers];
                    if (fetchedSingleCustomer && !list.some(c => c.id === fetchedSingleCustomer.id)) {
                      list.push(fetchedSingleCustomer);
                    }
                    const unique = list.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
                    return unique.map((c) => ({
                      value: c.id,
                      label: `${c.first_name} ${c.last_name}`,
                      description: c.primary_phone,
                    }));
                  })()}
                  placeholder="เลือกลูกค้า"
                  searchPlaceholder="ค้นหาชื่อลูกค้า, เบอร์โทรศัพท์"
                  className="bg-white h-11"
                />
                {formErrors.customer && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.customer}</p>
                )}
              </FormField>

              {formData.customerId ? (
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
                  {(() => {
                    const c = selectedCustomer;
                    return c ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-1">
                          <span className="font-medium text-slate-500 flex items-center gap-2"><span className="w-8">โทร</span></span>
                          <span className="text-slate-800 font-medium">{c.primary_phone ? formatPhoneNumber(c.primary_phone) : '-'}</span>
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
                  placeholder="เลือกสัญญา (ถ้ามี)"
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
                      description: `${q.customer_name} - ${Number(q.total).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`,
                    }))}
                  placeholder="เลือกใบเสนอราคา (ถ้ามี)"
                  className="bg-white h-11"
                />
              </FormField>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Installments & Items */}
      <div className={isFullPayment && items.length <= 1 ? '' : 'pt-8 border-t border-slate-200'}>
        {isLoadingSchedules ? (
          <div className="flex items-center justify-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 font-medium gap-3">
            <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
            กำลังดึงข้อมูลตารางการวางบิล...
          </div>
        ) : !isAdhocMode && referenceSource && availableInstallments.length > 0 && !isFullPayment ? (
          
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
              
              {/* ลบปุ่มบิลพิเศษ — ทุก invoice ต้องเลือกงวด */}
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm mt-2">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-center w-16 text-sm font-semibold text-slate-600 uppercase">เลือก</th>
                    <th className="px-4 py-3 text-center w-28 text-sm font-semibold text-slate-600 uppercase">งวดที่</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">รายละเอียด</th>
                    {availableInstallments.some((i: { percentage: number }) => i.percentage > 0) && (
                      <th className="px-4 py-3 text-center w-24 text-sm font-semibold text-slate-600 uppercase">เปอร์เซ็น</th>
                    )}
                    <th className="px-4 py-3 text-right w-48 text-sm font-semibold text-slate-600 uppercase">ยอดชำระ (รวม VAT)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {availableInstallments.map((inst: any) => {
                    const initialScheduleId =
                      (initialValues as unknown as Record<string, string>)?.invoice_schedule_id ||
                      (initialValues as unknown as Record<string, string>)?.installment_id;
                    const isSelected =
                      formData.selectedScheduleId === inst.id ||
                      (!!initialScheduleId && String(initialScheduleId) === String(inst.id)) ||
                      (!!initialValues?.id && !!initialValues?.term && initialValues?.term === inst.term);
                    return (
                    <tr
                      key={inst.id}
                      onClick={() => !inst.disabled && handleSelectInstallment(inst)}
                      className={`transition-colors ${inst.disabled ? 'opacity-40 cursor-not-allowed' : isSelected ? (inst.is_pay_all ? 'bg-amber-50 cursor-pointer' : 'bg-indigo-50/50 cursor-pointer') : 'hover:bg-slate-50 cursor-pointer'}`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="radio"
                          name="selected_installment"
                          checked={isSelected}
                          onChange={() => !inst.disabled && handleSelectInstallment(inst)}
                          disabled={inst.disabled}
                          className="w-4 h-4 text-primary focus:ring-primary border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-900 text-center">
                        {inst.is_pay_all ? 'รวบยอด' : `งวดที่ ${inst.term}`}
                      </td>
                      <td className={`px-4 py-4 text-sm text-left ${inst.is_pay_all ? 'text-amber-700 font-medium' : 'text-slate-600'}`}>
                        {inst.description}
                      </td>
                      {availableInstallments.some((i: { percentage: number }) => i.percentage > 0) && (
                        <td className="px-4 py-4 text-sm text-center text-slate-600">
                          {!inst.is_pay_all && inst.percentage > 0 ? `${inst.percentage}%` : '-'}
                        </td>
                      )}
                      <td className="px-4 py-4 text-sm text-right font-bold text-slate-900">
                        {Number(inst.amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {formErrors.installment && (
              <p className="text-red-500 text-xs mt-2">{formErrors.installment}</p>
            )}

            {/* กำหนดยอดเอง — แสดงเมื่อเลือกงวดแล้ว */}
            {formData.selectedScheduleId && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="custom-amount"
                      checked={isAdhocMode}
                      onChange={(e) => setIsAdhocMode(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <label htmlFor="custom-amount" className="text-sm font-medium text-blue-800 cursor-pointer">
                      กำหนดยอดเรียกเก็บเอง (ลูกค้าจ่ายบางส่วน / จ่ายก่อนงวด)
                    </label>
                  </div>
                </div>
                {isAdhocMode && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="รายละเอียด">
                      <Input
                        value={adhocData.description}
                        onChange={(e) => setAdhocData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="เช่น ลูกค้าชำระบางส่วน, เก็บเงินหน้างาน..."
                        className="bg-white"
                      />
                    </FormField>
                    <FormField label="จำนวนเงินที่เรียกเก็บ (บาท)">
                      <Input
                        type="number"
                        min="0"
                        value={adhocData.amount || ''}
                        onChange={(e) => setAdhocData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                        className="bg-white text-right font-bold"
                        placeholder="0.00"
                      />
                    </FormField>
                  </div>
                )}
              </div>
            )}
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
                  <p className="text-sm text-slate-500 mt-0.5 font-medium">กรอกรายละเอียดและยอดเงินที่ต้องการเรียกเก็บ</p>
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
                    onChange={(e) => {
                      setAdhocData(prev => ({ ...prev, description: e.target.value }));
                      if (formErrors.adhocDescription) setFormErrors(prev => ({ ...prev, adhocDescription: undefined }));
                    }}
                    placeholder="เช่น ค่าบริการติดตั้งเพิ่มเติม, ค่าอุปกรณ์นอกเหนือสัญญา..."
                    className="bg-white h-11 text-base border-slate-300 focus:ring-primary focus:border-primary"
                  />
                  {formErrors.adhocDescription && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.adhocDescription}</p>
                  )}
                </FormField>
              </div>
              
              <div className="md:col-span-4">
                <FormField label="จำนวนเงิน (รวมในบิล) *">
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      value={adhocData.amount || ''}
                      onChange={(e) => {
                        setAdhocData(prev => ({ ...prev, amount: Number(e.target.value) }));
                        if (formErrors.adhocAmount) setFormErrors(prev => ({ ...prev, adhocAmount: undefined }));
                      }}
                      className="bg-white h-11 text-right pr-12 text-lg font-bold text-slate-900 border-slate-300 focus:ring-primary focus:border-primary shadow-sm"
                      placeholder="0.00"
                    />
                    <div className="absolute right-4 top-2.5 text-slate-400 font-bold">บาท</div>
                  </div>
                  {formErrors.adhocAmount && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.adhocAmount}</p>
                  )}
                </FormField>
              </div>
            </div>
          </div>

        ) : isFullPayment && items.length <= 1 && mode === 'create' ? null : (

          /* NORMAL ITEMS: รายการสินค้าและบริการ */
          <ItemsSection
            items={items}
            onItemsChange={setItems}
            productOptions={productOptions}
            onProductSelect={handleProductSelect}
          />
        )}

        {/* Totals Section */}
        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex flex-col lg:flex-row items-stretch gap-6 w-full">

            {/* กล่องหมายเหตุ */}
            <div className="w-full lg:flex-1 min-w-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                หมายเหตุ
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                placeholder="หมายเหตุเพิ่มเติม..."
                className="!w-full !max-w-none resize-none flex-1"
              />
            </div>

            {/* กล่องสรุปยอด */}
            <div className="w-full lg:w-96 shrink-0 space-y-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">รวมเป็นเงิน</span>
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

              <div className="border-t border-slate-200 pt-3 flex justify-between items-center gap-4">
                <span className="text-sm font-bold text-slate-800 whitespace-nowrap">จำนวนเงินรวมทั้งสิ้น</span>
                <span className="text-lg font-bold text-green-600 whitespace-nowrap">
                  {totals.netTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ข้อมูลการชำระเงิน — แสดงเฉพาะ detail mode ที่มี payments */}
        {mode === 'detail' && paymentsInfo.length > 0 && (
          <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                <CurrencyDollarIcon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">ข้อมูลการชำระเงิน</h3>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">ช่องทางการชำระเงิน</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">จำนวนเงินที่รับ (บาท)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">วันที่ชำระ</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">หลักฐานการชำระเงิน</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {paymentsInfo.map((p: any) => {
                    const methodLabel: Record<string, string> = {
                      CASH: 'เงินสด',
                      TRANSFER: 'โอนเงิน',
                      CREDIT_CARD: 'บัตรเครดิต',
                      CHEQUE: 'เช็ค',
                      QR_PAYMENT: 'QR Code',
                      DIVIDED: 'แบ่งชำระ',
                      INSTALLMENT: 'ผ่อนชำระ',
                    };
                    const method = methodLabel[p.payment_method] || p.payment_method || '-';
                    const slipUrl: string | undefined = p.payment_slip_url;
                    const paidAt = p.paid_at
                      ? new Date(p.paid_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
                      : '-';
                    return (
                      <tr key={p.id} className="[&>td]:text-center [&>td]:align-top">
                        <td className="px-4 py-3 text-sm text-slate-700 !text-left">{method}</td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-600">
                          {Number(p.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{paidAt}</td>
                        <td className="px-4 py-3 text-sm">
                          {slipUrl ? (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSlipPreviewUrl(resolveFileUrl(slipUrl));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSlipPreviewUrl(resolveFileUrl(slipUrl));
                                }
                              }}
                              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium transition-colors select-none"
                              title="คลิกเพื่อดูสลิป"
                            >
                              <EyeIcon className="w-4 h-4" />
                              <span>ดูสลิป</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      </fieldset>

    </form>
    {/* Slip lightbox — render via portal to document.body to escape the
        form's pointer-events-none wrapper in detail mode */}
    {slipPreviewUrl &&
      createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4"
          style={{ pointerEvents: 'auto' }}
          onClick={() => setSlipPreviewUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSlipPreviewUrl(null)}
              className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-white shadow-lg text-slate-700 hover:bg-slate-100 flex items-center justify-center text-lg font-bold"
              aria-label="ปิด"
            >
              ×
            </button>
            <img
              src={slipPreviewUrl}
              alt="Payment Slip"
              className="max-w-full max-h-[90vh] object-contain bg-white rounded-lg shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://placehold.co/400x600/f8fafc/94a3b8?text=Image+Not+Found';
              }}
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};