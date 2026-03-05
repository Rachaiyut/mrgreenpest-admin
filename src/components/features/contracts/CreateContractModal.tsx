import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { ContractForm } from './ContractForm';
import { useData } from '../../../contexts/DataContext';

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateContractModal: React.FC<CreateContractModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { handlers } = useData();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsSaving(true);
    try {
      await handlers.contracts.create(data);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('เกิดข้อผิดพลาดในการสร้างใบสัญญา');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างใบสัญญาใหม่"
      size="7xl"
      footer={null}
    >
      <ContractForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSaving={isSaving}
      />
    </Modal>
  );
};
