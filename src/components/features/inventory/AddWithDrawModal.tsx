/**
 * @file AddWithDrawModal.tsx
 * @description Modal component for creating a new goods withdrawal. (Reference section removed)
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
  BanknotesIcon,
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

interface AddWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWithdrawal: (withdrawal: Omit<WithdrawalType, 'id'>) => void;
  users: User[];
  warehouses: WarehouseType[];
  currentUser: User | null;
  products: Product[];
  stockMap: Map<string, Map<string, number>>;
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

export const AddWithdrawalModal: React.FC<AddWithdrawalModalProps> = ({
  isOpen,
  onClose,
  onCreateWithdrawal,
  users,
  warehouses,
  currentUser,
  products,
  stockMap,
}) => {
  // Form state
  const [goodsItems, setGoodsItems] = useState<LineItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseLineItem[]>([]);
  const [errors, setErrors] = useState<any>({});
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [recipientId, setRecipientId] = useState('');

  // UI state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Data state
  const [destinationLimits, setDestinationLimits] = useState<Map<string, number>>(new Map());
  const [sourceWarehouseOptions, setSourceWarehouseOptions] = useState<{ value: string; label: string }[]>([]);
  const [vehicleWarehouseOptions, setVehicleWarehouseOptions] = useState<{ value: string; label: string }[]>([]);
  const [fetchedRequester, setFetchedRequester] = useState<User | null>(null);
  const [walletInfo, setWalletInfo] = useState<{ balance: number; expense_limit: number; } | null>(null);
  const [localStockMap, setLocalStockMap] = useState<Map<string, Map<string, number>>>(new Map());

  const goodsFormRef = useRef<HTMLFormElement>(null);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const userOptions = useMemo(() => {
    return users.map((u) => ({
      value: u.id,
      label: `${u.first_name} ${u.last_name}${u.nick_name ? ` (${u.nick_name})` : ''}`,
    }));
  }, [users]);

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

        setSourceWarehouseOptions(allWarehouses
          .filter((w: any) => w.type === InventoryWarehouseType.MAIN || w.type === InventoryWarehouseType.SUB)
          .map((w: any) => ({ value: w.id, label: w.name })));

        setVehicleWarehouseOptions(allWarehouses
          .filter((w: any) => w.type === InventoryWarehouseType.VEHICLE)
          .map((w: any) => ({ value: w.id, label: w.name })));
      }
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
    }
  }, []);

  const effectiveStockMap = useMemo(() => localStockMap.size > 0 ? localStockMap : stockMap, [stockMap, localStockMap]);

  const sourceWarehouse = useMemo(() => warehouses.find((w) => w.id === fromWarehouseId), [fromWarehouseId, warehouses]);

  const productsInWarehouse = useMemo(() => {
    if (!sourceWarehouse) return [];

    const stock = effectiveStockMap.get(sourceWarehouse.id);
    if (!stock) return [];

    return products.filter((p) => {
      const qty = stock.get(p.id);
      return qty && qty > 0;
    });
  }, [sourceWarehouse, products, effectiveStockMap]);

  useEffect(() => {
    if (isOpen) {
      setGoodsItems([]);
      setExpenseItems([]);
      setFromWarehouseId('');
      setToWarehouseId('');
      setRequesterId(currentUser?.id || '');
      setRecipientId('');
      fetchWarehouses();
    }
  }, [isOpen, currentUser, fetchWarehouses]);

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

  const validate = () => {
    const newErrors: any = {};
    if (!fromWarehouseId) newErrors.fromWarehouseId = 'กรุณาเลือกคลังต้นทาง';
    if (!requesterId) newErrors.requesterId = 'กรุณาเลือกผู้เบิก';
    if (goodsItems.length === 0) newErrors.goodsItems = 'ต้องมีสินค้าอย่างน้อย 1 รายการ';
    
    goodsItems.forEach((item, index) => {
      if (!item.quantity || item.quantity <= 0) {
        if (!newErrors.goods) newErrors.goods = [];
        newErrors.goods[index] = { ...newErrors.goods[index], quantity: 'จำนวนต้องมากกว่า 0' };
      }
      const available = sourceWarehouse ? effectiveStockMap.get(sourceWarehouse.id)?.get(item.productId) || 0 : 0;
      if (item.quantity > available) {
        if (!newErrors.goods) newErrors.goods = [];
        newErrors.goods[index] = { ...newErrors.goods[index], quantity: 'จำนวนเกินสต็อก' };
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload: any = {
      warehouse_id: fromWarehouseId,
      to_warehouse_id: toWarehouseId || undefined,
      requester_id: requesterId,
      recipient_id: recipientId || undefined,
      purpose: 'เบิกสินค้า/อุปกรณ์',
      items: goodsItems.map((item) => {
        const product = productMap.get(item.productId);
        return {
          product_id: item.productId,
          product_name: product?.name || '',
          quantity: item.quantity,
          unit: product?.unit?.symbol || 'หน่วย',
        };
      }),
      expenses: expenseItems.map((item) => ({ description: item.description, amount: Number(item.amount) })),
      status: WithdrawalStatus.PENDING,
    };
    onCreateWithdrawal(payload);
  };

  const handleSaveDraft = () => {
    if (!validate()) return;
    const payload: any = {
      warehouse_id: fromWarehouseId,
      to_warehouse_id: toWarehouseId || undefined,
      requester_id: requesterId,
      recipient_id: recipientId || undefined,
      purpose: 'เบิกสินค้า/อุปกรณ์ (Draft)',
      items: goodsItems.map((item) => {
        const product = productMap.get(item.productId);
        return {
          product_id: item.productId,
          product_name: product?.name || '',
          quantity: item.quantity,
          unit: product?.unit?.symbol || 'หน่วย',
        };
      }),
      expenses: expenseItems.map((item) => ({ description: item.description, amount: Number(item.amount) })),
      status: WithdrawalStatus.DRAFT,
    };
    onCreateWithdrawal(payload);
    onClose();
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="สร้างใบเบิกสินค้า/อุปกรณ์"
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
              <Button variant="secondary" type="button" onClick={handleSaveDraft} className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium">บันทึกฉบับร่าง</Button>
              <Button
                variant="primary"
                type="submit"
                form="add-goods-withdrawal-form"
                className={`py-2 px-6 rounded-lg text-white font-semibold shadow-sm transition-all ${isOverLimit || isAnyItemOverLimit ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/90'}`}
              >
                {isAnyItemOverLimit || isOverLimit ? 'ส่งเพื่อขออนุมัติ' : 'บันทึกและตัดสต็อก'}
              </Button>
            </div>
          </div>
        }
      >
        <form ref={goodsFormRef} id="add-goods-withdrawal-form" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            {/* 1. Logistics Header Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><TruckIcon className="w-5 h-5" /></div>
                <h3 className="text-base font-semibold text-slate-800">การเคลื่อนย้ายสินค้า</h3>
                <div className="ml-auto flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-sm">
                  <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">วันที่เบิก:</span>
                  <input type="date" className="bg-transparent border-none p-0 text-slate-800 font-bold focus:ring-0 text-sm w-32" defaultValue={new Date().toISOString().substring(0, 10)} />
                </div>
              </div>
            
              <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">เบิกจากคลัง (ต้นทาง) <span className="text-red-500">*</span></label>
                  <SearchableSelect value={fromWarehouseId} onChange={(v) => { setFromWarehouseId(v); setErrors((prev: any) => ({ ...prev, fromWarehouseId: undefined })); }} options={sourceWarehouseOptions} placeholder="เลือกคลังสินค้า" className="w-full bg-white shadow-sm border-slate-200" />
                  {errors.fromWarehouseId && <p className="text-red-500 text-xs mt-1">{errors.fromWarehouseId}</p>}
                </div>
                <div className="pt-6"><ArrowRightIcon className="w-5 h-5 text-slate-400" /></div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ไปยังคลัง/รถ (ปลายทาง)</label>
                  <SearchableSelect value={toWarehouseId} onChange={setToWarehouseId} options={vehicleWarehouseOptions} placeholder="เลือกรถบริการ (ถ้ามี)" className="w-full bg-white shadow-sm border-slate-200" />
                </div>
              </div>
            </div>

            {/* 2. Items List Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[250px]">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><DocumentCheckIcon className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">รายการสินค้า</h3>
                    <p className="text-xs text-slate-500">สินค้าที่ต้องการเบิกออกจากคลัง</p>
                  </div>
                </div>
                <Button type="button" onClick={() => setIsProductModalOpen(true)} variant="outline" className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 text-sm font-medium" disabled={!fromWarehouseId}><PlusIcon className="w-4 h-4 mr-1.5" /> เพิ่มสินค้า</Button>
              </div>
              <div className="flex-grow overflow-y-auto bg-slate-50/30 p-4 text-center">
                {goodsItems.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                    <div className="bg-slate-50 p-4 rounded-full mb-3 border border-dashed border-slate-200 animate-pulse"><TruckIcon className="w-8 h-8 text-slate-300" /></div>
                    <p className="font-medium text-slate-600 text-sm">ยังไม่มีรายการสินค้า</p>
                    <p className="text-xs mt-1 text-slate-400">กดปุ่ม "เพิ่มสินค้า" เพื่อเลือกจากคลัง</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {goodsItems.map((item, index) => {
                      const product = productMap.get(item.productId);
                      const available = effectiveStockMap.get(fromWarehouseId)?.get(item.productId) || 0;
                      return (
                        <div key={item.id} className="grid grid-cols-12 gap-4 items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                          <div className="col-span-2 text-sm font-bold text-slate-800 text-left">{product?.code || 'ID:' + item.id.slice(0, 4)}</div>
                          <div className="col-span-4 text-left font-bold text-slate-800 text-sm">{product?.name || 'Unknown Product'}</div>
                          <div className="col-span-2 text-sm font-bold text-slate-800">คงเหลือ: {available.toLocaleString()}</div>
                          <div className="col-span-1 text-sm font-bold text-slate-800">{product?.unit?.name || '-'}</div>
                          <div className="col-span-2 flex flex-col items-end gap-1">
                            <Input type="number" value={item.quantity} onChange={(e) => handleGoodsItemChange(item.id, 'quantity', Number(e.target.value))} className="w-28 text-right h-9 text-sm font-bold" />
                          </div>
                          <div className="col-span-1 flex justify-center"><button type="button" onClick={() => handleRemoveGoodsItem(item.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><TrashIcon className="w-5 h-5" /></button></div>
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
                  <SearchableSelect value={requesterId} onChange={(v) => { setRequesterId(v); setErrors((prev: any) => ({ ...prev, requesterId: undefined })); }} options={userOptions} placeholder="ค้นหาชื่อผู้เบิก" className="w-full text-sm" />
                  {errors.requesterId && <p className="text-red-500 text-xs mt-1">{errors.requesterId}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ผู้รับเงิน (Recipient)</label>
                  <SearchableSelect value={recipientId} onChange={setRecipientId} options={userOptions} placeholder="ค้นหาชื่อผู้รับเงิน" className="w-full text-sm" />
                </div>
              </div>
            </div>

            {/* 4. Finance Card */}
            <div className={`p-5 rounded-xl border shadow-sm transition-all ${isOverLimit ? 'bg-red-50/50 border-red-200 ring-1 ring-red-100' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide pb-2"><span className="bg-emerald-100 text-emerald-700 p-0.5 rounded text-[10px] px-1.5 border border-emerald-200">฿</span> การเงิน & ค่าใช้จ่าย</h3>
                <Button type="button" onClick={handleAddExpense} variant="outline" className="text-primary border-primary/20 bg-primary/5 text-sm font-medium"><PlusIcon className="w-4 h-4 mr-1.5" /> เพิ่มรายการ</Button>
              </div>
              {walletInfo && (
                <div className="mb-5 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2"><span>สถานะวงเงิน</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOverLimit ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{isOverLimit ? 'เกินวงเงิน' : 'ปกติ'}</span></div>
                  <div className="flex items-end justify-between mb-1"><span className="text-xs text-slate-400">คงเหลือสุทธิ</span><span className={`text-lg font-bold ${walletInfo.balance - totalExpenses < 0 ? 'text-red-600' : 'text-slate-800'}`}>{(walletInfo.balance - totalExpenses).toLocaleString()} บาท</span></div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden"><div style={{ width: `${walletInfo.expense_limit > 0 ? Math.min(100, ((walletInfo.expense_limit - walletInfo.balance + totalExpenses) / walletInfo.expense_limit) * 100) : 100}%` }} className={`h-full ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`} /></div>
                </div>
              )}
              <div className="space-y-2">
                {expenseItems.map((item, index) => (
                  <div key={item.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm group">
                    <div className="p-1.5 bg-slate-100 rounded text-slate-400"><BanknotesIcon className="w-3 h-3" /></div>
                    <input type="text" value={item.description} onChange={(e) => handleExpenseItemChange(item.id, 'description', e.target.value)} placeholder="ระบุรายละเอียด..." className="flex-grow border-0 border-b border-transparent focus:border-primary focus:ring-0 text-sm bg-transparent font-medium" />
                    <input type="number" value={item.amount} onChange={(e) => handleExpenseItemChange(item.id, 'amount', e.target.value)} placeholder="0.00" className="w-16 border-0 border-b border-transparent focus:border-primary focus:ring-0 text-xs text-right font-bold" />
                    <button type="button" onClick={() => handleRemoveExpenseItem(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><XCircleIcon className="w-4 h-4" /></button>
                  </div>
                ))}
                {expenseItems.length > 0 && <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-3"><span className="text-xs font-bold text-slate-600">รวมค่าใช้จ่าย</span><span className="text-sm font-bold text-primary">{totalExpenses.toLocaleString()} บาท</span></div>}
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
        existingProductIds={goodsItems.map(i => i.productId)}
        disableFetch={true}
        stockMap={effectiveStockMap.get(fromWarehouseId)}
      />

    </>
  );
};