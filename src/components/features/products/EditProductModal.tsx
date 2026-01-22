import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Select, Button } from '../../common/FormControls';
import { Product } from '@/src/types/entity/product.interface';
import { Category } from '@/src/types/entity/category.interface';
import { Unit } from '@/src/types/entity/unit.interface';
import { PhotoIcon } from '../../../assets/icons/Icons';
import { CategoryType } from '@/src/types/enums/category';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onUpdateProduct: (product: Product) => void;
  categories: Category[];
  units: Unit[];
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onUpdateProduct,
  categories,
  units,
}) => {
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData(product);
      setImagePreview(null);
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

  const handleTypeChange = (type: CategoryType) => {
    setFormData((prev) => ({ ...prev, type: type, category_id: '' }));
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
        {product.category.type === CategoryType.PRODUCT && (
          <>
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
                <div className="grid grid-cols-1 gap-4">
                  <FormField label="รหัสบาร์โค้ด" htmlFor="barcode">
                    <Input
                      name="barcode"
                      type="text"
                      value={formData.barcode || ''}
                      onChange={handleChange}
                    />
                  </FormField>
                </div>
              </div>
            </div>
            <FormField label="ชื่อสินค้า" htmlFor="name">
              <Input
                name="name"
                type="text"
                value={formData.name || ''}
                onChange={handleChange}
                required
              />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="หมวดหมู่" htmlFor="categoryId">
                <Select
                  name="category_id"
                  id="categoryId"
                  value={formData.category_id || ''}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- เลือกหมวดหมู่ --</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="ราคา/หน่วย" htmlFor="price">
                <Input
                  name="price"
                  type="number"
                  value={formData.cost_price ?? ''}
                  onChange={handleChange}
                  required
                  step="0.01"
                  placeholder="0.00"
                />
              </FormField>
            </div>
          </>
        )}

        {product.category.type === CategoryType.SERVICE && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ราคาต้นทุน" htmlFor="cost-price">
                <Input
                  name="cost_price"
                  id="cost-price"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={formData.cost_price || ''}
                  onChange={handleChange}
                />
              </FormField>

              <FormField label="กำหนดสต็อกขั้นต่ำ" htmlFor="lowStockThreshold">
                <Input
                  name="min_stock"
                  type="number"
                  value={formData.min_stock || ''}
                  onChange={handleChange}
                  required
                />
              </FormField>
            </div>
            <FormField label="เลขทะเบียน อย." htmlFor="fdaRegNo">
              <Input
                name="fda_number"
                id="fdaRegNo"
                type="text"
                value={formData.fda_number || ''}
                onChange={handleChange}
              />
            </FormField>
          </>
        )}
      </form>
    </Modal>
  );
};

