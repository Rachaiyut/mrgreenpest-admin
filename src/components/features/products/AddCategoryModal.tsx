import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Textarea } from '../../common/FormControls';
import { Category } from '@/src/libs/common/interface/entity/app.interface';
import { CategoryType } from '@/src/libs/common/enum/category.enum';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCategory: (category: Omit<Category, 'id'>) => void;
  categories: Category[];
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onCreateCategory,
  categories,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [prefix, setPrefix] = useState('');
  const [error, setError] = useState('');

  const generatedId = useMemo(() => {
    if (!prefix) return '';
    const upperPrefix = prefix.toUpperCase();
    const relevantCategories = categories.filter((c) =>
      c.id.startsWith(upperPrefix)
    );
    const maxId = relevantCategories.reduce((max, c) => {
      const numPart = c.id.replace(upperPrefix, '');
      if (!numPart) return max;
      const num = parseInt(numPart, 10);
      return isNaN(num) ? max : num > max ? num : max;
    }, 0);
    const newIdNumber = maxId + 1;
    return `${upperPrefix}${String(newIdNumber).padStart(3, '0')}`;
  }, [prefix, categories]);

  useEffect(() => {
    if (!prefix) {
      setError('');
      return;
    }
    const upperPrefix = prefix.toUpperCase();
    const prefixExists = categories.some(
      (c) => c.prefix?.toUpperCase() === upperPrefix
    );
    if (prefixExists) {
      setError('อักษรย่อนี้มีอยู่แล้ว');
    } else {
      setError('');
    }
  }, [prefix, categories]);

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

    const newCategory: Omit<Category, 'id'> = {
      name: data['category-name'] as string,
      description: data.description as string | undefined,
      type: CategoryType.PRODUCT,
      prefix: data.prefix as string,
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
            disabled={!!error || !prefix}
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
          <Input name="category-name" id="category-name" type="text" required />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="อักษรย่อ" htmlFor="prefix">
            <Input
              name="prefix"
              id="prefix"
              type="text"
              value={prefix}
              onChange={(e) =>
                setPrefix(e.target.value.replace(/[^a-zA-Z]/g, ''))
              }
              maxLength={3}
              required
              placeholder="เช่น CH, MAT"
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </FormField>
          <FormField
            label="รหัสหมวดหมู่ (ตัวอย่าง)"
            htmlFor="category-id-preview"
          >
            <Input
              id="category-id-preview"
              type="text"
              value={generatedId}
              readOnly
              className="bg-slate-100"
            />
          </FormField>
        </div>

        <FormField label="รายละเอียด" htmlFor="description">
          <Textarea name="description" id="description" rows={3} />
        </FormField>
      </form>
    </Modal>
  );
};
