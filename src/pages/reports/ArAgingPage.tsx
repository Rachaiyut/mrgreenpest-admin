import React, { useEffect, useState } from 'react';
import { Pagination } from '../../components/common/Pagination';
import { ReportApi } from '../../api/report';

interface ArAgingItem {
  id: string;
  code: string;
  customer_id: string;
  customer_name: string;
  total: number;
  paid_amount: number;
  status: string;
  due_at: string;
  issued_at: string;
  primary_phone: string;
  customer_code: string;
  outstanding: number;
  days_overdue: number;
  aging_bucket: string;
}

interface ArAgingSummary {
  total_count: number;
  total_outstanding: number;
  current: number;
  '1-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
}

interface ArAgingData {
  items: ArAgingItem[];
  summary: ArAgingSummary;
}

const formatNumber = (value: number): string =>
  value.toLocaleString('th-TH', { minimumFractionDigits: 2 });

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('th-TH');
};

const getAgingBadge = (bucket: string) => {
  switch (bucket) {
    case 'CURRENT':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ยังไม่ถึงกำหนด
        </span>
      );
    case '1-30':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          1-30 วัน
        </span>
      );
    case '31-60':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          31-60 วัน
        </span>
      );
    case '61-90':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          61-90 วัน
        </span>
      );
    case '90+':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-900">
          90+ วัน
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          {bucket}
        </span>
      );
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'partial':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          ชำระบางส่วน
        </span>
      );
    case 'unpaid':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          ยังไม่ชำระ
        </span>
      );
    case 'overdue':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-200 text-red-900">
          เกินกำหนด
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
          {status}
        </span>
      );
  }
};

const ArAgingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<ArAgingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await ReportApi.getArAging({ search: searchTerm || undefined });
        setData(result);
      } catch (error) {
        console.error('Failed to fetch AR Aging report:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleExportExcel = async () => {
    try {
      await ReportApi.downloadExcel('ar-aging', { search: searchTerm || undefined });
    } catch (error) {
      console.error('Failed to export Excel:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const items = data?.items || [];
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const summary = data?.summary || {
    total_count: 0,
    total_outstanding: 0,
    current: 0,
    '1-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
  };

  return (
    <div className="flex-1 flex flex-col">
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in flex flex-col flex-1">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl shadow-lg shadow-rose-500/20">
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
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              รายงานลูกหนี้ค้างชำระ
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              แสดงยอดค้างชำระแยกตามอายุหนี้เพื่อติดตามการชำระเงิน
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
            className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl hover:from-rose-600 hover:to-red-700 transition-all duration-200 shadow-md shadow-rose-500/25 font-medium text-sm flex items-center gap-2"
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
              placeholder="ชื่อลูกค้า, รหัสลูกค้า, หรือ เลขที่ใบแจ้งหนี้..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all text-sm bg-slate-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <p className="text-xs font-medium text-slate-500">ยังไม่ถึงกำหนด</p>
          </div>
          <p className="text-lg font-bold text-slate-800">
            {loading ? '-' : formatNumber(summary.current)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <p className="text-xs font-medium text-slate-500">1-30 วัน</p>
          </div>
          <p className="text-lg font-bold text-slate-800">
            {loading ? '-' : formatNumber(summary['1-30'])}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
            <p className="text-xs font-medium text-slate-500">31-60 วัน</p>
          </div>
          <p className="text-lg font-bold text-slate-800">
            {loading ? '-' : formatNumber(summary['31-60'])}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <p className="text-xs font-medium text-slate-500">61-90 วัน</p>
          </div>
          <p className="text-lg font-bold text-slate-800">
            {loading ? '-' : formatNumber(summary['61-90'])}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-800"></div>
            <p className="text-xs font-medium text-slate-500">90+ วัน</p>
          </div>
          <p className="text-lg font-bold text-slate-800">
            {loading ? '-' : formatNumber(summary['90+'])}
          </p>
        </div>
      </div>

      {/* Total Outstanding */}
      <div className="bg-gradient-to-r from-rose-50 to-red-50 p-4 rounded-xl border border-rose-200/80">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-rose-700">
            ยอดค้างชำระทั้งหมด ({summary.total_count} รายการ)
          </p>
          <p className="text-xl font-bold text-rose-800">
            {loading ? '-' : formatNumber(summary.total_outstanding)}
          </p>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto border-b border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 shadow-sm">
                    เลขที่ใบแจ้งหนี้
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    รหัสลูกค้า
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    ชื่อลูกค้า
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    เบอร์โทร
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    วันที่ออก
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    วันครบกำหนด
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    ยอดรวม
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-green-700 uppercase tracking-wider bg-green-50">
                    ชำระแล้ว
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">
                    คงค้าง
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    วันที่ค้าง
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    ช่วงอายุหนี้
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-blue-600 hover:underline cursor-pointer sticky left-0 bg-white shadow-sm">
                        {item.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.customer_code}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                        {item.customer_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.primary_phone || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-left text-slate-600">
                        {formatDate(item.issued_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-left text-slate-600">
                        {formatDate(item.due_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-900">
                        {formatNumber(item.total)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center bg-green-50/50 text-green-700 font-bold">
                        {formatNumber(item.paid_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-red-600 font-medium">
                        {formatNumber(item.outstanding)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-600">
                        {item.days_overdue > 0 ? `${item.days_overdue} วัน` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-left">
                        {getAgingBadge(item.aging_bucket)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {getStatusBadge(item.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot className="bg-slate-50 font-semibold">
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-3 text-left text-slate-900"
                    >
                      รวมทั้งสิ้น
                    </td>
                    <td className="px-4 py-3 text-center text-slate-900">
                      {formatNumber(
                        items.reduce((sum, item) => sum + item.total, 0)
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-green-800">
                      {formatNumber(
                        items.reduce((sum, item) => sum + item.paid_amount, 0)
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-red-800">
                      {formatNumber(
                        items.reduce((sum, item) => sum + item.outstanding, 0)
                      )}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
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

export default ArAgingPage;
