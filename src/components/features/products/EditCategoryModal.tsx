import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Textarea } from '../../common/FormControls';
import { Category } from '../../../types';

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  onUpdateCategory: (category: Category) => void;
  categories: Category[];
}

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  onUpdateCategory,
  categories,
}) => {
  const [formData, setFormData] = useState<Partial<Category>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setFormData(category);
      setError('');
    }
  }, [category]);

  useEffect(() => {
    if (!formData.prefix || !category) {
      setError('');
      return;
    }
    const upperPrefix = formData.prefix.toUpperCase();
    const prefixExists = categories.some(
      (c) => c.id !== category.id && c.prefix?.toUpperCase() === upperPrefix
    );

    if (prefixExists) {
      setError('อักษรย่อนี้มีอยู่แล้ว');
    } else {
      setError('');
    }
  }, [formData.prefix, category, categories]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'prefix') {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/[^a-zA-Z]/g, ''),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (error) {
      alert(error);
      return;
    }
    if (category) {
      onUpdateCategory({ ...category, ...formData } as Category);
    }
    onClose();
  };

  if (!category) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขหมวดหมู่: ${category.name}`}
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
            form="edit-category-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
            disabled={!!error || !formData.prefix}
            title={error || ''}
          >
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>
      }
    >
      <form
        id="edit-category-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <FormField label="ชื่อหมวดหมู่" htmlFor="name">
          <Input
            name="name"
            id="name"
            type="text"
            value={formData.name || ''}
            onChange={handleChange}
            required
          />
        </FormField>

        <FormField label="อักษรย่อ" htmlFor="prefix">
          <Input
            name="prefix"
            id="prefix"
            type="text"
            value={formData.prefix || ''}
            onChange={handleChange}
            maxLength={3}
            required
          />
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </FormField>

        <FormField label="รายละเอียด" htmlFor="description">
          <Textarea
            name="description"
            id="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={3}
          />
        </FormField>
      </form>
    </Modal>
  );
};
