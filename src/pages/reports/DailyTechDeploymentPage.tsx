import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { ReportApi } from '../../api/report';

interface Row { service_date: string; lead_count: number; member_count: number; total_tech_count: number; customer_count: number; job_count: number; ratio: number; }
interface Data { items: Row[]; summary: { month: number; year: number; total_jobs: number; total_customers: number; active_days: number; } }

const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : '-');
const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i] }));
const yearOptions = (() => { const y = new Date().getFullYear(); return Array.from({ length: 5 }, (_, i) => ({ value: String(y - i), label: String(y - i + 543) })); })();

const DailyTechDeploymentPage: React.FC = () => {
  const n = new Date();
  const [month, setMonth] = useState(n.getMonth() + 1);
  const [year, setYear] = useState(n.getFullYear());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await ReportApi.getDailyTechDeployment({ month, year }) as Data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, [month, year]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const items = data?.items || [];
  const maxBars = Math.max(...items.map((r) => Math.max(r.total_tech_count, r.customer_count)), 1);
  const s = data?.summary;

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานพนักงาน vs บ้านลูกค้า</h1>
            <p className="mt-1 text-slate-600">จำนวนพนักงานออกงานเทียบกับบ้านลูกค้าที่ให้บริการต่อวัน</p>
          </div>
          <Button variant="primary" onClick={() => ReportApi.downloadExcel('daily-tech-deployment', { month, year })}>ส่งออก Excel</Button>
        </div>

        <Card className="!p-4">
          <div className="flex gap-3">
            <div className="w-32"><DropdownSelect value={String(month)} onChange={(v) => setMonth(Number(v))} options={monthOptions} /></div>
            <div className="w-32"><DropdownSelect value={String(year)} onChange={(v) => setYear(Number(v))} options={yearOptions} /></div>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <p className="text-xs text-blue-700 font-medium">งานทั้งหมด</p>
            <p className="text-3xl font-bold text-blue-800 mt-1">{s?.total_jobs ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <p className="text-xs text-emerald-700 font-medium">ลูกค้ารวม</p>
            <p className="text-3xl font-bold text-emerald-800 mt-1">{s?.total_customers ?? 0}</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <p className="text-xs text-amber-700 font-medium">วันออกงาน</p>
            <p className="text-3xl font-bold text-amber-800 mt-1">{s?.active_days ?? 0}</p>
          </Card>
        </div>

        <Card className="!p-4">
          <p className="font-semibold text-slate-800 mb-4">เปรียบเทียบรายวัน</p>
          {loading ? <div className="text-center py-10 text-slate-400">กำลังโหลด...</div>
          : items.length === 0 ? <div className="text-center py-10 text-slate-400">ไม่พบข้อมูล</div>
          : <div className="space-y-2">
            {items.map((r) => (
              <div key={r.service_date} className="flex items-center gap-2">
                <span className="w-16 text-xs text-slate-600 tabular-nums">{fmtDate(r.service_date)}</span>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div className="bg-slate-100 rounded h-5 relative overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${(r.total_tech_count / maxBars) * 100}%` }} />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-slate-800">ช่าง {r.total_tech_count}</span>
                  </div>
                  <div className="bg-slate-100 rounded h-5 relative overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: `${(r.customer_count / maxBars) * 100}%` }} />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-slate-800">บ้าน {r.customer_count}</span>
                  </div>
                </div>
                <span className="w-20 text-xs text-slate-600 text-right tabular-nums">{r.ratio}/คน</span>
              </div>
            ))}
          </div>}
        </Card>

        <div className="rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">วันที่</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">หัวหน้าทีม</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">ลูกทีม</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">รวม</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">งาน</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">บ้านลูกค้า</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">บ้าน/พนักงาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((r) => (
                <tr key={r.service_date} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm">{fmtDate(r.service_date)}</td>
                  <td className="px-4 py-2 text-sm text-center tabular-nums">{r.lead_count}</td>
                  <td className="px-4 py-2 text-sm text-center tabular-nums">{r.member_count}</td>
                  <td className="px-4 py-2 text-sm text-center font-semibold tabular-nums">{r.total_tech_count}</td>
                  <td className="px-4 py-2 text-sm text-center tabular-nums">{r.job_count}</td>
                  <td className="px-4 py-2 text-sm text-center tabular-nums">{r.customer_count}</td>
                  <td className="px-4 py-2 text-sm text-center font-semibold text-primary tabular-nums">{r.ratio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailyTechDeploymentPage;
