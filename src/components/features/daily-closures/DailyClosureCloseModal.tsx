import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { Button, Input } from '../../common/FormControls';
import DatePicker from '../../common/BuddhistDatePicker';
import { CloseDailyJobClosurePayload } from '@/src/types/entity/daily-closure.interface';

interface IssueSummaryItem {
  id: string;
  status: string;
  notes: string;
  items: { product_name: string; quantity: number; unit: string }[];
  expenses: { description: string; amount: number }[];
}

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
  issueSummaries?: IssueSummaryItem[];
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
  issueSummaries = [],
}) => {
  const [closureDate, setClosureDate] = useState<Date | null>(new Date());
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
        closure_date: closureDate
          ? `${closureDate.getFullYear()}-${String(closureDate.getMonth() + 1).padStart(2, '0')}-${String(closureDate.getDate()).padStart(2, '0')}`
          : undefined,
        day_end_mileage: dayEndMileage ? Number(dayEndMileage) : undefined,
        has_no_stock_issue: hasNoStockIssue || undefined,
        notes: notes.trim() || undefined,
      };
      await onSubmit(payload);
      // Reset form
      setClosureDate(new Date());
      setDayEndMileage('');
      setHasNoStockIssue(false);
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setClosureDate(new Date());
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
        {isSubmitting ? 'กำลังปิดงาน...' : 'จบงานรายวัน'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="จบงานรายวัน"
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

        {/* Section 2: Stock Issue Summaries */}
        {issueSummaries.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700">สรุปการเบิกวันนี้ ({issueSummaries.length} รายการ)</h4>
            {issueSummaries.map((summary) => {
              const statusConfig: Record<string, { label: string; className: string }> = {
                COMPLETED: { label: 'เสร็จสิ้น', className: 'bg-green-100 text-green-700' },
                APPROVED: { label: 'อนุมัติแล้ว', className: 'bg-green-100 text-green-700' },
                PENDING: { label: 'รออนุมัติ', className: 'bg-amber-100 text-amber-700' },
                DRAFT: { label: 'ฉบับร่าง', className: 'bg-slate-100 text-slate-600' },
                CANCELLED: { label: 'ยกเลิก', className: 'bg-red-100 text-red-700' },
              };
              const badge = statusConfig[summary.status] || statusConfig.DRAFT;
              const totalExpenseAmount = summary.expenses.reduce((sum, e) => sum + e.amount, 0);

              return (
                <div key={summary.id} className="rounded-xl border border-slate-200 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-600">ใบเบิก</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Items */}
                    {summary.items.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">สินค้า/อุปกรณ์</p>
                        <div className="space-y-1.5">
                          {summary.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-slate-700">{item.product_name}</span>
                              <span className="text-slate-500 font-medium">{item.quantity} {item.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expenses */}
                    {summary.expenses.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">ค่าใช้จ่าย</p>
                        <div className="space-y-1.5">
                          {summary.expenses.map((exp, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-slate-700">{exp.description || '-'}</span>
                              <span className="text-slate-500 font-medium">{exp.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between text-sm pt-1.5 border-t border-slate-100">
                            <span className="font-semibold text-slate-700">รวมค่าใช้จ่าย</span>
                            <span className="font-bold text-primary">{totalExpenseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {summary.notes && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">หมายเหตุ</p>
                        <p className="text-sm text-slate-600">{summary.notes}</p>
                      </div>
                    )}

                    {/* Empty */}
                    {summary.items.length === 0 && summary.expenses.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-2">ไม่มีรายการ</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Section 3: Warning Messages */}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">
              วันที่ปิดงาน
            </label>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition-colors cursor-pointer w-fit">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <DatePicker
                selected={closureDate}
                onChange={(date: Date | null) => setClosureDate(date)}
                dateFormat="dd/MM/yyyy"
                locale="th"
                placeholderText="เลือกวันที่"
                portalId="root"
                popperClassName="!z-[9999]"
                className="bg-transparent border-none p-0 text-slate-800 font-semibold focus:ring-0 focus:outline-none text-sm w-[100px] cursor-pointer"
              />
            </div>
          </div>

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
