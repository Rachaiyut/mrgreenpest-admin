import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { ReportApi } from '../../api/report';

interface Item { id: string; code: string; customer_code: string; customer_name: string; start_date: string; end_date: string; status: string; total_amount: number; cohort: 'NEW' | 'EXISTING' }
interface CohortStat { total: number; renewed: number; amount: number; renewal_rate: number }
interface Data { items: Item[]; summary: { month: number; year: number; new_customer: CohortStat; existing: CohortStat; total: number } }

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 });
const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('th-TH') : '-');
const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i] }));
const yearOptions = (() => { const y = new Date().getFullYear(); return Array.from({ length: 5 }, (_, i) => ({ value: String(y - i), label: String(y - i + 543) })); })();

const ContractRenewalCohortPage: React.FC = () => {
  const n = new Date();
  const [month, setMonth] = useState(n.getMonth() + 1);
  const [year, setYear] = useState(n.getFullYear());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await ReportApi.getContractRenewalCohort({ month, year }) as Data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, [month, year]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => setCurrentPage(1), [month, year]);

  const items = data?.items || [];
  const paginated = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const s = data?.summary;

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานอัตราการต่อสัญญาของลูกค้าใหม่ หรือ ลูกค้าเดิม</h1>
            <p className="mt-1 text-slate-600">เปรียบเทียบจำนวนสัญญา + อัตราต่อสัญญาแยกตามกลุ่มลูกค้า</p>
          </div>
          <Button variant="primary" onClick={() => ReportApi.downloadExcel('contract-renewal-cohort', { month, year })}>ส่งออก Excel</Button>
        </div>

        <Card className="!p-4">
          <div className="flex gap-3">
            <div className="w-32"><DropdownSelect value={String(month)} onChange={(v) => setMonth(Number(v))} options={monthOptions} /></div>
            <div className="w-32"><DropdownSelect value={String(year)} onChange={(v) => setYear(Number(v))} options={yearOptions} /></div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="!p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <p className="text-sm text-blue-700 font-semibold mb-3">ลูกค้าใหม่</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-600">สัญญารวม</p>
                <p className="text-2xl font-bold text-blue-800">{s?.new_customer.total ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">ต่อสัญญา</p>
                <p className="text-2xl font-bold text-blue-800">{s?.new_customer.renewed ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">มูลค่า</p>
                <p className="text-lg font-bold text-blue-800">{fmt(s?.new_customer.amount || 0)} ฿</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">อัตราต่อ</p>
                <p className="text-2xl font-bold text-blue-800">{s?.new_customer.renewal_rate ?? 0}%</p>
              </div>
            </div>
          </Card>
          <Card className="!p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <p className="text-sm text-emerald-700 font-semibold mb-3">ลูกค้าเดิม</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-600">สัญญารวม</p>
                <p className="text-2xl font-bold text-emerald-800">{s?.existing.total ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">ต่อสัญญา</p>
                <p className="text-2xl font-bold text-emerald-800">{s?.existing.renewed ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">มูลค่า</p>
                <p className="text-lg font-bold text-emerald-800">{fmt(s?.existing.amount || 0)} ฿</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">อัตราต่อ</p>
                <p className="text-2xl font-bold text-emerald-800">{s?.existing.renewal_rate ?? 0}%</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">เลขที่สัญญา</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ลูกค้า</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">กลุ่ม</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">วันเริ่ม</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">วันสิ้นสุด</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">สถานะ</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">มูลค่า</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={7} className="text-center py-10 text-slate-400">กำลังโหลด...</td></tr>
                : paginated.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-slate-400">ไม่พบข้อมูล</td></tr>
                : paginated.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm font-medium text-primary">{it.code}</td>
                    <td className="px-4 py-2 text-sm">{it.customer_name || '-'}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${it.cohort === 'NEW' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {it.cohort === 'NEW' ? 'ลูกค้าใหม่' : 'ลูกค้าเดิม'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{fmtDate(it.start_date)}</td>
                    <td className="px-4 py-2 text-sm">{fmtDate(it.end_date)}</td>
                    <td className="px-4 py-2 text-center text-xs text-slate-700">{it.status}</td>
                    <td className="px-4 py-2 text-sm text-right tabular-nums">{fmt(it.total_amount)}</td>
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

export default ContractRenewalCohortPage;
