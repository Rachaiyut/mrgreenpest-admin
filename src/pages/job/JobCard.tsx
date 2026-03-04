// ===== React =====
import { useMemo } from "react";

// ===== Types =====
import { FieldJob, JobStatus, User } from "@/src/types";

// ===== Components =====
import { StatusBadge, Button } from "@/src/components/common";

// ===== Utils =====
import { formatThaiDate } from "@/src/utils/date";

// ===== Assets =====
import {
  DocumentCheckIcon,
  EyeIcon,
  JobDateIcon,
  JobTimeIcon,
  ManageIcon,
  MapPinIcon,
  PlayIcon,
  TechnicianIcon,
} from "@/src/assets/icons/Icons";

const JobCard: React.FC<{
  job: FieldJob;
  onDropdownToggle: (
    event: React.MouseEvent<HTMLButtonElement>,
    jobId: string
  ) => void;
  onStatusChange: (jobId: string, newStatus: JobStatus) => void;
  onViewDetails: (job: FieldJob) => void;
  onWriteReport: (job: FieldJob) => void;
  currentUser: User;
  isAnyJobInProgressForCurrentUser: boolean;
}> = ({
  job,
  onDropdownToggle,
  onStatusChange,
  onViewDetails,
  onWriteReport,
  currentUser,
  isAnyJobInProgressForCurrentUser,
}) => {
  const currentUserId = (currentUser as any)?.id as string | undefined;

  const isAssignedToCurrentUser = useMemo(
    () =>
      !!currentUserId &&
      (job.technicians || []).some((tech) => tech && tech.id === currentUserId),
    [job.technicians, currentUserId]
  );

  const showCheckInButton =
    isAssignedToCurrentUser &&
    ((job.status as unknown as JobStatus) === JobStatus.Planned ||
      (job.status as unknown as string).toUpperCase() === 'PENDING');

  const showCheckOutButton =
    isAssignedToCurrentUser &&
    ((job.status as unknown as JobStatus) === JobStatus.InProgress ||
      (job.status as unknown as string).toUpperCase() === 'IN_PROGRESS' ||
      (job.status as unknown as string).toUpperCase() === 'INPROGRESS');

  const showReportButton = showCheckOutButton && !job.service_report;

  let checkInTooltip = '';
  if (isAssignedToCurrentUser) {
    if (isAnyJobInProgressForCurrentUser) {
      checkInTooltip = 'คุณกำลังเช็คอินในงานอื่นอยู่';
    } else {
      checkInTooltip = 'เช็คอินเพื่อเริ่มงาน';
    }
  }

  const jobDate = formatThaiDate(job.start_time);
  const jobStartTime = new Date(job.start_time).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const jobEndTime = new Date(job.end_time).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hasActions =
    (job.status as unknown as JobStatus) !== JobStatus.Completed;

  // Get status color for left border
  const getStatusColor = () => {
    const statusUpper = String(
      job.status || job.api_status || ''
    ).toUpperCase();
    if (statusUpper === 'IN_PROGRESS' || statusUpper === 'INPROGRESS')
      return 'border-l-amber-500';
    if (statusUpper === 'COMPLETED' || statusUpper === 'COMPLETE')
      return 'border-l-green-500';
    if (statusUpper === 'CANCELLED') return 'border-l-red-500';
    return 'border-l-primary';
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all duration-200 border-l-4 ${getStatusColor()}`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-800 text-base leading-tight truncate">
              {job.customerName}
            </h4>
            {job.work_areas?.length > 0 && (
              <p className="text-xs text-slate-500 mt-1 truncate">
                {job.work_areas.map((wa) => wa.service_package).join(', ')}
              </p>
            )}
          </div>
          <Button
            data-job-id={job.id}
            onClick={(e) => onDropdownToggle(e, job.id)}
            variant="ghost"
            className="p-1.5 h-auto rounded-lg hover:bg-slate-100 -mr-1 -mt-1 flex-shrink-0"
            title="ตัวเลือก"
          >
            <ManageIcon className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
        <div className="mt-2">
          <StatusBadge status={job.api_status} />
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex items-start gap-2.5 text-sm">
          <MapPinIcon className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <span className="text-slate-600 line-clamp-2 leading-snug">
            {job.address || '-'}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <JobDateIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-slate-600">{jobDate}</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <JobTimeIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-slate-700 font-medium">
            {jobStartTime} - {jobEndTime}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <TechnicianIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span
            className="text-slate-600 truncate"
            title={job.technicians?.map((t) => t.name).join(', ')}
          >
            {job.technicians?.length > 0 ? (
              job.technicians.map((t) => t.name).join(', ')
            ) : (
              <span className="text-slate-400 italic">ยังไม่มอบหมาย</span>
            )}
          </span>
        </div>
      </div>

      {/* Actions */}
      {hasActions && (
        <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 space-y-2">
          <Button
            onClick={() => onViewDetails(job)}
            title="ดูรายละเอียดงาน"
            variant="outline"
            className="w-full py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-800 rounded-lg border border-slate-200 h-auto"
          >
            <EyeIcon className="h-4 w-4 mr-1.5" />
            ดูรายละเอียด
          </Button>

          {showCheckInButton && (
            <Button
              onClick={() => onStatusChange(job.id, JobStatus.InProgress)}
              disabled={isAnyJobInProgressForCurrentUser}
              title={checkInTooltip}
              variant="outline"
              className="w-full py-2 text-sm font-semibold rounded-lg h-auto shadow-sm"
            >
              <PlayIcon className="h-4 w-4 mr-1.5" />
              เช็คอิน
            </Button>
          )}
          {showReportButton && (
            <Button
              onClick={() => onWriteReport(job)}
              title="บันทึกรายงานบริการ"
              className="w-full py-2 text-sm font-semibold rounded-lg h-auto bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <DocumentCheckIcon className="h-4 w-4 mr-1.5" />
              บันทึกรายงาน
            </Button>
          )}
          {showCheckOutButton && (
            <Button
              onClick={() => onStatusChange(job.id, JobStatus.Completed)}
              title="เช็คเอาท์เพื่อจบงาน"
              variant="outline"
              className="w-full py-2 text-sm font-semibold rounded-lg h-auto shadow-sm"
            >
              <DocumentCheckIcon className="h-4 w-4 mr-1.5" />
              เช็คเอาท์
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default JobCard;
