import React, { useMemo, useState, useEffect } from 'react';
import { ClipboardDocumentListIcon } from '../../assets/icons/Icons';
import { IndirectExpense } from '@/src/types/entity/financial.interface';
import { IndirectExpenseApi } from '@/src/api/indirect-expense';

const IndirectExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<IndirectExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setIsLoading(true);
        const res = await IndirectExpenseApi.getAll();
        setExpenses(res.data || []);
      } catch (error) {
        console.error('Failed to fetch expenses', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpenses();
  }, []);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [searchTerm, setSearchTerm] = useState('');

  const thaiMonths = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ];

  // Filter Logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const d = new Date(exp.date);
      const matchesDate =
        d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      const matchesSearch =
        exp.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.wallet.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDate && matchesSearch;
    });
  }, [expenses, selectedMonth, selectedYear, searchTerm]);

  // Summary Logic
  const costTypeSummary = useMemo(() => {
    const summary: { type: string; category: string; amount: number }[] = [];
    filteredExpenses.forEach((exp) => {
      const existing = summary.find(
        (s) => s.type === exp.type && s.category === exp.category
      );
      if (existing) {
        existing.amount += exp.amount;
      } else {
        summary.push({
          type: exp.type,
          category: exp.category,
          amount: exp.amount,
        });
      }
    });
    return summary.sort((a, b) => a.type.localeCompare(b.type));
  }, [filteredExpenses]);

  const walletSummary = useMemo(() => {
    const summary: { type: string; amount: number }[] = [];
    filteredExpenses.forEach((exp) => {
      const existing = summary.find((s) => s.type === exp.wallet);
      if (existing) {
        existing.amount += exp.amount;
      } else {
        summary.push({ type: exp.wallet, amount: exp.amount });
      }
    });
    return summary;
  }, [filteredExpenses]);

  const detailsByCategory = useMemo(() => {
    return [...filteredExpenses].sort((a, b) =>
      a.category.localeCompare(b.category)
    );
  }, [filteredExpenses]);

  const totalExpense = filteredExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
            <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              รายงานค่าใช้จ่ายทางอ้อม
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              สรุปค่าใช้จ่ายประเภทต่างๆ ประจำเดือน
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium text-sm">
            Export Excel
          </button>
          <button className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-md shadow-purple-500/25 font-medium text-sm flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
              />
            </svg>
            พิมพ์รายงาน
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              ค้นหา
            </label>
            <input
              type="text"
              placeholder="ค้นหาตามรายการ, หมวดหมู่, หรือกระเป๋าเงิน..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm bg-slate-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-44">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              เดือน
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm bg-slate-50/50"
            >
              {thaiMonths.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full lg:w-28">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              ปี
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm bg-slate-50/50"
            >
              {[2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1 - Cost Type Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">
              สรุปรายการแยกตามประเภท Cost
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-600 uppercase bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">หมวดหมู่</th>
                  <th className="px-5 py-3.5 font-semibold">รายการ</th>
                  <th className="px-5 py-3.5 font-semibold text-right">
                    มูลค่า
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {costTypeSummary.length > 0 ? (
                  costTypeSummary.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-700">
                        {item.type}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {item.category}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                        {item.amount.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-8 text-center text-slate-400"
                    >
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
                {costTypeSummary.length > 0 && (
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                    <td
                      colSpan={2}
                      className="px-5 py-4 text-right text-sm text-slate-700"
                    >
                      รวมทั้งหมด
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-slate-900">
                      {totalExpense.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2 - Wallet Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">
              สรุปรายการแยกตามกระเป๋า
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-600 uppercase bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">ประเภท</th>
                  <th className="px-5 py-3.5 font-semibold text-right">
                    มูลค่า
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {walletSummary.length > 0 ? (
                  walletSummary.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-slate-700 font-medium">
                        {item.type}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                        {item.amount.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-5 py-8 text-center text-slate-400"
                    >
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
                {walletSummary.length > 0 && (
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                    <td className="px-5 py-4 text-right text-sm text-slate-700">
                      รวมทั้งหมด
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-slate-900">
                      {totalExpense.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Table 3 - Details by Category */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
          <h2 className="font-semibold text-slate-800">
            รายละเอียดค่าใช้จ่ายแต่ละหมวดหมู่
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 uppercase bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 font-semibold">หมวดหมู่</th>
                <th className="px-5 py-3.5 font-semibold">รายการ</th>
                <th className="px-5 py-3.5 font-semibold text-right">มูลค่า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detailsByCategory.length > 0 ? (
                detailsByCategory.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {item.category}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{item.item}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                      {item.amount.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-12 text-center text-slate-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className="w-12 h-12 text-slate-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>ไม่พบข้อมูล</span>
                    </div>
                  </td>
                </tr>
              )}
              {detailsByCategory.length > 0 && (
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <td
                    colSpan={2}
                    className="px-5 py-4 text-right text-sm text-slate-700"
                  >
                    รวมทั้งหมด
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-slate-900">
                    {totalExpense.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IndirectExpensesPage;
