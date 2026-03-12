import React, { useMemo, useState } from 'react';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  DocumentCheckIcon,
  PlusIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
} from '../../assets/icons/Icons';


// Interfaces
import { Status } from '@/src/types/entity/core.interface';
import { JobStatus } from '@/src/types/enums/job';
import { AsessmentStatus } from '@/src/types/enums/assessment';
import { InvoiceStatus } from '@/src/types/enums/financial';

import { formatThaiDateTime } from '../../utils/date';
import { Select, Button } from '../../components/common/FormControls';
import { useData } from '../../contexts/DataContext';
import { JobModal } from '@/src/components/features/jobs/JobModal';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Role } from '@/src/types';
import { AssessmentModal } from '@/src/components/features/assessments/AssessmentModal';


const SimpleAreaChart = ({
  data,
}: {
  data: { name: string; total: number }[];
}) => {
  
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500">
        No data available
      </div>
    );
  }

  const height = 300;
  const width = 800;
  const padding = 40;
  const graphHeight = height - padding * 2;
  const graphWidth = width - padding * 2;

  // Handle empty data or invalid totals
  const validTotals = data
    .map((d) => d.total)
    .filter((total) => !isNaN(total) && isFinite(total));
  const maxVal = validTotals.length > 0 ? Math.max(...validTotals) * 1.2 : 1;

  // Handle case where maxVal is 0 (all values are 0)
  const safeMaxVal = maxVal || 1;

  const points = data
    .map((d, i) => {
      const total = isNaN(d.total) ? 0 : d.total;
      const x =
        padding + i * (graphWidth / (data.length > 1 ? data.length - 1 : 1));
      const y = height - padding - (total / safeMaxVal) * graphHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPath = `
        M ${padding},${height - padding} 
        ${points
      .split(' ')
      .map((p) => `L ${p}`)
      .join(' ')} 
        L ${width - padding},${height - padding} 
        Z
    `;

  const linePath = `M ${points
    .split(' ')
    .map((p) => p)
    .join(' L ')}`;

  return (
    <div className="w-full h-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#08a93d" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#08a93d" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
          const y = height - padding - tick * graphHeight;
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
            </g>
          );
        })}

        <path d={areaPath} fill="url(#chartGradient)" />
        <path
          d={linePath}
          fill="none"
          stroke="#08a93d"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((d, i) => {
          const total = isNaN(d.total) ? 0 : d.total;
          const x = padding + i * (graphWidth / (data.length - 1 || 1));
          const y = height - padding - (total / safeMaxVal) * graphHeight;
          return (
            <g key={i} className="group cursor-pointer">
              <circle
                cx={x}
                cy={y}
                r="4"
                fill="#fff"
                stroke="#08a93d"
                strokeWidth="2"
              />
              <foreignObject
                x={x - 40}
                y={y - 50}
                width="80"
                height="40"
                className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                <div className="bg-white shadow-lg rounded-lg border border-slate-100 p-2 text-center">
                  <p className="text-xs font-bold text-slate-700">
                    ฿{d.total.toLocaleString()}
                  </p>
                </div>
              </foreignObject>
              <text
                x={x}
                y={height - 20}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="12"
                fontFamily="sans-serif"
              >
                {d.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

interface DashboardProps { }

const Dashboard: React.FC<DashboardProps> = () => {
  const {
    users,
    assessments,
    jobs: fieldJobs,
    invoices,
    receipts,
    products,
    contracts,
    customers,
    goodsReceipts,
    withdrawals,
    transfers,
    stockAdjustments,
    productReturns,
    warehouses,
    handlers,
  } = useData();

  const currentUserRole = useCurrentUser()?.role;
  const onCreateAssessment = handlers.assessments.create;
  const onCreateJob = handlers.jobs.create;

  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [range, setRange] = useState<'today' | '7d' | 'month' | 'quarter'>(
    'month'
  );

  const today = new Date();
  const isToday = (dateStr: string) =>
    new Date(dateStr).toDateString() === today.toDateString();
  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return (
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };
  const inNextDays = (dateStr: string, days: number) => {
    const d = new Date(dateStr).getTime();
    const now = today.getTime();
    const future = now + days * 24 * 60 * 60 * 1000;
    return d >= now && d <= future;
  };

  const todaysJobs = fieldJobs.filter((j) => isToday(j.start_date as string));
  const overdueInvoices = invoices.filter(
    (i) => i.status === InvoiceStatus.OVERDUE
  );
  const lowStockItems = products.filter((p) => false); // Product interface doesn't have stock property

  const isInSelectedRange = (dateStr: string) => {
    const d = new Date(dateStr);
    if (range === 'today') return d.toDateString() === today.toDateString();
    if (range === '7d')
      return (
        d.getTime() >= today.getTime() - 7 * 24 * 60 * 60 * 1000 &&
        d.getTime() <= today.getTime()
      );
    if (range === 'month')
      return (
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    const q = Math.floor(today.getMonth() / 3);
    const startMonth = q * 3;
    const start = new Date(today.getFullYear(), startMonth, 1).getTime();
    const end = new Date(
      today.getFullYear(),
      startMonth + 3,
      0,
      23,
      59,
      59,
      999
    ).getTime();
    const ts = d.getTime();
    return ts >= start && ts <= end;
  };

  const monthlyRevenue = useMemo(
    () =>
      receipts
        .filter((r) => isInSelectedRange(r.paid_at))
        .reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [receipts, range]
  );
  const monthlyCompletedJobs = useMemo(
    () =>
      fieldJobs.filter(
        (j) =>
          j.status === JobStatus.Completed &&
          ((j.end_date as string)
            ? isInSelectedRange(j.end_date as string)
            : isInSelectedRange(j.start_date as string))
      ).length,
    [fieldJobs, range]
  );
  const monthlyNewCustomers = useMemo(
    () =>
      customers.filter((c) => c.created_at && isInSelectedRange(c.created_at))
        .length,
    [customers, range]
  );
  const monthlyConversionRate = useMemo(() => {
    const base = assessments.filter((a) =>
      isInSelectedRange(a.created_at)
    ).length;
    const converted = contracts.filter((c) =>
      isInSelectedRange(c.start_date)
    ).length;
    if (base === 0) return 0;
    return Math.round((converted / base) * 100);
  }, [assessments, contracts, range]);

  const outstandingInvoices = useMemo(
    () =>
      invoices.filter(
        (i) =>
          i.status !== InvoiceStatus.PAID &&
          i.status !== InvoiceStatus.CANCELLED
      ),
    [invoices]
  );
  const outstandingInvoicesTotal = useMemo(
    () => outstandingInvoices.reduce((sum, i) => sum + Number(i.total || 0), 0),
    [outstandingInvoices]
  );
  const inventoryValue = useMemo(() => 0, []); // Stock tracking disabled: Product interface lacks stock property

  const upcomingJobs = useMemo(
    () =>
      fieldJobs
        .filter((j) => inNextDays(j.start_date as string, 7))
        .sort(
          (a, b) =>
            new Date(a.start_date as string).getTime() -
            new Date(b.start_date as string).getTime()
        )
        .slice(0, 5),
    [fieldJobs]
  );
  const upcomingAssessments = useMemo(
    () =>
      assessments
        .filter((a) => inNextDays(a.appointment_date as string, 7))
        .sort(
          (a, b) =>
            new Date(a.appointment_date as string).getTime() -
            new Date(b.appointment_date as string).getTime()
        )
        .slice(0, 5),
    [assessments]
  );

  const monthlyWarehouseOps = useMemo(() => {
    const countMonth = (arr: { created_at?: string }[]) =>
      arr.filter((x) => x.created_at && isThisMonth(x.created_at)).length;
    return {
      gr: countMonth(goodsReceipts),
      wd: countMonth(withdrawals),
      tf: countMonth(transfers),
      sa: countMonth(stockAdjustments),
      rt: countMonth(productReturns),
    };
  }, [goodsReceipts, withdrawals, transfers, stockAdjustments, productReturns]);

  const pendingApprovals = useMemo(() => {
    const count = (arr: { status: Status | string }[]) =>
      arr.filter((x) => x.status === Status.PendingApproval).length;
    return (
      count(goodsReceipts as any) +
      count(withdrawals as any) +
      count(stockAdjustments as any)
    );
  }, [goodsReceipts, withdrawals, stockAdjustments]);

  const technicianWorkloadList = useMemo(() => {
    const data: { name: string; jobs: number }[] = [];
    fieldJobs
      .filter((j) => isInSelectedRange(j.start_date as string))
      .forEach((job) => {
        (job.job_team_members || []).forEach((t) => {
          const user = users.find((u) => u.id === t.user_id);
          const name = user
            ? `${user.first_name} ${user.last_name || ''}`.trim()
            : '';
          const idx = data.findIndex((x) => x.name === name);
          if (idx >= 0) data[idx].jobs += 1;
          else data.push({ name, jobs: 1 });
        });
      });
    return data.sort((a, b) => b.jobs - a.jobs).slice(0, 6);
  }, [fieldJobs, range]);

  const upcomingCombined = useMemo(() => {
    const jobs = upcomingJobs.map((j) => ({
      type: 'งาน',
      time: j.start_date as string,
      name:
        `${j.customer?.first_name || ''} ${j.customer?.last_name || ''}`.trim() ||
        '',
      status: j.status,
      id: j.id,
    }));
    const asses = upcomingAssessments.map((a) => ({
      type: 'ประเมิน',
      time: a.appointment_date as string,
      name:
        `${a.customer?.first_name || ''} ${a.customer?.last_name || ''}`.trim() ||
        '',
      status: a.status,
      id: a.id,
    }));
    return [...jobs, ...asses]
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .slice(0, 8);
  }, [upcomingJobs, upcomingAssessments]);

  const chartData = useMemo(() => {
    const months = [
      'ม.ค.',
      'ก.พ.',
      'มี.ค.',
      'เม.ย.',
      'พ.ค.',
      'มิ.ย.',
      'ก.ค.',
      'ส.ค.',
      'ก.ย.',
      'ต.ค.',
      'พ.ย.',
      'ธ.ค.',
    ];
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIdx = d.getMonth();
      const year = d.getFullYear();
      const monthName = months[monthIdx];

      const total = receipts.reduce((acc, r) => {
        const rDate = new Date(r.paid_at);
        if (rDate.getMonth() === monthIdx && rDate.getFullYear() === year) {
          return acc + r.amount;
        }
        return acc;
      }, 0);

      result.push({ name: monthName, total });
    }

    return result;
  }, [receipts]);

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 bg-slate-50/50 min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
              แดชบอร์ด
            </h1>
            <p className="mt-1 text-slate-500 font-medium">
              ภาพรวมธุรกิจประจำวันของคุณ
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="w-full sm:w-48">
              <Select
                value={range}
                onChange={(e) => setRange(e.target.value as any)}
                title="ช่วงเวลา"
                className="bg-white border-slate-200 shadow-sm"
              >
                <option value="today">วันนี้</option>
                <option value="7d">7 วันย้อนหลัง</option>
                <option value="month">เดือนนี้</option>
                <option value="quarter">ไตรมาสนี้</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsAssessmentModalOpen(true)}
                variant="accent"
                className="shadow-md shadow-accent/20"
              >
                <PlusIcon className="h-5 w-5 mr-1" />
                สร้างใบประเมิน
              </Button>
              <Button
                onClick={() => setIsJobModalOpen(true)}
                className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                <PlusIcon className="h-5 w-5 mr-1 text-slate-500" />
                สร้างงานภาคสนาม
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column (Primary Operations) */}
          <div className="xl:col-span-2 space-y-6">
            {/* 1. Today's Schedule (Hero) */}
            <Card
              title={`งานภาคสนามวันนี้ (${todaysJobs.length})`}
              className="shadow-sm border-slate-200"
            >
              {todaysJobs.length > 0 ? (
                <div className="grid gap-4">
                  {todaysJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-lg hover:border-primary/30 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-full ${job.status === JobStatus.Completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}
                        >
                          <ClipboardDocumentListIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-lg">
                            {job.customer?.first_name} {job.customer?.last_name}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <CalendarDaysIcon className="h-4 w-4" />{' '}
                              {
                                formatThaiDateTime(
                                  job.start_date as string
                                ).split(' ')[1]
                              }
                            </span>
                            <span>•</span>
                            <span>
                              {job.customer?.address_house_no}{' '}
                              {job.customer?.sub_district}{' '}
                              {job.customer?.district} {job.customer?.province}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge status={job.status} />
                        <span className="text-xs text-slate-400">
                          {job.job_team_members
                            ?.map((tm) => {
                              const user = users.find(
                                (u) => u.id === tm.user_id
                              );
                              return user
                                ? `${user.first_name} ${user.last_name || ''}`.trim()
                                : '';
                            })
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <DocumentCheckIcon className="h-12 w-12 mb-3 opacity-50" />
                  <p className="font-medium">ไม่มีงานภาคสนามวันนี้</p>
                  <Button
                    onClick={() => setIsJobModalOpen(true)}
                    variant="ghost"
                    className="mt-2 text-primary hover:bg-primary/5"
                  >
                    + สร้างงานใหม่
                  </Button>
                </div>
              )}
            </Card>

            {/* 2. Revenue Trend */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-primary" />
                    แนวโน้มรายรับ
                  </h3>
                  <p className="text-sm text-slate-500">
                    รายรับจริงจากใบเสร็จ (ตัวอย่างกราฟ)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">ยอดรวมเดือนนี้</p>
                  <p className="text-2xl font-bold text-slate-800">
                    ฿
                    {monthlyRevenue.toLocaleString('th-TH', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <SimpleAreaChart data={chartData} />
              </div>
            </div>

            {/* 3. Upcoming Schedule */}
            <Card
              title="กำหนดการเร็วๆ นี้ (7 วัน)"
              className="shadow-sm border-slate-200"
            >
              {upcomingCombined.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {upcomingCombined.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 py-3 hover:bg-slate-50 px-2 rounded-md transition-colors"
                    >
                      <div
                        className={`flex-shrink-0 p-2 rounded-lg ${item.type === 'งาน' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}
                      >
                        <CalendarDaysIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatThaiDateTime(item.time)} • {item.type}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                  {upcomingCombined.length > 5 && (
                    <div className="pt-3 text-center">
                      <Button
                        variant="ghost"
                        className="text-sm text-slate-500 hover:text-primary"
                      >
                        ดูทั้งหมด ({upcomingCombined.length})
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <p>ไม่มีกำหนดการเร็วๆ นี้</p>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column (Sidebar - Data & Alerts) */}
          <div className="space-y-6">
            {/* 1. Action Needed (Consolidated Alerts) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-red-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  สิ่งที่ต้องดูแล
                </h3>
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {outstandingInvoices.length + lowStockItems.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {/* Overdue Invoices */}
                {outstandingInvoices.length > 0 && (
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-slate-700">
                        ยอดค้างชำระ
                      </span>
                      <span className="text-xs text-red-600 font-bold">
                        รวม ฿{outstandingInvoicesTotal.toLocaleString()}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {outstandingInvoices.slice(0, 3).map((inv) => (
                        <li
                          key={inv.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-slate-600 truncate max-w-[140px]">
                            {inv.customer_name}
                          </span>
                          <span className="text-slate-800 font-medium">
                            ฿{inv.total.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {outstandingInvoices.length > 3 && (
                      <p className="text-xs text-slate-400 mt-2 text-right">
                        + อีก {outstandingInvoices.length - 3} รายการ
                      </p>
                    )}
                  </div>
                )}

                {/* Low Stock */}
                {lowStockItems.length > 0 && (
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-slate-700">
                        สินค้าใกล้หมด
                      </span>
                      <span className="text-xs text-amber-600 font-bold">
                        {lowStockItems.length} รายการ
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {lowStockItems.slice(0, 3).map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-slate-600 truncate max-w-[140px]">
                            {item.name}
                          </span>
                          <span className="text-amber-600 font-medium">
                            เหลือ {item.min_stock || 0}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {outstandingInvoices.length === 0 &&
                  lowStockItems.length === 0 && (
                    <div className="p-6 text-center text-slate-500">
                      <DocumentCheckIcon className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
                      <p className="text-sm">
                        ยอดเยี่ยม! ไม่มีรายการต้องดำเนินการ
                      </p>
                    </div>
                  )}
              </div>
            </div>

            {/* 2. Technician Workload */}
            <Card
              title="ภาระงานช่าง (เดือนนี้)"
              className="shadow-sm border-slate-200"
            >
              {technicianWorkloadList.length > 0 ? (
                <div className="space-y-4">
                  {technicianWorkloadList.map((t, idx) => (
                    <div key={t.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">
                          {t.name}
                        </span>
                        <span className="text-slate-500">{t.jobs} งาน</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${Math.min((t.jobs / 20) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">
                  ไม่มีข้อมูลงาน
                </p>
              )}
            </Card>

            {/* 3. Conversion Rate */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  อัตราปิดการขาย
                </p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {monthlyConversionRate}%
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  จากใบประเมินเป็นสัญญา
                </p>
              </div>
              <div className="h-16 w-16 text-primary relative">
                <svg
                  viewBox="0 0 36 36"
                  className="w-full h-full transform -rotate-90"
                >
                  <path
                    className="text-slate-100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="text-current transition-all duration-1000 ease-out"
                    strokeDasharray={`${monthlyConversionRate}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                </svg>
              </div>
            </div>

            {/* 4. Warehouse & Financial Compact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
                <CurrencyDollarIcon className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-xs text-slate-500">เก็บเงินสำเร็จ</p>
                <p className="font-bold text-slate-800 text-lg">
                  {receipts.filter((r) => isThisMonth(r.paid_at)).length} ใบ
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
                <ArchiveBoxIcon className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <p className="text-xs text-slate-500">เบิกของ (เดือน)</p>
                <p className="font-bold text-slate-800 text-lg">
                  {monthlyWarehouseOps.wd} รายการ
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AssessmentModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        onSubmit={onCreateAssessment}
      />
      
      <JobModal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        mode="add"
        onSubmitJob={onCreateJob}
        jobs={fieldJobs}
        users={users}
        warehouses={warehouses}
        contracts={contracts} 
        currentUserRole={currentUserRole as Role}      
      />
    </>
  );
};

export default Dashboard;
