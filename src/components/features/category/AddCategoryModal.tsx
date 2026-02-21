import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Select, Textarea } from '../../common/FormControls';
import { Category } from '@/src/types/entity/app.interface';
import { CategoryType } from '@/src/types/enums/category';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCategory: (category: Partial<Category>) => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onCreateCategory,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [prefix, setPrefix] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      formRef.current?.reset();
      setPrefix('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (error) {
      alert(error);
      return;
    }
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const newCategory: Partial<Category> = {
      code: data['code'] as string,
      name: data['name'] as string,
      description: data['description'] as string | undefined,
      type: data['type'] as CategoryType,
    };

    onCreateCategory(newCategory);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างหมวดหมู่ใหม่"
      size="lg"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="add-category-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
            title={error || ''}
          >
            บันทึก
          </button>
        </div>
      }
    >
      <form
        id="add-category-form"
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <FormField label="ชื่อหมวดหมู่" htmlFor="category-name">
          <Input name="name" id="category-name" type="text" required />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="รหัสหมวดหมู่" htmlFor="prefix">
            <Input
              name="code"
              id="code"
              type="text"
              maxLength={3}
              required
              placeholder="เช่น CH, MAT"
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </FormField>
          <FormField label="ประเภทหมวดหมู่" htmlFor="categoryId">
            {/* Fixed htmlFor */}
            <Select name="type" id="type" required defaultValue="">
              <option value="" disabled>
                -- เลือกหมวดหมู่ --
              </option>
              <option value={CategoryType.PRODUCT}>สินค้า</option>
              <option value={CategoryType.SERVICE}>บริการ</option>
            </Select>
          </FormField>
        </div>

        <FormField label="รายละเอียด" htmlFor="description">
          <Textarea name="description" id="description" rows={3} />
        </FormField>
      </form>
    </Modal>
  );
};
