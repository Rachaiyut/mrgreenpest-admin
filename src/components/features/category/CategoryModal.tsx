import React from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { Category } from '@/src/types/entity/app.interface';
import { CategoryForm } from './CategoryForm';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialValues?: Category | null;
  onSubmit: (data: Partial<Category>) => void | Promise<void>;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSubmit,
}) => {
  if (mode === 'edit' && !initialValues) return null;

  const getTitle = () => {
    if (mode === 'create') return 'สร้างหมวดหมู่ใหม่';
    return `แก้ไขหมวดหมู่: ${initialValues?.name || ''}`;
  };

  const footer = (
    <div className="flex gap-3 w-full justify-end">
      <Button variant="secondary" onClick={onClose} type="button">
        ยกเลิก
      </Button>
      <Button variant="primary" type="submit" form="category-form">
        บันทึก
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="lg" footer={footer}>
      <CategoryForm
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
