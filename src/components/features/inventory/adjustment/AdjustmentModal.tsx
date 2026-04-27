import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import { Modal } from '../../../common/Modal';
import { FormField, Input, Textarea, Button } from '../../../common/FormControls';
import { SearchableSelect } from '../../../common/SearchableSelect';
import {
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  PackageIcon,
} from '../../../../assets/icons/Icons';
import { ProductSelectionModal } from '../../products/ProductSelectionModal';
import {
  Product,
  StockAdjustment as StockAdjustmentType,
  Warehouse as WarehouseType,
} from '@/src/types/entity/app.interface';
import { WarehouseType as WarehouseTypeEnum } from '@/src/types/enums/inventory';

type Mode = 'create' | 'edit';

interface AdjustmentModalProps {
  isOpen: boolean;
  mode: Mode;
  initialValues?: StockAdjustmentType | null;
  viewOnly?: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => void | Promise<void>;
  warehouses: WarehouseType[];
  products: Product[];
  stockMap: Record<string, Record<string, number>>;
}

interface AdjustmentItem {
  id: number;
  productId: string;
  originalQuantity: number;
  adjustedQuantity: number | '';
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  mode,
  initialValues,
  viewOnly = false,
  onClose,
  onSubmit,
  warehouses,
  products,
  stockMap,
}) => {
  const isEditMode = mode === 'edit' && !viewOnly;
  const isViewMode = viewOnly;

  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [mainReason, setMainReason] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState<Date>(new Date());
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [warehouseError, setWarehouseError] = useState('');
  const [reasonError, setReasonError] = useState('');

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );
  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w.id === warehouseId) || null,
    [warehouseId, warehouses]
  );

  // Reset / hydrate
  useEffect(() => {
    if (!isOpen) return;
    setWarehouseError('');
    setReasonError('');

    if (mode === 'edit' && initialValues) {
      setWarehouseId(initialValues.warehouse_id || '');
      setMainReason(initialValues.reason || '');
      setAdjustmentDate(
        initialValues.created_at ? new Date(initialValues.created_at) : new Date(),
      );
      const hydrated: AdjustmentItem[] = (initialValues.items || []).map(
        (it: any, idx: number) => {
          const before = Number(it.qty_before ?? 0);
          const adj = Number(it.qty_adjustment ?? 0);
          return {
            id: Date.now() + idx,
            productId: it.product_id,
            originalQuantity: before,
            adjustedQuantity: before + adj,
          };
        },
      );
      setItems(hydrated);
    } else {
      setItems([]);
      setWarehouseId('');
      setMainReason('');
      setAdjustmentDate(new Date());
    }
  }, [isOpen, mode, initialValues]);

  const handleAddProducts = (productIds: string[]) => {
    const newItems: AdjustmentItem[] = productIds.map((pid) => {
      const current = stockMap[warehouseId]?.[pid] ?? 0;
      return {
        id: Date.now() + Math.random(),
        productId: pid,
        originalQuantity: current,
        adjustedQuantity: '',
      };
    });
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (
    id: number,
    field: keyof AdjustmentItem,
    value: string | number,
  ) => {
    const newItems = items.map((item) => {
      if (item.id === id) {
        const updated = { ...item };
        if (field === 'adjustedQuantity') {
          updated[field] = value === '' ? '' : Number(value);
        } else {
          (updated as Record<string, unknown>)[field] = value;
        }
        return updated;
      }
      return item;
    });
    setItems(newItems);
  };

  const validateRequired = (opts: { requireReason: boolean }) => {
    let ok = true;
    if (!warehouseId) {
      setWarehouseError('กรุณาเลือกคลังสินค้า');
      ok = false;
    } else {
      setWarehouseError('');
    }
    if (opts.requireReason && !mainReason.trim()) {
      setReasonError('กรุณากรอกเหตุผลในการปรับปรุง');
      ok = false;
    } else {
      setReasonError('');
    }
    return ok;
  };

  const buildPayload = (status: 'DRAFT' | 'PENDING') => {
    const adjustmentItems = items
      .map((item) => {
        const diff = Number(item.adjustedQuantity) - Number(item.originalQuantity);
        return {
          product_id: item.productId,
          adjustment_type: diff >= 0 ? 'INCREASE' : 'DECREASE',
          quantity: Math.abs(diff),
        };
      })
      .filter((it) => it.quantity > 0);

    const payload: any = {
      warehouse_id: warehouseId,
      reason: mainReason,
      status,
      items: adjustmentItems,
    };
    if (mode === 'edit' && initialValues?.id) {
      payload.id = initialValues.id;
    }
    return payload;
  };

  const submitWithStatus = (status: 'DRAFT' | 'PENDING') => {
    const requireReason = status === 'PENDING';
    if (!validateRequired({ requireReason })) return;

    if (status === 'PENDING') {
      const adjustmentItems = items
        .map((item) => Number(item.adjustedQuantity) - Number(item.originalQuantity))
        .filter((diff) => diff !== 0);
      if (adjustmentItems.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'ไม่มีรายการปรับปรุง',
          text: 'จำนวนที่ปรับปรุงต้องต่างจากจำนวนปัจจุบันอย่างน้อย 1 รายการ',
        });
        return;
      }
    }

    onSubmit(buildPayload(status));
    onClose();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitWithStatus('PENDING');
  };

  const handleSaveDraft = () => {
    submitWithStatus('DRAFT');
  };

  const productsInWarehouse = useMemo(() => {
    if (!selectedWarehouse) return [];
    const whId = selectedWarehouse.id;
    return products.filter((p) => (stockMap[whId]?.[p.id] ?? 0) >= 0);
  }, [selectedWarehouse, products, stockMap]);

  const existingProductIds = useMemo(
    () => items.map((item) => item.productId),
    [items]
  );

  const code = (initialValues as { adjustment_code?: string })?.adjustment_code;
  const title = isViewMode
    ? 'รายละเอียดใบปรับปรุงสต็อก'
    : isEditMode
      ? 'แก้ไขใบปรับปรุงสต็อก'
      : 'สร้างใบปรับปรุงสต็อก';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="5xl"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" type="button" onClick={onClose}>
              {isViewMode ? 'ปิด' : 'ยกเลิก'}
            </Button>
            {!isViewMode && (
              <>
                <Button variant="secondary" type="button" onClick={handleSaveDraft}>
                  บันทึกฉบับร่าง
                </Button>
                <Button variant="primary" type="submit" form="adjustment-form">
                  ส่งเพื่ออนุมัติ
                </Button>
              </>
            )}
          </div>
        }
      >
        <form id="adjustment-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Document Information Section */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
              <DocumentTextIcon className="w-4 h-4 text-slate-500" />
              ข้อมูลเอกสาร
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="วันที่" htmlFor="adjustment-date">
                <DatePicker
                  selected={adjustmentDate}
                  onChange={(d: Date | null) => d && setAdjustmentDate(d)}
                  dateFormat="dd/MM/yyyy"
                  locale="th"
                  placeholderText="dd/mm/yyyy"
                  disabled={isEditMode || isViewMode}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  wrapperClassName="w-full"
                  required
                />
              </FormField>
              {(isEditMode || isViewMode) && code && (
                <FormField label="เลขที่เอกสารปรับปรุง" htmlFor="adjustment-code">
                  <Input
                    id="adjustment-code"
                    type="text"
                    value={code}
                    disabled
                    className="bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </FormField>
              )}
              <FormField label="ผู้ทำรายการ" htmlFor="created-by">
                <Input
                  id="created-by"
                  type="text"
                  value="ผู้ดูแลระบบ"
                  readOnly
                  className="bg-white text-slate-500 cursor-not-allowed"
                />
              </FormField>
            </div>
          </div>

          {/* Warehouse + Reason Section */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
              <PackageIcon className="w-4 h-4 text-slate-500" />
              ข้อมูลการปรับปรุง
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="p-3 bg-blue-50/50 rounded-md border border-blue-100">
                <FormField label="คลังสินค้า" htmlFor="warehouse">
                  <SearchableSelect
                    value={warehouseId}
                    onChange={(v) => {
                      setWarehouseId(v);
                      if (v) setWarehouseError('');

                      // Auto-seed: เมื่อเลือกคลังในโหมด "สร้าง" → ดึงสินค้าในคลังมาเป็น default
                      if (mode === 'create' && v) {
                        const stocks = stockMap[v] || {};
                        const seedRows: AdjustmentItem[] = Object.entries(stocks)
                          .filter(([, qty]) => Number(qty) > 0)
                          .map(([productId, qty], idx) => ({
                            id: Date.now() + idx,
                            productId,
                            originalQuantity: Number(qty),
                            adjustedQuantity: '',
                          }));
                        setItems(seedRows);
                      } else {
                        setItems([]);
                      }
                    }}
                    placeholder="เลือกคลังสินค้า"
                    disabled={isEditMode || isViewMode}
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
            </div>
            <div className="mt-4">
              <FormField label="เหตุผลในการปรับปรุง" htmlFor="main-reason">
                <Textarea
                  id="main-reason"
                  value={mainReason}
                  onChange={(e) => {
                    setMainReason(e.target.value);
                    if (e.target.value.trim()) setReasonError('');
                  }}
                  rows={2}
                  disabled={isViewMode}
                  className="bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  placeholder="ระบุเหตุผลการปรับปรุง..."
                />
                {reasonError && (
                  <p className="mt-1 text-xs text-red-600">{reasonError}</p>
                )}
              </FormField>
            </div>
          </div>

          {/* Items Section */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-slate-500" />
                รายการปรับปรุง
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {items.length} รายการ
                </span>
              </h4>
              {!isViewMode && (
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => setIsProductModalOpen(true)}
                  disabled={!warehouseId}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-all ${
                    !warehouseId
                      ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-500'
                      : 'bg-primary hover:bg-primary/90 text-white'
                  }`}
                  title={!warehouseId ? 'กรุณาเลือกคลังก่อนเพิ่มสินค้า' : 'เพิ่มสินค้า'}
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>เพิ่มสินค้า</span>
                </Button>
              )}
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-lg shadow-sm">
              <table className="min-w-full text-sm text-center">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-16">ลำดับ</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">รหัสสินค้า</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">ชื่อสินค้า</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-32">สต็อกปัจจุบัน</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-32">
                      จำนวนที่นับได้ <span className="text-red-500">*</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-24">ผลต่าง</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-32">สต็อกหลังปรับปรุง</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">หน่วย</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.length > 0 ? (
                    items.map((item, index) => {
                      const product = productMap.get(item.productId);
                      const difference =
                        typeof item.adjustedQuantity === 'number'
                          ? item.adjustedQuantity - item.originalQuantity
                          : 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 align-middle text-slate-700 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700 font-medium">
                            {product?.code || '-'}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-800 font-medium">
                            {product?.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700 font-medium">
                            {item.originalQuantity}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {isViewMode ? (
                              <span className="text-slate-700 font-medium">
                                {item.adjustedQuantity}
                              </span>
                            ) : (
                              <div className="flex justify-end">
                                <Input
                                  type="number"
                                  value={item.adjustedQuantity}
                                  onChange={(e) =>
                                    handleItemChange(item.id, 'adjustedQuantity', e.target.value)
                                  }
                                  className="!text-right !w-24 font-medium border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                                  min="0"
                                  required
                                />
                              </div>
                            )}
                          </td>
                          <td
                            className={`px-4 py-3 align-middle font-semibold ${
                              difference > 0
                                ? 'text-green-600'
                                : difference < 0
                                  ? 'text-red-600'
                                  : 'text-slate-700'
                            }`}
                          >
                            {difference > 0 ? `+${difference}` : difference}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700 font-medium">
                            {typeof item.adjustedQuantity === 'number'
                              ? item.adjustedQuantity
                              : '-'}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700 font-medium">
                            {(() => {
                              const u = product?.unit as { name?: string } | string | undefined;
                              if (typeof u === 'string') return u;
                              if (u && typeof u === 'object' && u.name) return u.name;
                              return '-';
                            })()}
                          </td>
                          <td className="px-4 py-3 align-middle">
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
                        colSpan={9}
                        className="px-6 py-12 text-center text-slate-400 bg-slate-50/50"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="p-3 bg-slate-100 rounded-full">
                            <PlusIcon className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="font-medium">ยังไม่มีรายการสินค้า</p>
                          {!isViewMode && (
                            <p className="text-sm">
                              กรุณาเลือกคลังและกดปุ่ม "เพิ่มสินค้า" เพื่อเริ่มรายการ
                            </p>
                          )}
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
