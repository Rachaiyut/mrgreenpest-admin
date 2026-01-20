import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import {
  FormField,
  Input,
  Select,
  Textarea,
  Button,
} from '../../common/FormControls';
import { Warehouse as WarehouseType } from '@/src/libs/common/interface/entity/app.interface';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';
import { ProductSelectionModal } from '../products/ProductSelectionModal';
import {
  Product,
  StockAdjustment as StockAdjustmentType,
  StockAdjustmentItem,
} from '@/src/libs/common/interface/entity/app.interface';

interface EditableAdjustmentItem extends Omit<
  StockAdjustmentItem,
  'adjustedQuantity'
> {
  adjustedQuantity: number | '';
}

interface EditStockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustment: StockAdjustmentType | null;
  onUpdateAdjustment: (adjustment: StockAdjustmentType) => void;
  warehouses: WarehouseType[];
  products: Product[];
}

export const EditStockAdjustmentModal: React.FC<
  EditStockAdjustmentModalProps
> = ({
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

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );
  const warehouseName = useMemo(
    () => warehouses.find((w) => w.id === formData.warehouseId)?.name || '',
    [formData.warehouseId, warehouses]
  );
  const productsInWarehouse = useMemo(
    () => products.filter((p) => p.warehouse === warehouseName),
    [warehouseName, products]
  );

  const isFormValid = useMemo(() => {
    return (
      formData.reason &&
      formData.reason.trim() &&
      items.length > 0 &&
      items.every(
        (item) =>
          typeof item.adjustedQuantity === 'number' &&
          item.adjustedQuantity >= 0
      )
    );
  }, [formData.reason, items]);

  useEffect(() => {
    if (adjustment) {
      setFormData(adjustment);
      setItems(
        adjustment.items.map((item) => ({
          ...item,
          adjustedQuantity: item.adjustedQuantity,
        }))
      );
    }
  }, [adjustment]);

  const handleAddProducts = (productIds: string[]) => {
    const newItems: EditableAdjustmentItem[] = productIds.map((pid) => ({
      productId: pid,
      originalQuantity: productMap.get(pid)?.stock || 0,
      adjustedQuantity: 0,
      reason: '',
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter((item) => item.productId !== productId));
  };

  const handleItemChange = (
    productId: string,
    field: keyof EditableAdjustmentItem,
    value: string | number
  ) => {
    const newItems = items.map((item) => {
      if (item.productId === productId) {
        const updatedItem = { ...item } as EditableAdjustmentItem;
        if (field === 'adjustedQuantity') {
          updatedItem[field] = value === '' ? '' : Number(value);
        } else {
          (updatedItem as any)[field] = value;
        }
        return updatedItem;
      }
      return item;
    });
    setItems(newItems);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) {
      alert(
        'กรุณากรอกข้อมูลให้ครบถ้วน: ต้องมีเหตุผลหลัก และรายการสินค้าที่ปรับปรุงให้ถูกต้อง'
      );
      return;
    }
    if (adjustment) {
      const updatedAdjustment: StockAdjustmentType = {
        ...adjustment,
        ...formData,
        items: items.map((item) => ({
          productId: item.productId,
          originalQuantity: item.originalQuantity,
          adjustedQuantity:
            typeof item.adjustedQuantity === 'number'
              ? item.adjustedQuantity
              : 0,
          reason: item.reason,
        })),
      };
      onUpdateAdjustment(updatedAdjustment);
    }
    onClose();
  };

  const existingProductIds = useMemo(
    () => items.map((item) => item.productId),
    [items]
  );

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
            <Button variant="primary" type="submit" form="edit-adjustment-form">
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
                id="createdAt"
                name="createdAt"
                type="date"
                value={new Date(formData.createdAt || '')
                  .toISOString()
                  .substring(0, 10)}
                onChange={handleChange}
                required
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="คลังสินค้า" htmlFor="warehouse">
              <Select
                id="warehouse"
                value={formData.warehouseId || ''}
                disabled
                className="bg-slate-100"
              >
                <option value={formData.warehouseId}>
                  {warehouses.find((w) => w.id === formData.warehouseId)
                    ?.name || ''}
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
                    items.map((item, index) => {
                      const product = item.productId
                        ? productMap.get(item.productId)
                        : null;
                      return (
                        <tr
                          key={item.productId}
                          className="border-b border-slate-200 last:border-b-0"
                        >
                          <td className="p-2 align-middle text-center text-slate-600">
                            {index + 1}
                          </td>
                          <td className="p-2 align-middle font-medium text-slate-800">
                            {product?.name || 'N/A'}
                          </td>
                          <td className="p-2 align-middle text-center text-slate-600">
                            {item.originalQuantity}
                          </td>
                          <td className="p-2 align-middle">
                            <Input
                              type="number"
                              value={item.adjustedQuantity}
                              onChange={(e) =>
                                handleItemChange(
                                  item.productId,
                                  'adjustedQuantity',
                                  e.target.value
                                )
                              }
                              className="w-24 h-10"
                              min="0"
                              required
                            />
                          </td>
                          <td className="p-2 align-middle text-slate-600">
                            {product?.unit || '-'}
                          </td>
                          <td className="p-2 text-center align-middle">
                            <Button
                              variant="ghost"
                              type="button"
                              onClick={() => handleRemoveItem(item.productId)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
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
        existingProductIds={existingProductIds}
      />
    </>
  );
};
