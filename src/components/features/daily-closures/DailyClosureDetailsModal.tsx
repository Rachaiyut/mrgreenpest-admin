import React from 'react';
import { Modal } from '../../common/Modal';
import { DailyJobClosure } from '@/src/types/entity/daily-closure.interface';
import { formatThaiDate } from '@/src/utils/date';

interface DailyClosureDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  closure: DailyJobClosure | null;
}

const StatusBadge: React.FC<{ status: DailyJobClosure['status'] }> = ({
  status,
}) => {
  const config = {
    OPEN: {
      label: 'เปิดอยู่',
      className: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    CLOSED: {
      label: 'ปิดแล้ว',
      className: 'bg-green-100 text-green-800 border-green-200',
    },
  };
  const { label, className } = config[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}
    >
      {label}
    </span>
  );
};

export const DailyClosureDetailsModal: React.FC<
  DailyClosureDetailsModalProps
> = ({ isOpen, onClose, closure }) => {
  if (!closure) return null;

  const techName = closure.primary_technician
    ? `${closure.primary_technician.first_name} ${closure.primary_technician.last_name}`
    : '-';

  const vehicleName = closure.vehicle?.name ?? '-';
  const vehicleReg = closure.vehicle?.vehicle?.vehicle_registration;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="รายละเอียดสรุปงานรายวัน" size="3xl">
      {/* Summary Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[150px]">
          <p className="text-xs text-slate-500">วันที่</p>
          <p className="font-semibold text-slate-800">
            {formatThaiDate(closure.closure_date)}
          </p>
        </div>
        <div className="flex-1 min-w-[120px]">
          <p className="text-xs text-slate-500">สถานะ</p>
          <div className="mt-0.5">
            <StatusBadge status={closure.status} />
          </div>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-xs text-slate-500">รถ</p>
          <p className="font-semibold text-slate-800">
            {vehicleName}
            {vehicleReg && (
              <span className="text-sm text-slate-500 ml-1">
                ({vehicleReg})
              </span>
            )}
          </p>
        </div>
        <div className="flex-1 min-w-[150px]">
          <p className="text-xs text-slate-500">หัวหน้าทีม</p>
          <p className="font-semibold text-slate-800">{techName}</p>
        </div>
      </div>

      {/* General Info */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-3 border-b border-slate-200 pb-2">
          ข้อมูลทั่วไป
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="วันที่" value={formatThaiDate(closure.closure_date)} />
          <InfoRow
            label="รถ"
            value={
              vehicleReg ? `${vehicleName} (${vehicleReg})` : vehicleName
            }
          />
          <InfoRow label="หัวหน้าทีม" value={techName} />
          <InfoRow
            label="เลขไมล์เริ่มต้น"
            value={
              closure.day_start_mileage != null
                ? closure.day_start_mileage.toLocaleString()
                : '-'
            }
          />
          <InfoRow
            label="เลขไมล์สิ้นสุด"
            value={
              closure.day_end_mileage != null
                ? closure.day_end_mileage.toLocaleString()
                : '-'
            }
          />
          <InfoRow
            label="สถานะ"
            value={closure.status === 'PENDING' ? 'เปิดอยู่' : 'ปิดแล้ว'}
          />
          {closure.closed_at && (
            <InfoRow
              label="ปิดเมื่อ"
              value={formatThaiDate(closure.closed_at)}
            />
          )}
          {closure.closer && (
            <InfoRow
              label="ปิดโดย"
              value={`${closure.closer.first_name} ${closure.closer.last_name}`}
            />
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-3 border-b border-slate-200 pb-2">
          หมายเหตุ
        </h4>
        <p className="text-sm text-slate-600 whitespace-pre-wrap">
          {closure.notes || '-'}
        </p>
      </div>

      {/* Footer Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-wrap gap-6 justify-center">
        <SummaryItem label="งานทั้งหมด" value={closure.total_jobs} />
        <SummaryItem
          label="เสร็จ"
          value={closure.completed_jobs}
          className="text-green-600"
        />
        <SummaryItem
          label="ค้าง"
          value={closure.incomplete_jobs}
          className={closure.incomplete_jobs > 0 ? 'text-red-600' : undefined}
        />
      </div>
    </Modal>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div>
    <p className="text-xs text-slate-500">{label}</p>
    <p className="text-sm font-medium text-slate-800">{value}</p>
  </div>
);

const SummaryItem: React.FC<{
  label: string;
  value: number;
  className?: string;
}> = ({ label, value, className }) => (
  <div className="text-center">
    <p className="text-xs text-slate-500">{label}</p>
    <p className={`text-2xl font-bold ${className ?? 'text-slate-800'}`}>
      {value}
    </p>
  </div>
);
