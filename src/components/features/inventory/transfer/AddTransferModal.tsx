import React, { useState, useEffect, useMemo } from 'react';
import Swal from '@/src/utils/swal';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import { Modal } from '../../../common/Modal';
import { FormField, Input, Textarea, Button } from '../../../common/FormControls';
import { SearchableSelect } from '../../../common/SearchableSelect';

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
  Warehouse,
  Product,
} from '@/src/types/entity/app.interface';
import { WarehouseType } from '@/src/types/enums/inventory';

import { WarehouseApi } from '@/src/api/warehouse';

interface AddTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTransfer: (transfer: Omit<TransferType, 'id'>) => void;
  onUpdateTransfer?: (transfer: TransferType) => void;
  editingTransfer?: TransferType | null;
  viewOnly?: boolean;
  transfers: TransferType[];
  warehouses: Warehouse[];
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
  onUpdateTransfer,
  editingTransfer,
  viewOnly = false,
  transfers,
  warehouses,
  products,
  stockMap,
}) => {
  const isEditMode = !!editingTransfer && !viewOnly;
  const isViewMode = viewOnly && !!editingTransfer;
  const [items, setItems] = useState<LineItem[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [reason, setReason] = useState('');
  const [fromWarehouseError, setFromWarehouseError] = useState('');
  const [toWarehouseError, setToWarehouseError] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [fetchedStock, setFetchedStock] = useState<Record<string, number>>({});
  const [loadingStock, setLoadingStock] = useState(false);

  const [transferDate, setTransferDate] = useState('');

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const fromWarehouse = useMemo(
    () => warehouses.find((w) => w.id === fromWarehouseId) || null,
    [fromWarehouseId, warehouses]
  );

  useEffect(() => {
    if (fromWarehouseId) {
      setLoadingStock(true);
      WarehouseApi.getStockBalances(fromWarehouseId)
        .then((res: any) => {
          const stocks = (res.data || res) as unknown[];
          const map: Record<string, number> = {};
          const seedRows: LineItem[] = [];
          if (Array.isArray(stocks)) {
            stocks.forEach((s: any, idx: number) => {
              // Backend now returns product_id in attributes, but also check s.product.id as fallback
              const productId = s.product_id || s.product?.id;
              if (productId) {
                const qty = Number(s.quantity);
                map[productId] = qty;
                if (qty > 0) {
                  seedRows.push({
                    id: Date.now() + idx,
                    productId,
                    quantity: 1,
                  });
                }
              }
            });
          }
          setFetchedStock(map);

          // Auto-seed items จากสินค้าในคลัง (เฉพาะตอนสร้างใหม่ และยังไม่มี items)
          if (!isEditMode && !isViewMode && items.length === 0 && seedRows.length > 0) {
            setItems(seedRows);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch stock balances:', err);
          setFetchedStock({});
        })
        .finally(() => {
          setLoadingStock(false);
        });
    } else {
      setFetchedStock({});
    }
  }, [fromWarehouseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const productsInWarehouse = useMemo(() => {
    if (!fromWarehouse) return [];

    // Use fetched stock instead of stockMap prop
    return products.filter((p) => (fetchedStock[p.id] || 0) > 0);
  }, [fromWarehouse, products, fetchedStock]);

  const generatedId = useMemo(() => {
    if (!isOpen) return '';

    const thaiYearLastTwoDigits = (new Date().getFullYear() + 543)
      .toString()
      .slice(-2);
    const prefix = `IT${thaiYearLastTwoDigits}`;

    const transfersThisYear = transfers.filter((t: any) =>
      (t.code || t.id)?.startsWith(prefix)
    );

    const maxId = transfersThisYear.reduce((max, t: any) => {
      const idStr = t.code || t.id;
      const num = parseInt(idStr.slice(4), 10);
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
    if (!isOpen) return;

    setFromWarehouseError('');
    setToWarehouseError('');
    setReasonError('');

    if (editingTransfer) {
      setFromWarehouseId(editingTransfer.from_warehouse_id || '');
      setToWarehouseId(editingTransfer.to_warehouse_id || '');
      setReason(editingTransfer.remark || '');
      const td = (editingTransfer as { transfer_date?: string }).transfer_date
        || editingTransfer.created_at
        || new Date().toISOString();
      setTransferDate(new Date(td).toISOString().substring(0, 10));
      const sourceItems = (editingTransfer.items || []) as Array<{
        id?: string;
        product_id: string;
        qty?: number;
        quantity?: number;
      }>;
      setItems(
        sourceItems.map((it, idx) => ({
          id: Date.now() + idx,
          productId: it.product_id,
          quantity: Number(it.qty ?? it.quantity ?? 1),
        })),
      );
    } else {
      setItems([]);
      setFromWarehouseId('');
      setToWarehouseId('');
      setReason('');
      setTransferDate(new Date().toISOString().substring(0, 10));
    }
  }, [isOpen, editingTransfer]);

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

  const buildPayload = (status: 'DRAFT' | 'PENDING') => ({
    from_warehouse_id: fromWarehouseId,
    to_warehouse_id: toWarehouseId,
    remark: reason,
    transfer_date: transferDate,
    status,
    items: items.map((item) => ({
      product_id: item.productId,
      qty: Number(item.quantity),
    })),
  });

  const validateRequired = (opts: { requireReason: boolean }) => {
    let ok = true;
    if (!fromWarehouseId) {
      setFromWarehouseError('กรุณาเลือกคลังต้นทาง');
      ok = false;
    } else {
      setFromWarehouseError('');
    }
    if (!toWarehouseId) {
      setToWarehouseError('กรุณาเลือกคลังปลายทาง');
      ok = false;
    } else {
      setToWarehouseError('');
    }
    if (opts.requireReason && !reason.trim()) {
      setReasonError('กรุณากรอกเหตุผลในการโอนย้าย');
      ok = false;
    } else {
      setReasonError('');
    }
    return ok;
  };

  const submitWithStatus = (status: 'DRAFT' | 'PENDING') => {
    const payload = buildPayload(status);
    if (isEditMode && editingTransfer && onUpdateTransfer) {
      onUpdateTransfer({
        ...editingTransfer,
        ...payload,
      } as unknown as TransferType);
    } else {
      onCreateTransfer(payload as unknown as Omit<TransferType, 'id'>);
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateRequired({ requireReason: true })) {
      setTimeout(() => {
        const el = document.querySelector('.text-red-500.text-xs');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    if (items.length === 0 || items.some((item) => item.quantity <= 0)) {
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'ต้องมีสินค้าอย่างน้อย 1 รายการที่จำนวนมากกว่า 0' });
      return;
    }
    submitWithStatus('PENDING');
  };

  const handleSaveDraft = () => {
    if (!validateRequired({ requireReason: false })) {
      setTimeout(() => {
        const el = document.querySelector('.text-red-500.text-xs');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    submitWithStatus('DRAFT');
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
        title={
          isViewMode
            ? 'รายละเอียดใบโอนย้ายสินค้า'
            : isEditMode
            ? 'แก้ไขใบโอนย้ายสินค้า'
            : 'สร้างใบโอนย้ายสินค้า'
        }
        size="4xl"
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
                <Button variant="primary" type="submit" form="add-transfer-form">
                  ส่งเพื่ออนุมัติ
                </Button>
              </>
            )}
          </div>
        }
      >
        <form
          id="add-transfer-form"
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
              <FormField label="วันที่โอนย้าย" htmlFor="transfer-date">
                <DatePicker
                  selected={transferDate ? new Date(transferDate) : null}
                  onChange={(date: Date | null) => setTransferDate(date ? date.toISOString().substring(0, 10) : '')}
                  dateFormat="dd/MM/yyyy"
                  locale="th"
                  placeholderText="dd/mm/yyyy"
                  disabled={isViewMode}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  wrapperClassName="w-full"
                  required
                />
              </FormField>
              {(isEditMode || isViewMode) && editingTransfer?.code && (
                <FormField label="เลขที่เอกสารโอนย้าย" htmlFor="transfer-code">
                  <Input
                    id="transfer-code"
                    type="text"
                    value={editingTransfer.code}
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
              <div className="p-3 bg-amber-50/50 rounded-md border border-amber-100">
                <FormField label="คลังต้นทาง *" htmlFor="from-warehouse">
                  <SearchableSelect
                    value={fromWarehouseId}
                    onChange={(newFromId) => {
                      setFromWarehouseId(newFromId);
                      setItems([]);
                      if (newFromId) setFromWarehouseError('');
                      if (newFromId && newFromId === toWarehouseId) {
                        setToWarehouseId('');
                      }
                    }}
                    placeholder="เลือกคลังต้นทาง"
                    disabled={isViewMode}
                    options={warehouses.map((wh) => ({
                      value: wh.id,
                      label: `${wh.name}${wh.type === WarehouseType.VEHICLE && wh.vehicle?.vehicle_registration ? ` (${wh.vehicle.vehicle_registration})` : ''}`,
                    }))}
                  />
                  {fromWarehouseError && (
                    <p className="text-red-500 text-xs mt-1">{fromWarehouseError}</p>
                  )}
                </FormField>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-md border border-blue-100">
                <FormField
                  label="คลังปลายทาง *"
                  htmlFor="to-warehouse"
                >
                  <SearchableSelect
                    value={toWarehouseId}
                    onChange={(v) => {
                      setToWarehouseId(v);
                      if (v) setToWarehouseError('');
                    }}
                    placeholder="เลือกคลังปลายทาง"
                    disabled={isViewMode}
                    options={warehouses
                      .filter((wh) => wh.id !== fromWarehouseId)
                      .map((wh) => ({
                        value: wh.id,
                        label: `${wh.name}${wh.type === WarehouseType.VEHICLE && wh.vehicle?.vehicle_registration ? ` (${wh.vehicle.vehicle_registration})` : ''}`,
                      }))}
                  />
                  {toWarehouseError && (
                    <p className="text-red-500 text-xs mt-1">{toWarehouseError}</p>
                  )}
                </FormField>
              </div>
            </div>
            <div className="mt-4">
              <FormField label="เหตุผลในการโอนย้าย *" htmlFor="reason">
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (e.target.value.trim()) setReasonError('');
                  }}
                  rows={2}
                  disabled={isViewMode}
                  className="bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  placeholder="กรอกสาเหตุการโอนย้าย..."
                />
                {reasonError && (
                  <p className="text-red-500 text-xs mt-1">{reasonError}</p>
                )}
              </FormField>
            </div>
          </div>

          {/* Items Section */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
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
                  disabled={!fromWarehouseId}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-all ${
                    !fromWarehouseId
                      ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-500'
                      : 'bg-primary hover:bg-primary/90 text-white'
                  }`}
                  title={
                    !fromWarehouseId ? 'กรุณาเลือกคลังต้นทางก่อน' : 'เพิ่มสินค้า'
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
                      ชื่อสินค้า
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-32">
                      คงคลัง
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-32">
                      จำนวนโอนย้าย <span className="text-red-500">*</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-600">
                      หน่วยนับ
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
                      const currentStock = fetchedStock[item.productId] ?? 0;
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
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                currentStock > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {currentStock}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            {isViewMode ? (
                              <span className="text-slate-700 font-medium">{item.quantity}</span>
                            ) : (
                              <div className="flex justify-end">
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
                                  className="!text-right !w-24 font-medium border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                                  min="1"
                                  max={currentStock}
                                  required
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-slate-700 font-medium">
                            {typeof product?.unit === 'object'
                              ? product.unit.name
                              : product?.unit || 'หน่วย'}
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
                            กรุณาเลือกคลังต้นทางและกดปุ่ม "เพิ่มสินค้า"
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
        products={productsInWarehouse}
      />
    </>
  );
};
