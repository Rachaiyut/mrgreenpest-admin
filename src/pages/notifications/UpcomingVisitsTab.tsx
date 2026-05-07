import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/common/Card';
import { Input, Select } from '../../components/common/FormControls';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingIcon, CalendarIcon } from '../../assets/icons/Icons';
import { Pagination } from '../../components/common/Pagination';
import { NotificationApi } from '../../api/notification';
import { formatThaiDate } from '../../utils/date';

type BucketKey = 'all' | 'overdue' | 'd7' | 'd15' | 'd30';

const FILTER_TYPE_BY_BUCKET: Record<BucketKey, string> = {
  all: 'นัดหมายเข้าบริการ',
  overdue: 'นัดหมายเข้าบริการ_เกิน',
  d7: 'นัดหมายเข้าบริการ_7',
  d15: 'นัดหมายเข้าบริการ_15',
  d30: 'นัดหมายเข้าบริการ_30',
};

const daysBetween = (target: string | Date | null | undefined): number | null => {
  if (!target) return null;
  const end = new Date(target);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const UpcomingVisitsTab: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState<BucketKey>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [bucketFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    NotificationApi.getDashboardData({
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearch || undefined,
      filter_type: FILTER_TYPE_BY_BUCKET[bucketFilter],
    })
      .then((res: any) => {
        if (cancelled) return;
        const payload = res?.data || res;
        const items = payload?.items || payload?.data || (Array.isArray(payload) ? payload : []);
        setData(items);
        setTotalItems(payload?.meta?.total || items.length);
      })
      .catch((err) => console.error('Failed to fetch upcoming visits', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentPage, itemsPerPage, debouncedSearch, bucketFilter]);

  const rows = useMemo(() => {
    return data.map((item) => ({
      contractCode: item.contract_code || item.contract_id || '-',
      customerName: item.customer_name || '-',
      address: item.address || '-',
      phone: item.phone || item.primary_phone || '-',
      contractDaysRemaining: item.days_remaining === null || item.days_remaining === undefined
        ? null
        : Number(item.days_remaining),
      lastServiceDate: item.last_service_date || '-',
      nextServiceDate: item.next_service_date || null,
      customerAppointmentDate: item.customer_appointment_date || '-',
      startDate: item.start_date,
      endDate: item.end_date,
      visitNumber: Number(item.visit_number) || 0,
      totalVisits: item.total_visits || 0,
      price: Number(item.price) || 0,
      installment: item.installment || '-',
      invoiceAmount: Number(item.invoice_amount) || 0,
      invoiceStatus: item.invoice_status || '-',
      invoiceDueDate: item.invoice_due_date || '-',
    }));
  }, [data]);

  return (
    <>
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
            value={bucketFilter}
            onChange={(e) => setBucketFilter(e.target.value as BucketKey)}
            className="w-auto"
          >
            <option value="all">ทั้งหมด</option>
            <option value="overdue">เกินกำหนดแล้ว</option>
            <option value="d7">ใกล้ถึงภายใน 7 วัน</option>
            <option value="d15">ใกล้ถึงภายใน 15 วัน</option>
            <option value="d30">ใกล้ถึงภายใน 30 วัน</option>
          </Select>
        </div>
      </Card>

      <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
            <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
            <p className="text-base font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
            <CalendarIcon className="h-12 w-12 mb-3" />
            <p className="text-base font-medium text-slate-500">ไม่พบข้อมูลนัดหมายเข้าบริการ</p>
            <p className="text-sm mt-1">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-x-auto overflow-y-auto border-b border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap sticky left-0 z-20 bg-slate-50 w-16">ลำดับ</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap sticky left-16 z-20 bg-slate-50">เลขที่สัญญา</th>
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
                    <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-red-50">งวดที่</th>
                    <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap bg-red-50">จำนวนเงิน (Invoice)</th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-red-50">สถานะ (Invoice)</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap bg-red-50">กำหนดชำระ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((row, index) => {
                    const dService = daysBetween(row.nextServiceDate);
                    const isVisitOverdue = dService !== null && dService < 0;
                    const cellTransition = 'transition-colors duration-200 ease-out';
                    const stickyBg = isVisitOverdue
                      ? `bg-red-200 group-hover:bg-red-300 ${cellTransition}`
                      : `bg-white group-hover:bg-slate-50 ${cellTransition}`;
                    const greenBg = isVisitOverdue
                      ? `bg-red-200 group-hover:bg-red-300 ${cellTransition}`
                      : `bg-green-50/50 group-hover:bg-green-100/60 ${cellTransition}`;
                    const yellowBg = isVisitOverdue
                      ? `bg-red-200 group-hover:bg-red-300 ${cellTransition}`
                      : `bg-yellow-50 group-hover:bg-yellow-100 ${cellTransition}`;

                    const renderNextServiceDisplay = () => {
                      if (!row.nextServiceDate) return '-';
                      const d = new Date(row.nextServiceDate);
                      if (!isNaN(d.getTime()) && String(row.nextServiceDate).includes('-')) {
                        return formatThaiDate(row.nextServiceDate);
                      }
                      return row.nextServiceDate;
                    };

                    return (
                      <tr
                        key={`${row.contractCode}-${index}`}
                        className={`group border-b border-slate-200 transition-colors duration-200 ease-out ${
                          isVisitOverdue ? 'bg-red-200 hover:bg-red-300' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className={`px-3 py-3 whitespace-nowrap text-center align-top text-slate-500 sticky left-0 z-10 w-16 ${stickyBg}`}>
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className={`px-3 py-3 whitespace-nowrap text-left align-top font-medium text-green-600 sticky left-16 z-10 ${stickyBg}`}>
                          {row.contractCode}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-left align-top font-medium text-slate-800">
                          {row.customerName}
                        </td>
                        <td className="px-3 py-3 text-left align-top text-slate-600 min-w-[300px] md:min-w-[400px]">
                          <div className="leading-relaxed">{row.address}</div>
                          <div className="text-slate-400 mt-1">{row.phone}</div>
                        </td>

                        {/* 🟢 Green: Service Info */}
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
                          {row.lastServiceDate !== '-' ? formatThaiDate(row.lastServiceDate) : '-'}
                        </td>
                        <td className={`px-3 py-3 whitespace-nowrap text-left align-top text-slate-600 ${greenBg}`}>
                          {renderNextServiceDisplay()}
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

                        {/* 🔴 Red/Yellow: Invoice Info */}
                        <td className={`px-3 py-3 whitespace-nowrap text-center align-top text-slate-600 ${yellowBg}`}>
                          {row.installment}
                        </td>
                        <td className={`px-3 py-3 whitespace-nowrap text-right align-top text-slate-600 ${yellowBg}`}>
                          {row.invoiceAmount > 0 ? `${row.invoiceAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท` : '-'}
                        </td>
                        <td className={`px-3 py-3 whitespace-nowrap text-center align-top ${yellowBg}`}>
                          {row.invoiceStatus !== '-' ? <StatusBadge status={row.invoiceStatus} /> : '-'}
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
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default UpcomingVisitsTab;
