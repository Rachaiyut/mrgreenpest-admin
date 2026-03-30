/**
 * @file AddWithDrawModal.tsx
 * @description Modal component for creating a new goods withdrawal.
 */
import Swal from 'sweetalert2';
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { Modal } from '../../../common/Modal';
import { Input, Button } from '../../../common/FormControls';
import { SearchableSelect } from '../../../common/SearchableSelect';
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
} from '../../../../assets/icons/Icons';
import { ProductSelectionModal } from '../../products/ProductSelectionModal';
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
import { UserApi } from '../../../../api/user';
import { WarehouseApi } from '../../../../api/warehouse';

interface AddStockIssueToVehicleModalProps {
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

export const AddStockIssueToVehicleModal: React.FC<AddStockIssueToVehicleModalProps> = ({
  isOpen,
  onClose,
  onCreateWithdrawal,
  users,
  warehouses,
  currentUser,
  products,
  stockMap,
}) => {
  // Section toggles
  const [enableGoods, setEnableGoods] = useState(true);
  const [enableExpense, setEnableExpense] = useState(true);

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data state
  const [destinationLimits, setDestinationLimits] = useState<Map<string, number>>(new Map());
  const [sourceWarehouseOptions, setSourceWarehouseOptions] = useState<{ value: string; label: string }[]>([]);
  const [vehicleWarehouseOptions, setVehicleWarehouseOptions] = useState<{ value: string; label: string }[]>([]);
  const [fetchedRequester, setFetchedRequester] = useState<User | null>(null);
  const [walletInfo, setWalletInfo] = useState<{ balance: number; expense_limit: number; } | null>(null);
  const [localStockMap, setLocalStockMap] = useState<Map<string, Map<string, number>>>(new Map());

  const goodsFormRef = useRef<HTMLFormElement>(null);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // ==========================================
  // 🌟 Logic: จัดการ User & Role แบบครอบจักรวาล
  // ==========================================
  const loggedInUser = useMemo(() => {
    let role = '';
    let id = currentUser?.id || '';
    let name = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'ผู้เบิก (ตัวฉันเอง)';

    try {
      const raw = localStorage.getItem('user_info');
      if (raw) {
        const parsed = JSON.parse(raw);
        const rawRole = parsed?.role || parsed?.role_name || parsed?.role_code || parsed?.role_id || '';
        role = String(rawRole).toUpperCase().trim();
        id = parsed?.id || parsed?.user_id || id;
        if (parsed?.first_name) {
          name = `${parsed.first_name} ${parsed.last_name || ''}`.trim();
        }
      }
    } catch (e) {
      console.error("Localstorage parsing error", e);
    }

    return { id: String(id), role, name };
  }, [currentUser]);

  const isLockedRole = useMemo(() => {
    return ['LEAD_TEACH', 'TECH'].includes(loggedInUser.role);
  }, [loggedInUser.role]);

  const userOptions = useMemo(() => {
    return users.map((u) => ({
      value: String(u.id),
      label: `${u.first_name} ${u.last_name}${u.nick_name ? ` (${u.nick_name})` : ''}`,
    }));
  }, [users]);

  const requesterOptions = useMemo(() => {
    if (isLockedRole) {
      const myOption = userOptions.find((opt) => opt.value === loggedInUser.id);
      return myOption ? [myOption] : [{ value: loggedInUser.id, label: loggedInUser.name }];
    }
    return userOptions;
  }, [userOptions, isLockedRole, loggedInUser]);

  // ==========================================
  // 🌟 Logic: ดึงข้อมูลคลังสินค้า & เซ็ตค่าเริ่มต้น
  // ==========================================
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
      setRequesterId(loggedInUser.id);
      setRecipientId(loggedInUser.id);
      setIsSubmitting(false);
      fetchWarehouses();
    }
  }, [isOpen, loggedInUser.id, fetchWarehouses]);

  // ==========================================
  // 🌟 Logic: จัดการ Form Actions & Wallet
  // ==========================================
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
    if (!requesterId) newErrors.requesterId = 'กรุณาเลือกผู้เบิก';
    
    if (goodsItems.length > 0 && !fromWarehouseId) {
      newErrors.fromWarehouseId = 'กรุณาเลือกคลังต้นทางเมื่อมีการเบิกสินค้า';
    }
    
    const hasValidExpenses = expenseItems.some(exp => Number(exp.amount) > 0);
    if (goodsItems.length === 0 && !hasValidExpenses) {
      newErrors.general = 'ต้องมีสินค้าอย่างน้อย 1 รายการ หรือมีการเบิกค่าใช้จ่าย';
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ หรือเพิ่มรายการเบิกเงิน' });
    }

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
    setIsSubmitting(true);
    
    const payload: any = {
      warehouse_id: fromWarehouseId || undefined,
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
      expenses: expenseItems.filter(exp => Number(exp.amount) > 0).map((item) => ({ type: 'INCOME', description: item.description, amount: Number(item.amount) })),
      status: WithdrawalStatus.COMPLETED,
    };
    onCreateWithdrawal(payload);
  };

  const handleSaveDraft = () => {
    if (!validate()) return;
    setIsSubmitting(true);

    const payload: any = {
      warehouse_id: fromWarehouseId || undefined,
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
      expenses: expenseItems.filter(exp => Number(exp.amount) > 0).map((item) => ({ type: 'INCOME', description: item.description, amount: Number(item.amount) })),
      status: WithdrawalStatus.DRAFT,
    };
    onCreateWithdrawal(payload);
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
        const found = users.find((u) => String(u.id) === String(requesterId));
        if (found) setFetchedRequester(found);
      });
      UserApi.getWallet(requesterId).then(setWalletInfo).catch(() => setWalletInfo(null));
    } else {
      setFetchedRequester(null);
      setWalletInfo(null);
    }
  }, [requesterId, users]);

  const selectedRequester = useMemo(() => fetchedRequester || users.find((u) => String(u.id) === String(requesterId)), [fetchedRequester, requesterId, users]);
  const totalExpenses = useMemo(() => expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [expenseItems]);

  const isOverLimit = useMemo(() => {
    if (walletInfo && typeof walletInfo.balance === 'number') {
      return (walletInfo.balance + totalExpenses) > walletInfo.expense_limit;
    }
    if (!selectedRequester || typeof (selectedRequester as any).creditLimit !== 'number') return false;
    return totalExpenses > (selectedRequester as any).creditLimit;
  }, [totalExpenses, selectedRequester, walletInfo]);

  // ตรวจสอบว่ามีข้อมูลถูกกรอกหรือไม่ (สำหรับปุ่มบันทึก)
  const hasValidEntries = useMemo(() => {
    const hasValidProducts = goodsItems.length > 0;
    const hasValidExpenses = expenseItems.some(item => item.description.trim() !== '' && Number(item.amount) > 0);
    return hasValidProducts || hasValidExpenses;
  }, [goodsItems, expenseItems]);

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
                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-md border border-amber-200 text-sm font-medium">
                  ⚠️ ยอดรวมหรือจำนวนสินค้าเกินที่กำหนด (ต้องได้รับการอนุมัติ)
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                type="button" 
                onClick={onClose} 
                disabled={isSubmitting} 
                className="py-2.5 px-5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300"
              >
                ยกเลิก
              </Button>
              <Button 
                variant="secondary" 
                type="button" 
                onClick={handleSaveDraft} 
                disabled={isSubmitting}
                className="py-2.5 px-5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium border border-slate-300"
              >
                บันทึกฉบับร่าง
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="add-goods-withdrawal-form"
                disabled={isSubmitting || !hasValidEntries}
                className={`py-2.5 px-6 rounded-lg text-white font-semibold shadow-sm transition-all disabled:bg-slate-300 disabled:cursor-not-allowed ${
                  isOverLimit || isAnyItemOverLimit ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {isSubmitting ? 'กำลังบันทึก...' : (isAnyItemOverLimit || isOverLimit) ? 'ส่งเพื่อขออนุมัติ' : 'บันทึกและตัดสต็อก'}
              </Button>
            </div>
          </div>
        }
      >
        <form ref={goodsFormRef} id="add-goods-withdrawal-form" onSubmit={handleSubmit}>

          <div className="flex flex-col gap-6">
            
            {/* Card 1: Logistics Header */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative z-50">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                  <TruckIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">การเคลื่อนย้ายสินค้า</h3>
                <div className="ml-auto flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                  <CalendarDaysIcon className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-500 font-medium">วันที่เบิก:</span>
                  <input type="date" className="bg-transparent border-none p-0 text-slate-800 font-bold focus:ring-0 text-sm w-32 cursor-pointer" defaultValue={new Date().toISOString().substring(0, 10)} readOnly />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50/50 p-5 rounded-lg border border-slate-100 relative z-50">
                <div className="flex-1 w-full relative z-50">
                  {/* นำ * ออกแล้ว */}
                  <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">เบิกจากคลัง (ต้นทาง)</label>
                  <SearchableSelect 
                    value={fromWarehouseId} 
                    onChange={(v) => { setFromWarehouseId(v); setErrors((prev: any) => ({ ...prev, fromWarehouseId: undefined })); }} 
                    options={sourceWarehouseOptions} 
                    placeholder="เลือกคลังสินค้า" 
                  />
                  {errors.fromWarehouseId && <p className="text-red-500 text-xs mt-1">{errors.fromWarehouseId}</p>}
                </div>
                <div className="pt-6 hidden md:block"><ArrowRightIcon className="w-5 h-5 text-slate-400" /></div>
                <div className="flex-1 w-full relative z-40">
                  <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">ไปยังคลัง/รถ (ปลายทาง)</label>
                  <SearchableSelect 
                    value={toWarehouseId} 
                    onChange={setToWarehouseId} 
                    options={vehicleWarehouseOptions} 
                    placeholder="เลือกรถบริการ (ถ้ามี)" 
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Requester / Recipient Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative z-40">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2.5 bg-green-50 rounded-lg text-green-600">
                  <UserIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">ข้อมูลผู้เบิกและผู้รับ</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex-1 w-full relative z-40">
                  <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">ผู้เบิก (Requester) <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    value={requesterId}
                    onChange={(v) => {
                      if (isLockedRole) return;
                      setRequesterId(v);
                      setErrors((prev: any) => ({ ...prev, requesterId: undefined }));
                    }}
                    options={requesterOptions}
                    placeholder="ค้นหาชื่อผู้เบิก"
                  />
                  {errors.requesterId && <p className="text-red-500 text-xs mt-1">{errors.requesterId}</p>}
                </div>
               <div className="flex-1 w-full relative z-30">
                  <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">ผู้รับเงิน (Recipient)</label>
                  <SearchableSelect 
                    value={recipientId} 
                    onChange={setRecipientId} 
                    options={userOptions} 
                    placeholder="ค้นหาชื่อผู้รับเงิน" 
                  />
                </div>
              </div>
            </div>

            {/* Section Toggles */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">ประเภทการเบิก</label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableGoods}
                    onChange={(e) => {
                      if (!e.target.checked && !enableExpense) return;
                      if (!e.target.checked) setGoodsItems([]);
                      setEnableGoods(e.target.checked);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-slate-700">รายการสินค้า</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableExpense}
                    onChange={(e) => {
                      if (!e.target.checked && !enableGoods) return;
                      if (!e.target.checked) setExpenseItems([]);
                      setEnableExpense(e.target.checked);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-slate-700">การเงิน & ค่าใช้จ่าย</span>
                </label>
              </div>
            </div>

            {/* Card 3: Items List */}
            {enableGoods && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[250px] relative z-20">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
                    <DocumentCheckIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">รายการสินค้า</h3>
                    <p className="text-sm text-slate-500 mt-0.5">สินค้าที่ต้องการเบิกออกจากคลัง (ไม่ต้องระบุก็ได้ หากต้องการเบิกเฉพาะเงิน)</p>
                  </div>
                </div>
                <Button type="button" onClick={() => setIsProductModalOpen(true)} variant="outline" className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 text-sm font-bold px-4 py-2" disabled={!fromWarehouseId}>
                  <PlusIcon className="w-5 h-5 mr-1.5" /> เพิ่มสินค้า
                </Button>
              </div>
              
              <div className="flex-grow overflow-y-auto bg-slate-50/30 p-5">
                {goodsItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                    <div className="bg-slate-50 p-5 rounded-full mb-4 border border-dashed border-slate-200">
                      <TruckIcon className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-600 text-base">ยังไม่มีรายการสินค้า</p>
                    <p className="text-sm mt-1.5 text-slate-400">กดปุ่ม "เพิ่มสินค้า" เพื่อเลือกจากคลัง</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-2">
                    <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50/80 rounded-lg text-sm font-semibold text-slate-600 uppercase tracking-wider border border-slate-100 items-center">
                      <div className="col-span-4">รายละเอียดสินค้า</div>
                      <div className="col-span-2 text-center">สต๊อกคงเหลือ</div>
                      <div className="col-span-2 text-center text-blue-600">Limit รถ</div>
                      <div className="col-span-3 text-center text-emerald-600">จำนวนที่เบิก</div>
                      <div className="col-span-1 text-center">จัดการ</div>
                    </div>

                    {goodsItems.map((item) => {
                      const product = productMap.get(item.productId);
                      const available = fromWarehouseId ? effectiveStockMap.get(fromWarehouseId)?.get(item.productId) || 0 : 0;
                      const limit = destinationLimits.get(item.productId);
                      
                      const isOverStock = available > 0 && item.quantity > available;
                      const isOverLimitObj = limit !== undefined && item.quantity > limit;
                      const hasWarning = isOverStock || isOverLimitObj;
                      const unitName = product?.unit?.name || product?.unit?.symbol || 'หน่วย';

                      return (
                        <div 
                          key={item.id} 
                          className={`px-5 py-4 rounded-xl border transition-all duration-200 flex items-center bg-white shadow-sm hover:shadow-md ${
                            hasWarning ? 'border-red-300 bg-red-50/30' : 'border-slate-200 hover:border-indigo-200'
                          }`}
                        >
                          <div className="grid grid-cols-12 gap-4 items-center w-full">
                            <div className="flex flex-col justify-center col-span-4">
                              <span className="font-bold text-slate-800 text-sm truncate pr-2" title={product?.name}>
                                {product?.name || 'Unknown Product'}
                              </span>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="font-mono text-[11px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                                  {product?.code || item.productId.substring(0, 8)}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col items-center justify-center col-span-2">
                              <span className="text-[11px] text-slate-400 font-medium mb-1">ในคลังมี</span>
                              <span className={`text-base font-bold ${available === 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                {available.toLocaleString()} <span className="text-xs font-medium text-slate-500 ml-0.5">{unitName}</span>
                              </span>
                            </div>

                            <div className="flex flex-col items-center justify-center col-span-2">
                              <span className="text-[11px] text-blue-400 font-medium mb-1">จำกัด</span>
                              <span className="text-base font-bold text-blue-600">
                                {limit !== undefined ? limit.toLocaleString() : '-'} <span className="text-xs font-medium text-blue-400 ml-0.5">{limit !== undefined ? unitName : ''}</span>
                              </span>
                            </div>
                            
                            <div className="col-span-3 flex flex-col items-center justify-center relative">
                              <div className="relative flex items-center w-full max-w-[130px] group">
                                <Input
                                  type="number" 
                                  min="1" 
                                  value={item.quantity}
                                  onChange={(e) => handleGoodsItemChange(item.id, 'quantity', Number(e.target.value))}
                                  className={`w-full text-center h-11 text-base font-bold rounded-lg pr-10 transition-all ${
                                    hasWarning 
                                      ? 'border-red-400 text-red-600 focus:border-red-500 focus:ring-red-200 bg-red-50' 
                                      : 'border-slate-300 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-200 bg-slate-50 group-hover:bg-white'
                                  }`}
                                />
                                <span className="absolute right-3 text-xs font-semibold text-slate-400 pointer-events-none">
                                  {unitName}
                                </span>
                              </div>
                              {isOverStock && (
                                <span className="text-xs font-bold absolute -bottom-6 whitespace-nowrap text-red-500 flex items-center gap-1">
                                  <XCircleIcon className="w-4 h-4" /> เกินสต๊อก
                                </span>
                              )}
                              {!isOverStock && isOverLimitObj && (
                                <span className="text-xs font-bold absolute -bottom-6 whitespace-nowrap text-amber-500 flex items-center gap-1">
                                  <XCircleIcon className="w-4 h-4" /> เกินโควต้า
                                </span>
                              )}
                            </div>
                            
                            <div className="col-span-1 flex justify-center">
                              <button 
                                type="button" 
                                onClick={() => handleRemoveGoodsItem(item.id)} 
                                className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all duration-200 focus:outline-none"
                              >
                                <TrashIcon className="w-6 h-6" />
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
            )}

            {/* Card 5: Finance Card */}
            {enableExpense && (
            <div className={`p-6 rounded-xl border shadow-sm transition-all relative z-10 ${isOverLimit ? 'bg-red-50/50 border-red-200 ring-1 ring-red-100' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                  <span className="bg-emerald-100 text-emerald-700 p-1 rounded-md text-xs px-2 border border-emerald-200 font-black">฿</span> 
                  การเงิน & ค่าใช้จ่าย
                </h3>
                <Button type="button" onClick={handleAddExpense} variant="outline" className="text-primary border-primary/20 bg-primary/5 text-sm font-bold px-4 py-2">
                  <PlusIcon className="w-5 h-5 mr-1.5" /> เพิ่มรายการเบิกเงิน
                </Button>
              </div>
              
              {walletInfo && (
                <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-500 mb-3 border-b border-slate-100 pb-2">
                    <span>สถานะวงเงินเบิกจ่าย</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${isOverLimit ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isOverLimit ? 'เกินวงเงิน' : 'ปกติ'}
                    </span>
                  </div>
                  <div className="flex items-end justify-between mb-2"><span className="text-sm font-medium text-slate-500">วงเงินที่ได้รับ</span><span className="text-base font-semibold text-slate-700">{walletInfo.expense_limit.toLocaleString()} บาท</span></div>
                  <div className="flex items-end justify-between mb-2"><span className="text-sm font-medium text-slate-500">คงเหลือปัจจุบัน</span><span className="text-base font-semibold text-slate-700">{walletInfo.balance.toLocaleString()} บาท</span></div>
                  {totalExpenses > 0 && (
                    <div className="flex items-end justify-between mb-2"><span className="text-sm font-medium text-slate-500">รวมที่ต้องการเบิกครั้งนี้</span><span className="text-base font-bold text-amber-600">+{totalExpenses.toLocaleString()} บาท</span></div>
                  )}
                  <div className="flex items-end justify-between mt-3 pt-3 border-t border-slate-100 mb-2">
                    <span className="text-sm font-bold text-slate-600">ยอดเงินรวม</span>
                    <span className={`text-xl font-black ${isOverLimit ? 'text-red-600' : 'text-emerald-600'}`}>
                      {(walletInfo.balance + totalExpenses).toLocaleString()} บาท
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-1 overflow-hidden">
                    <div style={{ width: `${walletInfo.expense_limit > 0 ? Math.min(100, ((walletInfo.balance + totalExpenses) / walletInfo.expense_limit) * 100) : 100}%` }} className={`h-full transition-all ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {expenseItems.length === 0 ? (
                  <div className="text-center py-6 text-sm font-medium text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    ยังไม่มีรายการเบิกเงิน (สามารถเว้นว่างได้หากต้องการเบิกเฉพาะสินค้า)
                  </div>
                ) : (
                  expenseItems.map((item) => (
                    <div key={item.id} className="flex gap-3 items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm group hover:border-primary/30 transition-colors">
                      <div className="p-2 bg-slate-100 rounded-md text-slate-400"><BanknotesIcon className="w-5 h-5" /></div>
                      <input 
                        type="text" 
                        value={item.description} 
                        onChange={(e) => handleExpenseItemChange(item.id, 'description', e.target.value)} 
                        placeholder="ระบุรายละเอียดค่าใช้จ่าย (เช่น เติมเงินมือถือ, เติมน้ำมัน)..." 
                        className="flex-grow border-0 border-b border-transparent focus:border-primary focus:ring-0 text-sm font-medium bg-transparent px-2" 
                      />
                      <div className="relative flex items-center max-w-[150px]">
                        <input 
                          type="number" 
                          value={item.amount} 
                          onChange={(e) => handleExpenseItemChange(item.id, 'amount', e.target.value)} 
                          placeholder="0.00" 
                          className="w-full border-0 border-b border-transparent focus:border-primary focus:ring-0 text-base font-bold text-right pr-8 bg-transparent" 
                        />
                        <span className="absolute right-0 text-sm font-semibold text-slate-400">บาท</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveExpenseItem(item.id)} className="text-slate-300 hover:text-red-500 ml-2 p-1 rounded-lg hover:bg-red-50 transition-colors"><XCircleIcon className="w-6 h-6" /></button>
                    </div>
                  ))
                )}
                
                {expenseItems.length > 0 && (
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4">
                    <span className="text-sm font-bold text-slate-600">ยอดรวมขอเติมเงิน</span>
                    <span className="text-xl font-black text-primary">{totalExpenses.toLocaleString()} <span className="text-base font-bold text-slate-500 ml-1">บาท</span></span>
                  </div>
                )}
              </div>
            </div>
            )}

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