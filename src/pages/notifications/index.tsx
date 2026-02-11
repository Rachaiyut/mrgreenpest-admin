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
    jobs,
    invoices,
    receipts,
    customers,
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'ทั้งหมด' | 'ใกล้หมดสัญญา' | 'ใกล้กำหนดตรวจ' | 'ค้างชำระ'
  >('ทั้งหมด');

  // Helper to find latest job
  const getLatestJob = (contract: any) => {
    let jobList = contract.jobs || [];
    
    // Fallback to global jobs if not present in contract (legacy support)
    if (jobList.length === 0) {
        jobList = jobs.filter((j: any) => j.contract_id === contract.id || j.contractId === contract.id);
    }

    const contractJobs = jobList
      .filter(
        (j: any) => (j.status === Status.Completed || j.status === 'COMPLETE')
      )
      .sort(
        (a: any, b: any) => {
            const dateA = new Date(a.end_date || a.endTime).getTime();
            const dateB = new Date(b.end_date || b.endTime).getTime();
            return dateB - dateA;
        }
      );
    return contractJobs.length > 0 ? contractJobs[0] : null;
  };

  // Helper to find next job
  const getNextJob = (contract: any) => {
    let jobList = contract.jobs || [];
    
    // Fallback to global jobs if not present in contract
    if (jobList.length === 0) {
        jobList = jobs.filter((j: any) => j.contract_id === contract.id || j.contractId === contract.id);
    }

    const contractJobs = jobList
      .filter(
        (j: any) =>
          [Status.Scheduled, Status.Planned, Status.InProgress, 'PENDING', 'IN_PROGRESS'].includes(
            j.status
          )
      )
      .sort(
        (a: any, b: any) => {
            const dateA = new Date(a.start_date || a.startTime).getTime();
            const dateB = new Date(b.start_date || b.startTime).getTime();
            return dateA - dateB;
        }
      );
    return contractJobs.length > 0 ? contractJobs[0] : null;
  };

  // Process data for the table
  const tableData = useMemo(() => {
    return contracts.map((contract: any) => {
      const cId = contract.customer_id || contract.customerId;
      const customer = customers.find((c) => c.id === cId);
      const latestJob: any = getLatestJob(contract);
      const nextJob: any = getNextJob(contract);

      // Safe date helper to prevent white screen on invalid dates
      const getValidDate = (d: any): Date => {
        const date = new Date(d);
        return !isNaN(date.getTime()) ? date : new Date();
      };

      // Safe helper for address
      const fullAddress = customer
        ? `${customer.address_house_no || ''} ${customer.road_line || ''} ${customer.sub_district || ''} ${customer.district || ''} ${customer.province || ''} ${customer.postal_code || ''}`.trim()
        : '-';

      // Calculate next due date logic
      let nextServiceDue: Date;
      let nextServiceDisplay: string | null = null;
      
      // 1. Try to get from Service Report of the latest completed job
      if (latestJob && latestJob.service_report && latestJob.service_report.next_service_schedule) {
         // Use the raw string from service report for display
         nextServiceDisplay = latestJob.service_report.next_service_schedule;

         const dateFromReport = getValidDate(latestJob.service_report.next_service_schedule);
         if (!isNaN(dateFromReport.getTime()) && dateFromReport.getFullYear() > 1970) {
            nextServiceDue = dateFromReport;
         } else {
             // Fallback logic for calculation only
             if (nextJob && (nextJob.start_date || nextJob.startTime)) {
                nextServiceDue = getValidDate(nextJob.start_date || nextJob.startTime);
              } else if (latestJob && (latestJob.end_date || latestJob.endTime)) {
                const lastEnd = getValidDate(latestJob.end_date || latestJob.endTime);
                const d = new Date(lastEnd);
                d.setDate(lastEnd.getDate() + 30);
                nextServiceDue = d;
              } else {
                nextServiceDue = new Date();
              }
         }
      } 
      // 2. Try to get from Next Scheduled Job
      else if (nextJob && (nextJob.start_date || nextJob.startTime)) {
        nextServiceDue = getValidDate(nextJob.start_date || nextJob.startTime);
      } 
      // 3. Fallback: Latest Job + 30 days
      else if (latestJob && (latestJob.end_date || latestJob.endTime)) {
        const lastEnd = getValidDate(latestJob.end_date || latestJob.endTime);
        const d = new Date(lastEnd);
        d.setDate(lastEnd.getDate() + 30);
        nextServiceDue = d;
      } 
      // 4. Default
      else {
        nextServiceDue = new Date(); // Default to today if no data
      }

      // Check invoices matching contract
      const contractInvoices = invoices.filter(
        (i: any) => (i.customer_id === cId || i.customerId === cId) && i.status !== Status.Paid
      );
      const latestUnpaidInvoice =
        contractInvoices.length > 0 ? contractInvoices[0] : null;

      const latestReceipt = receipts
        .filter((r: any) => (r.customer_id === cId || r.customerId === cId))
        .sort(
          (a: any, b: any) => new Date(b.paid_at || b.paidAt || b.received_at).getTime() - new Date(a.paid_at || a.paidAt || a.received_at).getTime()
        )[0] as any;

      // Contract duration calculation
      const startDate = contract.start_date || contract.startDate;
      const endDate = contract.end_date || contract.endDate;
      const start = getValidDate(startDate);
      const end = getValidDate(endDate);
      const durationYears = (end.getFullYear() - start.getFullYear()).toFixed(
        1
      );

      const displayPrice = contract.total_amount !== undefined ? contract.total_amount : contract.totalAmount || 0;
      const displayPackage = contract.service_type || contract.servicePackage || '-';

      return {
        contractId: contract.code || contract.id, // Show Code if available, else ID
        customerName: customer 
            ? `${customer.first_name} ${customer.last_name || ''}`.trim() 
            : (contract.customer_name || contract.customerName || '-'),
        nickname: customer?.nickname || '-',
        address: fullAddress,
        phone: customer?.phone || '-',
        contractDetails: displayPackage,
        durationYears: durationYears,
        visitsRequired: contract.service_count || 12,
        startDate: startDate,
        endDate: endDate,
        buildingType: contract.building_type || 'บ้านเดี่ยว',
        price: displayPrice,

        // Payment Info
        installment: latestUnpaidInvoice?.term || '-',
        paymentMethod: latestReceipt?.payment_method || latestReceipt?.paymentMethod || '-',
        amountPaid: latestReceipt?.amount || 0,
        paidDate: latestReceipt?.paid_at || latestReceipt?.paidAt || latestReceipt?.received_at || '-',
        receiver: 'Admin', // Mock
        approvePay: latestReceipt ? 'Yes' : 'No',

        nextPaymentPeriod: 30, // Mock days

        // Service Info
        lastServiceDate: latestJob ? (latestJob.end_date || latestJob.endTime) : '-',
        nextServiceDays: 30, // Mock interval
        nextServiceDate: nextServiceDue,
        nextServiceDisplay: nextServiceDisplay,
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
                    {(() => {
                        const display = row.nextServiceDisplay;
                        if (display) {
                            // Check if it's a valid date string (e.g. ISO format or YYYY-MM-DD)
                            const d = new Date(display);
                            if (!isNaN(d.getTime()) && display.includes('-')) {
                                return formatThaiDate(display);
                            }
                            return display;
                        }
                        return formatThaiDate(row.nextServiceDate.toISOString());
                    })()}
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