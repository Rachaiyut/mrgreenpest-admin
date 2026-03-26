import React, { useState, useMemo, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Card } from '../../components/common/Card';
import { TruncateText } from '../../components/common/TruncateText';
import { formatThaiDate } from '../../utils/date';
import { formatPhoneNumber } from '../../utils/format';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  ManageIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  LoadingIcon,
} from '../../assets/icons/Icons';
import { Pagination } from '../../components/common/Pagination';
import { Receipt, ReceiptStatus } from '../../types';
import { Input, Select, Button } from '../../components/common/FormControls';
import { Modal } from '../../components/common/Modal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { useData } from '../../contexts/DataContext';
import { ReceiptApi } from '../../api/receipt';
import { CustomerApi } from '../../api/customer';

const statusLabels: Record<ReceiptStatus, string> = {
  [ReceiptStatus.DRAFT]: 'ร่าง',
  [ReceiptStatus.ISSUED]: 'ออกเอกสารแล้ว',
  [ReceiptStatus.CANCELLED]: 'ยกเลิก',
  [ReceiptStatus.VOIDED]: 'โมฆะ',
};

interface ReceiptsPageProps {
  onUpdateReceipt?: (updated: Receipt) => void | Promise<void>;
  onDeleteReceipt?: (id: string) => void | Promise<void>;
}

const paymentMethodLabels: Record<string, string> = {
  TRANSFER: 'โอนเงิน',
  CASH: 'เงินสด',
  CHEQUE: 'เช็ค',
  CREDIT_CARD: 'บัตรเครดิต',
  QR_PAYMENT: 'QR Payment',
  INSTALLMENT: 'ผ่อนชำระ',
  DIVIDED: 'แบ่งชำระ',
};

const getPaymentMethodLabel = (method: string): string => {
  return paymentMethodLabels[method] || method;
};

const ReceiptsPage: React.FC<ReceiptsPageProps> = ({
  onUpdateReceipt,
  onDeleteReceipt,
}) => {
  const { invoices, customers, receipts, fetchData } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [receiptPage, setReceiptPage] = useState(1);
  const [receiptItemsPerPage, setReceiptItemsPerPage] = useState(10);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [receiptPaymentMethodFilter, setReceiptPaymentMethodFilter] = useState<
    'ทั้งหมด' | string
  >('ทั้งหมด');
  const [receiptStartDate, setReceiptStartDate] = useState('');
  const [receiptEndDate, setReceiptEndDate] = useState('');

  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isAddReceiptModalOpen, setIsAddReceiptModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<ReceiptStatus>(
    ReceiptStatus.DRAFT
  );

  const [openReceiptDropdownId, setOpenReceiptDropdownId] = useState<
    string | null
  >(null);
  const [receiptDropdownPosition, setReceiptDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const receiptDropdownRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Form State
  const [receiptFormInvoiceId, setReceiptFormInvoiceId] = useState('');
  const [receiptFormCustomerId, setReceiptFormCustomerId] = useState('');
  const [receiptFormCustomerName, setReceiptFormCustomerName] = useState('');
  const [receiptFormReceivedAt, setReceiptFormReceivedAt] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [receiptFormPaymentMethod, setReceiptFormPaymentMethod] =
    useState<string>('TRANSFER');
  const [receiptFormAmount, setReceiptFormAmount] = useState<number>(0);
  const [receiptFormPaymentReference, setReceiptFormPaymentReference] =
    useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchData(['receipts', 'customers', 'invoices']);
      } catch (error) {
        console.error('Failed to fetch receipt data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [receiptFormNotes, setReceiptFormNotes] = useState<string>('');

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

    const custPhoneMap = new Map(
      (customers || []).map((c) => [c.id, [c.primary_phone].filter(Boolean).join('')])
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

    // 3. Date Filter (using paidAt/receivedAt)
    if (start || end) {
      result = result.filter((item) => {
        const d = new Date(item.received_at || item.paid_at);
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

  const totalReceiptItems = filteredReceipts.length;
  const paginatedReceipts = useMemo(
    () =>
      filteredReceipts.slice(
        (receiptPage - 1) * receiptItemsPerPage,
        receiptPage * receiptItemsPerPage
      ),
    [filteredReceipts, receiptPage, receiptItemsPerPage]
  );

  const receiptStats = useMemo(() => {
    const total = receiptData.length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayReceipts = receiptData.filter((r) => {
      const receivedDate = (r.received_at || r.paid_at || '').slice(0, 10);
      return receivedDate === todayStr;
    });
    const todayCount = todayReceipts.length;
    const todayAmount = todayReceipts.reduce(
      (sum, r) => sum + (Number(r.amount) || 0),
      0
    );
    const totalAmount = receiptData.reduce(
      (sum, r) => sum + (Number(r.amount) || 0),
      0
    );

    return { total, todayCount, todayAmount, totalAmount };
  }, [receiptData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
  }, [openReceiptDropdownId]);

  const handleReceiptItemsPerPageChange = (size: number) => {
    setReceiptItemsPerPage(size);
    setReceiptPage(1);
  };

  const handleStatusClick = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setTargetStatus((receipt.status as ReceiptStatus) || ReceiptStatus.DRAFT);
    setIsStatusModalOpen(true);
    setOpenReceiptDropdownId(null);
  };

  const handleStatusConfirm = async () => {
    if (selectedReceipt && onUpdateReceipt) {
      try {
        await onUpdateReceipt({ ...selectedReceipt, status: targetStatus });
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    }
    setIsStatusModalOpen(false);
    setSelectedReceipt(null);
  };

  const handleDeleteClick = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsDeleteModalOpen(true);
    setOpenReceiptDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (selectedReceipt && onDeleteReceipt) {
      await onDeleteReceipt(selectedReceipt.id);
    }
    setIsDeleteModalOpen(false);
    setSelectedReceipt(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            ใบกำกับภาษี / ใบเสร็จรับเงิน
          </h1>
          <p className="mt-1 text-slate-600">
            จัดการใบกำกับภาษีและใบเสร็จรับเงิน
          </p>
        </div>
        <Button onClick={() => setIsAddReceiptModalOpen(true)}>
          <PlusIcon className="h-5 w-5" />
          สร้างเอกสาร
        </Button>
      </div>

      {/* Receipt Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <DocumentTextIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">ทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-800">
                {receiptStats.total}
              </p>
            </div>
          </div>
        </Card>
        <Card className="!p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">วันนี้</p>
              <p className="text-2xl font-bold text-green-800">
                {receiptStats.todayCount}
              </p>
            </div>
          </div>
        </Card>
        <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <CurrencyDollarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-emerald-600 font-medium">รับวันนี้</p>
              <p className="text-lg font-bold text-emerald-800">
                ฿
                {receiptStats.todayAmount.toLocaleString('th-TH', {
                  minimumFractionDigits: 0,
                })}
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
              <p className="text-sm text-purple-600 font-medium">รับทั้งหมด</p>
              <p className="text-lg font-bold text-purple-800">
                ฿
                {receiptStats.totalAmount.toLocaleString('th-TH', {
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
                value={receiptSearchQuery}
                onChange={(e) => {
                  setReceiptSearchQuery(e.target.value);
                  setReceiptPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <DatePicker selected={receiptStartDate ? new Date(receiptStartDate) : null} onChange={(date: Date | null) => setReceiptStartDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="เริ่มต้น" isClearable className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-full sm:w-40" />
              <span className="text-slate-400">-</span>
              <DatePicker selected={receiptEndDate ? new Date(receiptEndDate) : null} onChange={(date: Date | null) => setReceiptEndDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="สิ้นสุด" isClearable className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-full sm:w-40" />
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
                    {getPaymentMethodLabel(m)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  ลำดับ
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  เลขที่เอกสาร
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  อ้างอิงใบแจ้งหนี้
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  ลูกค้า
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  เบอร์โทร
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  วันที่ชำระ
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  วิธีชำระเงิน
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  จำนวนเงิน
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  จัดการ
                </th>                
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                      <p className="text-base font-medium">กำลังโหลดข้อมูลใบเสร็จรับเงิน...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedReceipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center text-slate-400">
                      <DocumentTextIcon className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-lg font-medium">ไม่พบข้อมูลใบเสร็จรับเงิน</p>
                      <p className="text-sm mt-1">
                        ลองปรับตัวกรองหรือสร้างเอกสารใหม่
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedReceipts.map((r, index) => {
                  const customer =
                    r.customer || customers?.find((c) => c.id === r.customer_id);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {(receiptPage - 1) * receiptItemsPerPage + index + 1}
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-medium text-primary hover:underline cursor-pointer"
                        onClick={() => {
                          setSelectedReceipt(r);
                          setIsReceiptModalOpen(true);
                        }}
                      >
                        {r.code || r.id}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-700">
                        {invoices?.find((i) => i.id === r.invoice_id)?.code || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                        <TruncateText text={r.customer_name || '-'} maxWidth={160} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatPhoneNumber(customer?.primary_phone || '-')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatThaiDate(r.received_at || r.paid_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {getPaymentMethodLabel(r.payment_method)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        ฿
                        {r.amount.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              isDownloading === r.id
                                ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (isDownloading === r.id) return;

                              try {
                                setIsDownloading(r.id);
                                const blob = await ReceiptApi.getPdfBlob(r.id);
                                const url = window.URL.createObjectURL(blob);
                                window.open(url, '_blank');
                              } catch (err) {
                                console.error('Failed to view PDF', err);
                                Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถดู PDF ได้' });
                              } finally {
                                setIsDownloading(null);
                              }
                            }}
                            disabled={isDownloading === r.id}
                          >
                            {isDownloading === r.id ? (
                              <LoadingIcon className="h-4 w-4 animate-spin" />
                            ) : (
                              <EyeIcon className="h-4 w-4" />
                            )}
                            {isDownloading === r.id ? 'กำลังโหลด...' : 'ดู PDF'}
                          </Button>
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
          currentPage={receiptPage}
          totalItems={totalReceiptItems}
          itemsPerPage={receiptItemsPerPage}
          onPageChange={setReceiptPage}
          onItemsPerPageChange={handleReceiptItemsPerPageChange}
        />
      </Card>

      {openReceiptDropdownId && receiptDropdownPosition && (
        <div
          ref={receiptDropdownRef}
          style={{
            position: 'absolute',
            top: `${receiptDropdownPosition.top}px`,
            left: `${receiptDropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-48 rounded-xl shadow-xl bg-white ring-1 ring-black/5 focus:outline-none z-50 border border-slate-100 overflow-hidden"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            <button
              onClick={() => {
                setIsReceiptModalOpen(true);
                setOpenReceiptDropdownId(null);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <EyeIcon className="w-4 h-4 text-slate-400" />
              ดูรายละเอียด
            </button>
            {onUpdateReceipt && selectedReceipt && (
              <button
                onClick={() => handleStatusClick(selectedReceipt)}
                className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
              >
                <CheckCircleIcon className="w-4 h-4 text-slate-400" />
                เปลี่ยนสถานะ
              </button>
            )}

            {selectedReceipt?.customer_id && (
              <button
                onClick={async () => {
                  if (!selectedReceipt?.customer_id) return;
                  try {
                    const response = await CustomerApi.generatePortalToken(selectedReceipt.customer_id);
                    const portalUrl = `${window.location.origin}/portal?token=${response.data.token}`;
                    await navigator.clipboard.writeText(portalUrl);
                    Swal.fire({ title: 'คัดลอกสำเร็จ!', text: 'คัดลอกลิงก์ Portal สำหรับลูกค้าเรียบร้อยแล้ว', icon: 'success', timer: 2000, timerProgressBar: true, confirmButtonColor: '#3085d6' });
                  } catch {
                    Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถสร้างลิงก์ Portal ได้', icon: 'error', confirmButtonColor: '#d33' });
                  }
                  setOpenReceiptDropdownId(null);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-3 transition-colors"
              >
                <DocumentTextIcon className="w-4 h-4 text-green-500" />
                ส่ง Link Portal ลูกค้า
              </button>
            )}

            {onDeleteReceipt && selectedReceipt && (
              <>
                <hr className="my-1 border-slate-100" />
                <button
                  onClick={() => handleDeleteClick(selectedReceipt)}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                >
                  <TrashIcon className="w-4 h-4 text-red-500" />
                  ลบ
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={isAddReceiptModalOpen}
        onClose={() => setIsAddReceiptModalOpen(false)}
        title="สร้างใบเสร็จรับเงิน"
        size="4xl"
        footer={
          <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-200">
            <Button
              onClick={() => setIsAddReceiptModalOpen(false)}
              className="px-6 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              variant="outline"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                const payload: Omit<Receipt, 'id'> = {
                  invoice_id: receiptFormInvoiceId || undefined,
                  customer_id: receiptFormCustomerId,
                  customer_name: receiptFormCustomerName,
                  received_at: receiptFormReceivedAt,
                  amount: receiptFormAmount,
                  payment_method: receiptFormPaymentMethod,
                  payment_reference: receiptFormPaymentReference || undefined,
                  notes: receiptFormNotes || undefined,
                };
                setIsAddReceiptModalOpen(false);
                setReceiptFormInvoiceId('');
                setReceiptFormCustomerId('');
                setReceiptFormCustomerName('');
                setReceiptFormReceivedAt(new Date().toISOString().slice(0, 10));
                setReceiptFormPaymentMethod('TRANSFER');
                setReceiptFormAmount(0);
                setReceiptFormPaymentReference('');
                setReceiptFormNotes('');
              }}
              className="px-6 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all"
              variant="primary"
            >
              บันทึก
            </Button>
          </div>
        }
      >
        <div className="space-y-8 p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">
                  ข้อมูลเอกสาร (Document Info)
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      ใบแจ้งหนี้ที่อ้างอิง (Reference Invoice)
                    </label>
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
                      className="w-full"
                    >
                      <option value="">-- เลือกใบแจ้งหนี้ (ถ้ามี) --</option>
                      {(invoices || []).map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.code || i.id} — {i.customer_name} (฿
                          {(i.total || 0).toLocaleString()})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      ลูกค้า (Customer) <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={receiptFormCustomerId}
                      onChange={(e) => {
                        const cust = customers?.find(
                          (c) => c.id === e.target.value
                        );
                        setReceiptFormCustomerId(e.target.value);
                        if (cust) {
                          setReceiptFormCustomerName(
                            `${cust.first_name} ${cust.last_name}`
                          );
                        }
                      }}
                      className="w-full"
                      disabled={!!receiptFormInvoiceId}
                    >
                      <option value="">-- เลือกลูกค้า --</option>
                      {(customers || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.first_name} {c.last_name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">
                  การชำระเงิน (Payment Details)
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        วันที่รับชำระ <span className="text-red-500">*</span>
                      </label>
                      <DatePicker selected={receiptFormReceivedAt ? new Date(receiptFormReceivedAt) : null} onChange={(date: Date | null) => setReceiptFormReceivedAt(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="dd/mm/yyyy" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        วิธีชำระเงิน
                      </label>
                      <Select
                        value={receiptFormPaymentMethod}
                        onChange={(e) =>
                          setReceiptFormPaymentMethod(e.target.value)
                        }
                        className="w-full"
                      >
                        <option value="TRANSFER">โอนเงิน</option>
                        <option value="CASH">เงินสด</option>
                        <option value="CHEQUE">เช็ค</option>
                        <option value="CREDIT_CARD">บัตรเครดิต</option>
                        <option value="QR_PAYMENT">QR Payment</option>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      เลขอ้างอิง (Reference No.)
                    </label>
                    <Input
                      type="text"
                      value={receiptFormPaymentReference}
                      onChange={(e) =>
                        setReceiptFormPaymentReference(e.target.value)
                      }
                      placeholder="เช่น เลขที่เช็ค, เลขที่สลิปโอนเงิน"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">
                  ยอดเงิน (Amount)
                </h3>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      จำนวนเงินที่ได้รับ (Amount Received)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                        ฿
                      </span>
                      <Input
                        type="number"
                        value={String(receiptFormAmount)}
                        onChange={(e) =>
                          setReceiptFormAmount(parseFloat(e.target.value) || 0)
                        }
                        step="0.01"
                        min="0"
                        className="w-full pl-8 text-lg font-bold text-slate-800"
                        disabled={!!receiptFormInvoiceId}
                      />
                    </div>
                  </div>

                  {receiptFormInvoiceId && (
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3" />
                      ยอดเงินถูกดึงมาจากใบแจ้งหนี้อัตโนมัติ
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">
                  หมายเหตุ (Notes)
                </h3>
                <textarea
                  value={receiptFormNotes}
                  onChange={(e) => setReceiptFormNotes(e.target.value)}
                  placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)..."
                  rows={4}
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 transition-all text-sm resize-none p-3"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title={
          selectedReceipt
            ? `รายละเอียดใบเสร็จรับเงิน ${selectedReceipt.code || selectedReceipt.id} `
            : 'รายละเอียดใบเสร็จรับเงิน'
        }
      >
        {selectedReceipt && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-600">เลขที่เอกสาร</div>
                <div className="text-sm text-slate-800">
                  {selectedReceipt.code || selectedReceipt.id}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">ลูกค้า</div>
                <div className="text-sm text-slate-800">
                  {selectedReceipt.customer_name}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">วันที่รับชำระ</div>
                <div className="text-sm text-slate-800">
                  {formatThaiDate(selectedReceipt.received_at)}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">วิธีชำระ</div>
                <div className="text-sm text-slate-800">
                  {getPaymentMethodLabel(selectedReceipt.payment_method)}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">ยอดเงิน</div>
                <div className="text-sm text-slate-800">
                  ฿{selectedReceipt.amount.toLocaleString()}
                </div>
              </div>
              {selectedReceipt.invoice_id && (
                <div>
                  <div className="text-sm text-slate-600">
                    อ้างอิงใบแจ้งหนี้
                  </div>
                  <div className="text-sm text-slate-800">
                    {selectedReceipt.invoice_id}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ลบใบเสร็จรับเงิน"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบใบเสร็จรับเงิน ${selectedReceipt?.code || selectedReceipt?.id}?`}
        confirmButtonText="ลบ"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      {/* Status Update Modal */}
      <ConfirmationModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleStatusConfirm}
        title="อัปเดตสถานะ"
        message={
          <div className="space-y-4 text-left">
            <p>
              กรุณาเลือกสถานะใหม่สำหรับใบเสร็จรับเงิน{' '}
              <strong>{selectedReceipt?.code || selectedReceipt?.id}</strong>
            </p>
            <div className="mt-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                สถานะ
              </label>
              <Select
                value={targetStatus}
                onChange={(e) =>
                  setTargetStatus(e.target.value as ReceiptStatus)
                }
                className="w-full"
              >
                {Object.values(ReceiptStatus).map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
        confirmButtonText="บันทึก"
        confirmButtonClass="bg-primary hover:bg-primary/90"
      />
    </div>
  );
};

export default ReceiptsPage;
