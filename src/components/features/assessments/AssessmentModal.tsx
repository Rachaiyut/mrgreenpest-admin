import { FC } from 'react';
import { Modal } from '../../common/Modal';
import { AssessmentForm } from './AssessmentForm';
import { Assessment } from '@/src/types/entity/app.interface';
import { Role } from '@/src/types';

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment?: Assessment | null;
  currentUserRole: Role;
  currentUserId?: string;
  onSubmit: (data: any) => void;
}

export const AssessmentModal: FC<AssessmentModalProps> = ({
  isOpen,
  onClose,
  assessment,
  currentUserRole,
  currentUserId,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={assessment?.id ? `แก้ไขใบประเมิน: ${assessment.code || ''}` : 'สร้างใบประเมินใหม่'}
      size="5xl"
      footer={null} 
      closeOnOutsideClick={false}
    >
      <AssessmentForm 
        isOpen={isOpen}
        initialData={assessment}
        currentUserRole={currentUserRole}
        currentUserId={currentUserId}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
};