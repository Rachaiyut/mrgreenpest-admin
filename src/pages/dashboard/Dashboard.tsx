import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DashboardApi,
  DashboardActivityItem,
  DashboardCancelledJob,
  DashboardContractItem,
  DashboardCustomerAcquisition,
  DashboardData,
  DashboardInvoiceItem,
  DashboardJobItem,
  DashboardLongTermAging,
  DashboardMonthlyIncomeExpense,
  DashboardPaymentMethodItem,
  DashboardStockItem,
  DashboardTodayPayments,
  DashboardVehicleToday,
  VehicleState,
} from '../../api/dashboard';
import { DailyClosureApi } from '../../api/daily-closure';
import { StockIssueSummaryApi } from '../../api/stock-issue-summary';
import { StockIssueSummary } from '../../types/entity/inventory.interface';
import { DailyJobClosure } from '../../types/entity/daily-closure.interface';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingIcon } from '../../assets/icons/Icons';

type Range = 'today' | 'week' | 'month' | 'quarter';

const RANGE_LABELS: Record<Range, string> = {
  today: 'วันนี้',
  week: 'สัปดาห์นี้',
  month: 'เดือนนี้',
  quarter: 'ไตรมาสนี้',
};

const JOB_STATUS_LABELS: Record<string, string> = {
  UNASSIGNED: 'รอมอบหมาย',
  PENDING: 'รอดำเนินการ',
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETE: 'เสร็จสิ้น',
  WAITING_CLEAR: 'รอเคลียค่าใช้จ่ายและสารเคมี',
  CANCELLED: 'ยกเลิก',
  REJECTED: 'ถูกปฏิเสธ',
};

const ACTIVITY_LABELS: Record<string, string> = {
  job: 'งาน',
  invoice: 'ใบแจ้งหนี้',
  contract: 'สัญญา',
  quotation: 'ใบเสนอราคา',
};

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString('th-TH');
const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return fmtInt(Math.round(n));
};
const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
  } catch {
    return d;
  }
};
const fmtCustomerName = (first?: string | null, last?: string | null) => {
  const f = (first || '').trim();
  const l = (last || '').trim();
  if (!l || l === '-') return f || '-';
  return `${f} ${l}`;
};

interface DashboardProps {
  currentUserRole?: string;
}

const Dashboard: React.FC<DashboardProps> = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>('month');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openClosures, setOpenClosures] = useState<DailyJobClosure[]>([]);
  const [withdrawalStats, setWithdrawalStats] = useState<{
    total: number;
    pending: number;
    totalExpense: number;
  }>({ total: 0, pending: 0, totalExpense: 0 });

  useEffect(() => {
    setLoading(true);
    DashboardApi.getSummary(range)
      .then(setData)
      .catch((err) => console.error('Dashboard fetch error:', err))
      .finally(() => setLoading(false));
  }, [range]);

  // Apply mint background to <main> element while dashboard is mounted.
  // useLayoutEffect ensures the bg is set before the browser paints, so loading state never flashes gray.
  useLayoutEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;
    const previousBg = mainEl.style.backgroundColor;
    mainEl.style.backgroundColor = '#eaf7f0';
    return () => {
      mainEl.style.backgroundColor = previousBg;
    };
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().substring(0, 10);
    DailyClosureApi.getAll({ closure_date: today, status: 'OPEN', limit: 50 })
      .then((res) => setOpenClosures(res.data || []))
      .catch(() => setOpenClosures([]));

    StockIssueSummaryApi.getAll({ limit: 999 })
      .then((res) => {
        const items: StockIssueSummary[] = res?.data || [];
        const pending = items.filter((s) => s.status === 'PENDING').length;
        const totalExpense = items.reduce((sum, s) => {
          const expenses = s.expense_items || s.expense_item || [];
          return sum + expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        }, 0);
        setWithdrawalStats({ total: items.length, pending, totalExpense });
      })
      .catch(() => setWithdrawalStats({ total: 0, pending: 0, totalExpense: 0 }));
  }, []);

  if (loading || !data) {
    return (
      <div className="bg-[#eaf7f0] flex-1 flex flex-col items-center justify-center w-full min-h-[calc(100vh-4rem)] py-16 text-slate-500">
        <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p className="text-base font-medium">กำลังโหลดข้อมูลแดชบอร์ด...</p>
      </div>
    );
  }

  const {
    kpi,
    pipeline,
    todayJobs,
    upcomingJobs,
    overdueInvoices,
    lowStockItems,
    expiringContracts,
    revenueByMonth,
    jobsByStatus,
    recentActivities,
    pendingActions,
    comparison,
    todayPayments,
    cancelledJobsToday,
    monthlyIncomeExpense,
    vehiclesToday,
    customerAcquisition,
  } = data;

  return (
    <div className="bg-[#eaf7f0]">
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">แดชบอร์ด</h1>
            <p className="text-sm text-slate-500 mt-1">ภาพรวมธุรกิจ Mr. Green Pest Control</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <RangeDropdown value={range} onChange={setRange} />
          </div>
        </div>

        {/* Quick Actions row */}
        <div className="flex gap-2 flex-wrap">
          <QuickAction onClick={() => navigate('/field-operations')} label="สร้างงาน" iconPath="M12 4v16m8-8H4" />
          <QuickAction onClick={() => navigate('/invoice')} label="สร้างใบแจ้งหนี้" iconPath="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          <QuickAction onClick={() => navigate('/quotations')} label="สร้างใบเสนอราคา" iconPath="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          <QuickAction onClick={() => navigate('/customers')} label="ลูกค้า" iconPath="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </div>

        {/* PRIORITY 1: Daily Closure Alert (urgent action) */}
        {openClosures.length > 0 && (
          <div
            onClick={() => navigate('/daily-closures')}
            className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-md">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">รถที่ยังไม่ปิดงานวันนี้</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {openClosures.map((c) => c.vehicle?.name || 'ไม่กรอก').join(', ')}
                </p>
              </div>
            </div>
            <span className="text-2xl font-black text-amber-700">{openClosures.length}</span>
          </div>
        )}

        {/* PRIORITY 2: Vehicle real-time status strip (where are crews now) */}
        {vehiclesToday.length > 0 && <VehicleStatusStrip vehicles={vehiclesToday} />}

        {/* KPI Cards — Finova horizontal layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="รายได้รวม"
            value={`฿${fmtCompact(kpi.revenue)}`}
            change={comparison?.revenue.percent ?? 0}
            changeDir={comparison?.revenue.change ?? 0}
            footer={`${RANGE_LABELS[range]} • เทียบเดือนก่อน`}
            accent="emerald"
          />
          <KpiCard
            title="ยอดค้างชำระ"
            value={`฿${fmtCompact(kpi.outstanding_amount)}`}
            change={kpi.outstanding_count}
            changeDir={kpi.outstanding_count > 0 ? -1 : 0}
            footer={`${fmtInt(kpi.outstanding_count)} รายการค้างเก็บ`}
            accent="rose"
            isCountChange
          />
          <KpiCard
            title="สัญญาที่ใช้งาน"
            value={fmtInt(kpi.active_contracts)}
            change={comparison?.new_contracts.percent ?? 0}
            changeDir={comparison?.new_contracts.change ?? 0}
            footer={`สัญญาใหม่ ${fmtInt(comparison?.new_contracts.current ?? 0)} ฉบับ`}
            accent="violet"
          />
          <KpiCard
            title="อัตราปิดงาน"
            value={`${kpi.job_completion_rate}%`}
            change={comparison?.completed_jobs.percent ?? 0}
            changeDir={comparison?.completed_jobs.change ?? 0}
            footer={`${fmtInt(kpi.completed_jobs)}/${fmtInt(kpi.total_jobs)} งาน`}
            accent="amber"
          />
        </div>

        {/* PRIORITY 3: Today Snapshot — รายรับวันนี้ + งานยกเลิกวันนี้ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TodayPaymentsCard payments={todayPayments} />
          <CancelledJobsCard jobs={cancelledJobsToday} onNavigate={navigate} />
        </div>

        {/* PRIORITY 4: งานวันนี้ + สถานะงาน (operational right now) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Card className="xl:col-span-2">
            <CardHeader
              title="งานวันนี้"
              right={
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                  {todayJobs.length} งาน
                </span>
              }
            />
            {todayJobs.length > 0 ? (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                      <th className="font-medium px-2 py-2">ลำดับ</th>
                      <th className="font-medium px-2 py-2">ลูกค้า</th>
                      <th className="font-medium px-2 py-2 hidden md:table-cell">บริการ / ที่อยู่</th>
                      <th className="font-medium px-2 py-2">เวลา</th>
                      <th className="font-medium px-2 py-2">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayJobs.slice(0, 8).map((job: DashboardJobItem, idx: number) => {
                      const time = job.actual_start_time
                        ? new Date(job.actual_start_time).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-';
                      return (
                        <tr
                          key={job.id}
                          className="border-b border-slate-50 last:border-0 hover:bg-emerald-50/40 transition-colors"
                        >
                          <td className="px-2 py-3 text-slate-400 tabular-nums">{idx + 1}</td>
                          <td className="px-2 py-3">
                            <span className="font-medium text-slate-700 truncate">
                              {fmtCustomerName(job.customer_first_name, job.customer_last_name)}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-slate-500 truncate max-w-[280px] hidden md:table-cell">
                            {job.service_system || ''}
                            {job.address ? ` • ${job.address}` : ''}
                          </td>
                          <td className="px-2 py-3 tabular-nums text-slate-700">{time}</td>
                          <td className="px-2 py-3">
                            <StatusBadge status={job.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">ไม่มีงานวันนี้</div>
            )}
          </Card>

          <Card>
            <CardHeader title="สถานะงาน" subtitle={RANGE_LABELS[range]} />
            <JobStatusBars items={jobsByStatus} />
          </Card>
        </div>

        {/* PRIORITY 5: Per-Vehicle field status (drill-down) */}
        {vehiclesToday.some((v) => v.counts.total > 0) && (
          <VehiclesTodaySection vehicles={vehiclesToday.filter((v) => v.counts.total > 0)} />
        )}

        {/* PRIORITY 6: รอดำเนินการ + เปรียบเทียบ + Sales Pipeline (action items) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card>
            <CardHeader
              title="รอดำเนินการ"
              right={
                pendingActions.total > 0 ? (
                  <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    {pendingActions.total}
                  </span>
                ) : null
              }
            />
            {pendingActions.items.length > 0 ? (
              <div className="space-y-2">
                {pendingActions.items.map((item) => {
                  const dotColor: Record<string, string> = {
                    amber: 'bg-amber-400',
                    blue: 'bg-blue-400',
                    purple: 'bg-violet-400',
                    green: 'bg-emerald-400',
                    red: 'bg-rose-400',
                  };
                  return (
                    <button
                      key={item.key}
                      onClick={() => navigate(item.path)}
                      className="w-full flex items-center justify-between p-3 rounded-md bg-slate-50 hover:bg-emerald-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor[item.color] || dotColor.blue}`} />
                        <span className="text-sm font-medium text-slate-700 truncate">{item.label}</span>
                      </div>
                      <span className="text-base font-bold text-slate-800 group-hover:text-primary">{item.count}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-emerald-500 text-sm font-medium">
                ไม่มีรายการค้าง
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="เปรียบเทียบ" subtitle="เดือนนี้ vs เดือนก่อน" />
            <div className="space-y-2.5">
              {comparison &&
                [
                  { label: 'รายได้', data: comparison.revenue, isCurrency: true },
                  { label: 'งานทั้งหมด', data: comparison.jobs, isCurrency: false },
                  { label: 'งานเสร็จสิ้น', data: comparison.completed_jobs, isCurrency: false },
                  { label: 'ลูกค้าใหม่', data: comparison.new_customers, isCurrency: false },
                  { label: 'สัญญาใหม่', data: comparison.new_contracts, isCurrency: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">
                        {item.isCurrency ? fmt(item.data.current) : fmtInt(item.data.current)}
                      </span>
                      <ChangeChip percent={item.data.percent} dir={item.data.change} />
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Sales Pipeline" subtitle="กระบวนการขาย" />
            <div className="space-y-5">
              <PipelineRow
                label="ใบประเมิน"
                total={pipeline.assessments.total}
                done={pipeline.assessments.completed}
                color="bg-slate-500"
              />
              <PipelineRow
                label="ใบเสนอราคา"
                total={pipeline.quotations.total}
                done={pipeline.quotations.signed}
                color="bg-blue-500"
              />
              <PipelineRow
                label="สัญญา"
                total={pipeline.contracts.total}
                done={pipeline.contracts.active}
                color="bg-emerald-500"
              />
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">ประเมิน → เสนอราคา</span>
                  <span className="font-semibold text-slate-700">{pipeline.conversion.assessment_to_quotation}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">เสนอราคา → เซ็น</span>
                  <span className="font-semibold text-slate-700">{pipeline.conversion.quotation_to_signed}%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* PRIORITY 7: รายรับ/รายจ่ายเดือนนี้ + combo chart 12 เดือน (financial trend) */}
        <MonthlyIncomeExpenseSection data={monthlyIncomeExpense} />

        {/* PRIORITY 8: ลูกค้าใหม่ vs ลูกค้าต่อสัญญา + donut + combo chart (growth) */}
        <CustomerAcquisitionSection data={customerAcquisition} />

        {/* PRIORITY 9: Revenue Overview chart + Aging donut */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Card className="xl:col-span-2">
            <CardHeader title="ภาพรวมรายได้" subtitle="รายเดือน (6 เดือนล่าสุด)" right={<ChartLegend />} />
            {revenueByMonth.length > 0 ? (
              <RevenueChart data={revenueByMonth} comparison={comparison} />
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">ไม่มีข้อมูลรายได้</div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="สัดส่วนยอดค้างชำระ"
              subtitle="แยกตามอายุหนี้"
              right={
                <button
                  onClick={() => navigate('/invoices')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  ดูทั้งหมด
                </button>
              }
            />
            <AgingDonut aging={overdueInvoices.aging} />
          </Card>
        </div>

        {/* PRIORITY 10: ยอดค้างชำระสะสมแบ่งกลุ่ม 3/6/12+ เดือน (receivable risk) */}
        <LongTermAgingSection aging={overdueInvoices.longTermAging} onNavigate={navigate} />

        {/* PRIORITY 11: Overdue invoices + Expiring contracts + Low stock + Withdrawal (detail alerts) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <Card>
            <CardHeader title="ใบแจ้งหนี้ค้างชำระ" />
            <div className="space-y-2 mb-3">
              {Object.entries(overdueInvoices.aging).map(([label, amount]) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-md text-xs"
                >
                  <span className="text-slate-500">
                    {label === 'current' ? 'ยังไม่ถึงกำหนด' : `${label} วัน`}
                  </span>
                  <span className="font-semibold text-slate-800 tabular-nums">{fmt(amount as number)}</span>
                </div>
              ))}
            </div>
            {overdueInvoices.items.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {overdueInvoices.items.slice(0, 5).map((inv: DashboardInvoiceItem) => (
                  <div key={inv.id} className="flex items-center justify-between text-xs p-2 bg-rose-50 rounded-md">
                    <div className="truncate flex-1">
                      <span className="font-medium text-slate-700">{inv.code}</span>
                      <span className="text-slate-500 ml-1">{inv.customer_name}</span>
                    </div>
                    <span className="text-rose-600 font-semibold ml-2 whitespace-nowrap tabular-nums">
                      {fmt(Number(inv.total) - Number(inv.paid_amount || 0))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="สัญญาใกล้หมดอายุ" subtitle="ภายใน 30 วัน" />
            {expiringContracts.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {expiringContracts.map((c: DashboardContractItem) => (
                  <div key={c.id} className="p-2.5 bg-amber-50 rounded-md border border-amber-100">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{c.code}</p>
                        <p className="text-xs text-slate-500 truncate">{c.customer_name}</p>
                      </div>
                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium whitespace-nowrap ml-2">
                        อีก {c.days_remaining} วัน
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
                ไม่มีสัญญาใกล้หมดอายุ
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="สินค้าใกล้หมดสต็อก" />
            {lowStockItems.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {lowStockItems.map((item: DashboardStockItem) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-rose-50 rounded-md">
                    <div className="truncate flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.code}</p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-sm font-bold text-rose-600 tabular-nums">
                        {fmtInt(Number(item.total_stock))}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        ขั้นต่ำ {item.min_stock} {item.unit_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-emerald-500 text-sm">สต็อกปกติทั้งหมด</div>
            )}
          </Card>

          <Card onClick={() => navigate('/inventory/issue-summaries')} hover>
            <CardHeader title="สรุปการเบิก" />
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                <span className="text-sm text-slate-600">ใบเบิกทั้งหมด</span>
                <span className="text-lg font-bold text-blue-700 tabular-nums">{fmtInt(withdrawalStats.total)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-md">
                <span className="text-sm text-slate-600">รออนุมัติ</span>
                <span className="text-lg font-bold text-amber-700 tabular-nums">{fmtInt(withdrawalStats.pending)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-md">
                <span className="text-sm text-slate-600">ค่าใช้จ่ายรวม</span>
                <span className="text-base font-bold text-emerald-700 tabular-nums">
                  ฿{fmtCompact(withdrawalStats.totalExpense)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* PRIORITY 12: Upcoming Jobs + Recent Activities (history & forecast) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <CardHeader title="งานที่จะมาถึง" subtitle="ภายใน 7 วัน" />
            {upcomingJobs.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {upcomingJobs.map((job: DashboardJobItem) => (
                  <div key={job.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-md">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {fmtCustomerName(job.customer_first_name, job.customer_last_name)}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{job.id?.slice(0, 8)}</p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-xs font-semibold text-emerald-700">{fmtDate(job.appointment_date)}</p>
                      <p className="text-[10px] text-slate-400">{job.start_time || ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
                ไม่มีงานใน 7 วันข้างหน้า
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="กิจกรรมล่าสุด" />
            {recentActivities.length > 0 ? (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {recentActivities.map((act: DashboardActivityItem, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 hover:bg-emerald-50/40 rounded-md">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ActivityDot type={act.type} />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800 truncate">
                          <span className="font-medium">{act.ref_code}</span>
                          <span className="text-slate-400 ml-1">({ACTIVITY_LABELS[act.type] || act.type})</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <StatusBadge status={act.status} />
                      <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">ไม่มีกิจกรรม</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// ── Reusable visual primitives ──

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick, hover }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-md border border-emerald-50 shadow-[0_2px_12px_rgba(16,185,129,0.04)] p-4 sm:p-5 ${
      hover || onClick ? 'cursor-pointer hover:border-emerald-200 hover:shadow-[0_4px_16px_rgba(16,185,129,0.08)] transition-all' : ''
    } ${className}`}
  >
    {children}
  </div>
);

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, right }) => (
  <div className="flex items-start justify-between mb-4 gap-3">
    <div className="min-w-0">
      <h3 className="text-sm sm:text-base font-bold text-slate-800 truncate">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
    </div>
    {right && <div className="shrink-0">{right}</div>}
  </div>
);

interface KpiCardProps {
  title: string;
  value: string;
  change: number;
  changeDir: number;
  footer: string;
  accent: 'emerald' | 'rose' | 'violet' | 'amber';
  isCountChange?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, change, changeDir, footer, accent, isCountChange }) => {
  const ringColor: Record<string, string> = {
    emerald: 'before:bg-emerald-400',
    rose: 'before:bg-rose-400',
    violet: 'before:bg-violet-400',
    amber: 'before:bg-amber-400',
  };
  const positive = changeDir > 0;
  const negative = changeDir < 0;

  return (
    <div
      className={`relative bg-white rounded-md border border-emerald-50 shadow-[0_2px_12px_rgba(16,185,129,0.04)] p-5 overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:w-1 before:h-full ${ringColor[accent]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <button className="text-slate-300 hover:text-slate-500" aria-label="more">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-slate-800 tabular-nums">{value}</p>
      <div className="flex items-center gap-2 mt-2">
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
            positive
              ? 'bg-emerald-50 text-emerald-600'
              : negative
                ? 'bg-rose-50 text-rose-600'
                : 'bg-slate-100 text-slate-500'
          }`}
        >
          {positive ? '▲' : negative ? '▼' : '—'} {isCountChange ? fmtInt(Math.abs(change)) : `${Math.abs(change)}%`}
        </span>
        <span className="text-xs text-slate-400">{footer}</span>
      </div>
    </div>
  );
};

const QuickAction: React.FC<{ onClick: () => void; label: string; iconPath: string }> = ({
  onClick,
  label,
  iconPath,
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-emerald-100 text-slate-700 rounded-full text-xs font-semibold hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
  >
    <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
    </svg>
    {label}
  </button>
);

const RangeDropdown: React.FC<{ value: Range; onChange: (r: Range) => void }> = ({ value, onChange }) => (
  <div className="flex bg-white rounded-full border border-emerald-100 p-1 shadow-sm">
    {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
      <button
        key={r}
        onClick={() => onChange(r)}
        className={`px-3 py-1.5 text-xs rounded-full transition-all font-semibold ${
          value === r ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        {RANGE_LABELS[r]}
      </button>
    ))}
  </div>
);

const ChartLegend: React.FC = () => (
  <div className="flex items-center gap-3 text-xs">
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> รายได้
    </span>
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> เปรียบเทียบ
    </span>
  </div>
);

const ChangeChip: React.FC<{ percent: number; dir: number }> = ({ percent, dir }) => (
  <span
    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
      dir > 0 ? 'bg-emerald-50 text-emerald-600' : dir < 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
    }`}
  >
    {dir > 0 ? '▲' : dir < 0 ? '▼' : '—'} {Math.abs(percent)}%
  </span>
);

const PipelineRow: React.FC<{ label: string; total: number; done: number; color: string }> = ({
  label,
  total,
  done,
  color,
}) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-700 font-semibold">
          {done}/{total} <span className="text-slate-400">({pct}%)</span>
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  );
};

const ActivityDot: React.FC<{ type: string }> = ({ type }) => {
  const colors: Record<string, string> = {
    job: 'bg-blue-400',
    invoice: 'bg-emerald-400',
    contract: 'bg-violet-400',
    quotation: 'bg-amber-400',
  };
  return <div className={`w-2 h-2 rounded-full shrink-0 ${colors[type] || 'bg-slate-400'}`} />;
};

// ── Job status horizontal bars ──
const JobStatusBars: React.FC<{ items: { status: string; count: number }[] }> = ({ items }) => {
  const total = items.reduce((s, i) => s + Number(i.count), 0);
  const statusColor: Record<string, string> = {
    UNASSIGNED: 'bg-slate-400',
    PENDING: 'bg-amber-400',
    IN_PROGRESS: 'bg-blue-400',
    COMPLETE: 'bg-emerald-500',
    WAITING_CLEAR: 'bg-violet-400',
    CANCELLED: 'bg-rose-400',
    REJECTED: 'bg-red-600',
  };
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center">ไม่มีข้อมูล</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const pct = total > 0 ? Math.round((Number(item.count) / total) * 100) : 0;
        return (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600">{JOB_STATUS_LABELS[item.status] || item.status}</span>
              <span className="text-slate-700 font-semibold tabular-nums">
                {fmtInt(Number(item.count))}
                <span className="text-slate-400 font-normal ml-1">({pct}%)</span>
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`${statusColor[item.status] || 'bg-slate-400'} h-2 rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Today's payments by method (cash / transfer / cheque / etc.) ──
const PAYMENT_METHOD_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  CASH: { label: 'เงินสด', color: 'emerald', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m3-2h7a2 2 0 002-2V9a2 2 0 00-2-2h-7a2 2 0 00-2 2v6a2 2 0 002 2zm6-4a2 2 0 11-4 0 2 2 0 014 0z' },
  TRANSFER: { label: 'เงินโอน', color: 'blue', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  CHEQUE: { label: 'เช็ค', color: 'amber', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  CREDIT_CARD: { label: 'บัตรเครดิต', color: 'violet', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  QR_PAYMENT: { label: 'QR Code', color: 'slate', icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z' },
  DIVIDED: { label: 'แบ่งชำระ', color: 'rose', icon: 'M7 7h10v10H7z' },
  INSTALLMENT: { label: 'ผ่อนชำระ', color: 'rose', icon: 'M7 7h10v10H7z' },
  UNKNOWN: { label: 'อื่นๆ', color: 'slate', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
};

const TodayPaymentsCard: React.FC<{ payments: DashboardTodayPayments }> = ({ payments }) => {
  const accentBg: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  };

  return (
    <Card>
      <CardHeader
        title="รายรับวันนี้"
        subtitle="แยกตามวิธีชำระ"
        right={
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase">รวม</p>
            <p className="text-base font-bold text-emerald-700 tabular-nums">฿{fmtCompact(payments.total_amount)}</p>
          </div>
        }
      />
      {payments.items.length > 0 ? (
        <div className="space-y-2">
          {payments.items.map((item: DashboardPaymentMethodItem) => {
            const meta = PAYMENT_METHOD_LABELS[item.method] || PAYMENT_METHOD_LABELS.UNKNOWN;
            return (
              <div
                key={item.method}
                className={`flex items-center justify-between p-3 rounded-md border ${accentBg[meta.color] || accentBg.slate}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={meta.icon} />
                  </svg>
                  <span className="text-sm font-semibold truncate">{meta.label}</span>
                  <span className="text-[10px] opacity-60 tabular-nums">({item.count})</span>
                </div>
                <span className="text-sm font-bold tabular-nums">฿{fmt(item.amount)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center text-slate-400 text-sm">ยังไม่มีรายรับวันนี้</div>
      )}
    </Card>
  );
};

// ── Cancelled jobs today ──
const CancelledJobsCard: React.FC<{ jobs: DashboardCancelledJob[]; onNavigate: (path: string) => void }> = ({
  jobs,
  onNavigate,
}) => (
  <Card>
    <CardHeader
      title="งานที่ลูกค้ายกเลิก"
      subtitle="วันนี้"
      right={
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            jobs.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {jobs.length}
        </span>
      }
    />
    {jobs.length > 0 ? (
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {jobs.map((job) => {
          const time = job.updated_at
            ? new Date(job.updated_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
            : '-';
          return (
            <button
              key={job.id}
              onClick={() => onNavigate(`/jobs?id=${job.id}`)}
              className="w-full flex items-center justify-between p-3 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {fmtCustomerName(job.customer_first_name, job.customer_last_name)}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {job.service_system || ''}
                  {job.remark ? ` • ${job.remark}` : ''}
                </p>
              </div>
              <span className="text-xs font-medium text-rose-600 tabular-nums shrink-0 ml-2">{time}</span>
            </button>
          );
        })}
      </div>
    ) : (
      <div className="h-32 flex items-center justify-center text-emerald-500 text-sm">ไม่มีการยกเลิกวันนี้</div>
    )}
  </Card>
);

// ── Long-term accumulated overdue (3mo / 6mo / 1yr+) — cards + donut ──
const LongTermAgingSection: React.FC<{
  aging: DashboardLongTermAging;
  onNavigate: (path: string) => void;
}> = ({ aging, onNavigate }) => {
  const buckets = [
    {
      key: 'bucket_91_180',
      label: 'ค้าง 3-6 เดือน',
      sublabel: '91-180 วัน',
      color: '#fb923c',
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      data: aging.bucket_91_180,
    },
    {
      key: 'bucket_181_365',
      label: 'ค้าง 6-12 เดือน',
      sublabel: '181-365 วัน',
      color: '#f97316',
      bg: 'bg-orange-50 border-orange-200',
      text: 'text-orange-700',
      data: aging.bucket_181_365,
    },
    {
      key: 'bucket_365_plus',
      label: 'ค้างเกิน 1 ปี',
      sublabel: 'มากกว่า 365 วัน',
      color: '#dc2626',
      bg: 'bg-rose-50 border-rose-200',
      text: 'text-rose-700',
      data: aging.bucket_365_plus,
    },
  ];

  const totalAmount = buckets.reduce((s, b) => s + b.data.amount, 0);
  const totalCount = buckets.reduce((s, b) => s + b.data.count, 0);

  return (
    <Card>
      <CardHeader
        title="ลูกค้าค้างชำระสะสม"
        subtitle="แบ่งตามช่วงค้าง"
        right={
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase">รวม</p>
            <p className="text-base font-bold text-rose-700 tabular-nums">
              ฿{fmtCompact(totalAmount)} <span className="text-xs text-slate-400">({totalCount} ราย)</span>
            </p>
          </div>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Donut on the left */}
        <div className="lg:col-span-1 flex items-center justify-center">
          <LongTermDonut buckets={buckets} totalAmount={totalAmount} />
        </div>
        {/* 3 colored cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {buckets.map((b) => (
            <button
              key={b.key}
              onClick={() => onNavigate('/invoices?aging=' + b.key)}
              className={`${b.bg} ${b.text} border rounded-md p-4 text-left hover:shadow-sm transition-all`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
                <p className="text-sm font-bold">{b.label}</p>
              </div>
              <p className="text-[10px] opacity-70 mb-2">{b.sublabel}</p>
              <p className="text-2xl font-bold tabular-nums">฿{fmtCompact(b.data.amount)}</p>
              <p className="text-xs opacity-70 mt-1">{fmtInt(b.data.count)} ราย</p>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};

interface LongTermBucket {
  key: string;
  color: string;
  data: { count: number; amount: number };
}

const LongTermDonut: React.FC<{ buckets: LongTermBucket[]; totalAmount: number }> = ({ buckets, totalAmount }) => {
  const cx = 90;
  const cy = 90;
  const R = 70;
  const inner = 48;

  if (totalAmount === 0) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="w-32 h-32 rounded-full border-[16px] border-emerald-100 flex items-center justify-center mb-2">
          <span className="text-xs text-emerald-600 font-semibold">เคลียร์แล้ว</span>
        </div>
        <p className="text-[10px] text-slate-400">ไม่มียอดสะสม</p>
      </div>
    );
  }

  let acc = 0;
  const arcs = buckets
    .filter((b) => b.data.amount > 0)
    .map((b) => {
      const startAngle = (acc / totalAmount) * Math.PI * 2 - Math.PI / 2;
      acc += b.data.amount;
      const endAngle = (acc / totalAmount) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + R * Math.cos(startAngle);
      const y1 = cy + R * Math.sin(startAngle);
      const x2 = cx + R * Math.cos(endAngle);
      const y2 = cy + R * Math.sin(endAngle);
      const xi1 = cx + inner * Math.cos(startAngle);
      const yi1 = cy + inner * Math.sin(startAngle);
      const xi2 = cx + inner * Math.cos(endAngle);
      const yi2 = cy + inner * Math.sin(endAngle);
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
      const d = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${largeArc} 0 ${xi1} ${yi1} Z`;
      return { ...b, d };
    });

  return (
    <svg viewBox="0 0 180 180" className="w-40 h-40">
      {arcs.map((a) => (
        <path key={a.key} d={a.d} fill={a.color} />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-slate-400 text-[10px]">
        รวมค้าง
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-rose-700 font-bold text-sm">
        ฿{fmtCompact(totalAmount)}
      </text>
    </svg>
  );
};

// ── Vehicle status strip (task 8) ──
const VEHICLE_STATE_META: Record<VehicleState, { label: string; bg: string; text: string; dot: string }> = {
  IDLE: { label: 'ไม่มีงาน', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-500', dot: 'bg-slate-400' },
  WAITING: { label: 'รอเริ่ม', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
  WORKING: { label: 'กำลังทำงาน', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500 animate-pulse' },
  DONE: { label: 'เสร็จแล้ว', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

const VehicleStatusStrip: React.FC<{ vehicles: DashboardVehicleToday[] }> = ({ vehicles }) => (
  <Card>
    <CardHeader
      title="สถานะรถวันนี้"
      subtitle={`รวม ${vehicles.length} คัน`}
      right={
        <div className="flex items-center gap-2.5 text-[10px]">
          {(Object.keys(VEHICLE_STATE_META) as VehicleState[]).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${VEHICLE_STATE_META[s].dot}`} />
              {VEHICLE_STATE_META[s].label}
            </span>
          ))}
        </div>
      }
    />
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
      {vehicles.map((v) => {
        const meta = VEHICLE_STATE_META[v.state];
        return (
          <div key={v.id} className={`${meta.bg} ${meta.text} border rounded-md p-3`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
              <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{meta.label}</span>
            </div>
            <p className="text-sm font-bold truncate">{v.registration}</p>
            <p className="text-[10px] opacity-60 truncate">{v.brand} {v.model}</p>
            {v.counts.total > 0 && (
              <div className="flex items-center gap-1 mt-1.5 text-[10px] tabular-nums">
                <span className="font-semibold">{v.counts.complete}/{v.counts.total}</span>
                <span className="opacity-60">งาน</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </Card>
);

// ── Per-vehicle field status today (task 7) ──
const VehiclesTodaySection: React.FC<{ vehicles: DashboardVehicleToday[] }> = ({ vehicles }) => (
  <Card>
    <CardHeader title="สถานะงานภาคสนามวันนี้" subtitle="แยกตามรถแต่ละคัน" />
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {vehicles.map((v, idx) => {
        const meta = VEHICLE_STATE_META[v.state];
        const pct = v.counts.total > 0 ? Math.round((v.counts.complete / v.counts.total) * 100) : 0;
        return (
          <div key={v.id} className="border border-slate-100 rounded-md p-4 bg-slate-50/30">
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-400 font-semibold uppercase">คันที่ {idx + 1}</p>
                <p className="text-sm font-bold text-slate-800 truncate">{v.registration}</p>
                <p className="text-[10px] text-slate-400 truncate">{v.brand} {v.model}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${meta.bg} ${meta.text}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${meta.dot} mr-1`} />
                {meta.label}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-3 text-center">
              <div className="bg-amber-50 rounded-md px-1 py-1.5">
                <p className="text-[9px] text-amber-700 font-medium">รอ</p>
                <p className="text-sm font-bold text-amber-700 tabular-nums">{v.counts.pending}</p>
              </div>
              <div className="bg-blue-50 rounded-md px-1 py-1.5">
                <p className="text-[9px] text-blue-700 font-medium">ทำ</p>
                <p className="text-sm font-bold text-blue-700 tabular-nums">{v.counts.in_progress}</p>
              </div>
              <div className="bg-emerald-50 rounded-md px-1 py-1.5">
                <p className="text-[9px] text-emerald-700 font-medium">เสร็จ</p>
                <p className="text-sm font-bold text-emerald-700 tabular-nums">{v.counts.complete}</p>
              </div>
              <div className="bg-rose-50 rounded-md px-1 py-1.5">
                <p className="text-[9px] text-rose-700 font-medium">ยกเลิก</p>
                <p className="text-sm font-bold text-rose-700 tabular-nums">{v.counts.cancelled}</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>ความคืบหน้า</span>
                <span className="font-bold tabular-nums">{pct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {v.jobs.length > 0 && (
              <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                {v.jobs.slice(0, 5).map((j) => {
                  const t = j.actual_start_time
                    ? new Date(j.actual_start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                    : '-';
                  return (
                    <div key={j.id} className="flex items-center justify-between text-[11px] text-slate-600 px-1.5">
                      <span className="truncate flex-1">
                        {fmtCustomerName(j.customer_first_name, j.customer_last_name)}
                      </span>
                      <span className="text-slate-400 tabular-nums ml-2 shrink-0">{t}</span>
                    </div>
                  );
                })}
                {v.jobs.length > 5 && (
                  <p className="text-[10px] text-slate-400 text-center pt-1">+{v.jobs.length - 5} งาน</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </Card>
);

// ── Monthly income / expense + combo chart (task 1) ──
const MonthlyIncomeExpenseSection: React.FC<{ data: DashboardMonthlyIncomeExpense }> = ({ data }) => (
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
    {/* Two summary cards */}
    <div className="xl:col-span-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
      <KpiCard
        title="รายรับเดือนนี้"
        value={`฿${fmtCompact(data.thisMonth.income)}`}
        change={data.incomeDelta.percent}
        changeDir={data.incomeDelta.change}
        footer={`เดือนก่อน ฿${fmtCompact(data.incomeDelta.previous)}`}
        accent="emerald"
      />
      <KpiCard
        title="รายจ่ายเดือนนี้"
        value={`฿${fmtCompact(data.thisMonth.expense)}`}
        change={data.expenseDelta.percent}
        changeDir={-data.expenseDelta.change}
        footer={`เดือนก่อน ฿${fmtCompact(data.expenseDelta.previous)}`}
        accent="rose"
      />
    </div>
    {/* Combo chart */}
    <Card className="xl:col-span-2">
      <CardHeader
        title="รายรับ-รายจ่าย รายเดือน"
        subtitle="ม.ค. - ธ.ค. + ค่าสะสม"
        right={
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> รายรับ
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" /> รายจ่าย
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-emerald-600" /> สะสมรับ
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-rose-600" /> สะสมจ่าย
            </span>
          </div>
        }
      />
      <LineColumnComboChart
        series={data.series.map((s) => ({
          month: s.month,
          bars: [s.income, s.expense],
          lines: [s.cumulative_income, s.cumulative_expense],
        }))}
        barColors={['#10b981', '#fb7185']}
        lineColors={['#059669', '#e11d48']}
        formatValue={(n) => `฿${fmtCompact(n)}`}
      />
    </Card>
  </div>
);

// ── Customer acquisition: new vs renewal donut + combo (task 2) ──
const CustomerAcquisitionSection: React.FC<{ data: DashboardCustomerAcquisition }> = ({ data }) => {
  const { new_count: newCount, renewal_count: renewCount, total } = data.thisMonth;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <Card>
        <CardHeader title="ลูกค้าใหม่ vs ต่อสัญญา" subtitle="เดือนนี้" />
        <AcquisitionDonut newCount={newCount} renewCount={renewCount} total={total} />
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-blue-50 rounded-md p-3 text-center">
            <p className="text-[10px] text-blue-600 font-semibold uppercase">ลูกค้าใหม่</p>
            <p className="text-2xl font-bold text-blue-700 tabular-nums">{newCount}</p>
          </div>
          <div className="bg-emerald-50 rounded-md p-3 text-center">
            <p className="text-[10px] text-emerald-600 font-semibold uppercase">ต่อสัญญา</p>
            <p className="text-2xl font-bold text-emerald-700 tabular-nums">{renewCount}</p>
          </div>
        </div>
      </Card>
      <Card className="xl:col-span-2">
        <CardHeader
          title="ลูกค้ารายเดือน + สะสม"
          subtitle="ม.ค. - ธ.ค."
          right={
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> ใหม่
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> ต่อสัญญา
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-blue-700" /> สะสมใหม่
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-emerald-700" /> สะสมต่อ
              </span>
            </div>
          }
        />
        <LineColumnComboChart
          series={data.series.map((s) => ({
            month: s.month,
            bars: [s.new_count, s.renewal_count],
            lines: [s.cumulative_new, s.cumulative_renewal],
          }))}
          barColors={['#3b82f6', '#10b981']}
          lineColors={['#1d4ed8', '#047857']}
          formatValue={(n) => fmtInt(n)}
        />
      </Card>
    </div>
  );
};

const AcquisitionDonut: React.FC<{ newCount: number; renewCount: number; total: number }> = ({
  newCount,
  renewCount,
  total,
}) => {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center text-center py-6">
        <div className="w-32 h-32 rounded-full border-[16px] border-slate-100 flex items-center justify-center mb-2">
          <span className="text-xs text-slate-400 font-semibold">0 ราย</span>
        </div>
        <p className="text-xs text-slate-400">ยังไม่มีลูกค้าเดือนนี้</p>
      </div>
    );
  }
  const cx = 100;
  const cy = 100;
  const R = 75;
  const inner = 50;
  const segments = [
    { label: 'ลูกค้าใหม่', value: newCount, color: '#3b82f6' },
    { label: 'ต่อสัญญา', value: renewCount, color: '#10b981' },
  ].filter((s) => s.value > 0);

  let acc = 0;
  const arcs = segments.map((s) => {
    const startAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += s.value;
    const endAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const xi1 = cx + inner * Math.cos(startAngle);
    const yi1 = cy + inner * Math.sin(startAngle);
    const xi2 = cx + inner * Math.cos(endAngle);
    const yi2 = cy + inner * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${largeArc} 0 ${xi1} ${yi1} Z`;
    return { ...s, d };
  });

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 200 200" className="w-44 h-44">
        {arcs.map((a) => (
          <path key={a.label} d={a.d} fill={a.color} />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-slate-400 text-[11px]">
          รวม
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-800 font-bold text-lg">
          {total} ราย
        </text>
      </svg>
    </div>
  );
};

// ── Reusable bar + line combo chart (12 months) ──
interface ComboSeriesPoint {
  month: string;
  bars: number[];
  lines: number[];
}

interface LineColumnComboChartProps {
  series: ComboSeriesPoint[];
  barColors: string[];
  lineColors: string[];
  formatValue: (n: number) => string;
}

const MONTH_TH_SHORT: Record<string, string> = {
  '01': 'ม.ค.', '02': 'ก.พ.', '03': 'มี.ค.', '04': 'เม.ย.', '05': 'พ.ค.', '06': 'มิ.ย.',
  '07': 'ก.ค.', '08': 'ส.ค.', '09': 'ก.ย.', '10': 'ต.ค.', '11': 'พ.ย.', '12': 'ธ.ค.',
};

const LineColumnComboChart: React.FC<LineColumnComboChartProps> = ({ series, barColors, lineColors, formatValue }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const W = 760;
  const H = 280;
  const PX = 60;
  const PYTop = 16;
  const PYBot = 36;
  const PXRight = 60;
  const chartW = W - PX - PXRight;
  const chartH = H - PYTop - PYBot;

  const barCount = series[0]?.bars.length || 0;
  const lineCount = series[0]?.lines.length || 0;

  const barMax = Math.max(...series.flatMap((s) => s.bars), 1) * 1.15;
  const lineMax = Math.max(...series.flatMap((s) => s.lines), 1) * 1.1;

  const groupW = chartW / series.length;
  const barW = Math.max((groupW - 8) / Math.max(barCount, 1), 6);

  const linePoints = (lineIdx: number) =>
    series.map((s, i) => {
      const x = PX + groupW * i + groupW / 2;
      const y = PYTop + chartH - (s.lines[lineIdx] / lineMax) * chartH;
      return { x, y, val: s.lines[lineIdx] };
    });

  const smoothLine = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) / 3;
      const cp2x = pts[i].x + (2 * (pts[i + 1].x - pts[i].x)) / 3;
      d += ` C${cp1x},${pts[i].y} ${cp2x},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
    }
    return d;
  };

  const stepCount = 4;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 260 }} onMouseLeave={() => setHoverIdx(null)}>
        {/* Grid + left axis (bar) */}
        {Array.from({ length: stepCount + 1 }).map((_, i) => {
          const v = (barMax / stepCount) * (stepCount - i);
          const y = PYTop + (i / stepCount) * chartH;
          return (
            <g key={`grid-${i}`}>
              <line x1={PX} y1={y} x2={W - PXRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={PX - 6} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10">
                {formatValue(v)}
              </text>
            </g>
          );
        })}

        {/* Right axis (line cumulative) */}
        {Array.from({ length: stepCount + 1 }).map((_, i) => {
          const v = (lineMax / stepCount) * (stepCount - i);
          const y = PYTop + (i / stepCount) * chartH;
          return (
            <text key={`raxis-${i}`} x={W - PXRight + 6} y={y + 4} textAnchor="start" fill="#94a3b8" fontSize="10">
              {formatValue(v)}
            </text>
          );
        })}

        {/* Bars */}
        {series.map((s, i) => {
          const groupX = PX + groupW * i;
          return (
            <g key={`bg-${i}`}>
              <rect
                x={groupX}
                y={PYTop}
                width={groupW}
                height={chartH}
                fill={hoverIdx === i ? '#ecfdf5' : 'transparent'}
                opacity="0.5"
                onMouseEnter={() => setHoverIdx(i)}
              />
              {s.bars.map((v, bi) => {
                const h = barMax > 0 ? (v / barMax) * chartH : 0;
                const x = groupX + (groupW - barW * barCount) / 2 + bi * barW;
                const y = PYTop + chartH - h;
                return (
                  <rect
                    key={`bar-${bi}`}
                    x={x}
                    y={y}
                    width={barW - 2}
                    height={Math.max(h, 0)}
                    fill={barColors[bi] || '#94a3b8'}
                    rx={2}
                    opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.45}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Lines */}
        {Array.from({ length: lineCount }).map((_, li) => {
          const pts = linePoints(li);
          return (
            <g key={`line-${li}`}>
              <path d={smoothLine(pts)} fill="none" stroke={lineColors[li] || '#0f172a'} strokeWidth="2" strokeLinecap="round" />
              {pts.map((p, pi) => (
                <circle
                  key={pi}
                  cx={p.x}
                  cy={p.y}
                  r={hoverIdx === pi ? 4 : 2.5}
                  fill="#fff"
                  stroke={lineColors[li] || '#0f172a'}
                  strokeWidth="1.5"
                />
              ))}
            </g>
          );
        })}

        {/* X-axis labels */}
        {series.map((s, i) => (
          <text
            key={`x-${i}`}
            x={PX + groupW * i + groupW / 2}
            y={H - 10}
            textAnchor="middle"
            fill={hoverIdx === i ? '#0f172a' : '#64748b'}
            fontSize="10"
            fontWeight={hoverIdx === i ? '700' : '400'}
          >
            {MONTH_TH_SHORT[s.month.slice(5)] || s.month.slice(5)}
          </text>
        ))}

        {/* Hover tooltip */}
        {hoverIdx !== null && series[hoverIdx] && (() => {
          const s = series[hoverIdx];
          const groupCx = PX + groupW * hoverIdx + groupW / 2;
          const tipW = 180;
          const tipH = 24 + (s.bars.length + s.lines.length) * 16;
          const tipX = Math.min(Math.max(groupCx - tipW / 2, PX), W - PXRight - tipW);
          return (
            <g>
              <rect x={tipX} y={PYTop + 4} width={tipW} height={tipH} rx={8} fill="#0f172a" opacity="0.94" />
              <text x={tipX + 10} y={PYTop + 22} fill="#fff" fontSize="11" fontWeight="700">
                {MONTH_TH_SHORT[s.month.slice(5)] || s.month.slice(5)} {s.month.slice(0, 4)}
              </text>
              {s.bars.map((v, bi) => (
                <text key={`bt-${bi}`} x={tipX + 10} y={PYTop + 22 + 16 * (bi + 1)} fill="#cbd5e1" fontSize="10">
                  <tspan fill={barColors[bi]}>■</tspan> {formatValue(v)}
                </text>
              ))}
              {s.lines.map((v, li) => (
                <text key={`lt-${li}`} x={tipX + 10} y={PYTop + 22 + 16 * (s.bars.length + li + 1)} fill="#cbd5e1" fontSize="10">
                  <tspan fill={lineColors[li]}>─</tspan> สะสม {formatValue(v)}
                </text>
              ))}
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

// ── Donut chart for aging breakdown ──
const AgingDonut: React.FC<{ aging: Record<string, number> }> = ({ aging }) => {
  const segments = useMemo(() => {
    const config = [
      { key: 'current', label: 'ยังไม่ถึงกำหนด', color: '#10b981' },
      { key: '1-30', label: '1-30 วัน', color: '#fbbf24' },
      { key: '31-60', label: '31-60 วัน', color: '#fb923c' },
      { key: '61-90', label: '61-90 วัน', color: '#f87171' },
      { key: '90+', label: '90+ วัน', color: '#dc2626' },
    ];
    return config.map((c) => ({ ...c, value: Number(aging[c.key]) || 0 }));
  }, [aging]);

  const total = segments.reduce((s, x) => s + x.value, 0);
  const cx = 100;
  const cy = 100;
  const R = 75;
  const inner = 50;

  if (total === 0) {
    return (
      <div className="h-60 flex flex-col items-center justify-center text-center">
        <div className="w-32 h-32 rounded-full border-[18px] border-emerald-100 flex items-center justify-center mb-3">
          <span className="text-xs text-emerald-600 font-semibold">เคลียร์แล้ว</span>
        </div>
        <p className="text-xs text-slate-400">ไม่มียอดค้างชำระ</p>
      </div>
    );
  }

  let acc = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const startAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
      acc += seg.value;
      const endAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + R * Math.cos(startAngle);
      const y1 = cy + R * Math.sin(startAngle);
      const x2 = cx + R * Math.cos(endAngle);
      const y2 = cy + R * Math.sin(endAngle);
      const xi1 = cx + inner * Math.cos(startAngle);
      const yi1 = cy + inner * Math.sin(startAngle);
      const xi2 = cx + inner * Math.cos(endAngle);
      const yi2 = cy + inner * Math.sin(endAngle);
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
      const d = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${largeArc} 0 ${xi1} ${yi1} Z`;
      return { ...seg, d };
    });

  return (
    <div>
      <div className="flex items-center justify-center relative">
        <svg viewBox="0 0 200 200" className="w-44 h-44">
          {arcs.map((a) => (
            <path key={a.key} d={a.d} fill={a.color} />
          ))}
          <text x="100" y="95" textAnchor="middle" className="fill-slate-400 text-[11px]">
            รวม
          </text>
          <text x="100" y="115" textAnchor="middle" className="fill-slate-800 font-bold text-base">
            ฿{fmtCompact(total)}
          </text>
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-4">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-slate-500 truncate flex-1">{s.label}</span>
              <span className="font-semibold text-slate-700 tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Revenue line chart (smooth) with comparison overlay ──
const RevenueChart: React.FC<{
  data: { month: string; revenue: number }[];
  comparison?: DashboardData['comparison'];
}> = ({ data, comparison }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const W = 720,
    H = 280,
    PX = 50,
    PY = 20,
    PB = 36;
  const chartW = W - PX - 16;
  const chartH = H - PY - PB;

  const values = data.map((d) => Number(d.revenue));
  const minVal = Math.min(...values) * 0.8;
  const maxVal = Math.max(...values) * 1.1 || 1;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = PX + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = PY + chartH - ((Number(d.revenue) - minVal) / range) * chartH;
    return { x, y, val: Number(d.revenue), month: d.month };
  });

  const previousLine = comparison
    ? data.map((_, i) => {
        const avg = comparison.revenue.previous;
        const x = PX + (i / Math.max(data.length - 1, 1)) * chartW;
        const y = PY + chartH - ((avg - minVal) / range) * chartH;
        return { x, y };
      })
    : [];

  const smoothLine = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return `M${pts[0]?.x || 0},${pts[0]?.y || 0}`;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) / 3;
      const cp2x = pts[i].x + (2 * (pts[i + 1].x - pts[i].x)) / 3;
      d += ` C${cp1x},${pts[i].y} ${cp2x},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
    }
    return d;
  };

  const linePath = smoothLine(points);
  const prevPath = previousLine.length > 0 ? smoothLine(previousLine) : '';
  const areaPath = `${linePath} L${points[points.length - 1].x},${PY + chartH} L${points[0].x},${PY + chartH} Z`;

  const trend = values.length >= 2 ? values[values.length - 1] - values[0] : 0;
  const lineColor = '#10b981';

  const MONTH_TH: Record<string, string> = {
    '01': 'ม.ค.',
    '02': 'ก.พ.',
    '03': 'มี.ค.',
    '04': 'เม.ย.',
    '05': 'พ.ค.',
    '06': 'มิ.ย.',
    '07': 'ก.ค.',
    '08': 'ส.ค.',
    '09': 'ก.ย.',
    '10': 'ต.ค.',
    '11': 'พ.ย.',
    '12': 'ธ.ค.',
  };

  const stepCount = 4;

  return (
    <div className="w-full">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-2xl sm:text-3xl font-bold text-slate-800 tabular-nums">
          ฿{fmt(values[values.length - 1] || 0)}
        </span>
        {values.length >= 2 && (
          <span className={`text-xs font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {trend >= 0 ? '▲' : '▼'} ฿{fmtCompact(Math.abs(trend))} (
            {values[0] > 0 ? Math.round((trend / values[0]) * 100) : 0}%)
          </span>
        )}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          style={{ minHeight: 240 }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
              <stop offset="80%" stopColor={lineColor} stopOpacity="0.04" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {Array.from({ length: stepCount + 1 }).map((_, i) => {
            const val = minVal + (range / stepCount) * (stepCount - i);
            const y = PY + (i / stepCount) * chartH;
            return (
              <g key={i}>
                <line x1={PX} y1={y} x2={W - 16} y2={y} stroke="#ecfdf5" strokeWidth="1" />
                <text x={PX - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10">
                  ฿{fmtCompact(val)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#revGrad)" />

          {prevPath && (
            <path
              d={prevPath}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="4 4"
              opacity="0.7"
            />
          )}

          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, i) => {
            const isHover = hoverIdx === i;
            const prevVal = i > 0 ? points[i - 1].val : null;
            const change = prevVal !== null ? p.val - prevVal : null;
            return (
              <g key={i}>
                <rect
                  x={p.x - chartW / data.length / 2}
                  y={PY}
                  width={chartW / data.length}
                  height={chartH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                />
                {isHover && (
                  <line
                    x1={p.x}
                    y1={PY}
                    x2={p.x}
                    y2={PY + chartH}
                    stroke={lineColor}
                    strokeWidth="1"
                    strokeDasharray="4 3"
                    opacity="0.5"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHover ? 6 : 3.5}
                  fill={isHover ? lineColor : '#fff'}
                  stroke={lineColor}
                  strokeWidth="2"
                  className="transition-all duration-150"
                />
                {isHover && (() => {
                  const tipW = 130;
                  const tipH = 42;
                  const tipX = Math.min(Math.max(p.x - tipW / 2, PX), W - 16 - tipW);
                  const tipY = p.y > PY + tipH + 14 ? p.y - tipH - 12 : p.y + 12;
                  const tipCenter = tipX + tipW / 2;
                  const labelY = tipY + 17;
                  const subY = tipY + 31;
                  return (
                    <g>
                      <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="8" fill="#0f172a" opacity="0.95" />
                      <text x={tipCenter} y={labelY} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">
                        ฿{fmt(p.val)}
                      </text>
                      {change !== null && (
                        <text
                          x={tipCenter}
                          y={subY}
                          textAnchor="middle"
                          fill={change >= 0 ? '#6ee7b7' : '#fca5a5'}
                          fontSize="10"
                        >
                          {change >= 0 ? '▲' : '▼'} ฿{fmtCompact(Math.abs(change))}
                        </text>
                      )}
                    </g>
                  );
                })()}
                <text
                  x={p.x}
                  y={H - 8}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="11"
                  fontWeight={isHover ? '700' : '400'}
                >
                  {MONTH_TH[p.month.slice(5)] || p.month.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default Dashboard;
