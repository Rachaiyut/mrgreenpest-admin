import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatThaiDate } from '../../constants';
import {
  PlusIcon,
  ManageIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
} from '../../assets/icons/Icons';
import { Pagination } from '../../components/common/Pagination';
import {
  Quotation,
  Invoice,
  Receipt,
  Customer,
  Assessment,
  Status,
  InstallmentPlan,
} from '../../types';
import { QuotationDetailsModal } from '../../components/features/quotations/QuotationDetailsModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Input, Select, Button } from '../../components/common/FormControls';
import { Modal } from '../../components/common/Modal';

import { useData } from '../../contexts/DataContext';

type FinancialTab = 'ใบเสนอราคา' | 'ใบแจ้งหนี้' | 'ใบกำกับภาษี/ใบเสร็จรับเงิน';

// FIX: Add missing props to the interface
interface FinancialsProps {
  defaultTab: FinancialTab;
  onCreateQuotation?: (
    data: Omit<Quotation, 'id'>,
    assessmentId?: string
  ) => void;
  onUpdateQuotation?: (updated: Quotation) => void;
  onDeleteQuotation?: (id: string) => void;
  onReviseQuotation?: (id: string) => void;

  onCreateInvoice?: (data: Omit<Invoice, 'id'>) => void;
  onUpdateInvoice?: (updated: Invoice) => void;
  onDeleteInvoice?: (id: string) => void;

  onCreateReceipt?: (data: Omit<Receipt, 'id'>) => void;
  onUpdateReceipt?: (updated: Receipt) => void;
  onDeleteReceipt?: (id: string) => void;
}

const pageDetails: Record<
  string,
  { title: string; subtitle: string; buttonText: string }
> = {
  ใบเสนอราคา: {
    title: 'ใบเสนอราคา',
    subtitle: 'จัดการและติดตามใบเสนอราคาทั้งหมด',
    buttonText: 'สร้างใบเสนอราคา',
  },
  ใบแจ้งหนี้: {
    title: 'ใบแจ้งหนี้',
    subtitle: 'จัดการใบแจ้งหนี้ทั้งหมด',
    buttonText: 'สร้างใบแจ้งหนี้',
  },
  'ใบกำกับภาษี/ใบเสร็จรับเงิน': {
    title: 'ใบกำกับภาษี / ใบเสร็จรับเงิน',
    subtitle: 'จัดการใบกำกับภาษีและใบเสร็จรับเงิน',
    buttonText: 'สร้างเอกสาร',
  },
};

const Financials: React.FC<FinancialsProps> = ({
  defaultTab,
  onCreateQuotation,
  onUpdateQuotation,
  onDeleteQuotation,
  onReviseQuotation,
  onCreateInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onCreateReceipt,
  onUpdateReceipt,
  onDeleteReceipt,
}) => {
  const { quotations, invoices, receipts, customers, assessments } = useData();
  const navigate = useNavigate();
  const { title, subtitle, buttonText } =
    pageDetails[defaultTab] || pageDetails['ใบเสนอราคา'];

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(
    null
  );

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [quotationPage, setQuotationPage] = useState(1);
  const [quotationItemsPerPage, setQuotationItemsPerPage] = useState(10);

  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceItemsPerPage, setInvoiceItemsPerPage] = useState(10);

  const [openInvoiceDropdownId, setOpenInvoiceDropdownId] = useState<
    string | null
  >(null);
  const [invoiceDropdownPosition, setInvoiceDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
  const [invoiceFormCustomerId, setInvoiceFormCustomerId] = useState('');
  const [invoiceFormQuotationId, setInvoiceFormQuotationId] = useState('');
  const [invoiceFormIssuedAt, setInvoiceFormIssuedAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [invoiceFormDueAt, setInvoiceFormDueAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [invoiceFormStatus, setInvoiceFormStatus] = useState<Status>(
    Status.Pending
  );
  const [invoiceFormTotal, setInvoiceFormTotal] = useState(0);
  const [invoiceFormInstallmentId, setInvoiceFormInstallmentId] = useState<
    string | undefined
  >(undefined);
  const [invoiceFormTerm, setInvoiceFormTerm] = useState<number | undefined>(
    undefined
  );

  const customerMap = useMemo(
    () => new Map((customers || []).map((c) => [c.id, `${c.first_name} ${c.last_name}`])),
    [customers]
  );

  const [receiptPage, setReceiptPage] = useState(1);
  const [receiptItemsPerPage, setReceiptItemsPerPage] = useState(10);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<
    'ทั้งหมด' | InvoiceStatus
  >('ทั้งหมด');

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isInvoiceEditModalOpen, setIsInvoiceEditModalOpen] = useState(false);
  const [isInvoiceDeleteModalOpen, setIsInvoiceDeleteModalOpen] =
    useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const [isInvoiceMarkPaidConfirmOpen, setIsInvoiceMarkPaidConfirmOpen] =
    useState(false);
  const [invoiceToMarkPaid, setInvoiceToMarkPaid] = useState<Invoice | null>(
    null
  );
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [receiptPaymentMethodFilter, setReceiptPaymentMethodFilter] = useState<
    'ทั้งหมด' | string
  >('ทั้งหมด');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isReceiptEditModalOpen, setIsReceiptEditModalOpen] = useState(false);
  const [isReceiptDeleteModalOpen, setIsReceiptDeleteModalOpen] =
    useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);
  const [openReceiptDropdownId, setOpenReceiptDropdownId] = useState<
    string | null
  >(null);
  const [receiptDropdownPosition, setReceiptDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const receiptDropdownRef = useRef<HTMLDivElement>(null);
  const [isAddReceiptModalOpen, setIsAddReceiptModalOpen] = useState(false);
  const [receiptFormInvoiceId, setReceiptFormInvoiceId] = useState('');
  const [receiptFormCustomerId, setReceiptFormCustomerId] = useState('');
  const [receiptFormCustomerName, setReceiptFormCustomerName] = useState('');
  const [receiptFormPaidAt, setReceiptFormPaidAt] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [receiptFormPaymentMethod, setReceiptFormPaymentMethod] =
    useState<string>('โอนเงิน');
  const [receiptFormAmount, setReceiptFormAmount] = useState<number>(0);
  const [quotationSearchQuery, setQuotationSearchQuery] = useState('');
  const [quotationStatusFilter, setQuotationStatusFilter] = useState<
    'ทั้งหมด' | Status
  >('ทั้งหมด');

  const [quotationStartDate, setQuotationStartDate] = useState('');
  const [quotationEndDate, setQuotationEndDate] = useState('');

  const quotationData = quotations || [];
  const filteredQuotations = useMemo(() => {
    const q = quotationSearchQuery.trim().toLowerCase();
    const start = quotationStartDate ? new Date(quotationStartDate) : null;
    const end = quotationEndDate ? new Date(quotationEndDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    // Create phone map for search
    const custPhoneMap = new Map(
      (customers || []).map((c) => [
        c.id,
        [c.phone].filter(Boolean).join(''),
      ])
    );

    let result = quotationData;

    // 1. Search (ID, Name, Phone)
    if (q) {
      result = result.filter((item) => {
        const phone = custPhoneMap.get(item.customer_id) || '';
        return (
          item.id.toLowerCase().includes(q) ||
          item.customer_name.toLowerCase().includes(q) ||
          phone.includes(q)
        );
      });
    }

    // 2. Status Filter
    if (quotationStatusFilter !== 'ทั้งหมด') {
      result = result.filter((item) => item.status === quotationStatusFilter);
    }

    // 3. Date Filter
    if (start || end) {
      result = result.filter((item) => {
        const d = new Date(item.created_at);
        return (!start || d >= start) && (!end || d <= end);
      });
    }

    // Filter to show only the latest revision for each base ID
    const latestMap = new Map<string, Quotation>();
    for (const item of result) {
      const baseId = item.id.split('-')[0];
      const existing = latestMap.get(baseId);
      if (!existing || item.revision > existing.revision) {
        latestMap.set(baseId, item);
      }
    }
    return Array.from(latestMap.values());
  }, [
    quotationData,
    quotationSearchQuery,
    quotationStatusFilter,
    quotationStartDate,
    quotationEndDate,
    customers,
  ]);

  const quotationsReversed = useMemo(
    () => [...filteredQuotations].reverse(),
    [filteredQuotations]
  );
  const totalQuotationItems = quotationsReversed.length;
  const paginatedQuotations = useMemo(
    () =>
      quotationsReversed.slice(
        (quotationPage - 1) * quotationItemsPerPage,
        quotationPage * quotationItemsPerPage
      ),
    [quotationsReversed, quotationPage, quotationItemsPerPage]
  );

  const [invoiceStartDate, setInvoiceStartDate] = useState('');
  const [invoiceEndDate, setInvoiceEndDate] = useState('');

  const invoiceData = invoices || [];
  const filteredInvoices = useMemo(() => {
    const q = invoiceSearchQuery.trim().toLowerCase();
    const start = invoiceStartDate ? new Date(invoiceStartDate) : null;
    const end = invoiceEndDate ? new Date(invoiceEndDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    // Create phone map for search
    const custPhoneMap = new Map(
      (customers || []).map((c) => [
        c.id,
        [c.phone].filter(Boolean).join(''),
      ])
    );

    let result = invoiceData;

    // 1. Search
    if (q) {
      result = result.filter((item) => {
        const phone = custPhoneMap.get(item.customer_id) || '';
        return (
          item.id.toLowerCase().includes(q) ||
          item.customer_name.toLowerCase().includes(q) ||
          phone.includes(q)
        );
      });
    }

    // 2. Status Filter
    if (invoiceStatusFilter !== 'ทั้งหมด') {
      result = result.filter((i) => (i.status as unknown as Status) === invoiceStatusFilter);
    }

    // 3. Date Filter (using issuedAt)
    if (start || end) {
      result = result.filter((item) => {
        const d = new Date(item.issued_at);
        return (!start || d >= start) && (!end || d <= end);
      });
    }

    return result;
  }, [
    invoiceData,
    invoiceSearchQuery,
    invoiceStatusFilter,
    invoiceStartDate,
    invoiceEndDate,
    customers,
  ]);
  const reversedInvoices = useMemo(
    () => [...filteredInvoices].reverse(),
    [filteredInvoices]
  );
  const totalInvoiceItems = reversedInvoices.length;
  const paginatedInvoices = useMemo(
    () =>
      reversedInvoices.slice(
        (invoicePage - 1) * invoiceItemsPerPage,
        invoicePage * invoiceItemsPerPage
      ),
    [reversedInvoices, invoicePage, invoiceItemsPerPage]
  );

  const [receiptStartDate, setReceiptStartDate] = useState('');
  const [receiptEndDate, setReceiptEndDate] = useState('');

  const receiptData = receipts || [];
  const receiptPaymentMethods = useMemo(
    () => Array.from(new Set(receiptData.map((r) => r.payment_method))),
    [receiptData]
  );
  const filteredReceipts = useMemo(() => {
    const q = receiptSearchQuery.trim().toLowerCase();
    const start = receiptStartDate ? new Date(receiptStartDate) : null;
    const end = receiptEndDate ? new Date(receiptEndDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    // Create phone map for search
    const custPhoneMap = new Map(
      (customers || []).map((c) => [
        c.id,
        [c.phone].filter(Boolean).join(''),
      ])
    );

    let result = receiptData;

    // 1. Search
    if (q) {
      result = result.filter((r) => {
        const phone = custPhoneMap.get(r.customer_id) || '';
        return (
          r.id.toLowerCase().includes(q) ||
          r.customer_name.toLowerCase().includes(q) ||
          phone.includes(q)
        );
      });
    }

    // 2. Payment Method Filter
    if (receiptPaymentMethodFilter !== 'ทั้งหมด') {
      result = result.filter(
        (r) => r.payment_method === receiptPaymentMethodFilter
      );
    }

    // 3. Date Filter (using paidAt)
    if (start || end) {
      result = result.filter((item) => {
        const d = new Date(item.paid_at);
        return (!start || d >= start) && (!end || d <= end);
      });
    }

    return result;
  }, [
    receiptData,
    receiptSearchQuery,
    receiptPaymentMethodFilter,
    receiptStartDate,
    receiptEndDate,
    customers,
  ]);

  const reversedReceipts = useMemo(
    () => [...filteredReceipts].reverse(),
    [filteredReceipts]
  );
  const totalReceiptItems = reversedReceipts.length;
  const paginatedReceipts = useMemo(
    () =>
      reversedReceipts.slice(
        (receiptPage - 1) * receiptItemsPerPage,
        receiptPage * receiptItemsPerPage
      ),
    [reversedReceipts, receiptPage, receiptItemsPerPage]
  );

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    quotationId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === quotationId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setSelectedQuotation(
        quotations?.find((q) => q.id === quotationId) || null
      );
      setOpenDropdownId(quotationId);
      setDropdownPosition({
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.right + window.scrollX,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openDropdownId) return;
      if (
        dropdownRef.current &&
        dropdownRef.current.contains(event.target as Node)
      ) {
        return;
      }
      if ((event.target as HTMLElement).closest('button[data-quotation-id]')) {
        return;
      }
      setOpenDropdownId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        openInvoiceDropdownId &&
        invoiceDropdownRef.current &&
        !invoiceDropdownRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('button[data-invoice-id]')
      ) {
        setOpenInvoiceDropdownId(null);
      }

      if (
        openReceiptDropdownId &&
        receiptDropdownRef.current &&
        !receiptDropdownRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('button[data-receipt-id]')
      ) {
        setOpenReceiptDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openInvoiceDropdownId, openReceiptDropdownId]);

  const handleQuotationItemsPerPageChange = (size: number) => {
    setQuotationItemsPerPage(size);
    setQuotationPage(1);
  };

  const handleInvoiceItemsPerPageChange = (size: number) => {
    setInvoiceItemsPerPage(size);
    setInvoicePage(1);
  };

  const handleReceiptItemsPerPageChange = (size: number) => {
    setReceiptItemsPerPage(size);
    setReceiptPage(1);
  };

  const handleInvoiceDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    id: string,
    invoice: Invoice
  ) => {
    event.stopPropagation();
    if (openInvoiceDropdownId === id) {
      setOpenInvoiceDropdownId(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setSelectedInvoice(invoice);
      setOpenInvoiceDropdownId(id);
      setInvoiceDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX,
      });
    }
  };

  const handleViewDetails = () => {
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };
  const handleEdit = () => {
    if (selectedQuotation) {
      navigate(`/quotations/${selectedQuotation.id}/edit`);
    }
    setOpenDropdownId(null);
  };
  const handleDelete = () => {
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = () => {
    if (selectedQuotation && onDeleteQuotation) {
      onDeleteQuotation(selectedQuotation.id);
    }
    setIsDeleteModalOpen(false);
    setSelectedQuotation(null);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceModalOpen(true);
    setOpenInvoiceDropdownId(null);
  };
  const handleEditInvoice = (invoice: Invoice) => {
    navigate(`/invoices/${invoice.id}/edit`);
    setOpenInvoiceDropdownId(null);
  };
  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setIsInvoiceDeleteModalOpen(true);
    setOpenInvoiceDropdownId(null);
  };
  const confirmDeleteInvoice = () => {
    if (invoiceToDelete && onDeleteInvoice) onDeleteInvoice(invoiceToDelete.id);
    setIsInvoiceDeleteModalOpen(false);
    setInvoiceToDelete(null);
  };

  const handleCreateInvoiceFromInstallment = (installment: InstallmentPlan) => {
    if (!selectedQuotation) return;
    setInvoiceFormCustomerId(selectedQuotation.customer_id);
    setInvoiceFormQuotationId(selectedQuotation.id);
    setInvoiceFormTotal(installment.amount);
    setInvoiceFormInstallmentId(installment.id);
    setInvoiceFormTerm(installment.term);
    setInvoiceFormStatus(Status.Pending);

    const d = installment.due_date ? new Date(installment.due_date) : new Date();
    if (!installment.due_date) d.setDate(d.getDate() + 30);
    setInvoiceFormDueAt(d.toISOString().slice(0, 10));

    setIsDetailsModalOpen(false);
    setIsAddInvoiceModalOpen(true);
  };

  const renderContent = () => {
    switch (defaultTab) {
      case 'ใบเสนอราคา': {
        return (
          <Card
            className="!p-0"
            actions={
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                <div className="w-full sm:w-64">
                  <Input
                    type="search"
                    placeholder="ค้นหา (เลขที่, ชื่อลูกค้า, เบอร์โทร)..."
                    value={quotationSearchQuery}
                    onChange={(e) => {
                      setQuotationSearchQuery(e.target.value);
                      setQuotationPage(1);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={quotationStartDate}
                    onChange={(e) => setQuotationStartDate(e.target.value)}
                    className="w-40"
                    placeholder="เริ่มต้น"
                  />
                  <span className="text-slate-400">-</span>
                  <Input
                    type="date"
                    value={quotationEndDate}
                    onChange={(e) => setQuotationEndDate(e.target.value)}
                    className="w-40"
                    placeholder="สิ้นสุด"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select
                    value={quotationStatusFilter}
                    onChange={(e) => {
                      const v = e.target.value as 'ทั้งหมด' | Status;
                      setQuotationStatusFilter(v);
                      setQuotationPage(1);
                    }}
                  >
                    <option value="ทั้งหมด">ทั้งหมด</option>
                    <option value={Status.Draft}>{Status.Draft}</option>
                    <option value={Status.Sent}>{Status.Sent}</option>
                    <option value={Status.UnderReview}>
                      {Status.UnderReview}
                    </option>
                    <option value={Status.Pending}>{Status.Pending}</option>
                    <option value={Status.PendingApproval}>
                      {Status.PendingApproval}
                    </option>
                    <option value={Status.Approved}>{Status.Approved}</option>
                    <option value={Status.Rejected}>{Status.Rejected}</option>
                    <option value={Status.Converted}>{Status.Converted}</option>
                    <option value={Status.Revise}>{Status.Revise}</option>
                    <option value={Status.Closed}>{Status.Closed}</option>
                    <option value={Status.Cancelled}>{Status.Cancelled}</option>
                  </Select>
                </div>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      ลำดับ
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      เลขที่ใบเสนอราคา
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      ลูกค้า
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      เบอร์โทร
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      อ้างอิงใบประเมิน
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      วันที่
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      สถานะ
                    </th>
                    <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                      ยอดรวม
                    </th>
                    <th className="relative px-4 py-2.5">
                      <span className="sr-only">จัดการ</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {paginatedQuotations.map((q, index) => {
                    const customer = customers?.find(
                      (c) => c.id === q.customer_id
                    );
                    return (
                      <tr key={q.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {(quotationPage - 1) * quotationItemsPerPage +
                            index +
                            1}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-primary hover:underline cursor-pointer">
                          {q.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {q.customer_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {customer?.phone || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {q.assessment_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {formatThaiDate(q.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <StatusBadge status={q.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          ฿
                          {q.total.toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="inline-block text-left">
                            <Button
                              data-quotation-id={q.id}
                              onClick={(e) => handleDropdownToggle(e, q.id)}
                              variant="icon"
                              title="ตัวเลือก"
                            >
                              <span className="sr-only">Open options</span>
                              <ManageIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={quotationPage}
              totalItems={totalQuotationItems}
              itemsPerPage={quotationItemsPerPage}
              onPageChange={setQuotationPage}
              onItemsPerPageChange={handleQuotationItemsPerPageChange}
            />
          </Card>
        );
      }
      case 'ใบแจ้งหนี้': {
        return (
          <div className="space-y-6">
            <Card
              title="ใบแจ้งหนี้"
              className="!p-0"
              actions={
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                  <div className="w-full sm:w-64">
                    <Input
                      type="search"
                      placeholder="ค้นหา (เลขที่, ชื่อลูกค้า, เบอร์โทร)..."
                      value={invoiceSearchQuery}
                      onChange={(e) => {
                        setInvoiceSearchQuery(e.target.value);
                        setInvoicePage(1);
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={invoiceStartDate}
                      onChange={(e) => setInvoiceStartDate(e.target.value)}
                      className="w-40"
                      placeholder="เริ่มต้น"
                    />
                    <span className="text-slate-400">-</span>
                    <Input
                      type="date"
                      value={invoiceEndDate}
                      onChange={(e) => setInvoiceEndDate(e.target.value)}
                      className="w-40"
                      placeholder="สิ้นสุด"
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select
                      value={invoiceStatusFilter}
                      onChange={(e) => {
                        const v = e.target.value as 'ทั้งหมด' | Status;
                        setInvoiceStatusFilter(v);
                        setInvoicePage(1);
                      }}
                    >
                      <option value="ทั้งหมด">ทั้งหมด</option>
                      <option value={Status.Pending}>{Status.Pending}</option>
                      <option value={Status.Paid}>{Status.Paid}</option>
                      <option value={Status.Overdue}>{Status.Overdue}</option>
                    </Select>
                  </div>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        ลำดับ
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        เลขที่ใบแจ้งหนี้
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        ลูกค้า
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        เบอร์โทร
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        วันครบกำหนด
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        สถานะ
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        ยอดรวม
                      </th>
                      {(onUpdateInvoice || onDeleteInvoice) && (
                        <th className="relative px-4 py-2.5">
                          <span className="sr-only">จัดการ</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {paginatedInvoices.map((i, index) => {
                      const customer = customers?.find(
                        (c) => c.id === i.customer_id
                      );
                      return (
                        <tr key={i.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                            {(invoicePage - 1) * invoiceItemsPerPage +
                              index +
                              1}
                          </td>
                          <td
                            className="px-4 py-3 text-sm font-medium text-primary hover:underline cursor-pointer"
                            onClick={() => {
                              setSelectedInvoice(i);
                              setIsInvoiceModalOpen(true);
                            }}
                          >
                            {i.id}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {i.customer_name}
                            {i.term && (
                              <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                งวดที่ {i.term}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {customer?.phone || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {formatThaiDate(i.due_at)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <StatusBadge status={i.status} />
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            ฿
                            {i.total.toLocaleString('th-TH', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          {(onUpdateInvoice || onDeleteInvoice) && (
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <div className="inline-block text-left">
                                <Button
                                  data-invoice-id={i.id}
                                  onClick={(e) =>
                                    handleInvoiceDropdownToggle(e, i.id, i)
                                  }
                                  variant="icon"
                                  title="ตัวเลือก"
                                >
                                  <span className="sr-only">Open options</span>
                                  <ManageIcon
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={invoicePage}
                totalItems={totalInvoiceItems}
                itemsPerPage={invoiceItemsPerPage}
                onPageChange={setInvoicePage}
                onItemsPerPageChange={handleInvoiceItemsPerPageChange}
              />
            </Card>
          </div>
        );
      }

      case 'ใบกำกับภาษี/ใบเสร็จรับเงิน': {
        return (
          <div className="space-y-6">
            <Card
              title="ใบเสร็จรับเงิน"
              className="!p-0"
              actions={
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                  <div className="w-full sm:w-64">
                    <Input
                      type="search"
                      placeholder="ค้นหา (เลขที่, ชื่อลูกค้า, เบอร์โทร)..."
                      value={receiptSearchQuery}
                      onChange={(e) => {
                        setReceiptSearchQuery(e.target.value);
                        setReceiptPage(1);
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={receiptStartDate}
                      onChange={(e) => setReceiptStartDate(e.target.value)}
                      className="w-40"
                      placeholder="เริ่มต้น"
                    />
                    <span className="text-slate-400">-</span>
                    <Input
                      type="date"
                      value={receiptEndDate}
                      onChange={(e) => setReceiptEndDate(e.target.value)}
                      className="w-40"
                      placeholder="สิ้นสุด"
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select
                      value={receiptPaymentMethodFilter}
                      onChange={(e) => {
                        setReceiptPaymentMethodFilter(
                          e.target.value as 'ทั้งหมด' | string
                        );
                        setReceiptPage(1);
                      }}
                    >
                      <option value="ทั้งหมด">ทั้งหมด</option>
                      {receiptPaymentMethods.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        ลำดับ
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        เลขที่เอกสาร
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        ลูกค้า
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        เบอร์โทร
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        วันที่ชำระ
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        วิธีชำระเงิน
                      </th>
                      <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">
                        จำนวนเงิน
                      </th>
                      {(onUpdateReceipt || onDeleteReceipt) && (
                        <th className="relative px-4 py-2.5">
                          <span className="sr-only">จัดการ</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {paginatedReceipts.map((r, index) => {
                      const customer = customers?.find(
                        (c) => c.id === r.customerId
                      );
                      return (
                        <tr key={r.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                            {(receiptPage - 1) * receiptItemsPerPage +
                              index +
                              1}
                          </td>
                          <td
                            className="px-4 py-3 text-sm font-medium text-primary hover:underline cursor-pointer"
                            onClick={() => {
                              setSelectedReceipt(r);
                              setIsReceiptModalOpen(true);
                            }}
                          >
                            {r.id}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {r.customer_name}
                            <div className="text-xs text-slate-400 mt-0.5">
                              Ref: {r.invoice_id}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {customer?.phone || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {formatThaiDate(r.paid_at)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {r.payment_method}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            ฿
                            {r.amount.toLocaleString('th-TH', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          {(onUpdateReceipt || onDeleteReceipt) && (
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <div className="inline-block text-left">
                                <Button
                                  data-receipt-id={r.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = (
                                      e.currentTarget as HTMLButtonElement
                                    ).getBoundingClientRect();
                                    setSelectedReceipt(r);
                                    setOpenReceiptDropdownId(r.id);
                                    setReceiptDropdownPosition({
                                      top: rect.bottom + window.scrollY,
                                      left: rect.right + window.scrollX,
                                    });
                                  }}
                                  variant="icon"
                                  title="ตัวเลือก"
                                >
                                  <span className="sr-only">Open options</span>
                                  <ManageIcon
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={receiptPage}
                totalItems={totalReceiptItems}
                itemsPerPage={receiptItemsPerPage}
                onPageChange={setReceiptPage}
                onItemsPerPageChange={handleReceiptItemsPerPageChange}
              />
            </Card>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const actions = [
    {
      label: 'ดูรายละเอียด',
      icon: EyeIcon,
      handler: handleViewDetails,
      isDanger: false,
    },
    {
      label: 'แก้ไขสถานะ',
      icon: PencilIcon,
      handler: handleEdit,
      isDanger: false,
    },
    ...(defaultTab === 'ใบเสนอราคา'
      ? [
          {
            label: 'revise (แก้ไขตามรอบ)',
            icon: PencilIcon,
            handler: () => {
              if (selectedQuotation) {
                navigate(
                  `/quotations/${selectedQuotation.id}/edit?mode=revise`
                );
                setOpenDropdownId(null);
              }
            },
            isDanger: false,
          },
        ]
      : []),
    { label: 'ลบ', icon: TrashIcon, handler: handleDelete, isDanger: true },
  ];

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
            <p className="mt-1 text-slate-600">{subtitle}</p>
          </div>
          {defaultTab === 'ใบเสนอราคา' && onCreateQuotation && (
            <Button onClick={() => navigate('/quotations/new')}>
              <PlusIcon className="h-5 w-5" />
              {buttonText}
            </Button>
          )}
          {defaultTab === 'ใบแจ้งหนี้' && onCreateInvoice && (
            <Button onClick={() => setIsAddInvoiceModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              {buttonText}
            </Button>
          )}
          {defaultTab === 'ใบกำกับภาษี/ใบเสร็จรับเงิน' && onCreateReceipt && (
            <Button onClick={() => setIsAddReceiptModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              {buttonText}
            </Button>
          )}
        </div>

        <div className="mt-6">{renderContent()}</div>
      </div>

      {openDropdownId && dropdownPosition && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {actions.map((action) => (
              <a
                key={action.label}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  action.handler();
                }}
                className={`flex items - center w - full text - left px - 4 py - 2 text - sm ${action.isDanger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'} `}
                role="menuitem"
              >
                <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                <span>{action.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <QuotationDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        quotation={selectedQuotation}
        allQuotations={quotations}
        onCreateInvoice={handleCreateInvoiceFromInstallment}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบใบเสนอราคา{' '}
            <strong>{selectedQuotation?.id}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
      <Modal
        isOpen={isAddReceiptModalOpen}
        onClose={() => setIsAddReceiptModalOpen(false)}
        title="สร้างใบเสร็จรับเงิน"
        footer={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsAddReceiptModalOpen(false)}
              className="px-4 py-2 rounded-md border border-slate-300 text-slate-700"
              variant="outline"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                if (!onCreateReceipt) return;
                const payload: Omit<Receipt, 'id'> = {
                  invoice_id: receiptFormInvoiceId,
                  customer_id: receiptFormCustomerId,
                  customer_name: receiptFormCustomerName,
                  paid_at: receiptFormPaidAt,
                  amount: receiptFormAmount,
                  payment_method: receiptFormPaymentMethod,
                };
                onCreateReceipt(payload);
                setIsAddReceiptModalOpen(false);
                setReceiptFormInvoiceId('');
                setReceiptFormCustomerId('');
                setReceiptFormCustomerName('');
                setReceiptFormPaidAt(new Date().toISOString().slice(0, 10));
                setReceiptFormPaymentMethod('โอนเงิน');
                setReceiptFormAmount(0);
              }}
              className="px-4 py-2 rounded-md bg-primary text-white"
              variant="primary"
            >
              บันทึก
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-600">ใบแจ้งหนี้ที่อ้างอิง</div>
            <Select
              value={receiptFormInvoiceId}
              onChange={(e) => {
                const id = e.target.value;
                setReceiptFormInvoiceId(id);
                const inv = (invoices || []).find((x) => x.id === id);
                if (inv) {
                  setReceiptFormCustomerId(inv.customer_id);
                  setReceiptFormCustomerName(inv.customer_name);
                  setReceiptFormAmount(inv.total || 0);
                }
              }}
            >
              <option value="">เลือกใบแจ้งหนี้</option>
              {(invoices || []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.id} — {i.customer_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-sm text-slate-600">วันที่ชำระ</div>
            <Input
              type="date"
              value={receiptFormPaidAt}
              onChange={(e) => setReceiptFormPaidAt(e.target.value)}
            />
          </div>
          <div>
            <div className="text-sm text-slate-600">วิธีชำระเงิน</div>
            <Select
              value={receiptFormPaymentMethod}
              onChange={(e) => setReceiptFormPaymentMethod(e.target.value)}
            >
              <option value="โอนเงิน">โอนเงิน</option>
              <option value="เงินสด">เงินสด</option>
              <option value="เช็ค">เช็ค</option>
              <option value="บัตรเครดิต">บัตรเครดิต</option>
            </Select>
          </div>
          <div>
            <div className="text-sm text-slate-600">จำนวนเงิน</div>
            <Input
              type="number"
              value={String(receiptFormAmount)}
              onChange={(e) =>
                setReceiptFormAmount(parseFloat(e.target.value) || 0)
              }
            />
          </div>
          <div>
            <div className="text-sm text-slate-600">ลูกค้า</div>
            <Input
              type="text"
              value={receiptFormCustomerName}
              onChange={(e) => setReceiptFormCustomerName(e.target.value)}
            />
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={isAddInvoiceModalOpen}
        onClose={() => setIsAddInvoiceModalOpen(false)}
        title="สร้างใบแจ้งหนี้"
        footer={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsAddInvoiceModalOpen(false)}
              className="px-4 py-2 rounded-md border border-slate-300 text-slate-700"
              variant="outline"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                if (!onCreateInvoice) return;
                if (!invoiceFormCustomerId) return;
                const name = customerMap.get(invoiceFormCustomerId) || '';
                onCreateInvoice({
                  customerId: invoiceFormCustomerId,
                  customerName: name,
                  quotationId: invoiceFormQuotationId || undefined,
                  installmentId: invoiceFormInstallmentId,
                  term: invoiceFormTerm,
                  issuedAt: invoiceFormIssuedAt,
                  dueAt: invoiceFormDueAt,
                  status: invoiceFormStatus,
                  total: invoiceFormTotal || 0,
                });
                setIsAddInvoiceModalOpen(false);
                setInvoiceFormCustomerId('');
                setInvoiceFormQuotationId('');
                setInvoiceFormInstallmentId(undefined);
                setInvoiceFormTerm(undefined);
                setInvoiceFormIssuedAt(new Date().toISOString().slice(0, 10));
                const d = new Date();
                d.setDate(d.getDate() + 30);
                setInvoiceFormDueAt(d.toISOString().slice(0, 10));
                setInvoiceFormStatus(Status.Pending);
                setInvoiceFormTotal(0);
              }}
              className="px-4 py-2 rounded-md bg-primary text-white"
              variant="primary"
            >
              บันทึก
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-600">ลูกค้า</div>
            <Select
              value={invoiceFormCustomerId}
              onChange={(e) => setInvoiceFormCustomerId(e.target.value)}
            >
              <option value="">เลือก</option>
              {(customers || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-sm text-slate-600">อ้างอิงใบเสนอราคา</div>
            <Select
              value={invoiceFormQuotationId}
              onChange={(e) => setInvoiceFormQuotationId(e.target.value)}
            >
              <option value="">ไม่ระบุ</option>
              {(quotations || []).map((q) => (
                <option key={q.id} value={q.id}>
                  {q.id}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-sm text-slate-600">วันที่ออก</div>
            <Input
              type="date"
              value={invoiceFormIssuedAt}
              onChange={(e) => setInvoiceFormIssuedAt(e.target.value)}
            />
          </div>
          <div>
            <div className="text-sm text-slate-600">วันครบกำหนด</div>
            <Input
              type="date"
              value={invoiceFormDueAt}
              onChange={(e) => setInvoiceFormDueAt(e.target.value)}
            />
          </div>
          <div>
            <div className="text-sm text-slate-600">สถานะ</div>
            <Select
              value={invoiceFormStatus}
              onChange={(e) => setInvoiceFormStatus(e.target.value as Status)}
            >
              <option value={Status.Pending}>{Status.Pending}</option>
              <option value={Status.Paid}>{Status.Paid}</option>
              <option value={Status.Overdue}>{Status.Overdue}</option>
            </Select>
          </div>
          <div>
            <div className="text-sm text-slate-600">ยอดรวม</div>
            <Input
              type="number"
              value={String(invoiceFormTotal)}
              onChange={(e) =>
                setInvoiceFormTotal(parseFloat(e.target.value) || 0)
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title={
          selectedInvoice
            ? `รายละเอียดใบแจ้งหนี้ ${selectedInvoice.id} `
            : 'รายละเอียดใบแจ้งหนี้'
        }
      >
        {selectedInvoice && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-600">ลูกค้า</div>
                <div className="text-sm text-slate-800">
                  {selectedInvoice.customer_name}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">อ้างอิงใบเสนอราคา</div>
                <div className="text-sm text-slate-800">
                  {selectedInvoice.quotation_id || '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">วันที่ออก</div>
                <div className="text-sm text-slate-800">
                  {formatThaiDate(selectedInvoice.issued_at)}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">วันครบกำหนด</div>
                <div className="text-sm text-slate-800">
                  {formatThaiDate(selectedInvoice.due_at)}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">สถานะ</div>
                <div>
                  <StatusBadge status={selectedInvoice.status} />
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">ยอดรวม</div>
                <div className="text-sm text-slate-800">
                  ฿
                  {selectedInvoice.total.toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={isInvoiceEditModalOpen}
        onClose={() => setIsInvoiceEditModalOpen(false)}
        title={
          selectedInvoice
            ? `แก้ไขใบแจ้งหนี้ ${selectedInvoice.id} `
            : 'แก้ไขใบแจ้งหนี้'
        }
        footer={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsInvoiceEditModalOpen(false)}
              className="px-4 py-2 rounded-md border border-slate-300 text-slate-700"
              variant="outline"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                if (!selectedInvoice || !onUpdateInvoice) return;
                onUpdateInvoice(selectedInvoice);
                setIsInvoiceEditModalOpen(false);
              }}
              className="px-4 py-2 rounded-md bg-primary text-white"
              variant="primary"
            >
              บันทึก
            </Button>
          </div>
        }
      >
        {selectedInvoice && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-600">ลูกค้า</div>
              <Select
                value={selectedInvoice.customer_id}
                onChange={(e) =>
                  setSelectedInvoice({
                    ...selectedInvoice,
                    customer_id: e.target.value,
                    customer_name:
                      customerMap.get(e.target.value) ||
                      selectedInvoice.customer_name,
                  })
                }
              >
                {(customers || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <div className="text-sm text-slate-600">อ้างอิงใบเสนอราคา</div>
              <Select
                value={selectedInvoice.quotation_id || ''}
                onChange={(e) =>
                  setSelectedInvoice({
                    ...selectedInvoice,
                    quotation_id: e.target.value || undefined,
                  })
                }
              >
                <option value="">ไม่ระบุ</option>
                {(quotations || []).map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.id}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <div className="text-sm text-slate-600">วันที่ออก</div>
              <Input
                type="date"
                value={selectedInvoice.issued_at}
                onChange={(e) =>
                  setSelectedInvoice({
                    ...selectedInvoice,
                    issued_at: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <div className="text-sm text-slate-600">วันครบกำหนด</div>
              <Input
                type="date"
                value={selectedInvoice.due_at}
                onChange={(e) =>
                  setSelectedInvoice({
                    ...selectedInvoice,
                    due_at: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <div className="text-sm text-slate-600">สถานะ</div>
              <Select
                value={selectedInvoice.status}
                onChange={(e) =>
                  setSelectedInvoice({
                    ...selectedInvoice,
                    status: e.target.value as Status,
                  })
                }
              >
                <option value={Status.Pending}>{Status.Pending}</option>
                <option value={Status.Paid}>{Status.Paid}</option>
                <option value={Status.Overdue}>{Status.Overdue}</option>
              </Select>
            </div>
            <div>
              <div className="text-sm text-slate-600">ยอดรวม</div>
              <Input
                type="number"
                value={String(selectedInvoice.total)}
                onChange={(e) =>
                  setSelectedInvoice({
                    ...selectedInvoice,
                    total: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            {selectedInvoice.term && (
              <div className="col-span-2">
                <div className="text-sm text-slate-600">งวดการชำระ</div>
                <div className="p-2 bg-blue-50 text-blue-800 rounded text-sm font-medium">
                  งวดที่ {selectedInvoice.term} (รหัสงวด:{' '}
                  {selectedInvoice.installmentId})
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
      <ConfirmationModal
        isOpen={isInvoiceDeleteModalOpen}
        onClose={() => setIsInvoiceDeleteModalOpen(false)}
        onConfirm={confirmDeleteInvoice}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณต้องการลบใบแจ้งหนี้ <strong>{invoiceToDelete?.id}</strong>{' '}
            หรือไม่?
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />

      <ConfirmationModal
        isOpen={isInvoiceMarkPaidConfirmOpen}
        onClose={() => {
          setIsInvoiceMarkPaidConfirmOpen(false);
          setInvoiceToMarkPaid(null);
        }}
        onConfirm={() => {
          if (!invoiceToMarkPaid || !onUpdateInvoice || !onCreateReceipt)
            return;
          const updated: Invoice = {
            ...invoiceToMarkPaid,
            status: Status.Paid,
          };
          onUpdateInvoice(updated);
          onCreateReceipt({
            invoiceId: invoiceToMarkPaid.id,
            customerId: invoiceToMarkPaid.customerId,
            customerName: invoiceToMarkPaid.customerName,
            paidAt: new Date().toISOString().slice(0, 10),
            amount: invoiceToMarkPaid.total,
            paymentMethod: 'โอนเงิน',
            // Note: Receipt interface might need updates if we track installment on receipt too,
            // but for now we primarily link via Invoice.
          });
          setIsInvoiceMarkPaidConfirmOpen(false);
          setInvoiceToMarkPaid(null);
        }}
        title="ทำเครื่องหมายชำระแล้ว"
        message={
          <p>
            สร้างใบเสร็จและทำเครื่องหมายใบแจ้งหนี้{' '}
            <strong>{invoiceToMarkPaid?.id}</strong> ว่าชำระแล้ว?
          </p>
        }
        confirmButtonText="ยืนยัน"
      />

      {openInvoiceDropdownId && invoiceDropdownPosition && (
        <div
          ref={invoiceDropdownRef}
          style={{
            position: 'absolute',
            top: `${invoiceDropdownPosition.top}px`,
            left: `${invoiceDropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (selectedInvoice) handleViewInvoice(selectedInvoice);
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              role="menuitem"
            >
              <EyeIcon className="mr-3 h-5 w-5" aria-hidden="true" />
              ดูรายละเอียด
            </a>
            {onUpdateInvoice &&
              onCreateReceipt &&
              selectedInvoice &&
              selectedInvoice.status !== Status.Paid && (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setInvoiceToMarkPaid(selectedInvoice);
                    setIsInvoiceMarkPaidConfirmOpen(true);
                    setOpenInvoiceDropdownId(null);
                  }}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  role="menuitem"
                >
                  <CurrencyDollarIcon
                    className="mr-3 h-5 w-5"
                    aria-hidden="true"
                  />
                  ทำเครื่องหมายชำระแล้ว
                </a>
              )}
            {onUpdateInvoice && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (selectedInvoice) handleEditInvoice(selectedInvoice);
                }}
                className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                role="menuitem"
              >
                <PencilIcon className="mr-3 h-5 w-5" aria-hidden="true" />
                แก้ไข
              </a>
            )}
            {onDeleteInvoice && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (selectedInvoice) handleDeleteInvoice(selectedInvoice);
                }}
                className="flex items-center w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                role="menuitem"
              >
                <TrashIcon className="mr-3 h-5 w-5" aria-hidden="true" />
                ลบ
              </a>
            )}
          </div>
        </div>
      )}

      {openReceiptDropdownId && receiptDropdownPosition && (
        <div
          ref={receiptDropdownRef}
          style={{
            position: 'absolute',
            top: `${receiptDropdownPosition.top}px`,
            left: `${receiptDropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (selectedReceipt) {
                  setIsReceiptModalOpen(true);
                  setOpenReceiptDropdownId(null);
                }
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              role="menuitem"
            >
              <EyeIcon className="mr-3 h-5 w-5" aria-hidden="true" />
              ดูรายละเอียด
            </a>
            {onUpdateReceipt && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (selectedReceipt) {
                    setIsReceiptEditModalOpen(true);
                    setOpenReceiptDropdownId(null);
                  }
                }}
                className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                role="menuitem"
              >
                <PencilIcon className="mr-3 h-5 w-5" aria-hidden="true" />
                แก้ไข
              </a>
            )}
            {onDeleteReceipt && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (selectedReceipt) {
                    setReceiptToDelete(selectedReceipt);
                    setIsReceiptDeleteModalOpen(true);
                    setOpenReceiptDropdownId(null);
                  }
                }}
                className="flex items-center w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                role="menuitem"
              >
                <TrashIcon className="mr-3 h-5 w-5" aria-hidden="true" />
                ลบ
              </a>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title={
          selectedReceipt
            ? `รายละเอียดใบเสร็จรับเงิน ${selectedReceipt.id} `
            : 'รายละเอียดใบเสร็จรับเงิน'
        }
      >
        {selectedReceipt && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-600">ลูกค้า</div>
              <div className="text-sm text-slate-800">
                {selectedReceipt.customerName}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">อ้างอิงใบแจ้งหนี้</div>
              <div className="text-sm text-slate-800">
                {selectedReceipt.invoiceId}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">วันที่ชำระ</div>
              <div className="text-sm text-slate-800">
                {formatThaiDate(selectedReceipt.paidAt)}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">วิธีชำระเงิน</div>
              <div className="text-sm text-slate-800">
                {selectedReceipt.paymentMethod}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">จำนวนเงิน</div>
              <div className="text-sm text-slate-800">
                ฿
                {selectedReceipt.amount.toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isReceiptEditModalOpen}
        onClose={() => setIsReceiptEditModalOpen(false)}
        title={
          selectedReceipt
            ? `แก้ไขใบเสร็จรับเงิน ${selectedReceipt.id} `
            : 'แก้ไขใบเสร็จรับเงิน'
        }
        footer={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsReceiptEditModalOpen(false)}
              className="px-4 py-2 rounded-md border border-slate-300 text-slate-700"
              variant="outline"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                if (!selectedReceipt || !onUpdateReceipt) return;
                onUpdateReceipt(selectedReceipt);
                setIsReceiptEditModalOpen(false);
              }}
              className="px-4 py-2 rounded-md bg-primary text-white"
              variant="primary"
            >
              บันทึก
            </Button>
          </div>
        }
      >
        {selectedReceipt && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-600">วันที่ชำระ</div>
              <Input
                type="date"
                value={selectedReceipt.paidAt}
                onChange={(e) =>
                  setSelectedReceipt({
                    ...selectedReceipt,
                    paidAt: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <div className="text-sm text-slate-600">วิธีชำระเงิน</div>
              <Input
                type="text"
                value={selectedReceipt.paymentMethod}
                onChange={(e) =>
                  setSelectedReceipt({
                    ...selectedReceipt,
                    paymentMethod: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <div className="text-sm text-slate-600">จำนวนเงิน</div>
              <Input
                type="number"
                value={String(selectedReceipt.amount)}
                onChange={(e) =>
                  setSelectedReceipt({
                    ...selectedReceipt,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={isReceiptDeleteModalOpen}
        onClose={() => setIsReceiptDeleteModalOpen(false)}
        onConfirm={() => {
          if (receiptToDelete && onDeleteReceipt)
            onDeleteReceipt(receiptToDelete.id);
          setIsReceiptDeleteModalOpen(false);
          setReceiptToDelete(null);
        }}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณต้องการลบใบเสร็จรับเงิน <strong>{receiptToDelete?.id}</strong>{' '}
            หรือไม่?
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
    </>
  );
};

export default Financials;
