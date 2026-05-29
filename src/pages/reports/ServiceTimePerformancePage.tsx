import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { Pagination } from '../../components/common/Pagination';
import BuddhistDatePicker from '../../components/common/BuddhistDatePicker';
import { ReportApi } from '../../api/report';
import { UserApi } from '../../api/user';
import type { User } from '../../types/entity/core.interface';
import { JobStatusLabel } from '../../types/enums/job';
import { ClipboardDocumentListIcon, LoadingIcon } from '../../assets/icons/Icons';

interface JobRow {
  id: string;
  code: string;
  appointment_date: string;
  start_date: string | null;
  status: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  duration_minutes: number | null;
  start_diff_minutes: number | null;
  tech_id: string;
  tech_name: string;
  nick_name: string | null;
  customer_code: string;
  customer_name: string;
  primary_phone: string;
  sub_district: string | null;
  district: string | null;
  vehicle_name: string | null;
  service_system: string | null;
}

interface Summary {
  month: number;
  year: number;
  total_jobs: number;
  total_minutes: number;
  total_hours: number;
  avg_minutes: number;
  min_minutes: number;
  max_minutes: number;
  under_20_count: number;
  under_20_pct: number;
  on_time_count: number;
  on_time_pct: number;
  abnormal_fast: number;
  abnormal_slow: number;
}

interface Distribution {
  under_10: number;
  between_10_20: number;
  between_20_30: number;
  between_30_60: number;
  over_60: number;
}

interface Data {
  items: JobRow[];
  summary: Summary;
  distribution: Distribution;
}

type BucketKey = '' | 'under_10' | '10_20' | '20_30' | '30_60' | 'over_60';

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i],
}));
const yearOptions = (() => {
  const now = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => ({ value: String(now - i), label: String(now - i + 543) }));
})();

const statusColorMap: Record<string, string> = {
  UNASSIGNED: 'bg-slate-100 text-slate-700',
  PENDING_APPROVAL: 'bg-purple-100 text-purple-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  WAITING_CLEAR: 'bg-orange-100 text-orange-800',
  COMPLETE: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-100 text-red-800',
};

const serviceSystemLabel: Record<string, string> = {
  PREY: 'ระบบเหยื่อ',
  CHEMICAL: 'ระบบเคมี',
  RAT_BLOCK_GLUE: 'บล็อกกาวจับหนู',
  BAIT_SEMI_BIO: 'เหยื่อกึ่งชีวภาพ',
  OTHER: 'อื่นๆ',
};

const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('th-TH') : '-');
const fmtTime = (d: string | null) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
};
const fmtTimeRange = (start: string | null, end: string | null) =>
  !start && !end ? '-' : `${fmtTime(start)} – ${fmtTime(end)}`;

// แปลงนาทีเป็น string ที่อ่านง่าย: < 60 = "Xน." / < 1440 = "Xชม Yน." / >= 1440 = "Xวัน Yชม."
const fmtDuration = (min: number): string => {
  const m = Math.abs(min);
  if (m < 60) return `${m} น.`;
  if (m < 1440) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r === 0 ? `${h} ชม.` : `${h} ชม. ${r} น.`;
  }
  const d = Math.floor(m / 1440);
  const rh = Math.floor((m % 1440) / 60);
  return rh === 0 ? `${d} วัน` : `${d} วัน ${rh} ชม.`;
};

const toISODate = (d: Date | null): string => {
  if (!d) return '';
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const ServiceTimePerformancePage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bucketFilter, setBucketFilter] = useState<BucketKey>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    UserApi.getAll({ limit: 200, role_type: 'FIELD_LEAD' })
      .then((res) => setUsers((res?.data as unknown as User[]) || []))
      .catch((err) => console.error('Failed to load tech leads:', err));
  }, []);

  const techOptions = useMemo(
    () => [
      { value: '', label: 'ทุกคน' },
      ...users.map((u) => ({
        value: u.id,
        label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.nick_name || '(ไม่มีชื่อ)',
      })),
    ],
    [users],
  );

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'ทุกสถานะ' },
      ...Object.entries(JobStatusLabel).map(([key, label]) => ({ value: key, label: label as string })),
    ],
    [],
  );

  const useRange = !!(startDate && endDate);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof ReportApi.getServiceTimePerformance>[0] = {};
      if (search.trim()) params.search = search.trim();
      if (technicianId) params.technician_id = technicianId;
      if (statusFilter) params.status = statusFilter;
      if (bucketFilter) params.duration_bucket = bucketFilter;
      if (useRange) {
        params.start_date = toISODate(startDate);
        params.end_date = toISODate(endDate);
      } else {
        params.month = month;
        params.year = year;
      }
      const r = await ReportApi.getServiceTimePerformance(params);
      setData(r as Data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [month, year, search, technicianId, statusFilter, bucketFilter, startDate, endDate, useRange]);

  useEffect(() => { const t = setTimeout(fetchData, 300); return () => clearTimeout(t); }, [fetchData]);
  useEffect(() => setCurrentPage(1), [search, technicianId, statusFilter, bucketFilter, month, year, startDate, endDate]);

  const items = data?.items || [];
  const s = data?.summary;
  const dist = data?.distribution;
  const paginated = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportExcel = () => {
    const params: Record<string, unknown> = {};
    if (search.trim()) params.search = search.trim();
    if (technicianId) params.technician_id = technicianId;
    if (statusFilter) params.status = statusFilter;
    if (bucketFilter) params.duration_bucket = bucketFilter;
    if (useRange) { params.start_date = toISODate(startDate); params.end_date = toISODate(endDate); }
    else { params.month = month; params.year = year; }
    ReportApi.downloadExcel('service-time-performance', params);
  };

  const bucketLabels: Record<BucketKey, string> = {
    '': '',
    under_10: '< 10 นาที',
    '10_20': '10–20 นาที',
    '20_30': '20–30 นาที',
    '30_60': '30–60 นาที',
    over_60: '> 60 นาที',
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานเวลาปฏิบัติงานเฉลี่ยของหัวหน้าทีม</h1>
            <p className="mt-1 text-slate-600">ระยะเวลาปฏิบัติงานต่อบ้านลูกค้า</p>
          </div>
          <Button variant="primary" onClick={exportExcel}>ส่งออก Excel</Button>
        </div>

        {/* Summary cards row 1 — 6 metrics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card className="!p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <p className="text-xs text-slate-600 font-medium">จำนวนงานทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{s?.total_jobs ?? 0}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">เวลารวม {s?.total_hours ?? 0} ชม.</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <p className="text-xs text-blue-700 font-medium">เวลาเฉลี่ยต่องาน</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{s?.avg_minutes ?? 0} <span className="text-sm font-medium">นาที</span></p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <p className="text-xs text-emerald-700 font-medium">ช่วงเวลาที่ใช้ (สั้น–ยาว)</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{s?.min_minutes ?? 0} – {s?.max_minutes ?? 0} <span className="text-sm font-medium">นาที</span></p>
          </Card>
          <Card className={`!p-4 bg-gradient-to-br ${(s?.on_time_pct || 0) >= 80 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : (s?.on_time_pct || 0) >= 60 ? 'from-amber-50 to-amber-100 border-amber-200' : 'from-rose-50 to-rose-100 border-rose-200'}`}>
            <p className={`text-xs font-medium ${(s?.on_time_pct || 0) >= 80 ? 'text-emerald-700' : (s?.on_time_pct || 0) >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>เวลาที่เริ่มงาน</p>
            <p className={`text-2xl font-bold mt-1 ${(s?.on_time_pct || 0) >= 80 ? 'text-emerald-800' : (s?.on_time_pct || 0) >= 60 ? 'text-amber-800' : 'text-rose-800'}`}>{s?.on_time_pct ?? 0}%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{s?.on_time_count ?? 0} งาน เริ่มตรงเวลานัด (±15 นาที)</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <p className="text-xs text-amber-700 font-medium">จำนวนงานที่เข้าบริการสั้น</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{s?.abnormal_fast ?? 0} <span className="text-sm font-medium">งาน</span></p>
            <p className="text-[10px] text-amber-600 mt-0.5">ใช้เวลาน้อยกว่า 10 นาที</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
            <p className="text-xs text-rose-700 font-medium">จำนวนงานที่เข้าบริการนาน</p>
            <p className="text-2xl font-bold text-rose-800 mt-1">{s?.abnormal_slow ?? 0} <span className="text-sm font-medium">งาน</span></p>
            <p className="text-[10px] text-rose-600 mt-0.5">ใช้เวลามากกว่า 60 นาที</p>
          </Card>
        </div>


        {/* Filters */}
        <Card className="!p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-80">
              <label className="block text-xs font-medium text-slate-600 mb-1">ค้นหา (เลขที่งาน / ลูกค้า / ช่าง)</label>
              <Input type="search" placeholder="ค้นหา..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full" />
            </div>
            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium text-slate-600 mb-1">หัวหน้าช่าง</label>
              <DropdownSelect value={technicianId} onChange={setTechnicianId} options={techOptions} placeholder="ทุกคน" className="w-full" />
            </div>
            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium text-slate-600 mb-1">สถานะงาน</label>
              <DropdownSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} placeholder="ทุกสถานะ" className="w-full" />
            </div>
            <div className="w-full sm:w-44">
              <label className="block text-xs font-medium text-slate-600 mb-1">ช่วงเวลา</label>
              <DropdownSelect
                value={bucketFilter}
                onChange={(v) => setBucketFilter(v as BucketKey)}
                options={[
                  { value: '', label: 'ทุกช่วง' },
                  { value: 'under_10', label: '< 10 นาที' },
                  { value: '10_20', label: '10–20 นาที' },
                  { value: '20_30', label: '20–30 นาที' },
                  { value: '30_60', label: '30–60 นาที' },
                  { value: 'over_60', label: '> 60 นาที' },
                ]}
                className="w-full"
              />
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

          {(search || technicianId || statusFilter || bucketFilter || useRange) && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">ตัวกรองที่ใช้:</span>
              {search && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">ค้นหา: "{search}"<button onClick={() => setSearch('')} className="hover:text-blue-900">✕</button></span>}
              {technicianId && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">ช่าง: {techOptions.find((o) => o.value === technicianId)?.label}<button onClick={() => setTechnicianId('')} className="hover:text-emerald-900">✕</button></span>}
              {statusFilter && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-cyan-100 text-cyan-700">สถานะ: {statusOptions.find((o) => o.value === statusFilter)?.label}<button onClick={() => setStatusFilter('')} className="hover:text-cyan-900">✕</button></span>}
              {bucketFilter && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">ช่วงเวลา: {bucketLabels[bucketFilter]}<button onClick={() => setBucketFilter('')} className="hover:text-purple-900">✕</button></span>}
              {useRange && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">{startDate?.toLocaleDateString('th-TH')} – {endDate?.toLocaleDateString('th-TH')}<button onClick={() => { setStartDate(null); setEndDate(null); }} className="hover:text-amber-900">✕</button></span>}
              <button onClick={() => { setSearch(''); setTechnicianId(''); setStatusFilter(''); setBucketFilter(''); setStartDate(null); setEndDate(null); }} className="text-xs text-slate-500 hover:text-slate-700 underline ml-auto">ล้างตัวกรองทั้งหมด</button>
            </div>
          )}
        </Card>

        {/* Table — per-job */}
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden relative">
          <div className="overflow-x-auto flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ลำดับ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">เลขที่งาน</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">หัวหน้าช่าง</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ลูกค้า</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ตำบล/อำเภอ</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ระบบบริการ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">รถ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">วันนัด</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">เข้า – ออก</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">เวลาที่เข้าบริการ (นาที)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">เวลาที่เริ่มงาน</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">สถานะ</th>
                </tr>
              </thead>
              <tbody className="bg-white [&>tr]:border-b [&>tr]:border-slate-100">
                {loading || paginated.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[49px] flex flex-col items-center justify-center text-slate-400">
                        {loading ? (
                          <>
                            <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                            <p className="text-base font-medium">กำลังโหลดข้อมูล...</p>
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentListIcon className="h-12 w-12 mb-3 opacity-50" />
                            <p className="text-base font-medium text-slate-500">ไม่พบงาน</p>
                            <p className="text-sm mt-1">ลองปรับตัวกรองหรือเลือกเดือนใหม่</p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((j, idx) => {
                  const dur = j.duration_minutes;
                  const fast = dur != null && dur < 10;
                  const slow = dur != null && dur > 60;
                  const diff = j.start_diff_minutes;
                  const onTime = diff != null && Math.abs(diff) <= 15;
                  const district = [j.sub_district, j.district].filter(Boolean).join(' / ') || '-';
                  return (
                    <tr key={j.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-center text-slate-500 tabular-nums">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-primary whitespace-nowrap">{j.code}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{j.tech_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{j.customer_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{district}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {j.service_system ? (
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            {serviceSystemLabel[j.service_system] || j.service_system}
                          </span>
                        ) : <span className="text-slate-400 text-xs">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{j.vehicle_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{fmtDate(j.appointment_date)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 text-center whitespace-nowrap tabular-nums">{fmtTimeRange(j.actual_start_time, j.actual_end_time)}</td>
                      <td className="px-4 py-3 text-sm text-center font-semibold tabular-nums">
                        {dur != null ? (
                          <span className={fast ? 'text-amber-700' : slow ? 'text-rose-700' : 'text-slate-800'}>{dur}</span>
                        ) : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {diff == null ? (
                          <span className="text-slate-400 text-xs">-</span>
                        ) : onTime ? (
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">ตรงเวลา</span>
                        ) : diff > 0 ? (
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700" title={`สายกว่านัด ${diff} นาที`}>สาย {fmtDuration(diff)}</span>
                        ) : (
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700" title={`เริ่มก่อนนัด ${Math.abs(diff)} นาที`}>ก่อน {fmtDuration(diff)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${statusColorMap[j.status] || 'bg-slate-100 text-slate-700'}`}>
                          {JobStatusLabel[j.status] || j.status}
                        </span>
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
              onItemsPerPageChange={(n: number) => { setItemsPerPage(n); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceTimePerformancePage;
