import type { FC, FormEvent, MouseEvent } from 'react';
import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import { Modal } from '../../../common/Modal';
import { FormField, Input, Button, Textarea } from '../../../common/FormControls';
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
  ReturnToSupplier,
  ReturnToSupplierItem,
} from '@/src/types/entity/financial.interface';
import { Warehouse as WarehouseType } from '@/src/types/entity/inventory.interface';
import { WarehouseType as WarehouseTypeEnum } from '@/src/types/enums/inventory';
import { Supplier } from '@/src/types/entity/supplier.interface';
import { Product } from '@/src/types/entity/product.interface';
import { GoodsReceiptApi } from '@/src/api/goods-receipt';
import { WarehouseApi } from '@/src/api/warehouse';

interface AddReturnToSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateReturn: (returnToSupplier: Omit<ReturnToSupplier, 'id'>) => void;
  onUpdateReturn?: (returnToSupplier: ReturnToSupplier) => void;
  editingReturn?: ReturnToSupplier | null;
  viewOnly?: boolean;
  returns: ReturnToSupplier[];
  warehouses: WarehouseType[];
  suppliers: Supplier[];
  products: Product[];
}

interface LineItem {
  id: number;
  productId: string;
  quantity: number | '';
  qtyReceived?: number; // จำนวนที่รับมา (จาก GR)
}

export const AddReturnToSupplierModal: FC<AddReturnToSupplierModalProps> = ({
  isOpen,
  onClose,
  onCreateReturn,
  onUpdateReturn,
  editingReturn,
  viewOnly = false,
  warehouses,
  suppliers,
  products,
}) => {
  const isEditMode = !!editingReturn && !viewOnly;
  const isViewMode = viewOnly && !!editingReturn;
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [returnDate, setReturnDate] = useState<Date>(new Date());

  const [warehouseError, setWarehouseError] = useState('');
  const [supplierError, setSupplierError] = useState('');
  const [returnReasonError, setReturnReasonError] = useState('');

  const [grSearch, setGrSearch] = useState('');
  const [grOptions, setGrOptions] = useState<Array<{ id: string; code: string; warehouse_id?: string; supplier_id?: string; items?: Array<{ product_id: string; qty_received?: number }> }>>([]);
  const [isLoadingGr, setIsLoadingGr] = useState(false);
  const grSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stock balances ในคลังที่เลือก: product_id → quantity
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  useEffect(() => {
    if (!isOpen) return;
    setWarehouseError('');
    setSupplierError('');
    setReturnReasonError('');
    setGrSearch('');
    setGrOptions([]);
    setStockMap({});

    if (editingReturn) {
      setSelectedWarehouseId((editingReturn as { warehouse_id?: string }).warehouse_id || '');
      setSelectedSupplierId(editingReturn.supplier_id || '');
      setReferenceId((editingReturn as { reference_id?: string }).reference_id || '');
      setRemarks(
        (editingReturn as { return_reason?: string; remarks?: string }).return_reason
          || editingReturn.remarks
          || '',
      );
      const created = editingReturn.created_at ? new Date(editingReturn.created_at) : new Date();
      setReturnDate(created);
      const sourceItems = (editingReturn.items || []) as Array<{
        product_id: string;
        quantity?: number;
        qty?: number;
      }>;
      setItems(
        sourceItems.map((it, idx) => ({
          id: Date.now() + idx,
          productId: it.product_id,
          quantity: Number(it.quantity ?? it.qty ?? 0) || '',
        })),
      );
    } else {
      setItems([]);
      setSelectedWarehouseId('');
      setSelectedSupplierId('');
      setReferenceId('');
      setRemarks('');
      setReturnDate(new Date());
    }
  }, [isOpen, editingReturn]);

  // ถ้าเป็น view/edit + มี reference_id (เลข GR) → ดึงใบ GR มา merge qty_received เข้า items
  // และ seed grOptions ให้ SearchableSelect แสดง code ที่ถูกเลือกได้ตั้งแต่เปิด modal
  useEffect(() => {
    if (!isOpen || !editingReturn) return;
    const code = (editingReturn as { reference_id?: string }).reference_id;
    if (!code) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await GoodsReceiptApi.getAll({ search: code, limit: 5 });
        if (cancelled) return;
        const list = (res?.data || []) as Array<{
          id: string;
          code: string;
          warehouse_id?: string;
          supplier_id?: string;
          items?: Array<{ product_id: string; qty_received?: number }>;
        }>;
        const matched = list.find((g) => g.code === code);
        if (!matched) return;

        // seed dropdown options เพื่อให้ค่าที่ถูกเลือกแสดง code ในช่อง SearchableSelect
        setGrOptions((prev) => {
          if (prev.find((o) => o.id === matched.id)) return prev;
          return [matched, ...prev];
        });

        // merge qty_received → items
        const grItems = (matched.items || []) as Array<{ product_id: string; qty_received?: number }>;
        const qtyMap = new Map<string, number>();
        grItems.forEach((g) => {
          if (g.product_id) qtyMap.set(g.product_id, Number(g.qty_received ?? 0));
        });
        setItems((prev) =>
          prev.map((it) => ({
            ...it,
            qtyReceived: qtyMap.get(it.productId),
          })),
        );
      } catch (err) {
        console.error('Failed to load referenced GR', err);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, editingReturn]);

  // ดึง stock balance ของคลังที่เลือก
  useEffect(() => {
    if (!isOpen || !selectedWarehouseId) {
      setStockMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await WarehouseApi.getStockBalances(selectedWarehouseId);
        if (cancelled) return;
        const stocks = (res as { data?: unknown[] })?.data ?? (res as unknown[]);
        const map: Record<string, number> = {};
        if (Array.isArray(stocks)) {
          stocks.forEach((s: any) => {
            const productId = s.product_id || s.product?.id;
            if (productId) map[productId] = Number(s.quantity);
          });
        }
        setStockMap(map);
      } catch (err) {
        console.error('Failed to fetch stock balances', err);
        setStockMap({});
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, selectedWarehouseId]);

  // Search GR by code (server-side)
  const searchGoodsReceipts = async (query: string) => {
    const q = query.trim();
    if (!q) {
      // ถ้า query ว่าง — เก็บเฉพาะใบที่เลือกอยู่ไว้ใน options (กันชื่อหายตอน SearchableSelect ปิด/รีเซ็ต)
      setGrOptions((prev) => prev.filter((o) => o.code === referenceId));
      return;
    }
    setIsLoadingGr(true);
    try {
      const res = await GoodsReceiptApi.getAll({ search: q, status: 'RECEIVED', limit: 10 });
      const fetched = (res?.data || []) as typeof grOptions;
      // รวม option ที่ผู้ใช้เลือกอยู่เข้าไปด้วย (เผื่อ result ที่ search กลับมาไม่ติด)
      setGrOptions((prev) => {
        const sticky = prev.filter((o) => o.code === referenceId && !fetched.find((f) => f.id === o.id));
        return [...sticky, ...fetched];
      });
    } catch (err) {
      console.error('Failed to search goods receipts', err);
    } finally {
      setIsLoadingGr(false);
    }
  };

  // เมื่อผู้ใช้เลือกใบ GR → prefill warehouse, supplier, items
  const handleSelectGr = async (grId: string) => {
    if (!grId) {
      setReferenceId('');
      return;
    }
    try {
      // ใช้ option ที่มีอยู่ก่อน (เร็วกว่า) ถ้ามีข้อมูลครบ
      const cached = grOptions.find((o) => o.id === grId);
      const gr = cached && cached.items?.length
        ? cached
        : ((await GoodsReceiptApi.getById(grId)) as unknown as typeof cached);

      if (!gr) return;

      setReferenceId(gr.code || '');

      // pin selected GR into options so SearchableSelect ยังเห็นค่านี้แม้ search จะถูก clear
      setGrOptions((prev) => {
        if (prev.find((o) => o.id === gr.id)) return prev;
        return [gr, ...prev];
      });

      if (gr.warehouse_id) {
        setSelectedWarehouseId(gr.warehouse_id);
        setWarehouseError('');
      }
      if (gr.supplier_id) {
        setSelectedSupplierId(gr.supplier_id);
        setSupplierError('');
      }
      const grItems = (gr.items || []) as Array<{ product_id: string; qty_received?: number }>;
      setItems(
        grItems.map((it, idx) => ({
          id: Date.now() + idx,
          productId: it.product_id,
          quantity: 1,
          qtyReceived: Number(it.qty_received ?? 0),
        })),
      );
    } catch (err) {
      console.error('Failed to load goods receipt', err);
    }
  };

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
    value: string | number,
  ) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        if (field === 'quantity') {
          return { ...item, quantity: value === '' ? '' : Number(value) };
        }
        return { ...item, [field]: value };
      }),
    );
  };

  const validateRequired = (opts: { requireItems: boolean; requireReason: boolean }) => {
    let ok = true;
    if (!selectedWarehouseId) {
      setWarehouseError('กรุณาเลือกคลังต้นทาง');
      ok = false;
    } else {
      setWarehouseError('');
    }
    if (!selectedSupplierId) {
      setSupplierError('กรุณาเลือกผู้จำหน่าย');
      ok = false;
    } else {
      setSupplierError('');
    }
    if (opts.requireReason && !remarks.trim()) {
      setReturnReasonError('กรุณากรอกเหตุผลในการโอนย้าย');
      ok = false;
    } else {
      setReturnReasonError('');
    }
    if (opts.requireItems && items.length === 0) {
      ok = false;
    }
    return ok;
  };

  const buildPayload = (status: 'DRAFT' | 'PENDING'): Omit<ReturnToSupplier, 'id'> => {
    const supplierName = suppliers.find((s) => s.id === selectedSupplierId)?.name || '';
    const returnReason = remarks.trim() || '-';

    const returnItems = items
      .filter((item) => Number(item.quantity) > 0)
      .map((item) => {
        const product = productMap.get(item.productId);
        const unitName =
          typeof product?.unit === 'object' && product?.unit?.name
            ? product.unit.name
            : (typeof product?.unit === 'string' ? product.unit : '-');
        return {
          product_id: item.productId,
          product_name: product?.name || '-',
          quantity: Number(item.quantity),
          unit: unitName,
        };
      });

    return {
      reference_id: referenceId || undefined,
      supplier_id: selectedSupplierId,
      supplier_name: supplierName,
      warehouse_id: selectedWarehouseId,
      return_reason: returnReason,
      notes: remarks || undefined,
      status,
      created_at: returnDate.toISOString(),
      created_by: 'ผู้ดูแลระบบ',
      updated_by: 'ผู้ดูแลระบบ',
      items: returnItems as unknown as ReturnToSupplierItem[],
      remarks: remarks || undefined,
    } as unknown as Omit<ReturnToSupplier, 'id'>;
  };

  const submitWithStatus = (status: 'DRAFT' | 'PENDING') => {
    const payload = buildPayload(status);
    if (isEditMode && editingReturn && onUpdateReturn) {
      onUpdateReturn({
        ...editingReturn,
        ...payload,
      } as unknown as ReturnToSupplier);
    } else {
      onCreateReturn(payload);
    }
    onClose();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateRequired({ requireItems: true, requireReason: true })) return;
    submitWithStatus('PENDING');
  };

  const handleSaveDraft = (_e: MouseEvent<HTMLButtonElement>) => {
    if (!validateRequired({ requireItems: false, requireReason: false })) return;
    submitWithStatus('DRAFT');
  };

  const existingProductIds = useMemo(
    () => items.map((item) => item.productId),
    [items],
  );

  return (
    <Fragment>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          isViewMode
            ? 'รายละเอียดใบเบิกสินค้าคืนผู้จำหน่าย'
            : isEditMode
            ? 'แก้ไขใบเบิกสินค้าคืนผู้จำหน่าย'
            : 'สร้างใบเบิกสินค้าคืนผู้จำหน่าย'
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
                <Button variant="primary" type="submit" form="add-rts-form">
                  ส่งเพื่ออนุมัติ
                </Button>
              </>
            )}
          </div>
        }
      >
        <form
          ref={formRef}
          id="add-rts-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Document Information Section */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
              <DocumentTextIcon className="w-4 h-4 text-slate-500" />
              ข้อมูลเอกสาร
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField label="วันที่ทำรายการ" htmlFor="return-date">
                <DatePicker
                  selected={returnDate}
                  onChange={(d: Date | null) => d && setReturnDate(d)}
                  dateFormat="dd/MM/yyyy"
                  locale="th"
                  placeholderText="dd/mm/yyyy"
                  disabled={isViewMode}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  wrapperClassName="w-full"
                  required
                />
              </FormField>
              {(isEditMode || isViewMode) && (editingReturn as { code?: string })?.code && (
                <FormField label="เลขที่เอกสาร" htmlFor="rts-code">
                  <Input
                    id="rts-code"
                    type="text"
                    value={(editingReturn as { code?: string })?.code || ''}
                    disabled
                    className="bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </FormField>
              )}
              <FormField
                label="อ้างอิงเอกสารรับเข้า (GR)"
                htmlFor="reference-id"
              >
                {isViewMode ? (
                  <Input
                    id="reference-id"
                    type="text"
                    value={referenceId}
                    disabled
                    className="bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                ) : (
                <SearchableSelect
                  value={grOptions.find((o) => o.code === referenceId)?.id || ''}
                  onChange={(grId) => handleSelectGr(grId)}
                  onSearchChange={(q) => {
                    setGrSearch(q);
                    if (grSearchTimerRef.current) clearTimeout(grSearchTimerRef.current);
                    grSearchTimerRef.current = setTimeout(() => searchGoodsReceipts(q), 300);
                  }}
                  placeholder="ค้นหา / เลือกเลขที่ใบรับเข้า"
                  options={grOptions.map((g) => ({
                    value: g.id,
                    label: g.code,
                    description: isLoadingGr && grSearch ? 'กำลังโหลด...' : undefined,
                  }))}
                />
                )}
              </FormField>
              <FormField label="ผู้สร้าง" htmlFor="created-by">
                <Input
                  id="created-by"
                  name="createdBy"
                  type="text"
                  value={(() => {
                    if (!editingReturn) return 'ระบบจะกำหนดอัตโนมัติ';
                    const u = (editingReturn as { creator?: { first_name?: string; last_name?: string; nick_name?: string } }).creator;
                    if (!u) return 'ไม่กรอก';
                    const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                    return full || u.nick_name || 'ไม่กรอก';
                  })()}
                  readOnly
                  className="bg-white text-slate-500 cursor-not-allowed"
                />
              </FormField>
            </div>
          </div>

          {/* Logistics Section */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
              <TruckIcon className="w-4 h-4 text-slate-500" />
              <span>ข้อมูลการคืน</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-3 bg-amber-50/50 rounded-md border border-amber-100">
                <FormField label="คืนจากคลัง" htmlFor="warehouse">
                  <SearchableSelect
                    value={selectedWarehouseId}
                    onChange={(v) => {
                      setSelectedWarehouseId(v);
                      if (v) setWarehouseError('');
                    }}
                    placeholder="เลือกคลัง"
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
              <div className="p-3 bg-blue-50/50 rounded-md border border-blue-100">
                <FormField label="ผู้จำหน่ายที่จะคืน" htmlFor="supplier">
                  <SearchableSelect
                    value={selectedSupplierId}
                    onChange={(v) => {
                      setSelectedSupplierId(v);
                      if (v) setSupplierError('');
                    }}
                    placeholder="เลือกผู้จำหน่าย"
                    name="supplier"
                    disabled={isViewMode}
                    options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                  />
                  {supplierError && (
                    <p className="mt-1 text-xs text-red-600">{supplierError}</p>
                  )}
                </FormField>
              </div>
            </div>
            <div className="mt-4">
              <FormField label="เหตุผลในการคืน" htmlFor="remarks">
                <Textarea
                  id="remarks"
                  name="remarks"
                  rows={2}
                  placeholder="กรอกเหตุผลในการคืนสินค้า..."
                  disabled={isViewMode}
                  className="bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  value={remarks}
                  onChange={(e) => {
                    setRemarks(e.target.value);
                    if (e.target.value.trim()) setReturnReasonError('');
                  }}
                />
                {returnReasonError && (
                  <p className="mt-1 text-xs text-red-600">{returnReasonError}</p>
                )}
              </FormField>
            </div>
          </div>

          {/* Items Section */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-slate-500" />
                รายการสินค้าที่จะคืน
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
              <table className="min-w-full text-sm text-center">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-16">ลำดับ</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">รหัสสินค้า</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">ชื่อสินค้า</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-32">จำนวนที่รับมา</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-32">จำนวนที่อยู่ในคลัง</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 w-32">
                      จำนวนคืน <span className="text-red-500">*</span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-600">หน่วยนับ</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.length > 0 ? (
                    items.map((item, index) => {
                      const product = item.productId
                        ? productMap.get(item.productId)
                        : null;
                      const currentStock = stockMap[item.productId] ?? 0;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3 align-middle text-slate-700 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700 font-medium">
                            {product?.code || '-'}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-800 font-medium">
                            {product?.name || 'Unknown Product'}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700 font-medium">
                            {item.qtyReceived !== undefined ? item.qtyReceived : '-'}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span
                              className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${
                                currentStock > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {currentStock}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {isViewMode ? (
                              <span className="text-slate-700 font-medium">{item.quantity}</span>
                            ) : (
                              <div className="flex justify-end">
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleItemChange(item.id, 'quantity', e.target.value)
                                  }
                                  placeholder="0"
                                  className="!text-right !w-24 font-medium border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                                  min="1"
                                  max={currentStock}
                                  required
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700 font-medium">
                            {product?.unit?.name || '-'}
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
                        colSpan={8}
                        className="px-6 py-12 text-center text-slate-400 bg-slate-50/50"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="p-3 bg-slate-100 rounded-full">
                            <PlusIcon className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="font-medium">ยังไม่มีรายการสินค้า</p>
                          <p className="text-sm">
                            กรุณาเลือกคลังและกดปุ่ม "เพิ่มสินค้า" เพื่อเริ่มรายการ
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
