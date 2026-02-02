import React from 'react';
import { Modal } from './Modal';
import { Button } from './FormControls';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonClass?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'ยืนยัน',
  cancelButtonText = 'ยกเลิก',
  confirmButtonClass = 'bg-primary hover:bg-primary/90',
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
            variant="outline"
          >
            {cancelButtonText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className={`py-2 px-4 rounded-lg text-white font-semibold shadow-sm ${confirmButtonClass}`}
            variant="primary"
          >
            {confirmButtonText}
          </Button>
        </div>
      }
    >
      <div className="text-slate-600">{message}</div>
    </Modal>
  );
};
