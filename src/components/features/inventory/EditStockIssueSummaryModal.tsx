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

// Import Modals
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
import { User, Customer } from '@/src/types/entity/app.interface';
import { UserApi } from '../../../api/user';
import { WarehouseApi } from '../../../api/warehouse';
import { JobApi } from '../../../api/job';
import { VehicleApi } from '../../../api/vehicle';
import { Job } from '@/src/types/entity/job.interface';

interface ExpenseLineItem {
  id: string;
  description: string;
  amount: number | '';
}

interface EditStockIssueSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: any) => Promise<void>;
  summary: StockIssueSummary | null;
  warehouses: Warehouse[];
  products: Product[];
  users: User[];
  customers?: Customer[];
  currentUser?: User;
  stockMap?: Map<string, Map<string, number>>;
}

export const EditStockIssueSummaryModal: React.FC<EditStockIssueSummaryModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  summary,
  warehouses,
  products,
  users,
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
  
  // 🌟 State สำหรับเก็บสถานะเอกสาร
  const [currentStatus, setCurrentStatus] = useState<string>('PENDING');
  
  const [items, setItems] = useState<Omit<StockIssueItemSummary, 'id' | 'stock_issue_summary_id'>[]>([]);
  
  const [expenseItems, setExpenseItems] = useState<ExpenseLineItem[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [referenceType, setReferenceType] = useState<'JOB'>('JOB');
  const [jobId, setJobId] = useState<string>('');
  
  const [walletInfo, setWalletInfo] = useState<{ balance: number; expense_limit: number; } | null>(null);
  const [fetchedRequester, setFetchedRequester] = useState<User | null>(null);
  
  const [fetchedJobs, setFetchedJobs] = useState<Job[]>([]); 

  const [destinationLimits, setDestinationLimits] = useState<Map<string, number>>(new Map());
  const [localStockMap, setLocalStockMap] = useState<Map<string, Map<string, number>>>(new Map());
  const [vehicleWarehouseOptions, setVehicleWarehouseOptions] = useState<{ value: string; label: string }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerSelectionModalOpen, setIsCustomerSelectionModalOpen] = useState(false);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  
  const goodsFormRef = useRef<HTMLFormElement>(null);

  // ==========================================
  // 🌟 Logic: จัดการ User & Role
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
    return ['LEAD_TEACH', 'LEAD_TECH', 'TECH'].includes(loggedInUser.role);
  }, [loggedInUser.role]);

  const userOptions = useMemo(() => {
    return users.map((u) => ({
      value: String(u.id),
      label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.nick_name || 'Unknown',
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
  // 2. DATA FETCHING & LOGIC
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

        const vehicleWhs = allWarehouses.filter((w: any) => w.type === WarehouseType.VEHICLE).map((w: any) => ({ value: w.id, label: w.name }));
        setVehicleWarehouseOptions(vehicleWhs);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
      const vehicleWhs = warehouses.filter((w) => w.type === WarehouseType.VEHICLE).map((w) => ({ value: w.id, label: w.name }));
      setVehicleWarehouseOptions(vehicleWhs);
    }
  }, [warehouses]);

  const fetchVehicleLimits = useCallback(async (selectedWarehouseId: string) => {
    try {
      const res = await VehicleApi.getVehicleStockLimit(selectedWarehouseId);
      const limitMap = new Map<string, number>();
      
      const limitsData = Array.isArray(res) ? res : (res as any)?.data || [];
      
      if (limitsData && limitsData.length > 0) {
        limitsData.forEach((limit: any) => {
          limitMap.set(limit.product_id, Number(limit.max_return_qty));
        });
      }
      
      setDestinationLimits(limitMap); 
    } catch (error) {
      console.error('Failed to fetch vehicle limits', error);
      setDestinationLimits(new Map());
    }
  }, []);

  const fetchJobs = useCallback(async (customerIds: string[] = []) => {
    try {
      let queryParams: any = { limit: 10 };
      const res = await JobApi.getAll(queryParams);
      
      if (res && res.data) {
        let jobsData = res.data;
        if (customerIds.length > 0) {
          jobsData = jobsData.filter((j: any) => {
            const cId = j.customer_id || j.customer?.id;
            return customerIds.includes(cId);
          });
        }
        setFetchedJobs(jobsData);
      }
    } catch (error) {
      console.error('Failed to fetch jobs', error);
      setFetchedJobs([]);
    }
  }, []);

  const effectiveStockMap = useMemo(() => {
    return localStockMap.size > 0 ? localStockMap : stockMap;
  }, [stockMap, localStockMap]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // 🌟 ดึงข้อมูล Default Value ลงฟอร์มเมื่อเข้าสู่หน้า Edit
  useEffect(() => {
    if (isOpen) {
      if (summary) {
        setWarehouseId(summary.warehouse_id || '');
        setRequesterId(summary.requester_id || loggedInUser.id);
        setRecipientId((summary as any).recipient_id || loggedInUser.id);
        setNotes(summary.notes || '');
        setCurrentStatus(summary.status || 'PENDING'); // เซ็ตสถานะเริ่มต้นจาก API
        
        setJobId((summary as any).job_id || '');
        if ((summary as any).customer_id) {
          setSelectedCustomerIds([(summary as any).customer_id]);
        } else {
          setSelectedCustomerIds([]);
        }

        if (summary.items && summary.items.length > 0) {
          setItems(summary.items.map(item => ({ ...item })));
        } else {
          setItems([]);
        }

        if ((summary as any).expenses && (summary as any).expenses.length > 0) {
          setExpenseItems((summary as any).expenses.map((e: any) => ({
            id: e.id || crypto.randomUUID(),
            description: e.description || '',
            amount: e.amount || 0
          })));
        } else {
          setExpenseItems([]);
        }
      }

      setDestinationLimits(new Map());
      setIsSubmitting(false);
      fetchWarehouses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, summary, fetchWarehouses, loggedInUser.id]); 

  useEffect(() => {
    if (isOpen) {
       fetchJobs(selectedCustomerIds);
       if (jobId && selectedCustomerIds.length > 0) {
          const isJobStillValid = fetchedJobs.some(j => j.id === jobId);
          if(!isJobStillValid) {
             setJobId('');
          }
       }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerIds, fetchJobs, isOpen]);

  useEffect(() => {
    if (warehouseId) {
      fetchVehicleLimits(warehouseId);
    } else {
      setDestinationLimits(new Map());
    }
  }, [warehouseId, fetchVehicleLimits]);

  useEffect(() => {
    if (requesterId) {
      UserApi.getById(requesterId).then(setFetchedRequester).catch(() => setFetchedRequester(null));
      UserApi.getWallet(requesterId).then(setWalletInfo).catch(() => setWalletInfo(null));
    } else {
      setFetchedRequester(null);
      setWalletInfo(null);
    }
  }, [requesterId]);

  const selectedRequester = useMemo(() => fetchedRequester || users.find((u) => String(u.id) === String(requesterId)), [fetchedRequester, requesterId, users]);
  const totalExpenses = useMemo(() => expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [expenseItems]);
  
  const isOverLimit = useMemo(() => {
    if (walletInfo && typeof walletInfo.balance === 'number') return totalExpenses > walletInfo.balance;
    if (!selectedRequester || typeof (selectedRequester as any).creditLimit !== 'number') return false;
    return totalExpenses > (selectedRequester as any).creditLimit;
  }, [totalExpenses, selectedRequester, walletInfo]);

  const isAnyItemOverLimit = useMemo(() => {
    if (!warehouseId) return false;
    return items.some((item) => {
      const available = effectiveStockMap.get(warehouseId)?.get(item.product_id) || 0;
      if (item.quantity > available) return true;

      const limit = destinationLimits.get(item.product_id);
      if (limit !== undefined && item.quantity > limit) return true;

      return false;
    });
  }, [items, warehouseId, effectiveStockMap, destinationLimits]);

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

  const handleAddExpense = () => setExpenseItems((prev) => [...prev, { id: crypto.randomUUID(), description: '', amount: '' }]);
  const handleRemoveExpenseItem = (id: string) => setExpenseItems((prev) => prev.filter((item) => item.id !== id));
  const handleExpenseItemChange = (id: string, field: keyof ExpenseLineItem, value: any) => {
    setExpenseItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) return alert('กรุณาเลือกรถบริการ');
    if (items.length === 0) return alert('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ');

    const invalidItems = items.filter((item) => !item.product_id || item.quantity <= 0);
    if (invalidItems.length > 0) return alert('กรุณาระบุจำนวนสินค้าให้ถูกต้อง');

    // 🌟 Validate: หากมีการใช้เงินเกินวงเงิน หรือเบิกสินค้าเกินโควต้า ต้องบังคับเลือก Job และ Notes
    if (isOverLimit || isAnyItemOverLimit) {
      if (!jobId || !notes.trim()) {
        return alert('กรุณาระบุ "เอกสารอ้างอิง (ใบงาน)" และ "หมายเหตุ" เนื่องจากมีการเบิกสินค้าหรือใช้เงินเกินโควต้า');
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        ...summary, // แนบ ID และฟิลด์เดิมกลับไปด้วยสำหรับ Update
        warehouse_id: warehouseId,
        requester_id: requesterId || undefined,
        recipient_id: recipientId || undefined, 
        notes: notes || undefined,
        status: currentStatus, // 🌟 ใช้ค่าจาก Dropdown ตามที่ผู้ใช้งานเลือก 
        items: items as StockIssueItemSummary[],
        expenses: expenseItems.map((item) => ({ type: 'EXPENSE', description: item.description, amount: Number(item.amount) })),
      };

      if (jobId) payload.job_id = jobId;
      if (selectedCustomerIds.length > 0) payload.customer_id = selectedCustomerIds[0];

      await onUpdate(payload);
      onClose();
    } catch (error) {
      console.error('Failed to update stock issue summary', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!warehouseId) return alert('กรุณาเลือกรถบริการก่อนบันทึกฉบับร่าง');
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...summary,
        warehouse_id: warehouseId,
        requester_id: requesterId || undefined,
        recipient_id: recipientId || undefined,
        notes: notes || undefined,
        status: 'DRAFT', // 🌟 Save draft บังคับเป็น DRAFT
        items: items as StockIssueItemSummary[],
        expenses: expenseItems.map((item) => ({ type: 'EXPENSE', description: item.description, amount: Number(item.amount) })),
      };

      if (jobId) payload.job_id = jobId;
      if (selectedCustomerIds.length > 0) payload.customer_id = selectedCustomerIds[0];

      await onUpdate(payload);
      onClose();
    } catch (error) {
      console.error('Failed to save draft', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const productsInWarehouse = useMemo(() => {
    if (!warehouseId) return [];
    const warehouseStock = effectiveStockMap.get(warehouseId);
    if (!warehouseStock) return [];
    return products.filter((p) => {
      const qty = warehouseStock.get(p.id);
      return qty !== undefined && qty > 0;
    });
  }, [warehouseId, effectiveStockMap, products]);

  const sourceWarehouse = useMemo(() => warehouses.find((w) => w.id === warehouseId) || { id: warehouseId }, [warehouseId, warehouses]);
  const existingProductIds = useMemo(() => Array.from(new Set(items.map((item) => item.product_id))), [items]);

  if (!summary) return null;

  // ==========================================
  // 4. UI RENDER 
  // ==========================================
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="แก้ไขสรุปเบิกสินค้า/อุปกรณ์"
        size="5xl"
        footer={
          <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>* จำเป็นต้องกรอกข้อมูลที่มีเครื่องหมายดอกจัน</span>
              {(isOverLimit || isAnyItemOverLimit) && (
                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  ⚠️ ยอดรวมหรือจำนวนสินค้าเกินที่กำหนด (ควรตั้งเป็น PENDING เพื่อรออนุมัติ)
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
                onClick={handleSaveDraft}
                disabled={isSubmitting || !warehouseId}
                className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium border border-slate-300"
              >
                บันทึกฉบับร่าง
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="edit-stock-issue-summary-form"
                disabled={isSubmitting || !warehouseId || items.length === 0}
                className={`py-2 px-6 rounded-lg text-white font-semibold shadow-sm transition-all disabled:bg-slate-300 ${
                  (isOverLimit || isAnyItemOverLimit) ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </Button>
            </div>
          </div>
        }
      >
        <form ref={goodsFormRef} id="edit-stock-issue-summary-form" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            
            {/* 🌟 ID Indicator & Status Dropdown */}
            <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-lg border border-slate-200">
               <span className="text-slate-500 font-semibold text-sm">เลขที่ใบเบิก:</span>
               <span className="text-slate-800 font-mono text-sm font-bold">{summary.id}</span>
               
               <div className="ml-auto flex items-center gap-2">
                 <span className="text-xs font-semibold text-slate-600">สถานะเอกสาร:</span>
                 <select
                   value={currentStatus}
                   onChange={(e) => setCurrentStatus(e.target.value)}
                   className={`text-xs font-bold border rounded-md shadow-sm focus:ring-primary focus:border-primary px-3 py-1.5 transition-colors cursor-pointer outline-none ${
                     currentStatus === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                     currentStatus === 'APPROVED' || currentStatus === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                     currentStatus === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-300' :
                     'bg-white text-slate-700 border-slate-300'
                   }`}
                 >
                   <option value="DRAFT">DRAFT (ฉบับร่าง)</option>
                   <option value="PENDING">PENDING (รออนุมัติ)</option>
                   <option value="APPROVED">APPROVED (อนุมัติแล้ว)</option>
                   <option value="COMPLETED">COMPLETED (เสร็จสิ้น)</option>
                   <option value="CANCELLED">CANCELLED (ยกเลิก)</option>
                 </select>
               </div>
            </div>

            {/* Card 1: Logistics Header */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative z-50">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <TruckIcon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-800">การเคลื่อนย้ายสินค้า</h3>
                <div className="ml-auto flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">วันที่เบิก:</span>
                  <input type="date" defaultValue={summary.created_at ? new Date(summary.created_at).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10)} className="bg-transparent border-none p-0 text-slate-800 font-bold focus:ring-0 text-sm w-32 cursor-pointer" readOnly />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100 relative z-50">
                <div className="flex-1 w-full relative z-50">
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

            {/* Card 2: Requester / Recipient Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative z-40">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-green-50 rounded-lg text-green-600"><UserIcon className="w-5 h-5" /></div>
                <h3 className="text-base font-semibold text-slate-800">ข้อมูลผู้เบิกและผู้รับ</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex-1 w-full relative z-40">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ผู้เบิก (Requester) <span className="text-red-500">*</span></label>
                  <SearchableSelect 
                    options={requesterOptions} 
                    value={requesterId} 
                    onChange={(v) => {
                      if (isLockedRole) return; 
                      setRequesterId(v);
                    }} 
                    placeholder="ค้นหาผู้เบิก..." 
                  />
                </div>
                <div className="flex-1 w-full relative z-30">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ผู้รับเงิน (Recipient)</label>
                  <SearchableSelect 
                    options={userOptions} 
                    value={recipientId} 
                    onChange={setRecipientId} 
                    placeholder="ค้นหาผู้รับเงิน..." 
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Items List */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[250px] relative z-20">
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
                  <div className="space-y-3 mt-4">
                    <div className="grid grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50/80 rounded-lg text-xs font-bold text-slate-500 uppercase tracking-wider border border-slate-100 items-center">
                      <div className="col-span-4">รายละเอียดสินค้า</div>
                      <div className="col-span-2 text-center">สต๊อกคงเหลือ</div>
                      <div className="col-span-2 text-center text-blue-600">Limit รถ</div>
                      <div className="col-span-3 text-center text-emerald-600">จำนวนที่ใช้จริง</div>
                      <div className="col-span-1 text-center">จัดการ</div>
                    </div>

                    {items.map((item, index) => {
                      const product = productMap.get(item.product_id);
                      const available = sourceWarehouse?.id ? effectiveStockMap.get(sourceWarehouse.id)?.get(item.product_id) || 0 : 0;
                      const limit = destinationLimits.get(item.product_id);
                      
                      const isOverStock = available > 0 && item.quantity > available;
                      const isOverLimitObj = limit !== undefined && item.quantity > limit;
                      const hasWarning = isOverStock || isOverLimitObj;

                      return (
                        <div 
                          key={index} 
                          className={`px-5 py-4 rounded-xl border transition-all duration-200 flex items-center bg-white shadow-sm hover:shadow-md ${
                            hasWarning ? 'border-red-300 bg-red-50/30' : 'border-slate-200 hover:border-indigo-200'
                          }`}
                        >
                          <div className="grid grid-cols-12 gap-4 items-center w-full">
                            <div className="flex flex-col justify-center col-span-4">
                              <span className="font-bold text-slate-800 text-sm truncate pr-2" title={item.product_name}>
                                {item.product_name || 'Unknown Product'}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                  {product?.code || product?.id?.substring(0, 8) || item.product_id.substring(0,8)}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col items-center justify-center col-span-2">
                              <span className="text-[11px] text-slate-400 font-medium mb-0.5">ในรถมี</span>
                              <span className={`text-sm font-bold ${available === 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                {available.toLocaleString()} <span className="text-xs font-normal text-slate-500 ml-0.5">{item.unit}</span>
                              </span>
                            </div>

                            <div className="flex flex-col items-center justify-center col-span-2">
                              <span className="text-[11px] text-blue-400 font-medium mb-0.5">จำกัด</span>
                              <span className="text-sm font-bold text-blue-600">
                                {limit !== undefined ? limit.toLocaleString() : '-'} <span className="text-xs font-normal text-blue-400 ml-0.5">{limit !== undefined ? item.unit : ''}</span>
                              </span>
                            </div>
                            
                            <div className="col-span-3 flex flex-col items-center justify-center relative">
                              <div className="relative flex items-center w-full max-w-[120px] group">
                                <Input
                                  type="number" 
                                  min="1" 
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                  className={`w-full text-center h-10 text-sm font-bold rounded-lg pr-8 transition-all ${
                                    hasWarning 
                                      ? 'border-red-400 text-red-600 focus:border-red-500 focus:ring-red-200 bg-red-50' 
                                      : 'border-slate-300 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-200 bg-slate-50 group-hover:bg-white'
                                  }`}
                                />
                                <span className="absolute right-3 text-[10px] font-semibold text-slate-400 pointer-events-none">
                                  {item.unit}
                                </span>
                              </div>
                              {isOverStock && (
                                <span className="text-[10px] font-bold absolute -bottom-5 whitespace-nowrap text-red-500 flex items-center gap-1">
                                  <XCircleIcon className="w-3 h-3" /> เกินสต๊อก
                                </span>
                              )}
                              {!isOverStock && isOverLimitObj && (
                                <span className="text-[10px] font-bold absolute -bottom-5 whitespace-nowrap text-amber-500 flex items-center gap-1">
                                  <XCircleIcon className="w-3 h-3" /> เกินโควต้า
                                </span>
                              )}
                            </div>
                            
                            <div className="col-span-1 flex justify-center">
                              <button 
                                type="button" 
                                onClick={() => handleRemoveItem(index)} 
                                className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all duration-200 focus:outline-none"
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

            {/* Card 4: Finance Card */}
            <div className={`p-5 rounded-xl border shadow-sm transition-all relative z-10 ${isOverLimit ? 'bg-red-50/50 border-red-200 ring-1 ring-red-100' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide pb-2">
                  <span className="bg-emerald-100 text-emerald-700 p-0.5 rounded text-[10px] px-1.5 border border-emerald-200">฿</span> การเงิน & ค่าใช้จ่าย
                </h3>
                <Button type="button" onClick={handleAddExpense} variant="outline" className="text-primary border-primary/20 bg-primary/5 text-sm font-medium">
                  <PlusIcon className="w-4 h-4 mr-1.5" /> เพิ่มรายการ
                </Button>
              </div>
              
              {walletInfo && (
                <div className="mb-5 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
                    <span>สถานะวงเงิน</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOverLimit ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isOverLimit ? 'เกินวงเงิน' : 'ปกติ'}
                    </span>
                  </div>
                  <div className="flex items-end justify-between mb-1"><span className="text-xs text-slate-400">วงเงิน</span><span className="text-sm font-medium text-slate-600">{walletInfo.expense_limit.toLocaleString()} บาท</span></div>
                  <div className="flex items-end justify-between mb-1"><span className="text-xs text-slate-400">คงเหลือปัจจุบัน</span><span className="text-sm font-medium text-slate-600">{walletInfo.balance.toLocaleString()} บาท</span></div>
                  {totalExpenses > 0 && (
                    <div className="flex items-end justify-between mb-1"><span className="text-xs text-slate-400">ค่าใช้จ่ายครั้งนี้</span><span className="text-sm font-medium text-amber-600">-{totalExpenses.toLocaleString()} บาท</span></div>
                  )}
                  <div className="flex items-end justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-500">คงเหลือสุทธิ</span>
                    <span className={`text-lg font-bold ${walletInfo.balance - totalExpenses < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {(walletInfo.balance - totalExpenses).toLocaleString()} บาท
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
                    <input type="text" value={item.description} onChange={(e) => handleExpenseItemChange(item.id, 'description', e.target.value)} placeholder="ระบุรายละเอียด..." className="flex-grow border-0 border-b border-transparent focus:border-primary focus:ring-0 text-sm bg-transparent font-medium" />
                    <input type="number" value={item.amount} onChange={(e) => handleExpenseItemChange(item.id, 'amount', e.target.value)} placeholder="0.00" className="w-16 border-0 border-b border-transparent focus:border-primary focus:ring-0 text-xs text-right font-bold" />
                    <button type="button" onClick={() => handleRemoveExpenseItem(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><XCircleIcon className="w-4 h-4" /></button>
                  </div>
                ))}
                {expenseItems.length > 0 && (
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-3">
                    <span className="text-xs font-bold text-slate-600">รวมค่าใช้จ่าย</span>
                    <span className="text-sm font-bold text-primary">{totalExpenses.toLocaleString()} บาท</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 5: Reference Card */}
            <div className={`bg-white p-5 rounded-xl border shadow-sm relative z-0 transition-all ${
                (isOverLimit || isAnyItemOverLimit) ? 'border-amber-400 ring-1 ring-amber-100 bg-amber-50/10' : 'border-slate-200'
              }`}>
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-2">
                <DocumentCheckIcon className="w-4 h-4 text-slate-400" /> ข้อมูลอ้างอิง
              </h3>
              
              {(isOverLimit || isAnyItemOverLimit) && (
                 <div className="mb-4 text-xs font-semibold text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                   * จำเป็นต้องระบุ "เอกสารอ้างอิง" และ "หมายเหตุ" เนื่องจากมีการเบิกสินค้าหรือใช้เงินเกินโควต้า
                 </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                    เอกสารอ้างอิง {(isOverLimit || isAnyItemOverLimit) && <span className="text-red-500">*</span>}
                  </label>
                  <div className="flex gap-2 mb-2 relative z-20">
                    <select className="w-1/3 border border-slate-300 rounded-lg p-2 bg-slate-50 text-xs" value={referenceType} onChange={(e) => setReferenceType(e.target.value as any)}>
                      <option value="JOB">ใบงาน (Job)</option>
                    </select>
                    <div className="w-2/3">
                      <SearchableSelect
                        value={jobId || ''}
                        onChange={(value) => setJobId(value || '')}
                        options={fetchedJobs.map((j) => {
                          const c = (j as any).customer;
                          const jobDate = (j.created_at);
                          return { value: j.id, label: `[${jobDate}] ${c ? `${c.first_name} ${c.last_name}` : 'Unknown'}` };
                        })}
                        placeholder="เลือกใบงาน..."
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                    หมายเหตุ (Notes) {(isOverLimit || isAnyItemOverLimit) && <span className="text-red-500">*</span>}
                  </label>
                  <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    rows={3} 
                    className={`w-full border rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none shadow-sm ${
                      (isOverLimit || isAnyItemOverLimit) && !notes.trim() ? 'border-amber-300 bg-amber-50 placeholder:text-amber-300' : 'border-slate-300 bg-slate-50 placeholder:text-slate-400'
                    }`}
                    placeholder="ระบุหมายเหตุเพิ่มเติม..." 
                  />
                </div>
              </div>
            </div>

          </div>
        </form>
      </Modal>

      {/* Modals */}
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
          onAddReferences={(refIds) => setJobId(refIds[0] || '')}
          jobs={fetchedJobs}
          currentSelection={jobId ? [jobId] : []}
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