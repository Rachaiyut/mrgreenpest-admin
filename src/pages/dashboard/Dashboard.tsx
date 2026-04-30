import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardApi, DashboardData } from '../../api/dashboard';
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
};

const ACTIVITY_LABELS: Record<string, string> = {
  job: 'งาน',
  invoice: 'ใบแจ้งหนี้',
  contract: 'สัญญา',
  quotation: 'ใบเสนอราคา',
};

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString('th-TH');
const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }); } catch { return d; }
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
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[40vh] py-16">
        <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p className="text-base font-medium text-slate-500">กำลังดึงข้อมูล...</p>
      </div>
    );
  }

  const { kpi, pipeline, todayJobs, upcomingJobs, overdueInvoices, lowStockItems, expiringContracts, revenueByMonth, jobsByStatus, recentActivities, pendingActions, comparison } = data;

  // Revenue chart calculation
  const maxRevenue = Math.max(...revenueByMonth.map(r => Number(r.revenue)), 1);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">แดชบอร์ด</h1>
          <p className="text-base text-slate-500 mt-1">ภาพรวมธุรกิจ Mr. Green Pest Control</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1.5">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                range === r ? 'bg-white text-blue-600 font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={() => navigate('/assessments')} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          สร้างใบประเมิน
        </button>
        <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          สร้างงาน
        </button>
        <button onClick={() => navigate('/invoices')} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
          สร้างใบแจ้งหนี้
        </button>
        <button onClick={() => navigate('/quotations')} className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          สร้างใบเสนอราคา
        </button>
      </div>

      {/* Daily Closure Alert */}
      {openClosures.length > 0 && (
        <div
          onClick={() => navigate('/daily-closures')}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">รถที่ยังไม่ปิดงานวันนี้</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {openClosures.map((c) => c.vehicle?.name || 'ไม่ระบุ').join(', ')}
              </p>
            </div>
          </div>
          <span className="text-2xl font-black text-amber-700">{openClosures.length}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        <KPICard title="รายได้" value={`${fmt(kpi.revenue)} บาท`} color="green" subtitle={RANGE_LABELS[range]} />
        <KPICard title="ยอดค้างชำระ" value={`${fmt(kpi.outstanding_amount)} บาท`} color="red" subtitle={`${fmtInt(kpi.outstanding_count)} รายการ`} />
        <KPICard title="สัญญาที่ใช้งาน" value={`${fmtInt(kpi.active_contracts)}`} color="blue" subtitle="สัญญา" />
        <KPICard title="อัตราปิดงาน" value={`${kpi.job_completion_rate}%`} color="amber" subtitle={`${fmtInt(kpi.completed_jobs)}/${fmtInt(kpi.total_jobs)} งาน`} />
      </div>

      {/* Pending Actions + Month Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pending Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800">รอดำเนินการ</h3>
            {pendingActions.total > 0 && (
              <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1 rounded-full">{pendingActions.total}</span>
            )}
          </div>
          {pendingActions.items.length > 0 ? (
            <div className="space-y-2.5">
              {pendingActions.items.map((item) => {
                const colorMap: Record<string, string> = {
                  amber: 'bg-amber-50 border-amber-200 text-amber-700',
                  blue: 'bg-blue-50 border-blue-200 text-blue-700',
                  purple: 'bg-purple-50 border-purple-200 text-purple-700',
                  green: 'bg-green-50 border-green-200 text-green-700',
                  red: 'bg-red-50 border-red-200 text-red-700',
                };
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm ${colorMap[item.color] || colorMap.blue}`}
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-lg font-bold">{item.count}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-green-500 text-sm font-medium">ไม่มีรายการค้าง</div>
          )}
        </div>

        {/* Month-over-Month Comparison */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-4">เปรียบเทียบเดือนนี้ vs เดือนก่อน</h3>
          <div className="space-y-3">
            {comparison && [
              { label: 'รายได้', data: comparison.revenue, prefix: '฿' },
              { label: 'งานทั้งหมด', data: comparison.jobs },
              { label: 'งานเสร็จสิ้น', data: comparison.completed_jobs },
              { label: 'ลูกค้าใหม่', data: comparison.new_customers },
              { label: 'สัญญาใหม่', data: comparison.new_contracts },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-600">{item.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-800">
                    {item.prefix === '฿' ? fmt(item.data.current) : fmtInt(item.data.current)}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    item.data.change > 0 ? 'bg-green-50 text-green-600' :
                    item.data.change < 0 ? 'bg-red-50 text-red-600' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    {item.data.change > 0 ? '▲' : item.data.change < 0 ? '▼' : '—'} {item.data.percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Revenue Chart + Sales Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-4">รายได้รายเดือน (6 เดือนล่าสุด)</h3>
          {revenueByMonth.length > 0 ? (
            <RevenueChart data={revenueByMonth} />
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">ไม่มีข้อมูลรายได้</div>
          )}
        </div>

        {/* Sales Pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Sales Pipeline</h3>
          <div className="space-y-4">
            <PipelineRow label="ใบประเมิน" total={pipeline.assessments.total} done={pipeline.assessments.completed} color="bg-slate-500" />
            <PipelineRow label="ใบเสนอราคา" total={pipeline.quotations.total} done={pipeline.quotations.signed} color="bg-blue-500" />
            <PipelineRow label="สัญญา" total={pipeline.contracts.total} done={pipeline.contracts.active} color="bg-green-500" />
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
        </div>
      </div>

      {/* Row 3: Today Jobs + Job Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Today's Jobs */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800">งานวันนี้</h3>
            <span className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">{todayJobs.length} งาน</span>
          </div>
          {todayJobs.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {todayJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{job.customer_first_name} {job.customer_last_name}</p>
                    <p className="text-xs text-slate-500 truncate">{job.service_system || ''} - {job.address || ''}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-medium text-slate-700">{job.actual_start_time ? new Date(job.actual_start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                    <StatusBadge status={job.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-slate-400 text-sm">ไม่มีงานวันนี้</div>
          )}
        </div>

        {/* Job Status Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-4">สถานะงาน ({RANGE_LABELS[range]})</h3>
          <div className="space-y-3">
            {jobsByStatus.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{JOB_STATUS_LABELS[item.status] || item.status}</span>
                <span className="text-sm font-semibold text-slate-800">{fmtInt(Number(item.count))}</span>
              </div>
            ))}
            {jobsByStatus.length === 0 && <p className="text-sm text-slate-400">ไม่มีข้อมูล</p>}
          </div>
        </div>
      </div>

      {/* Row 4: Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Overdue Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-3">ใบแจ้งหนี้ค้างชำระ</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {Object.entries(overdueInvoices.aging).map(([label, amount]) => (
              <div key={label} className="text-center p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase">{label === 'current' ? 'ยังไม่ถึงกำหนด' : `${label} วัน`}</p>
                <p className="text-sm font-semibold text-slate-800">{fmt(amount as number)}</p>
              </div>
            ))}
          </div>
          {overdueInvoices.items.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {overdueInvoices.items.slice(0, 5).map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between text-xs p-2 bg-red-50 rounded">
                  <div className="truncate flex-1">
                    <span className="font-medium text-slate-700">{inv.code}</span>
                    <span className="text-slate-500 ml-1">{inv.customer_name}</span>
                  </div>
                  <span className="text-red-600 font-semibold ml-2 whitespace-nowrap">{fmt(Number(inv.total) - Number(inv.paid_amount || 0))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiring Contracts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-3">สัญญาใกล้หมดอายุ (30 วัน)</h3>
          {expiringContracts.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {expiringContracts.map((c: any) => (
                <div key={c.id} className="p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.code}</p>
                      <p className="text-xs text-slate-500">{c.customer_name}</p>
                    </div>
                    <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                      อีก {c.days_remaining} วัน
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-slate-400 text-sm">ไม่มีสัญญาใกล้หมดอายุ</div>
          )}
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-3">สินค้าใกล้หมดสต็อก</h3>
          {lowStockItems.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {lowStockItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <div className="truncate flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.code}</p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <p className="text-sm font-bold text-red-600">{fmtInt(Number(item.total_stock))}</p>
                    <p className="text-xs text-slate-400">ขั้นต่ำ {item.min_stock} {item.unit_name}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-green-500 text-sm">สต็อกปกติทั้งหมด</div>
          )}
        </div>

        {/* Withdrawal Summary */}
        <div
          onClick={() => navigate('/inventory/issue-summaries')}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
        >
          <h3 className="text-base font-semibold text-slate-800 mb-3">สรุปการเบิก</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-slate-600">ใบเบิกทั้งหมด</span>
              <span className="text-lg font-bold text-blue-700">{fmtInt(withdrawalStats.total)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <span className="text-sm text-slate-600">รออนุมัติ</span>
              <span className="text-lg font-bold text-amber-700">{fmtInt(withdrawalStats.pending)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-slate-600">ค่าใช้จ่ายรวม</span>
              <span className="text-lg font-bold text-green-700">{fmt(withdrawalStats.totalExpense)} บาท</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 5: Upcoming + Recent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Upcoming Jobs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-3">งานที่จะมาถึง (7 วัน)</h3>
          {upcomingJobs.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {upcomingJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{job.customer_first_name} {job.customer_last_name}</p>
                    <p className="text-xs text-slate-500">{job.id?.slice(0, 8)}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-xs font-medium text-blue-600">{fmtDate(job.appointment_date)}</p>
                    <p className="text-xs text-slate-400">{job.start_time || ''}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-slate-400 text-sm">ไม่มีงานใน 7 วันข้างหน้า</div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-3">กิจกรรมล่าสุด</h3>
          {recentActivities.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentActivities.map((act: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
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
                    <p className="text-xs text-slate-400 mt-0.5">{fmtDate(act.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-slate-400 text-sm">ไม่มีกิจกรรม</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Sub Components ──

const KPICard: React.FC<{ title: string; value: string; color: string; subtitle: string }> = ({ title, value, color, subtitle }) => {
  const colors: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color] || colors.blue}`}>
      <p className="text-sm font-medium opacity-70 mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-60 mt-1.5">{subtitle}</p>
    </div>
  );
};

const PipelineRow: React.FC<{ label: string; total: number; done: number; color: string }> = ({ label, total, done, color }) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-800 font-semibold">{done}/{total}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  );
};

const ActivityDot: React.FC<{ type: string }> = ({ type }) => {
  const colors: Record<string, string> = {
    job: 'bg-blue-400',
    invoice: 'bg-green-400',
    contract: 'bg-purple-400',
    quotation: 'bg-amber-400',
  };
  return <div className={`w-2 h-2 rounded-full shrink-0 ${colors[type] || 'bg-slate-400'}`} />;
};

// ── Revenue Stock-Style Chart ──
const RevenueChart: React.FC<{ data: { month: string; revenue: number }[] }> = ({ data }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const W = 640, H = 260, PX = 55, PY = 24, PB = 36;
  const chartW = W - PX - 20;
  const chartH = H - PY - PB;

  const values = data.map(d => Number(d.revenue));
  const minVal = Math.min(...values) * 0.8;
  const maxVal = Math.max(...values) * 1.1 || 1;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = PX + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = PY + chartH - ((Number(d.revenue) - minVal) / range) * chartH;
    return { x, y, val: Number(d.revenue), month: d.month };
  });

  // Smooth cubic bezier curve
  const smoothLine = (pts: typeof points) => {
    if (pts.length < 2) return `M${pts[0]?.x},${pts[0]?.y}`;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) / 3;
      const cp2x = pts[i].x + 2 * (pts[i + 1].x - pts[i].x) / 3;
      d += ` C${cp1x},${pts[i].y} ${cp2x},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
    }
    return d;
  };

  const linePath = smoothLine(points);
  const areaPath = `${linePath} L${points[points.length - 1].x},${PY + chartH} L${points[0].x},${PY + chartH} Z`;

  // Overall trend: green if last > first, red if down
  const trend = values.length >= 2 ? values[values.length - 1] - values[0] : 0;
  const lineColor = trend >= 0 ? '#10b981' : '#ef4444';
  const gradId = trend >= 0 ? 'gradUp' : 'gradDown';
  const gradColor = trend >= 0 ? '#10b981' : '#ef4444';

  const MONTH_TH: Record<string, string> = { '01': 'ม.ค.', '02': 'ก.พ.', '03': 'มี.ค.', '04': 'เม.ย.', '05': 'พ.ค.', '06': 'มิ.ย.', '07': 'ก.ค.', '08': 'ส.ค.', '09': 'ก.ย.', '10': 'ต.ค.', '11': 'พ.ย.', '12': 'ธ.ค.' };

  const stepCount = 4;

  return (
    <div className="w-full">
      {/* Summary line */}
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-2xl font-bold text-slate-800">{fmt(values[values.length - 1] || 0)}</span>
        <span className="text-sm text-slate-500">บาท (เดือนล่าสุด)</span>
        {values.length >= 2 && (
          <span className={`text-sm font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? '▲' : '▼'} {fmt(Math.abs(trend))} ({values[0] > 0 ? Math.round((trend / values[0]) * 100) : 0}%)
          </span>
        )}
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 220 }}
          onMouseLeave={() => setHoverIdx(null)}>

          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradColor} stopOpacity="0.20" />
              <stop offset="80%" stopColor={gradColor} stopOpacity="0.03" />
              <stop offset="100%" stopColor={gradColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: stepCount + 1 }).map((_, i) => {
            const val = minVal + (range / stepCount) * (stepCount - i);
            const y = PY + (i / stepCount) * chartH;
            return (
              <g key={i}>
                <line x1={PX} y1={y} x2={W - 20} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={PX - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10">{fmtInt(Math.round(val))}</text>
              </g>
            );
          })}

          {/* Area */}
          <path d={areaPath} fill={`url(#${gradId})`} />

          {/* Line */}
          <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Hover zones + crosshair + points */}
          {points.map((p, i) => {
            const isHover = hoverIdx === i;
            const prevVal = i > 0 ? points[i - 1].val : null;
            const change = prevVal !== null ? p.val - prevVal : null;
            return (
              <g key={i}>
                {/* Invisible hover zone */}
                <rect
                  x={p.x - chartW / data.length / 2}
                  y={PY}
                  width={chartW / data.length}
                  height={chartH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                />

                {/* Crosshair line */}
                {isHover && (
                  <line x1={p.x} y1={PY} x2={p.x} y2={PY + chartH} stroke={lineColor} strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
                )}

                {/* Point */}
                <circle cx={p.x} cy={p.y} r={isHover ? 6 : 3.5} fill={isHover ? lineColor : '#fff'} stroke={lineColor} strokeWidth="2" className="transition-all duration-150" />

                {/* Tooltip */}
                {isHover && (
                  <g>
                    <rect x={p.x - 60} y={p.y - 52} width="120" height="40" rx="6" fill="#1e293b" opacity="0.92" />
                    <text x={p.x} y={p.y - 35} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">{fmt(p.val)} บ.</text>
                    {change !== null && (
                      <text x={p.x} y={p.y - 20} textAnchor="middle" fill={change >= 0 ? '#6ee7b7' : '#fca5a5'} fontSize="10">
                        {change >= 0 ? '▲' : '▼'} {fmt(Math.abs(change))}
                      </text>
                    )}
                  </g>
                )}

                {/* X Label */}
                <text x={p.x} y={H - 8} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight={isHover ? '700' : '400'}>
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
