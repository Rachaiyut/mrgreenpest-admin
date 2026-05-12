import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { NotificationApi } from '../../api/notification';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import UpcomingVisitsTab from './UpcomingVisitsTab';
import NotificationsTable, { isContractExpired, NotificationRow } from './NotificationsTable';

type TabKey = 'contracts' | 'upcoming-visits' | 'expired-contracts';

interface NotificationsProps {}

const Notifications: React.FC<NotificationsProps> = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: TabKey =
    tabParam === 'contracts'
      ? 'contracts'
      : tabParam === 'expired-contracts'
        ? 'expired-contracts'
        : 'upcoming-visits';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (activeTab === 'contracts') next.set('tab', 'contracts');
    else if (activeTab === 'expired-contracts') next.set('tab', 'expired-contracts');
    else next.delete('tab');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
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
        // Expired-contracts tab forces the server-side "หมดอายุแล้ว" filter
        // regardless of the dropdown — the dropdown is hidden in that view.
        const effectiveFilterType =
          activeTab === 'expired-contracts'
            ? 'หมดอายุแล้ว'
            : filterType !== 'ทั้งหมด'
              ? filterType
              : undefined;

        const res = await NotificationApi.getDashboardData({
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch || undefined,
          filter_type: effectiveFilterType,
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
  }, [currentPage, itemsPerPage, debouncedSearch, filterType, startDate, endDate, invoiceStatus, activeTab]);

  const filteredData: NotificationRow[] = useMemo(() => {
    return data.map((item) => ({
      contractUuid: item.contract_id || null,
      contractCode: item.contract_code || item.contract_id || '-',
      customerId: item.customer_id || null,
      customerName: item.customer_name || '-',
      address: item.address || '-',
      phone: item.phone || item.primary_phone || '-',
      contractDaysRemaining: item.days_remaining === null || item.days_remaining === undefined
        ? null
        : Number(item.days_remaining),
      lastServiceDate: item.last_service_date || '-',
      lastServiceReportId: item.last_service_report_id || null,
      nextServiceDate: item.next_service_date
        ? new Date(item.next_service_date)
        : null,
      nextServiceDisplay: item.next_service_date,
      customerAppointmentDate: item.customer_appointment_date || '-',
      startDate: item.start_date,
      endDate: item.end_date,
      visitNumber: Number(item.visit_number) || 0,
      totalVisits: item.total_visits || 0,
      price: Number(item.price) || 0,
      installment: item.installment || '-',
      totalInstallments: item.total_installments === null || item.total_installments === undefined
        ? null
        : Number(item.total_installments),
      invoiceAmount: Number(item.invoice_amount) || 0,
      invoiceStatus: item.invoice_status || '-',
      invoiceDueDate: item.invoice_due_date || '-',
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

      <div className="flex border-b border-slate-200">
        {([
          { key: 'upcoming-visits', label: 'นัดหมายเข้าบริการ' },
          { key: 'contracts', label: 'สัญญา / การชำระเงิน' },
          { key: 'expired-contracts', label: 'สัญญาที่หมดอายุ' },
        ] as { key: TabKey; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'upcoming-visits' ? (
        <UpcomingVisitsTab />
      ) : (
      <>
      <Card className="!p-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-sm">
            <Input
              type="search"
              placeholder="ค้นหา (สัญญา, รหัส, ชื่อ, ที่อยู่, เบอร์โทร)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {activeTab !== 'expired-contracts' && (
            <DropdownSelect
              value={filterType}
              onChange={(val) => setFilterType(val as typeof filterType)}
              className="w-full sm:w-fit"
              options={[
                { value: 'ทั้งหมด', label: 'ประเภท: ทั้งหมด' },
                { value: 'ใกล้หมดสัญญา', label: 'ใกล้หมดสัญญา' },
                { value: 'ใกล้กำหนดตรวจ', label: 'ใกล้กำหนดตรวจ' },
                { value: 'ค้างชำระ', label: 'ค้างชำระ' },
              ]}
            />
          )}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <DatePicker selected={startDate ? new Date(startDate) : null} onChange={(date: Date | null) => setStartDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="วันที่เริ่มต้น" isClearable className="w-full pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="flex-1 sm:w-36" />
            <span className="text-slate-400">-</span>
            <DatePicker selected={endDate ? new Date(endDate) : null} onChange={(date: Date | null) => setEndDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="วันที่สิ้นสุด" isClearable className="w-full pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="flex-1 sm:w-36" />
          </div>
          {activeTab !== 'expired-contracts' && (
            <DropdownSelect
              value={invoiceStatus}
              onChange={(val) => setInvoiceStatus(val)}
              className="w-full sm:w-fit"
              options={[
                { value: 'ทั้งหมด', label: 'Invoice: ทั้งหมด' },
                { value: 'PAID', label: 'ชำระแล้ว' },
                { value: 'PENDING', label: 'รอชำระ' },
                { value: 'OVERDUE', label: 'เกินกำหนด' },
                { value: 'DRAFT', label: 'ร่าง' },
                { value: 'SENT', label: 'ส่งแล้ว' },
              ]}
            />
          )}
        </div>
      </Card>

      <NotificationsTable
        rows={filteredData}
        loading={loading}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
        emptyTitle="ไม่พบข้อมูลการแจ้งเตือน"
        isExpiredRow={isContractExpired}
      />
      </>
      )}
    </div>
    </div>
  );
};

export default Notifications;
