import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/common/Card';
import { Input, Select } from '../../components/common/FormControls';
import { NotificationApi } from '../../api/notification';
import NotificationsTable, { isVisitOverdue, NotificationRow } from './NotificationsTable';

type BucketKey = 'all' | 'overdue' | 'd7' | 'd15' | 'd30';

const FILTER_TYPE_BY_BUCKET: Record<BucketKey, string> = {
  all: 'นัดหมายเข้าบริการ',
  overdue: 'นัดหมายเข้าบริการ_เกิน',
  d7: 'นัดหมายเข้าบริการ_7',
  d15: 'นัดหมายเข้าบริการ_15',
  d30: 'นัดหมายเข้าบริการ_30',
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

  const rows: NotificationRow[] = useMemo(() => {
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
      nextServiceDate: item.next_service_date || null,
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

      <NotificationsTable
        rows={rows}
        loading={loading}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
        emptyTitle="ไม่พบข้อมูลนัดหมายเข้าบริการ"
        isExpiredRow={isVisitOverdue}
      />
    </>
  );
};

export default UpcomingVisitsTab;
