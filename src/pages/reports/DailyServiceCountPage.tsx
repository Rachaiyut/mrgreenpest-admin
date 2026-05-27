import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { Pagination } from '../../components/common/Pagination';
import BuddhistDatePicker from '../../components/common/BuddhistDatePicker';
import { ReportApi } from '../../api/report';
import { UserApi } from '../../api/user';
import { WarehouseApi } from '../../api/warehouse';
import type { User } from '../../types/entity/core.interface';
import type { Warehouse } from '../../types/entity/inventory.interface';
import { WarehouseType } from '../../types/enums/inventory';
import { JobStatusLabel } from '../../types/enums/job';
import { ClipboardDocumentListIcon, LoadingIcon } from '../../assets/icons/Icons';

interface Item {
  service_date: string;
  job_count: number;
  customer_count: number;
  completed_count: number;
}

interface JobRow {
  id: string;
  code: string;
  appointment_date: string;
  status: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  duration_minutes: number | null;
  service_system: string | null;
  remark: string | null;
  customer_code: string;
  customer_name: string;
  primary_phone: string;
  service_address: string;
  tech_id: string;
  tech_name: string;
  tech_nickname: string;
  vehicle_name: string | null;
  contract_code: string | null;
}

interface Data {
  items: Item[];
  jobs: JobRow[];
  summary: {
    month: number;
    year: number;
    total_jobs: number;
    total_customers: number;
    completed: number;
    active_days: number;
    avg_jobs_per_day: number;
  };
}

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i],
}));
const yearOptions = (() => {
  const now = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => ({ value: String(now - i), label: String(now - i + 543) }));
})();

const formatShort = (d: string) =>
  d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : '-';

const formatTimeHHMM = (d: string | null) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const formatTimeRange = (start: string | null, end: string | null) => {
  if (!start && !end) return '-';
  return `${formatTimeHHMM(start)} – ${formatTimeHHMM(end)}`;
};

// อ้างอิงจาก libs/database/enum/assessmnt.enum.ts ServiceSystem
const serviceSystemLabel: Record<string, string> = {
  PREY: 'ระบบเหยื่อ',
  CHEMICAL: 'ระบบเคมี',
  RAT_BLOCK_GLUE: 'บล็อกกาวจับหนู',
  BAIT_SEMI_BIO: 'เหยื่อกึ่งชีวภาพ',
  OTHER: 'อื่นๆ',
};

// ใช้ JobStatusLabel + statusColorMap pattern เดียวกับหน้าสรุปงานรายวัน (DailyClosure)
//   ให้สี/label ตรงกันทั้งโปรเจกต์
const statusColorMap: Record<string, string> = {
  UNASSIGNED: 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 shadow-sm shadow-slate-200/50',
  PENDING_APPROVAL: 'bg-gradient-to-r from-purple-100 to-violet-200 text-purple-800 shadow-sm shadow-purple-200/50',
  REJECTED: 'bg-gradient-to-r from-rose-100 to-pink-200 text-rose-800 shadow-sm shadow-rose-200/50',
  PENDING: 'bg-gradient-to-r from-amber-100 to-yellow-200 text-amber-800 shadow-sm shadow-amber-200/50',
  IN_PROGRESS: 'bg-gradient-to-r from-blue-100 to-sky-200 text-blue-800 shadow-sm shadow-blue-200/50',
  WAITING_CLEAR: 'bg-gradient-to-r from-orange-100 to-amber-200 text-orange-800 shadow-sm shadow-orange-200/50',
  COMPLETE: 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 shadow-sm shadow-green-200/50',
  CANCELLED: 'bg-gradient-to-r from-red-100 to-rose-200 text-red-800 shadow-sm shadow-red-200/50',
  FAILED: 'bg-red-100 text-red-800 border-red-200',
};


const toISODate = (d: Date | null): string => {
  if (!d) return '';
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const DailyServiceCountPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Warehouse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // โหลด list หัวหน้าช่าง (FIELD_LEAD) จาก API filter — โหลดครั้งเดียวตอน mount
  //   ใช้ backend filter role_type=FIELD_LEAD ตรงๆ แทน fetch ทั้งหมดแล้ว filter client-side
  useEffect(() => {
    UserApi.getAll({ limit: 200, role_type: 'FIELD_LEAD' })
      .then((res) => {
        setUsers(((res?.data as unknown as User[]) || []));
      })
      .catch((err) => console.error('Failed to load tech leads:', err));
    WarehouseApi.getWarehouses({ type: WarehouseType.VEHICLE, limit: 200 })
      .then((res) => setVehicles((res?.data as unknown as Warehouse[]) || []))
      .catch((err) => console.error('Failed to load vehicles:', err));
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

  const vehicleOptions = useMemo(
    () => [
      { value: '', label: 'ทุกคัน' },
      ...vehicles.map((v) => ({
        value: v.id,
        label: v.name || v.code || '(ไม่มีชื่อ)',
      })),
    ],
    [vehicles],
  );

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'ทุกสถานะ' },
      ...Object.entries(JobStatusLabel).map(([key, label]) => ({
        value: key,
        label: label as string,
      })),
    ],
    [],
  );

  const useRange = !!(startDate && endDate);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof ReportApi.getDailyServiceCount>[0] = {};
      if (search.trim()) params.search = search.trim();
      if (technicianId) params.technician_id = technicianId;
      if (vehicleId) params.vehicle_id = vehicleId;
      if (statusFilter) params.status = statusFilter;
      if (useRange) {
        params.start_date = toISODate(startDate);
        params.end_date = toISODate(endDate);
      } else {
        params.month = month;
        params.year = year;
      }
      const r = await ReportApi.getDailyServiceCount(params);
      setData(r as Data);
    } catch (e) { console.error('Failed:', e); } finally { setLoading(false); }
  }, [month, year, search, technicianId, vehicleId, statusFilter, startDate, endDate, useRange]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  // Reset to page 1 ทุกครั้งที่ filter เปลี่ยน (ไม่งั้นอาจอยู่หน้าที่ไม่มี data หลัง filter)
  useEffect(() => {
    setCurrentPage(1);
  }, [search, technicianId, vehicleId, statusFilter, month, year, startDate, endDate]);

  const s = data?.summary;
  const jobs = data?.jobs || [];
  const paginatedJobs = jobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // flow แค่วันที่มีงานจริง (ตามรูปที่ user ขอ) — ไม่ใช้ calendar grid

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานบริการรายวัน</h1>
            <p className="mt-1 text-slate-600">จำนวนลูกค้าที่เข้าให้บริการในแต่ละวันของเดือน</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              const params: Record<string, unknown> = {};
              if (search.trim()) params.search = search.trim();
              if (technicianId) params.technician_id = technicianId;
              if (vehicleId) params.vehicle_id = vehicleId;
              if (statusFilter) params.status = statusFilter;
              if (useRange) {
                params.start_date = toISODate(startDate);
                params.end_date = toISODate(endDate);
              } else {
                params.month = month;
                params.year = year;
              }
              ReportApi.downloadExcel('daily-service-count', params);
            }}
          >
            ส่งออก Excel
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="!p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <p className="text-xs text-slate-600 font-medium">งานรวม</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{s?.total_jobs ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <p className="text-xs text-blue-700 font-medium">ลูกค้ารวม</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{s?.total_customers ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <p className="text-xs text-emerald-700 font-medium">งานเสร็จแล้ว</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{s?.completed ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <p className="text-xs text-amber-700 font-medium">วันทำงาน</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{s?.active_days ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <p className="text-xs text-green-700 font-medium">เฉลี่ย (งาน/วัน)</p>
            <p className="text-2xl font-bold text-green-800 mt-1">{s?.avg_jobs_per_day ?? 0}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="!p-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="w-full sm:w-80">
              <label className="block text-xs font-medium text-slate-600 mb-1">ค้นหา (ลูกค้า / เลขที่งาน / เบอร์)</label>
              <Input
                type="search"
                placeholder="ค้นหาชื่อลูกค้า, รหัส, เบอร์โทร"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Technician */}
            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium text-slate-600 mb-1">หัวหน้าช่าง</label>
              <DropdownSelect
                value={technicianId}
                onChange={(v) => setTechnicianId(v)}
                options={techOptions}
                placeholder="ทุกคน"
                className="w-full"
              />
            </div>

            {/* Vehicle */}
            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium text-slate-600 mb-1">รถ</label>
              <DropdownSelect
                value={vehicleId}
                onChange={(v) => setVehicleId(v)}
                options={vehicleOptions}
                placeholder="ทุกคัน"
                className="w-full"
              />
            </div>

            {/* Status */}
            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium text-slate-600 mb-1">สถานะ</label>
              <DropdownSelect
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                options={statusOptions}
                placeholder="ทุกสถานะ"
                className="w-full"
              />
            </div>

            {/* Month/Year */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">เดือน/ปี</label>
              <div className="flex gap-2">
                <DropdownSelect
                  value={String(month)}
                  onChange={(v) => setMonth(Number(v))}
                  options={monthOptions}
                  className="w-32"
                  disabled={useRange}
                />
                <DropdownSelect
                  value={String(year)}
                  onChange={(v) => setYear(Number(v))}
                  options={yearOptions}
                  className="w-24"
                  disabled={useRange}
                />
              </div>
            </div>

            {/* Date range */}
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                ช่วงวัน (override เดือน/ปี)
              </label>
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

          {/* Active filter chips */}
          {(search || technicianId || vehicleId || statusFilter || useRange) && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">ตัวกรองที่ใช้:</span>
              {search && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                  ค้นหา: "{search}"
                  <button onClick={() => setSearch('')} className="hover:text-blue-900">✕</button>
                </span>
              )}
              {technicianId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
                  ช่าง: {techOptions.find((o) => o.value === technicianId)?.label}
                  <button onClick={() => setTechnicianId('')} className="hover:text-emerald-900">✕</button>
                </span>
              )}
              {vehicleId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                  รถ: {vehicleOptions.find((o) => o.value === vehicleId)?.label}
                  <button onClick={() => setVehicleId('')} className="hover:text-purple-900">✕</button>
                </span>
              )}
              {statusFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-cyan-100 text-cyan-700">
                  สถานะ: {statusOptions.find((o) => o.value === statusFilter)?.label}
                  <button onClick={() => setStatusFilter('')} className="hover:text-cyan-900">✕</button>
                </span>
              )}
              {useRange && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                  {startDate?.toLocaleDateString('th-TH')} – {endDate?.toLocaleDateString('th-TH')}
                  <button onClick={() => { setStartDate(null); setEndDate(null); }} className="hover:text-amber-900">✕</button>
                </span>
              )}
              <button
                onClick={() => { setSearch(''); setTechnicianId(''); setVehicleId(''); setStatusFilter(''); setStartDate(null); setEndDate(null); }}
                className="text-xs text-slate-500 hover:text-slate-700 underline ml-auto"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          )}
        </Card>


        {/* Detail table — job-level (รายการงานจริงตาม filter)
            ใช้ pattern เดียวกับ OverdueJobsPage: flex-1 + px-4 py-3 + no header card */}
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden relative">
          <div className="overflow-x-auto flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ลำดับ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">วันที่นัด</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">เลขที่งาน</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ลูกค้า</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">เบอร์</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ที่อยู่บริการ</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ระบบบริการ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">หัวหน้าช่าง</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">รถ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">เลขสัญญา</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">สถานะ</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">เข้า – ออก</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">เวลา (นาที)</th>
                </tr>
              </thead>
              <tbody className="bg-white [&>tr]:border-b [&>tr]:border-slate-100">
                {loading || paginatedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[49px] flex flex-col items-center justify-center text-slate-400">
                        {loading ? (
                          <>
                            <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                            <p className="text-base font-medium">กำลังโหลดข้อมูล...</p>
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentListIcon className="h-12 w-12 mb-3 opacity-50" />
                            <p className="text-base font-medium text-slate-500">ไม่พบงานตามที่กรอง</p>
                            <p className="text-sm mt-1">ลองปรับตัวกรองหรือเลือกช่วงวันใหม่</p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : paginatedJobs.map((j, idx) => (
                  <tr key={j.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-center text-slate-500 tabular-nums">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{formatShort(j.appointment_date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-primary whitespace-nowrap">{j.code}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{j.customer_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{j.primary_phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 max-w-[280px] truncate" title={j.service_address}>{j.service_address || '-'}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {j.service_system ? (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {serviceSystemLabel[j.service_system] || j.service_system}
                        </span>
                      ) : <span className="text-slate-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{j.tech_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{j.vehicle_name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700 whitespace-nowrap">{j.contract_code || '-'}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${statusColorMap[j.status] || statusColorMap.PENDING}`}>
                        {JobStatusLabel[j.status] || j.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-600 whitespace-nowrap tabular-nums">{formatTimeRange(j.actual_start_time, j.actual_end_time)}</td>
                    <td className="px-4 py-3 text-center text-sm tabular-nums">{j.duration_minutes != null ? j.duration_minutes : <span className="text-slate-400">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={jobs.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(s: number) => { setItemsPerPage(s); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyServiceCountPage;
