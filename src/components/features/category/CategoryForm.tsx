import React, { useState, useEffect } from 'react';
import { FormField, Input, Select, Textarea } from '../../common/FormControls';
import { Category } from '@/src/types/entity/app.interface';
import { CategoryType } from '@/src/types/enums/category';

interface CategoryFormProps {
  mode: 'create' | 'edit';
  initialValues?: Category | null;
  onSubmit: (data: Partial<Category>) => void | Promise<void>;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  mode,
  initialValues,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<Partial<Category>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialValues) {
      setFormData(initialValues);
    } else {
      setFormData({});
    }
    setErrors({});
  }, [initialValues]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => { const { [name]: _, ...rest } = prev; return rest; });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!formData.name?.trim()) errs.name = 'กรุณาระบุชื่อหมวดหมู่';
    if (mode === 'create' && !formData.code?.trim()) errs.code = 'กรุณาระบุอักษรย่อหมวดหมู่';
    if (!formData.type) errs.type = 'กรุณาเลือกประเภทหมวดหมู่';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit(formData);
  };

  return (
    <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
      <FormField label="ชื่อหมวดหมู่ *" htmlFor="name">
        <Input
          name="name"
          type="text"
          value={formData.name || ''}
          onChange={handleChange}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="อักษรย่อหมวดหมู่ *" htmlFor="code">
          <Input
            name="code"
            type="text"
            value={formData.code || ''}
            onChange={handleChange}
            maxLength={3}
            placeholder="เช่น CH, MAT"
            disabled={mode === 'edit'}
            className={`${mode === 'edit' ? 'bg-slate-50' : ''} ${errors.code ? 'border-red-500' : ''}`}
          />
          {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code}</p>}
        </FormField>
        <FormField label="ประเภทหมวดหมู่ *" htmlFor="type">
          <Select
            name="type"
            value={formData.type || ''}
            onChange={handleChange}
            disabled={mode === 'edit' && !!((initialValues as any)?.product_count > 0)}
            className={errors.type ? 'border-red-500' : ''}
          >
            <option value="" disabled>-- เลือกประเภท --</option>
            <option value={CategoryType.PRODUCT}>สินค้า</option>
            <option value={CategoryType.SERVICE}>บริการ</option>
          </Select>
          {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type}</p>}
        </FormField>
      </div>

      <FormField label="รายละเอียด" htmlFor="description">
        <Textarea
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          rows={3}
        />
      </FormField>
    </form>
  );
};
