import React, { useState, useEffect, useCallback } from 'react';
import { Pagination } from '../../components/common/Pagination';
import { ReportApi } from '../../api/report';

interface SalesPipelineData {
  assessments: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    in_progress: number;
  };
  quotations: {
    total: number;
    signed: number;
    approved: number;
    pending: number;
    cancelled: number;
    follow_up: number;
    signed_value: number;
    total_value: number;
  };
  contracts: {
    total: number;
    active: number;
    total_value: number;
    active_value: number;
  };
  conversion: {
    assessment_to_quotation: number;
    quotation_to_signed: number;
    signed_to_contract: number;
  };
  salesByPerson: Array<{
    id: string;
    name: string;
    total_quotations: number;
    signed_count: number;
    signed_value: number;
    conversion_rate: number;
  }>;
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

const formatNumber = (value: number): string =>
  value.toLocaleString('th-TH', { minimumFractionDigits: 2 });

const SalesPipelinePage: React.FC = () => {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [data, setData] = useState<SalesPipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ReportApi.getSalesPipeline({ month, year });
      setData(result);
    } catch (error) {
      console.error('Failed to fetch sales pipeline data:', error);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => { setCurrentPage(1); }, [month, year]);

  const handleExportExcel = async () => {
    try {
      await ReportApi.downloadExcel('sales-pipeline', { month, year });
    } catch (error) {
      console.error('Failed to export Excel:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col">
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in flex flex-col flex-1">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
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
                d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              รายงาน Sales Pipeline
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              แสดงขั้นตอนการขายและอัตราการแปลง
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
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-md shadow-emerald-500/25 font-medium text-sm flex items-center gap-2"
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
          <div className="w-full lg:w-44">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              เดือน
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm bg-slate-50/50"
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-slate-500 text-sm">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Pipeline Visualization */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
            <h2 className="text-lg font-semibold text-slate-800 mb-5">
              Sales Pipeline
            </h2>
            <div className="flex flex-col lg:flex-row items-center gap-4">
              {/* Stage 1: Assessments */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex-1 w-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    ใบประเมิน
                  </h3>
                </div>
                <p className="text-3xl font-bold text-slate-800">
                  {data.assessments.total.toLocaleString()}
                </p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">เสร็จสมบูรณ์</span>
                    <span className="font-medium text-slate-700">
                      {data.assessments.completed.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">รอดำเนินการ</span>
                    <span className="font-medium text-slate-700">
                      {data.assessments.pending.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">กำลังดำเนินการ</span>
                    <span className="font-medium text-slate-700">
                      {data.assessments.in_progress.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Arrow 1 */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="text-emerald-600 font-bold text-sm">
                  {data.conversion.assessment_to_quotation.toFixed(1)}%
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-emerald-600 rotate-0 lg:rotate-0 hidden lg:block"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-emerald-600 lg:hidden"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m0 0 6.75-6.75M12 19.5l-6.75-6.75"
                  />
                </svg>
              </div>

              {/* Stage 2: Quotations */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex-1 w-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    ใบเสนอราคา
                  </h3>
                </div>
                <p className="text-3xl font-bold text-slate-800">
                  {data.quotations.total.toLocaleString()}
                </p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">เซ็นสำเร็จ</span>
                    <span className="font-medium text-emerald-600">
                      {data.quotations.signed.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">มูลค่ารวม</span>
                    <span className="font-medium text-slate-700">
                      {formatNumber(data.quotations.total_value)} ฿
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">มูลค่าเซ็น</span>
                    <span className="font-medium text-emerald-600">
                      {formatNumber(data.quotations.signed_value)} ฿
                    </span>
                  </div>
                </div>
              </div>

              {/* Arrow 2 */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="text-emerald-600 font-bold text-sm">
                  {data.conversion.signed_to_contract.toFixed(1)}%
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-emerald-600 hidden lg:block"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-emerald-600 lg:hidden"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m0 0 6.75-6.75M12 19.5l-6.75-6.75"
                  />
                </svg>
              </div>

              {/* Stage 3: Contracts */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex-1 w-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    สัญญา
                  </h3>
                </div>
                <p className="text-3xl font-bold text-slate-800">
                  {data.contracts.total.toLocaleString()}
                </p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">ใช้งานอยู่</span>
                    <span className="font-medium text-emerald-600">
                      {data.contracts.active.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">มูลค่ารวม</span>
                    <span className="font-medium text-slate-700">
                      {formatNumber(data.contracts.total_value)} ฿
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">มูลค่าใช้งาน</span>
                    <span className="font-medium text-emerald-600">
                      {formatNumber(data.contracts.active_value)} ฿
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quotation Status Breakdown */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              สถานะใบเสนอราคา
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-emerald-50 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600">
                  {data.quotations.signed.toLocaleString()}
                </p>
                <p className="text-sm text-slate-600 mt-1">เซ็นสำเร็จ</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">
                  {data.quotations.approved.toLocaleString()}
                </p>
                <p className="text-sm text-slate-600 mt-1">อนุมัติ</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-xl">
                <p className="text-2xl font-bold text-yellow-600">
                  {data.quotations.pending.toLocaleString()}
                </p>
                <p className="text-sm text-slate-600 mt-1">รอดำเนินการ</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-xl">
                <p className="text-2xl font-bold text-orange-600">
                  {data.quotations.follow_up.toLocaleString()}
                </p>
                <p className="text-sm text-slate-600 mt-1">ติดตาม</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <p className="text-2xl font-bold text-red-600">
                  {data.quotations.cancelled.toLocaleString()}
                </p>
                <p className="text-sm text-slate-600 mt-1">ยกเลิก</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <p className="text-2xl font-bold text-slate-700">
                  {data.quotations.total.toLocaleString()}
                </p>
                <p className="text-sm text-slate-600 mt-1">ทั้งหมด</p>
              </div>
            </div>
          </div>

          {/* Sales by Person Table */}
          <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
            <div className="flex-shrink-0 p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                ยอดขายรายบุคคล
              </h2>
            </div>
            <div className="overflow-x-auto border-b border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                      ชื่อ
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                      ใบเสนอราคาทั้งหมด
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                      เซ็นสำเร็จ
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                      มูลค่า (฿)
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                      Conversion Rate (%)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.salesByPerson.length > 0 ? (
                    data.salesByPerson.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((person) => (
                      <tr
                        key={person.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                          {person.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 text-right">
                          {person.total_quotations.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-emerald-600 font-medium text-right">
                          {person.signed_count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900 font-medium text-right">
                          {formatNumber(person.signed_value)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              person.conversion_rate >= 50
                                ? 'bg-emerald-100 text-emerald-800'
                                : person.conversion_rate >= 25
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {person.conversion_rate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        ไม่พบข้อมูลยอดขายรายบุคคล
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {data.salesByPerson.length > 0 && (
              <div className="mt-auto border-t border-slate-200">
                <Pagination
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={data.salesByPerson.length}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-500 text-sm">ไม่สามารถโหลดข้อมูลได้</p>
        </div>
      )}
    </div>
    </div>
  );
};

export default SalesPipelinePage;
