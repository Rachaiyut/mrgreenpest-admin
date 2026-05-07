import React, { useState, useEffect, useCallback } from 'react';
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

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => { setCurrentPage(1); }, [search, days]);

  const summary = data?.summary;
  const items = data?.items || [];
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex-1 flex flex-col">
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in flex flex-col flex-1">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-7 h-7 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              รายงานสัญญาใกล้หมดอายุ
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              แสดงสัญญาที่กำลังจะหมดอายุเพื่อวางแผนต่อสัญญา
            </p>
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
            onClick={handlePrint}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-200 shadow-md shadow-amber-500/25 font-medium text-sm flex items-center gap-2"
          >
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
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              ค้นหา
            </label>
            <input
              type="text"
              placeholder="ค้นหาเลขที่สัญญา, ชื่อลูกค้า, รหัสลูกค้า..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm bg-slate-50/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-48">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              แสดงสัญญาที่หมดภายใน
            </label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm bg-slate-50/50"
            >
              <option value={30}>30 วัน</option>
              <option value={60}>60 วัน</option>
              <option value={90}>90 วัน</option>
            </select>
          </div>
        </div>
      </div>

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
      <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
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
              ) : paginatedItems.length > 0 ? (
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
              ) : (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-10 h-10 text-slate-300"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                        />
                      </svg>
                      <p className="text-sm">ไม่พบข้อมูลสัญญาที่ใกล้หมดอายุ</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
