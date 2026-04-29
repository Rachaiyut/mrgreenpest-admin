import { isFieldRole } from '@/src/utils/role';
import { usePermissions } from '@/src/hooks/usePermissions';
// ===== React =====
import { useMemo } from "react";

// ===== Types =====
import { FieldJob, JobStatus, User } from "@/src/types";

// ===== Components =====
import { Button } from "@/src/components/common";
import { JobStatusLabel } from '@/src/types/enums/job';

// ===== Utils =====
import { formatThaiDate } from "@/src/utils/date";

// ===== Assets =====
import {
  DocumentCheckIcon,
  EyeIcon,
  JobDateIcon,
  JobRemarkIcon,
  JobTimeIcon,
  ManageIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  PlayIcon,
  TechnicianIcon,
} from "@/src/assets/icons/Icons";
import Swal from "sweetalert2";

const JobCard: React.FC<{
  job: FieldJob;
  onDropdownToggle: (
    event: React.MouseEvent<HTMLButtonElement>,
    jobId: string
  ) => void;
  onStatusChange: (jobId: string, newStatus: JobStatus) => void;
  onViewDetails: (job: FieldJob) => void;
  onWriteReport: (job: FieldJob) => void;
  onEditJob?: (job: FieldJob) => void;
  onApprove?: (jobId: string) => Promise<void> | void;
  onReject?: (jobId: string, reason: string) => Promise<void> | void;
  currentUser: User;
  isAnyJobInProgressForCurrentUser: boolean;
}> = ({
  job,
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
    const currentUserId = currentUser?.id as string | undefined;
    const roleVal = currentUser?.role;
    const currentUserRole = String(typeof roleVal === 'object' ? (roleVal as Record<string, string>)?.name : roleVal || '').toUpperCase();
    const isLeadTechOrTech = isFieldRole(currentUser?.roleType);
    const isAssignedToCurrentUser = useMemo(
      () =>
        !!currentUserId &&
        (job.technicians || []).some((tech) => tech && tech.id === currentUserId),
      [job.technicians, currentUserId]
    );

    const showCheckInButton =
      isLeadTechOrTech &&
      isAssignedToCurrentUser &&
      ((job.status as unknown as JobStatus) === JobStatus.Planned ||
        (job.status as unknown as string).toUpperCase() === 'PENDING');

    const showCheckOutButton =
      isLeadTechOrTech &&
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

    const jobDate = formatThaiDate(job.appointment_date);
    const jobStartTime = new Date(job.start_time).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const jobEndTime = new Date(job.end_time).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const hasActions =
      (job.status as unknown as JobStatus) !== JobStatus.Completed &&
      String(job.api_status || '').toUpperCase() !== 'WAITING_CLEAR';

    const handleApprove = () => {
      if (!onApprove) return;
      Swal.fire({
        title: 'อนุมัติงานนี้?',
        text: 'งานจะถูกย้ายเข้าคิวรอเข้าดำเนินการ',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'อนุมัติ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#10b981',
      }).then((result) => {
        if (result.isConfirmed) {
          Promise.resolve(onApprove(job.id));
        }
      });
    };

    const handleReject = () => {
      if (!onReject) return;
      Swal.fire({
        title: 'ปฏิเสธงานนี้?',
        input: 'textarea',
        inputLabel: 'เหตุผลการปฏิเสธ',
        inputPlaceholder: 'ระบุเหตุผล...',
        inputAttributes: { 'aria-label': 'เหตุผลการปฏิเสธ' },
        showCancelButton: true,
        confirmButtonText: 'ปฏิเสธ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#ef4444',
        inputValidator: (value) => (!value || !value.trim() ? 'กรุณาระบุเหตุผล' : null),
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          Promise.resolve(onReject(job.id, result.value.trim()));
        }
      });
    };

    // Get status color for left border
    const getStatusColor = () => {
      const statusUpper = String(
        job.api_status || job.status || ''
      ).toUpperCase();
      if (statusUpper === 'PENDING_APPROVAL' || statusUpper === 'PENDINGAPPROVAL') return 'border-l-orange-500';
      if (statusUpper === 'REJECTED') return 'border-l-red-500';
      if (statusUpper === 'IN_PROGRESS' || statusUpper === 'INPROGRESS')
        return 'border-l-amber-500';
      if (statusUpper === 'COMPLETED' || statusUpper === 'COMPLETE')
        return 'border-l-green-500';
      if (statusUpper === 'WAITING_CLEAR')
        return 'border-l-orange-500';
      if (statusUpper === 'CANCELLED') return 'border-l-red-500';
      return 'border-l-primary';
    };

    const statusUpper = String(job.api_status || job.status || '').toUpperCase();
    const isPendingApproval = statusUpper === 'PENDING_APPROVAL' || statusUpper === 'PENDINGAPPROVAL';
    const isRejected = statusUpper === 'REJECTED';
    const { hasPermission } = usePermissions();
    const canApprove = hasPermission('APPROVE_OPERATION');
    const canUpdate = hasPermission('UPDATE_OPERATION');
    // Legacy jobs (สร้างก่อน migration) มี created_by = NULL — ไม่สามารถระบุเจ้าของได้
    // → ให้ user ที่มี UPDATE_OPERATION แก้ได้ทั้งหมด (กัน edge case UX ค้าง)
    const isLegacyNoCreator = !job.created_by;
    const isCreator = !!currentUserId && !!job.created_by && job.created_by === currentUserId;
    const canEditRejected = isRejected && canUpdate && (isCreator || canApprove || isLegacyNoCreator);

    const handleCheckIn = () => {
      // 💡 ตรวจสอบให้ชัวร์ว่าข้อมูลใน job ใช้คำว่า remark หรือ remarks
      // ผมทำตัวแปรมารองรับไว้ให้ทั้งสองแบบครับ
      const currentRemark = job.remarks || (job as unknown as Record<string, string>).remark || '';
      const operationDetails = (job as unknown as Record<string, string>).operation_details || '';
      const hasInfo = operationDetails.trim() || currentRemark.trim();

      if (hasInfo) {
        const sections: string[] = [];
        if (operationDetails.trim()) {
          sections.push(`<div class="text-left mb-3"><div class="text-sm font-semibold text-slate-600 mb-1">รายละเอียดการปฏิบัติงาน</div><div class="text-sm text-slate-800 bg-slate-50 rounded-lg p-3 border border-slate-200">${operationDetails.replace(/\n/g, '<br>')}</div></div>`);
        }
        if (currentRemark.trim()) {
          sections.push(`<div class="text-left"><div class="text-sm font-semibold text-slate-600 mb-1">หมายเหตุ / ข้อควรระวัง</div><div class="text-sm text-orange-800 bg-orange-50 rounded-lg p-3 border border-orange-200">${currentRemark.replace(/\n/g, '<br>')}</div></div>`);
        }

        Swal.fire({
          title: 'ข้อมูลก่อนเริ่มงาน',
          html: sections.join(''),
          icon: 'warning',
          confirmButtonText: 'รับทราบและเริ่มงาน',
          confirmButtonColor: '#10b981',
          showCancelButton: true,
          cancelButtonText: 'ยกเลิก',
          customClass: {
            confirmButton: 'px-4 py-2 rounded-lg',
            cancelButton: 'px-4 py-2 rounded-lg'
          }
        }).then((result) => {
          if (result.isConfirmed) {
            onStatusChange(job.id, JobStatus.InProgress);
          }
        });
      } else {
        Swal.fire({
          title: 'ยืนยันเช็คอิน?',
          text: 'คุณต้องการเช็คอินเพื่อเริ่มงานนี้หรือไม่',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'ตกลง เริ่มงาน',
          cancelButtonText: 'ยกเลิก',
          confirmButtonColor: '#10b981',
        }).then((result) => {
          if (result.isConfirmed) {
            onStatusChange(job.id, JobStatus.InProgress);
          }
        });
      }
    };

    const handleCheckOut = () => {
      const reportRaw = job.service_report as unknown as Record<string, unknown> | undefined;
      const hasReport = !!reportRaw && (
        !!(reportRaw as { id?: string }).id ||
        !!((reportRaw as { data?: { id?: string } }).data?.id)
      );

      if (!hasReport) {
        Swal.fire({
          title: 'ยังไม่ได้บันทึกรายงานบริการ',
          text: 'กรุณาบันทึกรายงานบริการให้เรียบร้อยก่อนเช็คเอาท์เพื่อจบงานนี้',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'เปิดรายงานบริการ',
          cancelButtonText: 'ยกเลิก',
          confirmButtonColor: '#10b981',
        }).then((result) => {
          if (result.isConfirmed) {
            onWriteReport(job);
          }
        });
        return;
      }

      Swal.fire({
        title: 'ยืนยันเช็คเอาท์?',
        text: 'คุณต้องการเช็คเอาท์เพื่อจบงานนี้หรือไม่',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ตกลง จบงาน',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#f59e0b',
      }).then((result) => {
        if (result.isConfirmed) {
          onStatusChange(job.id, JobStatus.Completed);
        }
      });
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
            {(() => {
              const key = String(job.api_status || '').toUpperCase();
              const label = JobStatusLabel[key] || key;
              const colorMap: Record<string, string> = {
                UNASSIGNED: 'bg-amber-100 text-amber-700',
                PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
                REJECTED: 'bg-red-100 text-red-700',
                PENDING: 'bg-yellow-100 text-yellow-700',
                IN_PROGRESS: 'bg-blue-100 text-blue-700',
                COMPLETE: 'bg-green-100 text-green-700',
                WAITING_CLEAR: 'bg-orange-100 text-orange-700',
                CANCELLED: 'bg-red-100 text-red-700',
              };
              const color = colorMap[key] || 'bg-slate-100 text-slate-600';
              return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>{label}</span>;
            })()}
          </div>
        </div>

        {/* Info */}
        <div className="px-4 pb-3 space-y-2">
          {job.customer?.primary_phone && (
            <div className="flex items-center gap-2.5 text-sm">
              <PhoneIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600">{job.customer.primary_phone}</span>
            </div>
          )}
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
          <div className="flex items-center gap-2.5 text-sm">
            <JobRemarkIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
            {job.remarks ? (
              <span className="font-medium text-red-600">
                {job.remarks}
              </span>
            ) : (
              <span className="font-medium text-slate-600">
                -
              </span>
            )}
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

            {onEditJob && ((job.assessment_id && isLeadTechOrTech) || canEditRejected) && (
              <button
                onClick={() => onEditJob(job)}
                title={isRejected ? 'แก้ไขแล้วส่งอนุมัติใหม่' : 'แก้ไขงานและใบประเมิน'}
                className="w-full py-2 text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 text-white"
                style={{ backgroundColor: '#3b82f6' }}
              >
                <PencilIcon className="h-4 w-4" />
                {isRejected ? 'แก้ไขและส่งอนุมัติใหม่' : 'แก้ไขงานและใบประเมิน'}
              </button>
            )}

            {showCheckInButton && (
              <button
                onClick={() => handleCheckIn()}
                disabled={isAnyJobInProgressForCurrentUser}
                title={checkInTooltip}
                className="w-full py-2 text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 text-white disabled:opacity-50"
                style={{ backgroundColor: '#10b981' }}
              >
                <PlayIcon className="h-4 w-4" />
                เช็คอิน
              </button>
            )}
            {showReportButton && (
              <button
                onClick={() => onWriteReport(job)}
                title={job.service_report ? 'แก้ไขรายงานบริการ' : 'บันทึกรายงานบริการ'}
                className="w-full py-2 text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 text-white"
                style={{ backgroundColor: job.service_report ? '#3b82f6' : '#f59e0b' }}
              >
                {job.service_report ? <PencilIcon className="h-4 w-4" /> : <DocumentCheckIcon className="h-4 w-4" />}
                {job.service_report ? 'แก้ไขรายงาน' : 'บันทึกรายงาน'}
              </button>
            )}
            {showCheckOutButton && (
              <button
                onClick={() => handleCheckOut()}
                title="เช็คเอาท์เพื่อจบงาน"
                className="w-full py-2 text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 text-white"
                style={{ backgroundColor: '#ef4444' }}
              >
                <DocumentCheckIcon className="h-4 w-4" />
                เช็คเอาท์
              </button>
            )}

            {isPendingApproval && canApprove && (
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  title="อนุมัติงานนี้"
                  className="flex-1 py-2 text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 text-white"
                  style={{ backgroundColor: '#10b981' }}
                >
                  <DocumentCheckIcon className="h-4 w-4" />
                  อนุมัติ
                </button>
                <button
                  onClick={handleReject}
                  title="ปฏิเสธงานนี้"
                  className="flex-1 py-2 text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 text-white"
                  style={{ backgroundColor: '#ef4444' }}
                >
                  ปฏิเสธ
                </button>
              </div>
            )}

            {isRejected && job.rejection_reason && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <span className="font-semibold">เหตุผลที่ถูกปฏิเสธ:</span> {job.rejection_reason}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

export default JobCard;
