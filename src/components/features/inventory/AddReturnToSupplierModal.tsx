import type { FC, FormEvent, MouseEvent } from 'react';
import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Select, Button } from '../../common/FormControls';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';
import { ProductSelectionModal } from '../products/ProductSelectionModal';
import {
  ReturnToSupplier,
  ReturnToSupplierItem,
} from '@/src/types/entity/financial.interface';
import { Status } from '@/src/types/entity/core.interface';
import { Warehouse as WarehouseType } from '@/src/types/entity/inventory.interface';
import { Supplier } from '@/src/types/entity/supplier.interface';
import { Product } from '@/src/types/entity/package.interface';

interface AddReturnToSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateReturn: (returnToSupplier: Omit<ReturnToSupplier, 'id'>) => void;
  returns: ReturnToSupplier[];
  warehouses: WarehouseType[];
  suppliers: Supplier[];
  products: Product[];
}

interface LineItem {
  id: number;
  productId: string;
  quantity: number;
  reason: string;
}

export const AddReturnToSupplierModal: FC<AddReturnToSupplierModalProps> = ({
  isOpen,
  onClose,
  onCreateReturn,
  returns,
  warehouses,
  suppliers,
  products,
}) => {
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  // Auto-generate ID logic (mock)
  const generatedId = useMemo(() => {
    if (!isOpen) return '';

    const thaiYearLastTwoDigits = (new Date().getFullYear() + 543)
      .toString()
      .slice(-2);
    const prefix = `RTS${thaiYearLastTwoDigits}`;

    const returnsThisYear = returns.filter((r) => r.id.startsWith(prefix));

    const maxId = returnsThisYear.reduce((max, r) => {
      const num = parseInt(r.id.slice(5), 10); // Adjust slice index for RTS prefix (length 3 + 2 = 5?? No, RTS is 3 chars. RTS67 is 5 chars. Wait. GR67 is 4 chars. RTS is 3 chars.
      // RTS + 67 = 5 chars. so slice(5) is correct?
      // GR670001 -> GR is 2 chars. 67 is 2 chars. GR67 is 4 chars.
      // RTS670001 -> RTS is 3 chars. 67 is 2 chars. RTS67 is 5 chars.
      // So slice(5) is correct.
      // But wait, GR logic used slice(4). GR is 2 chars + 2 digit year = 4.
      // RTS is 3 chars + 2 digit year = 5. Correct.
      return num > max ? num : max;
    }, 0);

    const newIdNumber = maxId + 1;
    return `${prefix}${String(newIdNumber).padStart(4, '0')}`;
  }, [isOpen, returns]);

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setSelectedWarehouseId('');
    }
  }, [isOpen]);

  const handleAddProducts = (productIds: string[]) => {
    const newItems: LineItem[] = productIds.map((pid) => ({
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
    field: keyof LineItem,
    value: string | number
  ) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const createReturnObject = (
    status: Status,
    formData: FormData
  ): Omit<ReturnToSupplier, 'id'> => {
    const returnItems: ReturnToSupplierItem[] = items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      reason: item.reason,
    }));

    return {
      reference_id: (formData.get('reference-id') as string) || undefined,
      supplier_id: formData.get('supplier') as string, // Required
      warehouse_id: selectedWarehouseId,
      status: status,
      created_at: formData.get('return-date') as string,
      created_by: 'ผู้ดูแลระบบ', // Mock
      updated_by: 'ผู้ดูแลระบบ',
      items: returnItems,
      remarks: (formData.get('remarks') as string) || undefined,
    };
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onCreateReturn(createReturnObject(Status.PendingApproval, formData));
    onClose();
  };

  const handleSaveDraft = (e: MouseEvent<HTMLButtonElement>) => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    onCreateReturn(createReturnObject(Status.Draft, formData));
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
        title="สร้างใบเบิกสินค้าคืนผู้จำหน่าย"
        size="5xl"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button variant="secondary" type="button" onClick={handleSaveDraft}>
              บันทึกฉบับร่าง
            </Button>
            <Button variant="primary" type="submit" form="add-rts-form">
              ส่งเพื่ออนุมัติ
            </Button>
          </div>
        }
      >
        <form
          ref={formRef}
          id="add-rts-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="เลขที่เอกสาร" htmlFor="return-id">
              <Input
                id="return-id"
                type="text"
                value={generatedId}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
            <FormField label="วันที่ทำรายการ" htmlFor="return-date">
              <Input
                name="return-date"
                id="return-date"
                type="date"
                defaultValue={new Date().toISOString().substring(0, 10)}
                required
              />
            </FormField>
            <FormField label="ผู้ทำรายการ" htmlFor="created-by">
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
            <FormField label="คืนจากคลัง" htmlFor="warehouse">
              <Select
                id="warehouse"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                required
              >
                <option value="">-- เลือกคลัง --</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                    {wh.type === 'รถ' && wh.license_plate
                      ? ` (${wh.license_plate})`
                      : ''}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="ผู้จำหน่ายที่จะคืน" htmlFor="supplier">
              <Select id="supplier" name="supplier" required>
                <option value="">-- เลือกผู้จำหน่าย --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField
            label="อ้างอิงเอกสารรับเข้า (GR) / อื่นๆ"
            htmlFor="reference-id"
          >
            <Input
              name="reference-id"
              id="reference-id"
              type="text"
              placeholder="เช่น GR670001"
            />
          </FormField>
          <FormField label="หมายเหตุ" htmlFor="remarks">
            <Input name="remarks" id="remarks" type="text" />
          </FormField>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-base font-semibold text-slate-800">
                รายการสินค้าที่จะคืน
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
                      จำนวนคืน<span className="text-red-500">*</span>
                    </th>
                    <th className="p-2 text-left font-medium text-slate-600">
                      สาเหตุการคืน
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
                              required
                            />
                          </td>
                          <td className="px-2 py-3 align-middle">
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
                              placeholder="ระบุสาเหตุ"
                            />
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
                        colSpan={7}
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
