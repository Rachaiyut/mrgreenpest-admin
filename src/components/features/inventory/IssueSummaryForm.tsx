// ===== React =====
import Swal from 'sweetalert2';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// ===== Types / Enums =====
import {
  User as UserType,
  Job as JobType,
  Customer as CustomerType,
  ExpenseItem as ExpenseItemType,
  IssueItemSummary as IssueItemSummaryType,
  Warehouse,
  Product as ProductType,
  IssueItemSummary,
} from '@/src/types/entity/app.interface';
import {
  StockIssueSummary,
  Warehouse as InventoryWarehouse,
} from '@/src/types/entity/inventory.interface';
import { Product } from '@/src/types/entity/product.interface';
import { WarehouseType } from '@/src/types/enums/inventory';

// ===== Components =====
import { Input, Button } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { ProductSelectionModal } from '../products/ProductSelectionModal';
import { CustomerSelectionModal } from '../customers/CustomerSelectionModal';
import { ReferenceSelectionModal } from '../../common/ReferenceSelectionModal';

// ===== API =====
import { JobApi } from '../../../api/job';
import { UserApi } from '../../../api/user';
import { WarehouseApi } from '../../../api/warehouse';
import { VehicleApi } from '../../../api/vehicle';

// ===== Assets =====
import {
  BanknotesIcon,
  CalendarDaysIcon,
  DocumentCheckIcon,
  PlusIcon,
  TrashIcon,
  TruckIcon,
  UserIcon,
  XCircleIcon,
} from '../../../assets/icons/Icons';

// ==========================================
// INTERFACE
// ==========================================
export interface IssueSummaryFormProps {
  mode: 'create' | 'edit';
  isOpen: boolean;
  summary?: StockIssueSummary | null;
  warehouses: (Warehouse | InventoryWarehouse)[];
  products: (ProductType | Product)[];
  users: UserType[];
  customers?: CustomerType[];
  currentUser?: UserType;
  stockMap?: Map<string, Map<string, number>>;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export const IssueSummaryForm: React.FC<IssueSummaryFormProps> = ({
  mode,
  isOpen,
  summary = null,
  warehouses,
  products,
  users,
  customers = [],
  currentUser,
  stockMap = new Map(),
  onSubmit,
  onCancel,
}) => {
  const isEditMode = mode === 'edit';

  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================
  const [enableGoods, setEnableGoods] = useState(true);
  const [enableExpense, setEnableExpense] = useState(true);
  const [warehouseId, setWarehouseId] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [notes, setNotes] = useState('');

  // Edit-only: document status
  const [currentStatus, setCurrentStatus] = useState<string>('PENDING');

  const [items, setItems] = useState<Omit<IssueItemSummary, 'id' | 'stock_issue_summary_id'>[]>([]);

  const defaultExpenseItems: ExpenseItemType[] = [
    { id: 'default-food', description: 'ค่าข้าว', amount: '' },
    { id: 'default-fuel', description: 'ค่าน้ำมัน', amount: '' },
    { id: 'default-other', description: 'อื่นๆ', amount: '' },
  ];
  const [expenseItems, setExpenseItems] = useState<ExpenseItemType[]>(defaultExpenseItems);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [referenceType, setReferenceType] = useState<'JOB'>('JOB');
  const [jobId, setJobId] = useState<string>('');

  const [walletInfo, setWalletInfo] = useState<{ balance: number; expense_limit: number } | null>(null);
  const [fetchedRequester, setFetchedRequester] = useState<UserType | null>(null);

  const [fetchedJobs, setFetchedJobs] = useState<JobType[]>([]);
  const jobSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [destinationLimits, setDestinationLimits] = useState<Map<string, number>>(new Map());
  const [localStockMap, setLocalStockMap] = useState<Map<string, Map<string, number>>>(new Map());
  const [vehicleWarehouseOptions, setVehicleWarehouseOptions] = useState<{ value: string; label: string }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerSelectionModalOpen, setIsCustomerSelectionModalOpen] = useState(false);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);

  const goodsFormRef = useRef<HTMLFormElement>(null);

  // ==========================================
  // Logic: User & Role
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
      console.error('Localstorage parsing error', e);
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

        const vehicleWhs = allWarehouses
          .filter((w: any) => w.type === WarehouseType.VEHICLE)
          .map((w: any) => ({ value: w.id, label: `${w.name}${w.vehicle?.vehicle_registration ? ` (${w.vehicle.vehicle_registration})` : ''}` }));
        setVehicleWarehouseOptions(vehicleWhs);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
      const vehicleWhs = (warehouses as any[])
        .filter((w) => w.type === WarehouseType.VEHICLE)
        .map((w) => ({ value: w.id, label: `${w.name}${w.vehicle?.vehicle_registration ? ` (${w.vehicle.vehicle_registration})` : ''}` }));
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

  const fetchJobs = useCallback(async (customerIds: string[] = [], search?: string) => {
    try {
      const queryParams: any = { limit: 20 };
      if (search?.trim()) queryParams.search = search.trim();
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

  // ==========================================
  // INIT: Load data when modal opens
  // ==========================================
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && summary) {
        // --- EDIT mode: populate from summary ---
        setWarehouseId(summary.warehouse_id || '');
        setRequesterId(summary.requester_id || loggedInUser.id);
        setRecipientId((summary as any).recipient_id || loggedInUser.id);
        setNotes(summary.notes || '');
        setCurrentStatus(summary.status || 'PENDING');

        setJobId((summary as any).job_id || '');
        if ((summary as any).customer_id) {
          setSelectedCustomerIds([(summary as any).customer_id]);
        } else {
          setSelectedCustomerIds([]);
        }

        if (summary.items && summary.items.length > 0) {
          setItems(summary.items.map((item) => ({ ...item })));
          setEnableGoods(true);
        } else {
          setItems([]);
        }

        if ((summary as any).expenses && (summary as any).expenses.length > 0) {
          setExpenseItems(
            (summary as any).expenses.map((e: any) => ({
              id: e.id || crypto.randomUUID(),
              description: e.description || '',
              amount: e.amount || 0,
            })),
          );
          setEnableExpense(true);
        } else {
          setExpenseItems([]);
        }
      } else {
        // --- CREATE mode: reset to defaults ---
        setWarehouseId('');
        setNotes('');
        setItems([]);
        setExpenseItems(defaultExpenseItems.map((item) => ({ ...item, id: item.id, amount: '' })));
        setSelectedCustomerIds([]);
        setJobId('');
        setCurrentStatus('PENDING');
        setEnableGoods(true);
        setEnableExpense(true);

        setRequesterId(loggedInUser.id);
        setRecipientId(loggedInUser.id);
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
        const isJobStillValid = fetchedJobs.some((j) => j.id === jobId);
        if (!isJobStillValid) {
          setJobId('');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerIds, fetchJobs, isOpen]);

  // Vehicle limits (edit mode keeps this; create mode also benefits)
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

  const selectedRequester = useMemo(
    () => fetchedRequester || users.find((u) => String(u.id) === String(requesterId)),
    [fetchedRequester, requesterId, users],
  );
  const totalExpenses = useMemo(
    () => expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [expenseItems],
  );

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

  const selectedCustomers = useMemo(
    () => customers.filter((c) => selectedCustomerIds.includes(c.id)),
    [customers, selectedCustomerIds],
  );

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
        unit: (product as any)?.unit?.name || 'หน่วย',
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

  const handleAddExpense = () =>
    setExpenseItems((prev) => [...prev, { id: crypto.randomUUID(), description: '', amount: '' }]);
  const isDefaultExpense = (id: string) => !isEditMode && (id === 'default-food' || id === 'default-fuel');
  const handleRemoveExpenseItem = (id: string) => {
    if (isDefaultExpense(id)) return;
    setExpenseItems((prev) => prev.filter((item) => item.id !== id));
  };
  const handleExpenseItemChange = (id: string, field: keyof ExpenseItemType, value: any) => {
    setExpenseItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  // --- Validate: at least 1 valid product or expense ---
  const hasValidEntries = useMemo(() => {
    const hasValidProducts = items.length > 0 && items.every((item) => item.product_id && item.quantity > 0);
    const hasValidExpenses =
      expenseItems.length > 0 && expenseItems.some((item) => item.description.trim() !== '' && Number(item.amount) > 0);
    return hasValidProducts || hasValidExpenses;
  }, [items, expenseItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId)
      return Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาเลือกรถบริการ' });

    // Validate: need at least 1 valid item (product or expense)
    if (!hasValidEntries) {
      return Swal.fire({
        icon: 'warning',
        title: 'กรุณาตรวจสอบ',
        text: 'กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ หรือ ระบุค่าใช้จ่ายอย่างน้อย 1 รายการ',
      });
    }

    const invalidItems = items.filter((item) => !item.product_id || item.quantity <= 0);
    if (invalidItems.length > 0)
      return Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาระบุจำนวนสินค้าให้ถูกต้อง' });

    // Validate: if over limit, must have job + notes
    if (isOverLimit || isAnyItemOverLimit) {
      if (!jobId || !notes.trim()) {
        return Swal.fire({
          icon: 'warning',
          title: 'กรุณาตรวจสอบ',
          text: 'กรุณาระบุ "เอกสารอ้างอิง (ใบงาน)" และ "หมายเหตุ" เนื่องจากมีการเบิกสินค้าหรือใช้เงินเกินโควต้า',
        });
      }
    }

    setIsSubmitting(true);
    try {
      // Filter out empty expenses
      const validExpenses = expenseItems.filter(
        (item) => item.description.trim() !== '' && Number(item.amount) > 0,
      );

      // Determine status
      let finalStatus: string;
      if (isEditMode) {
        // Edit mode: use the status dropdown value
        finalStatus = currentStatus;
      } else {
        // Create mode: auto-compute based on limits
        finalStatus = isOverLimit || isAnyItemOverLimit ? 'PENDING' : 'COMPLETED';
      }

      const payload: any = {
        ...(isEditMode && summary ? summary : {}), // spread original fields for edit
        warehouse_id: warehouseId,
        requester_id: requesterId || undefined,
        recipient_id: recipientId || undefined,
        purpose: isEditMode ? undefined : 'เบิกสินค้า/อุปกรณ์',
        notes: notes || undefined,
        status: finalStatus,
        items: items as IssueItemSummaryType[],
        expenses: validExpenses.map((item) => ({
          type: 'EXPENSE',
          description: item.description,
          amount: Number(item.amount),
        })),
      };

      if (jobId) payload.job_id = jobId;
      if (selectedCustomerIds.length > 0) payload.customer_id = selectedCustomerIds[0];

      await onSubmit(payload);
      onCancel();
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} stock issue summary`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!warehouseId)
      return Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาเลือกรถบริการก่อนบันทึกฉบับร่าง' });
    setIsSubmitting(true);
    try {
      const validExpenses = expenseItems.filter(
        (item) => item.description.trim() !== '' && Number(item.amount) > 0,
      );

      const payload: any = {
        ...(isEditMode && summary ? summary : {}),
        warehouse_id: warehouseId,
        requester_id: requesterId || undefined,
        recipient_id: recipientId || undefined,
        purpose: isEditMode ? undefined : 'เบิกสินค้า/อุปกรณ์ (Draft)',
        notes: notes || undefined,
        status: 'DRAFT',
        items: items as IssueItemSummary[],
        expenses: validExpenses.map((item) => ({
          type: 'EXPENSE',
          description: item.description,
          amount: Number(item.amount),
        })),
      };

      if (jobId) payload.job_id = jobId;
      if (selectedCustomerIds.length > 0) payload.customer_id = selectedCustomerIds[0];

      await onSubmit(payload);
      onCancel();
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

  const sourceWarehouse = useMemo(
    () => (warehouses as any[]).find((w) => w.id === warehouseId) || { id: warehouseId },
    [warehouseId, warehouses],
  );
  const existingProductIds = useMemo(() => Array.from(new Set(items.map((item) => item.product_id))), [items]);

  // ==========================================
  // 4. UI RENDER
  // ==========================================
  return (
    <>
      <form ref={goodsFormRef} id="issue-summary-form" onSubmit={handleSubmit}>
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
                <input
                  type="date"
                  defaultValue={
                    isEditMode && summary?.created_at
                      ? new Date(summary.created_at).toISOString().substring(0, 10)
                      : new Date().toISOString().substring(0, 10)
                  }
                  className="bg-transparent border-none p-0 text-slate-800 font-bold focus:ring-0 text-sm w-32 cursor-pointer"
                  readOnly
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 relative z-50">
              <div className="flex-1 w-full relative z-50">
                <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">
                  เบิกจากรถ <span className="text-red-500">*</span>
                </label>
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
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2.5 bg-green-50 rounded-lg text-green-600">
                <UserIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">ข้อมูลผู้เบิกและผู้รับ</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex-1 w-full relative z-40">
                <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">
                  ผู้เบิก (Requester) <span className="text-red-500">*</span>
                </label>
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
                <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">ผู้รับเงิน (Recipient)</label>
                <SearchableSelect options={userOptions} value={recipientId} onChange={setRecipientId} placeholder="ค้นหาผู้รับเงิน..." />
              </div>
            </div>
          </div>

          {/* Section Toggles */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-5">ประเภทการเบิก</h3>
            <div className="flex items-center gap-10">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableGoods}
                  onChange={(e) => {
                    if (!e.target.checked && !enableExpense) return;
                    if (!e.target.checked) setItems([]);
                    setEnableGoods(e.target.checked);
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-base font-semibold text-slate-700">รายการสินค้า</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableExpense}
                  onChange={(e) => {
                    if (!e.target.checked && !enableGoods) return;
                    if (!e.target.checked) setExpenseItems([]);
                    setEnableExpense(e.target.checked);
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-base font-semibold text-slate-700">การเงินและค่าใช้จ่าย</span>
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
                    <p className="text-sm text-slate-500 mt-0.5">
                      สินค้าที่ต้องการเบิกออกจากรถ (ไม่ต้องระบุก็ได้ หากต้องการเบิกเฉพาะเงิน)
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => setIsProductModalOpen(true)}
                  variant="outline"
                  className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 text-sm font-bold px-4 py-2"
                  disabled={!warehouseId}
                >
                  <PlusIcon className="w-5 h-5 mr-1.5" /> เพิ่มสินค้า
                </Button>
              </div>

              <div className="flex-grow overflow-y-auto bg-slate-50/30 p-5">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                    <div className="bg-slate-50 p-5 rounded-full mb-4 border border-dashed border-slate-200">
                      <TruckIcon className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-600 text-base">ยังไม่มีรายการสินค้า</p>
                    <p className="text-sm mt-1.5 text-slate-400">กดปุ่ม "เพิ่มสินค้า" ด้านบนเพื่อเลือกสินค้าจากรถ</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-2">
                    <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50/80 rounded-lg text-sm font-bold text-slate-800 tracking-wide border border-slate-100 items-center">
                      <div className="col-span-2">รหัส</div>
                      <div className="col-span-3">สินค้า</div>
                      <div className="col-span-2 text-center">คงเหลือ</div>
                      <div className="col-span-4 text-center">จำนวน</div>
                      <div className="col-span-1 text-center"></div>
                    </div>

                    {items.map((item, index) => {
                      const product = productMap.get(item.product_id);
                      const available = sourceWarehouse?.id
                        ? effectiveStockMap.get(sourceWarehouse.id)?.get(item.product_id) || 0
                        : 0;
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
                            <div className="col-span-2">
                              <span className="font-mono text-sm font-bold text-green-600">
                                {(product as any)?.code || item.product_id.substring(0, 8)}
                              </span>
                            </div>
                            <div className="col-span-3">
                              <span className="font-semibold text-slate-800 text-base truncate block pr-2" title={item.product_name}>
                                {item.product_name || 'Unknown Product'}
                              </span>
                            </div>

                            <div className="flex items-center justify-center col-span-2">
                              <span className={`text-base font-bold ${available === 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                {available.toLocaleString()}
                              </span>
                            </div>

                            <div className="col-span-4 flex items-center justify-center relative">
                              <div className="relative flex items-center w-full max-w-[140px] group">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                  className={`w-full text-center h-11 text-base font-bold rounded-lg pr-10 transition-all ${
                                    hasWarning
                                      ? 'border-red-400 text-red-600 focus:border-red-500 focus:ring-red-200 bg-red-50'
                                      : 'border-slate-300 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-200 bg-slate-50 group-hover:bg-white'
                                  }`}
                                />
                                <span className="absolute right-3 text-xs font-semibold text-slate-400 pointer-events-none">
                                  {item.unit}
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
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-200 focus:outline-none"
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

          {/* Card 4: Finance Card */}
          {enableExpense && (
            <div
              className={`rounded-xl border shadow-sm transition-all relative z-10 flex flex-col ${
                isOverLimit ? 'bg-red-50/50 border-red-200 ring-1 ring-red-100' : 'bg-white border-slate-200'
              }`}
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
                    <BanknotesIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">การเงินและค่าใช้จ่าย</h3>
                    <p className="text-sm text-slate-500 mt-0.5">รายการเบิกเงินสด (ไม่ต้องระบุก็ได้ หากต้องการเบิกเฉพาะสินค้า)</p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleAddExpense}
                  variant="outline"
                  className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 text-sm font-bold px-4 py-2"
                >
                  <PlusIcon className="w-5 h-5 mr-1.5" /> เพิ่มรายการเบิกเงิน
                </Button>
              </div>
              <div className="p-5">

              {walletInfo && (
                <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-500 mb-3 border-b border-slate-100 pb-2">
                    <span>สถานะวงเงินเบิกจ่าย</span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        isOverLimit ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isOverLimit ? 'เกินวงเงิน' : 'ปกติ'}
                    </span>
                  </div>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-sm font-medium text-slate-500">วงเงินที่ได้รับ</span>
                    <span className="text-base font-semibold text-slate-700">
                      {walletInfo.expense_limit.toLocaleString()} บาท
                    </span>
                  </div>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-sm font-medium text-slate-500">คงเหลือปัจจุบัน</span>
                    <span className="text-base font-semibold text-slate-700">{walletInfo.balance.toLocaleString()} บาท</span>
                  </div>
                  {totalExpenses > 0 && (
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-sm font-medium text-slate-500">รวมที่ต้องการเบิกครั้งนี้</span>
                      <span className="text-base font-bold text-amber-600">-{totalExpenses.toLocaleString()} บาท</span>
                    </div>
                  )}
                  <div className="flex items-end justify-between mt-3 pt-3 border-t border-slate-100 mb-2">
                    <span className="text-sm font-bold text-slate-600">คงเหลือสุทธิ (หลังเบิก)</span>
                    <span
                      className={`text-xl font-black ${
                        walletInfo.balance - totalExpenses < 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {(walletInfo.balance - totalExpenses).toLocaleString()} บาท
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-1 overflow-hidden">
                    <div
                      style={{
                        width: `${
                          walletInfo.expense_limit > 0
                            ? Math.min(
                                100,
                                ((walletInfo.expense_limit - walletInfo.balance + totalExpenses) / walletInfo.expense_limit) * 100,
                              )
                            : 100
                        }%`,
                      }}
                      className={`h-full transition-all ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`}
                    />
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
                    <div
                      key={item.id}
                      className="flex gap-3 items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm group hover:border-primary/30 transition-colors"
                    >
                      <div className="p-2 bg-slate-100 rounded-md text-slate-400">
                        <BanknotesIcon className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleExpenseItemChange(item.id, 'description', e.target.value)}
                        placeholder="ระบุรายละเอียดค่าใช้จ่าย (เช่น ค่าทางด่วน, ค่าน้ำมัน)..."
                        className={`flex-grow border-0 border-b border-transparent focus:border-primary focus:ring-0 text-sm font-medium bg-transparent px-2 ${
                          isDefaultExpense(item.id) ? 'text-slate-700' : ''
                        }`}
                        readOnly={isDefaultExpense(item.id)}
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
                      {isDefaultExpense(item.id) ? (
                        <div className="ml-2 p-1 w-8" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveExpenseItem(item.id)}
                          className="text-slate-300 hover:text-red-500 ml-2 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <XCircleIcon className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                  ))
                )}

                {expenseItems.length > 0 && (
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4">
                    <span className="text-sm font-bold text-slate-600">ยอดรวมขอเบิกเงิน</span>
                    <span className="text-xl font-black text-primary">
                      {totalExpenses.toLocaleString()}{' '}
                      <span className="text-base font-bold text-slate-500 ml-1">บาท</span>
                    </span>
                  </div>
                )}
              </div>
              </div>
            </div>
          )}

          {/* Card 5: Reference Card */}
          <div
            className={`rounded-xl border shadow-sm relative z-0 transition-all flex flex-col ${
              isOverLimit || isAnyItemOverLimit ? 'border-amber-400 ring-1 ring-amber-100 bg-amber-50/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600">
                <DocumentCheckIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">ข้อมูลอ้างอิงและหมายเหตุ</h3>
                <p className="text-sm text-slate-500 mt-0.5">ระบุเอกสารอ้างอิงและเหตุผลการเบิก</p>
              </div>
            </div>
            <div className="p-5">

            {(isOverLimit || isAnyItemOverLimit) && (
              <div className="mb-5 text-sm font-semibold text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>
                  จำเป็นต้องระบุ <strong>"เอกสารอ้างอิง"</strong> และ <strong>"หมายเหตุ"</strong>{' '}
                  เนื่องจากมีการเบิกสินค้าหรือขอเบิกเงินเกินโควต้าที่ได้รับ
                </span>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">
                  เอกสารอ้างอิง {(isOverLimit || isAnyItemOverLimit) && <span className="text-red-500">*</span>}
                </label>
                <div className="mb-2 relative z-20">
                  <div className="w-full">
                    <SearchableSelect
                      value={jobId || ''}
                      onChange={(value) => setJobId(value || '')}
                      options={fetchedJobs.map((j) => {
                        const c = (j as any).customer;
                        const customerName = c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '-';
                        const workDate = (j as any).start_date || (j as any).appointment_date || j.created_at;
                        const formattedDate = workDate ? new Date(workDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                        return {
                          value: j.id,
                          label: `${customerName} (${formattedDate})`,
                        };
                      })}
                      placeholder="ค้นหาและเลือกใบงาน..."
                      onSearchChange={(q) => {
                        if (jobSearchTimer.current) clearTimeout(jobSearchTimer.current);
                        jobSearchTimer.current = setTimeout(() => {
                          fetchJobs(selectedCustomerIds, q);
                        }, 400);
                      }}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">
                  หมายเหตุ (Notes) {(isOverLimit || isAnyItemOverLimit) && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className={`w-full border rounded-xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none shadow-sm transition-colors ${
                    (isOverLimit || isAnyItemOverLimit) && !notes.trim()
                      ? 'border-amber-300 bg-amber-50 placeholder:text-amber-400/70'
                      : 'border-slate-300 bg-slate-50 placeholder:text-slate-400'
                  }`}
                  placeholder="ระบุเหตุผลการเบิกเพิ่มเติม (เช่น นำไปใช้กับงานซ่อมแซม, ซื้อของเข้าสต๊อก...)"
                />
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Hidden draft trigger for Modal footer */}
        <button type="button" id="issue-summary-draft-btn" onClick={handleSaveDraft} className="hidden" />
      </form>

      {/* Sub-Modals */}
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
          onConfirm={(ids) => {
            setSelectedCustomerIds(ids);
            setIsCustomerSelectionModalOpen(false);
          }}
          customers={customers}
          initialSelectedIds={selectedCustomerIds}
        />
      )}
    </>
  );
};
