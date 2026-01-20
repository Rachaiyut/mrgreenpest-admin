import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Select, Button } from '../../common/FormControls';

import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';
import { ProductSelectionModal } from '../products/ProductSelectionModal';
import {
  ProductReturn as ReturnType,
  Status,
  Warehouse as WarehouseType,
  Product,
} from '@/src/libs/common/interface/entity/app.interface';

interface AddReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateReturn: (returnData: Omit<ReturnType, 'id'>) => void;
  returns: ReturnType[];
  warehouses: WarehouseType[];
  products: Product[];
  stockMap: Record<string, Record<string, number>>;
}

interface ReturnItem {
  id: number;
  productId: string;
  quantity: number;
  reason: string;
}

export const AddReturnModal: React.FC<AddReturnModalProps> = ({
  isOpen,
  onClose,
  onCreateReturn,
  returns,
  warehouses,
  products,
  stockMap,
}) => {
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [withdrawalRefId, setWithdrawalRefId] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );
  const vehicleWarehouses = useMemo(
    () => warehouses.filter((w) => w.type === 'รถ'),
    [warehouses]
  );
  const mainWarehouses = useMemo(
    () => warehouses.filter((w) => w.type === 'คลัง'),
    [warehouses]
  );

  const fromWarehouse = useMemo(
    () => warehouses.find((w) => w.id === fromWarehouseId) || null,
    [fromWarehouseId, warehouses]
  );

  const productsInWarehouse = useMemo(() => {
    if (!fromWarehouse) return [];
    const whId = fromWarehouse.id;
    return products.filter(
      (p) => (stockMap[whId]?.[p.id] || 0) > 0 && p.type === 'สินค้า'
    );
  }, [fromWarehouse, products, stockMap]);

  const generatedId = useMemo(() => {
    if (!isOpen) return '';
    const thaiYearLastTwoDigits = (new Date().getFullYear() + 543)
      .toString()
      .slice(-2);
    const prefix = `RT${thaiYearLastTwoDigits}`;
    const returnsThisYear = returns.filter((r) => r.id.startsWith(prefix));
    const maxId = returnsThisYear.reduce((max, r) => {
      const num = parseInt(r.id.slice(4), 10);
      return num > max ? num : max;
    }, 0);
    const newIdNumber = maxId + 1;
    return `${prefix}${String(newIdNumber).padStart(4, '0')}`;
  }, [isOpen, returns]);

  const isFormValid = useMemo(() => {
    return (
      fromWarehouseId &&
      toWarehouseId &&
      items.length > 0 &&
      items.every((item) => item.quantity > 0 && item.reason.trim() !== '')
    );
  }, [fromWarehouseId, toWarehouseId, items]);

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setFromWarehouseId('');
      setToWarehouseId('');
      setWithdrawalRefId('');
    }
  }, [isOpen]);

  const handleAddProducts = (productIds: string[]) => {
    const newItems: ReturnItem[] = productIds.map((pid) => ({
      id: Date.now() + Math.random(),
      productId: pid,
      quantity: 1,
      reason: '',
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (
    id: number,
    field: keyof ReturnItem,
    value: string | number
  ) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) {
      alert(
        'กรุณากรอกข้อมูลให้ครบถ้วน: ต้องเลือกคลังต้นทาง, คลังปลายทาง, และมีสินค้าที่คืนอย่างน้อย 1 รายการพร้อมระบุจำนวนและเหตุผล'
      );
      return;
    }
    const newReturn: Omit<ReturnType, 'id'> = {
      createdAt: new Date().toISOString(),
      fromWarehouseId: fromWarehouseId,
      toWarehouseId: toWarehouseId,
      withdrawalRefId: withdrawalRefId || undefined,
      createdBy: 'ผู้ดูแลระบบ',
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        reason: item.reason,
      })),
      status: Status.Completed,
    };
    onCreateReturn(newReturn);
    onClose();
  };

  const existingProductIds = useMemo(
    () => items.map((item) => item.productId),
    [items]
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="สร้างใบคืนสินค้า"
        size="5xl"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button variant="primary" type="submit" form="add-return-form">
              บันทึก
            </Button>
          </div>
        }
      >
        <form
          id="add-return-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="เลขที่ใบคืน" htmlFor="return-id">
              <Input
                id="return-id"
                type="text"
                value={generatedId}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
            <FormField label="วันที่คืน" htmlFor="return-date">
              <Input
                id="return-date"
                name="createdAt"
                type="date"
                defaultValue={new Date().toISOString().substring(0, 10)}
                required
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="คืนจาก (รถ)" htmlFor="from-warehouse">
              <Select
                id="from-warehouse"
                value={fromWarehouseId}
                onChange={(e) => setFromWarehouseId(e.target.value)}
                required
              >
                <option value="">-- เลือกรถ --</option>
                {vehicleWarehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.licensePlate})
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="คืนเข้า (คลัง)" htmlFor="to-warehouse">
              <Select
                id="to-warehouse"
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                required
              >
                <option value="">-- เลือกคลัง --</option>
                {mainWarehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="อ้างอิงใบเบิก (ถ้ามี)" htmlFor="ref-id">
            <Input
              id="ref-id"
              type="text"
              value={withdrawalRefId}
              onChange={(e) => setWithdrawalRefId(e.target.value)}
              placeholder="ระบุเลขที่ใบเบิก"
            />
          </FormField>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-base font-semibold text-slate-800">
                รายการสินค้าคืน
              </h4>
              <Button
                variant="primary"
                type="button"
                onClick={() => setIsProductModalOpen(true)}
                disabled={!fromWarehouseId}
                title={
                  !fromWarehouseId ? 'กรุณาเลือกรถต้นทางก่อน' : 'เพิ่มสินค้า'
                }
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
                      รหัสสินค้า
                    </th>
                    <th className="p-2 text-left font-medium text-slate-600">
                      สินค้า
                    </th>
                    <th className="p-2 text-center font-medium text-slate-600">
                      จำนวนที่ยืม
                    </th>
                    <th className="p-2 text-left font-medium text-slate-600">
                      จำนวนคืน<span className="text-red-500">*</span>
                    </th>
                    <th className="p-2 text-left font-medium text-slate-600">
                      หน่วย
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
                      const product = item.productId
                        ? productMap.get(item.productId)
                        : null;
                      const currentStock =
                        stockMap[fromWarehouseId]?.[item.productId] ?? 0;
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-slate-200 last:border-b-0"
                        >
                          <td className="p-2 align-middle text-center text-slate-700">
                            {index + 1}
                          </td>
                          <td className="p-2 align-middle text-slate-700">
                            {product?.id || '-'}
                          </td>
                          <td className="p-2 align-middle font-medium text-slate-800">
                            {product?.name || 'N/A'}
                          </td>
                          <td className="p-2 align-middle text-center text-slate-700">
                            {currentStock}
                          </td>
                          <td className="p-2 align-middle">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  'quantity',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-24 h-10"
                              min="1"
                              max={currentStock}
                              required
                            />
                          </td>
                          <td className="p-2 align-middle text-slate-700">
                            {product?.unit || '-'}
                          </td>
                          <td className="p-2 align-middle">
                            <Input
                              type="text"
                              value={item.reason}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  'reason',
                                  e.target.value
                                )
                              }
                              className="w-full h-10"
                              placeholder="ระบุเหตุผล"
                              required
                            />
                          </td>
                          <td className="p-2 text-center align-middle">
                            <Button
                              variant="ghost"
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
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
                        colSpan={8}
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
        existingProductIds={existingProductIds}
        products={productsInWarehouse}
      />
    </>
  );
};
