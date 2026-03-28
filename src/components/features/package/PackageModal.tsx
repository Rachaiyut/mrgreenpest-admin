import React from 'react';
import { Modal } from '../../common';
import { Button } from '../../common/FormControls';
import { Package, Category, Unit } from '@/src/types';
import PackageForm from './PackageForm';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialValues?: Package | null;
  onSubmit: (data: Partial<Package>) => Promise<boolean>;
  categories: Category[];
  units: Unit[];
}

export const PackageModal: React.FC<PackageModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSubmit,
  categories,
  units,
}) => {
  if (mode === 'edit' && !initialValues) return null;

  const getTitle = () => {
    if (mode === 'create') return 'สร้างแพ็กเกจบริการใหม่';
    return `แก้ไขแพ็กเกจ - ${initialValues?.name || ''}`;
  };

  const footer = (
    <div className="flex gap-3 w-full justify-end">
      <Button variant="secondary" onClick={onClose} type="button">
        ยกเลิก
      </Button>
      <Button variant="primary" type="submit" form="package-form">
        {mode === 'create' ? 'สร้างแพ็กเกจ' : 'บันทึกการแก้ไข'}
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="7xl" footer={footer}>
      <PackageForm
        mode={mode}
        initialValues={mode === 'edit' ? initialValues || undefined : undefined}
        categories={categories}
        units={units}
        onSubmit={async (data) => {
          const success = await onSubmit(data);
          if (success) onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
};
