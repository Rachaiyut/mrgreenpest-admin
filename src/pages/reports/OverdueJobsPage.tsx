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
  appointment_date: string;
  status: string;
  customer_name: string;
  customer_code: string;
  primary_phone: string;
  technician_name: string;
  vehicle_name: string | null;
  contract_code: string | null;
  service_system: string | null;
  service_address: string;
  days_overdue: number;
  overdue_bucket: '1-7' | '8-30' | '31+';
}

interface Data {
  items: Item[];
  summary: { total: number; '1-7': number; '8-30': number; '31+': number };
}

const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString('th-TH') : '-');

const bucketColor: Record<string, string> = {
  '1-7': 'bg-amber-100 text-amber-700',
  '8-30': 'bg-orange-100 text-orange-700',
  '31+': 'bg-red-100 text-red-700',
};

const serviceSystemLabel: Record<string, string> = {
  PREY: 'ระบบเหยื่อ',
  CHEMICAL: 'ระบบเคมี',
  RAT_BLOCK_GLUE: 'บล็อกกาวจับหนู',
  BAIT_SEMI_BIO: 'เหยื่อกึ่งชีวภาพ',
  OTHER: 'อื่นๆ',
};

const bucketOptions = [
  { value: '', label: 'ทุกช่วง' },
  { value: '1-7', label: 'ค้าง 1-7 วัน' },
  { value: '8-30', label: 'ค้าง 8-30 วัน' },
  { value: '31+', label: 'ค้าง 31+ วัน' },
];

const toISODate = (d: Date | null): string => {
  if (!d) return '';
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const OverdueJobsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [bucket, setBucket] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Warehouse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
      ...vehicles.map((v) => ({
        value: v.id,
        label: v.name || v.code || '(ไม่มีชื่อ)',
      })),
    ],
    [vehicles],
  );

  const useRange = !!(startDate && endDate);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof ReportApi.getOverdueJobs>[0] = {};
      if (search.trim()) params.search = search.trim();
      if (technicianId) params.technician_id = technicianId;
      if (vehicleId) params.vehicle_id = vehicleId;
      if (bucket) params.bucket = bucket;
      if (useRange) {
        params.start_date = toISODate(startDate);
        params.end_date = toISODate(endDate);
      }
      const r = await ReportApi.getOverdueJobs(params);
      setData(r as Data);
    } catch (e) { console.error('Failed:', e); } finally { setLoading(false); }
  }, [search, technicianId, vehicleId, bucket, startDate, endDate, useRange]);

  useEffect(() => { const t = setTimeout(fetchData, 300); return () => clearTimeout(t); }, [fetchData]);
  useEffect(() => setCurrentPage(1), [search, technicianId, vehicleId, bucket, startDate, endDate]);

  const items = data?.items || [];
  const paginated = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานลูกค้ารอบริการค้าง</h1>
            <p className="mt-1 text-slate-600">งานที่นัดไว้แต่ยังไม่ได้เข้าให้บริการ (เกินวันนัด)</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              const params: Record<string, unknown> = {};
              if (search.trim()) params.search = search.trim();
              if (technicianId) params.technician_id = technicianId;
              if (vehicleId) params.vehicle_id = vehicleId;
              if (bucket) params.bucket = bucket;
              if (useRange) {
                params.start_date = toISODate(startDate);
                params.end_date = toISODate(endDate);
              }
              ReportApi.downloadExcel('overdue-jobs', params);
            }}
          >
            ส่งออก Excel
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="!p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <p className="text-sm text-slate-600 font-medium">รวมทั้งหมด</p>
            <p className="text-3xl font-bold text-slate-700 mt-1">{data?.summary.total ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <p className="text-sm text-amber-700 font-medium">ค้าง 1-7 วัน</p>
            <p className="text-3xl font-bold text-amber-800 mt-1">{data?.summary['1-7'] ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <p className="text-sm text-orange-700 font-medium">ค้าง 8-30 วัน</p>
            <p className="text-3xl font-bold text-orange-800 mt-1">{data?.summary['8-30'] ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <p className="text-sm text-red-700 font-medium">ค้าง 31+ วัน</p>
            <p className="text-3xl font-bold text-red-800 mt-1">{data?.summary['31+'] ?? 0}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="!p-4">
          <div className="flex flex-wrap items-end gap-3">
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

            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium text-slate-600 mb-1">ช่วงค้าง</label>
              <DropdownSelect
                value={bucket}
                onChange={(v) => setBucket(v)}
                options={bucketOptions}
                placeholder="ทุกช่วง"
                className="w-full"
              />
            </div>

            <div className="w-full sm:w-auto">
              <label className="block text-xs font-medium text-slate-600 mb-1">ช่วงวันนัด</label>
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
          {(search || technicianId || vehicleId || bucket || useRange) && (
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
              {bucket && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-cyan-100 text-cyan-700">
                  ช่วง: {bucketOptions.find((o) => o.value === bucket)?.label}
                  <button onClick={() => setBucket('')} className="hover:text-cyan-900">✕</button>
                </span>
              )}
              {useRange && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                  {startDate?.toLocaleDateString('th-TH')} – {endDate?.toLocaleDateString('th-TH')}
                  <button onClick={() => { setStartDate(null); setEndDate(null); }} className="hover:text-amber-900">✕</button>
                </span>
              )}
              <button
                onClick={() => { setSearch(''); setTechnicianId(''); setVehicleId(''); setBucket(''); setStartDate(null); setEndDate(null); }}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">เลขที่งาน</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ลูกค้า</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">เบอร์</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ที่อยู่บริการ</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ระบบบริการ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">หัวหน้าช่าง</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">รถ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">เลขสัญญา</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">วันนัด</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ค้าง (วัน)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ช่วงค้าง</th>
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
                            <p className="text-base font-medium text-slate-500">ไม่พบงานค้าง</p>
                            <p className="text-sm mt-1">ลองปรับตัวกรองหรือเลือกเดือนใหม่</p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-center text-slate-500 tabular-nums">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-primary whitespace-nowrap">{item.code}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{item.customer_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{item.primary_phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 max-w-[280px] truncate" title={item.service_address}>{item.service_address || '-'}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {item.service_system ? (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {serviceSystemLabel[item.service_system] || item.service_system}
                        </span>
                      ) : <span className="text-slate-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{item.technician_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{item.vehicle_name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700 whitespace-nowrap">{item.contract_code || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{formatDate(item.appointment_date)}</td>
                    <td className="px-4 py-3 text-sm text-center font-semibold text-slate-800 tabular-nums">{item.days_overdue}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap"><span className={`inline-block text-xs px-2 py-0.5 rounded-full ${bucketColor[item.overdue_bucket]}`}>{item.overdue_bucket}</span></td>
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

export default OverdueJobsPage;
