import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Select, Input } from '../../components/common/FormControls';
import { formatThaiDate } from '../../utils/date';
import { MagnifyingGlassIcon, CalendarIcon, LoadingIcon } from '../../assets/icons/Icons';
import { NotificationApi } from '../../api/notification';
import { ContractApi } from '../../api/contract';
import { ServiceReportApi } from '../../api/service-report';
import { Pagination } from '../../components/common/Pagination';
import DatePicker from '@/src/components/common/BuddhistDatePicker';

interface NotificationsProps {}

const Notifications: React.FC<NotificationsProps> = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'ทั้งหมด' | 'ใกล้หมดสัญญา' | 'ใกล้กำหนดตรวจ' | 'ค้างชำระ'
  >('ทั้งหมด');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('ทั้งหมด');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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

  const handleOpenContractPdf = async (contractUuid: string) => {
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

  const handleOpenServiceReportPdf = async (reportId: string) => {
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

  // Debounce search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, startDate, endDate, invoiceStatus]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await NotificationApi.getDashboardData({
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch || undefined,
          filter_type: filterType !== 'ทั้งหมด' ? filterType : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          invoice_status: invoiceStatus !== 'ทั้งหมด' ? invoiceStatus : undefined,
        });

        const payload = res?.data || res;
        const items = payload?.items || payload?.data || (Array.isArray(payload) ? payload : []);
        setData(items);
        setTotalItems(payload?.meta?.total || items.length);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, itemsPerPage, debouncedSearch, filterType, startDate, endDate, invoiceStatus]);

  const filteredData = useMemo(() => {
    return data.map((item) => ({
      contractUuid: item.contract_id,
      contractId: item.contract_code || item.contract_id,
      customerName: item.customer_name,
      nickname: item.nickname || '-',
      address: item.address,
      phone: item.phone || item.primary_phone || '-',
      contractDetails: item.contract_details,
      durationYears: item.duration_years,
      total_visits: item.total_visits,
      startDate: item.start_date,
      endDate: item.end_date,
      buildingType: item.building_type || 'บ้านเดี่ยว',
      price: Number(item.price) || 0,
      installment: item.installment,
      invoiceAmount: Number(item.invoice_amount) || 0,
      invoiceStatus: item.invoice_status,
      invoiceDueDate: item.invoice_due_date,
      paymentMethod: item.payment_method || '-',
      amountPaid: Number(item.amount_paid) || 0,
      paidDate: item.paid_date || '-',
      visitNumber: Number(item.visit_number) || 0,
      lastServiceDate: item.last_service_date || '-',
      lastServiceReportId: item.last_service_report_id || null,
      nextServiceDate: item.next_service_date
        ? new Date(item.next_service_date)
        : new Date(),
      nextServiceDisplay: item.next_service_date,
      customerAppointmentDate: item.customer_appointment_date || '-',
      daysRemaining: Number(item.days_remaining) || 0,
    }));
  }, [data]);

  return (
    <div className="flex-1 flex flex-col">
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          การแจ้งเตือนและนัดหมาย
        </h1>
        <p className="text-slate-600 mt-1">
          ติดตามสถานะสัญญา การชำระเงิน และรอบบริการ
        </p>
      </div>

      <Card className="!p-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-sm">
            <Input
              type="search"
              placeholder="ค้นหา (สัญญา, รหัส, ชื่อ, โทร)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="w-auto"
          >
            <option value="ทั้งหมด">ประเภท: ทั้งหมด</option>
            <option value="ใกล้หมดสัญญา">ใกล้หมดสัญญา</option>
            <option value="ใกล้กำหนดตรวจ">ใกล้กำหนดตรวจ</option>
            <option value="ค้างชำระ">ค้างชำระ</option>
          </Select>
          <div className="flex items-center gap-2">
            <DatePicker selected={startDate ? new Date(startDate) : null} onChange={(date: Date | null) => setStartDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="เริ่มต้น" isClearable className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-32 sm:w-36" />
            <span className="text-slate-400">-</span>
            <DatePicker selected={endDate ? new Date(endDate) : null} onChange={(date: Date | null) => setEndDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="สิ้นสุด" isClearable className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-32 sm:w-36" />
          </div>
          <Select
            value={invoiceStatus}
            onChange={(e) => setInvoiceStatus(e.target.value)}
            className="w-auto"
          >
            <option value="ทั้งหมด">Invoice: ทั้งหมด</option>
            <option value="PAID">ชำระแล้ว</option>
            <option value="PENDING">รอชำระ</option>
            <option value="OVERDUE">เกินกำหนด</option>
            <option value="DRAFT">ร่าง</option>
            <option value="SENT">ส่งแล้ว</option>
          </Select>
        </div>
      </Card>

      <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
            <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
            <p className="text-base font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
            <CalendarIcon className="h-12 w-12 mb-3" />
            <p className="text-base font-medium text-slate-500">ไม่พบข้อมูลการแจ้งเตือน</p>
            <p className="text-sm mt-1">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
          </div>
        ) : (
        <>
        <div className="overflow-x-auto border-b border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap sticky left-0 z-20 bg-slate-50 w-16">
                  ลำดับ
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap sticky left-16 z-20 bg-slate-50">
                  เลขที่สัญญา
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap">
                  ชื่อ-นามสกุล ลูกค้า
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 min-w-[300px] md:min-w-[400px]">
                  ที่อยู่/เบอร์โทร
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">
                  เหลือ (วัน)
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">
                  เข้าตรวจล่าสุด
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">
                  เข้าตรวจครั้งถัดไป
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">
                  วันที่ลูกค้านัดล่วงหน้า
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap">
                  เริ่มสัญญา
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap">
                  หมดสัญญา
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">
                  ครั้งที่ / ทั้งหมด
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap">
                  ราคา
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-red-50">
                  งวดที่
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-red-50">
                  จำนวนเงิน (Invoice)
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-red-50">
                  สถานะ (Invoice)
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-red-50">
                  กำหนดชำระ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.map((row, index) => {
                const isExpired = row.daysRemaining < 0;
                const stickyBg = isExpired ? 'bg-red-200' : 'bg-white';
                const greenBg = isExpired ? 'bg-red-200' : 'bg-green-50/50';
                const redBg = isExpired ? 'bg-red-200' : 'bg-red-50/50';
                return (
                  <tr
                    key={row.contractId}
                    className={`transition-colors ${
                      isExpired
                        ? 'bg-red-200 hover:bg-red-300'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className={`px-3 py-3 whitespace-nowrap text-center align-middle text-slate-500 sticky left-0 z-10 w-16 ${stickyBg}`}>
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-center align-middle font-medium text-green-600 sticky left-16 z-10 ${stickyBg}`}>
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
                        {row.contractId}
                      </button>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center align-middle font-medium text-slate-800">
                      {row.customerName}
                    </td>
                    <td className="px-3 py-3 text-center align-middle text-slate-600 min-w-[300px] md:min-w-[400px]">
                      <div className="leading-relaxed">
                        {row.address}
                      </div>
                      <div className="text-slate-400 mt-1">{row.phone}</div>
                    </td>

                    {/* 🟢 Green Section: Service Info */}
                    <td className={`px-3 py-3 whitespace-nowrap text-center align-middle font-bold ${greenBg}`}>
                      <span
                        className={
                          row.daysRemaining < 30
                            ? 'text-red-600'
                            : 'text-green-600'
                        }
                      >
                        {row.daysRemaining}
                      </span>
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-center align-middle text-slate-600 ${greenBg}`}>
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
                    <td className={`px-3 py-3 whitespace-nowrap text-center align-middle text-slate-600 ${greenBg}`}>
                      {(() => {
                        const display = row.nextServiceDisplay;
                        if (display) {
                          const d = new Date(display);
                          if (
                            !isNaN(d.getTime()) &&
                            String(display).includes('-')
                          ) {
                            return formatThaiDate(display);
                          }
                          return display;
                        }
                        return formatThaiDate(
                          row.nextServiceDate.toISOString()
                        );
                      })()}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-center align-middle text-slate-600 ${greenBg}`}>
                      {row.customerAppointmentDate !== '-'
                        ? formatThaiDate(row.customerAppointmentDate)
                        : '-'}
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap text-center align-middle text-slate-600">
                      {formatThaiDate(row.startDate)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center align-middle text-slate-600">
                      {formatThaiDate(row.endDate)}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-center align-middle font-medium text-slate-800 ${greenBg}`}>
                      {row.visitNumber > 0 ? row.visitNumber : '-'}{' '}
                      <span className="text-slate-400 mx-1">/</span>{' '}
                      {row.total_visits || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center align-middle font-medium text-slate-800">
                      {row.price.toLocaleString()}
                    </td>

                    {/* 🔴 Red Section: Invoice Info */}
                    <td className={`px-3 py-3 whitespace-nowrap text-center align-middle text-slate-600 ${redBg}`}>
                      {row.installment}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-center align-middle text-slate-600 ${redBg}`}>
                      {row.invoiceAmount > 0
                        ? row.invoiceAmount.toLocaleString()
                        : '-'}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-center align-middle ${redBg}`}>
                      {row.invoiceStatus !== '-' ? (
                        <StatusBadge status={row.invoiceStatus} />
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap text-center align-middle text-slate-600 ${redBg}`}>
                      {row.invoiceDueDate !== '-'
                        ? formatThaiDate(row.invoiceDueDate)
                        : '-'}
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
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
          />
        </div>
        </>
        )}
      </div>
    </div>
    </div>
  );
};

export default Notifications;
