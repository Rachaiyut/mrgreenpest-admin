import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { Input, Button } from '../../components/common/FormControls';
import BuddhistDatePicker from '../../components/common/BuddhistDatePicker';
import { ReportApi } from '../../api/report';
import { ContractStatusLabel, ContractStatusColor } from '../../types/enums/contract';
import { ClipboardDocumentListIcon, LoadingIcon } from '../../assets/icons/Icons';

interface Item {
  id: string;
  code: string;
  end_date: string;
  status: string;
  customer_name: string;
  customer_code: string;
  primary_phone: string;
  days_since_expiry: number;
}

interface Data {
  items: Item[];
  summary: {
    total: number;
    expired_no_renewal: number;
    renewed: number;
    cancelled: number;
    completed: number;
    still_active: number;
    renewal_rate: number;
  };
}

const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString('th-TH') : '-');

// ใช้ ContractStatusLabel + ContractStatusColor จาก types/enums/contract เพื่อ
// ให้ label/สี ตรงกับทั้งระบบ (รวม COMPLETED/REVISED ที่ enum หลักไม่มี → fallback)
const getStatusLabel = (s: string) =>
  (ContractStatusLabel as Record<string, string>)[s] || {
    COMPLETED: 'เสร็จสิ้น',
    REVISED: 'แก้ไข',
  }[s] || s;

const getStatusBadge = (s: string) =>
  (ContractStatusColor as Record<string, string>)[s] || {
    COMPLETED: 'bg-blue-100 text-blue-700',
    REVISED: 'bg-amber-100 text-amber-700',
  }[s] || 'bg-slate-100 text-slate-700';

const ContractRenewalStatusPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await ReportApi.getContractRenewalStatus({ search });
      setData(r as Data);
    } catch (e) { console.error('Failed:', e); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(fetchData, 300); return () => clearTimeout(t); }, [fetchData]);
  useEffect(() => setCurrentPage(1), [search, startDate, endDate]);

  const useRange = !!(startDate && endDate);

  const items = data?.items || [];
  // Filter by end_date range (client-side — contract data already loaded)
  const filteredItems = useMemo(() => {
    if (!useRange) return items;
    const startT = startDate!.getTime();
    const endT = endDate!.getTime() + 86400000 - 1; // end-of-day inclusive
    return items.filter((it) => {
      if (!it.end_date) return false;
      const t = new Date(it.end_date).getTime();
      return t >= startT && t <= endT;
    });
  }, [items, useRange, startDate, endDate]);
  const paginated = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const s = data?.summary;

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานสถานะสัญญาหมดอายุ</h1>
            <p className="mt-1 text-slate-600">สัญญาที่เลยวันสิ้นสุดแล้ว แยกตามสถานะการต่อ</p>
          </div>
          <Button variant="primary" onClick={() => ReportApi.downloadExcel('contract-renewal-status', { search })}>ส่งออก Excel</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="!p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <p className="text-xs text-slate-600 font-medium">รวมหมดอายุ</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{s?.total ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <p className="text-xs text-emerald-700 font-medium">ต่อสัญญาแล้ว</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{s?.renewed ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <p className="text-xs text-red-700 font-medium">ยังไม่ต่อ</p>
            <p className="text-2xl font-bold text-red-800 mt-1">{s?.expired_no_renewal ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <p className="text-xs text-amber-700 font-medium">ยังเปิดอยู่</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{s?.still_active ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <p className="text-xs text-blue-700 font-medium">เสร็จสิ้น</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{s?.completed ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <p className="text-xs text-green-700 font-medium">อัตราต่อสัญญา</p>
            <p className="text-2xl font-bold text-green-800 mt-1">{s?.renewal_rate ?? 0}%</p>
          </Card>
        </div>

        {/* Filter card — match DailyServiceCount layout (labels above inputs in flex row) */}
        <Card className="!p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-80">
              <label className="block text-xs font-medium text-slate-600 mb-1">ค้นหา (เลขที่สัญญา / ชื่อลูกค้า)</label>
              <Input
                type="search"
                placeholder="ค้นหาเลขที่สัญญา / ชื่อลูกค้า"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-medium text-slate-600 mb-1">ช่วงเวลาที่หมดอายุ</label>
              <div className="flex items-center gap-2">
                <BuddhistDatePicker
                  selected={startDate}
                  onChange={(d: Date | null) => setStartDate(d)}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="วันเริ่ม"
                  wrapperClassName="w-36"
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm"
                />
                <span className="text-slate-400">–</span>
                <BuddhistDatePicker
                  selected={endDate}
                  onChange={(d: Date | null) => setEndDate(d)}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="วันสิ้นสุด"
                  wrapperClassName="w-36"
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm"
                  minDate={startDate || undefined}
                />
                {(startDate || endDate) && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setStartDate(null); setEndDate(null); }}
                    className="px-3"
                  >
                    ล้าง
                  </Button>
                )}
              </div>
            </div>
          </div>

          {(search || useRange) && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">ตัวกรองที่ใช้:</span>
              {search && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                  ค้นหา: "{search}"
                  <button onClick={() => setSearch('')} className="hover:text-blue-900">✕</button>
                </span>
              )}
              {useRange && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                  {startDate?.toLocaleDateString('th-TH')} – {endDate?.toLocaleDateString('th-TH')}
                  <button onClick={() => { setStartDate(null); setEndDate(null); }} className="hover:text-amber-900">✕</button>
                </span>
              )}
              <button
                onClick={() => { setSearch(''); setStartDate(null); setEndDate(null); }}
                className="text-xs text-slate-500 hover:text-slate-700 underline ml-auto"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          )}
        </Card>

        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden relative">
          <div className="overflow-x-auto flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ลำดับ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">เลขที่สัญญา</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ลูกค้า</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">เบอร์</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">วันสิ้นสุด</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">หมดอายุ (วัน)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">สถานะ</th>
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
                            <p className="text-base font-medium text-slate-500">ไม่พบสัญญาหมดอายุ</p>
                            <p className="text-sm mt-1">ลองปรับตัวกรองหรือเลือกช่วงวันใหม่</p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-center text-slate-500 tabular-nums">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-primary">{item.code}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.customer_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.primary_phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(item.end_date)}</td>
                    <td className="px-4 py-3 text-sm text-center font-semibold text-slate-800 tabular-nums">{item.days_since_expiry}</td>
                    <td className="px-4 py-3 text-center"><span className={`inline-block text-xs px-2 py-0.5 rounded-full ${getStatusBadge(item.status)}`}>{getStatusLabel(item.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredItems.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(n: number) => { setItemsPerPage(n); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractRenewalStatusPage;
