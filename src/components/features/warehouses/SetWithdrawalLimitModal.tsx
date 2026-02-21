import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Input } from '../../common/FormControls';
import { Warehouse, Product } from '@/src/types/entity/app.interface';
import { WarehouseApi } from '@/src/api/warehouse';

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
  const [isLoading, setIsLoading] = useState(false);

  const availableProducts = useMemo(() => {
    // Show all products.
    return products;
  }, [products]);

  useEffect(() => {
    if (isOpen && warehouse) {
      setIsLoading(true);
      // Fetch latest warehouse data to get current limits
      WarehouseApi.getWarehouseById(warehouse.id)
        .then((latestWarehouse) => {
          const initialLimits: { [productId: string]: number | '' } = {};

          if (
            latestWarehouse &&
            Array.isArray(latestWarehouse.withdrawal_limits)
          ) {
            latestWarehouse.withdrawal_limits.forEach((limit: any) => {
              if (limit.product_id) {
                initialLimits[limit.product_id] = Number(
                  limit.max_return_qty || limit.max_quantity
                );
              }
            });
          }

          setLimits(initialLimits);
        })
        .catch((err) => {
          console.error('Failed to fetch warehouse limits', err);
          // Fallback to prop data if fetch fails
          const initialLimits: { [productId: string]: number | '' } = {};
          if (
            warehouse.withdrawal_limits &&
            Array.isArray(warehouse.withdrawal_limits)
          ) {
            warehouse.withdrawal_limits.forEach((limit: any) => {
              if (limit.product_id) {
                initialLimits[limit.product_id] = Number(
                  limit.max_return_qty || limit.max_quantity
                );
              }
            });
          }
          setLimits(initialLimits);
        })
        .finally(() => {
          setIsLoading(false);
        });

      setErrors({}); // Reset errors on open
    }
  }, [isOpen, warehouse]);

  if (!isOpen || !warehouse) return null;

  const handleLimitChange = (productId: string, value: string) => {
    const numValue = Number(value);

    setLimits((prev) => ({
      ...prev,
      [productId]: value === '' ? '' : numValue,
    }));

    if (value !== '' && (isNaN(numValue) || numValue < 0)) {
      setErrors((prev) => ({
        ...prev,
        [productId]: 'กรุณาระบุตัวเลขที่ถูกต้อง',
      }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[productId];
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
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <Input
                        type="number"
                        min="0"
                        value={limits[product.id] ?? ''}
                        onChange={(e) =>
                          handleLimitChange(product.id, e.target.value)
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
