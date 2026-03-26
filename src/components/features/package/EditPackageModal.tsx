import React from 'react';
import { Modal } from '../../common';
import { Package, Category, Unit } from '@/src/types';
import PackageForm from './PackageForm';

interface EditPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: Package | null;
  onUpdatePackage: (pkg: Package) => void;
  categories: Category[];
  units: Unit[];
}

export const EditPackageModal: React.FC<EditPackageModalProps> = ({
  isOpen,
  onClose,
  pkg,
  onUpdatePackage,
  categories,
  units,
}) => {
  if (!pkg) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`แก้ไขแพ็กเกจ - ${pkg.name}`} size="4xl">
      <PackageForm
        mode="edit"
        initialValues={pkg}
        categories={categories}
        units={units}
        onSubmit={(data) => { onUpdatePackage({ ...pkg, ...data } as Package); onClose(); }}
        onCancel={onClose}
      />
    </Modal>
  );
};
