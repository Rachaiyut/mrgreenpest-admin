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
  TruckIcon,
  DocumentCheckIcon,
  CalendarDaysIcon,
  UserIcon,
  BanknotesIcon,
} from '../../../assets/icons/Icons';

// Import Modals ต่างๆ
import { ProductSelectionModal } from '../products/ProductSelectionModal';
import { ReferenceSelectionModal } from '../../common/ReferenceSelectionModal';
import { CustomerSelectionModal } from '../customers/CustomerSelectionModal';

// Types & APIs
import {
  StockIssueSummary,
  StockIssueItemSummary,
  Warehouse,
} from '@/src/types/entity/inventory.interface';
import { Product } from '@/src/types/entity/product.interface';
import { WarehouseType } from '@/src/types/enums/inventory';
import { User, FieldJob, Customer } from '@/src/types/entity/app.interface';
import { UserApi } from '../../../api/user';
import { WarehouseApi } from '../../../api/warehouse';

interface ExpenseLineItem {
  id: string;
  description: string;
  amount: number | '';
}

interface AddStockIssueSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
  warehouses: Warehouse[];
  products: Product[];
  users: User[];
  jobs?: FieldJob[];
  customers?: Customer[];
  currentUser?: User;
  stockMap?: Map<string, Map<string, number>>;
}

export const AddStockIssueSummaryModal: React.FC<AddStockIssueSummaryModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  warehouses,
  products,
  users,
  jobs = [],
  customers = [],
  currentUser,
  stockMap = new Map(),
}) => {
  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================
  const [warehouseId, setWarehouseId] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [notes, setNotes] = useState('');
  
  // รายการสินค้า
  const [items, setItems] = useState<Omit<StockIssueItemSummary, 'id' | 'stock_issue_summary_id'>[]>([]);
  
  // States สำหรับ Expenses & References (Flow เก่า)
  const [expenseItems, setExpenseItems] = useState<ExpenseLineItem[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [referenceType, setReferenceType] = useState<'JOB'>('JOB');
  const [referenceIds, setReferenceIds] = useState<string[]>([]);
  
  const [walletInfo, setWalletInfo] = useState<{ balance: number; expense_limit: number; } | null>(null);
  const [fetchedRequester, setFetchedRequester] = useState<User | null>(null);

  // States สำหรับดึงสต็อกคลัง/รถ
  const [localStockMap, setLocalStockMap] = useState<Map<string, Map<string, number>>>(new Map());
  const [vehicleWarehouseOptions, setVehicleWarehouseOptions] = useState<{ value: string; label: string }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerSelectionModalOpen, setIsCustomerSelectionModalOpen] = useState(false);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  
  const goodsFormRef = useRef<HTMLFormElement>(null);

  // ==========================================
  // 2. DATA FETCHING & PREPARATION
  // ==========================================
  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await WarehouseApi.getWarehousesWithItems();
      if (res && res.data) {
        const allWarehouses = res.data;
        const newStockMap = new Map<string, Map<string, number>>();

        allWarehouses.forEach((w: any) => {
          const warehouseStock = new Map<string, number>();
          const stockItems = Array.isArray(w.stock)
            ? w.stock
            : Array.isArray(w.stock_balances)
              ? w.stock_balances
              : [];

          stockItems.forEach((s: any) => {
            const productId = s.product_id || s.product?.id;
            const quantity = typeof s.quantity === 'string' ? parseFloat(s.quantity) : Number(s.quantity);
            if (productId && !isNaN(quantity)) {
              warehouseStock.set(productId, quantity);
            }
          });
          newStockMap.set(w.id, warehouseStock);
        });
        setLocalStockMap(newStockMap);

        const vehicleWhs = allWarehouses
          .filter((w: any) => w.type === WarehouseType.VEHICLE)
          .map((w: any) => ({ value: w.id, label: w.name }));
        setVehicleWarehouseOptions(vehicleWhs);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
      const vehicleWhs = warehouses
        .filter((w) => w.type === WarehouseType.VEHICLE)
        .map((w) => ({ value: w.id, label: w.name }));
      setVehicleWarehouseOptions(vehicleWhs);
    }
  }, [warehouses]);

  const effectiveStockMap = useMemo(() => {
    return localStockMap.size > 0 ? localStockMap : stockMap;
  }, [stockMap, localStockMap]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const userOptions = useMemo(() => users.map((u) => ({
    value: u.id,
    label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.nick_name || 'Unknown'
  })), [users]);

  // ค้นหา Job ตามลูกค้าที่เลือก
  const displayJobs = useMemo(() => {
    if (selectedCustomerIds.length > 0) {
      return jobs.filter((j) => {
        const cId = (j as any).customer_id || (j as any).customer?.id;
        return selectedCustomerIds.includes(cId);
      });
    }
    return jobs;
  }, [selectedCustomerIds, jobs]);

  // Reset form & Fetch Data
  useEffect(() => {
    if (isOpen) {
      setWarehouseId('');
      setRecipientId('');
      setNotes('');
      setItems([]);
      setExpenseItems([]);
      setSelectedCustomerIds([]);
      setReferenceIds([]);
      setIsSubmitting(false);
      
      fetchWarehouses();

      const currentU = currentUser ? users.find((u) => u.id === currentUser.id) : null;
      const isTech = currentU && ['LEAD_TECH', 'TECH'].includes(
        typeof currentU.role === 'string' ? currentU.role : (currentU.role as any)?.name
      );

      if (isTech && currentU) {
        setRequesterId(currentU.id);
      } else {
        setRequesterId('');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fetchWarehouses]); 

  // Effects for Wallet Fetching
  useEffect(() => {
    if (requesterId) {
      UserApi.getById(requesterId).then(setFetchedRequester).catch(() => setFetchedRequester(null));
      UserApi.getWallet(requesterId).then(setWalletInfo).catch(() => setWalletInfo(null));
    } else {
      setFetchedRequester(null);
      setWalletInfo(null);
    }
  }, [requesterId]);

  const selectedRequester = useMemo(() => fetchedRequester || users.find((u) => u.id === requesterId), [fetchedRequester, requesterId, users]);
  const totalExpenses = useMemo(() => expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [expenseItems]);
  
  const isOverLimit = useMemo(() => {
    if (walletInfo && typeof walletInfo.balance === 'number') {
      return totalExpenses > walletInfo.balance;
    }
    if (!selectedRequester || typeof (selectedRequester as any).creditLimit !== 'number') return false;
    return totalExpenses > (selectedRequester as any).creditLimit;
  }, [totalExpenses, selectedRequester, walletInfo]);

  const selectedCustomers = useMemo(() => customers.filter((c) => selectedCustomerIds.includes(c.id)), [customers, selectedCustomerIds]);

  // ==========================================
  // 3. HANDLERS
  // ==========================================
  const handleAddProducts = (productIds: string[]) => {
    const newItems = productIds.map((pid) => {
      const product = productMap.get(pid);
      return {
        product_id: pid,
        product_name: product?.name || '',
        quantity: 1,
        unit: product?.unit?.name || 'หน่วย',
      };
    });
    setItems((prev) => [...prev, ...newItems]);
    setIsProductModalOpen(false);
  };

  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const handleItemChange = (index: number, field: 'quantity', value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // --- Expenses Flow ---
  const handleAddExpense = () => setExpenseItems((prev) => [...prev, { id: crypto.randomUUID(), description: '', amount: '' }]);
  const handleRemoveExpenseItem = (id: string) => setExpenseItems((prev) => prev.filter((item) => item.id !== id));
  const handleExpenseItemChange = (id: string, field: keyof ExpenseLineItem, value: any) => {
    setExpenseItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  // --- Submit Flows ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!warehouseId) return alert('กรุณาเลือกรถบริการ');
    if (items.length === 0) return alert('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ');

    const invalidItems = items.filter((item) => !item.product_id || item.quantity <= 0);
    if (invalidItems.length > 0) return alert('กรุณาระบุจำนวนสินค้าให้ถูกต้อง');

    setIsSubmitting(true);
    try {
      const payload: any = {
        warehouse_id: warehouseId,
        requester_id: requesterId || undefined,
        recipient_id: recipientId || undefined, 
        purpose: 'เบิกสินค้า/อุปกรณ์', 
        notes: notes || undefined,
        status: 'PENDING', // กำหนด Status
        items: items as StockIssueItemSummary[],
        expenses: expenseItems.map((item) => ({
          description: item.description,
          amount: Number(item.amount),
        })),
      };

      if (referenceIds.length > 0) payload.reference_ids = referenceIds;
      if (selectedCustomerIds.length > 0) payload.customer_id = selectedCustomerIds[0];

      await onCreate(payload);
      onClose();

    } catch (error) {
      console.error('Failed to create stock issue summary', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  // นำฟังก์ชัน Save Draft กลับมา
  const handleSaveDraft = async () => {
    if (!warehouseId) return alert('กรุณาเลือกรถบริการก่อนบันทึกฉบับร่าง');

    setIsSubmitting(true);
    try {
      const payload: any = {
        warehouse_id: warehouseId,
        requester_id: requesterId || undefined,
        recipient_id: recipientId || undefined,
        purpose: 'เบิกสินค้า/อุปกรณ์ (Draft)',
        notes: notes || undefined,
        status: 'DRAFT', // สถานะฉบับร่าง
        items: items as StockIssueItemSummary[],
        expenses: expenseItems.map((item) => ({
          description: item.description,
          amount: Number(item.amount),
        })),
      };

      if (referenceIds.length > 0) payload.reference_ids = referenceIds;
      if (selectedCustomerIds.length > 0) payload.customer_id = selectedCustomerIds[0];

      await onCreate(payload);
      onClose();

    } catch (error) {
      console.error('Failed to save draft', error);
      alert('เกิดข้อผิดพลาดในการบันทึกฉบับร่าง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const productsInWarehouse = useMemo(() => {
    if (!warehouseId) return [];
    
    // ดึงสต็อกของรถคันที่เลือก
    const warehouseStock = effectiveStockMap.get(warehouseId);
    if (!warehouseStock) return [];

    // กรองสินค้าทั้งหมด ให้เหลือแค่ที่มีในรถคันนี้
    return products.filter((p) => {
      const qty = warehouseStock.get(p.id);
      return qty !== undefined && qty > 0;
    });
  }, [warehouseId, effectiveStockMap, products]);

  const sourceWarehouse = useMemo(() => warehouses.find((w) => w.id === warehouseId) || { id: warehouseId }, [warehouseId, warehouses]);
  const existingProductIds = useMemo(() => Array.from(new Set(items.map((item) => item.product_id))), [items]);

  const isTechUserForUI = currentUser && ['LEAD_TECH', 'TECH'].includes(
    typeof currentUser.role === 'string' ? currentUser.role : (currentUser.role as any)?.name
  );

  // ==========================================
  // 4. UI RENDER 
  // ==========================================
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="สร้างสรุปเบิกสินค้า/อุปกรณ์"
        size="5xl"
        footer={
          <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>* จำเป็นต้องกรอกข้อมูลที่มีเครื่องหมายดอกจัน</span>
              {isOverLimit && (
                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  ⚠️ ยอดรวมเกินวงเงินที่กำหนด (ต้องได้รับการอนุมัติ)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting} className="py-2 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300">
                ยกเลิก
              </Button>
              <Button 
                variant="secondary" 
                type="button" 
                onClick={handleSaveDraft} // ผูกฟังก์ชัน Draft กลับมาใช้งาน
                disabled={isSubmitting || !warehouseId}
                className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium border border-slate-300"
              >
                บันทึกฉบับร่าง
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="add-stock-issue-summary-form"
                disabled={isSubmitting || !warehouseId || items.length === 0}
                className={`py-2 px-6 rounded-lg text-white font-semibold shadow-sm transition-all disabled:bg-slate-300 ${
                  isOverLimit ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {isSubmitting ? 'กำลังบันทึก...' : isOverLimit ? 'ส่งเพื่อขออนุมัติ' : 'บันทึกและตัดสต็อก'}
              </Button>
            </div>
          </div>
        }
      >
        <form ref={goodsFormRef} id="add-stock-issue-summary-form" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            
            {/* Card 1: Logistics Header */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <TruckIcon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-800">การเคลื่อนย้ายสินค้า</h3>
                <div className="ml-auto flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">วันที่เบิก:</span>
                  <input type="date" defaultValue={new Date().toISOString().substring(0, 10)} className="bg-transparent border-none p-0 text-slate-800 font-bold focus:ring-0 text-sm w-32 cursor-pointer" readOnly />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">เบิกจากรถ <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={vehicleWarehouseOptions}
                    value={warehouseId}
                    onChange={setWarehouseId}
                    placeholder="เลือกรถบริการ..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Items List */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[250px]">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <DocumentCheckIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">รายการสินค้า</h3>
                    <p className="text-xs text-slate-500">สินค้าที่ต้องการเบิกออกจากรถ</p>
                  </div>
                </div>
                <Button type="button" onClick={() => setIsProductModalOpen(true)} variant="outline" className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 text-sm font-medium" disabled={!warehouseId}>
                  <PlusIcon className="w-4 h-4 mr-1.5" /> เพิ่มสินค้า
                </Button>
              </div>

              <div className="flex-grow overflow-y-auto bg-slate-50/30 p-4">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                    <div className="bg-slate-50 p-4 rounded-full mb-3 border border-dashed border-slate-200">
                      <TruckIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-600 text-sm">ยังไม่มีรายการสินค้า</p>
                    <p className="text-xs mt-1 text-slate-400">กดปุ่ม "เพิ่มสินค้า" เพื่อเลือกจากรถ</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-2">
                    <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-bold text-slate-500 border-b border-slate-100 pb-2 mb-3">
                      <div className="col-span-2 text-left">รหัส</div>
                      <div className="col-span-3 text-left">ชื่อสินค้า</div>
                      <div className="col-span-2 text-center">สต๊อกคงเหลือ</div>
                      <div className="col-span-1 text-center">หน่วย</div>
                      <div className="col-span-3 text-center text-emerald-600">จำนวนที่ใช้</div>
                      <div className="col-span-1 text-center">จัดการ</div>
                    </div>

                    {items.map((item, index) => {
                      const product = productMap.get(item.product_id);
                      const available = sourceWarehouse?.id ? effectiveStockMap.get(sourceWarehouse.id)?.get(item.product_id) || 0 : 0;

                      return (
                        <div key={index} className="px-6 py-4 rounded-xl border shadow-sm flex items-center bg-white border-slate-200 hover:border-slate-300">
                          <div className="grid grid-cols-12 gap-4 items-center w-full">
                            <div className="col-span-2 font-bold text-slate-800 text-sm">{product?.code || product?.id?.substring(0, 8)}</div>
                            <div className="col-span-3 font-bold text-slate-800 text-sm truncate">{item.product_name || 'Unknown Product'}</div>
                            <div className="col-span-2 font-bold text-slate-600 text-sm text-center">คงเหลือ: {available.toLocaleString()}</div>
                            <div className="col-span-1 font-bold text-slate-600 text-sm text-center">{item.unit || 'หน่วย'}</div>
                            <div className="col-span-3 flex flex-col items-center justify-center relative">
                              <Input
                                type="number" min="1" max={available > 0 ? available : undefined}
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                className={`w-full max-w-[100px] text-center h-9 text-sm font-bold rounded-lg ${available > 0 && item.quantity > available ? 'border-red-300 text-red-600 focus:border-red-500' : 'border-slate-300 focus:border-primary text-slate-800'}`}
                              />
                              {available > 0 && item.quantity > available && <span className="text-[10px] font-bold absolute -bottom-5 whitespace-nowrap text-red-600">เกินสต็อก</span>}
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Requester / Recipient Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-green-50 rounded-lg text-green-600"><UserIcon className="w-5 h-5" /></div>
                <h3 className="text-base font-semibold text-slate-800">ข้อมูลผู้เบิกและผู้รับ</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ผู้เบิก (Requester) <span className="text-red-500">*</span></label>
                  {isTechUserForUI ? (
                    <Input value={currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : ''} readOnly className="bg-slate-100 border-slate-200" />
                  ) : (
                    <SearchableSelect options={userOptions} value={requesterId} onChange={setRequesterId} placeholder="ค้นหาผู้เบิก..." />
                  )}
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ผู้รับเงิน (Recipient)</label>
                  {isTechUserForUI ? (
                    <Input value={currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : ''} readOnly className="bg-slate-100 border-slate-200" />
                  ) : (
                    <SearchableSelect options={userOptions} value={recipientId} onChange={setRecipientId} placeholder="ค้นหาผู้รับเงิน..." />
                  )}
                </div>
              </div>
            </div>

            {/* Card 4: Finance Card (การเงินและค่าใช้จ่ายแบบเก่า) */}
            <div className={`p-5 rounded-xl border shadow-sm transition-all ${isOverLimit ? 'bg-red-50/50 border-red-200 ring-1 ring-red-100' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                  <span className="bg-emerald-100 text-emerald-700 p-0.5 rounded text-[10px] px-1.5 border border-emerald-200 font-serif">฿</span>
                  การเงิน & ค่าใช้จ่าย
                </h3>
                <Button type="button" onClick={handleAddExpense} variant="ghost" className="text-xs text-primary hover:bg-primary/5 px-2 py-1 font-medium">+ เพิ่มรายการ</Button>
              </div>

              {walletInfo && (
                <div className="mb-5 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-500">สถานะวงเงิน</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOverLimit ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isOverLimit ? 'เกินวงเงิน' : 'ปกติ'}
                    </span>
                  </div>
                  <div className="flex items-end justify-between mb-1">
                    <span className="text-xs text-slate-400">คงเหลือสุทธิ</span>
                    <span className={`text-lg font-bold ${walletInfo.balance - totalExpenses < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {(walletInfo.balance - totalExpenses).toLocaleString()} <span className="text-xs font-normal text-slate-400">บาท</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
                    <div style={{ width: `${walletInfo.expense_limit > 0 ? Math.min(100, ((walletInfo.expense_limit - walletInfo.balance + totalExpenses) / walletInfo.expense_limit) * 100) : 100}%` }} className={`h-full ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {expenseItems.map((item) => (
                  <div key={item.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm group">
                    <div className="p-1.5 bg-slate-100 rounded text-slate-400"><BanknotesIcon className="w-3 h-3" /></div>
                    <input type="text" value={item.description} onChange={(e) => handleExpenseItemChange(item.id, 'description', e.target.value)} placeholder="ระบุรายละเอียด..." className="flex-grow min-w-0 border-0 focus:ring-0 text-xs px-0 py-1 bg-transparent font-medium" />
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" value={item.amount} onChange={(e) => handleExpenseItemChange(item.id, 'amount', e.target.value)} placeholder="0.00" className="w-16 border-0 focus:ring-0 text-xs text-right px-0 py-1 font-bold bg-transparent" />
                      <span className="text-[10px] text-slate-400">฿</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveExpenseItem(item.id)} className="text-slate-300 hover:text-red-500 p-1"><XCircleIcon className="w-4 h-4" /></button>
                  </div>
                ))}
                {expenseItems.length === 0 && <div className="text-center py-6 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs bg-slate-50/50">ไม่มีรายการค่าใช้จ่ายเพิ่มเติม</div>}
              </div>
            </div>

            {/* Card 5: Reference Card (ข้อมูลอ้างอิงแบบเก่า) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-2">
                <DocumentCheckIcon className="w-4 h-4 text-slate-400" /> ข้อมูลอ้างอิง
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-500 ml-1">ลูกค้า</label>
                    <button type="button" onClick={() => setIsCustomerSelectionModalOpen(true)} className="text-[10px] font-bold text-primary hover:text-primary/80 bg-primary/5 px-2 py-0.5 rounded">+ เลือกลูกค้า</button>
                  </div>
                  {selectedCustomers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedCustomers.map((c) => (
                        <div key={c.id} className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md border border-slate-200">
                          <span className="truncate max-w-[150px] font-medium">{c.first_name} {c.last_name}</span>
                          <button type="button" onClick={() => setSelectedCustomerIds(prev => prev.filter(id => id !== c.id))} className="text-slate-400 hover:text-red-500"><XCircleIcon className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-xs text-slate-400 italic bg-slate-50 p-2 rounded border border-dashed border-slate-200 text-center">ยังไม่ได้ระบุลูกค้า</div>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">เอกสารอ้างอิง</label>
                  <div className="flex gap-2 mb-2">
                    <select className="w-1/3 border border-slate-300 rounded-lg p-2 bg-slate-50 text-xs" value={referenceType} onChange={(e) => setReferenceType(e.target.value as any)}>
                      <option value="JOB">ใบงาน (Job)</option>
                    </select>
                    <div className="w-2/3">
                      <SearchableSelect
                        value={referenceIds[0] || ''}
                        onChange={(value) => setReferenceIds(value ? [value] : [])}
                        options={displayJobs.map((j) => {
                          const c = (j as any).customer;
                          return { value: j.id, label: `${c ? `${c.first_name} ${c.last_name}` : 'Unknown'}` };
                        })}
                        placeholder="เลือกใบงาน..."
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">หมายเหตุ (Notes)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none bg-slate-50 placeholder:text-slate-400 shadow-sm" placeholder="ระบุหมายเหตุเพิ่มเติม..." />
                </div>
              </div>
            </div>

          </div>
        </form>
      </Modal>

      {/* Modals ที่เกี่ยวข้อง */}
      {isProductModalOpen && (
        <ProductSelectionModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          onAddProducts={handleAddProducts}
          products={productsInWarehouse} 
          existingProductIds={existingProductIds}
          disableFetch={true}
          stockMap={warehouseId ? effectiveStockMap.get(warehouseId) : undefined}
        />
      )}

      {isReferenceModalOpen && (
        <ReferenceSelectionModal
          isOpen={isReferenceModalOpen}
          onClose={() => setIsReferenceModalOpen(false)}
          onAddReferences={(refIds) => setReferenceIds((prev) => Array.from(new Set([...prev, ...refIds])))}
          jobs={displayJobs}
          currentSelection={referenceIds}
          allUsedReferenceIds={[]}
        />
      )}

      {isCustomerSelectionModalOpen && (
        <CustomerSelectionModal
          isOpen={isCustomerSelectionModalOpen}
          onClose={() => setIsCustomerSelectionModalOpen(false)}
          onConfirm={(ids) => { setSelectedCustomerIds(ids); setIsCustomerSelectionModalOpen(false); }}
          customers={customers}
          initialSelectedIds={selectedCustomerIds}
        />
      )}
    </>
  );
};