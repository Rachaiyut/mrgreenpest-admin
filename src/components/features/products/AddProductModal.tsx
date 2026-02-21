import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Textarea, Select } from '../../common/FormControls';

// Icon
import { PhotoIcon } from '../../../assets/icons/Icons';

// Enum
import { CategoryType } from '@/src/types/enums/category';

// Interface
import { Product } from '@/src/types/entity/product.interface';

// API
import { ProductApi } from '@/src/api/product';
import { Category } from '@/src/types/entity/category.interface';
import { Unit } from '@/src/types/entity/unit.interface';

export interface IAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  units: Unit[];
}

export const AddProductModal: React.FC<IAddProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
  units,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<CategoryType>(
    CategoryType.PRODUCT
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => category.type === selectedType);
  }, [categories, selectedType]);

  useEffect(() => {
    if (!isOpen) {
      setImagePreview(null);
      setSelectedType(CategoryType.PRODUCT);
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    setIsSubmitting(true);
    try {
      const newProduct: Partial<Product> = {
        barcode: (data.barcode as string) || '',
        name: data['product-name'] as string,
        category_id: data.categoryId as string,
        cost_price: Number(data.costPrice) || 0,
        fda_number: (data.fdaRegNo as string) || '',
        min_stock: Number(data['low-stock-threshold']) || 0,
        unit_id: data.unit as string,
      };

      await ProductApi.createProduct(newProduct);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create product:', error);
      alert('Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างสินค้า/บริการใหม่"
      size="3xl"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="add-product-form"
            disabled={isSubmitting}
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <span>บันทึก</span>
            )}
          </button>
        </div>
      }
    >
      <form id="add-product-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Image Upload */}
          <div className="md:col-span-1">
            <FormField label="รูปภาพ*">
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mx-auto h-32 w-32 object-cover rounded-md"
                    />
                  ) : (
                    <PhotoIcon className="mx-auto h-12 w-12 text-slate-400" />
                  )}
                  <div className="flex text-sm text-slate-600 justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none"
                    >
                      <span>อัปโหลดรูปภาพ</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/png, image/jpeg"
                        onChange={handleImageChange}
                        // required={!imagePreview}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">PNG, JPG</p>
                </div>
              </div>
            </FormField>
          </div>

          {/* Form Fields */}
          <div className="md:col-span-2 space-y-4">
            <FormField label="ประเภท">
              <div className="flex rounded-lg bg-slate-100 p-1 w-full">
                <label className="relative flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="productType"
                    value={CategoryType.PRODUCT}
                    className="sr-only peer"
                    checked={selectedType === CategoryType.PRODUCT}
                    onChange={() => setSelectedType(CategoryType.PRODUCT)}
                  />
                  <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">
                    สินค้า
                  </span>
                </label>
                <label className="relative flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="productType"
                    value={CategoryType.SERVICE}
                    className="sr-only peer"
                    checked={selectedType === CategoryType.SERVICE}
                    onChange={() => setSelectedType(CategoryType.SERVICE)}
                  />
                  <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">
                    บริการ
                  </span>
                </label>
              </div>
            </FormField>
            <div className="grid grid-cols-1">
              <FormField label="รหัสบาร์โค้ด" htmlFor="barcode">
                <Input
                  name="barcode"
                  id="barcode"
                  type="text"
                  disabled={selectedType === CategoryType.SERVICE}
                />
              </FormField>
            </div>
          </div>
        </div>
        <FormField label="ชื่อสินค้า/บริการ" htmlFor="product-name">
          <Input name="product-name" id="product-name" type="text" required />
        </FormField>
        <FormField label="หมวดหมู่" htmlFor="categoryId">
          <Select name="categoryId" id="categoryId" required>
            <option value="">-- เลือกหมวดหมู่ --</option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="รายละเอียด" htmlFor="description">
          <Textarea name="description" id="description" rows={3} />
        </FormField>

        {selectedType === CategoryType.PRODUCT && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="หน่วย" htmlFor="unit">
                <Select name="unit" id="unit" required>
                  <option value="">-- เลือกหน่วย --</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="ราคาขาย/หน่วย" htmlFor="price">
                <Input
                  name="price"
                  id="price"
                  type="number"
                  required
                  placeholder="0.00"
                  step="0.01"
                  defaultValue="0.00"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ราคาต้นทุน" htmlFor="cost-price">
                <Input
                  name="costPrice"
                  id="cost-price"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  defaultValue="0.00"
                />
              </FormField>

              <FormField
                label="กำหนดสต็อกขั้นต่ำ"
                htmlFor="low-stock-threshold"
              >
                <Input
                  name="low-stock-threshold"
                  id="low-stock-threshold"
                  type="number"
                  placeholder="เช่น 10"
                  required
                />
              </FormField>
            </div>

            <div className="border-t pt-4 space-y-4">
              <FormField label="เลขทะเบียน อย." htmlFor="fda-reg-no">
                <Input name="fdaRegNo" id="fda-reg-no" type="text" />
              </FormField>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
