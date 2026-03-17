import React, { useMemo, useState, useEffect } from 'react';
import { ClipboardDocumentListIcon } from '../../assets/icons/Icons';
import { Expense } from '@/src/types/entity/financial.interface';
import { ExpenseApi } from '@/src/api/expense';

const DirectExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setIsLoading(true);
        const res = await ExpenseApi.getAll();
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
  const processedData = useMemo(() => {
    return expenses
      .filter((item) => {
        const d = new Date(item.date);
        const matchesDate =
          d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        const matchesSearch =
          item.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.wallet.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDate && matchesSearch;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [expenses, selectedMonth, selectedYear, searchTerm]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/20">
            <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              รายงานค่าใช้จ่ายทางตรง
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              สรุปค่าใช้จ่ายต้นทุนบริการและวัสดุอุปกรณ์
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium text-sm">
            Export Excel
          </button>
          <button className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md shadow-orange-500/25 font-medium text-sm flex items-center gap-2">
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
              placeholder="ค้นหาตามเลขที่บิล, รายละเอียด, หรือกระเป๋าเงิน..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm bg-slate-50/50"
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
                <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50/80 z-10 whitespace-nowrap">
                  วันที่
                </th>
                <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Invoice No.
                </th>
                <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  รายละเอียด
                </th>
                <th className="px-5 py-3.5 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  จำนวน
                </th>
                <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  หน่วย
                </th>
                <th className="px-5 py-3.5 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  ราคา/หน่วย
                </th>
                <th className="px-5 py-3.5 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  รวม (ไม่รวม VAT)
                </th>
                <th className="px-5 py-3.5 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  ยอดรวม (Inc VAT)
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-emerald-700 uppercase tracking-wider bg-emerald-50/50 whitespace-nowrap">
                  ยอดจ่ายจริง
                </th>
                <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
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
                    <td className="px-5 py-3.5 text-sm text-blue-600 font-medium whitespace-nowrap">
                      {row.invoiceNo}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700">
                      {row.details}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right text-slate-700 whitespace-nowrap">
                      {row.quantity}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                      {row.unit}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right text-slate-700 whitespace-nowrap">
                      {row.unitPrice.toLocaleString('th-TH')}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right text-slate-900 font-medium whitespace-nowrap">
                      {row.totalExclVat.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right text-slate-600 whitespace-nowrap">
                      {row.totalInclVat.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right text-emerald-700 font-bold bg-emerald-50/30 whitespace-nowrap">
                      {row.netPaidWht.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                      {row.wallet}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={10}
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
                      <span>ไม่พบรายการค่าใช้จ่ายทางตรงในเดือนนี้</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {processedData.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-4 text-right text-sm text-slate-700"
                  >
                    รวมทั้งสิ้น
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-slate-900 whitespace-nowrap">
                    {processedData
                      .reduce((sum, item) => sum + item.totalExclVat, 0)
                      .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-slate-900 whitespace-nowrap">
                    {processedData
                      .reduce((sum, item) => sum + item.totalInclVat, 0)
                      .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-emerald-700 bg-emerald-50/50 font-bold whitespace-nowrap">
                    {processedData
                      .reduce((sum, item) => sum + item.netPaidWht, 0)
                      .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
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

export default DirectExpensesPage;
