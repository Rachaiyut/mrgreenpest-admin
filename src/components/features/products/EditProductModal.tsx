import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import {
  FormField,
  Input,
  Textarea,
  Select,
  Button,
} from '../../common/FormControls';
import { Product, Category } from '@/src/libs/common/interface/entity/app.interface';
import { CategoryType } from '@/src/libs/common/enum/category.enum';
import { PhotoIcon } from '../../../assets/icons/Icons';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onUpdateProduct: (product: Product) => void;
  categories: Category[];
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onUpdateProduct,
  categories,
}) => {
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const availableCategories = useMemo(() => {
    const targetType =
      formData.type === 'สินค้า' ? CategoryType.PRODUCT : CategoryType.SERVICE;
    return categories.filter((c) => c.type === targetType);
  }, [categories, formData.type]);

  useEffect(() => {
    if (product) {
      setFormData(product);
      setImagePreview(null); // Reset preview, can be enhanced to show existing image
    }
  }, [product]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (type: 'สินค้า' | 'บริการ') => {
    setFormData((prev) => ({ ...prev, type: type, categoryId: '' })); // Reset category when type changes
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (product) {
      onUpdateProduct({ ...product, ...formData } as Product);
    }
    onClose();
  };

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขสินค้า/บริการ: ${product.name}`}
      size="3xl"
      footer={
        <div className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
          >
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="edit-product-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
          >
            บันทึกการเปลี่ยนแปลง
          </Button>
        </div>
      }
    >
      <form
        id="edit-product-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <FormField label="รูปภาพ">
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
                      htmlFor="file-upload-edit"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none"
                    >
                      <span>เปลี่ยนรูปภาพ</span>
                      <input
                        id="file-upload-edit"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">PNG, JPG, GIF</p>
                </div>
              </div>
            </FormField>
          </div>

          <div className="md:col-span-2 space-y-4">
            <FormField label="ประเภท">
              <div className="flex rounded-lg bg-slate-100 p-1 w-full">
                <label className="relative flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="productTypeRadioEdit"
                    value="สินค้า"
                    className="sr-only peer"
                    checked={formData.type === 'สินค้า'}
                    onChange={() => handleTypeChange('สินค้า')}
                  />
                  <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">
                    สินค้า
                  </span>
                </label>
                <label className="relative flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="productTypeRadioEdit"
                    value="บริการ"
                    className="sr-only peer"
                    checked={formData.type === 'บริการ'}
                    onChange={() => handleTypeChange('บริการ')}
                  />
                  <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">
                    บริการ
                  </span>
                </label>
              </div>
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="รหัสสินค้า/บริการ" htmlFor="id">
                <Input
                  name="id"
                  type="text"
                  value={formData.id || ''}
                  readOnly
                  className="bg-slate-100"
                />
              </FormField>
              <FormField label="รหัสบาร์โค้ด" htmlFor="barcode">
                <Input
                  name="barcode"
                  type="text"
                  value={formData.barcode || ''}
                  onChange={handleChange}
                  disabled={formData.type === 'บริการ'}
                />
              </FormField>
            </div>
            <FormField label="ชื่อสินค้า/บริการ" htmlFor="name">
              <Input
                name="name"
                type="text"
                value={formData.name || ''}
                onChange={handleChange}
                required
              />
            </FormField>
          </div>
        </div>
        <FormField label="หมวดหมู่" htmlFor="categoryId">
          <Select
            name="categoryId"
            id="categoryId"
            value={formData.categoryId || ''}
            onChange={handleChange}
            required
          >
            <option value="">-- เลือกหมวดหมู่ --</option>
            {availableCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="รายละเอียด" htmlFor="description">
          <Textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={3}
          />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="หน่วย" htmlFor="unit">
            <Input
              name="unit"
              type="text"
              value={formData.unit || ''}
              onChange={handleChange}
              required
            />
          </FormField>
          <FormField label="ราคา/หน่วย" htmlFor="price">
            <Input
              name="price"
              type="number"
              value={formData.price ?? ''}
              onChange={handleChange}
              required
              step="0.01"
              placeholder="0.00"
            />
          </FormField>
        </div>
        {formData.type === 'สินค้า' && (
          <>
            <FormField label="กำหนดสต็อกขั้นต่ำ" htmlFor="lowStockThreshold">
              <Input
                name="lowStockThreshold"
                type="number"
                value={formData.lowStockThreshold || ''}
                onChange={handleChange}
                required
              />
            </FormField>
            <FormField label="เลขทะเบียน อย." htmlFor="fdaRegNo">
              <Input
                name="fdaRegNo"
                id="fdaRegNo"
                type="text"
                value={formData.fdaRegNo || ''}
                onChange={handleChange}
              />
            </FormField>
          </>
        )}
      </form>
    </Modal>
  );
};
