import React, { useMemo } from 'react';
import { Button } from '@/src/components/common/FormControls';
import {
  MapPinIcon,
  JobDateIcon,
  EyeIcon,
} from '@/src/assets/icons/Icons';
import { ActionDropdown, ActionDropdownItem } from '@/src/components/common/ActionDropdown';
import { formatThaiDate } from '@/src/utils/date';
import { StatusBadge } from '@/src/components/common/StatusBadge';
import { Assessment } from '@/src/types/entity/app.interface';

const AssessmentCard: React.FC<{
  assessment: Assessment;
  customerName?: string;
  actions: ActionDropdownItem[];
  openDropdownId: string | null;
  onDropdownToggle: (id: string | null) => void;
  onViewDetails: (assessment: Assessment) => void;
}> = ({ assessment, customerName, actions, openDropdownId, onDropdownToggle, onViewDetails }) => {
  const appointmentDate = formatThaiDate(
    assessment.appointment_date.toString()
  );

  const allServiceTypes = useMemo(() => {
    const areas = assessment?.assessment_areas || [];
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
            <div className="flex flex-col gap-1.5 mb-2">
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-sm font-medium text-slate-500 shrink-0">ชื่อลูกค้า:</span>
                  <h3 className="font-bold text-slate-800 text-base leading-tight truncate">
                    {customerName || assessment.customer_id}
                  </h3>
                </div>

                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-sm font-medium text-slate-500 shrink-0">รหัสใบประเมิน:</span>
                  <p className="font-semibold text-primary text-sm leading-tight truncate">
                    {assessment.code}
                  </p>
                </div>
              </div>
            </div>

            {allServiceTypes.length > 0 && (
              <p className="text-xs text-slate-500 mt-1 truncate">
                {allServiceTypes.join(', ')}
              </p>
            )}
          </div>
          <div className="-mr-1 -mt-1 flex-shrink-0">
            <ActionDropdown
              actions={actions}
              itemId={assessment.id || assessment.code}
              openId={openDropdownId}
              onToggle={onDropdownToggle}
            />
          </div>
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
