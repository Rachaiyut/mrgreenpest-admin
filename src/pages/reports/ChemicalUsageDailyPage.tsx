import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { ReportApi } from '../../api/report';

interface DailyRow { date: string; category: string; total_qty: number; total_cost: number; }
interface ProductRow { product_code: string; product_name: string; category_name: string; unit_name: string; total_qty: number; total_cost: number; }
interface Data {
  daily: DailyRow[];
  by_product: ProductRow[];
  summary: { month: number; year: number; this_month_qty: number; this_month_cost: number; prev_month_qty: number; prev_month_cost: number; qty_diff: number; qty_diff_pct: number; cost_diff: number; cost_diff_pct: number };
}

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('th-TH') : '-');
const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i] }));
const yearOptions = (() => { const y = new Date().getFullYear(); return Array.from({ length: 5 }, (_, i) => ({ value: String(y - i), label: String(y - i + 543) })); })();

const ChemicalUsageDailyPage: React.FC = () => {
  const n = new Date();
  const [month, setMonth] = useState(n.getMonth() + 1);
  const [year, setYear] = useState(n.getFullYear());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await ReportApi.getChemicalUsageDaily({ month, year }) as Data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, [month, year]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const s = data?.summary;
  const trendBadge = (pct: number) => pct > 0 ? 'text-red-700 bg-red-100' : pct < 0 ? 'text-green-700 bg-green-100' : 'text-slate-700 bg-slate-100';

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานการใช้สารเคมี/อุปกรณ์ รายวัน</h1>
            <p className="mt-1 text-slate-600">ดูการเบิกของรายวัน + เปรียบเทียบเดือนก่อนหน้า</p>
          </div>
          <Button variant="primary" onClick={() => ReportApi.downloadExcel('chemical-usage-daily', { month, year })}>ส่งออก Excel</Button>
        </div>

        <Card className="!p-4">
          <div className="flex gap-3">
            <div className="w-32"><DropdownSelect value={String(month)} onChange={(v) => setMonth(Number(v))} options={monthOptions} /></div>
            <div className="w-32"><DropdownSelect value={String(year)} onChange={(v) => setYear(Number(v))} options={yearOptions} /></div>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="!p-4">
            <p className="text-xs text-slate-500 font-medium">จำนวนเดือนนี้</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{fmt(s?.this_month_qty || 0)}</p>
            {s && <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${trendBadge(s.qty_diff_pct)}`}>{s.qty_diff_pct > 0 ? '+' : ''}{s.qty_diff_pct}% vs เดือนก่อน</span>}
          </Card>
          <Card className="!p-4">
            <p className="text-xs text-slate-500 font-medium">ต้นทุนเดือนนี้</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{fmt(s?.this_month_cost || 0)} ฿</p>
            {s && <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${trendBadge(s.cost_diff_pct)}`}>{s.cost_diff_pct > 0 ? '+' : ''}{s.cost_diff_pct}% vs เดือนก่อน</span>}
          </Card>
          <Card className="!p-4 bg-slate-50">
            <p className="text-xs text-slate-500 font-medium">จำนวนเดือนก่อน</p>
            <p className="text-2xl font-bold text-slate-600 mt-1">{fmt(s?.prev_month_qty || 0)}</p>
          </Card>
          <Card className="!p-4 bg-slate-50">
            <p className="text-xs text-slate-500 font-medium">ต้นทุนเดือนก่อน</p>
            <p className="text-2xl font-bold text-slate-600 mt-1">{fmt(s?.prev_month_cost || 0)} ฿</p>
          </Card>
        </div>

        {/* Daily breakdown */}
        <Card className="!p-4">
          <p className="font-semibold text-slate-800 mb-3">การใช้รายวัน (แยกตามหมวด)</p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">วันที่</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">หมวด</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">จำนวน</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">ต้นทุน (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={4} className="text-center py-6 text-slate-400">กำลังโหลด...</td></tr>
                : (data?.daily.length === 0) ? <tr><td colSpan={4} className="text-center py-6 text-slate-400">ไม่พบข้อมูล</td></tr>
                : data?.daily.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2 text-sm">{r.category}</td>
                    <td className="px-4 py-2 text-sm text-right tabular-nums">{fmt(r.total_qty)}</td>
                    <td className="px-4 py-2 text-sm text-right tabular-nums">{fmt(r.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* By product */}
        <Card className="!p-4">
          <p className="font-semibold text-slate-800 mb-3">สรุปรายสินค้า</p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">รหัส</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">ชื่อสินค้า</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">หมวด</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600">หน่วย</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">จำนวน</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">ต้นทุน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.by_product.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm font-medium text-primary">{r.product_code}</td>
                    <td className="px-4 py-2 text-sm">{r.product_name}</td>
                    <td className="px-4 py-2 text-sm">{r.category_name || '-'}</td>
                    <td className="px-4 py-2 text-sm text-center">{r.unit_name || '-'}</td>
                    <td className="px-4 py-2 text-sm text-right tabular-nums">{fmt(r.total_qty)}</td>
                    <td className="px-4 py-2 text-sm text-right tabular-nums">{fmt(r.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ChemicalUsageDailyPage;
