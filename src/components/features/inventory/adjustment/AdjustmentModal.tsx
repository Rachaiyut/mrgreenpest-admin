import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import { Modal } from '../../../common/Modal';
import {
  FormField,
  Input,
  Select,
  Textarea,
  Button,
} from '../../../common/FormControls';
import { PlusIcon, TrashIcon } from '../../../../assets/icons/Icons';
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
  onClose,
  onSubmit,
  warehouses,
  products,
  stockMap,
}) => {
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [mainReason, setMainReason] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState<Date>(new Date());
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );
  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w.id === warehouseId) || null,
    [warehouseId, warehouses]
  );

  const isFormValid = useMemo(() => {
    return (
      warehouseId &&
      mainReason.trim() &&
      items.length > 0 &&
      items.every(
        (it) =>
          typeof it.adjustedQuantity === 'number' && it.adjustedQuantity >= 0
      )
    );
  }, [warehouseId, mainReason, items]);

  // Reset / hydrate ตามโหมด
  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'create') {
      setItems([]);
      setWarehouseId('');
      setMainReason('');
      setAdjustmentDate(new Date());
      return;
    }
    // mode === 'edit'
    if (initialValues) {
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาตรวจสอบ',
        text: 'กรุณากรอกข้อมูลให้ครบถ้วน: ต้องมีคลัง, เหตุผลหลัก, และมีสินค้าอย่างน้อย 1 รายการพร้อมจำนวนที่ปรับปรุง',
      });
      return;
    }

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

    if (adjustmentItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่มีรายการปรับปรุง',
        text: 'จำนวนที่ปรับปรุงต้องต่างจากจำนวนปัจจุบันอย่างน้อย 1 รายการ',
      });
      return;
    }

    const payload: any = {
      warehouse_id: warehouseId,
      reason: mainReason,
      items: adjustmentItems,
    };
    if (mode === 'edit' && initialValues?.id) {
      payload.id = initialValues.id;
    }

    onSubmit(payload);
    onClose();
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
  const title =
    mode === 'create'
      ? 'สร้างใบปรับปรุง Stock'
      : `แก้ไขใบปรับปรุง Stock${code ? ` — ${code}` : ''}`;

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
              ยกเลิก
            </Button>
            <Button variant="primary" type="submit" form="adjustment-form">
              บันทึก
            </Button>
          </div>
        }
      >
        <form id="adjustment-form" onSubmit={handleSubmit} className="space-y-6">
          <div
            className={`grid grid-cols-1 ${mode === 'edit' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}
          >
            {mode === 'edit' && code && (
              <FormField label="เลขที่เอกสาร" htmlFor="adjustment-id">
                <Input
                  id="adjustment-id"
                  type="text"
                  value={code}
                  readOnly
                  className="bg-slate-100"
                />
              </FormField>
            )}
            <FormField label="วันที่" htmlFor="adjustment-date">
              <DatePicker
                selected={adjustmentDate}
                onChange={(d: Date | null) => d && setAdjustmentDate(d)}
                dateFormat="dd/MM/yyyy"
                locale="th"
                placeholderText="dd/mm/yyyy"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
                wrapperClassName="w-full"
                disabled={mode === 'edit'}
                required
              />
            </FormField>
            <FormField label="คลังสินค้า" htmlFor="warehouse">
              <Select
                id="warehouse"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                disabled={mode === 'edit'}
                required
              >
                <option value="">-- เลือกคลัง --</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                    {wh.type === WarehouseTypeEnum.VEHICLE &&
                    wh.vehicle?.vehicle_registration
                      ? ` (${wh.vehicle.vehicle_registration})`
                      : ''}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="เหตุผลหลักในการปรับปรุง" htmlFor="main-reason">
            <Textarea
              id="main-reason"
              value={mainReason}
              onChange={(e) => setMainReason(e.target.value)}
              required
            />
          </FormField>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-base font-semibold text-slate-800">รายการปรับปรุง</h4>
              <Button
                variant="primary"
                type="button"
                onClick={() => setIsProductModalOpen(true)}
                disabled={!warehouseId}
                title={!warehouseId ? 'กรุณาเลือกคลังก่อน' : 'เพิ่มสินค้า'}
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
                    <th className="p-2 text-center font-medium text-slate-600">ลำดับ</th>
                    <th className="p-2 text-left font-medium text-slate-600">รหัสสินค้า</th>
                    <th className="p-2 text-left font-medium text-slate-600">สินค้า</th>
                    <th className="p-2 text-center font-medium text-slate-600">จำนวนปัจจุบัน</th>
                    <th className="p-2 text-center font-medium text-slate-600">
                      จำนวนที่ปรับปรุง<span className="text-red-500">*</span>
                    </th>
                    <th className="p-2 text-center font-medium text-slate-600">ผลต่าง</th>
                    <th className="p-2 text-center font-medium text-slate-600">หน่วย</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((item, index) => {
                      const product = productMap.get(item.productId);
                      const difference =
                        typeof item.adjustedQuantity === 'number'
                          ? item.adjustedQuantity - item.originalQuantity
                          : 0;
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-slate-200 last:border-b-0"
                        >
                          <td className="p-2 align-middle text-center text-slate-700">{index + 1}</td>
                          <td className="p-2 align-middle text-slate-700">{product?.code || '-'}</td>
                          <td className="p-2 align-middle font-medium text-slate-800">{product?.name || 'N/A'}</td>
                          <td className="p-2 align-middle text-center text-slate-700">{item.originalQuantity}</td>
                          <td className="p-2 align-middle">
                            <Input
                              type="number"
                              value={item.adjustedQuantity}
                              onChange={(e) =>
                                handleItemChange(item.id, 'adjustedQuantity', e.target.value)
                              }
                              className="!w-14 !px-2 h-9 mx-auto text-center text-sm"
                              min="0"
                              required
                            />
                          </td>
                          <td
                            className={`p-2 align-middle text-center font-semibold ${
                              difference > 0
                                ? 'text-green-600'
                                : difference < 0
                                  ? 'text-red-600'
                                  : 'text-slate-700'
                            }`}
                          >
                            {difference > 0 ? `+${difference}` : difference}
                          </td>
                          <td className="p-2 align-middle text-center text-slate-700">
                            {(() => {
                              const u = product?.unit as { name?: string } | string | undefined;
                              if (typeof u === 'string') return u;
                              if (u && typeof u === 'object' && u.name) return u.name;
                              return '-';
                            })()}
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
                      <td colSpan={8} className="text-center py-10 text-slate-500">
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
