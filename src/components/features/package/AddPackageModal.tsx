import React from 'react';
import { Modal } from '../../common';
import { Package, Category, Unit } from '@/src/types';
import PackageForm from './PackageForm';

interface AddPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePackage: (product: Partial<Package>) => void;
  categories: Category[];
  units: Unit[];
}

export const AddPackageModal: React.FC<AddPackageModalProps> = ({
  isOpen,
  onClose,
  onCreatePackage,
  categories,
  units,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="สร้างแพ็กเกจบริการใหม่" size="4xl">
      <PackageForm
        mode="create"
        categories={categories}
        units={units}
        onSubmit={(data) => { onCreatePackage(data); onClose(); }}
        onCancel={onClose}
      />
    </Modal>
  );
};
