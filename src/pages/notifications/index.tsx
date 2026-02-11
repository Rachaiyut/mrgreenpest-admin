import React, { useMemo, useState } from 'react';
import { Card } from '../../components/common/Card';
import { Select, Input } from '../../components/common/FormControls';
import {
  Contract,
  Invoice,
  Receipt,
  Status,
  Customer,
} from '@/src/types/entity/app.interface';
import { formatThaiDate } from '../../utils/date';

import { useData } from '../../contexts/DataContext';

interface NotificationsProps { }

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

  // Helper: Get all jobs for a contract (from contract.jobs or fallback to global jobs)
  const getContractJobs = (contract: any) => {
    let jobList = contract.jobs || [];

    // Fallback to global jobs if not present in contract (legacy support)
    if (jobList.length === 0) {
      jobList = jobs.filter((j: any) => j.contract_id === contract.id || j.contractId === contract.id);
    }

    return jobList;
  };

  // Helper to find latest completed job
  const getLatestJob = (allJobs: any[]) => {
    const completedJobs = allJobs
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
    return completedJobs.length > 0 ? completedJobs[0] : null;
  };

  // Helper to find next scheduled job
  const getNextJob = (allJobs: any[]) => {
    const scheduledJobs = allJobs
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
    return scheduledJobs.length > 0 ? scheduledJobs[0] : null;
  };

  // Process data for the table
  const tableData = useMemo(() => {
    console.log('[Notifications] contracts:', contracts.length, 'jobs:', jobs.length, 'invoices:', invoices.length);
    return contracts.map((contract: any) => {
      const cId = contract.customer_id || contract.customerId;
      const customer = customers.find((c) => c.id === cId);
      const allContractJobs = getContractJobs(contract);
      const latestJob: any = getLatestJob(allContractJobs);
      const nextJob: any = getNextJob(allContractJobs);

      console.log(`[Notifications] Contract ${contract.code}: contract.jobs=`, contract.jobs?.length, 'allContractJobs=', allContractJobs.length, 'latestJob=', latestJob?.id, 'nextJob=', nextJob?.id);

      // Safe date helper to prevent white screen on invalid dates
      const getValidDate = (d: any): Date => {
        const date = new Date(d);
        return !isNaN(date.getTime()) ? date : new Date();
      };

      // Safe helper for address
      const fullAddress = customer
        ? `${customer.address_house_no || ''} ${customer.road_line || ''} ${customer.sub_district || ''} ${customer.district || ''} ${customer.province || ''} ${customer.postal_code || ''}`.trim()
        : '-';

      // ========== 🟢 GREEN SECTION: Service Info ==========

      // --- ครั้งที่ (Visit Number) ---
      // Count completed jobs for this contract
      const completedJobsCount = allContractJobs.filter(
        (j: any) => j.status === Status.Completed || j.status === 'COMPLETE'
      ).length;

      // --- วันที่ตรวจล่าสุด (Last Service Date) ---
      // First visit: Job that has assessment_id (first time from assessment)
      // Subsequent visits: Jobs that have contract_id
      let lastServiceDate: string = '-';

      // Sort all completed jobs by end_date descending
      const completedJobsSorted = allContractJobs
        .filter((j: any) => j.status === Status.Completed || j.status === 'COMPLETE')
        .sort((a: any, b: any) => {
          const dateA = new Date(a.end_date || a.endTime).getTime();
          const dateB = new Date(b.end_date || b.endTime).getTime();
          return dateB - dateA;
        });

      if (completedJobsSorted.length > 0) {
        // Latest completed job provides the last service date
        const latest = completedJobsSorted[0];
        lastServiceDate = latest.end_date || latest.endTime || '-';
      } else {
        // If no completed jobs with contract_id, look for assessment-based first job
        // (Jobs in the global list that reference an assessment related to this contract's customer)
        const assessmentJobs = jobs
          .filter((j: any) =>
            j.assessment_id &&
            (j.customer_id === cId) &&
            (j.status === Status.Completed || j.status === 'COMPLETE')
          )
          .sort((a: any, b: any) => {
            const dateA = new Date(a.end_date || a.endTime).getTime();
            const dateB = new Date(b.end_date || b.endTime).getTime();
            return dateB - dateA;
          });

        if (assessmentJobs.length > 0) {
          lastServiceDate = assessmentJobs[0].end_date || (assessmentJobs[0] as any).endTime || '-';
        }
      }

      // --- เข้าตรวจถัดไป (Next Service Date) ---
      // Pull from service_report.next_service_schedule of the latest completed job
      let nextServiceDue: Date;
      let nextServiceDisplay: string | null = null;

      // 1. Try to get from Service Report's next_service_schedule
      if (latestJob && latestJob.service_report && latestJob.service_report.next_service_schedule) {
        nextServiceDisplay = latestJob.service_report.next_service_schedule;

        const dateFromReport = getValidDate(latestJob.service_report.next_service_schedule);
        if (!isNaN(dateFromReport.getTime()) && dateFromReport.getFullYear() > 1970) {
          nextServiceDue = dateFromReport;
        } else {
          // next_service_schedule might be text like "15/03/2569" or Thai format
          // Keep the display string, but calculate remaining from next scheduled job
          if (nextJob && (nextJob.start_date || nextJob.startTime)) {
            nextServiceDue = getValidDate(nextJob.start_date || nextJob.startTime);
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
      // 4. If no contract jobs, check assessment-based jobs for next_service_schedule
      else {
        // Check assessment jobs' service reports
        const assessmentJobsWithReport = jobs
          .filter((j: any) =>
            j.assessment_id &&
            (j.customer_id === cId) &&
            (j.status === Status.Completed || j.status === 'COMPLETE') &&
            j.service_report?.next_service_schedule
          )
          .sort((a: any, b: any) => {
            const dateA = new Date(a.end_date || a.endTime).getTime();
            const dateB = new Date(b.end_date || b.endTime).getTime();
            return dateB - dateA;
          });

        if (assessmentJobsWithReport.length > 0) {
          const sr = assessmentJobsWithReport[0].service_report;
          nextServiceDisplay = sr.next_service_schedule;
          const dateFromReport = getValidDate(sr.next_service_schedule);
          if (!isNaN(dateFromReport.getTime()) && dateFromReport.getFullYear() > 1970) {
            nextServiceDue = dateFromReport;
          } else {
            nextServiceDue = new Date();
          }
        } else {
          nextServiceDue = new Date(); // Default to today if no data
        }
      }

      // ========== 🔴 RED SECTION: Payment Info ==========
      // Reference invoice by term of job (via job.invoice_id)
      // Find the latest job's invoice, or find invoices linked to the contract
      let invoiceTerm: string | number = '-';
      let invoiceAmount: number = 0;
      let invoiceStatus: string = '-';
      let invoiceDueDate: string = '-';

      // 1. Check if the latest job has an invoice_id
      if (latestJob && latestJob.invoice_id) {
        const jobInvoice = invoices.find((inv: any) => inv.id === latestJob.invoice_id);
        if (jobInvoice) {
          invoiceTerm = jobInvoice.term || '-';
          invoiceAmount = Number(jobInvoice.total) || 0;
          invoiceStatus = (jobInvoice as any).status || '-';
          invoiceDueDate = (jobInvoice as any).due_at || '-';
        }
      }

      // 2. Fallback: Find invoices linked to the contract by contract_id
      if (invoiceTerm === '-') {
        const contractInvoices = invoices
          .filter((inv: any) => inv.contract_id === contract.id)
          .sort((a: any, b: any) => {
            const termA = (a as any).term || 0;
            const termB = (b as any).term || 0;
            return termB - termA; // Latest term first
          });

        if (contractInvoices.length > 0) {
          const latestInvoice = contractInvoices[0];
          invoiceTerm = latestInvoice.term || '-';
          invoiceAmount = Number(latestInvoice.total) || 0;
          invoiceStatus = (latestInvoice as any).status || '-';
          invoiceDueDate = (latestInvoice as any).due_at || '-';
        }
      }

      // 3. Fallback: Find receipts by customer for payment info
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
        contractId: contract.code || contract.id,
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

        // 🔴 Payment Info (from Invoice by job term)
        installment: invoiceTerm,
        invoiceAmount: invoiceAmount,
        invoiceStatus: invoiceStatus,
        invoiceDueDate: invoiceDueDate,
        paymentMethod: latestReceipt?.payment_method || latestReceipt?.paymentMethod || '-',
        amountPaid: latestReceipt?.amount || 0,
        paidDate: latestReceipt?.paid_at || latestReceipt?.paidAt || latestReceipt?.received_at || '-',

        // 🟢 Service Info 
        visitNumber: completedJobsCount,
        lastServiceDate: lastServiceDate,
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
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-red-50">
                  งวดที่
                </th>
                <th className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap bg-red-50">
                  จำนวนเงิน (Invoice)
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-red-50">
                  สถานะ Invoice
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 whitespace-nowrap bg-red-50">
                  กำหนดชำระ
                </th>
                <th className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap bg-green-50">
                  ครั้งที่
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

                  {/* 🔴 Red Section: Invoice Info */}
                  <td className="px-3 py-3 whitespace-nowrap text-center text-slate-600 bg-red-50/50">
                    {row.installment}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-right text-slate-600 bg-red-50/50">
                    {row.invoiceAmount > 0 ? row.invoiceAmount.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center bg-red-50/50">
                    {row.invoiceStatus !== '-' ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${row.invoiceStatus === 'PAID' ? 'bg-green-100 text-green-700' :
                        row.invoiceStatus === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                          row.invoiceStatus === 'SENT' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                        }`}>
                        {row.invoiceStatus === 'PAID' ? 'ชำระแล้ว' :
                          row.invoiceStatus === 'OVERDUE' ? 'เกินกำหนด' :
                            row.invoiceStatus === 'SENT' ? 'ส่งแล้ว' :
                              row.invoiceStatus === 'DRAFT' ? 'ร่าง' :
                                row.invoiceStatus}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600 bg-red-50/50">
                    {row.invoiceDueDate !== '-' ? formatThaiDate(row.invoiceDueDate) : '-'}
                  </td>

                  {/* 🟢 Green Section: Service Info */}
                  <td className="px-3 py-3 whitespace-nowrap text-center font-medium text-slate-800 bg-green-50/50">
                    {row.visitNumber > 0 ? row.visitNumber : '-'}
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