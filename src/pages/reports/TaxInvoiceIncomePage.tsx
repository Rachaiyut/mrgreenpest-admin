import React, { useMemo, useState } from 'react';
import { Invoice, Receipt, Customer } from '@/src/libs/common/interface/entity/app.interface';
import { ClipboardDocumentListIcon } from '../../assets/icons/Icons';

import { useData } from '../../contexts/DataContext';

interface TaxInvoiceIncomePageProps {}

const TaxInvoiceIncomePage: React.FC<TaxInvoiceIncomePageProps> = () => {
  const { invoices, receipts, customers } = useData();
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

  const data = useMemo(() => {
    // Mock data logic similar to TotalIncomePage but focused on Tax Invoice details
    const mocks = [
      {
        id: 'TAX-2025-001',
        date: '02/12/2025',
        rawDate: new Date(2025, 11, 2),
        customerName: 'บริษัท เอ บี ซี จำกัด',
        taxInvoiceName: 'บริษัท เอ บี ซี จำกัด (สำนักงานใหญ่)',
        taxId: '1234567890123',
        totalAmount: 12840,
        vatAmount: 840,
        amountExclVat: 12000,
        whtAmount: 360,
        bankFee: 0,
        netReceived: 12480,
        whtDeducted: true,
        paymentChannel: 'KBank',
      },
      {
        id: 'TAX-2025-002',
        date: '05/12/2025',
        rawDate: new Date(2025, 11, 5),
        customerName: 'คุณสมชาย ใจดี',
        taxInvoiceName: 'นายสมชาย ใจดี',
        taxId: '-',
        totalAmount: 5350,
        vatAmount: 350,
        amountExclVat: 5000,
        whtAmount: 0,
        bankFee: 0,
        netReceived: 5350,
        whtDeducted: false,
        paymentChannel: 'Cash',
      },
      {
        id: 'TAX-2025-003',
        date: '15/12/2025',
        rawDate: new Date(2025, 11, 15),
        customerName: 'หจก. มีชัย',
        taxInvoiceName: 'หจก. มีชัย',
        taxId: '0987654321098',
        totalAmount: 16050,
        vatAmount: 1050,
        amountExclVat: 15000,
        whtAmount: 450,
        bankFee: 15,
        netReceived: 15585,
        whtDeducted: true,
        paymentChannel: 'SCB',
      },
    ];

    return mocks.filter((item) => {
      const matchesSearch =
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.taxId.includes(searchTerm);

      const itemDate = item.rawDate;
      const matchesDate =
        itemDate.getMonth() === selectedMonth &&
        itemDate.getFullYear() === selectedYear;

      return matchesSearch && matchesDate;
    });
  }, [searchTerm, selectedMonth, selectedYear]);

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
              รายงานรายได้ออกใบกำกับ (รายเดือน)
            </h1>
            <p className="text-slate-500 mt-1">
              สรุปรายละเอียดการออกใบกำกับภาษีและภาษีหัก ณ ที่จ่าย
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
              placeholder="เลขที่ใบกำกับภาษี, ชื่อลูกค้า, หรือเลขผู้เสียภาษี..."
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
                  เลขที่ใบกำกับภาษี
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider sticky left-28 bg-slate-50 z-10 shadow-sm">
                  วันที่
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ชื่อลูกค้า
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ชื่อใบกำกับภาษี
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  เลขที่ภาษี
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ยอดรวม VAT
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  VAT (7%)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ราคาไม่รวม VAT
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ภาษีหัก ณ ที่จ่าย
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ค่าธรรมเนียมธนาคาร
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-green-700 uppercase tracking-wider bg-green-50">
                  ยอดรับเงินสุทธิ
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  หัก ณ ที่จ่าย?
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ช่องทางการชำระ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.length > 0 ? (
                data.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-blue-600 font-medium cursor-pointer hover:underline sticky left-0 bg-white shadow-sm">
                      {row.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 sticky left-28 bg-white shadow-sm">
                      {row.date}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                      {row.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {row.taxInvoiceName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {row.taxId}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-900 font-medium">
                      {row.totalAmount.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                      {row.vatAmount.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                      {row.amountExclVat.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">
                      {row.whtAmount.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                      {row.bankFee.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-700 font-bold bg-green-50/50">
                      {row.netReceived.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {row.whtDeducted ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          ใช่
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          ไม่ใช่
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {row.paymentChannel}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={13}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    ไม่พบข้อมูลใบกำกับภาษีในเดือนนี้
                  </td>
                </tr>
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-3 text-right text-slate-900"
                  >
                    รวมทั้งสิ้น
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {data
                      .reduce((sum, item) => sum + item.totalAmount, 0)
                      .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {data
                      .reduce((sum, item) => sum + item.vatAmount, 0)
                      .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {data
                      .reduce((sum, item) => sum + item.amountExclVat, 0)
                      .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-red-700">
                    {data
                      .reduce((sum, item) => sum + item.whtAmount, 0)
                      .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {data
                      .reduce((sum, item) => sum + item.bankFee, 0)
                      .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-green-700">
                    {data
                      .reduce((sum, item) => sum + item.netReceived, 0)
                      .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
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

export default TaxInvoiceIncomePage;
