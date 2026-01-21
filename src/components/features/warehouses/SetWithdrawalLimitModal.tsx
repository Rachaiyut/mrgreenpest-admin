import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Input } from '../../common/FormControls';
import { Warehouse, Product } from '@/src/types/entity/app.interface';

interface SetWithdrawalLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: Warehouse | null;
  onSave: (
    warehouseId: string,
    limits: { [productId: string]: number }
  ) => void;
  products: Product[];
}

export const SetWithdrawalLimitModal: React.FC<
  SetWithdrawalLimitModalProps
> = ({ isOpen, onClose, warehouse, onSave, products }) => {
  const [limits, setLimits] = useState<{ [productId: string]: number | '' }>(
    {}
  );
  const [errors, setErrors] = useState<{ [productId: string]: string }>({});

  const availableProducts = useMemo(() => {
    // Show all canonical products of type 'สินค้า' from the main warehouse.
    // This allows setting a withdrawal limit for any product, even if it's not currently in the vehicle's inventory.
    // This is more robust and correctly filters for products from the main warehouse only.
    return products.filter(
      (p) => p.type === 'สินค้า' && p.warehouse === 'คลังหลัก'
    );
  }, [products]);

  useEffect(() => {
    if (warehouse) {
      const initialLimits: { [productId: string]: number | '' } = {};
      availableProducts.forEach((p) => {
        initialLimits[p.id] = warehouse.withdrawalLimits?.[p.id] ?? '';
      });
      setLimits(initialLimits);
      setErrors({}); // Reset errors on open
    }
  }, [isOpen, warehouse, availableProducts]);

  if (!isOpen || !warehouse) return null;

  const handleLimitChange = (product: Product, value: string) => {
    const numValue = Number(value);

    setLimits((prev) => ({
      ...prev,
      [product.id]: value === '' ? '' : numValue,
    }));

    if (value !== '' && (isNaN(numValue) || numValue < 0)) {
      setErrors((prev) => ({
        ...prev,
        [product.id]: 'กรุณาระบุตัวเลขที่ถูกต้อง',
      }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[product.id];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) {
      alert('กรุณาแก้ไขข้อมูลให้ถูกต้อง');
      return;
    }
    const finalLimits: { [productId: string]: number } = {};
    for (const productId in limits) {
      const limit = limits[productId];
      if (typeof limit === 'number' && limit >= 0) {
        finalLimits[productId] = limit;
      }
    }
    onSave(warehouse.id, finalLimits);
    onClose();
  };

  const isSaveDisabled = Object.keys(errors).length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`จำกัดการเบิกสินค้าสำหรับ: ${warehouse.name}`}
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
            form="limit-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
            disabled={isSaveDisabled}
            title={isSaveDisabled ? 'กรุณาแก้ไขข้อมูลที่ไม่ถูกต้อง' : ''}
          >
            บันทึก
          </button>
        </div>
      }
    >
      <form id="limit-form" onSubmit={handleSubmit}>
        <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[60vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  สินค้า
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                  คงคลัง (คลังหลัก)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  จำกัดการเบิก (หน่วย)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {availableProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                    {product.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 text-center">
                    {product.stock}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <Input
                        type="number"
                        min="0"
                        value={limits[product.id] ?? ''}
                        onChange={(e) =>
                          handleLimitChange(product, e.target.value)
                        }
                        placeholder="ไม่จำกัด"
                        className={`w-32 h-9 ${errors[product.id] ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                      {errors[product.id] && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors[product.id]}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {availableProducts.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              ไม่พบสินค้าในระบบ
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
