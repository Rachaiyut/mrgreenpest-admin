// ===== React =====
import type { FC, FormEvent, MouseEvent } from 'react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DatePicker from '@/src/components/common/BuddhistDatePicker';

// ===== API =====
import { SupplierApi } from '@/src/api/supplier';

// ===== Types / Enums =====
import { WarehouseType as WarehouseTypeEnum } from '@/src/types/enums/inventory';
import {
  GoodsReceive as GoodsReceiveType,
  Product as ProductType,
  Supplier as SupplierType,
  Warehouse as WarehouseType,
} from '@/src/types/entity/app.interface';

// ===== Components =====
import { Modal } from '../../../common/Modal';
import { FormField, Input, Button } from '../../../common/FormControls';
import { SearchableSelect } from '../../../common/SearchableSelect';
import { ProductSelectionModal } from '../../products/ProductSelectionModal';

// ===== Assets =====
import {
  DocumentTextIcon,
  PackageIcon,
  PlusIcon,
  TrashIcon,
  TruckIcon,
} from '../../../../assets/icons/Icons';

interface AddGoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateReceipt: (receipt: Omit<GoodsReceiveType, 'id'>) => void;
  onUpdateReceipt?: (receipt: GoodsReceiveType) => void;
  editingReceipt?: GoodsReceiveType | null;
  viewOnly?: boolean;
  receipts: GoodsReceiveType[];
  warehouses: WarehouseType[];
  suppliers: SupplierType[];
  products: ProductType[];
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
  onUpdateReceipt,
  editingReceipt,
  viewOnly = false,
  warehouses,
  suppliers,
  products,
}) => {
  const isEditMode = !!editingReceipt && !viewOnly;
  const isViewMode = viewOnly && !!editingReceipt;
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [warehouseError, setWarehouseError] = useState('');
  const [supplierError, setSupplierError] = useState('');
  const [receiptNoError, setReceiptNoError] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [extraSuppliers, setExtraSuppliers] = useState<SupplierType[]>([]);
  const supplierSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const searchSuppliers = useCallback(async (query: string) => {
    try {
      const q = (query || '').trim();
      if (!q) {
        setExtraSuppliers([]);
        return;
      }
      const res = await SupplierApi.getSuppliers({ search: q, limit: 10, page: 1, is_active: true });
      if (res?.data) setExtraSuppliers(res.data as SupplierType[]);
    } catch (e) {
      console.error('Failed to search suppliers', e);
    }
  }, []);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  useEffect(() => {
    if (!isOpen) return;

    setWarehouseError('');
    setSupplierError('');
    setReceiptNoError('');

    if (editingReceipt) {
      setSelectedWarehouseId(editingReceipt.warehouse_id || '');
      setSelectedSupplierId(editingReceipt.supplier_id || '');
      setReferenceId(editingReceipt.receipt_no || '');
      const sourceItems = (editingReceipt.items || []) as Array<{
        id?: string;
        product_id: string;
        qty_received?: number;
        qty_ordered?: number;
      }>;
      setItems(
        sourceItems.map((it, idx) => ({
          id: Date.now() + idx,
          productId: it.product_id,
          quantityOrdered: it.qty_ordered ?? it.qty_received ?? 1,
          quantityReceived: it.qty_received ?? 1,
        })),
      );
    } else {
      setItems([]);
      setSelectedWarehouseId('');
      setSelectedSupplierId('');
      setReferenceId('');
    }
  }, [isOpen, editingReceipt]);

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

  const buildPayload = (status: 'DRAFT' | 'PENDING', formData: FormData) => {
    const receiptItems = items.map((item) => ({
      product_id: item.productId,
      qty_ordered: item.quantityOrdered,
      qty_received: item.quantityReceived,
    }));

    return {
      receipt_no: (formData.get('reference-id') as string) || undefined,
      supplier_id: selectedSupplierId || undefined,
      warehouse_id: selectedWarehouseId,
      status,
      items: receiptItems,
    };
  };

  const validateRequired = () => {
    let ok = true;
    if (!selectedWarehouseId) {
      setWarehouseError('กรุณาเลือกคลังปลายทาง');
      ok = false;
    } else {
      setWarehouseError('');
    }
    if (!selectedSupplierId) {
      setSupplierError('กรุณาเลือกผู้จัดจำหน่าย');
      ok = false;
    } else {
      setSupplierError('');
    }
    if (referenceId.length > 10) {
      setReceiptNoError('เลขที่อ้างอิงเอกสารต้องไม่เกิน 10 ตัวอักษร');
      ok = false;
    } else {
      setReceiptNoError('');
    }
    return ok;
  };

  const submitWithStatus = (status: 'DRAFT' | 'PENDING', formData: FormData) => {
    if (!validateRequired()) return;

    const payload = buildPayload(status, formData);
    if (isEditMode && editingReceipt && onUpdateReceipt) {
      onUpdateReceipt({
        ...editingReceipt,
        ...payload,
      } as unknown as GoodsReceiveType);
    } else {
      onCreateReceipt(payload as unknown as Omit<GoodsReceiveType, 'id'>);
    }
    onClose();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitWithStatus('PENDING', new FormData(e.currentTarget));
  };

  const handleSaveDraft = (_e: MouseEvent<HTMLButtonElement>) => {
    if (!formRef.current) return;
    submitWithStatus('DRAFT', new FormData(formRef.current));
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
        title={
          isViewMode
            ? 'รายละเอียดใบรับสินค้าเข้า'
            : isEditMode
            ? 'แก้ไขใบรับสินค้าเข้า'
            : 'สร้างใบรับสินค้าเข้า'
        }
        size="5xl"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              {isViewMode ? 'ปิด' : 'ยกเลิก'}
            </Button>
            {!isViewMode && (
              <>
                <Button variant="secondary" type="button" onClick={handleSaveDraft}>
                  บันทึกฉบับร่าง
                </Button>
                <Button variant="primary" type="submit" form="add-receipt-form">
                  ส่งเพื่ออนุมัติ
                </Button>
              </>
            )}
          </div>
        }
      >
        <form
          ref={formRef}
          id="add-receipt-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Document Information Section */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
              <DocumentTextIcon className="w-4 h-4 text-slate-500" />
              ข้อมูลเอกสาร
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField label="วันที่รับสินค้าเข้า" htmlFor="receipt-date">
                <DatePicker
                  selected={new Date()}
                  onChange={() => {}}
                  dateFormat="dd/MM/yyyy"
                  locale="th"
                  placeholderText="dd/mm/yyyy"
                  disabled={isViewMode}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  wrapperClassName="w-full"
                  required
                />
              </FormField>
              <FormField label="เลขที่อ้างอิงเอกสาร" htmlFor="reference-id">
                <Input
                  name="reference-id"
                  id="reference-id"
                  type="text"
                  placeholder="เช่น PO-12345"
                  className="bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  maxLength={10}
                  disabled={isViewMode}
                  value={referenceId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setReferenceId(v);
                    if (v.length <= 10) setReceiptNoError('');
                    else setReceiptNoError('เลขที่อ้างอิงเอกสารต้องไม่เกิน 10 ตัวอักษร');
                  }}
                />
                {receiptNoError && (
                  <p className="mt-1 text-xs text-red-600">{receiptNoError}</p>
                )}
              </FormField>
              <FormField label="ผู้ทำรับ" htmlFor="created-by">
                <Input
                  id="created-by"
                  name="createdBy"
                  type="text"
                  value="ผู้ดูแลระบบ"
                  readOnly
                  className="bg-white text-slate-500 cursor-not-allowed"
                />
              </FormField>
              {(isEditMode || isViewMode) && editingReceipt?.code && (
                <FormField label="เลขที่เอกสารใบรับเข้า" htmlFor="receipt-code">
                  <Input
                    id="receipt-code"
                    type="text"
                    value={editingReceipt.code}
                    disabled
                    className="bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </FormField>
              )}
            </div>
          </div>

          {/* Logistics Section */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
              <TruckIcon className="w-4 h-4 text-slate-500" />
              <span>ข้อมูลการขนส่ง</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-3 bg-blue-50/50 rounded-md border border-blue-100">
                <FormField
                  label="รับเข้าคลัง"
                  htmlFor="warehouse"
                >
                  <SearchableSelect
                    value={selectedWarehouseId}
                    onChange={(v) => {
                      setSelectedWarehouseId(v);
                      if (v) setWarehouseError('');
                      // ไม่ auto-populate items อีกแล้ว — ผู้ใช้กดปุ่ม "เพิ่มสินค้า" เอง
                    }}
                    placeholder="เลือกคลังปลายทาง"
                    name="warehouse"
                    disabled={isViewMode}
                    options={warehouses.map((wh) => ({
                      value: wh.id,
                      label: `${wh.name}${wh.type === WarehouseTypeEnum.VEHICLE && wh.vehicle?.vehicle_registration ? ` (${wh.vehicle.vehicle_registration})` : ''}`,
                    }))}
                  />
                  {warehouseError && (
                    <p className="mt-1 text-xs text-red-600">{warehouseError}</p>
                  )}
                </FormField>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-md border border-amber-100">
                <FormField label="ผู้จัดจำหน่าย" htmlFor="supplier">
                  <SearchableSelect
                    value={selectedSupplierId}
                    onChange={(v) => {
                      setSelectedSupplierId(v);
                      if (v) setSupplierError('');
                    }}
                    onSearchChange={(q) => {
                      if (supplierSearchTimerRef.current) clearTimeout(supplierSearchTimerRef.current);
                      supplierSearchTimerRef.current = setTimeout(() => searchSuppliers(q), 300);
                    }}
                    placeholder="เลือกผู้จัดจำหน่าย"
                    name="supplier"
                    disabled={isViewMode}
                    options={(() => {
                      const map = new Map<string, string>();
                      for (const s of [...suppliers, ...extraSuppliers]) {
                        if (!map.has(s.id)) map.set(s.id, s.name);
                      }
                      return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
                    })()}
                  />
                  {supplierError && (
                    <p className="mt-1 text-xs text-red-600">{supplierError}</p>
                  )}
                </FormField>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-slate-500" />
                รายการสินค้า
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {items.length} รายการ
                </span>
              </h4>
              {!isViewMode && (
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => setIsProductModalOpen(true)}
                  disabled={!selectedWarehouseId}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-all ${
                    !selectedWarehouseId
                      ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-500'
                      : 'bg-primary hover:bg-primary/90 text-white'
                  }`}
                  title={
                    !selectedWarehouseId
                      ? 'กรุณาเลือกคลังก่อนเพิ่มสินค้า'
                      : 'เพิ่มสินค้า'
                  }
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>เพิ่มสินค้า</span>
                </Button>
              )}
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-lg shadow-sm">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-16">
                      ลำดับ
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-600">
                      รหัสสินค้า
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-600">
                      สินค้า
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-32">
                      สั่งซื้อ <span className="text-red-500">*</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-32">
                      รับจริง <span className="text-red-500">*</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-600">
                      หน่วย
                    </th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.length > 0 ? (
                    items.map((item, index) => {
                      const product = item.productId
                        ? productMap.get(item.productId)
                        : null;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3 align-top text-slate-700 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 align-top text-slate-700 font-medium">
                            {product?.code || '-'}
                          </td>
                          <td className="px-4 py-3 align-top text-slate-800 font-medium">
                            {product?.name || 'Unknown Product'}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {isViewMode ? (
                              <span className="text-slate-700 font-medium">{item.quantityOrdered}</span>
                            ) : (
                              <div className="flex justify-end">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantityOrdered}
                                  onChange={(e) =>
                                    handleItemChange(
                                      item.id,
                                      'quantityOrdered',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="!text-right !w-24 font-medium border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {isViewMode ? (
                              <span className="text-slate-700 font-medium">{item.quantityReceived}</span>
                            ) : (
                              <div className="flex justify-end">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.quantityReceived}
                                  onChange={(e) =>
                                    handleItemChange(
                                      item.id,
                                      'quantityReceived',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className={`!text-right !w-24 font-bold border-2 ${
                                    item.quantityReceived !== item.quantityOrdered
                                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                                      : 'border-green-200 bg-green-50 text-green-700'
                                  }`}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-slate-700 font-medium">
                            {product?.unit?.name || 'หน่วย'}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {!isViewMode && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-red-500 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
                                title="ลบรายการ"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-slate-400 bg-slate-50/50"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="p-3 bg-slate-100 rounded-full">
                            <PlusIcon className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="font-medium">ยังไม่มีรายการสินค้า</p>
                          <p className="text-sm">
                            กรุณาเลือกคลังและกดปุ่ม "เพิ่มสินค้า"
                            เพื่อเริ่มรายการ
                          </p>
                        </div>
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
