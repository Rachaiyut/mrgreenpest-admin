import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button, Input } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { Pagination } from '../../components/common/Pagination';
import BuddhistDatePicker from '../../components/common/BuddhistDatePicker';
import { ReportApi } from '../../api/report';
import { UserApi } from '../../api/user';
import { WarehouseApi } from '../../api/warehouse';
import { CategoryApi } from '../../api/category';
import type { User } from '../../types/entity/core.interface';
import type { Warehouse } from '../../types/entity/inventory.interface';
import type { Category } from '../../types/entity/category.interface';
import { ClipboardDocumentListIcon, LoadingIcon } from '../../assets/icons/Icons';

interface DiffRow {
  product_id: string; product_code: string; product_name: string;
  category_name: string | null; unit_name: string | null;
  withdrawal_qty: number; issue_qty: number; diff_qty: number;
  withdrawal_cost: number; issue_cost: number; diff_cost: number;
  match: boolean;
  source: 'BOTH' | 'WITHDRAWAL_ONLY' | 'ISSUE_ONLY';
}
interface Data {
  granularity: 'day' | 'month';
  withdrawal: { doc_count: number; total_qty: number; total_cost: number };
  issue_summary: { doc_count: number; total_qty: number; total_cost: number };
  by_product_diff: DiffRow[];
  summary: {
    month: number; year: number;
    withdrawal_qty: number; withdrawal_cost: number;
    issue_qty: number; issue_cost: number;
    diff_qty: number; diff_cost: number;
    match_count: number; mismatch_count: number;
    only_in_withdrawal: number; only_in_issue: number;
  };
}

const fmt = (n: number) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i],
}));
const yearOptions = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => ({ value: String(y - i), label: String(y - i + 543) }));
})();
const granularityOptions = [
  { value: 'day', label: 'รายวัน' },
  { value: 'month', label: 'รายเดือน' },
];

const toISODate = (d: Date | null): string => {
  if (!d) return '';
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const ChemicalUsageDailyPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [granularity, setGranularity] = useState<'day' | 'month'>('day');
  const [search, setSearch] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  const [dPage, setDPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    UserApi.getAll({ limit: 200, role_type: 'FIELD_LEAD' })
      .then((res) => setUsers((res?.data as unknown as User[]) || []))
      .catch((err) => console.error('Failed to load tech leads:', err));
    WarehouseApi.getWarehouses({ limit: 200 })
      .then((res) => setWarehouses((res?.data as unknown as Warehouse[]) || []))
      .catch((err) => console.error('Failed to load warehouses:', err));
    CategoryApi.getCategories({ limit: 200 })
      .then((res) => setCategories((res?.data as unknown as Category[]) || []))
      .catch((err) => console.error('Failed to load categories:', err));
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

  const warehouseOptions = useMemo(
    () => [
      { value: '', label: 'ทุกคลัง' },
      ...warehouses.map((w) => ({ value: w.id, label: w.name || w.code || '(ไม่มีชื่อ)' })),
    ],
    [warehouses],
  );

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'ทุกหมวด' },
      ...categories.map((c) => ({ value: c.id, label: c.name || c.code })),
    ],
    [categories],
  );

  const useRange = !!(startDate && endDate);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof ReportApi.getChemicalUsageDaily>[0] = { granularity };
      if (search.trim()) params.search = search.trim();
      if (technicianId) params.technician_id = technicianId;
      if (sourceWarehouseId) params.source_warehouse_id = sourceWarehouseId;
      if (categoryId) params.category_id = categoryId;
      if (useRange) {
        params.start_date = toISODate(startDate);
        params.end_date = toISODate(endDate);
      } else {
        params.month = month;
        params.year = year;
      }
      const r = await ReportApi.getChemicalUsageDaily(params);
      setData(r as Data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [month, year, granularity, search, technicianId, sourceWarehouseId, categoryId, startDate, endDate, useRange]);

  useEffect(() => { const t = setTimeout(fetchData, 300); return () => clearTimeout(t); }, [fetchData]);
  useEffect(() => {
    setDPage(1);
  }, [month, year, granularity, search, technicianId, sourceWarehouseId, categoryId, startDate, endDate]);

  const s = data?.summary;
  const rows = data?.by_product_diff || [];
  const dPaged = rows.slice((dPage - 1) * itemsPerPage, dPage * itemsPerPage);

  const exportExcel = () => {
    const params: Record<string, unknown> = { granularity };
    if (search.trim()) params.search = search.trim();
    if (technicianId) params.technician_id = technicianId;
    if (sourceWarehouseId) params.source_warehouse_id = sourceWarehouseId;
    if (categoryId) params.category_id = categoryId;
    if (useRange) { params.start_date = toISODate(startDate); params.end_date = toISODate(endDate); }
    else { params.month = month; params.year = year; }
    ReportApi.downloadExcel('chemical-usage-daily', params);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานการใช้สารเคมี/อุปกรณ์</h1>
            <p className="mt-1 text-slate-600">กระทบยอด ใบเบิกสินค้า/สารเคมี ↔ สรุปการเบิกสินค้า/อุปกรณ์</p>
          </div>
          <Button variant="primary" onClick={exportExcel}>ส่งออก Excel</Button>
        </div>

        {/* Summary reconciliation cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <p className="text-xs text-emerald-700 font-medium">สรุปการเบิก</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{fmt(s?.issue_qty || 0)}</p>
            <p className="text-xs text-emerald-600 mt-1">ต้นทุน {fmt(s?.issue_cost || 0)} ฿ · {data?.issue_summary.doc_count || 0} ใบ</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <p className="text-xs text-blue-700 font-medium">ใบเบิกสินค้า</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{fmt(s?.withdrawal_qty || 0)}</p>
            <p className="text-xs text-blue-600 mt-1">ต้นทุน {fmt(s?.withdrawal_cost || 0)} ฿ · {data?.withdrawal.doc_count || 0} ใบ</p>
          </Card>
          <Card className={`!p-4 bg-gradient-to-br ${(s?.diff_qty || 0) === 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-rose-50 to-rose-100 border-rose-200'}`}>
            <p className={`text-xs font-medium ${(s?.diff_qty || 0) === 0 ? 'text-green-700' : 'text-rose-700'}`}>ส่วนต่างจำนวน</p>
            <p className={`text-2xl font-bold mt-1 ${(s?.diff_qty || 0) === 0 ? 'text-green-800' : 'text-rose-800'}`}>{(s?.diff_qty || 0) > 0 ? '+' : ''}{fmt(s?.diff_qty || 0)}</p>
            <p className={`text-xs mt-1 ${(s?.diff_cost || 0) === 0 ? 'text-green-600' : 'text-rose-600'}`}>{(s?.diff_cost || 0) > 0 ? '+' : ''}{fmt(s?.diff_cost || 0)} ฿</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <p className="text-xs text-amber-700 font-medium">รายการสินค้า</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{s?.match_count || 0} ตรง / {s?.mismatch_count || 0} ผิด</p>
            <p className="text-xs text-amber-600 mt-1">เฉพาะเบิก {s?.only_in_withdrawal || 0} · เฉพาะสรุป {s?.only_in_issue || 0}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="!p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-80">
              <label className="block text-xs font-medium text-slate-600 mb-1">ค้นหา (สินค้า / เลขที่ใบเบิก)</label>
              <Input type="search" placeholder="ค้นหาชื่อสินค้า, รหัส, เลขที่ใบเบิก" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full" />
            </div>
            <div className="w-full sm:w-40">
              <label className="block text-xs font-medium text-slate-600 mb-1">มุมมอง</label>
              <DropdownSelect value={granularity} onChange={(v) => setGranularity(v as 'day' | 'month')} options={granularityOptions} className="w-full" />
            </div>
            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium text-slate-600 mb-1">หัวหน้าช่าง / ผู้เบิก</label>
              <DropdownSelect value={technicianId} onChange={setTechnicianId} options={techOptions} placeholder="ทุกคน" className="w-full" />
            </div>
            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium text-slate-600 mb-1">คลังต้นทาง</label>
              <DropdownSelect value={sourceWarehouseId} onChange={setSourceWarehouseId} options={warehouseOptions} placeholder="ทุกคลัง" className="w-full" />
            </div>
            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium text-slate-600 mb-1">หมวดสินค้า</label>
              <DropdownSelect value={categoryId} onChange={setCategoryId} options={categoryOptions} placeholder="ทุกหมวด" className="w-full" />
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

          {(search || technicianId || sourceWarehouseId || categoryId || useRange) && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">ตัวกรองที่ใช้:</span>
              {search && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">ค้นหา: "{search}"<button onClick={() => setSearch('')} className="hover:text-blue-900">✕</button></span>}
              {technicianId && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">ผู้เบิก: {techOptions.find((o) => o.value === technicianId)?.label}<button onClick={() => setTechnicianId('')} className="hover:text-emerald-900">✕</button></span>}
              {sourceWarehouseId && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">คลัง: {warehouseOptions.find((o) => o.value === sourceWarehouseId)?.label}<button onClick={() => setSourceWarehouseId('')} className="hover:text-purple-900">✕</button></span>}
              {categoryId && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-cyan-100 text-cyan-700">หมวด: {categoryOptions.find((o) => o.value === categoryId)?.label}<button onClick={() => setCategoryId('')} className="hover:text-cyan-900">✕</button></span>}
              {useRange && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">{startDate?.toLocaleDateString('th-TH')} – {endDate?.toLocaleDateString('th-TH')}<button onClick={() => { setStartDate(null); setEndDate(null); }} className="hover:text-amber-900">✕</button></span>}
              <button onClick={() => { setSearch(''); setTechnicianId(''); setSourceWarehouseId(''); setCategoryId(''); setStartDate(null); setEndDate(null); }} className="text-xs text-slate-500 hover:text-slate-700 underline ml-auto">ล้างตัวกรองทั้งหมด</button>
            </div>
          )}
        </Card>

        {/* Table — match DailyServiceCount pattern */}
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden relative">
          <div className="overflow-x-auto flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ลำดับ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">รหัส</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">สินค้า</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">หมวด</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">หน่วย</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">สรุปเบิก</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ใบเบิก</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ส่วนต่าง</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">ส่วนต่างต้นทุน</th>
                </tr>
              </thead>
              <tbody className="bg-white [&>tr]:border-b [&>tr]:border-slate-100">
                {loading || dPaged.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[49px] flex flex-col items-center justify-center text-slate-400">
                        {loading ? (
                          <>
                            <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                            <p className="text-base font-medium">กำลังโหลดข้อมูล...</p>
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentListIcon className="h-12 w-12 mb-3 opacity-50" />
                            <p className="text-base font-medium text-slate-500">ไม่พบข้อมูล</p>
                            <p className="text-sm mt-1">ลองปรับตัวกรองหรือเลือกช่วงวันใหม่</p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : dPaged.map((r, i) => (
                  <tr key={r.product_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-center text-slate-500 tabular-nums">{(dPage - 1) * itemsPerPage + i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-primary whitespace-nowrap">{r.product_code}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.product_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.category_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-center">{r.unit_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right tabular-nums">{fmt(r.issue_qty)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right tabular-nums">{fmt(r.withdrawal_qty)}</td>
                    <td className={`px-4 py-3 text-sm text-right tabular-nums font-semibold ${r.diff_qty === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{r.diff_qty > 0 ? '+' : ''}{fmt(r.diff_qty)}</td>
                    <td className={`px-4 py-3 text-sm text-right tabular-nums ${r.diff_cost === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{r.diff_cost > 0 ? '+' : ''}{fmt(r.diff_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200">
            <Pagination
              currentPage={dPage}
              itemsPerPage={itemsPerPage}
              totalItems={rows.length}
              onPageChange={setDPage}
              onItemsPerPageChange={(n: number) => { setItemsPerPage(n); setDPage(1); }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChemicalUsageDailyPage;
