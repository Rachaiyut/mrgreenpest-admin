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
    setFormData((prev) => ({ ...prev, [name]: value }));
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

    if (isProduct) {
      const price = Number(formData.price);
      if (!price || price <= 0) {
        Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาระบุราคาขาย/หน่วย' });
        return;
      }
    }

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
        {/* Image */}
        <div className="md:col-span-1">
          <FormField label="รูปภาพ">
            <div className="mt-1 flex justify-center border-2 border-slate-300 border-dashed rounded-md px-6 pt-5 pb-6">
              <div className="text-center space-y-1">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="object-cover rounded-md mx-auto h-32 w-32" />
                ) : (
                  <PhotoIcon className="text-slate-400 mx-auto h-12 w-12" />
                )}
                <div>
                  <label
                    htmlFor={`file-upload-${mode}`}
                    className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none text-sm"
                  >
                    <span>{imagePreview ? 'เปลี่ยนรูป' : 'อัปโหลดรูปภาพ'}</span>
                    <input
                      id={`file-upload-${mode}`}
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept="image/png, image/jpeg"
                      onChange={handleImageChange}
                    />
                  </label>
                  <p className="text-xs text-slate-500">PNG, JPG</p>
                </div>
              </div>
            </div>
          </FormField>
        </div>

        {/* Type + Code/Barcode */}
        <div className="space-y-4 md:col-span-2">
          <FormField label="ประเภท">
            <div className="flex rounded-lg bg-slate-100 p-1 w-full">
              <label className="relative flex-1 cursor-pointer">
                <input type="radio" className="sr-only peer" checked={selectedType === CategoryType.PRODUCT} onChange={() => { setSelectedType(CategoryType.PRODUCT); setFormData((prev) => ({ ...prev, category_id: '' })); }} />
                <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">สินค้า</span>
              </label>
              <label className="relative flex-1 cursor-pointer">
                <input type="radio" className="sr-only peer" checked={selectedType === CategoryType.SERVICE} onChange={() => { setSelectedType(CategoryType.SERVICE); setFormData((prev) => ({ ...prev, category_id: '' })); }} />
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
            <Input name="name" type="text" value={formData.name || ''} onChange={handleChange} required />
          </FormField>

          <FormField label="หมวดหมู่ *" htmlFor="category_id">
            <DropdownSelect
              value={formData.category_id || ''}
              onChange={(v) => handleChange({ target: { name: 'category_id', value: v } } as React.ChangeEvent<HTMLSelectElement>)}
              placeholder="-- เลือกหมวดหมู่ --"
              options={filteredCategories.map((cat) => ({ value: cat.id, label: cat.name }))}
              disabled={mode === 'edit'}
              className={mode === 'edit' ? 'bg-slate-50' : ''}
            />
          </FormField>

          <FormField label="รายละเอียด" htmlFor="remark">
            <Textarea name="remark" value={formData.remark || ''} onChange={handleChange} rows={3} />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="หน่วย *" htmlFor="unit_id">
              <DropdownSelect
                value={formData.unit_id || ''}
                onChange={(v) => handleChange({ target: { name: 'unit_id', value: v } } as React.ChangeEvent<HTMLSelectElement>)}
                placeholder="-- เลือกหน่วย --"
                options={units.map((u) => ({ value: u.id, label: u.name }))}
              />
            </FormField>
            <FormField label="ราคาขาย/หน่วย *" htmlFor="price">
              <Input name="price" type="number" value={formData.price ?? ''} onChange={handleChange} onFocus={handleNumberFocus} required step="0.01" min="0" placeholder="0.00" />
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
              <Input name="name" type="text" value={formData.name || ''} onChange={handleChange} required />
            </FormField>
            <FormField label="หมวดหมู่ *" htmlFor="category_id">
              <DropdownSelect
                value={formData.category_id || ''}
                onChange={(v) => handleChange({ target: { name: 'category_id', value: v } } as React.ChangeEvent<HTMLSelectElement>)}
                placeholder="-- เลือกหมวดหมู่ --"
                options={filteredCategories.map((cat) => ({ value: cat.id, label: cat.name }))}
                disabled={mode === 'edit'}
                className={mode === 'edit' ? 'bg-slate-50' : ''}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="ราคาบริการ *" htmlFor="price">
              <Input name="price" type="number" value={formData.price ?? ''} onChange={handleChange} onFocus={handleNumberFocus} required step="0.01" min="0" placeholder="0.00" />
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
