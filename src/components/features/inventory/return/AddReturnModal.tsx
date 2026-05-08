import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Swal from '@/src/utils/swal';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import { Modal } from '../../../common/Modal';
import { Input, Button } from '../../../common/FormControls';
import { SearchableSelect } from '../../../common/SearchableSelect';
import {
  PlusIcon,
  TrashIcon,
  TruckIcon,
  ArrowRightIcon,
  DocumentCheckIcon,
  CalendarDaysIcon,
} from '../../../../assets/icons/Icons';
import { ProductSelectionModal } from '../../products/ProductSelectionModal';
import {
  ProductReturn as ReturnType,
  Status,
  Warehouse as WarehouseEntity,
  Product,
} from '@/src/types/entity/app.interface';
import { WarehouseType as InventoryWarehouseType } from '@/src/types/enums/inventory';
import { WarehouseApi } from '../../../../api/warehouse';

interface AddReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateReturn: (returnData: Omit<ReturnType, 'id'>) => void;
  returns: ReturnType[];
  warehouses: WarehouseEntity[];
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().substring(0, 10)
  );

  const [localStockMap, setLocalStockMap] = useState<
    Record<string, Record<string, number>>
  >({});
  const [vehicleWarehouseOptions, setVehicleWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [mainWarehouseOptions, setMainWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await WarehouseApi.getWarehousesWithItems();
      if (res && res.data) {
        const allWarehouses = res.data;
        const newStockMap: Record<string, Record<string, number>> = {};

        allWarehouses.forEach((w: any) => {
          const warehouseStock: Record<string, number> = {};
          const stockItems = Array.isArray(w.stock)
            ? w.stock
            : Array.isArray(w.stock_balances)
              ? w.stock_balances
              : [];

          stockItems.forEach((s: any) => {
            const productId = s.product_id || s.product?.id;
            const quantity =
              typeof s.quantity === 'string'
                ? parseFloat(s.quantity)
                : Number(s.quantity);

            if (productId && !isNaN(quantity)) {
              warehouseStock[productId] = quantity;
            }
          });
          newStockMap[w.id] = warehouseStock;
        });
        setLocalStockMap(newStockMap);

        const vehicleWhs = allWarehouses
          .filter((w: any) => w.type === InventoryWarehouseType.VEHICLE)
          .map((w: any) => {
            const licensePlate =
              w.vehicle?.vehicle_registration || w.licensePlate || '';
            return {
              value: w.id,
              label: licensePlate ? `${w.name} (${licensePlate})` : w.name,
            };
          });
        setVehicleWarehouseOptions(vehicleWhs);

        const mainWhs = allWarehouses
          .filter(
            (w: any) =>
              w.type === InventoryWarehouseType.MAIN ||
              w.type === InventoryWarehouseType.SUB
          )
          .map((w: any) => ({ value: w.id, label: w.name }));
        setMainWarehouseOptions(mainWhs);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
      // Fallback to props
      setVehicleWarehouseOptions(
        warehouses
          .filter(
            (w) =>
              (w as unknown as Record<string, string>).type === 'รถ' ||
              w.type === InventoryWarehouseType.VEHICLE
          )
          .map((w) => {
            const wExt = w as unknown as Record<string, Record<string, string>>;
            const licensePlate =
              wExt.vehicle?.vehicle_registration ||
              (wExt.licensePlate as unknown as string) ||
              '';
            return {
              value: w.id,
              label: licensePlate ? `${w.name} (${licensePlate})` : w.name,
            };
          })
      );
      setMainWarehouseOptions(
        warehouses
          .filter(
            (w) =>
              (w as unknown as Record<string, string>).type === 'คลัง' ||
              w.type === InventoryWarehouseType.MAIN ||
              w.type === InventoryWarehouseType.SUB
          )
          .map((w) => ({ value: w.id, label: w.name }))
      );
    }
  }, [warehouses]);

  const effectiveStockMap = useMemo(() => {
    if (Object.keys(localStockMap).length > 0) return localStockMap;
    return stockMap;
  }, [stockMap, localStockMap]);

  const fromWarehouse = useMemo(
    () =>
      warehouses.find((w) => w.id === fromWarehouseId) ||
      vehicleWarehouseOptions.find((opt) => opt.value === fromWarehouseId) ||
      null,
    [fromWarehouseId, warehouses, vehicleWarehouseOptions]
  );

  const productsInWarehouse = useMemo(() => {
    if (!fromWarehouseId) return [];
    return products.filter(
      (p) => (effectiveStockMap[fromWarehouseId]?.[p.id] || 0) > 0
    );
  }, [fromWarehouseId, products, effectiveStockMap]);

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
      setReturnDate(new Date().toISOString().substring(0, 10));
      setErrors({});
      fetchWarehouses();
    }
  }, [isOpen, fetchWarehouses]);

  const handleAddProducts = (productIds: string[]) => {
    const newItems: ReturnItem[] = productIds.map((pid) => ({
      id: Date.now() + Math.random(),
      productId: pid,
      quantity: 1,
      reason: '',
    }));
    setItems((prev) => [...prev, ...newItems]);
    setIsProductModalOpen(false);
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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!fromWarehouseId) newErrors.fromWarehouse = 'กรุณาเลือกคลังต้นทาง (รถ)';
    if (!toWarehouseId) newErrors.toWarehouse = 'กรุณาเลือกคลังปลายทาง';
    if (items.length === 0) newErrors.items = 'กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ';
    items.forEach((item) => {
      if (item.quantity <= 0) newErrors[`quantity_${item.id}`] = 'กรุณากรอกจำนวน';
      if (!item.reason.trim()) newErrors[`reason_${item.id}`] = 'กรุณากรอกเหตุผล';
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => {
        const el = document.querySelector('.text-red-500.text-xs, .text-red-600.text-\\[10px\\], .text-red-500.text-\\[10px\\]');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const newReturn: any = {
      createdAt: new Date(returnDate).toISOString(),
      warehouse_id: toWarehouseId,
      vehicle_id: fromWarehouseId,
      return_reason: items[0]?.reason || 'คืนสินค้า',
      withdrawalRefId: withdrawalRefId || undefined,
      createdBy: 'ผู้ดูแลระบบ',
      items: items.map((item) => {
        const product = productMap.get(item.productId);
        // Ensure unit is a string, handle if it's an object or undefined
        let unitName = 'หน่วย';
        if (product?.unit) {
          if (typeof product.unit === 'string') {
            unitName = product.unit;
          } else if (
            typeof product.unit === 'object' &&
            (product.unit as unknown as Record<string, string>).name
          ) {
            unitName = (product.unit as unknown as Record<string, string>).name;
          }
        }

        return {
          product_id: item.productId,
          product_name: product?.name || '',
          quantity: Number(item.quantity),
          unit: unitName,
          reason: item.reason,
        };
      }),
      status: Status.Pending,
    };
    onCreateReturn(newReturn);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="สร้างใบคืนสินค้า"
        size="5xl"
        footer={
          <div className="flex flex-col sm:flex-row w-full sm:justify-between sm:items-center gap-2">
            <div className="flex items-center text-xs sm:text-sm text-slate-500">
              <span>* จำเป็นต้องกรอกข้อมูลที่มีเครื่องหมายดอกจัน</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                className="py-2 px-3 sm:px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300 text-sm"
              >
                ยกเลิก
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="add-return-form"
                className="py-2 px-4 sm:px-6 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm transition-all text-sm"
              >
                บันทึก
              </Button>
            </div>
          </div>
        }
      >
        <form
          id="add-return-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          {/* Logistics Header Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <TruckIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                การคืนสินค้า
              </h3>

              <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">
                    เลขที่:
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {generatedId}
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer whitespace-nowrap">
                  <CalendarDaysIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 font-medium">
                    วันที่คืน:
                  </span>
                  <DatePicker
                    selected={returnDate ? new Date(returnDate) : null}
                    onChange={(date: Date | null) => setReturnDate(date ? date.toISOString().substring(0, 10) : '')}
                    dateFormat="dd/MM/yyyy"
                    locale="th"
                    placeholderText="dd/mm/yyyy"
                    showCalendarIcon={false}
                    className="bg-transparent border-none p-0 text-slate-800 font-bold focus:ring-0 text-sm w-32 cursor-pointer"
                    wrapperClassName="w-full"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100 mb-4">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                  คืนจาก (รถ) <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  required
                  value={fromWarehouseId}
                  onChange={(v) => { setFromWarehouseId(v); if (errors.fromWarehouse) setErrors((prev) => { const next = { ...prev }; delete next.fromWarehouse; return next; }); }}
                  placeholder="เลือกคลังสินค้า (รถ)"
                  options={vehicleWarehouseOptions}
                  className="w-full bg-white shadow-sm border-slate-200"
                />
                {errors.fromWarehouse && <p className="text-red-500 text-xs mt-1">{errors.fromWarehouse}</p>}
              </div>

              <div className="flex items-center justify-center pt-6 text-slate-300">
                <ArrowRightIcon className="w-5 h-5 hidden md:block text-slate-400" />
                <ArrowRightIcon className="w-5 h-5 rotate-90 md:hidden text-slate-400" />
              </div>

              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                  คืนเข้า (คลัง) <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={toWarehouseId}
                  onChange={(v) => { setToWarehouseId(v); if (errors.toWarehouse) setErrors((prev) => { const next = { ...prev }; delete next.toWarehouse; return next; }); }}
                  placeholder="เลือกคลังสินค้า"
                  options={mainWarehouseOptions}
                  className="w-full bg-white shadow-sm border-slate-200"
                  required
                />
                {errors.toWarehouse && <p className="text-red-500 text-xs mt-1">{errors.toWarehouse}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                อ้างอิงใบเบิก (ถ้ามี)
              </label>
              <Input
                value={withdrawalRefId}
                onChange={(e) => setWithdrawalRefId(e.target.value)}
                placeholder="กรอกเลขที่ใบเบิก"
                className="w-full bg-white shadow-sm border-slate-200"
              />
            </div>
          </div>

          {/* Items List Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[250px]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <DocumentCheckIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    รายการสินค้าคืน
                  </h3>
                  <p className="text-xs text-slate-500">
                    สินค้าที่ต้องการคืนเข้าคลัง
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsProductModalOpen(true); if (errors.items) setErrors((prev) => { const next = { ...prev }; delete next.items; return next; }); }}
                disabled={!fromWarehouseId}
                title={!fromWarehouseId ? 'กรุณาเลือกรถต้นทางก่อน' : ''}
                className="flex items-center gap-1 bg-primary/10 text-primary font-semibold py-1 px-2 rounded-md text-sm"
              >
                <PlusIcon className="h-4 w-4" />
                เพิ่มสินค้า
              </button>
            </div>

            <div className="grow overflow-y-auto bg-slate-50/30 p-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                  <div className="bg-slate-50 p-4 rounded-full mb-3 border border-dashed border-slate-200 animate-pulse">
                    <TruckIcon className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="font-medium text-slate-600 text-sm">
                    ยังไม่มีรายการสินค้า
                  </p>
                  <p className="text-xs mt-1 text-slate-400">
                    กดปุ่ม "เพิ่มสินค้า" เพื่อเลือกจากคลัง
                  </p>
                  {errors.items && <p className="text-red-500 text-xs font-medium mt-2">{errors.items}</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-5">รายละเอียดสินค้า</div>
                    <div className="col-span-2 text-right">จำนวนคืน</div>
                    <div className="col-span-4">เหตุผลการคืน</div>
                    <div className="col-span-1 text-center">ลบ</div>
                  </div>

                  {items.map((item) => {
                    const product = productMap.get(item.productId);
                    const currentStock =
                      effectiveStockMap[fromWarehouseId]?.[item.productId] ?? 0;
                    const isOverStock = item.quantity > currentStock;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all shadow-sm group ${
                          isOverStock
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 sm:items-center">
                          {/* Product Info */}
                          <div className="sm:col-span-5">
                            <div className="font-bold text-slate-800 text-sm">
                              {product?.name || 'Unknown Product'}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Code: {product?.id?.substring(0, 8)}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                ในรถ: {currentStock.toLocaleString()}{' '}
                                {product?.unit?.name || '-'}
                              </span>
                            </div>
                          </div>

                          {/* Quantity + Reason + Delete row on mobile */}
                          <div className="sm:col-span-2 flex items-center sm:flex-col sm:items-end gap-2 sm:gap-1">
                            <div className="relative flex-1 sm:flex-none sm:w-full">
                              <Input
                                type="number"
                                min="1"
                                max={currentStock}
                                value={item.quantity}
                                onChange={(e) => {
                                  handleItemChange(item.id, 'quantity', Number(e.target.value));
                                  if (errors[`quantity_${item.id}`]) setErrors((prev) => { const next = { ...prev }; delete next[`quantity_${item.id}`]; return next; });
                                }}
                                className="w-full text-right transition-all h-9 text-sm font-bold pr-8 border-slate-200 focus:border-indigo-500"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
                                {product?.unit?.name || 'หน่วย'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="sm:hidden text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="ลบรายการ"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                            {isOverStock && (
                              <span className="text-[10px] font-bold text-red-600">
                                เกินสต็อกที่มี
                              </span>
                            )}
                            {errors[`quantity_${item.id}`] && !isOverStock && (
                              <span className="text-[10px] font-bold text-red-600">
                                {errors[`quantity_${item.id}`]}
                              </span>
                            )}
                          </div>

                          {/* Reason Input */}
                          <div className="sm:col-span-4">
                            <Input
                              type="text"
                              placeholder="กรอกเหตุผลการคืน..."
                              value={item.reason}
                              onChange={(e) => {
                                handleItemChange(item.id, 'reason', e.target.value);
                                if (errors[`reason_${item.id}`]) setErrors((prev) => { const next = { ...prev }; delete next[`reason_${item.id}`]; return next; });
                              }}
                              className="w-full text-sm h-9 border-slate-200 focus:border-indigo-500"
                            />
                            {errors[`reason_${item.id}`] && <p className="text-red-500 text-[10px] mt-1">{errors[`reason_${item.id}`]}</p>}
                          </div>

                          {/* Delete Button - desktop only */}
                          <div className="hidden sm:col-span-1 sm:flex justify-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                              title="ลบรายการ"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <ProductSelectionModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        products={productsInWarehouse}
        onAddProducts={handleAddProducts}
        existingProductIds={items.map((i) => i.productId)}
        disableFetch={true}
      />
    </>
  );
};
