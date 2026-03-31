import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { Button, Input } from '../../common/FormControls';
import { CloseDailyJobClosurePayload } from '@/src/types/entity/daily-closure.interface';

interface DailyClosureCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CloseDailyJobClosurePayload) => Promise<void>;
  vehicleName: string;
  totalJobs: number;
  completedJobs: number;
  incompleteJobs: number;
  hasStockIssueSummary: boolean;
  hasPendingStockIssue: boolean;
}

export const DailyClosureCloseModal: React.FC<DailyClosureCloseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  vehicleName,
  totalJobs,
  completedJobs,
  incompleteJobs,
  hasStockIssueSummary,
  hasPendingStockIssue,
}) => {
  const [dayEndMileage, setDayEndMileage] = useState<string>('');
  const [hasNoStockIssue, setHasNoStockIssue] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = (() => {
    if (hasPendingStockIssue) return false;
    if (!hasStockIssueSummary && !hasNoStockIssue) return false;
    return true;
  })();

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload: CloseDailyJobClosurePayload = {
        day_end_mileage: dayEndMileage ? Number(dayEndMileage) : undefined,
        has_no_stock_issue: hasNoStockIssue || undefined,
        notes: notes.trim() || undefined,
      };
      await onSubmit(payload);
      // Reset form
      setDayEndMileage('');
      setHasNoStockIssue(false);
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setDayEndMileage('');
    setHasNoStockIssue(false);
    setNotes('');
    onClose();
  };

  const footer = (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={handleClose}
        disabled={isSubmitting}
      >
        ยกเลิก
      </Button>
      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? 'กำลังปิดงาน...' : 'ปิดงานรายวัน'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="ปิดงานรายวัน"
      size="lg"
      footer={footer}
    >
      <div className="space-y-5">
        {/* Section 1: Job Summary */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">สรุปงานวันนี้</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">รถ</span>
              <span className="font-medium text-slate-800">{vehicleName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">งานทั้งหมด</span>
              <span className="font-medium text-slate-800">{totalJobs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">เสร็จ</span>
              <span className="font-medium text-green-600">{completedJobs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ค้าง</span>
              <span className={`font-medium ${incompleteJobs > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {incompleteJobs}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Warning Messages */}
        {hasPendingStockIssue && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-amber-700">
              มีใบเบิกรออนุมัติ สามารถปิดย้อนหลังได้เมื่อได้รับอนุมัติ
            </p>
          </div>
        )}

        {!hasStockIssueSummary && !hasPendingStockIssue && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-blue-700">
              ยังไม่มีใบสรุปการเบิกสำหรับวันนี้ กรุณาทำใบเบิกหรือยืนยันว่าไม่มีการเบิก
            </p>
          </div>
        )}

        {/* Section 3: Form Fields */}
        <div className="space-y-4">
          <div>
            <label htmlFor="day-end-mileage" className="block text-sm font-medium text-slate-700 mb-1">
              เลขไมล์จบวัน
            </label>
            <Input
              id="day-end-mileage"
              type="number"
              placeholder="กรอกเลขไมล์ (ไม่บังคับ)"
              value={dayEndMileage}
              onChange={(e) => setDayEndMileage(e.target.value)}
              min={0}
            />
          </div>

          {!hasStockIssueSummary && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasNoStockIssue}
                onChange={(e) => setHasNoStockIssue(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-700">ไม่มีการเบิกวันนี้</span>
            </label>
          )}

          <div>
            <label htmlFor="closure-notes" className="block text-sm font-medium text-slate-700 mb-1">
              หมายเหตุ
            </label>
            <textarea
              id="closure-notes"
              rows={3}
              placeholder="หมายเหตุเพิ่มเติม (ไม่บังคับ)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm resize-none"
            />
          </div>
        </div>

        {/* Validation message */}
        {!hasStockIssueSummary && !hasNoStockIssue && !hasPendingStockIssue && (
          <p className="text-xs text-amber-600">
            กรุณาทำใบสรุปการเบิก หรือเลือก "ไม่มีการเบิกวันนี้" เพื่อปิดงาน
          </p>
        )}
      </div>
    </Modal>
  );
};
