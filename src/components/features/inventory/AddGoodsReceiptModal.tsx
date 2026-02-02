import type { FC, FormEvent, MouseEvent } from 'react';
import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Select, Button } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';
import { ProductSelectionModal } from '../products/ProductSelectionModal';
import {
  GoodsReceipt,
  GoodsReceiptItem,
  Status,
  Warehouse as WarehouseType,
  Supplier,
  Product,
} from '@/src/types/entity/app.interface';

interface AddGoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateReceipt: (receipt: Omit<GoodsReceipt, 'id'>) => void;
  receipts: GoodsReceipt[];
  warehouses: WarehouseType[];
  suppliers: Supplier[];
  products: Product[];
}

interface LineItem {
  id: number;
  productId: string;
  quantityOrdered: number;
  quantityReceived: number;
}

export const AddGoodsReceiptModal: FC<AddGoodsReceiptModalProps> = ({
  isOpen,
  onClose,
  onCreateReceipt,
  receipts,
  warehouses,
  suppliers,
  products,
}) => {
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const generatedId = useMemo(() => {
    if (!isOpen) return '';

    const thaiYearLastTwoDigits = (new Date().getFullYear() + 543)
      .toString()
      .slice(-2);
    const prefix = `GR${thaiYearLastTwoDigits}`;

    const receiptsThisYear = receipts.filter((r) => r.id.startsWith(prefix));

    const maxId = receiptsThisYear.reduce((max, r) => {
      const num = parseInt(r.id.slice(4), 10);
      return num > max ? num : max;
    }, 0);

    const newIdNumber = maxId + 1;
    return `${prefix}${String(newIdNumber).padStart(4, '0')}`;
  }, [isOpen, receipts]);

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setSelectedWarehouseId('');
      setSelectedSupplierId('');
    }
  }, [isOpen]);

  const handleAddProducts = (productIds: string[]) => {
    const newItems: LineItem[] = productIds.map((pid) => ({
      id: Date.now() + Math.random(),
      productId: pid,
      quantityOrdered: 1,
      quantityReceived: 1,
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

  const createReceiptObject = (
    status: Status,
    formData: FormData
  ) => {
    // Map items to backend DTO format (snake_case)
    const receiptItems = items.map((item) => ({
      product_id: item.productId,
      qty_ordered: item.quantityOrdered,
      qty_received: item.quantityReceived,
    }));

    return {
      receipt_no: (formData.get('reference-id') as string) || undefined,
      supplier_id: selectedSupplierId || undefined,
      warehouse_id: selectedWarehouseId,
      items: receiptItems,
    };
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onCreateReceipt(createReceiptObject(Status.PendingApproval, formData));
    onClose();
  };

  const handleSaveDraft = (e: MouseEvent<HTMLButtonElement>) => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    onCreateReceipt(createReceiptObject(Status.Draft, formData));
    onClose();
  };

  const existingProductIds = useMemo(
    () => items.map((item) => item.productId),
    [items]
  );

  return (
    <Fragment>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="สร้างใบรับสินค้าเข้า"
        size="5xl"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button variant="secondary" type="button" onClick={handleSaveDraft}>
              บันทึกฉบับร่าง
            </Button>
            <Button variant="primary" type="submit" form="add-receipt-form">
              ส่งเพื่ออนุมัติ
            </Button>
          </div>
        }
      >
        <form
          ref={formRef}
          id="add-receipt-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="เลขที่ใบรับเข้า" htmlFor="receipt-id">
              <Input
                id="receipt-id"
                type="text"
                value={generatedId}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
            <FormField label="วันที่รับสินค้าเข้า" htmlFor="receipt-date">
              <Input
                name="receipt-date"
                id="receipt-date"
                type="date"
                defaultValue={new Date().toISOString().substring(0, 10)}
                required
              />
            </FormField>
            <FormField label="ผู้ทำรับ" htmlFor="created-by">
              <Input
                id="created-by"
                name="createdBy"
                type="text"
                value="ผู้ดูแลระบบ"
                readOnly
                className="bg-slate-100"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="รับเข้าคลัง" htmlFor="warehouse">
              <SearchableSelect
                value={selectedWarehouseId}
                onChange={setSelectedWarehouseId}
                placeholder="-- เลือกคลัง --"
                required
                name="warehouse"
                options={warehouses.map((wh) => ({
                  value: wh.id,
                  label: `${wh.name}${wh.type === 'รถ' && wh.vehicle?.vehicle_registration ? ` (${wh.vehicle.vehicle_registration})` : ''}`,
                }))}
              />
            </FormField>
            <FormField label="ผู้จัดจำหน่าย" htmlFor="supplier">
              <SearchableSelect
                value={selectedSupplierId}
                onChange={setSelectedSupplierId}
                placeholder="-- เลือกผู้จัดจำหน่าย --"
                name="supplier"
                required
                options={suppliers.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
              />
            </FormField>
          </div>
          <FormField label="เลขที่อ้างอิงเอกสาร" htmlFor="reference-id">
            <Input
              name="reference-id"
              id="reference-id"
              type="text"
              placeholder="เช่น PO-12345"
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
                disabled={!selectedWarehouseId}
                title={
                  !selectedWarehouseId
                    ? 'กรุณาเลือกคลังก่อนเพิ่มสินค้า'
                    : 'เพิ่มสินค้า'
                }
              >
                <PlusIcon className="h-5 w-5" />
                <span className="ml-2">เพิ่มสินค้า</span>
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
                    <th className="p-2 text-left font-medium text-slate-600">
                      จำนวนที่สั่ง<span className="text-red-500">*</span>
                    </th>
                    <th className="p-2 text-left font-medium text-slate-600">
                      จำนวนที่รับเข้า<span className="text-red-500">*</span>
                    </th>
                    <th className="p-2 text-right font-medium text-slate-600">
                      ราคา
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
                          key={item.id}
                          className="border-b border-slate-200 last:border-b-0"
                        >
                          <td className="px-2 py-3 text-center align-middle text-slate-700">
                            {index + 1}
                          </td>
                          <td className="px-2 py-3 align-middle text-slate-700">
                            {product?.id || '-'}
                          </td>
                          <td className="px-2 py-3 align-middle font-medium text-slate-800">
                            {product?.name || 'N/A'}
                          </td>
                          <td className="px-2 py-3 align-middle">
                            <Input
                              type="number"
                              value={item.quantityOrdered}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  'quantityOrdered',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-24 h-10"
                              min="1"
                              required
                            />
                          </td>
                          <td className="px-2 py-3 align-middle">
                            <Input
                              type="number"
                              value={item.quantityReceived}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  'quantityReceived',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-24 h-10"
                              min="0"
                              required
                            />
                          </td>
                          <td className="px-2 py-3 align-middle text-slate-700 text-right">
                            ฿
                            {product?.price != null
                              ? product.price.toLocaleString('th-TH', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                              : '0.00'}
                          </td>
                          <td className="px-2 py-3 align-middle text-slate-700">
                            {product?.unit?.name || '-'}
                          </td>
                          <td className="px-2 py-3 text-center align-middle">
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
                        className="px-2 py-6 text-center text-slate-500"
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
        products={products}
      />
    </Fragment>
  );
};

