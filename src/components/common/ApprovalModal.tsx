import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { FormField, Textarea, Button } from './FormControls';

interface ApprovableItem {
  id: string;
  code?: string;
  status: string; // Accept any status type
}

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: 'approve' | 'reject' | null;
  item: ApprovableItem | null;
  onConfirm: (itemId: string, remarks: string) => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  action,
  item,
  onConfirm,
}) => {
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setRemarks('');
    }
  }, [isOpen]);

  if (!isOpen || !action || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(item.id, remarks);
  };

  const title = action === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการไม่อนุมัติ';
  const buttonText = action === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ';
  const buttonClass =
    action === 'approve'
      ? 'bg-primary hover:bg-primary/90'
      : 'bg-danger hover:bg-danger/90';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${title}: ${item.code || item.id}`}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
          >
            ยกเลิก
          </Button>
          <Button
            variant={action === 'reject' ? 'destructive' : 'primary'}
            type="submit"
            form="approval-form"
            className={`py-2 px-4 rounded-lg text-white font-semibold shadow-sm ${buttonClass}`}
          >
            {buttonText}
          </Button>
        </div>
      }
    >
      <form id="approval-form" onSubmit={handleSubmit}>
        {action === 'reject' ? (
          <FormField label="เหตุผลการไม่อนุมัติ" htmlFor="remarks">
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="กรอกเหตุผลการไม่อนุมัติ..."
            />
          </FormField>
        ) : (
          <p className="text-sm text-slate-600">
            ยืนยันการอนุมัติใบเบิก{' '}
            <span className="font-semibold text-slate-900">{item.code || item.id}</span> ใช่หรือไม่?
          </p>
        )}
      </form>
    </Modal>
  );
};
