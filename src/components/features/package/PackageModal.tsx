import React from 'react';
import { Modal, Button } from '../../common';
import { Package, Category, Unit } from '@/src/types';
import PackageForm from './PackageForm';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialValues?: Package | null;
  onSubmit: (data: Partial<Package>) => void;
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="7xl">
      <PackageForm
        mode={mode}
        initialValues={mode === 'edit' ? initialValues || undefined : undefined}
        categories={categories}
        units={units}
        onSubmit={(data) => {
          onSubmit(data);
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
};
