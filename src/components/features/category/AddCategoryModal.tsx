import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Textarea } from '../../common/FormControls';
import { DropdownSelect } from '../../common';
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [typeValue, setTypeValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      formRef.current?.reset();
      setErrors({});
      setTypeValue('');
    }
  }, [isOpen]);

  const validate = (data: Record<string, FormDataEntryValue>): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!data['name'] || !(data['name'] as string).trim()) errs.name = 'กรุณาระบุชื่อหมวดหมู่';
    if (!data['code'] || !(data['code'] as string).trim()) errs.code = 'กรุณาระบุอักษรย่อหมวดหมู่';
    if (!typeValue.trim()) errs.type = 'กรุณาเลือกประเภทหมวดหมู่';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const validationErrors = validate(data);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const newCategory: Partial<Category> = {
      code: data['code'] as string,
      name: data['name'] as string,
      description: data['description'] as string | undefined,
      type: typeValue as CategoryType,
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
            title=""
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
        <FormField label="ชื่อหมวดหมู่ *" htmlFor="category-name">
          <Input
            name="name"
            id="category-name"
            type="text"
            className={errors.name ? 'border-red-500' : ''}
            onChange={() => setErrors(prev => { const { name, ...rest } = prev; return rest; })}
          />
          {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="อักษรย่อหมวดหมู่ *" htmlFor="code">
            <Input
              name="code"
              id="code"
              type="text"
              maxLength={3}
              placeholder="เช่น CH, MAT"
              className={errors.code ? 'border-red-500' : ''}
              onChange={() => setErrors(prev => { const { code, ...rest } = prev; return rest; })}
            />
            {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code}</p>}
          </FormField>
          <FormField label="ประเภทหมวดหมู่ *" htmlFor="type">
            <DropdownSelect
              value={typeValue}
              onChange={(v) => { setTypeValue(v); setErrors(prev => { const { type, ...rest } = prev; return rest; }); }}
              placeholder="-- เลือกประเภท --"
              options={[
                { value: CategoryType.PRODUCT, label: 'สินค้า' },
                { value: CategoryType.SERVICE, label: 'บริการ' },
              ]}
              error={!!errors.type}
            />
            {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type}</p>}
          </FormField>
        </div>

        <FormField label="รายละเอียด" htmlFor="description">
          <Textarea name="description" id="description" rows={3} />
        </FormField>
      </form>
    </Modal>
  );
};
