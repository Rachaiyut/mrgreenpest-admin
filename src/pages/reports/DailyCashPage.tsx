import React, { useMemo, useState } from 'react';
import { Card } from '../../components/common/Card';
import { ClipboardDocumentListIcon } from '../../assets/icons/Icons';

interface CashTransaction {
    id: string;
    date: string; // YYYY-MM-DD
    category: string;
    item: string;
    income: number;
    expense: number;
    wallet: string;
}

const MOCK_TRANSACTIONS: CashTransaction[] = [
    { id: '1', date: '2025-12-01', category: 'ยอดยกมา', item: 'ยอดยกมาต้นเดือน', income: 50000, expense: 0, wallet: 'กระเป๋า admin' },
    { id: '2', date: '2025-12-02', category: 'รายได้บริการ', item: 'ค่าบริการกำจัดปลวก คุณสมชาย', income: 3500, expense: 0, wallet: 'กระเป๋า admin' },
    { id: '3', date: '2025-12-03', category: 'ค่าใช้จ่ายดำเนินงาน', item: 'เติมน้ำมันรถทะเบียน 1กก-1234', income: 0, expense: 1200, wallet: 'กระเป๋าหัวหน้าทีม1' },
    { id: '4', date: '2025-12-04', category: 'เบิกเงินสดย่อย', item: 'โอนเงินเข้ากระเป๋าลูกทีม1', income: 0, expense: 2000, wallet: 'กระเป๋า admin' },
    { id: '5', date: '2025-12-04', category: 'รับเงินสดย่อย', item: 'รับเงินโอนจาก admin', income: 2000, expense: 0, wallet: 'กระเป๋าลูกทีม1' },
    { id: '6', date: '2025-12-05', category: 'ค่าวัสดุสิ้นเปลือง', item: 'ซื้อน้ำยาเคมี', income: 0, expense: 4500, wallet: 'กระเป๋า CFO' },
    { id: '7', date: '2025-12-06', category: 'รายได้บริการ', item: 'ค่าบริการรายปี โรงแรม A', income: 12000, expense: 0, wallet: 'กระเป๋า CEO' },
    { id: '8', date: '2025-12-07', category: 'ค่ารับรอง', item: 'เลี้ยงลูกค้า', income: 0, expense: 1500, wallet: 'กระเป๋า CEO' },
];

const DailyCashPage: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const processedData = useMemo(() => {
        // Filter first
        const filtered = MOCK_TRANSACTIONS.filter(t => {
            const d = new Date(t.date);
            const matchMonth = d.getMonth() === selectedMonth;
            const matchYear = d.getFullYear() === selectedYear;
            const matchSearch = t.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.wallet.toLowerCase().includes(searchTerm.toLowerCase());
            return matchMonth && matchYear && matchSearch;
        });

        // Sort by date
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate running balance
        let currentBalance = 0;
        return filtered.map(item => {
            currentBalance = currentBalance + item.income - item.expense;
            return {
                ...item,
                balance: currentBalance
            };
        });
    }, [selectedMonth, selectedYear, searchTerm]);

    const totalIncome = processedData.reduce((sum, item) => sum + item.income, 0);
    const totalExpense = processedData.reduce((sum, item) => sum + item.expense, 0);

    return (
        <div className="space-y-6 animate-fade-in text-nowrap pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl">
                        <ClipboardDocumentListIcon className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">บัญชีเงินสดรายวัน</h1>
                        <p className="text-slate-500 mt-1">รายงานการเคลื่อนไหวของเงินสดประจำวัน</p>
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
                            placeholder="ระบุรายการ, หมวดหมู่, หรือกระเป๋าเงิน..."
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
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 w-24">วันที่</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">รายการ</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">หมวดหมู่</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-green-600 uppercase tracking-wider">รายรับ</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-red-600 uppercase tracking-wider">รายจ่าย</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-800 uppercase tracking-wider">คงเหลือ</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider pl-8">กระเป๋าเงิน</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {processedData.length > 0 ? (
                                processedData.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-900 sticky left-0 bg-white font-medium">{row.date}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{row.item}</td>
                                        <td className="px-4 py-3 text-sm text-slate-500">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                {row.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-green-600 text-right font-medium">
                                            {row.income > 0 ? `+${row.income.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-red-600 text-right font-medium">
                                            {row.expense > 0 ? `-${row.expense.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-900 text-right font-bold bg-slate-50/50">
                                            {row.balance.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 pl-8">{row.wallet}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                        ไม่พบรายการเคลื่อนไหวในเดือนนี้
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {processedData.length > 0 && (
                            <tfoot className="bg-slate-50 font-semibold border-t border-slate-200">
                                <tr>
                                    <td colSpan={3} className="px-4 py-3 text-right text-slate-900">รวมทั้งสิ้น</td>
                                    <td className="px-4 py-3 text-right text-green-700 bg-green-50">{totalIncome.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-red-700 bg-red-50">{totalExpense.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-slate-900 bg-slate-100">
                                        {(totalIncome - totalExpense).toLocaleString()}
                                    </td>
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

export default DailyCashPage;
