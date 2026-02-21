import React from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { QuotationForm } from './QuotationForm';
import { Quotation } from '@/src/types/entity/financial.interface';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'revise' | 'detail';
  initialValues?: Quotation | null;
  assessmentId?: string | null;
  onSubmit: (data: any) => Promise<void>;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialValues,
  assessmentId,
  onSubmit,
}) => {
  const getTitle = () => {
    if (mode === 'create') return 'สร้างใบเสนอราคาใหม่ (New Quotation)';
    if (mode === 'edit')
      return `แก้ไขใบเสนอราคา (Edit Quotation) ${initialValues?.code ? `- ${initialValues.code}` : ''}`;
    if (mode === 'revise')
      return `แก้ไขใบเสนอราคา (Revise Quotation) ${initialValues?.code ? `- ${initialValues.code}` : ''}`;
    if (mode === 'detail')
      return `รายละเอียดใบเสนอราคา (Quotation Details) ${initialValues?.code ? `- ${initialValues.code}` : ''}`;
    return 'ใบเสนอราคา';
  };

  const footer = (
    <div className="flex gap-3 w-full justify-end">
      <Button variant="secondary" onClick={onClose} type="button">
        ยกเลิก
      </Button>
      {mode !== 'detail' && (
        <Button variant="primary" type="submit" form="quotation-form">
          บันทึก
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      size="6xl"
      footer={footer}
    >
      <QuotationForm
        mode={mode}
        initialValues={initialValues || undefined}
        assessmentId={assessmentId}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
};
