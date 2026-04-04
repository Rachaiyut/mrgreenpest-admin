import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Select, Input } from '../../components/common/FormControls';
import { formatThaiDate } from '../../utils/date';
import { MagnifyingGlassIcon, CalendarIcon } from '../../assets/icons/Icons';
import { NotificationApi } from '../../api/notification';
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
      nextServiceDate: item.next_service_date
        ? new Date(item.next_service_date)
        : new Date(),
      nextServiceDisplay: item.next_service_date,
      daysRemaining: Number(item.days_remaining) || 0,
    }));
  }, [data]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          การแจ้งเตือนและนัดหมาย
        </h1>
        <p className="text-slate-600 mt-1">
          ติดตามสถานะสัญญา การชำระเงิน และรอบบริการ
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center w-full">
          {/* Search Bar */}
          <div className="relative w-full lg:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="ค้นหา (สัญญา, รหัส, ชื่อ, ชื่อเล่น, โทร)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 h-11 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-base shadow-sm transition duration-150 ease-in-out"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Type Filter */}
            <div className="w-full sm:w-40">
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as string)}
                className="w-full bg-white border-slate-200 rounded-lg shadow-sm h-11 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="ทั้งหมด">ประเภท: ทั้งหมด</option>
                <option value="ใกล้หมดสัญญา">ใกล้หมดสัญญา</option>
                <option value="ใกล้กำหนดตรวจ">ใกล้กำหนดตรวจ</option>
                <option value="ค้างชำระ">ค้างชำระ</option>
              </Select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <DatePicker selected={startDate ? new Date(startDate) : null} onChange={(date: Date | null) => setStartDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="เริ่มต้น" isClearable className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-32 sm:w-36" />
              <span className="text-slate-400">-</span>
              <DatePicker selected={endDate ? new Date(endDate) : null} onChange={(date: Date | null) => setEndDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="สิ้นสุด" isClearable className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-32 sm:w-36" />
            </div>

            {/* Invoice Status */}
            <div className="w-full sm:w-40">
              <Select
                value={invoiceStatus}
                onChange={(e) => setInvoiceStatus(e.target.value)}
                className="w-full bg-white border-slate-200 rounded-lg shadow-sm h-11 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="ทั้งหมด">Invoice: ทั้งหมด</option>
                <option value="PAID">ชำระแล้ว</option>
                <option value="PENDING">รอชำระ</option>
                <option value="OVERDUE">เกินกำหนด</option>
                <option value="DRAFT">ร่าง</option>
                <option value="SENT">ส่งแล้ว</option>
              </Select>
            </div>
          </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap sticky left-0 z-20 bg-slate-50 w-16">
                  ลำดับ
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap sticky left-16 z-20 bg-slate-50">
                  เลขที่สัญญา
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                  ชื่อ-นามสกุล ลูกค้า
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                  ชื่อเล่น
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 min-w-[300px] md:min-w-[400px]">
                  ที่อยู่/เบอร์โทร
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                  รายละเอียดสัญญา
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap">
                  ระยะเวลา (ปี)
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                  เริ่มสัญญา
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                  หมดสัญญา
                </th>
                <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">
                  ราคา
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-red-50">
                  งวดที่
                </th>
                <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap bg-red-50">
                  จำนวนเงิน (Invoice)
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-red-50">
                  สถานะ Invoice
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap bg-red-50">
                  กำหนดชำระ
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">
                  ครั้งที่ / ทั้งหมด
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">
                  เข้าตรวจล่าสุด
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">
                  เข้าตรวจถัดไป
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">
                  เหลือ (วัน)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={18}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={18}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                filteredData.map((row, index) => (
                  <tr
                    key={row.contractId}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-3 py-3 whitespace-nowrap text-center text-slate-500 sticky left-0 z-10 bg-white w-16">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap font-medium text-green-600 sticky left-16 z-10 bg-white">
                      {row.contractId}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-800">
                      {row.customerName}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      {row.nickname}
                    </td>
                    <td className="px-3 py-3 text-slate-600 min-w-[300px] md:min-w-[400px]">
                      <div className="leading-relaxed">
                        {row.address}
                      </div>
                      <div className="text-slate-400 mt-1">{row.phone}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      {row.contractDetails}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center text-slate-600">
                      {row.durationYears}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      {formatThaiDate(row.startDate)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      {formatThaiDate(row.endDate)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right font-medium text-slate-800">
                      {row.price.toLocaleString()}
                    </td>

                    {/* 🔴 Red Section: Invoice Info */}
                    <td className="px-3 py-3 whitespace-nowrap text-center text-slate-600 bg-red-50/50">
                      {row.installment}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right text-slate-600 bg-red-50/50">
                      {row.invoiceAmount > 0
                        ? row.invoiceAmount.toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center bg-red-50/50">
                      {row.invoiceStatus !== '-' ? (
                        <StatusBadge status={row.invoiceStatus} />
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600 bg-red-50/50">
                      {row.invoiceDueDate !== '-'
                        ? formatThaiDate(row.invoiceDueDate)
                        : '-'}
                    </td>

                    {/* 🟢 Green Section: Service Info */}
                    <td className="px-3 py-3 whitespace-nowrap text-center font-medium text-slate-800 bg-green-50/50">
                      {row.visitNumber > 0 ? row.visitNumber : '-'}{' '}
                      <span className="text-slate-400 mx-1">/</span>{' '}
                      {row.total_visits || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center text-slate-600 bg-green-50/50">
                      {row.lastServiceDate !== '-'
                        ? formatThaiDate(row.lastServiceDate)
                        : '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center text-slate-600 bg-green-50/50">
                      {(() => {
                        const display = row.nextServiceDisplay;
                        if (display) {
                          // Check if it's a valid date string (e.g. ISO format or YYYY-MM-DD)
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
                    <td className="px-3 py-3 whitespace-nowrap text-center font-bold bg-green-50/50">
                      <span
                        className={
                          row.daysRemaining <= 7
                            ? 'text-red-600'
                            : 'text-green-600'
                        }
                      >
                        {row.daysRemaining}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
        />
      )}
    </div>
  );
};

export default Notifications;
