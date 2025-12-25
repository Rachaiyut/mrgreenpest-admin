import React, { useMemo, useState } from 'react';
import { Card } from '../../components/common/Card';
import { ClipboardDocumentListIcon } from '../../assets/icons/Icons';

// Mock Data Types for Direct Expenses
interface DirectExpenseItem {
    id: string;
    date: string; // วัน เดือน ปี
    invoiceNo: string; // Invoice No.
    details: string; // รายละเอียด
    quantity: number; // จำนวน
    unit: string; // หน่วย
    unitPrice: number; // ราคาต่อหน่วย
    totalExclVat: number; // รวมเป็นค่าใช้จ่าย (Before VAT)
    totalInclVat: number; // รวมเป็นค่าใช้จ่าย (VAT) (Inc VAT)
    netPaidWht: number; // ยอดชำระ/หักณที่จ่าย (Net Paid)
    whtAmount: number; // WHT Amount for display context
    wallet: string; // กระเป๋าเงิน
}

const MOCK_DIRECT_EXPENSES: DirectExpenseItem[] = [
    {
        id: '1',
        date: '2025-12-02',
        invoiceNo: 'INV-S-001',
        details: 'ซื้อน้ำยาเคมี กำจัดปลวก (Termidor)',
        quantity: 10,
        unit: 'แกลลอน',
        unitPrice: 2500,
        totalExclVat: 25000,
        totalInclVat: 26750,
        netPaidWht: 26000, // example deduction
        whtAmount: 750,
        wallet: 'กระเป๋า admin'
    },
    {
        id: '2',
        date: '2025-12-05',
        invoiceNo: 'INV-S-005',
        details: 'อุปกรณ์ป้องกันภัยส่วนบุคคล (PPE)',
        quantity: 5,
        unit: 'ชุด',
        unitPrice: 1200,
        totalExclVat: 6000,
        totalInclVat: 6420,
        netPaidWht: 6420,
        whtAmount: 0,
        wallet: 'กระเป๋า CFO'
    },
    {
        id: '3',
        date: '2025-12-10',
        invoiceNo: 'INV-T-022',
        details: 'ค่าเหยื่อกำจัดมด (Optigard)',
        quantity: 20,
        unit: 'หลอด',
        unitPrice: 450,
        totalExclVat: 9000,
        totalInclVat: 9630,
        netPaidWht: 9360,
        whtAmount: 270, // 3%
        wallet: 'กระเป๋า admin'
    },
    {
        id: '4',
        date: '2025-12-12',
        invoiceNo: 'INV-E-101',
        details: 'เครื่องพ่นยา (Fogger)',
        quantity: 2,
        unit: 'เครื่อง',
        unitPrice: 15000,
        totalExclVat: 30000,
        totalInclVat: 32100,
        netPaidWht: 31200,
        whtAmount: 900,
        wallet: 'กระเป๋า CEO'
    },
    {
        id: '5',
        date: '2025-12-20',
        invoiceNo: 'None',
        details: 'ค่าจ้างรายวัน พนักงานชั่วคราว',
        quantity: 3,
        unit: 'วัน',
        unitPrice: 500,
        totalExclVat: 1500,
        totalInclVat: 1500,
        netPaidWht: 1455, // 3% wht
        whtAmount: 45,
        wallet: 'กระเป๋าหัวหน้าทีม1'
    },
];

const DirectExpensesPage: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    // Filter Logic
    const processedData = useMemo(() => {
        return MOCK_DIRECT_EXPENSES.filter(item => {
            const d = new Date(item.date);
            const matchesDate = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
            const matchesSearch = item.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.wallet.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesDate && matchesSearch;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [selectedMonth, selectedYear, searchTerm]);

    return (
        <div className="space-y-6 animate-fade-in text-nowrap pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl">
                        <ClipboardDocumentListIcon className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">รายงานค่าใช้จ่ายทางตรง</h1>
                        <p className="text-slate-500 mt-1">สรุปค่าใช้จ่ายต้นทุนบริการและวัสดุอุปกรณ์</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm font-medium"
                    >
                        Export Excel
                    </button>
                    <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h10.5M6.75 3h10.5c.828 0 1.5.672 1.5 1.5v3c0 .828-.672 1.5-1.5 1.5h-10.5c-.828 0-1.5-.672-1.5-1.5v-3c0-.828.672-1.5 1.5-1.5m3 11.25H16.5m-9.75 0h9.75M4.5 9.75h15a2.25 2.25 0 012.25 2.25v6a2.25 2.25 0 01-2.25 2.25h-1.5v-2.25a2.25 2.25 0 00-2.25-2.25h-9a2.25 2.25 0 00-2.25 2.25V20.25h-1.5a2.25 2.25 0 01-2.25-2.25v-6a2.25 2.25 0 012.25-2.25z" />
                        </svg>
                        พิมพ์รายงาน
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-grow w-full md:w-auto">
                        <label className="block text-sm font-medium text-slate-700 mb-1">ค้นหา</label>
                        <input
                            type="text"
                            placeholder="ค้นหาตามเลขที่บิล, รายละเอียด, หรือกระเป๋าเงิน..."
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <label className="block text-sm font-medium text-slate-700 mb-1">เดือน</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                            {thaiMonths.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                    </div>
                    <div className="w-full md:w-32">
                        <label className="block text-sm font-medium text-slate-700 mb-1">ปี</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                            {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 w-24 shadow-sm">วันที่</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider sticky left-24 bg-slate-50 z-10 shadow-sm">Invoice No.</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">รายละเอียด</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">จำนวน</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">หน่วย</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">ราคา/หน่วย</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">รวม (ไม่รวม VAT)</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">ยอดรวม (Inc VAT)</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-green-700 uppercase tracking-wider bg-green-50">ยอดจ่ายจริง (หลังหัก ณ ที่จ่าย)</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider pl-8">กระเป๋าเงิน</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {processedData.length > 0 ? (
                                processedData.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-900 sticky left-0 bg-white font-medium shadow-sm">{row.date}</td>
                                        <td className="px-4 py-3 text-sm text-blue-600 sticky left-24 bg-white shadow-sm">{row.invoiceNo}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{row.details}</td>
                                        <td className="px-4 py-3 text-sm text-right text-slate-700">{row.quantity}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{row.unit}</td>
                                        <td className="px-4 py-3 text-sm text-right text-slate-700">{row.unitPrice.toLocaleString('th-TH')}</td>
                                        <td className="px-4 py-3 text-sm text-right text-slate-900 font-medium">{row.totalExclVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-sm text-right text-slate-600">{row.totalInclVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-sm text-right text-green-700 font-bold bg-green-50/50">{row.netPaidWht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 pl-8">{row.wallet}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                                        ไม่พบรายการค่าใช้จ่ายทางตรงในเดือนนี้
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {processedData.length > 0 && (
                            <tfoot className="bg-slate-50 font-semibold">
                                <tr>
                                    <td colSpan={6} className="px-4 py-3 text-right text-slate-900">รวมทั้งสิ้น</td>
                                    <td className="px-4 py-3 text-right text-slate-900">{processedData.reduce((sum, item) => sum + item.totalExclVat, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-right text-slate-900">{processedData.reduce((sum, item) => sum + item.totalInclVat, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-right text-green-700">{processedData.reduce((sum, item) => sum + item.netPaidWht, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DirectExpensesPage;
