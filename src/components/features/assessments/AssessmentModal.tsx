import { FC } from 'react';
import { Modal } from '../../common/Modal';
import { AssessmentForm } from './AssessmentForm';
import { Assessment } from '@/src/types/entity/app.interface';

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // หากมี assessment แสดงว่าเป็นโหมด Edit, หากเป็น null/undefined คือโหมด Add
  assessment?: Assessment | null;
  onSubmit: (data: any) => void;
}

export const AssessmentModal: FC<AssessmentModalProps> = ({
  isOpen,
  onClose,
  assessment,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={assessment?.id ? `แก้ไขใบประเมิน: ${assessment.code || ''}` : 'สร้างใบประเมินใหม่'}
      size="5xl"
      footer={null} 
    >
      <AssessmentForm 
        isOpen={isOpen}
        initialData={assessment}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
};