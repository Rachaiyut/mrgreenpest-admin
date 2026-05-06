import React, { useState, useMemo } from 'react';
import {
  Quotation,
  Assessment,
  FieldJob,
  Status,
} from '@/src/types/entity/app.interface';
import {
  ChartPieIcon,
  ArrowTrendingUpIcon,
  ClipboardDocumentListIcon,
} from '../../assets/icons/Icons';

import { useData } from '../../contexts/DataContext';

interface SalesSummaryPageProps {}

const SALES_PERSONS = [
  'คุณยุทธนา',
  'คุณเสริมชัย/บอส',
  'คุณธนะพัฒน์',
  'คุณธนาวุฒิ',
  'คุณสราวุธ',
  'คุณคุณัชญ์/อิต',
  'คุณดุสิต',
  'คุณกฤติน',
  'คุณธนาทิป',
  'คุณนันท์นภัส',
  'คุณอรวรรณ',
  'คุณสุภาพร/จอย',
  'คุณกิตติพร/นนท์',
  'คุณศรสิทธิ์',
  'Ads',
  'อื่นๆ',
  'พี่ศักดิ์',
];

const SalesSummaryPage: React.FC<SalesSummaryPageProps> = () => {
  const { quotations, assessments, jobs } = useData();

  // 1. Standard State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );

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
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const d = new Date(q.created_at);
      return (
        d.getMonth() === selectedMonth &&
        d.getFullYear() === selectedYear &&
        (q.status === Status.Approved ||
          q.status === Status.Converted ||
          q.status === Status.Paid ||
          q.status === Status.Closed)
      );
    });
  }, [quotations, selectedMonth, selectedYear]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const d = new Date(j.start_date);
      return (
        d.getMonth() === selectedMonth &&
        d.getFullYear() === selectedYear &&
        j.status === Status.Completed
      );
    });
  }, [jobs, selectedMonth, selectedYear]);

  // Summary Logic
  const summaryByType = useMemo(() => {
    let newCustomerCount = 0;
    let newCustomerValue = 0;
    let renewalCount = 0;
    let renewalValue = 0;

    filteredQuotations.forEach((q) => {
      const isRenewal = q.original_id || q.created_at.includes('renewal'); // Simple check
      if (isRenewal) {
        renewalCount++;
        renewalValue += q.total;
      } else {
        newCustomerCount++;
        newCustomerValue += q.total;
      }
    });

    return [
      { type: 'ลูกค้าใหม่', count: newCustomerCount, value: newCustomerValue },
      { type: 'ต่อสัญญา', count: renewalCount, value: renewalValue },
    ];
  }, [filteredQuotations]);

  const summaryByPerson = useMemo(() => {
    const stats: Record<string, { sales: number; ops: number }> = {};
    SALES_PERSONS.forEach((p) => (stats[p] = { sales: 0, ops: 0 }));

    const totalSalesValue = filteredQuotations.reduce(
      (acc, q) => acc + q.total,
      0
    );
    // Mock distribution
    filteredQuotations.forEach((q) => {
      stats['อื่นๆ'].sales +=
        totalSalesValue > 0 ? 100 * (q.total / totalSalesValue) : 0;
    });

    const totalJobs = filteredJobs.length;
    filteredJobs.forEach((j) => {
      stats['อื่นๆ'].ops += totalJobs > 0 ? 100 * (1 / totalJobs) : 0;
    });

    let result = SALES_PERSONS.map((name) => ({
      name,
      salesPercent: stats[name]?.sales || 0,
      opsPercent: stats[name]?.ops || 0,
    }));

    // Apply Search Term to filter the person list
    if (searchTerm) {
      result = result.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [filteredQuotations, filteredJobs, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              สรุปยอดขาย (รายเดือน)
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              รายงานสรุปภาพรวมยอดขายและการปฏิบัติงานตามบุคคล
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium text-sm">
            Export Excel
          </button>
          <button className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 shadow-md shadow-indigo-500/25 font-medium text-sm flex items-center gap-2">
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
              placeholder="ค้นหารายชื่อพนักงาน..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm bg-slate-50/50"
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

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Table 1: Sales Type Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-2">
            <ChartPieIcon className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-700">
              สรุปยอดขายตามประเภท
            </h2>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ประเภท
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  จำนวน (งาน)
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  มูลค่า (บาท)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {summaryByType.map((item) => (
                <tr key={item.type} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">
                    {item.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center">
                    {item.count}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600 text-right">
                    {item.value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="px-6 py-4 text-sm text-slate-900">รวม</td>
                <td className="px-6 py-4 text-sm text-slate-900 text-center">
                  {summaryByType.reduce((a, b) => a + b.count, 0)}
                </td>
                <td className="px-6 py-4 text-sm text-slate-900 text-right">
                  {summaryByType
                    .reduce((a, b) => a + b.value, 0)
                    .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table 2: Sales Performance by Person */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
            <h2 className="font-semibold text-slate-700">สรุปผลงานตามบุคคล</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    รายชื่อ
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    % ขาย
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    % ปฏิบัติงาน
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {summaryByPerson.length > 0 ? (
                  summaryByPerson.map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm font-medium text-slate-800">
                        {item.name}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 text-center">
                        {item.salesPercent === 0
                          ? '-'
                          : item.salesPercent.toFixed(2) + '%'}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 text-center">
                        {item.opsPercent === 0
                          ? '-'
                          : item.opsPercent.toFixed(2) + '%'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-6 text-center text-slate-500"
                    >
                      ไม่พบรายชื่อที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesSummaryPage;
