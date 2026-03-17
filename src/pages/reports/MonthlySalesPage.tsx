import React, { useState, useMemo } from 'react';
import {
  Quotation,
  Assessment,
  User,
  Status,
} from '@/src/types/entity/app.interface';
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
        const d = new Date(q.created_at);
        const matchesDate =
          d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        const matchesSearch =
          q.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDate && matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [quotations, selectedMonth, selectedYear, searchTerm]);

  const tableData = useMemo(() => {
    return filteredData.map((q, index) => {
      const assessment = assessments.find((a) => a.id === q.assessment_id);
      const totalArea =
        assessment?.assessment_areas?.reduce(
          (sum, wa) => sum + (wa.area_size || 0),
          0
        ) || 0;
      const totalLinear = 0; // No linearMeters property in assessment_areas
      const areaStr =
        totalLinear > 0 ? `${totalLinear} ม.` : `${totalArea} ตร.ม.`;

      const priceInclVat = q.total;
      const priceExclVat = priceInclVat / 1.07;
      const basePriceForCom = priceExclVat;
      const afterDed10 = basePriceForCom * 0.9;

      const saleCount = 1;
      const comPercent = 3;
      const comAmount = basePriceForCom * (comPercent / 100);

      const saleName = assessment?.created_by || 'Unknown';

      return {
        index: index + 1,
        id: q.id,
        customerName: q.customer_name,
        area: areaStr,
        priceInclVat,
        priceExclVat,
        status: q.status,
        package: assessment?.assessment_areas?.[0]?.service_system || '-',
        basePriceForCom,
        afterDed10,
        date: new Date(q.created_at).toLocaleDateString('th-TH', {
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
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
            <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              ยอดขาย (รายเดือน)
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              รายงานสรุปยอดขายและการคำนวณค่าคอมมิชชั่น
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium text-sm"
          >
            Export Excel
          </button>
          <button className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-md shadow-emerald-500/25 font-medium text-sm flex items-center gap-2">
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
              placeholder="ค้นหาตามเลขที่ใบเสนอราคา, ชื่อลูกค้า..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm bg-slate-50/50"
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

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 shadow-sm">
                  ลำดับ
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider sticky left-10 bg-slate-50 z-10 shadow-sm">
                  เลขที่
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  รายชื่อ
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ความยาว
                  <br />
                  (ม./ตร.ม.)
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ราคารวม VAT
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ราคาไม่รวม VAT
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  Package
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ฐานคำนวณ %
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  หลังหัก 10%
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  วันที่ทำ
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  จำนวน SALE
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  %com
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  จำนวนเงิน
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  Sale1
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
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
