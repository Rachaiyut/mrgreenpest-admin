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
  const { quotations, assessments, fieldJobs } = useData();

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
      const d = new Date(q.createdAt);
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
    return fieldJobs.filter((j) => {
      const d = new Date(j.startTime);
      return (
        d.getMonth() === selectedMonth &&
        d.getFullYear() === selectedYear &&
        j.status === Status.Completed
      );
    });
  }, [fieldJobs, selectedMonth, selectedYear]);

  // Summary Logic
  const summaryByType = useMemo(() => {
    let newCustomerCount = 0;
    let newCustomerValue = 0;
    let renewalCount = 0;
    let renewalValue = 0;

    filteredQuotations.forEach((q) => {
      const isRenewal = q.originalId || q.createdAt.includes('renewal'); // Simple check
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
    <div className="space-y-6 animate-fade-in text-nowrap pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <ClipboardDocumentListIcon className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              สรุปยอดขาย (รายเดือน)
            </h1>
            <p className="text-slate-500 mt-1">
              รายงานสรุปภาพรวมยอดขายและการปฏิบัติงานตามบุคคล
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm font-medium">
            Export Excel
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 mr-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 6.75h10.5M6.75 3h10.5c.828 0 1.5.672 1.5 1.5v3c0 .828-.672 1.5-1.5 1.5h-10.5c-.828 0-1.5-.672-1.5-1.5v-3c0-.828.672-1.5 1.5-1.5m3 11.25H16.5m-9.75 0h9.75M4.5 9.75h15a2.25 2.25 0 012.25 2.25v6a2.25 2.25 0 01-2.25 2.25h-1.5v-2.25a2.25 2.25 0 00-2.25-2.25h-9a2.25 2.25 0 00-2.25 2.25V20.25h-1.5a2.25 2.25 0 01-2.25-2.25v-6a2.25 2.25 0 012.25-2.25z"
              />
            </svg>
            พิมพ์รายงาน
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow w-full md:w-auto">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ค้นหา
            </label>
            <input
              type="text"
              placeholder="ค้นหารายชื่อพนักงาน..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              เดือน
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              {thaiMonths.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-32">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ปี
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              {[2023, 2024, 2025].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Sales Type Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <ChartPieIcon className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-slate-700">
              สรุปยอดขายตามประเภท
            </h2>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ประเภท
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  จำนวน (งาน)
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    รายชื่อ
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    % ขาย
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
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
