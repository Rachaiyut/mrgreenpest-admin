import React, { useEffect, useState } from 'react';
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { ReportApi } from '../../api/report';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, XCircleIcon } from '../../assets/icons/Icons';

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            รายงานลูกหนี้ค้างชำระ
          </h1>
          <p className="mt-1 text-slate-600">
            แสดงยอดค้างชำระแยกตามอายุหนี้เพื่อติดตามการชำระเงิน
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="!p-3 sm:!p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-green-500 rounded-lg shrink-0">
              <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-green-600 font-medium truncate">ยังไม่ถึงกำหนด</p>
              <p className="text-base sm:text-xl font-bold text-green-800 truncate">{loading ? '-' : formatNumber(summary.current)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-3 sm:!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-amber-500 rounded-lg shrink-0">
              <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-amber-600 font-medium truncate">1-30 วัน</p>
              <p className="text-base sm:text-xl font-bold text-amber-800 truncate">{loading ? '-' : formatNumber(summary['1-30'])}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-3 sm:!p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-orange-500 rounded-lg shrink-0">
              <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-orange-600 font-medium truncate">31-60 วัน</p>
              <p className="text-base sm:text-xl font-bold text-orange-800 truncate">{loading ? '-' : formatNumber(summary['31-60'])}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-3 sm:!p-4 bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-rose-500 rounded-lg shrink-0">
              <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-rose-600 font-medium truncate">61-90 วัน</p>
              <p className="text-base sm:text-xl font-bold text-rose-800 truncate">{loading ? '-' : formatNumber(summary['61-90'])}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-3 sm:!p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-300 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-red-700 rounded-lg shrink-0">
              <XCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-red-700 font-medium truncate">90+ วัน</p>
              <p className="text-base sm:text-xl font-bold text-red-900 truncate">{loading ? '-' : formatNumber(summary['90+'])}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="!p-4 flex-shrink-0 print:hidden">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full">
          <div className="relative w-full sm:w-[360px] flex-shrink-0">
            <input
              type="search"
              placeholder="ค้นหาชื่อลูกค้า, รหัสลูกค้า, หรือเลขที่ใบแจ้งหนี้"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <div className="flex-1 flex flex-col min-h-[400px] rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
        {loading ? (
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
              <p className="text-sm text-slate-500">ไม่พบข้อมูลลูกหนี้ค้างชำระ</p>
            </div>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto border-b border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-16">
                    ลำดับ
                  </th>
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
                {paginatedItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-500 text-center tabular-nums">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
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
                ))}
              </tbody>
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
