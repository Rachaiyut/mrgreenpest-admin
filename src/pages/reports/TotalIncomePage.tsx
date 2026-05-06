import React, { useMemo, useState } from 'react';
import { ClipboardDocumentListIcon } from '../../assets/icons/Icons';
import { Invoice, Receipt, Customer } from '@/src/types/entity/app.interface';

import { useData } from '../../contexts/DataContext';

interface TotalIncomePageProps {}

interface IncomeRecord {
  id: string;
  customerCode: string;
  date: string;
  rawDate: Date;
  customerName: string;
  invoiceName: string;
  installment: string;
  totalServiceFee: number;
  paidAmount: number;
  actualReceived: number;
  outstanding: number;
  nextPaymentDue: string;
  paymentChannel: string;
  fee: number;
  withholdingTax: number;
  isVerified: boolean;
}

const TotalIncomePage: React.FC<TotalIncomePageProps> = () => {
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
    // Map Receipts to IncomeRecords
    const records: IncomeRecord[] = receipts.map((receipt) => {
      const invoice = invoices.find((inv) => inv.id === receipt.invoice_id);
      const customer = customers.find((cus) => cus.id === receipt.customer_id);

      const totalPaidForInvoice = receipts
        .filter((r) => r.invoice_id === receipt.invoice_id)
        .reduce((sum, r) => sum + r.amount, 0);

      const invoiceTotal = invoice ? invoice.total : 0;
      const outstanding = Math.max(0, invoiceTotal - totalPaidForInvoice);
      const isPaidFull = outstanding === 0;

      const paidDate = new Date(receipt.paid_at || receipt.received_at);
      const formattedDate = paidDate.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      return {
        id: receipt.id,
        customerCode: customer ? customer.id : 'N/A',
        date: formattedDate,
        rawDate: paidDate,
        customerName: receipt.customer_name,
        invoiceName: invoice ? invoice.id : 'Unknown Invoice',
        installment: '1/1',
        totalServiceFee: invoiceTotal,
        paidAmount: receipt.amount,
        actualReceived: receipt.amount,
        outstanding: outstanding,
        nextPaymentDue: isPaidFull ? '-' : 'TBD',
        paymentChannel: receipt.payment_method || 'Transfer',
        fee: 0,
        withholdingTax: 0,
        isVerified: true,
      };
    });

    // Filter Logic
    return records.filter((record) => {
      const matchesSearch =
        record.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.invoiceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.customerCode.toLowerCase().includes(searchTerm.toLowerCase());

      const recordDate = record.rawDate;
      const matchesDate =
        recordDate.getMonth() === selectedMonth &&
        recordDate.getFullYear() === selectedYear;

      return matchesSearch && matchesDate;
    });
  }, [invoices, receipts, customers, searchTerm, selectedMonth, selectedYear]);

  // Use real data
  const displayData = data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg shadow-teal-500/20">
            <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              รายงานรายได้ (รายเดือน)
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              สรุปยอดรายรับและสถานะการชำระเงินของลูกค้าประจำเดือน
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium text-sm">
            Export Excel
          </button>
          <button className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all duration-200 shadow-md shadow-teal-500/25 font-medium text-sm flex items-center gap-2">
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
              placeholder="ชื่อลูกค้า, รหัสลูกค้า, หรือ เลขที่ใบกำกับภาษี..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-sm bg-slate-50/50"
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-sm bg-slate-50/50"
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
                  รหัสลูกค้า
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  วัน เดือน ปี
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ชื่อลูกค้า
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ชื่อที่ใช้ออกใบกำกับภาษี
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  งวดที่ชำระ
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ค่าบริการทั้งหมด
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-green-700 uppercase tracking-wider bg-green-50">
                  ชำระงวดนี้
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-green-700 uppercase tracking-wider bg-green-50">
                  ยอดรับจริง
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-red-600 uppercase tracking-wider">
                  คงเหลือค้างชำระ
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  กำหนดชำระครั้งต่อไป
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ช่องทางการชำระ
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  ค่าธรรมเนียมธนาคาร
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  หักณที่จ่าย 3% หรือ1%
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  เช็คความถูกต้อง
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayData.length > 0 ? (
                displayData.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 sticky left-0 bg-white shadow-sm">
                      {item.customerCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.date}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                      {item.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-600 hover:underline cursor-pointer">
                      {item.invoiceName}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-slate-600">
                      {item.installment}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-900">
                      {item.totalServiceFee.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right bg-green-50/50 text-green-700 font-bold">
                      {item.paidAmount.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right bg-green-50/50 text-green-700 font-bold">
                      {item.actualReceived.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                      {item.outstanding.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-slate-600">
                      {item.nextPaymentDue}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.paymentChannel}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                      {item.fee.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                      {item.withholdingTax.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {item.isVerified ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          ถูกต้อง
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          รอตรวจสอบ
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={14}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
            {displayData.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-3 text-right text-slate-900"
                  >
                    รวมทั้งสิ้น
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {displayData
                      .reduce((sum, item) => sum + item.totalServiceFee, 0)
                      .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-green-800">
                    {displayData
                      .reduce((sum, item) => sum + item.paidAmount, 0)
                      .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-green-800">
                    {displayData
                      .reduce((sum, item) => sum + item.actualReceived, 0)
                      .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-red-800">
                    {displayData
                      .reduce((sum, item) => sum + item.outstanding, 0)
                      .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default TotalIncomePage;
