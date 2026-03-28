import React from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { Supplier } from '@/src/types/entity/supplier.interface';
import { SupplierForm } from './SupplierForm';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialValues?: Supplier | null;
  onSubmit: (data: Partial<Supplier>) => void | Promise<void>;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSubmit,
}) => {
  if (mode === 'edit' && !initialValues) return null;

  const getTitle = () => {
    if (mode === 'create') return 'สร้างผู้จัดจำหน่ายใหม่';
    return `แก้ไขผู้จัดจำหน่าย: ${initialValues?.name || ''}`;
  };

  const footer = (
    <div className="flex gap-3 w-full justify-end">
      <Button variant="secondary" onClick={onClose} type="button">
        ยกเลิก
      </Button>
      <Button variant="primary" type="submit" form="supplier-form">
        บันทึก
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="2xl" footer={footer}>
      <SupplierForm
        mode={mode}
        initialValues={mode === 'edit' ? initialValues : null}
        onSubmit={async (data) => {
          await onSubmit(data);
          onClose();
        }}
      />
    </Modal>
  );
};
