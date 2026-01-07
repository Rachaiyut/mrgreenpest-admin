import React, { useMemo, useState } from 'react';
import { Card } from '../../components/common/Card';
import { ClipboardDocumentListIcon } from '../../assets/icons/Icons';
import { Invoice, Receipt, Customer } from '../../types';

interface TotalIncomePageProps {
  invoices: Invoice[];
  receipts: Receipt[];
  customers: Customer[];
}

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

const TotalIncomePage: React.FC<TotalIncomePageProps> = ({
  invoices,
  receipts,
  customers,
}) => {
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
      const invoice = invoices.find((inv) => inv.id === receipt.invoiceId);
      const customer = customers.find((cus) => cus.id === receipt.customerId);

      const totalPaidForInvoice = receipts
        .filter((r) => r.invoiceId === receipt.invoiceId)
        .reduce((sum, r) => sum + r.amount, 0);

      const invoiceTotal = invoice ? invoice.total : 0;
      const outstanding = Math.max(0, invoiceTotal - totalPaidForInvoice);
      const isPaidFull = outstanding === 0;

      const paidDate = new Date(receipt.paidAt);
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
        customerName: receipt.customerName,
        invoiceName: invoice ? invoice.id : 'Unknown Invoice',
        installment: '1/1',
        totalServiceFee: invoiceTotal,
        paidAmount: receipt.amount,
        actualReceived: receipt.amount,
        outstanding: outstanding,
        nextPaymentDue: isPaidFull ? '-' : 'TBD',
        paymentChannel: receipt.paymentMethod || 'Transfer',
        fee: 0,
        withholdingTax: 0,
        isVerified: receipt.amount === receipt.amount, // Simplified logic
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

  // Fallback Mock Data Logic if no real data
  const displayData = useMemo(() => {
    if (receipts.length > 0) return data;

    const mocks = [
      {
        id: '1',
        customerCode: 'CUS001',
        date: '01/12/2025',
        rawDate: new Date(2025, 11, 1),
        customerName: 'บริษัท เอ บี ซี จำกัด',
        invoiceName: 'INV-2025-001',
        installment: '1/12',
        totalServiceFee: 12000,
        paidAmount: 1000,
        actualReceived: 970,
        outstanding: 11000,
        nextPaymentDue: '01/01/2026',
        paymentChannel: 'ธนาคารกสิกรไทย',
        fee: 0,
        withholdingTax: 30,
        isVerified: true,
      },
      {
        id: '2',
        customerCode: 'CUS002',
        date: '05/12/2025',
        rawDate: new Date(2025, 11, 5),
        customerName: 'คุณสมชาย ใจดี',
        invoiceName: 'INV-2025-002',
        installment: 'Full',
        totalServiceFee: 5000,
        paidAmount: 5000,
        actualReceived: 5000,
        outstanding: 0,
        nextPaymentDue: '-',
        paymentChannel: 'เงินสด',
        fee: 0,
        withholdingTax: 0,
        isVerified: true,
      },
      {
        id: '3',
        customerCode: 'CUS003',
        date: '10/12/2025',
        rawDate: new Date(2025, 11, 10),
        customerName: 'หจก. มีชัย',
        invoiceName: 'INV-2025-003',
        installment: '1/3',
        totalServiceFee: 15000,
        paidAmount: 5000,
        actualReceived: 4500,
        outstanding: 10000,
        nextPaymentDue: '10/01/2026',
        paymentChannel: 'โอนเงิน',
        fee: 0,
        withholdingTax: 0,
        isVerified: false,
      },
    ];

    return mocks.filter((record) => {
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
  }, [data, receipts.length, searchTerm, selectedMonth, selectedYear]);

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
              รายงานรายได้ (รายเดือน)
            </h1>
            <p className="text-slate-500 mt-1">
              สรุปยอดรายรับและสถานะการชำระเงินของลูกค้าประจำเดือน
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm font-medium">
            Export Excel
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center">
            {/* Inline Printer Icon since we might not have it in Icons.tsx yet */}
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
              placeholder="ชื่อลูกค้า, รหัสลูกค้า, หรือ เลขที่ใบกำกับภาษี..."
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

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 shadow-sm">
                  รหัสลูกค้า
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  วัน เดือน ปี
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ชื่อลูกค้า
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ชื่อที่ใช้ออกใบกำกับภาษี
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  งวดที่ชำระ
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
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
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  กำหนดชำระครั้งต่อไป
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ช่องทางการชำระ
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ค่าธรรมเนียมธนาคาร
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  หักณที่จ่าย 3% หรือ1%
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
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
