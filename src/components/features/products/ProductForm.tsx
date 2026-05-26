import React, { useState, useEffect, useMemo } from 'react';
import Swal from '@/src/utils/swal';
import { FormField, Input, Textarea } from '../../common/FormControls';
import { DropdownSelect } from '../../common';
import { PhotoIcon } from '../../../assets/icons/Icons';
import { CategoryType } from '@/src/types/enums/category';
import { Product } from '@/src/types/entity/product.interface';
import { Category } from '@/src/types/entity/category.interface';
import { Unit } from '@/src/types/entity/unit.interface';
import { StorageApi } from '@/src/api/storage';

interface ProductFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<Product> | null;
  categories: Category[];
  units: Unit[];
  onSubmit: (data: any, type: CategoryType, imageFile?: File | null) => void | Promise<void>;
  onCancel?: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({
  mode,
  initialValues,
  categories,
  units,
  onSubmit,
  onCancel,
}) => {
  const initialType = initialValues?.category?.type || CategoryType.PRODUCT;

  const [selectedType, setSelectedType] = useState<CategoryType>(initialType);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialValues) {
      setFormData({
        code: initialValues.code || '',
        barcode: initialValues.barcode || '',
        name: initialValues.name || '',
        category_id: initialValues.category_id || '',
        unit_id: initialValues.unit_id || '',
        price: initialValues.price ?? '',
        cost_price: initialValues.cost_price ?? '',
        min_stock: initialValues.min_stock ?? '',
        fda_number: initialValues.fda_number || '',
        remark: (initialValues as unknown as Record<string, string>)?.remark || '',
      });
      setSelectedType(initialValues.category?.type || CategoryType.PRODUCT);
      if ((initialValues as unknown as Record<string, string>).image_url) {
        setImagePreview((initialValues as unknown as Record<string, string>).image_url);
      }
    } else {
      setFormData({});
      setSelectedType(CategoryType.PRODUCT);
    }
    setImageFile(null);
    setFormErrors({});
    if (!initialValues || !(initialValues as unknown as Record<string, string>).image_url) setImagePreview(null);
  }, [initialValues]);

  const isProduct = selectedType === CategoryType.PRODUCT;

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === selectedType);
  }, [categories, selectedType]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const nonNegativeFields = ['price', 'cost_price', 'min_stock'];
    if (nonNegativeFields.includes(name) && value !== '' && Number(value) < 0) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
  };

  const handleNumberFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value === '0' || value === '0.00') {
      setFormData((prev) => ({ ...prev, [name]: '' }));
    } else {
      e.target.select();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = isProduct ? 'กรุณากรอกชื่อสินค้า' : 'กรุณากรอกชื่อบริการ';
    if (!formData.category_id) errors.category_id = 'กรุณาเลือกหมวดหมู่';
    if (isProduct) {
      if (!formData.unit_id) errors.unit_id = 'กรุณาเลือกหน่วย';
      if (!Number(formData.price) || Number(formData.price) <= 0) errors.price = 'กรุณากรอกราคาขาย/หน่วย';
    } else {
      if (!Number(formData.price) || Number(formData.price) <= 0) errors.price = 'กรุณากรอกราคาบริการ';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setTimeout(() => document.querySelector('.text-red-500.text-xs')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      return;
    }
    setFormErrors({});

    if (isProduct) {
      onSubmit({
        barcode: formData.barcode || '',
        name: formData.name,
        category_id: formData.category_id,
        price: Number(formData.price) || 0,
        cost_price: Number(formData.cost_price) || 0,
        fda_number: formData.fda_number || '',
        min_stock: Number(formData.min_stock) || 0,
        unit_id: formData.unit_id,
        remark: formData.remark || '',
      }, CategoryType.PRODUCT, imageFile);
    } else {
      onSubmit({
        name: formData.name,
        category_id: formData.category_id,
        price: Number(formData.price) || 0,
        remark: formData.remark || '',
      }, CategoryType.SERVICE, imageFile);
    }
  };

  return (
    <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Image — ใช้ pattern เดียวกับ UserForm: full-frame + hover overlay เพื่อเปลี่ยน */}
        <div className="md:col-span-1 flex flex-col items-center">
          <label className="block text-sm font-medium text-slate-700 mb-2 w-full text-left">
            รูปภาพ
          </label>
          <div className="w-full aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden group transition-colors hover:border-primary cursor-pointer">
            <input
              id={`file-upload-${mode}`}
              name="file-upload"
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              accept="image/png, image/jpeg"
              onChange={handleImageChange}
            />
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <div className="p-4 bg-white rounded-full shadow-sm mb-2">
                  <PhotoIcon className="h-8 w-8 text-slate-300" />
                </div>
                <span className="text-sm font-medium text-slate-500">อัปโหลดรูปภาพ</span>
                <span className="text-xs text-slate-400 mt-1">PNG, JPG</span>
              </div>
            )}
            {imagePreview && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                  เปลี่ยนรูปภาพ
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Type + Code/Barcode */}
        <div className="space-y-4 md:col-span-2">
          <FormField label="ประเภท">
            <div className={`flex rounded-lg bg-slate-100 p-1 w-full ${mode === 'edit' ? 'opacity-60' : ''}`}>
              <label className={`relative flex-1 ${mode === 'edit' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input type="radio" className="sr-only peer" checked={selectedType === CategoryType.PRODUCT} disabled={mode === 'edit'} onChange={() => { setSelectedType(CategoryType.PRODUCT); setFormData((prev) => ({ ...prev, category_id: '' })); }} />
                <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">สินค้า</span>
              </label>
              <label className={`relative flex-1 ${mode === 'edit' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input type="radio" className="sr-only peer" checked={selectedType === CategoryType.SERVICE} disabled={mode === 'edit'} onChange={() => { setSelectedType(CategoryType.SERVICE); setFormData((prev) => ({ ...prev, category_id: '' })); }} />
                <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">บริการ</span>
              </label>
            </div>
          </FormField>

          {mode === 'edit' && (
            <FormField label={isProduct ? 'รหัสสินค้า' : 'รหัสบริการ'} htmlFor="code">
              <Input name="code" type="text" value={formData.code || ''} disabled className="font-mono" />
            </FormField>
          )}

          {isProduct && (
            <FormField label="รหัสบาร์โค้ด" htmlFor="barcode">
              <Input name="barcode" type="text" value={formData.barcode || ''} onChange={handleChange} />
            </FormField>
          )}
        </div>
      </div>

      {isProduct ? (
        <>
          <FormField label="ชื่อสินค้า/บริการ *" htmlFor="name">
            <Input name="name" type="text" value={formData.name || ''} onChange={handleChange} />
            {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
          </FormField>

          <FormField label="หมวดหมู่ *" htmlFor="category_id">
            <DropdownSelect
              value={formData.category_id || ''}
              onChange={(v) => { handleChange({ target: { name: 'category_id', value: v } } as React.ChangeEvent<HTMLSelectElement>); if (formErrors.category_id) setFormErrors((prev) => { const next = { ...prev }; delete next.category_id; return next; }); }}
              placeholder="-- เลือกหมวดหมู่ --"
              options={filteredCategories.map((cat) => ({ value: cat.id, label: cat.name }))}
            />
            {formErrors.category_id && <p className="text-red-500 text-xs mt-1">{formErrors.category_id}</p>}
          </FormField>

          <FormField label="รายละเอียด" htmlFor="remark">
            <Textarea name="remark" value={formData.remark || ''} onChange={handleChange} rows={3} />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="หน่วย *" htmlFor="unit_id">
              <DropdownSelect
                value={formData.unit_id || ''}
                onChange={(v) => { handleChange({ target: { name: 'unit_id', value: v } } as React.ChangeEvent<HTMLSelectElement>); if (formErrors.unit_id) setFormErrors((prev) => { const next = { ...prev }; delete next.unit_id; return next; }); }}
                placeholder="-- เลือกหน่วย --"
                options={units.map((u) => ({ value: u.id, label: u.name }))}
              />
              {formErrors.unit_id && <p className="text-red-500 text-xs mt-1">{formErrors.unit_id}</p>}
            </FormField>
            <FormField label="ราคาขาย/หน่วย *" htmlFor="price">
              <Input name="price" type="number" value={formData.price ?? ''} onChange={handleChange} onFocus={handleNumberFocus} step="0.01" min="0" placeholder="0.00" />
              {formErrors.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="ราคาต้นทุน" htmlFor="cost_price">
              <Input name="cost_price" type="number" value={formData.cost_price ?? ''} onChange={handleChange} onFocus={handleNumberFocus} step="0.01" min="0" placeholder="0.00" />
            </FormField>
            <FormField label="กำหนดสต็อกขั้นต่ำ" htmlFor="min_stock">
              <Input name="min_stock" type="number" value={formData.min_stock ?? ''} onChange={handleChange} onFocus={handleNumberFocus} min="0" placeholder="เช่น 10" />
            </FormField>
          </div>
          <div className="border-t pt-4 space-y-4">
            <FormField label="เลขทะเบียน อย." htmlFor="fda_number">
              <Input name="fda_number" type="text" value={formData.fda_number || ''} onChange={handleChange} />
            </FormField>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="ชื่อบริการ *" htmlFor="name">
              <Input name="name" type="text" value={formData.name || ''} onChange={handleChange} />
              {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
            </FormField>
            <FormField label="หมวดหมู่ *" htmlFor="category_id">
              <DropdownSelect
                value={formData.category_id || ''}
                onChange={(v) => { handleChange({ target: { name: 'category_id', value: v } } as React.ChangeEvent<HTMLSelectElement>); if (formErrors.category_id) setFormErrors((prev) => { const next = { ...prev }; delete next.category_id; return next; }); }}
                placeholder="-- เลือกหมวดหมู่ --"
                options={filteredCategories.map((cat) => ({ value: cat.id, label: cat.name }))}
              />
              {formErrors.category_id && <p className="text-red-500 text-xs mt-1">{formErrors.category_id}</p>}
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="ราคาบริการ *" htmlFor="price">
              <Input name="price" type="number" value={formData.price ?? ''} onChange={handleChange} onFocus={handleNumberFocus} step="0.01" min="0" placeholder="0.00" />
              {formErrors.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
            </FormField>
            <FormField label="รายละเอียด" htmlFor="remark">
              <Input name="remark" type="text" value={formData.remark || ''} onChange={handleChange} placeholder="รายละเอียดเพิ่มเติม" />
            </FormField>
          </div>
        </>
      )}

    </form>
  );
};

export default ProductForm;
