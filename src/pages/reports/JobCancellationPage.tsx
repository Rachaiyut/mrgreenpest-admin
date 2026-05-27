import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { ReportApi } from '../../api/report';
import { ClipboardDocumentListIcon, LoadingIcon } from '../../assets/icons/Icons';

interface CancellationItem {
  id: string;
  code: string;
  appointment_date: string;
  status: string;
  rejection_reason: string | null;
  cancelled_at: string;
  customer_code: string;
  customer_name: string;
  primary_phone: string;
  rejected_by_name: string;
}

interface Data {
  items: CancellationItem[];
  summary: {
    cancelled_count: number;
    total_count: number;
    cancellation_rate: number;
    by_reason: Array<{ reason: string; count: number }>;
  };
}

const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString('th-TH') : '-');

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i],
}));

const yearOptions = (() => {
  const now = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => ({
    value: String(now - i),
    label: String(now - i + 543),
  }));
})();

const JobCancellationPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ReportApi.getJobCancellation({ month, year, search });
      setData(result as Data);
    } catch (e) {
      console.error('Failed to fetch job cancellation:', e);
    } finally {
      setLoading(false);
    }
  }, [month, year, search]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  useEffect(() => setCurrentPage(1), [search, month, year]);

  const items = data?.items || [];
  const paginated = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานการยกเลิกงาน</h1>
            <p className="mt-1 text-slate-600">รายการงานที่ถูกยกเลิก พร้อมเหตุผลและสถิติ</p>
          </div>
          <Button variant="primary" onClick={() => ReportApi.downloadExcel('job-cancellation', { month, year, search })}>
            ส่งออก Excel
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="!p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <p className="text-sm text-red-600 font-medium">งานที่ยกเลิก</p>
            <p className="text-3xl font-bold text-red-700 mt-1">{data?.summary.cancelled_count ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <p className="text-sm text-slate-600 font-medium">งานทั้งหมดในเดือน</p>
            <p className="text-3xl font-bold text-slate-700 mt-1">{data?.summary.total_count ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <p className="text-sm text-amber-700 font-medium">อัตราการยกเลิก</p>
            <p className="text-3xl font-bold text-amber-800 mt-1">{data?.summary.cancellation_rate ?? 0}%</p>
          </Card>
        </div>

        {/* Top reasons */}
        {data?.summary.by_reason?.length ? (
          <Card className="!p-4">
            <p className="font-semibold text-slate-800 mb-3">เหตุผลยกเลิก (Top {data.summary.by_reason.length})</p>
            <div className="space-y-2">
              {data.summary.by_reason.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{r.reason}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{r.count}</span>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {/* Filters */}
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Input
                type="search"
                placeholder="ค้นหา: เลขที่งาน / ชื่อลูกค้า / เหตุผล"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-32">
              <DropdownSelect value={String(month)} onChange={(v) => setMonth(Number(v))} options={monthOptions} />
            </div>
            <div className="w-32">
              <DropdownSelect value={String(year)} onChange={(v) => setYear(Number(v))} options={yearOptions} />
            </div>
          </div>
        </Card>

        {/* Table */}
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden relative">
          <div className="overflow-x-auto flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">เลขที่งาน</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ลูกค้า</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">เบอร์</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">วันนัด</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">วันยกเลิก</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ผู้ยกเลิก</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">เหตุผล</th>
                </tr>
              </thead>
              <tbody className="bg-white [&>tr]:border-b [&>tr]:border-slate-100">
                {loading || paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[49px] flex flex-col items-center justify-center text-slate-400">
                        {loading ? (
                          <>
                            <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                            <p className="text-base font-medium">กำลังโหลดข้อมูล...</p>
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentListIcon className="h-12 w-12 mb-3 opacity-50" />
                            <p className="text-base font-medium text-slate-500">ไม่พบรายการ</p>
                            <p className="text-sm mt-1">ลองปรับตัวกรองหรือเลือกเดือนใหม่</p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-primary">{item.code}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.customer_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.primary_phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(item.appointment_date)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(item.cancelled_at)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.rejected_by_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.rejection_reason || <span className="text-slate-400">(ไม่ระบุ)</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={items.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(s: number) => { setItemsPerPage(s); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCancellationPage;
