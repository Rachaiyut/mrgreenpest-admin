import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { Pagination } from '../../components/common/Pagination';
import BuddhistDatePicker from '../../components/common/BuddhistDatePicker';
import { ReportApi } from '../../api/report';
import { ContractStatus, ContractStatusLabel, ContractStatusColor } from '../../types/enums/contract';

interface ContractRow {
  id: string;
  code: string;
  customer_id: string;
  customer_code: string | null;
  customer_name: string;
  primary_phone: string | null;
  sub_district: string | null;
  district: string | null;
  province: string | null;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  duration_months: number | null;
  days_to_expire: number | null;
  annual_value: number;
  cohort: 'NEW' | 'EXISTING';
  next_contract_id: string | null;
  next_contract_code: string | null;
  next_contract_amount: number | null;
}

interface Data {
  items: ContractRow[];
  provinces: string[];
  period: { month: number; year: number };
}

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i],
}));
const yearOptions = (() => {
  const now = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => ({ value: String(now - i), label: String(now - i + 543) }));
})();

const cohortOptions = [
  { value: '', label: 'ทุกกลุ่ม' },
  { value: 'NEW', label: 'ลูกค้าใหม่' },
  { value: 'EXISTING', label: 'ลูกค้าเดิม' },
];

const expiringOptions = [
  { value: '', label: 'ทั้งหมด' },
  { value: '30', label: 'หมดใน 30 วัน' },
  { value: '60', label: 'หมดใน 60 วัน' },
  { value: '90', label: 'หมดใน 90 วัน' },
];

const fmt = (n: number) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });
const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('th-TH') : '-');
const toISODate = (d: Date | null): string => {
  if (!d) return '';
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const daysToExpireBadge = (days: number | null, status: string) => {
  if (days == null || status === ContractStatus.CANCELLED || status === ContractStatus.EXPIRED) {
    return <span className="text-slate-400">-</span>;
  }
  if (days < 0) return <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">หมดแล้ว {Math.abs(days)} วัน</span>;
  if (days <= 30) return <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">เหลือ {days} วัน</span>;
  if (days <= 90) return <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">เหลือ {days} วัน</span>;
  return <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">เหลือ {days} วัน</span>;
};

const ContractRenewalCohortPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [cohort, setCohort] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expiringWithin, setExpiringWithin] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const useRange = !!(startDate && endDate);

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'ทุกสถานะ' },
      ...Object.entries(ContractStatusLabel).map(([key, label]) => ({ value: key, label: label as string })),
    ],
    [],
  );

  const buildParams = useCallback((): Parameters<typeof ReportApi.getContractRenewalCohort>[0] => {
    const params: Parameters<typeof ReportApi.getContractRenewalCohort>[0] = {};
    if (search.trim()) params.search = search.trim();
    if (cohort) params.cohort = cohort;
    if (statusFilter) params.status = statusFilter;
    if (expiringWithin) params.expiring_within_days = Number(expiringWithin);
    if (useRange) {
      params.start_date = toISODate(startDate);
      params.end_date = toISODate(endDate);
    } else {
      params.month = month;
      params.year = year;
    }
    return params;
  }, [search, cohort, statusFilter, expiringWithin, useRange, startDate, endDate, month, year]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await ReportApi.getContractRenewalCohort(buildParams());
      setData(r as Data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [buildParams]);

  useEffect(() => { const t = setTimeout(fetchData, 300); return () => clearTimeout(t); }, [fetchData]);
  useEffect(() => setCurrentPage(1), [search, cohort, statusFilter, expiringWithin, month, year, startDate, endDate]);

  const items = data?.items || [];
  const paginated = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const cohortStats = useMemo(() => {
    const calc = (rows: ContractRow[]) => {
      const total = rows.length;
      const renewed = rows.filter((r) => !!r.next_contract_code).length;
      const pct = total > 0 ? Math.round((renewed / total) * 100) : 0;
      return { total, renewed, pct };
    };
    return {
      new: calc(items.filter((it) => it.cohort === 'NEW')),
      existing: calc(items.filter((it) => it.cohort === 'EXISTING')),
      overall: calc(items),
    };
  }, [items]);

  const exportExcel = () => {
    const params = buildParams() as Record<string, unknown>;
    ReportApi.downloadExcel('contract-renewal-cohort', params);
  };

  const hasFilter = !!(search || cohort || statusFilter || expiringWithin || useRange);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานอัตราการต่อสัญญาของลูกค้าใหม่ หรือ ลูกค้าเดิม</h1>
            <p className="mt-1 text-slate-600">เปรียบเทียบอัตราการต่อสัญญาของลูกค้าใหม่ vs ลูกค้าเดิม พร้อมรายชื่อสัญญาที่ต้องติดตามต่อ</p>
          </div>
          <Button variant="primary" onClick={exportExcel}>ส่งออก Excel</Button>
        </div>

        {/* Renewal rate summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-blue-700 font-semibold">ลูกค้าใหม่</p>
              <p className="text-2xl font-bold text-blue-800">{cohortStats.new.pct}%</p>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              {cohortStats.new.total} สัญญา · ต่อแล้ว <span className="font-semibold">{cohortStats.new.renewed}</span> ฉบับ
            </p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-emerald-700 font-semibold">ลูกค้าเดิม</p>
              <p className="text-2xl font-bold text-emerald-800">{cohortStats.existing.pct}%</p>
            </div>
            <p className="text-xs text-emerald-700 mt-1">
              {cohortStats.existing.total} สัญญา · ต่อแล้ว <span className="font-semibold">{cohortStats.existing.renewed}</span> ฉบับ
            </p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-slate-700 font-semibold">รวมทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-800">{cohortStats.overall.pct}%</p>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {cohortStats.overall.total} สัญญา · ต่อแล้ว <span className="font-semibold">{cohortStats.overall.renewed}</span> ฉบับ
            </p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="!p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-72">
              <label className="block text-xs font-medium text-slate-600 mb-1">ค้นหา (เลขสัญญา / ลูกค้า)</label>
              <Input type="search" placeholder="ค้นหา..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full" />
            </div>
            <div className="w-full sm:w-40">
              <label className="block text-xs font-medium text-slate-600 mb-1">กลุ่มลูกค้า</label>
              <DropdownSelect value={cohort} onChange={setCohort} options={cohortOptions} className="w-full" />
            </div>
            <div className="w-full sm:w-44">
              <label className="block text-xs font-medium text-slate-600 mb-1">สถานะสัญญา</label>
              <DropdownSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} className="w-full" />
            </div>
            <div className="w-full sm:w-40">
              <label className="block text-xs font-medium text-slate-600 mb-1">ใกล้หมดอายุ</label>
              <DropdownSelect value={expiringWithin} onChange={setExpiringWithin} options={expiringOptions} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">เดือน/ปี</label>
              <div className="flex gap-2">
                <DropdownSelect value={String(month)} onChange={(v) => setMonth(Number(v))} options={monthOptions} className="w-32" disabled={useRange} />
                <DropdownSelect value={String(year)} onChange={(v) => setYear(Number(v))} options={yearOptions} className="w-24" disabled={useRange} />
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-medium text-slate-600 mb-1">ช่วงวัน (override เดือน/ปี)</label>
              <div className="flex items-center gap-2">
                <BuddhistDatePicker selected={startDate} onChange={(d: Date | null) => setStartDate(d)} dateFormat="dd/MM/yyyy" placeholderText="วันเริ่ม" wrapperClassName="w-36" className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm" />
                <span className="text-slate-400">–</span>
                <BuddhistDatePicker selected={endDate} onChange={(d: Date | null) => setEndDate(d)} dateFormat="dd/MM/yyyy" placeholderText="วันสิ้นสุด" wrapperClassName="w-36" className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm" minDate={startDate || undefined} />
                {(startDate || endDate) && (
                  <Button type="button" variant="secondary" onClick={() => { setStartDate(null); setEndDate(null); }} className="px-3">ล้าง</Button>
                )}
              </div>
            </div>
          </div>

          {hasFilter && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">ตัวกรองที่ใช้:</span>
              {search && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">ค้นหา: "{search}"<button onClick={() => setSearch('')} className="hover:text-blue-900">✕</button></span>}
              {cohort && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">กลุ่ม: {cohortOptions.find((o) => o.value === cohort)?.label}<button onClick={() => setCohort('')} className="hover:text-emerald-900">✕</button></span>}
              {statusFilter && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700">สถานะ: {statusOptions.find((o) => o.value === statusFilter)?.label}<button onClick={() => setStatusFilter('')} className="hover:text-indigo-900">✕</button></span>}
              {expiringWithin && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">ใกล้หมด ≤ {expiringWithin} วัน<button onClick={() => setExpiringWithin('')} className="hover:text-amber-900">✕</button></span>}
              {useRange && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-700">{fmtDate(toISODate(startDate))} – {fmtDate(toISODate(endDate))}<button onClick={() => { setStartDate(null); setEndDate(null); }} className="hover:text-slate-900">✕</button></span>}
            </div>
          )}
        </Card>

        {/* Table */}
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase">ลำดับ</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">เลขที่สัญญา</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">รหัสลูกค้า</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ลูกค้า</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase">กลุ่ม</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">พื้นที่</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">วันเริ่ม – วันสิ้นสุด</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase">ระยะเวลา</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase">สถานะ</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase">เหลือกี่วัน</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">มูลค่า</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">มูลค่า/ปี</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ต่อสัญญาแล้ว?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 [&>tr:last-child]:border-b [&>tr:last-child]:border-slate-100">
                {loading ? (
                  <tr><td colSpan={13} className="text-center py-10 text-slate-400">กำลังโหลด...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={13} className="text-center py-10 text-slate-400">ไม่พบข้อมูล</td></tr>
                ) : paginated.map((it, idx) => {
                  const area = [it.sub_district, it.district, it.province].filter(Boolean).join(', ') || '-';
                  const statusColor = ContractStatusColor[it.status as ContractStatus] || 'bg-slate-100 text-slate-700';
                  const statusLabel = ContractStatusLabel[it.status as ContractStatus] || it.status;
                  return (
                    <tr key={it.id} className="hover:bg-slate-50 align-top">
                      <td className="px-3 py-2 text-sm text-center text-slate-500 tabular-nums">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="px-3 py-2 text-sm font-medium text-primary whitespace-nowrap">{it.code}</td>
                      <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{it.customer_code || '-'}</td>
                      <td className="px-3 py-2 text-sm font-medium text-slate-800">{it.customer_name || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${it.cohort === 'NEW' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {it.cohort === 'NEW' ? 'ใหม่' : 'เดิม'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">{area}</td>
                      <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">
                        {fmtDate(it.start_date)} <span className="text-slate-400">–</span> {fmtDate(it.end_date)}
                      </td>
                      <td className="px-3 py-2 text-sm text-center tabular-nums">
                        {it.duration_months != null ? `${it.duration_months} เดือน` : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                      </td>
                      <td className="px-3 py-2 text-center">{daysToExpireBadge(it.days_to_expire, it.status)}</td>
                      <td className="px-3 py-2 text-sm text-right tabular-nums">{fmt(it.total_amount)}</td>
                      <td className="px-3 py-2 text-sm text-right tabular-nums text-slate-600">{fmt(it.annual_value)}</td>
                      <td className="px-3 py-2 text-xs">
                        {it.next_contract_code ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">ต่อแล้ว</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">ยังไม่ต่อ</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

export default ContractRenewalCohortPage;
