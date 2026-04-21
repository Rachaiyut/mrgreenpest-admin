import { useRef } from 'react';
import type { FieldJob, JobStatus, User } from '@/src/types';

// Assets
import { ChevronLeftIcon, ChevronRightIcon } from '@/src/assets/icons/Icons';

// Local component
import JobCard from './JobCard';

export interface KanbanColumn {
  id: string;
  title: string;
  jobs: FieldJob[];
}

interface JobKanbanBoardProps {
  columns: KanbanColumn[];
  emptyBoardText?: string;
  emptyColumnText?: string;
  accentColorClass?: string;
  showScrollButtons?: boolean;
  onDropdownToggle: (e: React.MouseEvent<HTMLButtonElement>, jobId: string) => void;
  onStatusChange: (jobId: string, newStatus: JobStatus) => void;
  onViewDetails: (job: FieldJob) => void;
  onWriteReport: (job: FieldJob) => void;
  onEditJob?: (job: FieldJob) => void;
  onApprove?: (jobId: string) => Promise<void> | void;
  onReject?: (jobId: string, reason: string) => Promise<void> | void;
  currentUser: User;
  isAnyJobInProgressForCurrentUser: boolean;
}

const JobKanbanBoard: React.FC<JobKanbanBoardProps> = ({
  columns,
  emptyBoardText = 'ไม่พบรถให้บริการ',
  emptyColumnText = 'ไม่มีงาน',
  accentColorClass = 'bg-primary',
  showScrollButtons = true,
  onDropdownToggle,
  onStatusChange,
  onViewDetails,
  onWriteReport,
  onEditJob,
  onApprove,
  onReject,
  currentUser,
  isAnyJobInProgressForCurrentUser,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scrollBy = (direction: 'left' | 'right') => {
    const node = containerRef.current;
    if (!node) return;
    const delta = direction === 'left' ? -340 : 340;
    node.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col relative flex-1">
      {showScrollButtons && columns.length > 0 && (
        <>
          <button
            onClick={() => scrollBy('left')}
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white hover:bg-slate-50 rounded-full shadow-lg border border-slate-200 transition-all hover:scale-105"
          >
            <ChevronLeftIcon className="h-5 w-5 text-slate-600" />
          </button>
          <button
            onClick={() => scrollBy('right')}
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white hover:bg-slate-50 rounded-full shadow-lg border border-slate-200 transition-all hover:scale-105"
          >
            <ChevronRightIcon className="h-5 w-5 text-slate-600" />
          </button>
        </>
      )}

      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto pb-4 px-2 scroll-smooth flex-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {columns.length > 0 ? (
          columns.map((col) => (
            <div
              key={col.id}
              className="bg-slate-100/80 rounded-xl p-4 border border-slate-200 shadow-sm w-80 flex-shrink-0 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${accentColorClass}`} />
                  <h3 className="font-bold text-slate-700 text-sm truncate" title={col.title}>
                    {col.title}
                  </h3>
                </div>
                <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-bold bg-white text-slate-600 shadow-sm border border-slate-200">
                  {col.jobs.length}
                </span>
              </div>
              <div className="space-y-3">
                {col.jobs.length > 0 ? (
                  col.jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onDropdownToggle={onDropdownToggle}
                      onStatusChange={onStatusChange}
                      onViewDetails={onViewDetails}
                      onWriteReport={onWriteReport}
                      onEditJob={onEditJob}
                      onApprove={onApprove}
                      onReject={onReject}
                      currentUser={currentUser}
                      isAnyJobInProgressForCurrentUser={isAnyJobInProgressForCurrentUser}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <p className="text-sm">{emptyColumnText}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 w-full">
            <p className="text-lg font-medium">{emptyBoardText}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobKanbanBoard;
