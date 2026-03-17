import React, { useEffect, useState } from 'react';
import { DashboardApi, DashboardData } from '../../api/dashboard';

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
  const [range, setRange] = useState<Range>('month');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    DashboardApi.getSummary(range)
      .then(setData)
      .catch((err) => console.error('Dashboard fetch error:', err))
      .finally(() => setLoading(false));
  }, [range]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { kpi, pipeline, todayJobs, upcomingJobs, overdueInvoices, lowStockItems, expiringContracts, revenueByMonth, jobsByStatus, recentActivities } = data;

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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard title="รายได้" value={`${fmt(kpi.revenue)} บาท`} color="green" subtitle={RANGE_LABELS[range]} />
        <KPICard title="ยอดค้างชำระ" value={`${fmt(kpi.outstanding_amount)} บาท`} color="red" subtitle={`${fmtInt(kpi.outstanding_count)} รายการ`} />
        <KPICard title="สัญญาที่ใช้งาน" value={`${fmtInt(kpi.active_contracts)}`} color="blue" subtitle="สัญญา" />
        <KPICard title="อัตราปิดงาน" value={`${kpi.job_completion_rate}%`} color="amber" subtitle={`${fmtInt(kpi.completed_jobs)}/${fmtInt(kpi.total_jobs)} งาน`} />
      </div>

      {/* Row 2: Revenue Chart + Sales Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-4">รายได้รายเดือน (6 เดือนล่าสุด)</h3>
          {revenueByMonth.length > 0 ? (
            <div className="flex items-end gap-4 h-52">
              {revenueByMonth.map((r, i) => {
                const height = Math.max((Number(r.revenue) / maxRevenue) * 100, 4);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-slate-500 font-medium">{fmtInt(Number(r.revenue))}</span>
                    <div className="w-full bg-blue-500 rounded-t-md transition-all" style={{ height: `${height}%` }}></div>
                    <span className="text-xs text-slate-400">{r.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">ไม่มีข้อมูลรายได้</div>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
                    <StatusPill status={job.status} />
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
      </div>

      {/* Row 5: Upcoming + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
                    <StatusPill status={act.status} />
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

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    COMPLETE: 'bg-green-100 text-green-700',
    PAID: 'bg-green-100 text-green-700',
    ACTIVE: 'bg-blue-100 text-blue-700',
    SIGNED: 'bg-blue-100 text-blue-700',
    PENDING: 'bg-amber-100 text-amber-700',
    IN_PROGRESS: 'bg-sky-100 text-sky-700',
    CANCELLED: 'bg-red-100 text-red-700',
    OVERDUE: 'bg-red-100 text-red-700',
    DRAFT: 'bg-slate-100 text-slate-600',
    UNASSIGNED: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex text-xs px-2 py-0.5 rounded-md font-medium ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
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

export default Dashboard;
