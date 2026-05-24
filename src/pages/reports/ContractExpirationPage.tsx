import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { ReportApi } from '../../api/report';

interface ContractItem {
  id: string;
  code: string;
  customer_id: string;
  customer_name: string;
  total_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  service_type: string;
  contract_duration: number;
  primary_phone: string;
  email: string;
  customer_code: string;
  days_remaining: number;
}

interface ExpirationSummary {
  expire_30: { count: number; value: number };
  expire_60: { count: number; value: number };
  expire_90: { count: number; value: number };
  total: number;
}

interface ContractExpirationData {
  items: ContractItem[];
  summary: ExpirationSummary;
}

const formatNumber = (value: number) =>
  value.toLocaleString('th-TH', { minimumFractionDigits: 2 });

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('th-TH');
};

const getDaysRemainingColor = (days: number) => {
  if (days <= 30) return 'text-red-600 bg-red-50';
  if (days <= 60) return 'text-orange-600 bg-orange-50';
  return 'text-green-600 bg-green-50';
};

const ContractExpirationPage: React.FC = () => {
  const [days, setDays] = useState(90);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<ContractExpirationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ReportApi.getContractExpiration({ days, search });
      setData(result);
    } catch (error) {
      console.error('Failed to fetch contract expiration data:', error);
    } finally {
      setLoading(false);
    }
  }, [days, search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchData]);

  const handleExportExcel = async () => {
    try {
      await ReportApi.downloadExcel('contract-expiration', { days, search });
    } catch (error) {
      console.error('Failed to download Excel:', error);
    }
  };

  useEffect(() => { setCurrentPage(1); }, [search, days]);

  const summary = data?.summary;
  const items = data?.items || [];
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex-1 flex flex-col">
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            รายงานสัญญาใกล้หมดอายุ
          </h1>
          <p className="mt-1 text-slate-600">
            แสดงสัญญาที่กำลังจะหมดอายุเพื่อวางแผนต่อสัญญา
          </p>
        </div>
        <div className="flex gap-3 print:hidden">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium text-sm"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="!p-4 flex-shrink-0 print:hidden">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full">
          <div className="relative w-full sm:flex-1 sm:min-w-[280px]">
            <input
              type="search"
              placeholder="ค้นหาเลขที่สัญญา, ชื่อลูกค้า, รหัสลูกค้า"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full sm:w-48 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
          >
            <option value={30}>หมดภายใน 30 วัน</option>
            <option value={60}>หมดภายใน 60 วัน</option>
            <option value={90}>หมดภายใน 90 วัน</option>
          </select>
        </div>
      </Card>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-slate-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-slate-600">
                  หมดภายใน 30 วัน
                </span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {summary.expire_30.count}{' '}
                <span className="text-sm font-normal text-slate-500">
                  สัญญา
                </span>
              </p>
              <p className="text-sm text-slate-500 mt-1">
                มูลค่ารวม{' '}
                <span className="font-semibold text-red-600">
                  {formatNumber(summary.expire_30.value)}
                </span>{' '}
                บาท
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm font-medium text-slate-600">
                  หมดภายใน 31-60 วัน
                </span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {summary.expire_60.count}{' '}
                <span className="text-sm font-normal text-slate-500">
                  สัญญา
                </span>
              </p>
              <p className="text-sm text-slate-500 mt-1">
                มูลค่ารวม{' '}
                <span className="font-semibold text-orange-600">
                  {formatNumber(summary.expire_60.value)}
                </span>{' '}
                บาท
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-slate-600">
                  หมดภายใน 61-90 วัน
                </span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {summary.expire_90.count}{' '}
                <span className="text-sm font-normal text-slate-500">
                  สัญญา
                </span>
              </p>
              <p className="text-sm text-slate-500 mt-1">
                มูลค่ารวม{' '}
                <span className="font-semibold text-green-600">
                  {formatNumber(summary.expire_90.value)}
                </span>{' '}
                บาท
              </p>
            </div>
          </div>
        )
      )}

      {/* Data Table */}
      <div className="flex-1 flex flex-col min-h-[400px] rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
        <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-amber-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
            <h2 className="font-semibold text-slate-700">รายละเอียดสัญญา</h2>
          </div>
          {summary && (
            <span className="text-sm text-slate-500">
              ทั้งหมด {summary.total} สัญญา
            </span>
          )}
        </div>
        <div className="overflow-x-auto border-b border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  เลขที่สัญญา
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  รหัสลูกค้า
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ชื่อลูกค้า
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  เบอร์โทร
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  อีเมล
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ประเภทบริการ
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  วันเริ่มสัญญา
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  วันหมดสัญญา
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  เหลืออีก (วัน)
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  มูลค่าสัญญา
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-200 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-amber-700">
                      {item.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.customer_code}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {item.customer_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.primary_phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.service_type || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(item.start_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(item.end_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getDaysRemainingColor(item.days_remaining)}`}
                      >
                        {item.days_remaining} วัน
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 text-center">
                      {formatNumber(item.total_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && items.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-14 h-14 text-slate-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
              </svg>
              <p className="text-sm text-slate-500">ไม่พบข้อมูลสัญญาที่ใกล้หมดอายุ</p>
            </div>
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="mt-auto border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={items.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
            />
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default ContractExpirationPage;
