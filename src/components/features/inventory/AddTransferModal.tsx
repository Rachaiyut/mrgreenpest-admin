import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import {
  FormField,
  Input,
  Select,
  Textarea,
  Button,
} from '../../common/FormControls';

import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';
import { ProductSelectionModal } from '../products/ProductSelectionModal';
import {
  Transfer as TransferType,
  Status,
  Warehouse as WarehouseType,
  Product,
} from '@/src/libs/common/interface/entity/app.interface';

interface AddTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTransfer: (transfer: Omit<TransferType, 'id'>) => void;
  transfers: TransferType[];
  warehouses: WarehouseType[];
  products: Product[];
  stockMap: Record<string, Record<string, number>>;
}

interface LineItem {
  id: number;
  productId: string;
  quantity: number;
}

export const AddTransferModal: React.FC<AddTransferModalProps> = ({
  isOpen,
  onClose,
  onCreateTransfer,
  transfers,
  warehouses,
  products,
  stockMap,
}) => {
  const [items, setItems] = useState<LineItem[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [reason, setReason] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
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
    const prefix = `IT${thaiYearLastTwoDigits}`;

    const transfersThisYear = transfers.filter((t) => t.id.startsWith(prefix));

    const maxId = transfersThisYear.reduce((max, t) => {
      const num = parseInt(t.id.slice(4), 10);
      return num > max ? num : max;
    }, 0);

    const newIdNumber = maxId + 1;
    return `${prefix}${String(newIdNumber).padStart(4, '0')}`;
  }, [isOpen, transfers]);

  const isFormValid = useMemo(() => {
    return (
      fromWarehouseId &&
      toWarehouseId &&
      reason.trim() &&
      items.length > 0 &&
      items.every((item) => item.quantity > 0)
    );
  }, [fromWarehouseId, toWarehouseId, reason, items]);

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setFromWarehouseId('');
      setToWarehouseId('');
      setReason('');
    }
  }, [isOpen]);

  const handleAddProducts = (productIds: string[]) => {
    const newItems: LineItem[] = productIds.map((pid) => ({
      id: Date.now() + Math.random(),
      productId: pid,
      quantity: 1,
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (
    id: number,
    field: keyof LineItem,
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
        'กรุณากรอกข้อมูลให้ครบถ้วน: ต้องมีคลังต้นทาง, คลังปลายทาง, เหตุผล และมีสินค้าอย่างน้อย 1 รายการที่จำนวนมากกว่า 0'
      );
      return;
    }
    const newTransfer: Omit<TransferType, 'id'> = {
      createdAt: new Date().toISOString(),
      fromWarehouseId: fromWarehouseId,
      toWarehouseId: toWarehouseId,
      reason: reason,
      createdBy: 'ผู้ดูแลระบบ',
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
      status: Status.Completed,
    };
    onCreateTransfer(newTransfer);
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
        title="สร้างใบโอนย้ายสินค้า"
        size="4xl"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button variant="primary" type="submit" form="add-transfer-form">
              บันทึก
            </Button>
          </div>
        }
      >
        <form
          id="add-transfer-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="เลขที่เอกสารโอนย้าย" htmlFor="transfer-id">
              <Input
                id="transfer-id"
                type="text"
                value={generatedId}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
            <FormField label="วันที่โอนย้าย" htmlFor="transfer-date">
              <Input
                id="transfer-date"
                name="createdAt"
                type="date"
                defaultValue={new Date().toISOString().substring(0, 10)}
                required
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="คลังต้นทาง" htmlFor="from-warehouse">
              <Select
                id="from-warehouse"
                required
                value={fromWarehouseId}
                onChange={(e) => {
                  const newFromId = e.target.value;
                  setFromWarehouseId(newFromId);
                  if (newFromId && newFromId === toWarehouseId) {
                    setToWarehouseId('');
                  }
                }}
              >
                <option value="">-- เลือกคลัง --</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                    {wh.type === 'รถ' && wh.licensePlate
                      ? ` (${wh.licensePlate})`
                      : ''}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="คลังปลายทาง" htmlFor="to-warehouse">
              <Select
                id="to-warehouse"
                required
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
              >
                <option value="">-- เลือกคลัง --</option>
                {warehouses
                  .filter((wh) => wh.id !== fromWarehouseId)
                  .map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                      {wh.type === 'รถ' && wh.licensePlate
                        ? ` (${wh.licensePlate})`
                        : ''}
                    </option>
                  ))}
              </Select>
            </FormField>
          </div>
          <FormField label="เหตุผลในการโอนย้าย" htmlFor="reason">
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
                disabled={!fromWarehouseId}
                title={
                  !fromWarehouseId ? 'กรุณาเลือกคลังต้นทางก่อน' : 'เพิ่มสินค้า'
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
                      จำนวนคงคลัง
                    </th>
                    <th className="p-2 text-left font-medium text-slate-600">
                      จำนวน<span className="text-red-500">*</span>
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
                      const currentStock =
                        stockMap[fromWarehouseId]?.[item.productId] ?? 0;
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-slate-200 last:border-b-0"
                        >
                          <td className="p-2 align-middle text-center text-slate-600">
                            {index + 1}
                          </td>
                          <td className="p-2 align-middle text-slate-600">
                            {product?.id || '-'}
                          </td>
                          <td className="p-2 align-middle font-medium text-slate-800">
                            {product?.name || 'N/A'}
                          </td>
                          <td className="p-2 align-middle text-center text-slate-600">
                            {currentStock}
                          </td>
                          <td className="p-2 align-middle">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity =
                                  parseInt(e.target.value, 10) || 0;
                                const validatedQuantity = Math.min(
                                  newQuantity,
                                  currentStock
                                );
                                handleItemChange(
                                  item.id,
                                  'quantity',
                                  validatedQuantity
                                );
                              }}
                              className="w-24 h-10"
                              min="1"
                              max={currentStock}
                              required
                            />
                          </td>
                          <td className="p-2 align-middle text-slate-600">
                            {product?.unit || '-'}
                          </td>
                          <td className="p-2 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
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
