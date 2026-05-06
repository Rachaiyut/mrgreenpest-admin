import React, { useMemo, useState, useEffect } from 'react';
import { ClipboardDocumentListIcon } from '../../assets/icons/Icons';
import { WalletTransaction } from '@/src/types/entity/financial.interface';
import { WalletTransactionApi } from '@/src/api/wallet-transaction';

interface CashTransaction extends WalletTransaction {
  income: number;
  expense: number;
  wallet: string;
  item: string;
  category: string;
  balance: number;
}

const DailyCashPage: React.FC = () => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        const res = await WalletTransactionApi.getAll();
        setTransactions(res.data || []);
      } catch (error) {
        console.error('Failed to fetch transactions', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();
  }, []);

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

  const processedData = useMemo(() => {
    // Filter first
    const filtered = transactions.filter((t) => {
      const d = new Date(t.date);
      const matchMonth = d.getMonth() === selectedMonth;
      const matchYear = d.getFullYear() === selectedYear;
      const matchSearch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.wallet_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchMonth && matchYear && matchSearch;
    });

    // Sort by date
    filtered.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate running balance
    let currentBalance = 0;
    return filtered.map((item) => {
      const income = item.type === 'รายรับ' ? item.amount : 0;
      const expense = item.type === 'รายจ่าย' ? item.amount : 0;
      currentBalance = currentBalance + income - expense;
      return {
        ...item,
        income,
        expense,
        balance: currentBalance,
        item: item.description,
        category: item.type, // Or some other logic
        wallet: item.wallet_name || 'N/A',
      };
    });
  }, [selectedMonth, selectedYear, searchTerm, transactions]);

  const totalIncome = processedData.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = processedData.reduce(
    (sum, item) => sum + item.expense,
    0
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
            <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              บัญชีเงินสดรายวัน
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              รายงานการเคลื่อนไหวของเงินสดประจำวัน
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium text-sm">
            Export Excel
          </button>
          <button className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md shadow-blue-500/25 font-medium text-sm flex items-center gap-2">
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
              placeholder="กรอกรายการ, หมวดหมู่, หรือกระเป๋าเงิน..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm bg-slate-50/50"
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

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50/80 z-10">
                  วันที่
                </th>
                <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  รายการ
                </th>
                <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  หมวดหมู่
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  รายรับ
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-red-600 uppercase tracking-wider">
                  รายจ่าย
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  คงเหลือ
                </th>
                <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  กระเป๋าเงิน
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedData.length > 0 ? (
                processedData.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm text-slate-900 sticky left-0 bg-white font-medium whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700">
                      {row.item}
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                        {row.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-emerald-600 text-right font-semibold">
                      {row.income > 0 ? `+${row.income.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-red-600 text-right font-semibold">
                      {row.expense > 0
                        ? `-${row.expense.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-900 text-right font-bold bg-slate-50/50">
                      {row.balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">
                      {row.wallet}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
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
                      <span>ไม่พบรายการเคลื่อนไหวในเดือนนี้</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {processedData.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-4 text-right text-sm text-slate-700"
                  >
                    รวมทั้งสิ้น
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-emerald-700 bg-emerald-50/50">
                    +{totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-red-700 bg-red-50/50">
                    -{totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-slate-900 bg-slate-100/80 font-bold">
                    {(totalIncome - totalExpense).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="bg-slate-50"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailyCashPage;
