import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import {
  FormField,
  Input,
  Select,
  Textarea,
  Button,
} from '../../common/FormControls';
import {
  Warehouse as WarehouseType,
  Product,
} from '@/src/types/entity/app.interface';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';
import { ProductSelectionModal } from '../products/ProductSelectionModal';
import {
  Transfer as TransferType,
  Status,
  TransferItem,
} from '@/src/types/entity/app.interface';

interface EditTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: TransferType | null;
  onUpdateTransfer: (transfer: TransferType) => void;
  warehouses: WarehouseType[];
  products: Product[];
}

export const EditTransferModal: React.FC<EditTransferModalProps> = ({
  isOpen,
  onClose,
  transfer,
  onUpdateTransfer,
  warehouses,
  products,
}) => {
  const [items, setItems] = useState<TransferItem[]>([]);
  const [formData, setFormData] = useState<Partial<TransferType>>({});
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );
  const fromWarehouseName = useMemo(
    () => warehouses.find((w) => w.id === formData.fromWarehouseId)?.name || '',
    [formData.fromWarehouseId, warehouses]
  );
  const productsInWarehouse = useMemo(
    () => products.filter((p) => p.warehouse === fromWarehouseName),
    [fromWarehouseName, products]
  );

  const isFormValid = useMemo(() => {
    return (
      formData.reason &&
      formData.reason.trim() &&
      items.length > 0 &&
      items.every((item) => item.quantity > 0)
    );
  }, [formData.reason, items]);

  useEffect(() => {
    if (transfer) {
      setFormData(transfer);
      setItems(transfer.items.map((item) => ({ ...item })));
    }
  }, [transfer]);

  const handleAddProducts = (productIds: string[]) => {
    const newItems: TransferItem[] = productIds.map((pid) => ({
      productId: pid,
      quantity: 1,
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter((item) => item.productId !== productId));
  };

  const handleItemChange = (productId: string, value: string | number) => {
    setItems(
      items.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Number(value) }
          : item
      )
    );
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
        'กรุณากรอกข้อมูลให้ครบถ้วน: ต้องมีเหตุผล และมีสินค้าอย่างน้อย 1 รายการที่จำนวนมากกว่า 0'
      );
      return;
    }
    if (transfer) {
      const updatedTransfer: TransferType = {
        ...transfer,
        ...formData,
        reason: formData.reason || transfer.reason,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity) || 0,
        })),
      };
      onUpdateTransfer(updatedTransfer);
    }
    onClose();
  };

  const existingProductIds = useMemo(
    () => items.map((item) => item.productId),
    [items]
  );

  if (!transfer) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`แก้ไขใบโอนย้าย: ${transfer.id}`}
        size="4xl"
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
              form="edit-transfer-form"
              className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            >
              บันทึกการเปลี่ยนแปลง
            </Button>
          </div>
        }
      >
        <form
          id="edit-transfer-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="เลขที่เอกสารโอนย้าย" htmlFor="transfer-id">
              <Input
                id="transfer-id"
                type="text"
                value={formData.id || ''}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
            <FormField label="วันที่โอนย้าย" htmlFor="createdAt">
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
            <FormField label="คลังต้นทาง" htmlFor="from-warehouse">
              <Select
                id="from-warehouse"
                value={formData.fromWarehouseId || ''}
                disabled
                className="bg-slate-100"
              >
                <option value={formData.fromWarehouseId}>
                  {warehouses.find((w) => w.id === formData.fromWarehouseId)
                    ?.name || ''}
                </option>
              </Select>
            </FormField>
            <FormField label="คลังปลายทาง" htmlFor="to-warehouse">
              <Select
                id="to-warehouse"
                value={formData.toWarehouseId || ''}
                disabled
                className="bg-slate-100"
              >
                <option value={formData.toWarehouseId}>
                  {warehouses.find((w) => w.id === formData.toWarehouseId)
                    ?.name || ''}
                </option>
              </Select>
            </FormField>
          </div>
          <FormField label="เหตุผลในการโอนย้าย" htmlFor="reason">
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
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-3 rounded-lg shadow-sm transition-colors text-sm"
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
                      จำนวนคงคลัง (ต้นทาง)
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
                            {product?.stock ?? '-'}
                          </td>
                          <td className="p-2 align-middle">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity =
                                  parseInt(e.target.value, 10) || 0;
                                const stock = product?.stock ?? 0;
                                const validatedQuantity = Math.min(
                                  newQuantity,
                                  stock
                                );
                                handleItemChange(
                                  item.productId,
                                  validatedQuantity
                                );
                              }}
                              className="w-24 h-10"
                              min="1"
                              max={product?.stock ?? 0}
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

