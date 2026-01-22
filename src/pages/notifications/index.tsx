import React, { useMemo, useState } from 'react';
import { Card } from '../../components/common/Card';
import { Select, Button, Input } from '../../components/common/FormControls';
import {
  Contract,
  FieldJob,
  Invoice,
  Receipt,
  Status,
  Customer,
} from '@/src/types/entity/app.interface';
import { formatThaiDate } from '../../utils/date';

import { useData } from '../../contexts/DataContext';

interface NotificationsProps {}

const Notifications: React.FC<NotificationsProps> = () => {
  const {
    contracts,
    fieldJobs: jobs,
    invoices,
    receipts,
    customers,
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'ทั้งหมด' | 'ใกล้หมดสัญญา' | 'ใกล้กำหนดตรวจ' | 'ค้างชำระ'
  >('ทั้งหมด');

  // Helper to find latest job
  const getLatestJob = (contractId: string) => {
    const contractJobs = jobs
      .filter(
        (j) => j.contractId === contractId && j.status === Status.Completed
      )
      .sort(
        (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
      );
    return contractJobs.length > 0 ? contractJobs[0] : null;
  };

  // Helper to find next job
  const getNextJob = (contractId: string) => {
    const contractJobs = jobs
      .filter(
        (j) =>
          j.contractId === contractId &&
          [Status.Scheduled, Status.Planned, Status.InProgress].includes(
            j.status
          )
      )
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    return contractJobs.length > 0 ? contractJobs[0] : null;
  };

  // Process data for the table
  const tableData = useMemo(() => {
    return contracts.map((contract) => {
      const customer = customers.find((c) => c.id === contract.customerId);
      const latestJob = getLatestJob(contract.id);
      const nextJob = getNextJob(contract.id);

      // Safe date helper to prevent white screen on invalid dates
      const getValidDate = (d: any): Date => {
        const date = new Date(d);
        return !isNaN(date.getTime()) ? date : new Date();
      };

      // Safe helper for address
      const addr = customer?.address;
      const fullAddress = addr
        ? `${addr.street || ''} ${addr.subdistrict || ''} ${addr.district || ''} ${addr.province || ''}`
        : '-';

      // Calculate next due date logic
      let nextServiceDue: Date;
      if (nextJob && nextJob.startTime) {
        nextServiceDue = getValidDate(nextJob.startTime);
      } else if (latestJob && latestJob.endTime) {
        const lastEnd = getValidDate(latestJob.endTime);
        const d = new Date(lastEnd);
        d.setDate(lastEnd.getDate() + 30);
        nextServiceDue = d;
      } else {
        nextServiceDue = new Date(); // Default to today if no data
      }

      // Check invoices matching contract
      const contractInvoices = invoices.filter(
        (i) => i.customerId === contract.customerId && i.status !== Status.Paid
      );
      const latestUnpaidInvoice =
        contractInvoices.length > 0 ? contractInvoices[0] : null;

      const latestReceipt = receipts
        .filter((r) => r.customerId === contract.customerId)
        .sort(
          (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
        )[0];

      // Contract duration calculation
      const start = getValidDate(contract.startDate);
      const end = getValidDate(contract.endDate);
      const durationYears = (end.getFullYear() - start.getFullYear()).toFixed(
        1
      );

      return {
        contractId: contract.id,
        customerName: contract.customerName || '-',
        nickname: customer?.nickname || '-',
        address: fullAddress,
        phone: customer?.phone || '-',
        contractDetails: contract.servicePackage || '-',
        durationYears: durationYears,
        visitsRequired: 12, // Mock or from pkg
        startDate: contract.startDate,
        endDate: contract.endDate,
        buildingType: 'บ้านเดี่ยว', // Mock
        // Price might be missing in old data/types
        price: contract.totalAmount || 0,

        // Payment Info
        installment: latestUnpaidInvoice?.term || '-',
        paymentMethod: latestReceipt?.paymentMethod || '-',
        amountPaid: latestReceipt?.amount || 0,
        paidDate: latestReceipt?.paidAt || '-',
        receiver: 'Admin', // Mock
        approvePay: latestReceipt ? 'Yes' : 'No',

        nextPaymentPeriod: 30, // Mock days

        // Service Info
        lastServiceDate: latestJob ? latestJob.endTime : '-',
        nextServiceDays: 30, // Mock interval
        nextServiceDate: nextServiceDue,
        daysRemaining: Math.ceil(
          (nextServiceDue.getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      };
    });
  }, [contracts, jobs, invoices, receipts, customers]);

  const filteredData = useMemo(() => {
    return tableData.filter((item) => {
      const matchName = item.customerName
        ? item.customerName.toLowerCase().includes(searchTerm.toLowerCase())
        : false;
      const matchId = item.contractId
        ? item.contractId.toLowerCase().includes(searchTerm.toLowerCase())
        : false;
      const matchesSearch = matchName || matchId;

      if (!matchesSearch) return false;

      if (filterType === 'ใกล้หมดสัญญา') {
        const daysToEnd =
          (new Date(item.endDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24);
        return daysToEnd <= 60 && daysToEnd > 0;
      }
      if (filterType === 'ใกล้กำหนดตรวจ') {
        return item.daysRemaining <= 7;
      }
      if (filterType === 'ค้างชำระ') {
        return item.installment !== '-';
      }

      return true;
    });
  }, [tableData, searchTerm, filterType]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            การแจ้งเตือนและนัดหมาย
          </h1>
          <p className="text-slate-600 mt-1">
            ติดตามสถานะสัญญา การชำระเงิน และรอบบริการ
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-48"
          >
            <option value="ทั้งหมด">ทั้งหมด</option>
            <option value="ใกล้หมดสัญญา">ใกล้หมดสัญญา (60 วัน)</option>
            <option value="ใกล้กำหนดตรวจ">ใกล้กำหนดตรวจ (7 วัน)</option>
            <option value="ค้างชำระ">ค้างชำระ</option>
          </Select>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap sticky left-0 z-10 bg-slate-50">
                  เลขที่สัญญา
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap sticky left-20 z-10 bg-slate-50">
                  ชื่อ-นามสกุล ลูกค้า
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                  ชื่อเล่น
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                  ที่อยู่/เบอร์โทร
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                  รายละเอียดสัญญา
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap">
                  ระยะเวลา (ปี)
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                  เริ่มสัญญา
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                  หมดสัญญา
                </th>
                <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">
                  ราคา
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-blue-50">
                  งวดที่
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-blue-50">
                  วิธีชำระ
                </th>
                <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap bg-blue-50">
                  จำนวนเงิน
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap bg-blue-50">
                  วันที่จ่าย
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">
                  เข้าตรวจล่าสุด
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">
                  เข้าตรวจถัดไป
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">
                  เหลือ (วัน)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.map((row) => (
                <tr
                  key={row.contractId}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-3 py-3 whitespace-nowrap font-medium text-blue-600 sticky left-0 z-10 bg-white">
                    {row.contractId}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-800 sticky left-20 z-10 bg-white">
                    {row.customerName}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                    {row.nickname}
                  </td>
                  <td className="px-3 py-3 text-slate-600 min-w-[200px]">
                    <div className="truncate w-48" title={row.address}>
                      {row.address}
                    </div>
                    <div className="text-slate-400">{row.phone}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                    {row.contractDetails}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center text-slate-600">
                    {row.durationYears}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                    {formatThaiDate(row.startDate)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                    {formatThaiDate(row.endDate)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-right font-medium text-slate-800">
                    {row.price.toLocaleString()}
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap text-center text-slate-600 bg-blue-50/50">
                    {row.installment}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center text-slate-600 bg-blue-50/50">
                    {row.paymentMethod}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-right text-slate-600 bg-blue-50/50">
                    {row.amountPaid > 0 ? row.amountPaid.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600 bg-blue-50/50">
                    {row.paidDate !== '-' ? formatThaiDate(row.paidDate) : '-'}
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap text-center text-slate-600 bg-green-50/50">
                    {row.lastServiceDate !== '-'
                      ? formatThaiDate(row.lastServiceDate)
                      : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center text-slate-600 bg-green-50/50">
                    {formatThaiDate(row.nextServiceDate.toISOString())}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center font-bold bg-green-50/50">
                    <span
                      className={
                        row.daysRemaining <= 7
                          ? 'text-red-600'
                          : 'text-green-600'
                      }
                    >
                      {row.daysRemaining}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Notifications;


