import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../../components/common/Pagination';
import { LoadingIcon, CalendarIcon } from '../../assets/icons/Icons';
import { ContractApi } from '../../api/contract';
import { ServiceReportApi } from '../../api/service-report';
import { formatThaiDate } from '../../utils/date';
import {
  InvoiceStatus,
  InvoiceStatusLabel,
  InvoiceStatusColor,
} from '../../types/enums/invoice';

// Invoice-context badge — the generic StatusBadge maps PENDING → "รออนุมัติ"
// (job/contract semantics), but for invoices PENDING means "รอชำระ".
// Falls back to the raw string for backend literals like "รอออกใบแจ้งหนี้".
const InvoiceStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const key = status as InvoiceStatus;
  const label = InvoiceStatusLabel[key] ?? status;
  const color = InvoiceStatusColor[key] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
};

export interface NotificationRow {
  contractUuid: string | null;
  contractCode: string;
  customerId: string | null;
  customerName: string;
  address: string;
  phone: string;
  contractDaysRemaining: number | null;
  lastServiceDate: string;
  lastServiceReportId: string | null;
  nextServiceDate: string | Date | null;
  nextServiceDisplay?: string | null;
  customerAppointmentDate: string;
  startDate: string;
  endDate: string;
  visitNumber: number;
  totalVisits: number | string;
  price: number;
  installment: string | number;
  totalInstallments?: number | null;
  invoiceAmount: number;
  invoiceStatus: string;
  invoiceDueDate: string;
}

interface NotificationsTableProps {
  rows: NotificationRow[];
  loading: boolean;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (size: number) => void;
  emptyTitle?: string;
  /**
   * คำนวณว่าแถวนี้ "เลย/พ้นกำหนด" → ระบายแดง
   * ค่า default: contractDaysRemaining < 0
   */
  isExpiredRow?: (row: NotificationRow) => boolean;
}

export const isContractExpired = (row: NotificationRow) =>
  row.contractDaysRemaining !== null && row.contractDaysRemaining < 0;

export const isVisitOverdue = (row: NotificationRow) =>
  row.contractDaysRemaining !== null && row.contractDaysRemaining < 0;

const renderNextServiceDisplay = (row: NotificationRow) => {
  const display = row.nextServiceDisplay ?? row.nextServiceDate;
  if (!display) return '-';
  const d = new Date(display as string);
  if (!isNaN(d.getTime()) && String(display).includes('-')) {
    return formatThaiDate(display as string);
  }
  return String(display);
};

const NotificationsTable: React.FC<NotificationsTableProps> = ({
  rows,
  loading,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  emptyTitle = 'ไม่พบข้อมูล',
  isExpiredRow = isContractExpired,
}) => {
  const navigate = useNavigate();
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const openBlobInNewTab = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleOpenContractPdf = async (contractUuid: string | null) => {
    if (!contractUuid || pdfLoadingId) return;
    setPdfLoadingId(`contract:${contractUuid}`);
    try {
      const blob = await ContractApi.getPdf(contractUuid);
      openBlobInNewTab(blob);
    } catch (err) {
      console.error('Failed to load contract PDF:', err);
      alert('ไม่สามารถโหลด PDF สัญญาได้ กรุณาลองใหม่');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleOpenServiceReportPdf = async (reportId: string | null) => {
    if (!reportId || pdfLoadingId) return;
    setPdfLoadingId(`report:${reportId}`);
    try {
      const blob = await ServiceReportApi.getServiceReportPdfById(reportId);
      openBlobInNewTab(blob);
    } catch (err) {
      console.error('Failed to load service report PDF:', err);
      alert('ไม่สามารถโหลด Service Report ได้ กรุณาลองใหม่');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleCreateAppointment = (customerId: string | null, contractUuid: string | null) => {
    if (!customerId) return;
    const params = new URLSearchParams({ openCreateModal: '1', customerId });
    if (contractUuid) params.set('contractId', contractUuid);
    navigate(`/field-operations?${params.toString()}`);
  };

  return (
    <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
          <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
          <p className="text-base font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
          <CalendarIcon className="h-12 w-12 mb-3" />
          <p className="text-base font-medium text-slate-500">{emptyTitle}</p>
          <p className="text-sm mt-1">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-x-auto overflow-y-auto border-b border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap sticky left-0 z-20 bg-slate-50 min-w-[64px] w-16">ลำดับ</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap sticky left-[64px] z-20 bg-slate-50 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]">เลขที่สัญญา</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">ชื่อ-นามสกุล ลูกค้า</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 min-w-[300px] md:min-w-[400px]">ที่อยู่/เบอร์โทร</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">เหลือ (วัน)</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap bg-green-50">เข้าตรวจล่าสุด</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap bg-green-50">เข้าตรวจครั้งถัดไป</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap bg-green-50">วันที่ลูกค้านัดล่วงหน้า</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">เริ่มสัญญา</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">หมดสัญญา</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">ครั้งที่ / ทั้งหมด</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">ราคา</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-red-50">งวดที่ / ทั้งหมด</th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap bg-red-50">จำนวนเงิน (Invoice)</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-red-50">สถานะ (Invoice)</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap bg-red-50">กำหนดชำระ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row, index) => {
                  const expired = isExpiredRow(row);
                  const cellTransition = 'transition-colors duration-200 ease-out';
                  const stickyBg = expired
                    ? `bg-red-200 group-hover:bg-red-300 ${cellTransition}`
                    : `bg-white group-hover:bg-slate-50 ${cellTransition}`;
                  const greenBg = expired
                    ? `bg-red-200 group-hover:bg-red-300 ${cellTransition}`
                    : `bg-green-50/50 group-hover:bg-green-100/60 ${cellTransition}`;
                  const yellowBg = expired
                    ? `bg-red-200 group-hover:bg-red-300 ${cellTransition}`
                    : `bg-yellow-50 group-hover:bg-yellow-100 ${cellTransition}`;

                  return (
                    <tr
                      key={`${row.contractCode}-${index}`}
                      className={`group border-b border-slate-200 transition-colors duration-200 ease-out ${
                        expired ? 'bg-red-200 hover:bg-red-300' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className={`px-3 py-3 whitespace-nowrap text-center align-top text-slate-500 sticky left-0 z-10 min-w-[64px] w-16 ${stickyBg}`}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className={`px-3 py-3 whitespace-nowrap text-left align-top font-medium text-green-600 sticky left-[64px] z-10 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] ${stickyBg}`}>
                        <button
                          type="button"
                          onClick={() => handleOpenContractPdf(row.contractUuid)}
                          disabled={!row.contractUuid || pdfLoadingId === `contract:${row.contractUuid}`}
                          className="inline-flex items-center gap-1.5 hover:underline hover:text-green-700 disabled:opacity-60 disabled:cursor-wait"
                          title="คลิกเพื่อดูสัญญา PDF"
                        >
                          {pdfLoadingId === `contract:${row.contractUuid}` && (
                            <LoadingIcon className="w-4 h-4 animate-spin" />
                          )}
                          {row.contractCode}
                        </button>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left align-top font-medium text-slate-800">
                        {row.customerId ? (
                          <button
                            type="button"
                            onClick={() => handleCreateAppointment(row.customerId, row.contractUuid)}
                            className="hover:underline hover:text-primary"
                            title="คลิกเพื่อสร้างนัดหมายให้ลูกค้านี้"
                          >
                            {row.customerName}
                          </button>
                        ) : (
                          row.customerName
                        )}
                      </td>
                      <td className="px-3 py-3 text-left align-top text-slate-600 min-w-[300px] md:min-w-[400px]">
                        <div className="leading-relaxed">{row.address}</div>
                        <div className="text-slate-400 mt-1">{row.phone}</div>
                      </td>

                      {/* Green Section */}
                      <td className={`px-3 py-3 whitespace-nowrap text-center align-top font-bold ${greenBg}`}>
                        {row.contractDaysRemaining === null ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span className={row.contractDaysRemaining < 30 ? 'text-red-600' : 'text-green-600'}>
                            {row.contractDaysRemaining}
                          </span>
                        )}
                      </td>
                      <td className={`px-3 py-3 whitespace-nowrap text-left align-top text-slate-600 ${greenBg}`}>
                        {row.lastServiceDate !== '-' ? (
                          row.lastServiceReportId ? (
                            <button
                              type="button"
                              onClick={() => handleOpenServiceReportPdf(row.lastServiceReportId)}
                              disabled={pdfLoadingId === `report:${row.lastServiceReportId}`}
                              className="inline-flex items-center gap-1.5 text-green-600 hover:underline hover:text-green-700 disabled:opacity-60 disabled:cursor-wait"
                              title="คลิกเพื่อดู Service Report PDF"
                            >
                              {pdfLoadingId === `report:${row.lastServiceReportId}` && (
                                <LoadingIcon className="w-4 h-4 animate-spin" />
                              )}
                              {formatThaiDate(row.lastServiceDate)}
                            </button>
                          ) : (
                            formatThaiDate(row.lastServiceDate)
                          )
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className={`px-3 py-3 whitespace-nowrap text-left align-top text-slate-600 ${greenBg}`}>
                        {renderNextServiceDisplay(row)}
                      </td>
                      <td className={`px-3 py-3 whitespace-nowrap text-left align-top text-slate-600 ${greenBg}`}>
                        {row.customerAppointmentDate !== '-' ? formatThaiDate(row.customerAppointmentDate) : '-'}
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap text-left align-top text-slate-600">
                        {row.startDate ? formatThaiDate(row.startDate) : '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-left align-top text-slate-600">
                        {row.endDate ? formatThaiDate(row.endDate) : '-'}
                      </td>
                      <td className={`px-3 py-3 whitespace-nowrap text-center align-top font-medium text-slate-800 ${greenBg}`}>
                        {row.visitNumber > 0 ? row.visitNumber : '-'}
                        <span className="text-slate-400 mx-1">/</span>
                        {row.totalVisits || '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right align-top font-medium text-slate-800">
                        {row.price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                      </td>

                      {/* Invoice Section */}
                      <td className={`px-3 py-3 whitespace-nowrap text-center align-top text-slate-600 ${yellowBg}`}>
                        {row.installment}
                        {row.totalInstallments && row.totalInstallments > 0 && row.installment !== '-' && (
                          <>
                            <span className="text-slate-400 mx-1">/</span>
                            {row.totalInstallments}
                          </>
                        )}
                      </td>
                      <td className={`px-3 py-3 whitespace-nowrap text-right align-top text-slate-600 ${yellowBg}`}>
                        {row.invoiceAmount > 0
                          ? `${row.invoiceAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`
                          : '-'}
                      </td>
                      <td className={`px-3 py-3 whitespace-nowrap text-center align-top ${yellowBg}`}>
                        {row.invoiceStatus !== '-' ? <InvoiceStatusBadge status={row.invoiceStatus} /> : '-'}
                      </td>
                      <td className={`px-3 py-3 whitespace-nowrap text-left align-top text-slate-600 ${yellowBg}`}>
                        {row.invoiceDueDate !== '-' ? formatThaiDate(row.invoiceDueDate) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-auto border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={onPageChange}
              onItemsPerPageChange={onItemsPerPageChange}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationsTable;
