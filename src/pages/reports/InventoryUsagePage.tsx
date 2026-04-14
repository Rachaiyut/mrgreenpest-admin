import React, { useState, useEffect, useMemo } from 'react';
import { Pagination } from '../../components/common/Pagination';
import { ReportApi } from '../../api/report';

interface InventoryUsageItem {
  product_id: number;
  product_code: string;
  product_name: string;
  unit_name: string;
  total_used: number;
  withdrawal_count: number;
  cost_price: number;
  total_cost: number;
  current_stock: number;
  min_stock: number;
}

interface InventoryUsageSummary {
  unique_products: number;
  total_items: number;
  total_cost: number;
  total_withdrawals: number;
}

interface InventoryUsageResponse {
  items: InventoryUsageItem[];
  summary: InventoryUsageSummary;
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

const InventoryUsagePage: React.FC = () => {
  const [items, setItems] = useState<InventoryUsageItem[]>([]);
  const [summary, setSummary] = useState<InventoryUsageSummary>({
    unique_products: 0,
    total_items: 0,
    total_cost: 0,
    total_withdrawals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res: InventoryUsageResponse = await ReportApi.getInventoryUsage({
          month,
          year,
          search: search || undefined,
        });
        setItems(res.items || []);
        setSummary(
          res.summary || {
            unique_products: 0,
            total_items: 0,
            total_cost: 0,
            total_withdrawals: 0,
          }
        );
      } catch (error) {
        console.error('Failed to fetch inventory usage report', error);
        setItems([]);
        setSummary({
          unique_products: 0,
          total_items: 0,
          total_cost: 0,
          total_withdrawals: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [month, year, search]);

  useEffect(() => { setCurrentPage(1); }, [search, month, year]);

  const filteredItems = useMemo(() => {
    return items;
  }, [items]);

  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportExcel = async () => {
    try {
      await ReportApi.downloadExcel('inventory-usage', { month, year });
    } catch (error) {
      console.error('Failed to export Excel', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const summaryCards = [
    {
      label: 'จำนวนสินค้า',
      value: summary.unique_products.toLocaleString('th-TH'),
      suffix: 'รายการ',
      color: 'violet',
      bgClass: 'bg-violet-50',
      textClass: 'text-violet-700',
      iconBgClass: 'bg-violet-100',
    },
    {
      label: 'จำนวนที่ใช้ทั้งหมด',
      value: summary.total_items.toLocaleString('th-TH'),
      suffix: 'หน่วย',
      color: 'blue',
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-700',
      iconBgClass: 'bg-blue-100',
    },
    {
      label: 'จำนวนครั้งเบิก',
      value: summary.total_withdrawals.toLocaleString('th-TH'),
      suffix: 'ครั้ง',
      color: 'amber',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      iconBgClass: 'bg-amber-100',
    },
    {
      label: 'มูลค่ารวม',
      value: formatNumber(summary.total_cost),
      suffix: 'บาท',
      color: 'emerald',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-700',
      iconBgClass: 'bg-emerald-100',
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in flex flex-col flex-1">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl shadow-lg shadow-violet-500/20">
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
                d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              รายงานการใช้สินค้า/เคมีภัณฑ์
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              สรุปการใช้สินค้าและเคมีภัณฑ์ประจำเดือน
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
            className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-xl hover:from-violet-600 hover:to-violet-700 transition-all duration-200 shadow-md shadow-violet-500/25 font-medium text-sm flex items-center gap-2"
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
              placeholder="ค้นหาตามรหัสสินค้า, ชื่อสินค้า..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-sm bg-slate-50/50"
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
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`${card.bgClass} p-5 rounded-xl border border-slate-200/50`}
          >
            <p className="text-sm text-slate-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.textClass}`}>
              {card.value}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{card.suffix}</p>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto border-b border-slate-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
                <span className="text-sm text-slate-400">
                  กำลังโหลดข้อมูล...
                </span>
              </div>
            </div>
          ) : (
            <>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    รหัสสินค้า
                  </th>
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    ชื่อสินค้า
                  </th>
                  <th className="px-5 py-3.5 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    หน่วย
                  </th>
                  <th className="px-5 py-3.5 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    จำนวนที่ใช้
                  </th>
                  <th className="px-5 py-3.5 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    จำนวนครั้งเบิก
                  </th>
                  <th className="px-5 py-3.5 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    ราคาทุน/หน่วย
                  </th>
                  <th className="px-5 py-3.5 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    มูลค่ารวม
                  </th>
                  <th className="px-5 py-3.5 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    คงเหลือ
                  </th>
                  <th className="px-5 py-3.5 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    ขั้นต่ำ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((row) => {
                    const isLowStock = row.current_stock <= row.min_stock;
                    return (
                      <tr
                        key={row.product_id}
                        className={
                          isLowStock
                            ? 'bg-red-50 hover:bg-red-100/70 transition-colors'
                            : 'hover:bg-slate-50/50 transition-colors'
                        }
                      >
                        <td className="px-5 py-3.5 text-sm text-blue-600 font-medium whitespace-nowrap">
                          {row.product_code}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-700">
                          {row.product_name}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                          {row.unit_name}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-right text-slate-700 whitespace-nowrap">
                          {formatNumber(row.total_used)}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-right text-slate-700 whitespace-nowrap">
                          {row.withdrawal_count.toLocaleString('th-TH')}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-right text-slate-700 whitespace-nowrap">
                          {formatNumber(row.cost_price)}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-right text-slate-900 font-medium whitespace-nowrap">
                          {formatNumber(row.total_cost)}
                        </td>
                        <td
                          className={`px-5 py-3.5 text-sm text-right font-medium whitespace-nowrap ${
                            isLowStock ? 'text-red-600' : 'text-slate-700'
                          }`}
                        >
                          {formatNumber(row.current_stock)}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-right text-slate-500 whitespace-nowrap">
                          {formatNumber(row.min_stock)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={9}
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
                        <span>ไม่พบรายการสินค้า/เคมีภัณฑ์ในเดือนนี้</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredItems.length > 0 && (
                <tfoot className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-4 text-right text-sm text-slate-700"
                    >
                      รวมทั้งสิ้น
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-slate-900 whitespace-nowrap">
                      {formatNumber(
                        filteredItems.reduce(
                          (sum, item) => sum + item.total_used,
                          0
                        )
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-slate-900 whitespace-nowrap">
                      {filteredItems
                        .reduce((sum, item) => sum + item.withdrawal_count, 0)
                        .toLocaleString('th-TH')}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-slate-900 whitespace-nowrap">
                      &mdash;
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-emerald-700 font-bold whitespace-nowrap">
                      {formatNumber(
                        filteredItems.reduce(
                          (sum, item) => sum + item.total_cost,
                          0
                        )
                      )}
                    </td>
                    <td className="px-5 py-4" colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
            {filteredItems.length > 0 && (
              <div className="mt-auto border-t border-slate-200">
                <Pagination
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredItems.length}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                />
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default InventoryUsagePage;
