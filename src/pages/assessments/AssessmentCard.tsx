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
  const appointmentDate = formatThaiDate(assessment.appointment_date.toString());

  const allServiceTypes = useMemo(() => {
    const areas = assessment?.assessment_areas || [];
    // Assuming you want to display something meaningful, you might need to fetch category names
    // For now, we'll just use the IDs or an empty array if categories are missing from the interface for now
    // based on previous errors, let's check what's actually on AssessmentWorkArea
    return []; 
  }, [assessment?.assessment_areas]);

  return (
    <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-200">
      <div>
        <div className="flex justify-between items-start">
          <div className="pr-2 min-w-0 flex-1">
            <p className="text-sm sm:text-base font-bold text-slate-800 leading-tight truncate">
              {customerName || assessment.customer_id}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {allServiceTypes.map((type) => (
                <span
                  key={type}
                  className="text-[10px] sm:text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full max-w-full truncate"
                  title={type}
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
          <div className="relative flex-shrink-0 ml-2">
            <Button
              data-assessment-id={assessment.id || assessment.code}
              onClick={(e) => onDropdownToggle(e, assessment.id || assessment.code)}
              variant="icon"
              className="-mr-1 -mt-1 p-1.5 sm:p-2 hover:bg-slate-100 rounded-full"
              title="ตัวเลือก"
            >
              <ManageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
            </Button>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 flex items-center gap-2">
          <StatusBadge status={assessment.status} />
          <span className="text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
            {assessment.assessment_areas?.length || 0} พื้นที่
          </span>
        </div>

        <div className="mt-2 flex items-start text-xs sm:text-sm text-slate-600">
          <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-0.5 text-accent flex-shrink-0" />
          <span className="break-words line-clamp-2" title={assessment.address}>
            {assessment.address || '-'}
          </span>
        </div>

        <div className="mt-2 flex items-center text-xs sm:text-sm text-slate-600">
          <JobDateIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-accent flex-shrink-0" />
          <span>{appointmentDate}</span>
        </div>
      </div>
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200">
        <Button
          onClick={() => onViewDetails(assessment)}
          title="ดูรายละเอียดใบประเมิน"
          variant="outline"
          className="w-full text-xs sm:text-sm justify-center py-2 sm:py-2.5"
        >
          <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5" />
          <span>ดูรายละเอียด</span>
        </Button>
      </div>
    </div>
  );
};

export default AssessmentCard;


