import React, { useMemo, useState } from 'react';
import { Receipt, Customer } from '@/src/types/entity/app.interface';
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
    return receipts
      .filter((receipt) => {
        const dateStr = receipt.paid_at || receipt.received_at;
        if (!dateStr) return false;
        const receiptDate = new Date(dateStr);
        const matchesDate =
          receiptDate.getMonth() === selectedMonth &&
          receiptDate.getFullYear() === selectedYear;

        const matchesSearch =
          receipt.customer_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          receipt.id.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesDate && matchesSearch;
      })
      .map((receipt) => {
        // Calculate VAT (assuming amount includes VAT 7%)
        const totalAmount = receipt.amount;
        const amountExclVat = totalAmount / 1.07;
        const vatAmount = totalAmount - amountExclVat;

        // Find customer to get tax ID (if available in customer entity, otherwise dash)
        const customer = customers.find((c) => c.id === receipt.customer_id);
        const taxId = customer?.tax_id || '-';
        const dateStr = receipt.paid_at || receipt.received_at;

        return {
          id: receipt.id,
          date: new Date(dateStr).toLocaleDateString('th-TH'),
          rawDate: new Date(dateStr),
          customerName: receipt.customer_name,
          taxInvoiceName: receipt.customer_name,
          taxId: taxId,
          totalAmount: totalAmount,
          vatAmount: vatAmount,
          amountExclVat: amountExclVat,
          whtAmount: 0,
          bankFee: 0,
          netReceived: totalAmount,
          whtDeducted: false,
          paymentChannel: receipt.payment_method,
        };
      });
  }, [receipts, customers, searchTerm, selectedMonth, selectedYear]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg shadow-cyan-500/20">
            <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              รายงานรายได้ออกใบกำกับ (รายเดือน)
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              สรุปรายละเอียดการออกใบกำกับภาษีและภาษีหัก ณ ที่จ่าย
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium text-sm">
            Export Excel
          </button>
          <button className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200 shadow-md shadow-cyan-500/25 font-medium text-sm flex items-center gap-2">
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
              placeholder="เลขที่ใบกำกับภาษี, ชื่อลูกค้า, หรือเลขผู้เสียภาษี..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-sm bg-slate-50/50"
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
                  เลขที่ใบกำกับภาษี
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider sticky left-28 bg-slate-50 z-10 shadow-sm">
                  วันที่
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ชื่อลูกค้า
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ชื่อใบกำกับภาษี
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  เลขที่ภาษี
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ยอดรวม VAT
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  VAT (7%)
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ราคาไม่รวม VAT
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ภาษีหัก ณ ที่จ่าย
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ค่าธรรมเนียมธนาคาร
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-green-700 uppercase tracking-wider bg-green-50">
                  ยอดรับเงินสุทธิ
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  หัก ณ ที่จ่าย?
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
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
