import React, { useState, useEffect, useMemo } from 'react';
import Swal from '@/src/utils/swal';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import { Modal } from '../../../common/Modal';
import {
  FormField,
  Input,
  Textarea,
  Button,
} from '../../../common/FormControls';
import { DropdownSelect } from '../../../common';
import {
  Warehouse as WarehouseType,
  Product,
} from '@/src/types/entity/app.interface';
import {
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  TruckIcon,
  PackageIcon,
} from '../../../../assets/icons/Icons';
import { ProductSelectionModal } from '../../products/ProductSelectionModal';
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
    () =>
      warehouses.find((w) => w.id === formData.from_warehouse_id)?.name || '',
    [formData.from_warehouse_id, warehouses]
  );
  const productsInWarehouse = useMemo(() => products, [products]);

  const isFormValid = useMemo(() => {
    return (
      formData.remark &&
      items.length > 0 &&
      items.every((item) => (item.qty || item.quantity) > 0)
    );
  }, [formData.remark, items]);

  useEffect(() => {
    if (transfer) {
      setFormData(transfer);
      setItems(
        transfer.items ? transfer.items.map((item) => ({ ...item })) : []
      );
    }
  }, [transfer]);

  const handleAddProducts = (productIds: string[]) => {
    const newItems: TransferItem[] = productIds.map((pid) => ({
      product_id: pid,
      qty: 1,
      quantity: 1,
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter((item) => item.product_id !== productId));
  };

  const handleItemChange = (productId: string, value: string | number) => {
    setItems(
      items.map((item) =>
        item.product_id === productId
          ? { ...item, qty: Number(value), quantity: Number(value) }
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
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณากรอกข้อมูลให้ครบถ้วน: ต้องมีเหตุผล และมีสินค้าอย่างน้อย 1 รายการที่จำนวนมากกว่า 0' });
      return;
    }
    if (transfer) {
      const updatedTransfer: any = {
        ...transfer,
        ...formData,
        remark: formData.remark || transfer.remark,
        items: items.map((item) => ({
          product_id: item.product_id,
          qty: Number(item.qty || item.quantity) || 0,
        })),
      };
      onUpdateTransfer(updatedTransfer);
    }
    onClose();
  };

  const existingProductIds = useMemo(
    () => items.map((item) => item.product_id),
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
          {/* Document Information Section */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
              <DocumentTextIcon className="w-4 h-4 text-slate-500" />
              ข้อมูลเอกสาร
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="วันที่โอนย้าย" htmlFor="created_at">
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
          </div>

          {/* Logistics Section */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
              <TruckIcon className="w-4 h-4 text-slate-500" />
              <span>ข้อมูลการขนส่ง</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-3 bg-amber-50/50 rounded-md border border-amber-100">
                <FormField label="คลังต้นทาง" htmlFor="from_warehouse_id">
                  <DropdownSelect
                    value={formData.from_warehouse_id || ''}
                    onChange={() => {}}
                    placeholder=""
                    options={warehouses
                      .filter((w) => w.id === formData.from_warehouse_id)
                      .map((w) => ({ value: w.id, label: w.name }))}
                    disabled
                    className="bg-slate-100"
                  />
                </FormField>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-md border border-blue-100">
                <FormField label="คลังปลายทาง" htmlFor="to_warehouse_id">
                  <DropdownSelect
                    value={formData.to_warehouse_id || ''}
                    onChange={(v) => handleChange({ target: { name: 'to_warehouse_id', value: v } } as React.ChangeEvent<HTMLSelectElement>)}
                    placeholder="เลือกคลังปลายทาง"
                    options={warehouses
                      .filter((w) => w.id !== formData.from_warehouse_id)
                      .map((w) => ({ value: w.id, label: w.name }))}
                  />
                </FormField>
              </div>
            </div>
            <div className="mt-4">
              <FormField label="เหตุผลการโอนย้าย" htmlFor="remark">
                <Textarea
                  id="remark"
                  name="remark"
                  value={formData.remark || ''}
                  onChange={handleChange}
                  required
                  rows={2}
                  placeholder="กรอกสาเหตุการโอนย้าย..."
                />
              </FormField>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-slate-500" />
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
                            {(product as unknown as Record<string, number>)?.stock ?? '-'}
                          </td>
                          <td className="p-2 align-middle">
                            <Input
                              type="number"
                              value={item.qty || item.quantity}
                              onChange={(e) => {
                                const newQuantity =
                                  parseInt(e.target.value, 10) || 0;
                                const stock = (product as unknown as Record<string, number>)?.stock ?? 9999;
                                const validatedQuantity = Math.min(
                                  newQuantity,
                                  stock
                                );
                                handleItemChange(
                                  item.product_id,
                                  validatedQuantity
                                );
                              }}
                              className="w-24 h-10"
                              min="1"
                              max={(product as unknown as Record<string, number>)?.stock ?? 9999}
                              required
                            />
                          </td>
                          <td className="p-2 align-middle text-slate-600">
                            {product?.unit?.name || '-'}
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
