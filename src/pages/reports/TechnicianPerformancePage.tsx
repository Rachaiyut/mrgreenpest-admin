import React, { useState, useEffect, useCallback } from 'react';
import { Pagination } from '../../components/common/Pagination';
import { ReportApi } from '../../api/report';

interface TechnicianItem {
  tech_id: string;
  tech_code: string;
  tech_name: string;
  total_jobs: number;
  completed_jobs: number;
  cancelled_jobs: number;
  in_progress_jobs: number;
  completion_rate: number;
  avg_duration_minutes: number;
}

interface TechnicianSummary {
  total_techs: number;
  total_jobs: number;
  total_completed: number;
  overall_completion_rate: number;
}

interface TechnicianPerformanceData {
  items: TechnicianItem[];
  summary: TechnicianSummary;
}

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

const TechnicianPerformancePage: React.FC = () => {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TechnicianPerformanceData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ReportApi.getTechnicianPerformance({
        month,
        year,
        search: search || undefined,
      });
      setData(result);
    } catch (error) {
      console.error('Failed to fetch technician performance:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month, year, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportExcel = async () => {
    try {
      await ReportApi.downloadExcel('technician-performance', { month, year });
    } catch (error) {
      console.error('Failed to export excel:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletionRateBadge = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 text-green-800';
    if (rate >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  useEffect(() => { setCurrentPage(1); }, [search, month, year]);

  const items = data?.items || [];
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const summary = data?.summary || {
    total_techs: 0,
    total_jobs: 0,
    total_completed: 0,
    overall_completion_rate: 0,
  };

  const totalAllJobs = items.reduce((sum, item) => sum + item.total_jobs, 0);
  const totalCompleted = items.reduce(
    (sum, item) => sum + item.completed_jobs,
    0
  );
  const totalInProgress = items.reduce(
    (sum, item) => sum + item.in_progress_jobs,
    0
  );
  const totalCancelled = items.reduce(
    (sum, item) => sum + item.cancelled_jobs,
    0
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
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
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              รายงานประสิทธิภาพช่าง
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              แสดงผลงานของช่างเทคนิคประจำเดือน
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
            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md shadow-blue-500/25 font-medium text-sm flex items-center gap-2"
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
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              ค้นหา
            </label>
            <input
              type="text"
              placeholder="ค้นหาตามรหัสช่าง, ชื่อช่าง..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm bg-slate-50/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-44">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              เดือน
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm bg-slate-50/50"
            >
              {thaiMonths.map((m, i) => (
                <option key={i} value={i + 1}>
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
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-blue-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">จำนวนช่าง</p>
              <p className="text-2xl font-bold text-slate-800">
                {loading ? '-' : summary.total_techs.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-indigo-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">งานทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-800">
                {loading ? '-' : summary.total_jobs.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-green-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">งานสำเร็จ</p>
              <p className="text-2xl font-bold text-slate-800">
                {loading ? '-' : summary.total_completed.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-lg">
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
                  d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">อัตราสำเร็จรวม (%)</p>
              <p
                className={`text-2xl font-bold ${loading ? 'text-slate-800' : getCompletionRateColor(summary.overall_completion_rate)}`}
              >
                {loading
                  ? '-'
                  : `${summary.overall_completion_rate.toFixed(1)}%`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ลำดับ
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  รหัสช่าง
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ชื่อช่าง
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  งานทั้งหมด
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  สำเร็จ
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  กำลังดำเนินการ
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ยกเลิก
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  อัตราสำเร็จ (%)
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  เวลาเฉลี่ย (นาที)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg
                        className="animate-spin h-8 w-8 text-blue-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <p className="text-slate-500 text-sm">
                        กำลังโหลดข้อมูล...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => (
                  <tr
                    key={item.tech_id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-900 text-center">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                      {item.tech_code}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                      {item.tech_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                      {item.total_jobs.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 text-right font-medium">
                      {item.completed_jobs.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-yellow-600 text-right font-medium">
                      {item.in_progress_jobs.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right font-medium">
                      {item.cancelled_jobs.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCompletionRateBadge(item.completion_rate)}`}
                      >
                        {item.completion_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right">
                      {item.avg_duration_minutes.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    ไม่พบข้อมูลประสิทธิภาพช่างประจำเดือนนี้
                  </td>
                </tr>
              )}
            </tbody>
            {!loading && items.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-right text-slate-900"
                  >
                    รวมทั้งสิ้น
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {totalAllJobs.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-green-700">
                    {totalCompleted.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-yellow-700">
                    {totalInProgress.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-red-700">
                    {totalCancelled.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCompletionRateBadge(summary.overall_completion_rate)}`}
                    >
                      {summary.overall_completion_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!loading && items.length > 0 && (
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={items.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
          />
        )}
      </div>
    </div>
  );
};

export default TechnicianPerformancePage;
