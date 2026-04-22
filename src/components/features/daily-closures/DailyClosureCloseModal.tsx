import React, { useState } from 'react';
import Swal from 'sweetalert2';
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

  // Option C: อนุญาตให้ปิดงานได้แม้ยังมีใบเบิกรออนุมัติ (warning เท่านั้น)
  const canSubmit = (() => {
    if (!hasStockIssueSummary && !hasNoStockIssue) return false;
    return true;
  })();

  const confirmSubmit = async () => {
    if (hasPendingStockIssue) {
      const r = await Swal.fire({
        icon: 'warning',
        title: 'มีใบเบิกรออนุมัติ',
        html:
          'ยังมีใบเบิกที่รอการอนุมัติจากหัวหน้าผู้ดูแลระบบ/ผู้ดูแลระบบ<br/>' +
          'ระบบจะตัดสต็อกเมื่อได้รับอนุมัติครบเท่านั้น<br/><br/>' +
          'ต้องการยืนยันจบงานต่อไหม?',
        showCancelButton: true,
        confirmButtonText: 'จบงานต่อ',
        cancelButtonText: 'รอดำเนินการ',
        confirmButtonColor: '#10b981',
      });
      if (!r.isConfirmed) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    const confirmed = await confirmSubmit();
    if (!confirmed) return;
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

  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
  const totalExpenseAll = issueSummaries.reduce((sum, s) => sum + s.expenses.reduce((es, e) => es + e.amount, 0), 0);
  const totalItemsAll = issueSummaries.reduce((sum, s) => sum + s.items.length, 0);

  const footer = (
    <div className="flex items-center justify-end gap-3 w-full">
      <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
        ยกเลิก
      </Button>
      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            กำลังปิดงาน...
          </span>
        ) : 'จบงานรายวัน'}
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="2xl" footer={footer}>
      <div className="space-y-5">
        {/* Header */}
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">จบงานรายวัน</h2>
              <p className="text-sm text-slate-500">{vehicleName}</p>
            </div>
            <span className="text-sm font-bold text-primary">{completionRate}%</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 rounded-lg py-2">
              <p className="text-lg font-bold text-slate-800">{totalJobs}</p>
              <p className="text-xs text-slate-500">ทั้งหมด</p>
            </div>
            <div className="bg-green-50 rounded-lg py-2">
              <p className="text-lg font-bold text-green-600">{completedJobs}</p>
              <p className="text-xs text-slate-500">เสร็จ</p>
            </div>
            <div className={`rounded-lg py-2 ${incompleteJobs > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
              <p className={`text-lg font-bold ${incompleteJobs > 0 ? 'text-red-600' : 'text-slate-400'}`}>{incompleteJobs}</p>
              <p className="text-xs text-slate-500">ค้าง</p>
            </div>
          </div>
        </div>

        {/* Issue Summaries - Table Style */}
        {issueSummaries.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
              สรุปการเบิก ({issueSummaries.length} ใบ)
            </h4>

            {issueSummaries.map((summary) => {
              const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
                COMPLETED: { label: 'เสร็จสิ้น', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
                APPROVED: { label: 'อนุมัติแล้ว', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
                PENDING: { label: 'รออนุมัติ', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
                DRAFT: { label: 'ฉบับร่าง', className: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
                CANCELLED: { label: 'ยกเลิก', className: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
              };
              const badge = statusConfig[summary.status] || statusConfig.DRAFT;
              const totalExpenseAmount = summary.expenses.reduce((sum, e) => sum + e.amount, 0);

              return (
                <div key={summary.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-3">
                  {/* Header */}
                  <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase">ใบเบิก</span>
                  </div>

                  {/* Items Table */}
                  {summary.items.length > 0 && (
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                        สินค้า/อุปกรณ์
                      </p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-1.5 text-xs font-medium text-slate-400">รายการ</th>
                            <th className="text-right py-1.5 text-xs font-medium text-slate-400 w-20">จำนวน</th>
                            <th className="text-right py-1.5 text-xs font-medium text-slate-400 w-16">หน่วย</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-50 last:border-0">
                              <td className="py-2 text-slate-700">{item.product_name}</td>
                              <td className="py-2 text-right font-semibold text-slate-800 tabular-nums">{item.quantity}</td>
                              <td className="py-2 text-right text-slate-500">{item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Expenses Table */}
                  {summary.expenses.length > 0 && (
                    <div className="px-4 pt-3 pb-1 border-t border-dashed border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                        ค่าใช้จ่าย
                      </p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-1.5 text-xs font-medium text-slate-400">รายละเอียด</th>
                            <th className="text-right py-1.5 text-xs font-medium text-slate-400 w-28">จำนวนเงิน</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.expenses.map((exp, idx) => (
                            <tr key={idx} className="border-b border-slate-50 last:border-0">
                              <td className="py-2 text-slate-700">{exp.description || '-'}</td>
                              <td className="py-2 text-right font-semibold text-slate-800 tabular-nums">{exp.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Total Footer */}
                  {(summary.items.length > 0 || summary.expenses.length > 0) && totalExpenseAmount > 0 && (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-t border-primary/10">
                      <span className="text-sm font-bold text-slate-700">รวมค่าใช้จ่าย</span>
                      <span className="text-sm font-black text-primary tabular-nums">{totalExpenseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                  )}

                  {/* Empty */}
                  {summary.items.length === 0 && summary.expenses.length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-slate-400">ไม่มีรายการ</p>
                    </div>
                  )}

                  {/* Notes */}
                  {summary.notes && (
                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                      <p className="text-xs text-slate-500"><span className="font-semibold">หมายเหตุ:</span> {summary.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Alerts */}
        {hasPendingStockIssue && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="p-1.5 bg-amber-100 rounded-lg flex-shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">มีใบเบิกรออนุมัติ</p>
              <p className="text-xs text-amber-600 mt-0.5">จบงานได้ตอนนี้ — หัวหน้าผู้ดูแลระบบจะอนุมัติภายหลัง</p>
            </div>
          </div>
        )}

        {!hasStockIssueSummary && !hasPendingStockIssue && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-800">ยังไม่มีใบสรุปการเบิก</p>
              <p className="text-xs text-blue-600 mt-0.5">กรุณาทำใบเบิกหรือยืนยันว่าไม่มีการเบิก</p>
            </div>
          </div>
        )}

        {/* Form Section */}
        <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 space-y-4">
          <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            รายละเอียดการปิดงาน
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">วันที่ปิดงาน</label>
              <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
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
                  className="bg-transparent border-none p-0 text-slate-800 font-semibold focus:ring-0 focus:outline-none text-sm w-[90px] cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label htmlFor="day-end-mileage" className="block text-sm font-medium text-slate-700 mb-1.5">เลขไมล์จบวัน</label>
              <Input
                id="day-end-mileage"
                type="number"
                placeholder="ไม่บังคับ"
                value={dayEndMileage}
                onChange={(e) => setDayEndMileage(e.target.value)}
                min={0}
              />
            </div>
          </div>

          {!hasStockIssueSummary && (
            <label className="flex items-center gap-3 cursor-pointer select-none p-3 bg-white rounded-lg border border-slate-200 hover:border-primary/30 transition-colors">
              <input
                type="checkbox"
                checked={hasNoStockIssue}
                onChange={(e) => setHasNoStockIssue(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">ไม่มีการเบิกวันนี้</span>
                <p className="text-xs text-slate-400">ยืนยันว่าไม่มีการเบิกสินค้าหรือค่าใช้จ่าย</p>
              </div>
            </label>
          )}

          <div>
            <label htmlFor="closure-notes" className="block text-sm font-medium text-slate-700 mb-1.5">หมายเหตุ</label>
            <textarea
              id="closure-notes"
              rows={2}
              placeholder="หมายเหตุเพิ่มเติม (ไม่บังคับ)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none bg-white"
            />
          </div>
        </div>

        {/* Validation */}
        {!hasStockIssueSummary && !hasNoStockIssue && !hasPendingStockIssue && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50/50 rounded-lg px-3 py-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
            กรุณาทำใบสรุปการเบิก หรือเลือก "ไม่มีการเบิกวันนี้"
          </div>
        )}
      </div>
    </Modal>
  );
};
