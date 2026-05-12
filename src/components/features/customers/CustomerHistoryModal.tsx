import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { Customer } from '@/src/types/entity/customer.interface';
import { Job } from '@/src/types/entity/job.interface';
import { JobStatusLabel, JobStatus } from '@/src/types/enums/job';
import { formatThaiDate } from '../../../utils/date';
import { JobApi } from '@/src/api/job';
import { ServiceReportApi } from '@/src/api/service-report';
import { LoadingIcon } from '../../../assets/icons/Icons';
import { ServiceReportModal } from '../jobs/ServiceReportModal';
import { FieldJob, ServiceReport } from '@/src/types/entity/service-report.interface';
import { JobMainStatus } from '@/src/types/enums/job';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

const JOB_STATUS_COLOR: Record<string, string> = {
  UNASSIGNED: 'bg-amber-100 text-amber-700 border-amber-200',
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  COMPLETE: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

const PAGE_SIZE = 20;

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<FieldJob | null>(null);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchJobs = useCallback(async (pageNum: number, append = false) => {
    if (!customer) return;
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await JobApi.getAll({
        limit: PAGE_SIZE,
        page: pageNum,
        customer_id: customer.id,
      } as Record<string, unknown>);
      const data = response.data || [];
      const total = (response as unknown as Record<string, unknown>).meta
        ? ((response as unknown as Record<string, unknown>).meta as Record<string, number>).total || 0
        : data.length < PAGE_SIZE ? (append ? jobs.length + data.length : data.length) : 999;

      if (append) {
        setJobs((prev) => [...prev, ...data]);
      } else {
        setJobs(data);
      }
      setHasMore(data.length === PAGE_SIZE && (append ? jobs.length + data.length : data.length) < total);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      if (!append) setJobs([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [customer, jobs.length]);

  useEffect(() => {
    if (isOpen && customer) {
      setPage(1);
      setHasMore(true);
      setJobs([]);
      fetchJobs(1);
    }
  }, [isOpen, customer]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedJob(null);
      setJobs([]);
      setPage(1);
    }
  }, [isOpen]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchJobs(nextPage, true);
    }
  }, [loadingMore, hasMore, page, fetchJobs]);

  const handleViewReport = async (job: Job) => {
    const report = (job as unknown as Record<string, unknown>).service_report as Record<string, unknown> | undefined;
    if (!report?.id) return;

    setLoadingReportId(job.id);
    try {
      const fullRes = await ServiceReportApi.getById(report.id as string);
      const fullReport = (fullRes as unknown as Record<string, unknown>)?.data || fullRes;

      const fieldJob = {
        id: job.id,
        customerName: customer ? `${customer.first_name} ${customer.last_name || ''}`.trim() : '',
        customer_id: (job as unknown as Record<string, unknown>).customer_id as string,
        address: '',
        code: '',
        start_time: job.start_date as unknown as string,
        end_time: job.end_date as unknown as string,
        technicians: [],
        work_areas: [],
        status: job.status as unknown as JobMainStatus,
        service_report: fullReport as unknown as ServiceReport,
        primary_technician: job.primary_technician,
        remark: job.remark,
      } as unknown as FieldJob;

      setSelectedJob(fieldJob);
    } catch (error) {
      console.error('Error fetching service report:', error);
    } finally {
      setLoadingReportId(null);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <>
      <Modal
        isOpen={isOpen && !selectedJob}
        onClose={onClose}
        title={`ประวัติการบริการ (${customer.first_name} ${customer.last_name || ''})`}
        size="6xl"
        footer={
          <div className="flex w-full items-center justify-between">
            <p className="text-sm text-slate-500">ทั้งหมด {jobs.length} รายการ{hasMore ? ' (เลื่อนลงเพื่อดูเพิ่ม)' : ''}</p>
            <Button type="button" onClick={onClose} variant="outline" className="py-2 px-5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300">
              ปิด
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
            <p className="text-base">กำลังโหลดประวัติการบริการ...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">ไม่พบประวัติการบริการ</p>
            <p className="text-sm mt-1">ลูกค้ารายนี้ยังไม่มีงานในระบบ</p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="overflow-y-auto overflow-x-auto rounded-xl border border-slate-200"
            style={{ maxHeight: '65vh' }}
          >
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10">
                <tr className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-3 py-2.5 whitespace-nowrap">ลำดับ</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">สถานะ</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">วันเริ่มต้น</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">วันสิ้นสุด</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">ช่างเทคนิค</th>
                  <th className="px-3 py-2.5">หมายเหตุ</th>
                  <th className="px-3 py-2.5 whitespace-nowrap text-right">รายงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {jobs.map((job, index) => {
                  const hasReport = !!(job as unknown as Record<string, unknown>).service_report;
                  const statusKey = String(job.status || '').toUpperCase();
                  const statusLabel = JobStatusLabel[statusKey] || job.status || '-';
                  const statusColor = JOB_STATUS_COLOR[statusKey] || 'bg-slate-100 text-slate-600 border-slate-200';
                  const techName = job.primary_technician
                    ? `${job.primary_technician.first_name || ''} ${job.primary_technician.last_name || ''}`.trim()
                    : null;
                  const isLoadingThis = loadingReportId === job.id;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-2.5 text-slate-500 tabular-nums">{index + 1}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                        {job.start_date ? formatThaiDate(job.start_date) : '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                        {job.end_date ? formatThaiDate(job.end_date) : '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                        {techName || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-[280px]">
                        <span className="line-clamp-2" title={job.remark || ''}>
                          {job.remark || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-right">
                        {hasReport ? (
                          <button
                            type="button"
                            onClick={() => handleViewReport(job)}
                            disabled={!!loadingReportId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            {isLoadingThis ? (
                              <LoadingIcon className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            ดูรายงาน
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">ไม่มีรายงาน</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {loadingMore && (
                  <tr>
                    <td colSpan={7} className="px-3 py-3">
                      <div className="flex items-center justify-center text-slate-500">
                        <LoadingIcon className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-sm">กำลังโหลดเพิ่ม...</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Service Report Modal */}
      <ServiceReportModal
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        job={selectedJob}
        finalStatus={JobStatus.Completed}
        onSubmit={() => { setSelectedJob(null); }}
        currentUser={{ id: '', first_name: '', last_name: '', role: {} } as never}
        contracts={[]}
        products={[]}
        readOnly
      />
    </>
  );
};
