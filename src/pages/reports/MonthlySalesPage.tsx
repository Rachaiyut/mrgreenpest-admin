import React, { useState, useMemo } from 'react';
import {
  Quotation,
  Assessment,
  User,
  Status,
} from '@/src/libs/common/interface/entity/app.interface';
import { ClipboardDocumentListIcon } from '../../assets/icons/Icons';

import { useData } from '../../contexts/DataContext';

interface MonthlySalesPageProps {}

const MonthlySalesPage: React.FC<MonthlySalesPageProps> = () => {
  const { quotations, assessments, users } = useData();

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

  const filteredData = useMemo(() => {
    return quotations
      .filter((q) => {
        const d = new Date(q.createdAt);
        const matchesDate =
          d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        const matchesSearch =
          q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDate && matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }, [quotations, selectedMonth, selectedYear, searchTerm]);

  const tableData = useMemo(() => {
    return filteredData.map((q, index) => {
      const assessment = assessments.find((a) => a.id === q.assessmentId);
      const totalArea =
        assessment?.workAreas.reduce(
          (sum, wa) => sum + (wa.areaSize || 0),
          0
        ) || 0;
      const totalLinear =
        assessment?.workAreas.reduce(
          (sum, wa) => sum + (wa.linearMeters || 0),
          0
        ) || 0;
      const areaStr =
        totalLinear > 0 ? `${totalLinear} ม.` : `${totalArea} ตร.ม.`;

      const priceInclVat = q.total;
      const priceExclVat = priceInclVat / 1.07;
      const basePriceForCom = priceExclVat;
      const afterDed10 = basePriceForCom * 0.9;

      const saleCount = 1;
      const comPercent = 3;
      const comAmount = basePriceForCom * (comPercent / 100);

      const saleName = assessment?.createdBy || 'Unknown';

      return {
        index: index + 1,
        id: q.id,
        customerName: q.customerName,
        area: areaStr,
        priceInclVat,
        priceExclVat,
        status: q.status,
        package: assessment?.workAreas[0]?.serviceType?.join(', ') || '-',
        basePriceForCom,
        afterDed10,
        date: new Date(q.createdAt).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
        saleCount,
        comPercent,
        comAmount,
        saleName,
        remark: '',
      };
    });
  }, [filteredData, assessments, users]);

  const handleExport = () => {
    const headers = [
      'ลำดับ,เลขที่,รายชื่อ,ความยาว(เมตร/ตร.ม.),ราคารวมvat,ราคาไม่รวม vat,สถานะ,Package,ราคาที่นำมาคำนวณ %,จำนวนเงินหลังหัก 10 %,วันที่ทำ,จำนวน SALE,%com,จำนวนเงิน,Sale1 ( ชื่อ Sale ),หมายเหตุ',
    ];
    const rows = tableData.map((item) => {
      const escape = (str: string | number | undefined) =>
        `"${String(str || '').replace(/"/g, '""')}"`;
      return [
        item.index,
        escape(item.id),
        escape(item.customerName),
        escape(item.area),
        item.priceInclVat,
        item.priceExclVat,
        escape(item.status),
        escape(item.package),
        item.basePriceForCom,
        item.afterDed10,
        escape(item.date),
        item.saleCount,
        `${item.comPercent}%`,
        item.comAmount,
        escape(item.saleName),
        escape(item.remark),
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `monthly_sales_${selectedYear}_${selectedMonth + 1}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalInclVat = tableData.reduce(
    (sum, item) => sum + item.priceInclVat,
    0
  );
  const totalExclVat = tableData.reduce(
    (sum, item) => sum + item.priceExclVat,
    0
  );
  const totalCom = tableData.reduce((sum, item) => sum + item.comAmount, 0);

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
              ยอดขาย (รายเดือน)
            </h1>
            <p className="text-slate-500 mt-1">
              รายงานสรุปยอดขายและการคำนวณค่าคอมมิชชั่น
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm font-medium"
          >
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
              placeholder="ค้นหาตามเลขที่ใบเสนอราคา, ชื่อลูกค้า..."
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 shadow-sm">
                  ลำดับ
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider sticky left-10 bg-slate-50 z-10 shadow-sm">
                  เลขที่
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  รายชื่อ
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ความยาว
                  <br />
                  (ม./ตร.ม.)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ราคารวม VAT
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ราคาไม่รวม VAT
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Package
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ฐานคำนวณ %
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  หลังหัก 10%
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  วันที่ทำ
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  จำนวน SALE
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  %com
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  จำนวนเงิน
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Sale1
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  หมายเหตุ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tableData.length > 0 ? (
                tableData.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-900 text-center sticky left-0 bg-white shadow-sm">
                      {row.index}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-600 font-medium cursor-pointer hover:underline sticky left-10 bg-white shadow-sm">
                      {row.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                      {row.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right">
                      {row.area}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                      {row.priceInclVat.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right">
                      {row.priceExclVat.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.status === Status.Approved
                            ? 'bg-green-100 text-green-800'
                            : row.status === Status.Draft
                              ? 'bg-gray-100 text-gray-800'
                              : row.status === Status.Sent
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {row.package}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right">
                      {row.basePriceForCom.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right">
                      {row.afterDed10.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-center">
                      {row.date}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-center">
                      {row.saleCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-center">
                      {row.comPercent}%
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 font-semibold text-right">
                      {row.comAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {row.saleName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {row.remark}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={16}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    ไม่พบข้อมูลยอดขายประจำเดือนนี้
                  </td>
                </tr>
              )}
            </tbody>
            {tableData.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-right text-slate-900"
                  >
                    รวมทั้งสิ้น
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {totalInclVat.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {totalExclVat.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td colSpan={7} className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right text-green-700 bg-green-50">
                    {totalCom.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlySalesPage;
