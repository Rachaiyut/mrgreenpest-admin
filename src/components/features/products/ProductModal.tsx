import React from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { Product } from '@/src/types/entity/product.interface';
import { Category } from '@/src/types/entity/category.interface';
import { Unit } from '@/src/types/entity/unit.interface';
import { CategoryType } from '@/src/types/enums/category';
import ProductForm from './ProductForm';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialValues?: Product | null;
  onSubmit: (data: any, type: CategoryType, imageFile?: File | null) => Promise<boolean>;
  categories: Category[];
  units: Unit[];
}

export const ProductModal: React.FC<ProductModalProps> = ({
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
    if (mode === 'create') return 'สร้างสินค้า/บริการใหม่';
    return `แก้ไขสินค้า/บริการ: ${initialValues?.name || ''}`;
  };

  const footer = (
    <div className="flex gap-3 w-full justify-end">
      <Button variant="secondary" onClick={onClose} type="button">
        ยกเลิก
      </Button>
      <Button variant="primary" type="submit" form="product-form">
        {mode === 'create' ? 'บันทึก' : 'บันทึกการเปลี่ยนแปลง'}
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="3xl" footer={footer}>
      <ProductForm
        mode={mode}
        initialValues={mode === 'edit' ? initialValues : null}
        categories={categories}
        units={units}
        onSubmit={async (data, type, imageFile) => {
          const success = await onSubmit(data, type, imageFile);
          if (success) onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
};
