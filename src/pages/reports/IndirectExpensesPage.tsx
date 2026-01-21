import React, { useMemo, useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
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
  }, [selectedMonth, selectedYear, searchTerm]);

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
    <div className="space-y-6 animate-fade-in text-nowrap pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <ClipboardDocumentListIcon className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              รายงานค่าใช้จ่ายทางอ้อม
            </h1>
            <p className="text-slate-500 mt-1">
              สรุปค่าใช้จ่ายประเภทต่างๆ ประจำเดือน
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm font-medium">
            Export Excel
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 mr-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 6.75h10.5M6.75 3h10.5c.828 0 1.5.672 1.5 1.5v3c0 .828-.672 1.5-1.5 1.5h-10.5c-.828 0-1.5-.672-1.5-1.5v-3c0-.828.672-1.5 1.5-1.5m3 11.25H16.5m-9.75 0h9.75M4.5 9.75h15a2.25 2.25 0 012.25 2.25v6a2.25 2.25 0 01-2.25 2.25h-1.5v-2.25a2.25 2.25 0 00-2.25-2.25h-9a2.25 2.25 0 00-2.25 2.25V20.25h-1.5a2.25 2.25 0 01-2.25-2.25v-6a2.25 2.25 0 012.25-2.25z"
              />
            </svg>
            พิมพ์รายงาน
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow w-full md:w-auto">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ค้นหา
            </label>
            <input
              type="text"
              placeholder="ค้นหาตามรายการ, หมวดหมู่, หรือกระเป๋าเงิน..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              เดือน
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              {thaiMonths.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-32">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ปี
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              {[2023, 2024, 2025].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Table 1 */}
        <Card className="!p-0 overflow-hidden shadow-sm border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">
              สรุปรายการแยกตามประเภท Cost
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">หมวดหมู่</th>
                  <th className="px-4 py-3 font-semibold">รายการ</th>
                  <th className="px-4 py-3 font-semibold text-right">มูลค่า</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {costTypeSummary.length > 0 ? (
                  costTypeSummary.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-600">
                        {item.type}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
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
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
                {costTypeSummary.length > 0 && (
                  <tr className="bg-slate-50 font-bold border-t border-slate-200">
                    <td
                      colSpan={2}
                      className="px-4 py-3 text-right text-slate-700"
                    >
                      รวมทั้งหมด
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {totalExpense.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Table 2 */}
        <Card className="!p-0 overflow-hidden shadow-sm border border-slate-200 h-fit">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">
              สรุปรายการแยกตามกระเป๋า
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">ประเภท</th>
                  <th className="px-4 py-3 font-semibold text-right">มูลค่า</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {walletSummary.length > 0 ? (
                  walletSummary.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{item.type}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
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
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
                {walletSummary.length > 0 && (
                  <tr className="bg-slate-50 font-bold border-t border-slate-200">
                    <td className="px-4 py-3 text-right text-slate-700">
                      รวมทั้งหมด
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {totalExpense.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Table 3 */}
      <Card className="!p-0 overflow-hidden shadow-sm border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="font-semibold text-slate-800">
            รายละเอียดค่าใช้จ่ายแต่ละหมวดหมู่
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">หมวดหมู่</th>
                <th className="px-4 py-3 font-semibold">รายการ</th>
                <th className="px-4 py-3 font-semibold text-right">มูลค่า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detailsByCategory.length > 0 ? (
                detailsByCategory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-600">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.item}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
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
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
              {detailsByCategory.length > 0 && (
                <tr className="bg-slate-50 font-bold border-t border-slate-200">
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-right text-slate-700"
                  >
                    รวมทั้งหมด
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {totalExpense.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default IndirectExpensesPage;
