import React, { useState, useEffect, useCallback } from 'react';
import { Pagination } from '../../components/common/Pagination';
import { ReportApi } from '../../api/report';

interface ProfitLossData {
  income: {
    total: number;
    byMethod: Array<{ method: string; total: number; count: number }>;
  };
  expenses: {
    total: number;
    direct: number;
    withdrawal: number;
    byCategory: Array<{ category: string; total: number; count: number }>;
  };
  netProfit: number;
  profitMargin: number;
  monthlyTrend: Array<{ month: string; income: number }>;
}

const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2 });

const ProfitLossPage: React.FC = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [incomeCurrentPage, setIncomeCurrentPage] = useState(1);
  const [incomeItemsPerPage, setIncomeItemsPerPage] = useState(10);
  const [expenseCurrentPage, setExpenseCurrentPage] = useState(1);
  const [expenseItemsPerPage, setExpenseItemsPerPage] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ReportApi.getProfitLoss({ month, year });
      setData(result);
    } catch (err) {
      console.error('Failed to fetch profit-loss report:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => { setIncomeCurrentPage(1); setExpenseCurrentPage(1); }, [month, year]);

  const incomeByMethod = data?.income.byMethod || [];
  const paginatedIncome = incomeByMethod.slice((incomeCurrentPage - 1) * incomeItemsPerPage, incomeCurrentPage * incomeItemsPerPage);
  const expenseByCategory = data?.expenses.byCategory || [];
  const paginatedExpenses = expenseByCategory.slice((expenseCurrentPage - 1) * expenseItemsPerPage, expenseCurrentPage * expenseItemsPerPage);

  const handleExportExcel = () => {
    ReportApi.downloadExcel('profit-loss', { month, year });
  };

  return (
    <div className="flex-1 flex flex-col">
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">รายงานกำไร-ขาดทุน</h1>
            <p className="text-slate-500 text-sm mt-0.5">สรุปรายได้และค่าใช้จ่ายประจำเดือน</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium text-sm"
          >
            Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 shadow-md shadow-indigo-500/25 font-medium text-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            พิมพ์รายงาน
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="w-full lg:w-44">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">เดือน</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm bg-slate-50/50"
            >
              {thaiMonths.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="w-full lg:w-28">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">ปี</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm bg-slate-50/50"
            >
              {[2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm text-green-600 font-medium">รายได้รวม</p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {loading ? '-' : fmt(data?.income.total || 0)}
          </p>
          <p className="text-xs text-green-500 mt-1">บาท</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-sm text-red-600 font-medium">ค่าใช้จ่ายรวม</p>
          <p className="text-2xl font-bold text-red-700 mt-1">
            {loading ? '-' : fmt(data?.expenses.total || 0)}
          </p>
          <p className="text-xs text-red-500 mt-1">บาท</p>
        </div>
        <div className={`${(data?.netProfit || 0) >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'} border rounded-xl p-5`}>
          <p className={`text-sm font-medium ${(data?.netProfit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            กำไรสุทธิ
          </p>
          <p className={`text-2xl font-bold mt-1 ${(data?.netProfit || 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
            {loading ? '-' : fmt(data?.netProfit || 0)}
          </p>
          <p className={`text-xs mt-1 ${(data?.netProfit || 0) >= 0 ? 'text-blue-500' : 'text-red-500'}`}>บาท</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-600 font-medium">อัตรากำไร</p>
          <p className={`text-2xl font-bold mt-1 ${(data?.profitMargin || 0) >= 0 ? 'text-slate-800' : 'text-red-700'}`}>
            {loading ? '-' : `${data?.profitMargin || 0}%`}
          </p>
          <p className="text-xs text-slate-400 mt-1">Profit Margin</p>
        </div>
      </div>

      {/* Income & Expense Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income by Method */}
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200 bg-green-50/50">
            <h2 className="text-lg font-semibold text-slate-800">รายได้ตามช่องทาง</h2>
          </div>
          <div className="overflow-x-auto border-b border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">ช่องทาง</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">จำนวน</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">ยอดเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      <div className="flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                    </td>
                  </tr>
                ) : paginatedIncome.length > 0 ? (
                  paginatedIncome.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">{item.method || 'อื่นๆ'}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-600">{item.count}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-700 font-semibold">{fmt(item.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">ไม่พบข้อมูล</td></tr>
                )}
              </tbody>
              {incomeByMethod.length > 0 && (
                <tfoot className="bg-green-50 font-semibold">
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-900">รวมรายได้</td>
                    <td className="px-4 py-3 text-sm text-center text-slate-600">
                      {incomeByMethod.reduce((s, i) => s + i.count, 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-800">{fmt(data?.income.total || 0)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {incomeByMethod.length > 0 && (
            <div className="mt-auto border-t border-slate-200">
              <Pagination
                currentPage={incomeCurrentPage}
                itemsPerPage={incomeItemsPerPage}
                totalItems={incomeByMethod.length}
                onPageChange={setIncomeCurrentPage}
                onItemsPerPageChange={(size) => { setIncomeItemsPerPage(size); setIncomeCurrentPage(1); }}
              />
            </div>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200 bg-red-50/50">
            <h2 className="text-lg font-semibold text-slate-800">ค่าใช้จ่ายตามหมวดหมู่</h2>
          </div>
          <div className="overflow-x-auto border-b border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">หมวดหมู่</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">จำนวน</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">ยอดเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      <div className="flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {paginatedExpenses.length > 0 ? (
                      paginatedExpenses.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-900 font-medium">{item.category}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-600">{item.count}</td>
                          <td className="px-4 py-3 text-sm text-right text-red-600 font-semibold">{fmt(item.total)}</td>
                        </tr>
                      ))
                    ) : null}
                    {data && data.expenses.withdrawal > 0 && (
                      <tr className="hover:bg-slate-50 transition-colors bg-orange-50/30">
                        <td className="px-4 py-3 text-sm text-slate-900 font-medium">ค่าใช้จ่ายจากการเบิกสินค้า</td>
                        <td className="px-4 py-3 text-sm text-center text-slate-600">-</td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 font-semibold">{fmt(data.expenses.withdrawal)}</td>
                      </tr>
                    )}
                    {(!data?.expenses.byCategory || data.expenses.byCategory.length === 0) && (!data || data.expenses.withdrawal === 0) && (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">ไม่พบข้อมูล</td></tr>
                    )}
                  </>
                )}
              </tbody>
              {data && data.expenses.total > 0 && (
                <tfoot className="bg-red-50 font-semibold">
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-900">รวมค่าใช้จ่าย</td>
                    <td className="px-4 py-3 text-sm text-center text-slate-600"></td>
                    <td className="px-4 py-3 text-sm text-right text-red-800">{fmt(data.expenses.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {expenseByCategory.length > 0 && (
            <div className="mt-auto border-t border-slate-200">
              <Pagination
                currentPage={expenseCurrentPage}
                itemsPerPage={expenseItemsPerPage}
                totalItems={expenseByCategory.length}
                onPageChange={setExpenseCurrentPage}
                onItemsPerPageChange={(size) => { setExpenseItemsPerPage(size); setExpenseCurrentPage(1); }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Net Profit Summary */}
      {data && (
        <div className={`rounded-xl p-6 border ${data.netProfit >= 0 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'}`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-sm font-medium text-slate-600">สรุปผลประกอบการ ประจำเดือน{thaiMonths[month - 1]} {year}</p>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-sm text-slate-500">รายได้</span>
                <span className="text-lg font-semibold text-green-700">{fmt(data.income.total)}</span>
                <span className="text-slate-400">-</span>
                <span className="text-sm text-slate-500">ค่าใช้จ่าย</span>
                <span className="text-lg font-semibold text-red-600">{fmt(data.expenses.total)}</span>
                <span className="text-slate-400">=</span>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-slate-500">{data.netProfit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'}</p>
              <p className={`text-3xl font-bold ${data.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {fmt(Math.abs(data.netProfit))}
              </p>
              <p className="text-sm text-slate-500 mt-1">อัตรากำไร {data.profitMargin}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default ProfitLossPage;
