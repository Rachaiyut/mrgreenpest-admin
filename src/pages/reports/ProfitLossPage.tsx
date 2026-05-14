import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { ReportApi } from '../../api/report';
import { CurrencyDollarIcon, ChartPieIcon, DocumentChartBarIcon } from '../../assets/icons/Icons';

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">รายงานกำไร-ขาดทุน</h1>
          <p className="mt-1 text-slate-600">สรุปรายได้และค่าใช้จ่ายประจำเดือน</p>
        </div>
        <div className="flex gap-3 print:hidden">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium text-sm"
          >
            Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md shadow-green-500/25 font-medium text-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            พิมพ์รายงาน
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        <Card className="!p-3 sm:!p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-green-500 rounded-lg shrink-0">
              <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-green-600 font-medium truncate">รายได้รวม</p>
              <p className="text-base sm:text-xl font-bold text-green-800 truncate">{loading ? '-' : fmt(data?.income.total || 0)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-3 sm:!p-4 bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-rose-500 rounded-lg shrink-0">
              <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-rose-600 font-medium truncate">ค่าใช้จ่ายรวม</p>
              <p className="text-base sm:text-xl font-bold text-rose-800 truncate">{loading ? '-' : fmt(data?.expenses.total || 0)}</p>
            </div>
          </div>
        </Card>
        <Card className={`!p-3 sm:!p-4 bg-gradient-to-br overflow-hidden ${(data?.netProfit || 0) >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-red-50 to-red-100 border-red-200'}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${(data?.netProfit || 0) >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}>
              <DocumentChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className={`text-xs sm:text-sm font-medium truncate ${(data?.netProfit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>กำไรสุทธิ</p>
              <p className={`text-base sm:text-xl font-bold truncate ${(data?.netProfit || 0) >= 0 ? 'text-blue-800' : 'text-red-800'}`}>{loading ? '-' : fmt(data?.netProfit || 0)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-3 sm:!p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-slate-500 rounded-lg shrink-0">
              <ChartPieIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-slate-600 font-medium truncate">อัตรากำไร</p>
              <p className={`text-base sm:text-xl font-bold truncate ${(data?.profitMargin || 0) >= 0 ? 'text-slate-800' : 'text-red-700'}`}>{loading ? '-' : `${data?.profitMargin || 0}%`}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="!p-4 flex-shrink-0 print:hidden">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full sm:w-44 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
          >
            {thaiMonths.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full sm:w-28 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Income & Expense Tables */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income by Method */}
        <div className="flex flex-col min-h-[400px] rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">รายได้ตามช่องทาง</h2>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : incomeByMethod.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-14 h-14 text-slate-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
                </svg>
                <p className="text-sm text-slate-500">ไม่พบข้อมูลรายได้</p>
              </div>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto border-b border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">ช่องทาง</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">จำนวน</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ยอดเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedIncome.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">{item.method || 'อื่นๆ'}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-600">{item.count}</td>
                      <td className="px-4 py-3 text-sm text-center text-green-700 font-semibold">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold">
                  <tr>
                    <td className="px-4 py-3 text-left text-slate-900">รวมรายได้</td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {incomeByMethod.reduce((s, i) => s + i.count, 0)}
                    </td>
                    <td className="px-4 py-3 text-center text-green-800">{fmt(data?.income.total || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-auto border-t border-slate-200">
              <Pagination
                currentPage={incomeCurrentPage}
                itemsPerPage={incomeItemsPerPage}
                totalItems={incomeByMethod.length}
                onPageChange={setIncomeCurrentPage}
                onItemsPerPageChange={(size) => { setIncomeItemsPerPage(size); setIncomeCurrentPage(1); }}
              />
            </div>
            </>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="flex flex-col min-h-[400px] rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">ค่าใช้จ่ายตามหมวดหมู่</h2>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : ((!data?.expenses.byCategory || data.expenses.byCategory.length === 0) && (!data || data.expenses.withdrawal === 0)) ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-14 h-14 text-slate-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
                </svg>
                <p className="text-sm text-slate-500">ไม่พบข้อมูลค่าใช้จ่าย</p>
              </div>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto border-b border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">หมวดหมู่</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">จำนวน</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ยอดเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedExpenses.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-600">{item.count}</td>
                      <td className="px-4 py-3 text-sm text-center text-red-600 font-semibold">{fmt(item.total)}</td>
                    </tr>
                  ))}
                  {data && data.expenses.withdrawal > 0 && (
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">ค่าใช้จ่ายจากการเบิกสินค้า</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-600">-</td>
                      <td className="px-4 py-3 text-sm text-center text-red-600 font-semibold">{fmt(data.expenses.withdrawal)}</td>
                    </tr>
                  )}
                </tbody>
                {data && data.expenses.total > 0 && (
                  <tfoot className="bg-slate-50 font-semibold">
                    <tr>
                      <td className="px-4 py-3 text-left text-slate-900">รวมค่าใช้จ่าย</td>
                      <td className="px-4 py-3 text-center text-slate-600"></td>
                      <td className="px-4 py-3 text-center text-red-800">{fmt(data.expenses.total)}</td>
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
            </>
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
