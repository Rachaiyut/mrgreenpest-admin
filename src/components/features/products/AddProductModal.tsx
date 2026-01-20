import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Textarea, Select } from '../../common/FormControls';
import { PhotoIcon } from '../../../assets/icons/Icons';
import { Product, Category } from '@/src/libs/common/interface/entity/app.interface';
import { CategoryType } from '@/src/libs/common/enum/category.enum';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProduct: (product: Omit<Product, 'id'>) => void;
  products: Product[];
  categories: Category[];
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onCreateProduct,
  products,
  categories,
}) => {
  const [productType, setProductType] = useState<'สินค้า' | 'บริการ'>('สินค้า');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const availableCategories = useMemo(() => {
    const targetType =
      productType === 'สินค้า' ? CategoryType.PRODUCT : CategoryType.SERVICE;
    return categories.filter((c) => c.type === targetType);
  }, [categories, productType]);

  const generatedId = useMemo(() => {
    if (!isOpen) return '';
    const prefix = productType === 'สินค้า' ? 'PROD-' : 'SERV-';
    const relevantProducts = products.filter((p) => p.id.startsWith(prefix));
    const maxId = relevantProducts.reduce((max, p) => {
      const num = parseInt(p.id.split('-')[1], 10);
      return num > max ? num : max;
    }, 0);
    const newIdNumber = maxId + 1;
    return `${prefix}${String(newIdNumber).padStart(3, '0')}`;
  }, [isOpen, productType, products]);

  useEffect(() => {
    if (!isOpen) {
      setProductType('สินค้า');
      setImagePreview(null);
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const newProduct: Omit<Product, 'id'> = {
      barcode: data.barcode as string | undefined,
      name: data['product-name'] as string,
      type: productType,
      categoryId: data.categoryId as string,
      unit: productType === 'สินค้า' ? (data.unit as string) : 'แพ็กเกจ',
      price: parseFloat(data.price as string),
      costPrice:
        productType === 'สินค้า' && data.costPrice
          ? parseFloat(data.costPrice as string)
          : undefined,
      fdaRegNo:
        productType === 'สินค้า'
          ? (data.fdaRegNo as string | undefined)
          : undefined,
      stock: productType === 'สินค้า' ? 0 : 9999, // default value
      lowStockThreshold:
        productType === 'สินค้า'
          ? parseInt(data['low-stock-threshold'] as string, 10)
          : 0,
      warehouse: productType === 'สินค้า' ? 'คลังหลัก' : 'N/A', // default value
      createdBy: 'ผู้ดูแลระบบ', // Mock user
      updatedBy: 'ผู้ดูแลระบบ', // Mock user
    };

    onCreateProduct(newProduct);
    onClose();
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
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="add-product-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
          >
            บันทึก
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
                        required={!imagePreview}
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
                    value="สินค้า"
                    className="sr-only peer"
                    checked={productType === 'สินค้า'}
                    onChange={() => setProductType('สินค้า')}
                  />
                  <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">
                    สินค้า
                  </span>
                </label>
                <label className="relative flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="productType"
                    value="บริการ"
                    className="sr-only peer"
                    checked={productType === 'บริการ'}
                    onChange={() => setProductType('บริการ')}
                  />
                  <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">
                    บริการ
                  </span>
                </label>
              </div>
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="รหัสสินค้า/บริการ" htmlFor="product-id">
                <Input
                  id="product-id"
                  type="text"
                  value={generatedId}
                  readOnly
                  className="bg-slate-100"
                />
              </FormField>
              <FormField label="รหัสบาร์โค้ด" htmlFor="barcode">
                <Input
                  name="barcode"
                  id="barcode"
                  type="text"
                  disabled={productType === 'บริการ'}
                />
              </FormField>
            </div>
            <FormField label="ชื่อสินค้า/บริการ" htmlFor="product-name">
              <Input
                name="product-name"
                id="product-name"
                type="text"
                required
              />
            </FormField>
          </div>
        </div>
        <FormField label="หมวดหมู่" htmlFor="categoryId">
          <Select name="categoryId" id="categoryId" required>
            <option value="">-- เลือกหมวดหมู่ --</option>
            {availableCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="รายละเอียด" htmlFor="description">
          <Textarea name="description" id="description" rows={3} />
        </FormField>

        {productType === 'สินค้า' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="หน่วย" htmlFor="unit">
                <Input
                  name="unit"
                  id="unit"
                  type="text"
                  required
                  placeholder="เช่น ขวด, ชิ้น"
                />
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
        ) : (
          <FormField label="ราคาบริการ" htmlFor="price">
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
        )}
      </form>
    </Modal>
  );
};
