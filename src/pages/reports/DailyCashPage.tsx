import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { ReportApi } from '../../api/report';
import { CurrencyDollarIcon, WalletIcon } from '../../assets/icons/Icons';

interface DailyCashItem {
  id: string;
  account_id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'ADJUSTMENT';
  amount: number;
  balance_after: number;
  transaction_date: string;
  reference_code: string | null;
  reference_id: string | null;
  description: string | null;
}

interface DailyCashAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  current_balance: number;
}

interface DailyCashSummary {
  month: number;
  year: number;
  count: number;
  total_income: number;
  total_expense: number;
  net: number;
}

interface DailyCashData {
  items: DailyCashItem[];
  accounts: DailyCashAccount[];
  summary: DailyCashSummary;
}

const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const formatNumber = (value: number): string =>
  value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('th-TH');
};

const typeLabel: Record<DailyCashItem['type'], string> = {
  DEPOSIT: 'รับเงิน',
  WITHDRAW: 'จ่ายเงิน',
  TRANSFER: 'โอน',
  ADJUSTMENT: 'ปรับปรุง',
};

const DailyCashPage: React.FC = () => {
  const [data, setData] = useState<DailyCashData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedMonth, selectedYear, selectedAccountId]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await ReportApi.getDailyCash({
          month: selectedMonth,
          year: selectedYear,
          search: searchTerm || undefined,
          account_id: selectedAccountId || undefined,
        });
        setData(result as DailyCashData);
      } catch (error) {
        console.error('Failed to fetch daily cash report:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [selectedMonth, selectedYear, searchTerm, selectedAccountId]);

  const handleExportExcel = async () => {
    try {
      await ReportApi.downloadExcel('daily-cash', {
        month: selectedMonth,
        year: selectedYear,
        search: searchTerm || undefined,
        ...(selectedAccountId ? { account_id: selectedAccountId } : {}),
      });
    } catch (error) {
      console.error('Failed to export Excel:', error);
    }
  };

  const items = data?.items ?? [];
  const accounts = data?.accounts ?? [];
  const summary = data?.summary ?? {
    month: selectedMonth,
    year: selectedYear,
    count: 0,
    total_income: 0,
    total_expense: 0,
    net: 0,
  };
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex-1 flex flex-col">
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">บัญชีเงินสดรายวัน</h1>
          <p className="mt-1 text-slate-600">รายงานการเคลื่อนไหวของเงินสดประจำวัน (จากบัญชีที่เปิดใช้งาน)</p>
          <p className="hidden print:block text-slate-700 text-sm mt-1">
            ประจำเดือน {thaiMonths[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <div className="flex gap-3 print:hidden">
          <button
            onClick={handleExportExcel}
            disabled={items.length === 0}
            className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 print:hidden">
        <Card className="!p-3 sm:!p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-green-500 rounded-lg shrink-0">
              <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-green-600 font-medium truncate">รายรับรวม</p>
              <p className="text-base sm:text-xl font-bold text-green-800 truncate">{formatNumber(summary.total_income)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-3 sm:!p-4 bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-rose-500 rounded-lg shrink-0">
              <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-rose-600 font-medium truncate">รายจ่ายรวม</p>
              <p className="text-base sm:text-xl font-bold text-rose-800 truncate">{formatNumber(summary.total_expense)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-3 sm:!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-blue-500 rounded-lg shrink-0">
              <WalletIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-blue-600 font-medium truncate">คงเหลือสุทธิ</p>
              <p className="text-base sm:text-xl font-bold text-blue-800 truncate">{formatNumber(summary.net)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="!p-4 flex-shrink-0 print:hidden">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full">
          <div className="relative w-full sm:flex-1 sm:min-w-[280px]">
            <input
              type="search"
              placeholder="ค้นหารายการ, รหัสอ้างอิง, หรือชื่อบัญชี"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
          >
            <option value="">ทุกบัญชี</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>{acc.account_name}</option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full sm:w-40 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
          >
            {thaiMonths.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full sm:w-28 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Table Section */}
      <div className="flex-1 flex flex-col min-h-[400px] rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-14 h-14 text-slate-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
              </svg>
              <p className="text-sm text-slate-500">ไม่พบรายการเคลื่อนไหวในเดือนนี้</p>
            </div>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto border-b border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 shadow-sm">ลำดับ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">วันที่</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">บัญชี</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">อ้างอิง</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">รายการ</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ประเภท</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-green-700 uppercase tracking-wider bg-green-50">รายรับ</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">รายจ่าย</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">คงเหลือ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedItems.map((row, idx) => {
                  const isIncome = row.type === 'DEPOSIT';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-700 text-center sticky left-0 bg-white shadow-sm">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(row.transaction_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">{row.account_name}</td>
                      <td className="px-4 py-3 text-sm text-blue-600">{row.reference_code ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.description ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {typeLabel[row.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center bg-green-50/50 text-green-700 font-bold">
                        {isIncome ? formatNumber(row.amount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-red-600 font-medium">
                        {!isIncome ? formatNumber(row.amount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-900 font-bold">
                        {formatNumber(row.balance_after)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-left text-slate-900">รวมทั้งสิ้น</td>
                  <td className="px-4 py-3 text-center text-green-800">{formatNumber(summary.total_income)}</td>
                  <td className="px-4 py-3 text-center text-red-800">{formatNumber(summary.total_expense)}</td>
                  <td className="px-4 py-3 text-center text-slate-900">{formatNumber(summary.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-auto border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={items.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
            />
          </div>
          </>
        )}
      </div>
    </div>
    </div>
  );
};

export default DailyCashPage;
