import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import BuddhistDatePicker from '../../components/common/BuddhistDatePicker';
import { ReportApi } from '../../api/report';
import { UserApi } from '../../api/user';
import { WarehouseApi } from '../../api/warehouse';
import type { User } from '../../types/entity/core.interface';
import type { Warehouse } from '../../types/entity/inventory.interface';
import { WarehouseType } from '../../types/enums/inventory';
import { ClipboardDocumentListIcon, LoadingIcon } from '../../assets/icons/Icons';

interface Item {
  id: string;
  code: string;
  status: string;
  appointment_date: string;
  created_at: string;
  customer_name: string;
  customer_code: string;
  primary_phone: string;
  age_days: number;
  tech_name: string | null;
  tech_nickname: string | null;
  vehicle_name: string | null;
}

interface Data {
  items: Item[];
  summary: {
    status_counts: { DRAFT: number; PENDING: number; APPOINTMENT: number; COMPLETE: number; CANCELLED: number };
    total: number;
    success_rate: number;
    pending_total: number;
  };
}

const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString('th-TH') : '-');

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i],
}));
const yearOptions = (() => {
  const now = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => ({ value: String(now - i), label: String(now - i + 543) }));
})();

const statusLabel: Record<string, string> = {
  DRAFT: 'ร่าง',
  PENDING: 'รออนุมัติ',
  APPOINTMENT: 'นัดหมาย',
  COMPLETE: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
};

const statusBadge: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-700',
  APPOINTMENT: 'bg-blue-100 text-blue-700',
  COMPLETE: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const toISODate = (d: Date | null): string => {
  if (!d) return '';
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const AssessmentStatusPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Warehouse[]>([]);

  useEffect(() => {
    UserApi.getAll({ limit: 200, role_type: 'FIELD_LEAD' })
      .then((res) => setUsers(((res?.data as unknown as User[]) || [])))
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
      ...vehicles.map((v) => ({ value: v.id, label: v.name || v.code || '(ไม่มีชื่อ)' })),
    ],
    [vehicles],
  );

  const useRange = !!(startDate && endDate);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof ReportApi.getAssessmentStatus>[0] = {};
      if (search.trim()) params.search = search.trim();
      if (technicianId) params.technician_id = technicianId;
      if (vehicleId) params.vehicle_id = vehicleId;
      if (useRange) {
        params.start_date = toISODate(startDate);
        params.end_date = toISODate(endDate);
      } else {
        params.month = month;
        params.year = year;
      }
      const r = await ReportApi.getAssessmentStatus(params);
      setData(r as Data);
    } catch (e) {
      console.error('Failed to fetch:', e);
    } finally {
      setLoading(false);
    }
  }, [month, year, search, technicianId, vehicleId, useRange, startDate, endDate]);

  useEffect(() => { const t = setTimeout(fetchData, 300); return () => clearTimeout(t); }, [fetchData]);
  useEffect(() => setCurrentPage(1), [search, month, year, technicianId, vehicleId, startDate, endDate]);

  const items = data?.items || [];
  const paginated = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const c = data?.summary.status_counts;

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานสถานะใบประเมิน</h1>
            <p className="mt-1 text-slate-600">สรุปสถานะใบประเมินในเดือน + รายการที่ค้างอยู่</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              const params: Record<string, unknown> = {};
              if (search.trim()) params.search = search.trim();
              if (technicianId) params.technician_id = technicianId;
              if (vehicleId) params.vehicle_id = vehicleId;
              if (useRange) {
                params.start_date = toISODate(startDate);
                params.end_date = toISODate(endDate);
              } else {
                params.month = month;
                params.year = year;
              }
              ReportApi.downloadExcel('assessment-status', params);
            }}
          >
            ส่งออก Excel
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['DRAFT', 'PENDING', 'APPOINTMENT', 'COMPLETE', 'CANCELLED'] as const).map((s) => (
            <Card key={s} className="!p-4 text-center">
              <p className={`inline-block text-xs px-2 py-0.5 rounded-full ${statusBadge[s]}`}>{statusLabel[s]}</p>
              <p className="text-3xl font-bold text-slate-700 mt-2">{c?.[s] ?? 0}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <p className="text-sm text-emerald-700 font-medium">Success rate</p>
            <p className="text-3xl font-bold text-emerald-800 mt-1">{data?.summary.success_rate ?? 0}%</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <p className="text-sm text-amber-700 font-medium">ใบประเมินค้างอยู่ทั้งหมด</p>
            <p className="text-3xl font-bold text-amber-800 mt-1">{data?.summary.pending_total ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <p className="text-sm text-slate-600 font-medium">รวมทั้งหมดในเดือน</p>
            <p className="text-3xl font-bold text-slate-700 mt-1">{data?.summary.total ?? 0}</p>
          </Card>
        </div>

        {/* Filter card — same layout as DailyServiceCountPage */}
        <Card className="!p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-80">
              <label className="block text-xs font-medium text-slate-600 mb-1">ค้นหา (เลขที่ / ชื่อลูกค้า)</label>
              <Input
                type="search"
                placeholder="ค้นหาเลขที่ / ชื่อลูกค้า"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium text-slate-600 mb-1">หัวหน้าช่าง</label>
              <DropdownSelect value={technicianId} onChange={(v) => setTechnicianId(v)} options={techOptions} placeholder="ทุกคน" className="w-full" />
            </div>
            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium text-slate-600 mb-1">รถ</label>
              <DropdownSelect value={vehicleId} onChange={(v) => setVehicleId(v)} options={vehicleOptions} placeholder="ทุกคัน" className="w-full" />
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
                  <Button type="button" variant="secondary" onClick={() => { setStartDate(null); setEndDate(null); }} className="px-3">ล้าง</Button>
                )}
              </div>
            </div>
          </div>

          {(search || technicianId || vehicleId || useRange) && (
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
              {useRange && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                  {startDate?.toLocaleDateString('th-TH')} – {endDate?.toLocaleDateString('th-TH')}
                  <button onClick={() => { setStartDate(null); setEndDate(null); }} className="hover:text-amber-900">✕</button>
                </span>
              )}
              <button
                onClick={() => { setSearch(''); setTechnicianId(''); setVehicleId(''); setStartDate(null); setEndDate(null); }}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">เลขที่</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">สถานะ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ลูกค้า</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">เบอร์</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">หัวหน้าช่าง</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">รถ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">วันนัด</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">วันที่สร้าง</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">ค้าง (วัน)</th>
                </tr>
              </thead>
              <tbody className="bg-white [&>tr]:border-b [&>tr]:border-slate-100">
                {loading || paginated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[49px] flex flex-col items-center justify-center text-slate-400">
                        {loading ? (
                          <>
                            <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                            <p className="text-base font-medium">กำลังโหลดข้อมูล...</p>
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentListIcon className="h-12 w-12 mb-3 opacity-50" />
                            <p className="text-base font-medium text-slate-500">ไม่พบใบประเมินที่ค้างอยู่</p>
                            <p className="text-sm mt-1">ลองปรับตัวกรองหรือเลือกเดือนใหม่</p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-center text-slate-500 tabular-nums">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-primary">{item.code}</td>
                    <td className="px-4 py-3"><span className={`inline-block text-xs px-2 py-0.5 rounded-full ${statusBadge[item.status]}`}>{statusLabel[item.status] || item.status}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.customer_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.primary_phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{item.tech_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{item.vehicle_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(item.appointment_date)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-center font-semibold text-slate-800 tabular-nums">{item.age_days}</td>
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

export default AssessmentStatusPage;
