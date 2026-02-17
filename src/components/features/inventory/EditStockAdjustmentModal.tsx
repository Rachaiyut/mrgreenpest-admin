import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import {
  FormField,
  Input,
  Select,
  Textarea,
  Button,
} from '../../common/FormControls';
import { Warehouse as WarehouseType } from '@/src/types/entity/app.interface';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';
import { ProductSelectionModal } from '../products/ProductSelectionModal';
import {
  Product,
  StockAdjustment as StockAdjustmentType,
  StockAdjustmentItem,
} from '@/src/types/entity/app.interface';

interface EditableAdjustmentItem {
  product_id: string;
  product?: Product;
  qty_before: number;
  quantity_change: number | '';
  reason: string;
}

interface EditStockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustment: StockAdjustmentType | null;
  onUpdateAdjustment: (adjustment: StockAdjustmentType) => void;
  warehouses: WarehouseType[];
  products: (Product & { quantity: number; warehouse_id: string })[];
}

export const EditStockAdjustmentModal: React.FC<EditStockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  adjustment,
  onUpdateAdjustment,
  warehouses,
  products,
}) => {
  const [items, setItems] = useState<EditableAdjustmentItem[]>([]);
  const [formData, setFormData] = useState<Partial<StockAdjustmentType>>({});
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const productsInWarehouse = useMemo(() => {
    if (!formData.warehouse_id) return [];
    return products.filter((p) => p.warehouse_id === formData.warehouse_id);
  }, [formData.warehouse_id, products]);

  const isFormValid = useMemo(() => {
    return (
      formData.reason &&
      formData.reason.trim() &&
      items.length > 0 &&
      items.every(
        (item) =>
          typeof item.quantity_change === 'number' &&
          item.quantity_change !== 0
      )
    );
  }, [formData.reason, items]);

  useEffect(() => {
    if (adjustment) {
      setFormData({
        ...adjustment,
        warehouse_id: adjustment.warehouse_id,
      });
      setItems(
        (adjustment.items || []).map((item) => ({
          product_id: item.product_id,
          product: products.find((p) => p.id === item.product_id),
          quantity_change: item.quantity_change || 0,
          qty_before: item.qty_before || 0,
          reason: item.reason || '',
        }))
      );
    }
  }, [adjustment, products]);

  const handleAddProducts = (productIds: string[]) => {
    const selectedProducts = productsInWarehouse.filter((p) => productIds.includes(p.id));
    const newItems: EditableAdjustmentItem[] = selectedProducts.map((p) => ({
      product_id: p.id,
      product: p,
      qty_before: (p as any).quantity || 0,
      quantity_change: '',
      reason: '',
    }));
    setItems((prev) => {
      const existingIds = new Set(prev.map((i) => i.product_id));
      const uniqueNewItems = newItems.filter((i) => !existingIds.has(i.product_id));
      return [...prev, ...uniqueNewItems];
    });
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter((item) => item.product_id !== productId));
  };

  const handleItemChange = (
    productId: string,
    field: keyof EditableAdjustmentItem,
    value: string | number
  ) => {
    const newItems = items.map((item) => {
      if (item.product_id === productId) {
        const updatedItem = { ...item };
        if (field === 'quantity_change') {
          updatedItem.quantity_change = value === '' ? '' : Number(value);
        } else if (field === 'reason' && typeof value === 'string') {
          updatedItem.reason = value;
        }
        return updatedItem;
      }
      return item;
    });
    setItems(newItems);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) {
      alert(
        'กรุณากรอกข้อมูลให้ครบถ้วน: ต้องมีเหตุผลหลัก และรายการสินค้าที่ปรับปรุงต้องมีจำนวนที่เปลี่ยนแปลงอย่างน้อย 1 รายการ'
      );
      return;
    }
    if (adjustment) {
      const updatedAdjustment: StockAdjustmentType = {
        ...adjustment,
        ...formData,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity_change: Number(item.quantity_change) || 0,
          reason: item.reason,
          qty_before: item.qty_before,
          id: adjustment.items?.find(i => i.product_id === item.product_id)?.id
        })),
      };
      onUpdateAdjustment(updatedAdjustment);
    }
    onClose();
  };

  const existingProductIds = useMemo(() => new Set(items.map((i) => i.product_id)), [items]);

  if (!adjustment) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`แก้ไขใบปรับปรุง Stock: ${adjustment.id}`}
        size="4xl"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="edit-adjustment-form"
              disabled={!isFormValid}
            >
              บันทึกการเปลี่ยนแปลง
            </Button>
          </div>
        }
      >
        <form
          id="edit-adjustment-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="เลขที่เอกสาร" htmlFor="adjustment-id">
              <Input
                id="adjustment-id"
                type="text"
                value={formData.id || ''}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
            <FormField label="วันที่" htmlFor="createdAt">
              <Input
                id="created_at"
                name="created_at"
                type="date"
                value={
                  formData.created_at
                    ? new Date(formData.created_at).toISOString().split('T')[0]
                    : ''
                }
                onChange={handleChange}
                required
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="คลังสินค้า" htmlFor="warehouse_id">
              <Select
                id="warehouse_id"
                name="warehouse_id"
                value={formData.warehouse_id || ''}
                onChange={handleChange}
                disabled
                className="bg-slate-100"
              >
                <option value={adjustment?.warehouse_id}>
                  {warehouses.find(w => w.id === adjustment?.warehouse_id)?.name}
                </option>
              </Select>
            </FormField>
          </div>
          <FormField label="เหตุผลหลักในการปรับปรุง" htmlFor="reason">
            <Textarea
              id="reason"
              name="reason"
              value={formData.reason || ''}
              onChange={handleChange}
              required
            />
          </FormField>
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-base font-semibold text-slate-800">
                รายการสินค้า
              </h4>
              <Button
                variant="primary"
                type="button"
                onClick={() => setIsProductModalOpen(true)}
                className="text-sm"
                disabled={!formData.warehouse_id}
              >
                <PlusIcon className="h-5 w-5" />
                เพิ่มสินค้า
              </Button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 text-left font-medium text-slate-600">
                      ลำดับ
                    </th>
                    <th className="p-2 text-left font-medium text-slate-600">
                      สินค้า
                    </th>
                    <th className="p-2 text-center font-medium text-slate-600">
                      จำนวนเดิม
                    </th>
                    <th className="p-2 text-center font-medium text-slate-600">
                      จำนวนใหม่<span className="text-red-500">*</span>
                    </th>
                    <th className="p-2 text-left font-medium text-slate-600">
                      หน่วย
                    </th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <tr
                        key={item.product_id}
                        className="border-b border-slate-200 last:border-b-0"
                      >
                        <td className="p-2 align-middle text-center text-slate-600">
                          {index + 1}
                        </td>
                        <td className="p-2 align-middle font-medium text-slate-800">
                          {item.product?.name || 'N/A'}
                        </td>
                        <td className="p-2 align-middle text-center text-slate-600">
                          {item.qty_before}
                        </td>
                        <td className="p-2 align-middle">
                          <Input
                            type="number"
                            value={item.quantity_change}
                            onChange={(e) =>
                              handleItemChange(
                                item.product_id,
                                'quantity_change',
                                e.target.value
                              )
                            }
                            className="w-24 h-10"
                            required
                          />
                        </td>
                        <td className="p-2 align-middle text-slate-600">
                          {item.product?.unit?.name || '-'}
                        </td>
                        <td className="p-2 text-center align-middle">
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() => handleRemoveItem(item.product_id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-10 text-slate-500"
                      >
                        ยังไม่มีรายการสินค้า
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </form>
      </Modal>

      <ProductSelectionModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onAddProducts={handleAddProducts}
        products={productsInWarehouse}
        existingProductIds={Array.from(existingProductIds)}
      />
    </>
  );
};


