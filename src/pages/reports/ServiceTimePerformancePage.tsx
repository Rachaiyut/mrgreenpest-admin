import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { ReportApi } from '../../api/report';

interface Row { tech_id: string; tech_name: string; nick_name: string; total_jobs: number; avg_minutes: number; min_minutes: number; max_minutes: number; under_20_count: number; under_20_pct: number; }
interface Data { items: Row[]; summary: { month: number; year: number; total_jobs: number; overall_avg_minutes: number; under_20_count: number } }

const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i] }));
const yearOptions = (() => { const y = new Date().getFullYear(); return Array.from({ length: 5 }, (_, i) => ({ value: String(y - i), label: String(y - i + 543) })); })();

const ServiceTimePerformancePage: React.FC = () => {
  const n = new Date();
  const [month, setMonth] = useState(n.getMonth() + 1);
  const [year, setYear] = useState(n.getFullYear());
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await ReportApi.getServiceTimePerformance({ month, year, search }) as Data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, [month, year, search]);
  useEffect(() => { const t = setTimeout(fetchData, 300); return () => clearTimeout(t); }, [fetchData]);

  const items = data?.items || [];
  const s = data?.summary;

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานเวลาเข้าบริการต่อทีม</h1>
            <p className="mt-1 text-slate-600">เฉลี่ยกี่นาทีต่องาน + งานที่อยู่ไม่ถึง 20 นาที</p>
          </div>
          <Button variant="primary" onClick={() => ReportApi.downloadExcel('service-time-performance', { month, year, search })}>ส่งออก Excel</Button>
        </div>

        <Card className="!p-4">
          <div className="flex gap-3 flex-wrap">
            <Input type="search" placeholder="ค้นหาช่าง" value={search} onChange={(e) => setSearch(e.target.value)} className="w-72" />
            <div className="w-32"><DropdownSelect value={String(month)} onChange={(v) => setMonth(Number(v))} options={monthOptions} /></div>
            <div className="w-32"><DropdownSelect value={String(year)} onChange={(v) => setYear(Number(v))} options={yearOptions} /></div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="!p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <p className="text-xs text-slate-600 font-medium">งานทั้งหมด</p>
            <p className="text-3xl font-bold text-slate-700 mt-1">{s?.total_jobs ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <p className="text-xs text-blue-700 font-medium">เฉลี่ยรวม (นาที)</p>
            <p className="text-3xl font-bold text-blue-800 mt-1">{s?.overall_avg_minutes ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <p className="text-xs text-amber-700 font-medium">งาน &lt; 20 นาที</p>
            <p className="text-3xl font-bold text-amber-800 mt-1">{s?.under_20_count ?? 0}</p>
          </Card>
        </div>

        <div className="rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ชื่อ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ชื่อเล่น</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">งานรวม</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">เฉลี่ย (นาที)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">น้อยสุด</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">มากสุด</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">&lt; 20 นาที</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">% &lt; 20 นาที</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={8} className="text-center py-10 text-slate-400">กำลังโหลด...</td></tr>
              : items.length === 0 ? <tr><td colSpan={8} className="text-center py-10 text-slate-400">ไม่พบข้อมูล</td></tr>
              : items.map((r) => (
                <tr key={r.tech_id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm font-medium text-slate-800">{r.tech_name}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{r.nick_name || '-'}</td>
                  <td className="px-4 py-2 text-sm text-center font-semibold tabular-nums">{r.total_jobs}</td>
                  <td className="px-4 py-2 text-sm text-center tabular-nums">{r.avg_minutes}</td>
                  <td className="px-4 py-2 text-sm text-center text-slate-500 tabular-nums">{r.min_minutes}</td>
                  <td className="px-4 py-2 text-sm text-center text-slate-500 tabular-nums">{r.max_minutes}</td>
                  <td className="px-4 py-2 text-sm text-center text-amber-700 tabular-nums">{r.under_20_count}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${r.under_20_pct >= 30 ? 'bg-red-100 text-red-700' : r.under_20_pct >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {r.under_20_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ServiceTimePerformancePage;
