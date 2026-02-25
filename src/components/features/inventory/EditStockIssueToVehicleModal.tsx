/**
 * @file EditWithdrawalModal.tsx
 * @description Modal component for editing a goods withdrawal with Source and Destination warehouses.
 */
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { Modal } from '../../common/Modal';
import { Input, Button } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import {
  PlusIcon,
  TrashIcon,
  XCircleIcon,
  ArrowRightIcon,
  UserIcon,
  TruckIcon,
  DocumentCheckIcon,
  CalendarDaysIcon,
} from '../../../assets/icons/Icons';
import { ProductSelectionModal } from '../products/ProductSelectionModal';
import {
  Withdrawal as WithdrawalType,
  User,
  Warehouse as WarehouseType,
  Product,
} from '@/src/types/entity/app.interface';
import {
  WarehouseType as InventoryWarehouseType,
  WithdrawalStatus,
} from '@/src/types/enums/inventory';
import { UserApi } from '../../../api/user';
import { WarehouseApi } from '../../../api/warehouse';

interface EditWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateWithdrawal: (withdrawal: WithdrawalType) => void;
  withdrawal: WithdrawalType | null;
  users: User[];
  warehouses: WarehouseType[];
  products: Product[];
  stockMap: Map<string, Map<string, number>>;
  currentUser?: User;
}

interface LineItem {
  id: string;
  productId: string;
  quantity: number;
}

interface ExpenseLineItem {
  id: string;
  description: string;
  amount: number | '';
}

export const EditStockIssueToVehicleModal: React.FC<EditWithdrawalModalProps> = ({
  isOpen,
  onClose,
  onUpdateWithdrawal,
  withdrawal,
  users,
  warehouses,
  products,
  stockMap,
  currentUser,
}) => {
  const fullCurrentUser = currentUser
    ? users.find((u) => u.id === currentUser.id)
    : null;

  // Form state
  const [goodsItems, setGoodsItems] = useState<LineItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseLineItem[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = useState(''); // คลังต้นทาง
  const [toWarehouseId, setToWarehouseId] = useState('');     // รถ/คลังปลายทาง
  const [requesterId, setRequesterId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [withdrawalDate, setWithdrawalDate] = useState<string>('');

  // UI & Options state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([]);
  const [sourceWarehouseOptions, setSourceWarehouseOptions] = useState<{ value: string; label: string }[]>([]);
  const [vehicleWarehouseOptions, setVehicleWarehouseOptions] = useState<{ value: string; label: string }[]>([]);
  const [destinationLimits, setDestinationLimits] = useState<Map<string, number>>(new Map());
  const [walletInfo, setWalletInfo] = useState<{ balance: number; expense_limit: number; } | null>(null);
  const [localStockMap, setLocalStockMap] = useState<Map<string, Map<string, number>>>(new Map());
  const [fetchedRequester, setFetchedRequester] = useState<User | null>(null);

  const techRoles = ['LEAD_TECH', 'TECH'];
  const isTechUser = fullCurrentUser && techRoles.includes(
    typeof fullCurrentUser.role === 'string' ? fullCurrentUser.role : (fullCurrentUser.role as any)?.name
  );

  const goodsFormRef = useRef<HTMLFormElement>(null);
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Fetch destination warehouse limits
  useEffect(() => {
    if (toWarehouseId) {
      WarehouseApi.getWarehouseById(toWarehouseId)
        .then((warehouse) => {
          const limits = new Map<string, number>();
          if (warehouse && Array.isArray(warehouse.withdrawal_limits)) {
            warehouse.withdrawal_limits.forEach((limit: any) => {
              if (limit.product_id) limits.set(limit.product_id, Number(limit.max_quantity));
            });
          }
          setDestinationLimits(limits);
        })
        .catch((err) => {
          console.error('Failed to fetch destination warehouse limits', err);
          setDestinationLimits(new Map());
        });
    } else {
      setDestinationLimits(new Map());
    }
  }, [toWarehouseId]);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await WarehouseApi.getWarehousesWithItems();
      if (res && res.data) {
        const allWarehouses = res.data;
        const newStockMap = new Map<string, Map<string, number>>();

        allWarehouses.forEach((w: any) => {
          const warehouseStock = new Map<string, number>();
          const stockItems = Array.isArray(w.stock) ? w.stock : Array.isArray(w.stock_balances) ? w.stock_balances : [];
          stockItems.forEach((s: any) => {
            const productId = s.product_id || s.product?.id;
            const quantity = typeof s.quantity === 'string' ? parseFloat(s.quantity) : Number(s.quantity);
            if (productId && !isNaN(quantity)) warehouseStock.set(productId, quantity);
          });
          newStockMap.set(w.id, warehouseStock);
        });
        setLocalStockMap(newStockMap);

        // ดึงข้อมูลคลังต้นทาง (Main/Sub)
        setSourceWarehouseOptions(allWarehouses
          .filter((w: any) => w.type === InventoryWarehouseType.MAIN || w.type === InventoryWarehouseType.SUB)
          .map((w: any) => ({ value: w.id, label: w.name })));

        // ดึงข้อมูลรถปลายทาง (Vehicle)
        setVehicleWarehouseOptions(allWarehouses
          .filter((w: any) => w.type === InventoryWarehouseType.VEHICLE)
          .map((w: any) => ({ value: w.id, label: w.name })));
      }
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
    }
  }, []);

  const effectiveStockMap = useMemo(() => localStockMap.size > 0 ? localStockMap : stockMap, [stockMap, localStockMap]);

  useEffect(() => {
    if (isOpen && withdrawal) {
      // ดึงข้อมูลจากกใบเบิกมาใส่ใน State
      setFromWarehouseId(withdrawal.warehouse_id || ''); // ต้นทาง
      setToWarehouseId(withdrawal.to_warehouse_id || ''); // ปลายทาง
      setRecipientId(withdrawal.recipient_id || withdrawal.requester_id || '');
      setRequesterId(withdrawal.requester_id || '');
      setWithdrawalDate(withdrawal.created_at ? new Date(withdrawal.created_at).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10));

      setGoodsItems(withdrawal.items ? withdrawal.items.map((item, idx) => ({
        id: `item-${idx}-${crypto.randomUUID()}`,
        productId: item.product_id,
        quantity: item.quantity,
      })) : []);

      setExpenseItems(withdrawal.expenses ? withdrawal.expenses.map((exp, idx) => ({
        id: `exp-${idx}-${crypto.randomUUID()}`,
        description: exp.description,
        amount: exp.amount,
      })) : []);

      fetchWarehouses();
    }
  }, [isOpen, withdrawal, fetchWarehouses]);

  useEffect(() => {
    if (users.length > 0) {
      setUserOptions(users.map((u) => ({
        value: u.id,
        label: `${u.first_name} ${u.last_name}${u.nick_name ? ` (${u.nick_name})` : ''}`,
      })));
    }
  }, [users]);

  useEffect(() => {
    if (isOpen && withdrawal) {
      // โหลดสต็อกล่าสุดจาก API ทันทีเมื่อเปิด Modal
      fetchWarehouses();

      setFromWarehouseId(withdrawal.warehouse_id || '');
      setToWarehouseId(withdrawal.to_warehouse_id || '');

      // ตั้งค่ารายการสินค้าจากข้อมูลที่ Api ส่งมาให้ (withdrawal)
      if (withdrawal.items) {
        setGoodsItems(withdrawal.items.map((item, idx) => ({
          id: `item-${idx}-${crypto.randomUUID()}`,
          productId: item.product_id,
          quantity: item.quantity,
        })));
      }
      // ... ค่าอื่นๆ
    }
  }, [isOpen, withdrawal, fetchWarehouses]); // มั่นใจว่ามี withdrawal ใน dependency

  useEffect(() => {
    if (users.length > 0) {
      setUserOptions(users.map((u) => ({
        value: u.id,
        label: `${u.first_name} ${u.last_name}${u.nick_name ? ` (${u.nick_name})` : ''}`,
      })));
    }
  }, [users]);

  useEffect(() => {
    if (isOpen && withdrawal) {
      // โหลดสต็อกล่าสุดจาก API ทันทีเมื่อเปิด Modal
      fetchWarehouses();

      setFromWarehouseId(withdrawal.warehouse_id || '');
      setToWarehouseId(withdrawal.to_warehouse_id || '');

      // ตั้งค่ารายการสินค้าจากข้อมูลที่ Api ส่งมาให้ (withdrawal)
      if (withdrawal.items) {
        setGoodsItems(withdrawal.items.map((item, idx) => ({
          id: `item-${idx}-${crypto.randomUUID()}`,
          productId: item.product_id,
          quantity: item.quantity,
        })));
      }
      // ... ค่าอื่นๆ
    }
  }, [isOpen, withdrawal, fetchWarehouses]); // มั่นใจว่ามี withdrawal ใน dependency

  const handleAddProducts = (productIds: string[]) => {
    const newItems: LineItem[] = productIds.map((pid) => ({ id: crypto.randomUUID(), productId: pid, quantity: 1 }));
    setGoodsItems((prev) => [...prev, ...newItems]);
    setIsProductModalOpen(false);
  };

  const handleRemoveGoodsItem = (id: string) => setGoodsItems((prev) => prev.filter((item) => item.id !== id));

  const handleGoodsItemChange = (id: string, field: keyof LineItem, value: any) => {
    setGoodsItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleAddExpense = () => setExpenseItems((prev) => [...prev, { id: crypto.randomUUID(), description: '', amount: '' }]);

  const handleRemoveExpenseItem = (id: string) => setExpenseItems((prev) => prev.filter((item) => item.id !== id));

  const handleExpenseItemChange = (id: string, field: keyof ExpenseLineItem, value: any) => {
    setExpenseItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const constructPayload = (status: WithdrawalStatus) => {
    if (!withdrawal) return null;

    // ดึงค่าหมายเหตุจาก textarea โดยตรงผ่าน ref หรือใช้ state
    const remarksValue = goodsFormRef.current?.querySelector<HTMLTextAreaElement>('textarea[name="remarks"]')?.value;

    return {
      ...withdrawal, // รักษาข้อมูลเดิมไว้ (เช่น id, code)
      warehouse_id: fromWarehouseId,      // คลังต้นทาง
      to_warehouse_id: toWarehouseId,    // คลัง/รถปลายทาง
      requester_id: requesterId,
      recipient_id: recipientId || undefined,
      items: goodsItems.map((item) => {
        const product = productMap.get(item.productId);
        return {
          product_id: item.productId,
          product_name: product?.name || '',
          quantity: item.quantity,
          unit: product?.unit?.symbol || 'หน่วย',
        };
      }),
      expenses: expenseItems.map((item) => ({
        description: item.description,
        amount: Number(item.amount)
      })),
      notes: remarksValue || withdrawal.notes, // อัปเดตหมายเหตุ
      status: status,
      updated_at: new Date().toISOString(), // เพิ่ม timestamp การแก้ไข
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = constructPayload(WithdrawalStatus.PENDING);
    if (payload) {
      onUpdateWithdrawal(payload as any);
      onClose();
    }
  };

  const handleSaveDraft = () => {
    const payload = constructPayload(WithdrawalStatus.DRAFT);
    if (payload) {
      onUpdateWithdrawal(payload as any);
      onClose();
    }
  };

  const isAnyItemOverLimit = useMemo(() => {
    return goodsItems.some((item) => {
      const limit = destinationLimits.get(item.productId);
      return limit !== undefined && item.quantity > limit;
    });
  }, [goodsItems, destinationLimits]);

  useEffect(() => {
    if (requesterId) {
      UserApi.getById(requesterId).then(setFetchedRequester).catch(() => {
        const found = users.find((u) => u.id === requesterId);
        if (found) setFetchedRequester(found);
      });
      UserApi.getWallet(requesterId).then(setWalletInfo).catch(() => setWalletInfo(null));
    } else {
      setFetchedRequester(null);
      setWalletInfo(null);
    }
  }, [requesterId, users]);

  const selectedRequester = useMemo(() => fetchedRequester || users.find((u) => u.id === requesterId), [fetchedRequester, requesterId, users]);
  const totalExpenses = useMemo(() => expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [expenseItems]);
  const isOverLimit = useMemo(() => {
    if (walletInfo && typeof walletInfo.balance === 'number') return totalExpenses > walletInfo.balance;
    if (!selectedRequester || typeof selectedRequester.creditLimit !== 'number') return false;
    return totalExpenses > selectedRequester.creditLimit;
  }, [totalExpenses, selectedRequester, walletInfo]);

  const existingProductIds = useMemo(
    () => Array.from(new Set(goodsItems.map((item) => item.productId))),
    [goodsItems]
  );

  const productsInWarehouse = useMemo(() => {
    if (!fromWarehouseId) return [];
    const stock = effectiveStockMap.get(fromWarehouseId);
    if (!stock) return [];
    return products.filter((p) => (stock.get(p.id) || 0) > 0);
  }, [fromWarehouseId, products, effectiveStockMap]);

  if (!withdrawal) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`แก้ไขใบเบิกสินค้า/อุปกรณ์ ${withdrawal.code || ''}`}
        size="5xl"
        footer={
          <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>* จำเป็นต้องกรอกข้อมูลที่มีเครื่องหมายดอกจัน</span>
              {(isOverLimit || isAnyItemOverLimit) && (
                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  ⚠️ การดำเนินการนี้จะต้องได้รับการอนุมัติ
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300">ยกเลิก</Button>
              {withdrawal.status === WithdrawalStatus.DRAFT && (
                <Button variant="secondary" type="button" onClick={handleSaveDraft} className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium">บันทึกฉบับร่าง</Button>
              )}
              <Button
                variant="primary"
                type="submit"
                form="edit-goods-withdrawal-form"
                className={`py-2 px-6 rounded-lg text-white font-semibold shadow-sm transition-all ${isOverLimit || isAnyItemOverLimit ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/90'}`}
              >
                {isAnyItemOverLimit || isOverLimit ? 'ส่งเพื่อขออนุมัติ' : 'บันทึก'}
              </Button>
            </div>
          </div>
        }
      >
        <form ref={goodsFormRef} id="edit-goods-withdrawal-form" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            {/* 1. Logistics Header Card - แสดงทั้งต้นทางและปลายทาง */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><TruckIcon className="w-5 h-5" /></div>
                <h3 className="text-base font-semibold text-slate-800">การเคลื่อนย้ายสินค้า</h3>
                <div className="ml-auto flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
                  <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">วันที่เบิก:</span>
                  <input type="date" value={withdrawalDate} onChange={(e) => setWithdrawalDate(e.target.value)} className="bg-transparent border-none p-0 text-slate-800 font-bold focus:ring-0 text-sm w-32 cursor-pointer" required />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                {/* ช่องเลือกคลังต้นทาง */}
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">เบิกจากคลัง (ต้นทาง) <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={sourceWarehouseOptions}
                    value={fromWarehouseId}
                    onChange={setFromWarehouseId}
                    placeholder="เลือกคลังสินค้า"
                    required
                    className="w-full bg-white shadow-sm border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-center pt-6 text-slate-300">
                  <ArrowRightIcon className="w-5 h-5 text-slate-400" />
                </div>

                {/* ช่องเลือกรถปลายทาง */}
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ไปยังคลัง/รถ (ปลายทาง)</label>
                  <SearchableSelect
                    options={vehicleWarehouseOptions}
                    value={toWarehouseId}
                    onChange={setToWarehouseId}
                    placeholder="เลือกรถบริการ (ถ้ามี)"
                    className="w-full bg-white shadow-sm border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* 2. Items List Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[250px]">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><DocumentCheckIcon className="w-5 h-5" /></div>
                  <h3 className="text-base font-semibold text-slate-800">รายการสินค้า</h3>
                </div>
                <Button
                  type="button"
                  onClick={() => setIsProductModalOpen(true)}
                  variant="outline"
                  className="text-primary border-primary/20 bg-primary/5 text-sm font-medium"
                  disabled={!fromWarehouseId}
                >
                  <PlusIcon className="w-4 h-4 mr-1.5" /> เพิ่มสินค้า
                </Button>
              </div>
              <div className="flex-grow overflow-y-auto bg-slate-50/30 p-4">
                {goodsItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8 text-sm">ยังไม่มีรายการสินค้า</div>
                ) : (
                  <div className="space-y-3">
                    {goodsItems.map((item, index) => {
                      const product = productMap.get(item.productId);
                      const available = effectiveStockMap.get(fromWarehouseId)?.get(item.productId) || 0;
                      const limit = destinationLimits.get(item.productId);
                      const isItemOverLimit = limit !== undefined && item.quantity > limit;

                      return (
                        <div key={item.id} className={`p-4 rounded-xl border transition-all shadow-sm ${isItemOverLimit ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-6">
                              <div className="font-bold text-slate-800 text-sm">{product?.name || 'Unknown Product'}</div>
                              <div className="text-[10px] text-slate-500 mt-1">Code: {product?.code} | Stock: {available.toLocaleString()}</div>
                            </div>
                            <div className="col-span-3">
                              <Input type="number" min="1" value={item.quantity} onChange={(e) => handleGoodsItemChange(item.id, 'quantity', Number(e.target.value))} className="w-full text-center h-9 text-sm font-bold" />
                              {isItemOverLimit && <span className="text-[10px] text-orange-600 font-bold block text-center mt-1">เกินลิมิตรถ ({limit})</span>}
                            </div>
                            <div className="col-span-2 text-sm text-slate-600 text-center">{product?.unit?.name || 'หน่วย'}</div>
                            <div className="col-span-1 text-right"><button type="button" onClick={() => handleRemoveGoodsItem(item.id)} className="text-slate-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 3. People Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-2"><UserIcon className="w-4 h-4 text-slate-400" />ผู้เกี่ยวข้อง</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ผู้เบิก (Requester) <span className="text-red-500">*</span></label>
                  {isTechUser ? (
                    <Input
                      value={fullCurrentUser ? `${fullCurrentUser.first_name} ${fullCurrentUser.last_name}${fullCurrentUser.nick_name ? ` (${fullCurrentUser.nick_name})` : ''}` : ''}
                      readOnly
                      className="bg-slate-100 border-slate-200"
                    />
                  ) : (
                    <SearchableSelect options={userOptions} value={requesterId} onChange={setRequesterId} placeholder="ค้นหาผู้เบิก..." />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ผู้รับเงิน (Recipient)</label>
                  {isTechUser ? (
                    <Input
                      value={fullCurrentUser ? `${fullCurrentUser.first_name} ${fullCurrentUser.last_name}${fullCurrentUser.nick_name ? ` (${fullCurrentUser.nick_name})` : ''}` : ''}
                      readOnly
                      className="bg-slate-100 border-slate-200"
                    />
                  ) : (
                    <SearchableSelect options={userOptions} value={recipientId} onChange={setRecipientId} placeholder="ค้นหาผู้รับเงิน..." required />
                  )}
                </div>
              </div>
            </div>

            {/* 4. Finance Card & Notes */}
            <div className={`p-5 rounded-xl border shadow-sm ${isOverLimit ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide"><span className="bg-emerald-100 text-emerald-700 p-0.5 rounded text-[10px] px-1.5 border border-emerald-200">฿</span> การเงิน & ค่าใช้จ่าย</h3>
                <Button type="button" onClick={handleAddExpense} variant="ghost" className="text-xs text-primary font-medium">+ เพิ่มรายการ</Button>
              </div>

              <div className="space-y-2 mb-4">
                {expenseItems.map((item) => (
                  <div key={item.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <input type="text" value={item.description} onChange={(e) => handleExpenseItemChange(item.id, 'description', e.target.value)} placeholder="รายละเอียด..." className="flex-grow border-0 border-b border-transparent focus:ring-0 text-xs bg-transparent" />
                    <input type="number" value={item.amount} onChange={(e) => handleExpenseItemChange(item.id, 'amount', e.target.value)} placeholder="0.00" className="w-20 border-0 border-b border-transparent text-right text-xs font-bold" />
                    <button type="button" onClick={() => handleRemoveExpenseItem(item.id)} className="text-slate-300 hover:text-red-500"><XCircleIcon className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">หมายเหตุ</label>
                <textarea name="remarks" rows={3} defaultValue={withdrawal.notes || ''} className="w-full border border-slate-300 rounded-lg p-3 text-xs focus:ring-2 focus:ring-primary/20 resize-none bg-slate-50" placeholder="ระบุหมายเหตุเพิ่มเติม..." />
              </div>
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
        disableFetch={true}
        stockMap={fromWarehouseId ? effectiveStockMap.get(fromWarehouseId) : undefined}
      />
    </>
  );
};