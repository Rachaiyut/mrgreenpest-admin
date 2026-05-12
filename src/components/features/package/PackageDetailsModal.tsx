import React from 'react';
import { Modal } from '../../common';
import { Button } from '../../common/FormControls';
import { Package, Category, Unit } from '@/src/types';
import PackageForm from './PackageForm';

interface PackageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: Package | null;
  categories: Category[];
  units: Unit[];
}

export const PackageDetailsModal: React.FC<PackageDetailsModalProps> = ({
  isOpen,
  onClose,
  pkg,
  categories,
  units,
}) => {
  if (!isOpen || !pkg) return null;

  const footer = (
    <div className="flex w-full justify-end">
      <Button variant="secondary" onClick={onClose} type="button">
        ปิด
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดแพ็กเกจ - ${pkg.name || ''}`}
      size="7xl"
      footer={footer}
    >
      <PackageForm
        mode="view"
        initialValues={pkg}
        categories={categories}
        units={units}
        onSubmit={() => { /* read-only */ }}
        onCancel={onClose}
      />
    </Modal>
  );
};
