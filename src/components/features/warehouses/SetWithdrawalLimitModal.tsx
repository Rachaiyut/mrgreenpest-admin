import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
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
    // Return all products for now, or filter by category if available
    return products;
  }, [products]);

  useEffect(() => {
    if (warehouse) {
      const initialLimits: { [productId: string]: number | '' } = {};
      availableProducts.forEach((p) => {
        // Warehouse withdrawal limits not available in current entity, default to empty
        initialLimits[p.id] = ''; 
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
            type="button"
            onClick={handleSubmit}
            disabled={isSaveDisabled}
            className={`py-2 px-4 rounded-lg text-white font-semibold ${
              isSaveDisabled
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            บันทึก
          </button>
        </div>
      }
    >
      <div className="overflow-y-auto max-h-[60vh] pr-2">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
               <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                รหัสสินค้า
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                ชื่อสินค้า
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 w-40">
                จำนวนจำกัด (หน่วย)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {availableProducts.length > 0 ? (
              availableProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {product.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                    {product.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                       <input
                          type="number"
                          min="0"
                          value={limits[product.id] ?? ''}
                          onChange={(e) => handleLimitChange(product, e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                            errors[product.id]
                              ? 'border-red-500 focus:ring-red-200'
                              : 'border-slate-300 focus:ring-blue-200'
                          }`}
                          placeholder="ไม่จำกัด"
                        />
                         {errors[product.id] && (
                        <p className="absolute text-xs text-red-500 mt-1">
                          {errors[product.id]}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  ไม่พบสินค้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};
