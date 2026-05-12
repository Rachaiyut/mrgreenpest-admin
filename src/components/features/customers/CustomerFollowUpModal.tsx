import React, { useState, useEffect, useMemo, useRef } from 'react';
import Swal from '@/src/utils/swal';
import { Modal } from '../../common/Modal';
import { Button, FormField, Input, Textarea } from '../../common/FormControls';
import { DropdownSelect } from '../../common';
import BuddhistDatePicker from '../../common/BuddhistDatePicker';
import { Customer } from '@/src/types/entity/customer.interface';
import { Contract, Invoice } from '@/src/types/entity/financial.interface';
import { Quotation } from '@/src/types/entity/quotation.interface';
import {
  ContactMethod,
  ContactMethodLabels,
  FollowUpResult,
  FollowUpResultLabels,
  FollowUpType,
  FollowUpTypeLabels,
  FollowUpDocumentRefType,
  FollowUpDocumentRefTypeLabels,
  FollowUpTypeToDocRefTypes,
  ContractFollowUp,
} from '@/src/types/entity/contract-follow-up.interface';
import { ContractFollowUpApi } from '@/src/api/contract-follow-up';
import { ContractApi } from '@/src/api/contract';
import { QuotationApi } from '@/src/api/quotation';
import { InvoiceApi } from '@/src/api/invoice';
import { formatThaiDate } from '../../../utils/date';
import { LoadingIcon } from '../../../assets/icons/Icons';
import { Pagination } from '../../common/Pagination';

interface CustomerFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  /** Which view the modal opens with — defaults to the create form */
  initialView?: 'form' | 'history';
}

const toISODate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const resultColors: Record<FollowUpResult, string> = {
  INTERESTED: 'text-emerald-700',
  NOT_INTERESTED: 'text-rose-700',
  CONSIDERING: 'text-indigo-700',
  NO_RESPONSE: 'text-slate-600',
  CALL_BACK: 'text-amber-700',
  RENEWED: 'text-sky-700',
  OTHER: 'text-purple-700',
};

const typeBadge: Record<FollowUpType, string> = {
  QUOTATION: 'bg-blue-100 text-blue-700',
  CONTRACT: 'bg-emerald-100 text-emerald-700',
  CONTRACT_RENEWAL: 'bg-amber-100 text-amber-700',
  PAYMENT: 'bg-violet-100 text-violet-700',
};

const typeTextColor: Record<FollowUpType, string> = {
  QUOTATION: 'text-blue-700',
  CONTRACT: 'text-emerald-700',
  CONTRACT_RENEWAL: 'text-amber-700',
  PAYMENT: 'text-violet-700',
};

const dateInputClass =
  'block w-full rounded-md border border-slate-300 py-2 pr-3 text-sm shadow-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white';

interface DocOption {
  id: string;
  code: string;
}

type View = 'form' | 'history' | 'detail';

export const CustomerFollowUpModal: React.FC<CustomerFollowUpModalProps> = ({
  isOpen,
  onClose,
  customer,
  initialView = 'form',
}) => {
  const [view, setView] = useState<View>(initialView);
  const [selectedDetail, setSelectedDetail] = useState<ContractFollowUp | null>(null);

  // Form state
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [saving, setSaving] = useState(false);

  // History state
  const [followUps, setFollowUps] = useState<ContractFollowUp[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filter, setFilter] = useState({
    follow_up_type: '' as FollowUpType | '',
    search: '',
    next_follow_up_date: '',
  });

  const today = new Date().toISOString().substring(0, 10);
  const blankForm = {
    follow_up_type: '' as FollowUpType | '',
    document_ref_type: '' as FollowUpDocumentRefType | '',
    document_ref_id: '',
    document_ref_code: '',
    contract_id: '',
    follow_up_date: today,
    contact_method: '',
    result: '',
    notes: '',
    next_follow_up_date: '',
  };
  const [formData, setFormData] = useState(blankForm);

  /**
   * Lazy-fetch documents for the chosen ref type — only hits the API
   * for the kind the user actually picked.
   */
  const fetchDocumentsForRefType = async (refType: FollowUpDocumentRefType) => {
    if (!customer) return;
    setLoadingDocs(true);
    try {
      if (refType === FollowUpDocumentRefType.QUOTATION) {
        const res = await QuotationApi.getAll({ limit: 100, customer_id: customer.id } as Record<string, unknown>);
        setQuotations(res?.data || []);
      } else if (refType === FollowUpDocumentRefType.CONTRACT) {
        const res = await ContractApi.getAll({ limit: 100, customer_id: customer.id } as Record<string, unknown>);
        setContracts(res?.data || []);
      } else if (refType === FollowUpDocumentRefType.INVOICE) {
        const res = await InvoiceApi.getAll({ limit: 100, customer_id: customer.id } as Record<string, unknown>);
        setInvoices(res?.data || []);
      }
    } catch (error) {
      console.error(`Error fetching ${refType} list:`, error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchHistory = async () => {
    if (!customer) return;
    setLoadingHistory(true);
    try {
      const params: Record<string, unknown> = {
        customer_id: customer.id,
        page: currentPage,
        limit: pageSize,
      };
      if (filter.follow_up_type) params.follow_up_type = filter.follow_up_type;
      if (filter.search.trim()) params.search = filter.search.trim();
      if (filter.next_follow_up_date) params.next_follow_up_date = filter.next_follow_up_date;
      const res = await ContractFollowUpApi.getAll(params);
      setFollowUps(res?.data || []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && customer) {
      setView(initialView);
      setSelectedDetail(null);
      setFormData(blankForm);
      setQuotations([]);
      setContracts([]);
      setInvoices([]);
      setFollowUps([]);
      setFilter({ follow_up_type: '', search: '', next_follow_up_date: '' });
      setCurrentPage(1);
      setTotalItems(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customer, initialView]);

  // Fetch history whenever view is 'history' or filter/pagination changes
  useEffect(() => {
    if (view === 'history' && customer) {
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, customer, currentPage, pageSize, filter.follow_up_type, filter.next_follow_up_date]);

  // Debounce the free-text search — only refetch 350ms after user stops typing
  useEffect(() => {
    if (view !== 'history' || !customer) return;
    const t = setTimeout(() => {
      setCurrentPage(1);
      fetchHistory();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.search]);

  // Reset to page 1 when non-text filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter.follow_up_type, filter.next_follow_up_date]);

  const handleFollowUpTypeChange = (v: string) => {
    const t = v as FollowUpType;
    const refTypes = FollowUpTypeToDocRefTypes[t] || [];
    const refType = refTypes[0];
    setFormData((prev) => ({
      ...prev,
      follow_up_type: t,
      document_ref_type: refType || '',
      document_ref_id: '',
      document_ref_code: '',
      contract_id: '',
    }));
    if (refType) fetchDocumentsForRefType(refType);
  };

  const documentOptions: DocOption[] = useMemo(() => {
    if (formData.document_ref_type === FollowUpDocumentRefType.QUOTATION) {
      return quotations.map((q) => ({ id: q.id, code: q.code || q.id.substring(0, 8) }));
    }
    if (formData.document_ref_type === FollowUpDocumentRefType.CONTRACT) {
      return contracts.map((c) => ({ id: c.id, code: c.code || c.id.substring(0, 8) }));
    }
    if (formData.document_ref_type === FollowUpDocumentRefType.INVOICE) {
      return invoices.map((i) => ({ id: i.id, code: i.code || i.id.substring(0, 8) }));
    }
    return [];
  }, [formData.document_ref_type, quotations, contracts, invoices]);

  const handleDocumentChange = (id: string) => {
    const opt = documentOptions.find((o) => o.id === id);
    setFormData((prev) => ({
      ...prev,
      document_ref_id: id,
      document_ref_code: opt?.code || '',
      contract_id: prev.document_ref_type === FollowUpDocumentRefType.CONTRACT ? id : prev.contract_id,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    if (!formData.follow_up_type) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกประเภทการติดตาม' });
      return;
    }
    if (!formData.document_ref_id) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกเอกสารอ้างอิง' });
      return;
    }
    if (!formData.result) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกผลการติดตาม' });
      return;
    }
    if (formData.result.trim() === FollowUpResult.CALL_BACK && !formData.next_follow_up_date) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกวันนัดถัดไป', text: 'กรณีผลเป็น "ติดต่อกลับภายหลัง" ต้องกรอกวันนัดติดตามครั้งถัดไป' });
      return;
    }

    setSaving(true);
    try {
      await ContractFollowUpApi.create({
        customer_id: customer.id,
        contract_id: formData.contract_id || undefined,
        follow_up_type: formData.follow_up_type as FollowUpType,
        document_ref_type: formData.document_ref_type as FollowUpDocumentRefType,
        document_ref_id: formData.document_ref_id,
        document_ref_code: formData.document_ref_code,
        follow_up_date: formData.follow_up_date,
        contact_method: formData.contact_method.trim() || undefined,
        result: formData.result.trim(),
        notes: formData.notes || undefined,
        next_follow_up_date: formData.next_follow_up_date || undefined,
      });
      Swal.fire({ icon: 'success', title: 'บันทึกการติดตามสำเร็จ', timer: 1500, showConfirmButton: false });
      setFormData(blankForm);
    } catch (error) {
      console.error('Error creating follow-up:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกการติดตามได้' });
    } finally {
      setSaving(false);
    }
  };

  // Filtering and pagination are now server-side — followUps already comes back filtered.

  if (!isOpen || !customer) return null;

  const fullName = `${customer.first_name} ${customer.last_name || ''}`.trim();
  const title =
    view === 'detail'
      ? `รายละเอียดการติดตาม: ${fullName}`
      : view === 'history'
        ? `ประวัติการติดตาม: ${fullName}`
        : `การติดตาม: ${fullName}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={view === 'history' ? '7xl' : '4xl'}
      footer={
        view === 'form' ? (
          <div className="flex w-full justify-end items-center gap-2">
            <Button
              type="button"
              onClick={() => setView('history')}
              variant="outline"
              className="px-5"
            >
              ดูประวัติการติดตาม
            </Button>
            <Button type="submit" form="follow-up-form" variant="primary" disabled={saving} className="px-5">
              {saving ? 'กำลังบันทึก...' : 'บันทึกการติดตาม'}
            </Button>
          </div>
        ) : view === 'detail' ? (
          <div className="flex w-full justify-end">
            <Button
              type="button"
              onClick={() => { setSelectedDetail(null); setView('history'); }}
              variant="outline"
              className="py-2 px-4"
            >
              กลับไปที่รายการ
            </Button>
          </div>
        ) : (
          <div className="flex w-full justify-end">
            <Button
              type="button"
              onClick={() => setView('form')}
              variant="primary"
              className="px-5"
            >
              ย้อนกลับ
            </Button>
          </div>
        )
      }
    >
      {view === 'form' && (
        <FormSection
          customer={customer}
          formData={formData}
          setFormData={setFormData}
          documentOptions={documentOptions}
          loadingDocs={loadingDocs}
          handleFollowUpTypeChange={handleFollowUpTypeChange}
          handleDocumentChange={handleDocumentChange}
          handleSubmit={handleSubmit}
        />
      )}

      {view === 'history' && (
        <HistorySection
          followUps={followUps}
          totalItems={totalItems}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          filter={filter}
          setFilter={setFilter}
          loading={loadingHistory}
          onSelectDetail={(f) => { setSelectedDetail(f); setView('detail'); }}
        />
      )}

      {view === 'detail' && selectedDetail && (
        <FormSection
          customer={customer}
          formData={{
            follow_up_type: (selectedDetail.follow_up_type as FollowUpType) || '',
            document_ref_type: (selectedDetail.document_ref_type as FollowUpDocumentRefType) || '',
            document_ref_id: selectedDetail.document_ref_id || '',
            document_ref_code: selectedDetail.document_ref_code || '',
            contract_id: selectedDetail.contract_id || '',
            follow_up_date: (selectedDetail.follow_up_date || '').substring(0, 10),
            contact_method: selectedDetail.contact_method || '',
            result: selectedDetail.result || '',
            notes: selectedDetail.notes || '',
            next_follow_up_date: (selectedDetail.next_follow_up_date || '').substring(0, 10),
          }}
          setFormData={() => { /* readOnly */ }}
          documentOptions={[]}
          loadingDocs={false}
          handleFollowUpTypeChange={() => {}}
          handleDocumentChange={() => {}}
          handleSubmit={(e) => e.preventDefault()}
          readOnly
        />
      )}
    </Modal>
  );
};

/* ===== Form Section ===== */
const FormSection: React.FC<{
  customer: Customer;
  formData: ReturnType<typeof useState<{
    follow_up_type: FollowUpType | '';
    document_ref_type: FollowUpDocumentRefType | '';
    document_ref_id: string;
    document_ref_code: string;
    contract_id: string;
    follow_up_date: string;
    contact_method: string;
    result: string;
    notes: string;
    next_follow_up_date: string;
  }>>[0];
  setFormData: React.Dispatch<React.SetStateAction<{
    follow_up_type: FollowUpType | '';
    document_ref_type: FollowUpDocumentRefType | '';
    document_ref_id: string;
    document_ref_code: string;
    contract_id: string;
    follow_up_date: string;
    contact_method: string;
    result: string;
    notes: string;
    next_follow_up_date: string;
  }>>;
  documentOptions: DocOption[];
  loadingDocs: boolean;
  handleFollowUpTypeChange: (v: string) => void;
  handleDocumentChange: (id: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  readOnly?: boolean;
}> = ({ formData, setFormData, documentOptions, loadingDocs, handleFollowUpTypeChange, handleDocumentChange, handleSubmit, readOnly = false }) => {
  // In read-only mode, provide a single-option list for the document picker
  // so the selected code is visible (we don't fetch the full list in view mode).
  const docOptionsForView = readOnly && formData.document_ref_id
    ? [{ value: formData.document_ref_id, label: formData.document_ref_code || formData.document_ref_id }]
    : documentOptions.map((o) => ({ value: o.id, label: o.code }));

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <form
        id="follow-up-form"
        onSubmit={readOnly ? (e) => e.preventDefault() : handleSubmit}
        className="p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label={<>ประเภทการติดตาม{!readOnly && <span className="text-red-500"> *</span>}</>} htmlFor="fu-type">
            <DropdownSelect
              value={formData.follow_up_type}
              onChange={handleFollowUpTypeChange}
              placeholder="เลือกประเภท"
              options={Object.values(FollowUpType).map((t) => ({ value: t, label: FollowUpTypeLabels[t] }))}
              disabled={readOnly}
            />
          </FormField>
          <FormField label={<>เลขที่เอกสารอ้างอิง{!readOnly && <span className="text-red-500"> *</span>}</>} htmlFor="fu-doc">
            <DropdownSelect
              value={formData.document_ref_id}
              onChange={handleDocumentChange}
              placeholder={
                !formData.document_ref_type
                  ? 'เลือกประเภทก่อน'
                  : loadingDocs
                    ? 'กำลังโหลด...'
                    : docOptionsForView.length === 0
                      ? `ลูกค้านี้ไม่มี${FollowUpDocumentRefTypeLabels[formData.document_ref_type as FollowUpDocumentRefType]}`
                      : `เลือก${FollowUpDocumentRefTypeLabels[formData.document_ref_type as FollowUpDocumentRefType]}`
              }
              options={docOptionsForView}
              disabled={readOnly || !formData.document_ref_type || loadingDocs}
            />
          </FormField>
          <FormField label={<>วันที่ติดตาม{!readOnly && <span className="text-red-500"> *</span>}</>} htmlFor="fu-date">
            <BuddhistDatePicker
              id="fu-date"
              selected={formData.follow_up_date ? new Date(formData.follow_up_date) : null}
              onChange={(date: Date | null) => setFormData({
                ...formData,
                follow_up_date: date ? toISODate(date) : '',
              })}
              placeholderText="วว/ดด/ปป"
              dateFormat="dd/MM/yyyy"
              locale="th"
              wrapperClassName="w-full"
              className={dateInputClass}
              disabled={readOnly}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label={<>ผลการติดตาม{!readOnly && <span className="text-red-500"> *</span>}</>} htmlFor="fu-result">
            <Input
              id="fu-result"
              value={formData.result}
              onChange={(e) => setFormData({ ...formData, result: e.target.value })}
              placeholder="เช่น สนใจ, ติดต่อกลับภายหลัง"
              disabled={readOnly}
            />
          </FormField>
          <FormField label="ช่องทางการติดตาม" htmlFor="fu-method">
            <Input
              id="fu-method"
              value={formData.contact_method}
              onChange={(e) => setFormData({ ...formData, contact_method: e.target.value })}
              placeholder="เช่น โทรศัพท์"
              disabled={readOnly}
            />
          </FormField>
          <FormField label="วันนัดติดตามครั้งถัดไป" htmlFor="fu-next-date">
            <BuddhistDatePicker
              id="fu-next-date"
              selected={formData.next_follow_up_date ? new Date(formData.next_follow_up_date) : null}
              onChange={(date: Date | null) => setFormData({
                ...formData,
                next_follow_up_date: date ? toISODate(date) : '',
              })}
              placeholderText="วว/ดด/ปป"
              dateFormat="dd/MM/yyyy"
              locale="th"
              wrapperClassName="w-full"
              className={dateInputClass}
              disabled={readOnly}
            />
          </FormField>
        </div>

        <FormField label="หมายเหตุ / เหตุผล" htmlFor="fu-notes">
          <Textarea
            id="fu-notes"
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="รายละเอียดการติดตาม..."
            disabled={readOnly}
          />
        </FormField>
      </form>
    </section>
  );
};

/* ===== History Section ===== */
type HistoryFilter = {
  follow_up_type: FollowUpType | '';
  search: string;
  next_follow_up_date: string;
};

const HistorySection: React.FC<{
  followUps: ContractFollowUp[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  filter: HistoryFilter;
  setFilter: React.Dispatch<React.SetStateAction<HistoryFilter>>;
  loading: boolean;
  onSelectDetail: (f: ContractFollowUp) => void;
}> = ({ followUps, totalItems, currentPage, pageSize, onPageChange, onPageSizeChange, filter, setFilter, loading, onSelectDetail }) => {

  return (
    <div className="space-y-4">
      {/* Filter card */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm px-10 py-8">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="relative w-full sm:w-80 flex-shrink-0">
            <Input
              type="search"
              placeholder="ค้นหาเลขที่เอกสาร / ผลการติดตาม"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full pl-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="w-full sm:w-44 flex-shrink-0">
            <BuddhistDatePicker
              selected={filter.next_follow_up_date ? new Date(filter.next_follow_up_date) : null}
              onChange={(date: Date | null) => setFilter({
                ...filter,
                next_follow_up_date: date ? toISODate(date) : '',
              })}
              placeholderText="วว/ดด/ปป"
              dateFormat="dd/MM/yyyy"
              locale="th"
              isClearable
              wrapperClassName="w-full"
              className={`${dateInputClass} h-10`}
            />
          </div>
          <div className="w-full sm:w-48 flex-shrink-0">
            <DropdownSelect
              value={filter.follow_up_type}
              onChange={(v) => setFilter({ ...filter, follow_up_type: v as FollowUpType })}
              placeholder="ทุกประเภท"
              className="w-full bg-white border-slate-300 shadow-sm text-sm h-10"
              options={[
                { value: '', label: 'ทุกประเภท' },
                ...Object.values(FollowUpType).map((t) => ({ value: t, label: FollowUpTypeLabels[t] })),
              ]}
            />
          </div>
        </div>
      </section>

      {/* Table card */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <LoadingIcon className="w-8 h-8 animate-spin mb-3 text-primary" />
          <p className="text-sm">กำลังโหลดประวัติ...</p>
        </div>
      ) : followUps.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">
            {totalItems === 0 && !filter.search && !filter.follow_up_type && !filter.next_follow_up_date
              ? 'ยังไม่มีประวัติการติดตาม'
              : 'ไม่พบรายการตามเงื่อนไขที่ค้นหา'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-hidden">
          <table className="w-full table-auto divide-y divide-slate-200 border-b border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ลำดับ</th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">เลขที่เอกสาร</th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">วันที่ติดตาม</th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ช่องทาง</th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ผลการติดตาม</th>
                <th scope="col" className="px-3 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ครั้งที่</th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">นัดถัดไป</th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-slate-100/70">ประเภท</th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ผู้ติดตาม</th>
                <th scope="col" className="px-3 py-2.5 text-center text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {followUps.map((f, idx) => {
                const index = (currentPage - 1) * pageSize + idx;
                const type = f.follow_up_type as FollowUpType;
                const knownResult = f.result as FollowUpResult;
                const knownMethod = f.contact_method as ContactMethod | undefined;
                return (
                  <tr
                    key={f.id}
                    className="hover:bg-slate-50 [&>td]:align-top"
                  >
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-700 text-center tabular-nums">{index + 1}</td>
                    <td className={`px-3 py-3 whitespace-nowrap text-sm font-semibold ${typeTextColor[type] || 'text-slate-800'}`}>{f.document_ref_code || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-700">{formatThaiDate(f.follow_up_date)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-700">
                      {f.contact_method ? (ContactMethodLabels[knownMethod as ContactMethod] || f.contact_method) : '—'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      <span className={`font-medium ${resultColors[knownResult] || 'text-slate-700'}`}>
                        {FollowUpResultLabels[knownResult] || f.result}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-slate-700 tabular-nums">
                      {f.follow_up_number ?? '—'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      {f.next_follow_up_date && (
                        <span className="text-amber-600 font-medium">{formatThaiDate(f.next_follow_up_date)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${typeBadge[type] || 'bg-slate-100 text-slate-700'}`}>
                        {FollowUpTypeLabels[type] || f.follow_up_type}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-700">
                      {f.creator ? `${f.creator.first_name} ${f.creator.last_name || ''}`.trim() : '—'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <ActionMenu onViewDetail={() => onSelectDetail(f)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={pageSize}
          onPageChange={onPageChange}
          onItemsPerPageChange={onPageSizeChange}
        />
      )}
      </section>
    </div>
  );
};


/* ===== Per-row action dropdown ===== */
const ActionMenu: React.FC<{ onViewDetail: () => void }> = ({ onViewDetail }) => {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Estimated dropdown height ~50px (1 menu item); if no space below, open up
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 80);
    }
    setOpen((v) => !v);
  };

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        title="จัดการ"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h13M4 18h16" />
          <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open && (
        <div
          style={{ fontFamily: '"Noto Sans Thai", sans-serif' }}
          className={`absolute right-0 z-20 w-44 rounded-md border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onViewDetail(); }}
            style={{ fontFamily: 'inherit', fontSize: '0.9375rem' }}
            className="flex w-full items-center gap-2 px-3 py-2 font-normal text-slate-700 hover:bg-slate-50"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span style={{ fontFamily: 'inherit' }}>ดูรายละเอียด</span>
          </button>
        </div>
      )}
    </div>
  );
};
