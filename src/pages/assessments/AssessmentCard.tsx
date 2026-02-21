import React, { useMemo } from 'react';
import { Button } from '@/src/components/common/FormControls';
import {
  ManageIcon,
  MapPinIcon,
  JobDateIcon,
  EyeIcon,
} from '@/src/assets/icons/Icons';
import { formatThaiDate } from '@/src/utils/date';
import { StatusBadge } from '@/src/components/common/StatusBadge';
import { Assessment } from '@/src/types/entity/app.interface';

const AssessmentCard: React.FC<{
  assessment: Assessment;
  customerName?: string;
  onDropdownToggle: (
    event: React.MouseEvent<HTMLButtonElement>,
    assessmentId: string
  ) => void;
  onViewDetails: (assessment: Assessment) => void;
}> = ({ assessment, customerName, onDropdownToggle, onViewDetails }) => {
  const appointmentDate = formatThaiDate(
    assessment.appointment_date.toString()
  );

  const allServiceTypes = useMemo(() => {
    const areas = assessment?.assessment_areas || [];
    // Assuming you want to display something meaningful, you might need to fetch category names
    // For now, we'll just use the IDs or an empty array if categories are missing from the interface for now
    // based on previous errors, let's check what's actually on AssessmentWorkArea
    return [];
  }, [assessment?.assessment_areas]);

  const getStatusColor = () => {
    const statusUpper = String(assessment.status || '').toUpperCase();
    if (statusUpper === 'PENDING') return 'border-l-amber-500';
    if (statusUpper === 'COMPLETE' || statusUpper === 'COMPLETED')
      return 'border-l-green-500';
    if (statusUpper === 'APPOINTMENT') return 'border-l-primary';
    return 'border-l-slate-400';
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
              {customerName || assessment.customer_id}
            </h4>
            {allServiceTypes.length > 0 && (
              <p className="text-xs text-slate-500 mt-1 truncate">
                {allServiceTypes.join(', ')}
              </p>
            )}
          </div>
          <Button
            data-assessment-id={assessment.id || assessment.code}
            onClick={(e) =>
              onDropdownToggle(e, assessment.id || assessment.code)
            }
            variant="ghost"
            className="p-1.5 h-auto rounded-lg hover:bg-slate-100 -mr-1 -mt-1 flex-shrink-0"
            title="ตัวเลือก"
          >
            <ManageIcon className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge status={assessment.status} />
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
            {assessment.assessment_areas?.length || 0} พื้นที่
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex items-start gap-2.5 text-sm">
          <MapPinIcon className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <span className="text-slate-600 line-clamp-2 leading-snug">
            {assessment.address || '-'}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <JobDateIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-slate-600">{appointmentDate}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100">
        <Button
          onClick={() => onViewDetails(assessment)}
          title="ดูรายละเอียดใบประเมิน"
          variant="ghost"
          className="w-full py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-800 rounded-lg border border-slate-200 h-auto"
        >
          <EyeIcon className="h-4 w-4 mr-1.5" />
          ดูรายละเอียด
        </Button>
      </div>
    </div>
  );
};

export default AssessmentCard;
