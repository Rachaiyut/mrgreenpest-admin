import React, { useState, useEffect, useMemo } from 'react';
import Swal from '@/src/utils/swal';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import { Modal } from '../../../common/Modal';
import { FormField, Input, Button } from '../../../common/FormControls';
import { DropdownSelect } from '../../../common';
import {
  Warehouse as WarehouseType,
  Product,
} from '@/src/types/entity/app.interface';
import { PlusIcon, TrashIcon } from '../../../../assets/icons/Icons';
import { ProductSelectionModal } from '../../products/ProductSelectionModal';
import {
  ProductReturn as ReturnType,
  ProductReturnItem,
  Status,
} from '@/src/types/entity/app.interface';

interface EditReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnItem: ReturnType | null;
  onUpdateReturn: (returnData: ReturnType) => void;
  warehouses: WarehouseType[];
  products: Product[];
  stockMap: { [key: string]: { [key: string]: number } };
}

export const EditReturnModal: React.FC<EditReturnModalProps> = ({
  isOpen,
  onClose,
  returnItem,
  onUpdateReturn,
  warehouses,
  products,
  stockMap,
}) => {
  const [items, setItems] = useState<ProductReturnItem[]>([]);
  const [formData, setFormData] = useState<Partial<ReturnType>>({});
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );
  const fromWarehouseName = useMemo(
    () => warehouses.find((w) => w.id === formData.warehouse_id)?.name || '',
    [formData.warehouse_id, warehouses]
  );
  const productsInWarehouse = useMemo(() => {
    if (!formData.warehouse_id) return [];
    const productIdsInWarehouse = Object.keys(
      stockMap[formData.warehouse_id] || {}
    );
    return products.filter((p) => productIdsInWarehouse.includes(p.id));
  }, [formData.warehouse_id, products, stockMap]);

  const isFormValid = useMemo(() => {
    return (
      items.length > 0 &&
      items.every((item) => item.quantity > 0 && item.reason.trim() !== '')
    );
  }, [items]);

  useEffect(() => {
    if (returnItem) {
      setFormData(returnItem);
      setItems(returnItem.items.map((item) => ({ ...item })));
    }
  }, [returnItem]);

  const handleAddProducts = (productIds: string[]) => {
    const newItems: ProductReturnItem[] = productIds.map((pid) => ({
      product_id: pid,
      quantity: 1,
      reason: '',
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (product_id: string) => {
    setItems(items.filter((item) => item.product_id !== product_id));
  };

  const handleItemChange = (
    product_id: string,
    field: 'quantity' | 'reason',
    value: string | number
  ) => {
    setItems(
      items.map((item) =>
        item.product_id === product_id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) {
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณากรอกข้อมูลให้ครบถ้วน: ต้องมีสินค้าที่คืนอย่างน้อย 1 รายการพร้อมระบุจำนวนและเหตุผล' });
      return;
    }
    if (returnItem) {
      const updatedReturn: ReturnType = {
        ...returnItem,
        ...formData,
        items: items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
        })),
      };
      onUpdateReturn(updatedReturn);
    }
    onClose();
  };

  const existingProductIds = useMemo(
    () => items.map((item) => item.product_id),
    [items]
  );

  if (!returnItem) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`แก้ไขใบคืนสินค้า: ${returnItem.id}`}
        size="5xl"
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
              form="edit-return-form"
              className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            >
              บันทึกการเปลี่ยนแปลง
            </Button>
          </div>
        }
      >
        <form
          id="edit-return-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="เลขที่เอกสาร" htmlFor="id">
              <Input
                id="id"
                type="text"
                value={formData.id || ''}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
            <FormField label="วันที่" htmlFor="created_at">
              <DatePicker
                selected={formData.created_at ? new Date(formData.created_at) : null}
                onChange={(date: Date | null) => setFormData((prev) => ({ ...prev, created_at: date ? date.toISOString().substring(0, 10) : '' }))}
                dateFormat="dd/MM/yyyy"
                locale="th"
                placeholderText="dd/mm/yyyy"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
                wrapperClassName="w-full"
                required
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="คืนจากคลัง (รถ)" htmlFor="fromWarehouseId">
              <DropdownSelect
                value={formData.warehouse_id || ''}
                onChange={() => {}}
                placeholder=""
                options={warehouses
                  .filter((w) => w.id === formData.warehouse_id)
                  .map((w) => ({ value: w.id, label: w.name }))}
                disabled
                className="bg-slate-100"
              />
            </FormField>
            <FormField label="คืนเข้าคลัง" htmlFor="toWarehouseId">
              <DropdownSelect
                value={formData.warehouse_id || ''}
                onChange={() => {}}
                placeholder=""
                options={warehouses
                  .filter((w) => w.id === formData.warehouse_id)
                  .map((w) => ({ value: w.id, label: w.name }))}
                disabled
                className="bg-slate-100"
              />
            </FormField>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-base font-semibold text-slate-800">
                รายการสินค้า
              </h4>
              <Button
                type="button"
                onClick={() => setIsProductModalOpen(true)}
                variant="primary"
                className="text-sm px-3"
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
                      จำนวนคงคลัง (รถ)
                    </th>
                    <th className="p-2 text-left font-medium text-slate-600">
                      จำนวน<span className="text-red-500">*</span>
                    </th>
                    <th className="p-2 text-left font-medium text-slate-600">
                      เหตุผล<span className="text-red-500">*</span>
                    </th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((item, index) => {
                      const product = item.product_id
                        ? productMap.get(item.product_id)
                        : null;
                      return (
                        <tr
                          key={item.product_id}
                          className="border-b border-slate-200 last:border-b-0"
                        >
                          <td className="p-2 align-middle text-center text-slate-600">
                            {index + 1}
                          </td>
                          <td className="p-2 align-middle font-medium text-slate-800">
                            {product?.name || 'N/A'}
                          </td>
                          <td className="p-2 align-middle text-center text-slate-600">
                            {stockMap[formData.warehouse_id]?.[product.id] ??
                              '-'}
                          </td>
                          <td className="p-2 align-middle">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity =
                                  parseInt(e.target.value, 10) || 0;
                                const stock =
                                  stockMap[formData.warehouse_id]?.[
                                    product.id
                                  ] ?? 0;
                                const validatedQuantity = Math.min(
                                  newQuantity,
                                  stock
                                );
                                handleItemChange(
                                  item.product_id,
                                  'quantity',
                                  validatedQuantity
                                );
                              }}
                              className="w-24 h-10"
                              min="1"
                              max={
                                stockMap[formData.warehouse_id]?.[product.id] ??
                                0
                              }
                              required
                            />
                          </td>
                          <td className="p-2 align-middle">
                            <Input
                              type="text"
                              value={item.reason}
                              onChange={(e) =>
                                handleItemChange(
                                  item.product_id,
                                  'reason',
                                  e.target.value
                                )
                              }
                              className="w-full h-10"
                              placeholder="เหตุผลในการคืนสินค้า"
                              required
                            />
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
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-4 text-center text-slate-500"
                      >
                        ไม่มีสินค้าที่คืน
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
