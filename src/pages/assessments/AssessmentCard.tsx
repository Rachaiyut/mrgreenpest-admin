import React, { useMemo } from "react";
import { Button } from "@/src/components/common/FormControls";
import {
  ManageIcon,
  MapPinIcon,
  JobDateIcon,
  EyeIcon,
} from "@/src/assets/icons/Icons";
import { formatThaiDate } from "@/src/constants";
import { StatusBadge } from "@/src/components/common/StatusBadge";
import { Assessment } from "@/src/types/entity/app.interface";

const AssessmentCard: React.FC<{
  assessment: Assessment;
  onDropdownToggle: (
    event: React.MouseEvent<HTMLButtonElement>,
    assessmentId: string
  ) => void;
  onViewDetails: (assessment: Assessment) => void;
}> = ({ assessment, onDropdownToggle, onViewDetails }) => {
  const appointmentDate = formatThaiDate(assessment.scheduled_at);

  const allServiceTypes = useMemo(
    () => [
      ...new Set(assessment.work_areas.flatMap((area) => area.service_type)),
    ],
    [assessment.work_areas]
  );

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between min-h-[220px]">
      <div>
        <div className="flex justify-between items-start">
          <div className="pr-2 min-w-0">
            <p className="text-base font-bold text-slate-800 leading-tight truncate">
              {assessment.customer_name}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {allServiceTypes.map((type) => (
                <span
                  key={type}
                  className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full"
                  title={type}
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
          <div className="relative flex-shrink-0">
            <Button
              data-assessment-id={assessment.id}
              onClick={(e) => onDropdownToggle(e, assessment.id)}
              variant="icon"
              className="-mr-1 -mt-1"
              title="ตัวเลือก"
            >
              <ManageIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <StatusBadge status={assessment.status} />
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {assessment.work_areas.length} พื้นที่
          </span>
        </div>

        <div className="mt-2 flex items-start text-sm text-slate-600">
          <MapPinIcon className="h-5 w-5 mr-3 mt-0.5 text-accent flex-shrink-0" />
          <span className="break-words" title={assessment.address}>
            {assessment.address}
          </span>
        </div>

        <div className="mt-2 flex items-center text-sm text-slate-600">
          <JobDateIcon className="h-5 w-5 mr-3 text-accent flex-shrink-0" />
          <span>{appointmentDate}</span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200">
        <Button
          onClick={() => onViewDetails(assessment)}
          title="ดูรายละเอียดใบประเมิน"
          variant="outline"
          className="w-full"
        >
          <EyeIcon className="h-5 w-5" />
          <span>ดูรายละเอียด</span>
        </Button>
      </div>
    </div>
  );
};

export default AssessmentCard;
