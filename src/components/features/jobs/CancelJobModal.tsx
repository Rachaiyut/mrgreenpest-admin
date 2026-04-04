import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Textarea, Button } from '../../common/FormControls';
import { FieldJob } from '@/src/types/entity/app.interface';
import { JobApi } from '@/src/api';
import { JobMainStatus } from '@/src/types';

interface CancelJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: FieldJob | null;
  onConfirm: (jobId: string, reason: string) => void;
}

export const CancelJobModal: React.FC<CancelJobModalProps> = ({
  isOpen,
  onClose,
  job,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen || !job) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (job && reason) {
      try {
        await JobApi.update(job.id, {
          status: JobMainStatus.CANCELLED,
          remarks: reason,
        } as Record<string, unknown>);
        onConfirm(job.id, reason);
        onClose();
      } catch (error) {
        console.error('Error cancelling job:', error);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ยืนยันการยกเลิกงาน: ${job.customerName}`}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
          >
            ปิด
          </Button>
          <Button
            variant="destructive"
            type="submit"
            form="cancel-job-form"
            className="py-2 px-4 rounded-lg bg-danger hover:bg-danger/90 text-white font-semibold shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
            disabled={!reason}
          >
            ยืนยันการยกเลิก
          </Button>
        </div>
      }
    >
      <form id="cancel-job-form" onSubmit={handleSubmit}>
        <FormField label="เหตุผลในการยกเลิก" htmlFor="cancel-reason">
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="ระบุเหตุผลที่ต้องยกเลิกงาน เช่น ลูกค้าขอเลื่อน, ไม่สามารถเข้าพื้นที่ได้"
            required
          />
        </FormField>
      </form>
    </Modal>
  );
};
