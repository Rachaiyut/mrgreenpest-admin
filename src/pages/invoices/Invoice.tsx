import React, { useState, useMemo, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatThaiDate } from '../../utils/date';
import { formatPhoneNumber } from '../../utils/format';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  ManageIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  LoadingIcon,
} from '../../assets/icons/Icons';
import { Pagination } from '../../components/common/Pagination';
import { Invoice } from '../../types';
import { InvoiceStatus } from '../../types/enums/financial';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Input, Select, Button } from '../../components/common/FormControls';
import { Modal } from '../../components/common/Modal';
import { useData } from '../../contexts/DataContext';
import { InvoiceApi } from '../../api/invoice';
import { InvoiceModal } from '@/src/components/features/invoices/InvoiceModal';

interface InvoicesPageProps {
  onCreateInvoice?: (data: Omit<Invoice, 'id'>) => void | Promise<void>;
  onUpdateInvoice?: (updated: Invoice) => void | Promise<void>;
  onDeleteInvoice?: (id: string) => void | Promise<void>;
}

const invoiceStatusLabels: Record<string, string> = {
  DRAFT: 'ร่าง',
  PENDING: 'รอชำระ',
  SENT: 'ส่งแล้ว',
  PAID: 'ชำระแล้ว',
  PARTIAL: 'ชำระบางส่วน',
  OVERDUE: 'เกินกำหนด',
  CANCELLED: 'ยกเลิก',
};

const getInvoiceStatusLabel = (status: string): string => {
  return invoiceStatusLabels[status] || status;
};

const InvoicesPage: React.FC<InvoicesPageProps> = ({
  onCreateInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
}) => {
  const { invoices, customers, fetchData } = useData();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchData(['invoices', 'customers', 'quotations']);
      } catch (error) {
        console.error('Failed to fetch invoice data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const [invoicePage, setInvoicePage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceItemsPerPage, setInvoiceItemsPerPage] = useState(10);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<
    'ทั้งหมด' | InvoiceStatus
  >('ทั้งหมด');
  const [invoiceStartDate, setInvoiceStartDate] = useState('');
  const [invoiceEndDate, setInvoiceEndDate] = useState('');

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
  const [isInvoiceEditModalOpen, setIsInvoiceEditModalOpen] = useState(false);
  const [isInvoiceDeleteModalOpen, setIsInvoiceDeleteModalOpen] =
    useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [invoiceInitialValues, setInvoiceInitialValues] = useState<
    Partial<Invoice> | undefined
  >(undefined);

  const [openInvoiceDropdownId, setOpenInvoiceDropdownId] = useState<
    string | null
  >(null);
  const [invoiceDropdownPosition, setInvoiceDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  const invoiceData = invoices || [];

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearchQuery.trim().toLowerCase();
    const start = invoiceStartDate ? new Date(invoiceStartDate) : null;
    const end = invoiceEndDate ? new Date(invoiceEndDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const custPhoneMap = new Map(
      (customers || []).map((c) => [c.id, [c.primary_phone].filter(Boolean).join('')])
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
      result = result.filter((i) => i.status === invoiceStatusFilter);
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

  const totalInvoiceItems = filteredInvoices.length;
  const paginatedInvoices = useMemo(
    () =>
      filteredInvoices.slice(
        (invoicePage - 1) * invoiceItemsPerPage,
        invoicePage * invoiceItemsPerPage
      ),
    [filteredInvoices, invoicePage, invoiceItemsPerPage]
  );

  const invoiceStats = useMemo(() => {
    const total = invoiceData.length;
    const pending = invoiceData.filter(
      (i) => i.status === InvoiceStatus.PENDING
    ).length;
    const paid = invoiceData.filter(
      (i) => i.status === InvoiceStatus.PAID
    ).length;
    const overdue = invoiceData.filter(
      (i) => i.status === InvoiceStatus.OVERDUE
    ).length;
    const totalValue = invoiceData.reduce(
      (sum, i) => sum + (Number(i.total) || 0),
      0
    );
    const pendingValue = invoiceData
      .filter(
        (i) =>
          (i.status === InvoiceStatus.PENDING ||
          i.status === InvoiceStatus.OVERDUE) &&
          !(i as any).carried_over_to_id
      )
      .reduce((sum, i) => sum + ((Number(i.total) || 0) - (Number((i as any).paid_amount) || 0)), 0);

    return { total, pending, paid, overdue, totalValue, pendingValue };
  }, [invoiceData]);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openInvoiceDropdownId]);

  const handleInvoiceItemsPerPageChange = (size: number) => {
    setInvoiceItemsPerPage(size);
    setInvoicePage(1);
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

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceModalOpen(true);
    setOpenInvoiceDropdownId(null);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceEditModalOpen(true);
    setOpenInvoiceDropdownId(null);
  };

  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const handleViewPdf = async (invoice: Invoice) => {
    setPdfLoadingId(invoice.id);
    try {
      const blob = await InvoiceApi.exportPdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to view PDF', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการเปิด PDF' });
    } finally {
      setPdfLoadingId(null);
    }
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">ใบแจ้งหนี้</h1>
          <p className="mt-1 text-slate-600">จัดการใบแจ้งหนี้ทั้งหมด</p>
        </div>
        <Button
          onClick={() => {
            setInvoiceInitialValues(undefined);
            setIsAddInvoiceModalOpen(true);
          }}
        >
          <PlusIcon className="h-5 w-5" />
          สร้างใบแจ้งหนี้
        </Button>
      </div>

      {/* Invoice Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <DocumentTextIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">ทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-800">
                {invoiceStats.total}
              </p>
            </div>
          </div>
        </Card>
        <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <ClockIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-amber-600 font-medium">รอชำระ</p>
              <p className="text-2xl font-bold text-amber-800">
                {invoiceStats.pending}
              </p>
            </div>
          </div>
        </Card>
        <Card className="!p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-red-600 font-medium">เกินกำหนด</p>
              <p className="text-2xl font-bold text-red-800">
                {invoiceStats.overdue}
              </p>
            </div>
          </div>
        </Card>
        <Card className="!p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <CurrencyDollarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">ยอดค้างชำระ</p>
              <p className="text-lg font-bold text-purple-800">
                ฿
                {invoiceStats.pendingValue.toLocaleString('th-TH', {
                  minimumFractionDigits: 0,
                })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card
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
              <DatePicker selected={invoiceStartDate ? new Date(invoiceStartDate) : null} onChange={(date: Date | null) => setInvoiceStartDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="เริ่มต้น" isClearable className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-40" />
              <span className="text-slate-400">-</span>
              <DatePicker selected={invoiceEndDate ? new Date(invoiceEndDate) : null} onChange={(date: Date | null) => setInvoiceEndDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="สิ้นสุด" isClearable className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-40" />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={invoiceStatusFilter}
                onChange={(e) => {
                  const v = e.target.value as 'ทั้งหมด' | InvoiceStatus;
                  setInvoiceStatusFilter(v);
                  setInvoicePage(1);
                }}
              >
                <option value="ทั้งหมด">ทั้งหมด</option>
                <option value="DRAFT">ร่าง</option>
                <option value="PENDING">รอชำระ</option>
                <option value="SENT">ส่งแล้ว</option>
                <option value="PAID">ชำระแล้ว</option>
                <option value="PARTIAL">ชำระบางส่วน</option>
                <option value="OVERDUE">เกินกำหนด</option>
                <option value="CANCELLED">ยกเลิก</option>
              </Select>
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  ลำดับ
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  เลขที่ใบแจ้งหนี้
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  ลูกค้า
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  เบอร์โทร
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  วันครบกำหนด
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  สถานะ
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  ยอดรวม
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      {/* อย่าลืมตรวจสอบว่าคุณมีการ import LoadingIcon มาใช้ในไฟล์นี้แล้วหรือยัง */}
                      <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                      <p className="text-base font-medium">กำลังโหลดข้อมูลใบแจ้งหนี้...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center text-slate-400">
                      <DocumentTextIcon className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-lg font-medium">ไม่พบข้อมูลใบแจ้งหนี้</p>
                      <p className="text-sm mt-1">
                        ลองปรับตัวกรองหรือสร้างใบแจ้งหนี้ใหม่
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((i, index) => {
                  const customer =
                    i.customer || customers?.find((c) => c.id === i.customer_id);
                  return (
                    <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {(invoicePage - 1) * invoiceItemsPerPage + index + 1}
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-medium text-primary hover:underline cursor-pointer"
                        onClick={() => {
                          setSelectedInvoice(i);
                          setIsInvoiceModalOpen(true);
                        }}
                      >
                        {i.code || i.id}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                        {customer
                          ? `${customer.first_name} ${customer.last_name || ''}`.trim()
                          : i.customer_name || 'Unknown'}
                        {i.term && (
                          <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            งวดที่ {i.term}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatPhoneNumber(customer?.primary_phone)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatThaiDate(i.due_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        ฿
                        {Number(i.total).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button
                            variant="primary"
                            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white flex flex-row items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-md transition-all whitespace-nowrap min-w-[100px]"
                            onClick={() => handleViewPdf(i)}
                            disabled={pdfLoadingId === i.id}
                            title="ดู PDF"
                          >
                            {pdfLoadingId === i.id ? (
                              <span className="flex items-center gap-2">
                                <LoadingIcon className="w-3.5 h-3.5 animate-spin shrink-0 text-white" />
                                <span>กำลังโหลด...</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <EyeIcon className="w-3.5 h-3.5 shrink-0" />
                                <span>ดู PDF</span>
                              </span>
                            )}
                          </Button>
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
                    </tr>
                  );
                })
              )}
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

      {openInvoiceDropdownId && invoiceDropdownPosition && (
        <div
          ref={invoiceDropdownRef}
          style={{
            position: 'absolute',
            top: `${invoiceDropdownPosition.top}px`,
            left: `${invoiceDropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-48 rounded-xl shadow-xl bg-white ring-1 ring-black/5 focus:outline-none z-50 border border-slate-100 overflow-hidden"
        >
          <div className="py-1">
            <button
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
              onClick={() => handleViewInvoice(selectedInvoice!)}
            >
              <EyeIcon className="w-4 h-4 text-slate-400" /> ดูรายละเอียด
            </button>
            <button
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
              onClick={() => handleEditInvoice(selectedInvoice!)}
            >
              <PencilIcon className="w-4 h-4 text-slate-400" /> แก้ไข
            </button>
            <hr className="my-1 border-slate-100" />
            <button
              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
              onClick={() => handleDeleteInvoice(selectedInvoice!)}
            >
              <TrashIcon className="w-4 h-4 text-red-500" /> ลบ
            </button>
          </div>
        </div>
      )}

      {/* Invoice Modals */}
      <InvoiceModal
        isOpen={isAddInvoiceModalOpen}
        onClose={() => setIsAddInvoiceModalOpen(false)}
        mode='create'
        initialValues={invoiceInitialValues}
        onSubmit={async (data) => {
          if (onCreateInvoice) {
            await onCreateInvoice(data);
            setIsAddInvoiceModalOpen(false);
          }
        }}
      />
      
      <InvoiceModal
        isOpen={isInvoiceEditModalOpen}
        onClose={() => setIsInvoiceEditModalOpen(false)}
        mode="edit"
        initialValues={selectedInvoice}
        onSubmit={async (data) => {
          if (onUpdateInvoice) {
            await onUpdateInvoice({ ...selectedInvoice, ...data });
            setIsInvoiceEditModalOpen(false);
          }
        }}
      />

      <ConfirmationModal
        isOpen={isInvoiceDeleteModalOpen}
        onClose={() => setIsInvoiceDeleteModalOpen(false)}
        onConfirm={confirmDeleteInvoice}
        title="ยืนยันการลบใบแจ้งหนี้"
        message={`คุณต้องการลบใบแจ้งหนี้ ${invoiceToDelete?.id} ใช่หรือไม่?`}
        confirmButtonText="ลบใบแจ้งหนี้"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

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
                <div className="text-sm text-slate-600">เบอร์โทรศัพท์</div>
                <div className="text-sm text-slate-800">
                  {(() => {
                    const customer = customers?.find(
                      (c) => c.id === selectedInvoice.customer_id
                    );
                    return customer?.primary_phone
                      ? formatPhoneNumber(customer.primary_phone)
                      : '-';
                  })()}
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
    </div>
  );
};

export default InvoicesPage;
