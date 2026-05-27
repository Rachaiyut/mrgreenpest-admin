import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { ReportApi } from '../../api/report';

interface Row { tech_id: string; tech_name: string; nick_name: string; payment_count: number; payment_amount: number; chemical_qty: number; chemical_cost: number; }
interface Data { items: Row[]; summary: { month: number; year: number; tech_count: number; total_payment_count: number; total_payment_amount: number; total_chemical_qty: number; total_chemical_cost: number } }

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i] }));
const yearOptions = (() => { const y = new Date().getFullYear(); return Array.from({ length: 5 }, (_, i) => ({ value: String(y - i), label: String(y - i + 543) })); })();

const TechLeadActivityPage: React.FC = () => {
  const n = new Date();
  const [month, setMonth] = useState(n.getMonth() + 1);
  const [year, setYear] = useState(n.getFullYear());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await ReportApi.getTechLeadActivity({ month, year }) as Data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, [month, year]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const items = data?.items || [];
  const s = data?.summary;

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานหัวหน้าทีม: เก็บเงิน + ใช้สารเคมี</h1>
            <p className="mt-1 text-slate-600">สรุปรายชื่อหัวหน้าทีม จำนวน/มูลค่าการเก็บเงิน + ปริมาณสารเคมีในเดือน</p>
          </div>
          <Button variant="primary" onClick={() => ReportApi.downloadExcel('tech-lead-activity', { month, year })}>ส่งออก Excel</Button>
        </div>

        <Card className="!p-4">
          <div className="flex gap-3">
            <div className="w-32"><DropdownSelect value={String(month)} onChange={(v) => setMonth(Number(v))} options={monthOptions} /></div>
            <div className="w-32"><DropdownSelect value={String(year)} onChange={(v) => setYear(Number(v))} options={yearOptions} /></div>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="!p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <p className="text-xs text-slate-600 font-medium">หัวหน้าทีม</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{s?.tech_count ?? 0} คน</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <p className="text-xs text-blue-700 font-medium">การเก็บเงินรวม</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{s?.total_payment_count ?? 0} ครั้ง</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <p className="text-xs text-emerald-700 font-medium">มูลค่ารวม</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{fmt(s?.total_payment_amount || 0)} ฿</p>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <p className="text-xs text-amber-700 font-medium">ต้นทุนสารเคมี</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{fmt(s?.total_chemical_cost || 0)} ฿</p>
          </Card>
        </div>

        <div className="rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">หัวหน้าทีม</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ชื่อเล่น</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">การเก็บเงิน</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">มูลค่ารวม (฿)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">จำนวนสารเคมี</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">ต้นทุนสารเคมี (฿)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="text-center py-10 text-slate-400">กำลังโหลด...</td></tr>
              : items.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-slate-400">ไม่พบข้อมูล</td></tr>
              : items.map((r) => (
                <tr key={r.tech_id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm font-medium text-slate-800">{r.tech_name || '-'}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{r.nick_name || '-'}</td>
                  <td className="px-4 py-2 text-sm text-center tabular-nums">{r.payment_count}</td>
                  <td className="px-4 py-2 text-sm text-right font-semibold text-emerald-700 tabular-nums">{fmt(r.payment_amount)}</td>
                  <td className="px-4 py-2 text-sm text-right tabular-nums">{fmt(r.chemical_qty)}</td>
                  <td className="px-4 py-2 text-sm text-right text-amber-700 tabular-nums">{fmt(r.chemical_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TechLeadActivityPage;
