import { isFieldRole } from '@/src/utils/role';
// ===== React =====
import Swal from '@/src/utils/swal';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
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
import { Input, Button } from '../../../common/FormControls';
import { SearchableSelect } from '../../../common/SearchableSelect';
import { ProductSelectionModal } from '../../products/ProductSelectionModal';
import { CustomerSelectionModal } from '../../customers/CustomerSelectionModal';
import { ReferenceSelectionModal } from '../../../common/ReferenceSelectionModal';

// ===== API =====
import { JobApi } from '../../../../api/job';
import { UserApi } from '../../../../api/user';
import { WarehouseApi } from '../../../../api/warehouse';

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
} from '../../../../assets/icons/Icons';

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
  onOverStockChange?: (overStock: boolean) => void;
  onSubmittingChange?: (submitting: boolean) => void;
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
  onOverStockChange,
  onSubmittingChange,
}) => {
  const isEditMode = mode === 'edit';

  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================
  const [enableGoods, setEnableGoods] = useState(true);
  const [enableExpense, setEnableExpense] = useState(true);
  const [warehouseId, setWarehouseId] = useState('');
  const [issueDate, setIssueDate] = useState<Date | null>(
    isEditMode && summary?.created_at ? new Date(summary.created_at) : null
  );
  const [formErrors, setFormErrors] = useState<{ warehouseId: string; issueDate: string; requesterId: string; items: string }>({ warehouseId: '', issueDate: '', requesterId: '', items: '' });
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

  const [walletInfo, setWalletInfo] = useState<{ balance: number; expense_limit: number; remaining: number; transactions?: unknown[] } | null>(null);
  const [fetchedRequester, setFetchedRequester] = useState<UserType | null>(null);

  const [fetchedJobs, setFetchedJobs] = useState<JobType[]>([]);
  const jobSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localStockMap, setLocalStockMap] = useState<Map<string, Map<string, number>>>(new Map());
  const [vehicleWarehouseOptions, setVehicleWarehouseOptions] = useState<{ value: string; label: string }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerSelectionModalOpen, setIsCustomerSelectionModalOpen] = useState(false);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);

  const goodsFormRef = useRef<HTMLFormElement>(null);
  const vehicleSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ==========================================
  // Logic: User & Role
  // ==========================================
  const loggedInUser = useMemo(() => {
    let role = '';
    let id = currentUser?.id || '';
    let name = '';

    // Try from currentUser prop (could be AuthUser with firstName or User with first_name)
    const cu = currentUser as Record<string, unknown> | undefined;
    if (cu) {
      const fn = (cu.first_name || cu.firstName || '') as string;
      const ln = (cu.last_name || cu.lastName || '') as string;
      name = `${fn} ${ln}`.trim();
    }

    try {
      const raw = localStorage.getItem('user_info');
      if (raw) {
        const parsed = JSON.parse(raw);
        const rawRole = parsed?.role || parsed?.role_name || parsed?.role_code || parsed?.role_id || '';
        role = String(rawRole).toUpperCase().trim();
        id = parsed?.id || parsed?.user_id || id;
        const fn = parsed?.first_name || parsed?.firstName || '';
        const ln = parsed?.last_name || parsed?.lastName || '';
        if (fn) name = `${fn} ${ln}`.trim();
      }
    } catch (e) {
      console.error('Localstorage parsing error', e);
    }

    if (!name) name = 'ผู้เบิก (ตัวฉันเอง)';
    return { id: String(id), role, name };
  }, [currentUser]);

  const isLockedRole = useMemo(() => {
    return isFieldRole(loggedInUser.roleType);
  }, [loggedInUser.role]);

  const userOptions = useMemo(() => {
    const opts = users.map((u) => ({
      value: String(u.id),
      label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.nick_name || 'Unknown',
    }));
    // Ensure current user is always in the list
    if (loggedInUser.id && !opts.find((o) => o.value === loggedInUser.id)) {
      opts.unshift({ value: loggedInUser.id, label: loggedInUser.name });
    }
    return opts;
  }, [users, loggedInUser.id, loggedInUser.name]);

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
  const fetchWarehouses = useCallback(async (search?: string) => {
    try {
      // Filter เฉพาะประเภท VEHICLE + รองรับ search จาก dropdown
      const res = await WarehouseApi.getWarehousesWithItems({
        type: WarehouseType.VEHICLE,
        limit: 10,
        page: 1,
        ...(search && search.trim() ? { search: search.trim() } : {}),
      } as any);
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
      const vehicleWhs = warehouses
        .filter((w) => w.type === WarehouseType.VEHICLE)
        .map((w) => ({ value: w.id, label: `${w.name}${w.vehicle?.vehicle_registration ? ` (${w.vehicle.vehicle_registration})` : ''}` }));
      setVehicleWarehouseOptions(vehicleWhs);
    }
  }, [warehouses]);

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
        const ext = summary as unknown as Record<string, string>;
        setRecipientId(ext.recipient_id || loggedInUser.id);
        setNotes(summary.notes || '');
        setCurrentStatus(summary.status || 'PENDING');

        setJobId(summary.job_id || '');
        if (ext.customer_id) {
          setSelectedCustomerIds([ext.customer_id]);
        } else {
          setSelectedCustomerIds([]);
        }

        if (summary.items && summary.items.length > 0) {
          setItems(summary.items.map((item) => ({ ...item })));
          setEnableGoods(true);
        } else {
          setItems([]);
        }

        const expenseData = (summary as unknown as Record<string, unknown>).expense_items || (summary as unknown as Record<string, unknown>).expenses || [];
        if (Array.isArray(expenseData) && expenseData.length > 0) {
          setExpenseItems(
            (expenseData as Array<Record<string, unknown>>).map((e) => ({
              id: (e.id as string) || crypto.randomUUID(),
              description: (e.description as string) || '',
              amount: (e.amount as number) || 0,
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

  useEffect(() => {
    if (requesterId) {
      UserApi.getById(requesterId).then(setFetchedRequester).catch(() => setFetchedRequester(null));
      UserApi.getWallet(requesterId)
        .then((w) =>
          setWalletInfo({
            balance: Number(w.balance || 0),
            expense_limit: Number(w.expense_limit || 0),
            remaining: Number(w.remaining ?? (Number(w.expense_limit || 0) - Number(w.balance || 0))),
            transactions: w.transactions,
          }),
        )
        .catch(() => setWalletInfo(null));
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
    // ใช้ remaining (เงินคงเหลือที่ยังเบิกได้) เป็นเกณฑ์ ไม่ใช่ balance (ที่เป็นยอดเบิกสะสม)
    if (walletInfo && typeof walletInfo.remaining === 'number') return totalExpenses > walletInfo.remaining;
    if (!selectedRequester || typeof selectedRequester.creditLimit !== 'number') return false;
    return totalExpenses > selectedRequester.creditLimit;
  }, [totalExpenses, selectedRequester, walletInfo]);

  const isAnyItemOverStock = useMemo(() => {
    if (!warehouseId) return false;
    return items.some((item) => {
      const available = effectiveStockMap.get(warehouseId)?.get(item.product_id) || 0;
      return available > 0 && item.quantity > available;
    });
  }, [items, warehouseId, effectiveStockMap]);

  useEffect(() => {
    onOverStockChange?.(isAnyItemOverStock);
  }, [isAnyItemOverStock, onOverStockChange]);

  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);

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
        unit: (product as unknown as Record<string, { name?: string }>)?.unit?.name || 'หน่วย',
      };
    });
    setItems((prev) => [...prev, ...newItems]);
    if (formErrors.items) setFormErrors((prev) => ({ ...prev, items: '' }));
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
    const errors = {
      // วงเงิน warehouseId จำเป็นเฉพาะตอน "เบิกสินค้า" — ถ้าเบิกเฉพาะค่าใช้จ่ายไม่ต้องเลือกรถ
      warehouseId: enableGoods && !warehouseId ? 'กรุณาเลือกรถบริการ' : '',
      issueDate: !issueDate ? 'กรุณาเลือกวันที่เบิก' : '',
      requesterId: !requesterId ? 'กรุณาเลือกผู้เบิก' : '',
      items: !hasValidEntries ? 'กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ หรือกรอกค่าใช้จ่ายอย่างน้อย 1 รายการ' : '',
    };
    setFormErrors(errors);
    if (errors.warehouseId || errors.issueDate || errors.requesterId || errors.items) {
      setTimeout(() => {
        const el = document.querySelector('.text-red-500.text-xs');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    const invalidItems = items.filter((item) => !item.product_id || item.quantity <= 0);
    if (invalidItems.length > 0)
      return Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณากรอกจำนวนสินค้าให้ถูกต้อง' });

    // Block submission if any item exceeds available stock
    if (isAnyItemOverStock) {
      return Swal.fire({
        icon: 'error',
        title: 'ไม่สามารถบันทึกได้',
        text: 'มีสินค้าที่เบิกเกินสต๊อกในคลัง กรุณาแก้ไขจำนวนให้ไม่เกินจำนวนคงเหลือ',
      });
    }

    // Validate: if expense over wallet limit, must have job + notes
    if (isOverLimit) {
      if (!jobId || !notes.trim()) {
        return Swal.fire({
          icon: 'warning',
          title: 'กรุณาตรวจสอบ',
          text: 'กรุณากรอก "เอกสารอ้างอิง (ใบงาน)" และ "หมายเหตุ" เนื่องจากมีการใช้เงินเกินโควต้า',
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
        // Create mode: PENDING if expense over wallet limit, else COMPLETED
        finalStatus = isOverLimit ? 'PENDING' : 'COMPLETED';
      }

      const payload: any = {
        ...(isEditMode && summary ? summary : {}), // spread original fields for edit
        warehouse_id: warehouseId || undefined,
        issue_date: issueDate
          ? `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, '0')}-${String(issueDate.getDate()).padStart(2, '0')}`
          : undefined,
        requester_id: requesterId || undefined,
        recipient_id: recipientId || undefined,
        purpose: isEditMode ? undefined : 'เบิกสินค้า/อุปกรณ์',
        notes: notes || undefined,
        // ส่ง notes เป็น over_limit_reason เมื่อเกินลิมิต (backend require field นี้)
        over_limit_reason: isOverLimit && notes.trim() ? notes.trim() : undefined,
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
        issue_date: issueDate
          ? `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, '0')}-${String(issueDate.getDate()).padStart(2, '0')}`
          : undefined,
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
    () => warehouses.find((w) => w.id === warehouseId) || { id: warehouseId },
    [warehouseId, warehouses],
  );
  const existingProductIds = useMemo(() => Array.from(new Set(items.map((item) => item.product_id))), [items]);

  // ==========================================
  // 4. UI RENDER
  // ==========================================
  return (
    <>
      <form ref={goodsFormRef} id="issue-summary-form" onSubmit={handleSubmit}>
        {/* วันที่เบิก — อยู่นอกกรอบ form ด้านบนสุด (เอา label ออก เหลือเฉพาะ datepicker) */}
        <div className="flex items-end justify-end gap-3 mb-4 px-1">
          <div className="flex flex-col">
            <div className={`flex items-center gap-2 bg-white px-3 py-2 rounded-lg border hover:border-slate-400 transition-colors cursor-pointer ${formErrors.issueDate ? 'border-red-500' : 'border-slate-300'}`}>
              <CalendarDaysIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <DatePicker
                selected={issueDate}
                onChange={(date: Date | null) => { setIssueDate(date); if (date) setFormErrors((prev) => ({ ...prev, issueDate: '' })); }}
                dateFormat="dd/MM/yyyy"
                locale="th"
                placeholderText="เลือกวันที่เบิก *"
                required
                portalId="root"
                popperClassName="!z-[9999]"
                showCalendarIcon={false}
                className="bg-transparent border-none p-0 text-slate-800 font-semibold focus:ring-0 focus:outline-none text-sm w-[130px] cursor-pointer placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>
            {formErrors.issueDate && <p className="text-xs text-red-500 mt-1">{formErrors.issueDate}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-6">

          {/* Card 0: ประเภทการเบิก (Top of form — drives required fields below) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative z-[60]">
            <h3 className="text-lg font-bold text-slate-800 mb-3">ประเภทการเบิก <span className="text-red-500">*</span></h3>
            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableGoods}
                  onChange={(e) => {
                    if (!e.target.checked && !enableExpense) return;
                    if (!e.target.checked) {
                      setItems([]);
                      setWarehouseId('');
                      setFormErrors((prev) => ({ ...prev, warehouseId: '' }));
                    }
                    setEnableGoods(e.target.checked);
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-base font-semibold text-slate-700">รายการสินค้า</span>
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
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-base font-semibold text-slate-700">การเงินและค่าใช้จ่าย</span>
              </label>
            </div>
          </div>

          {/* Card 1: การเคลื่อนย้ายสินค้า — แสดงเฉพาะตอนเลือก "รายการสินค้า" */}
          {enableGoods && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative z-50">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                  <TruckIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">การเคลื่อนย้ายสินค้า</h3>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4 relative z-50">
                <div className="flex-1 w-full relative z-50">
                  <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">
                    เบิกจากรถ <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={vehicleWarehouseOptions}
                    value={warehouseId}
                    onChange={(v) => { setWarehouseId(v); if (v) setFormErrors((prev) => ({ ...prev, warehouseId: '' })); }}
                    onSearchChange={(q) => {
                      if (vehicleSearchTimerRef.current) clearTimeout(vehicleSearchTimerRef.current);
                      vehicleSearchTimerRef.current = setTimeout(() => fetchWarehouses(q), 300);
                    }}
                    placeholder="เลือกรถบริการ..."
                    required
                  />
                  {formErrors.warehouseId && <p className="text-xs text-red-500 mt-1">{formErrors.warehouseId}</p>}
                </div>
              </div>
            </div>
          )}

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
                  ผู้เบิก <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={requesterOptions}
                  value={requesterId}
                  onChange={(v) => {
                    if (isLockedRole) return;
                    setRequesterId(v);
                    if (v) setFormErrors((prev) => ({ ...prev, requesterId: '' }));
                  }}
                  placeholder="ค้นหาผู้เบิก..."
                />
                {formErrors.requesterId && <p className="text-xs text-red-500 mt-1">{formErrors.requesterId}</p>}
              </div>
              <div className="flex-1 w-full relative z-30">
                <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">ผู้รับเงิน</label>
                <SearchableSelect options={userOptions} value={recipientId} onChange={setRecipientId} placeholder="ค้นหาผู้รับเงิน..." />
              </div>
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
                      สินค้าที่ต้องการเบิกออกจากรถ (ไม่ต้องกรอกก็ได้ หากต้องการเบิกเฉพาะเงิน)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(true)}
                  className="flex items-center gap-1 bg-primary/10 text-primary font-semibold py-1 px-2 rounded-md text-sm"
                  disabled={!warehouseId}
                >
                  <PlusIcon className="h-4 w-4" />
                  เพิ่มสินค้า
                </button>
              </div>

              <div className="flex-grow overflow-y-auto bg-slate-50/30 p-5">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                    <div className="bg-slate-50 p-5 rounded-full mb-4 border border-dashed border-slate-200">
                      <TruckIcon className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-600 text-base">ยังไม่มีรายการสินค้า</p>
                    <p className="text-sm mt-1.5 text-slate-400">กดปุ่ม "เพิ่มสินค้า" ด้านบนเพื่อเลือกสินค้าจากรถ</p>
                    {formErrors.items && <p className="text-red-500 text-xs mt-2">{formErrors.items}</p>}
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

                      const isOverStock = available > 0 && item.quantity > available;

                      return (
                        <div
                          key={index}
                          className={`px-5 py-4 rounded-xl border transition-all duration-200 bg-white shadow-sm hover:shadow-md ${
                            isOverStock
                              ? 'border-red-300 bg-red-50/30'
                              : 'border-slate-200 hover:border-indigo-200'
                          }`}
                        >
                          <div className="grid grid-cols-12 gap-4 items-center w-full">
                            <div className="col-span-2">
                              <span className="font-mono text-sm font-bold text-green-600">
                                {product?.code || item.product_id.substring(0, 8)}
                              </span>
                            </div>
                            <div className="col-span-3">
                              <span
                                className="font-semibold text-slate-800 text-base truncate block pr-2"
                                title={item.product_name}
                              >
                                {item.product_name || 'Unknown Product'}
                              </span>
                            </div>

                            <div className="flex items-center justify-center col-span-2">
                              <span
                                className={`text-base font-bold ${
                                  available === 0 ? 'text-red-500' : 'text-slate-700'
                                }`}
                              >
                                {available.toLocaleString()}
                              </span>
                            </div>

                            <div className="col-span-4 flex items-center justify-center">
                              <div className="relative flex items-center w-full max-w-[140px] group">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleItemChange(index, 'quantity', Number(e.target.value))
                                  }
                                  className={`w-full text-center h-11 text-base font-bold rounded-lg pr-10 transition-all ${
                                    isOverStock
                                      ? 'border-red-400 text-red-600 focus:border-red-500 focus:ring-red-200 bg-red-50'
                                      : 'border-slate-300 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-200 bg-slate-50 group-hover:bg-white'
                                  }`}
                                />
                                <span className="absolute right-3 text-xs font-semibold text-slate-400 pointer-events-none">
                                  {item.unit}
                                </span>
                              </div>
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

                          {isOverStock && (
                            <div className="mt-3 flex items-center gap-2 bg-gradient-to-r from-red-50 to-red-50/50 border-l-4 border-red-500 px-3 py-2 rounded-r-md">
                              <div className="flex-shrink-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                <XCircleIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 text-xs">
                                <span className="font-bold text-red-700">เกินสต๊อก</span>
                                <span className="text-slate-600 ml-1.5">
                                  ของในคลังเหลือ{' '}
                                  <span className="font-bold text-red-700">
                                    {available.toLocaleString()}
                                  </span>{' '}
                                  {item.unit}
                                </span>
                              </div>
                            </div>
                          )}
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
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
                  <BanknotesIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">การเงินและค่าใช้จ่าย</h3>
                  <p className="text-sm text-slate-500 mt-0.5">รายการเบิกเงินสด (ไม่ต้องกรอกก็ได้ หากต้องการเบิกเฉพาะสินค้า)</p>
                </div>
              </div>
              <div className="p-3 sm:p-5">

              {walletInfo && (
                <div className="mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
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
                      {walletInfo.expense_limit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                    </span>
                  </div>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-sm font-medium text-slate-500">คงเหลือปัจจุบัน</span>
                    <span className="text-base font-semibold text-slate-700">{walletInfo.remaining.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                  </div>
                  {totalExpenses > 0 && (
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-sm font-medium text-slate-500">รวมที่ต้องการเบิกครั้งนี้</span>
                      <span className="text-base font-bold text-amber-600">-{totalExpenses.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                    </div>
                  )}
                  <div className="flex items-end justify-between mt-3 pt-3 border-t border-slate-100 mb-2">
                    <span className="text-sm font-bold text-slate-600">คงเหลือสุทธิ (หลังเบิก)</span>
                    <span
                      className={`text-xl font-black ${
                        walletInfo.remaining - totalExpenses < 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {(walletInfo.remaining - totalExpenses).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-1 overflow-hidden">
                    <div
                      style={{
                        width: `${
                          walletInfo.expense_limit > 0
                            ? Math.min(
                                100,
                                ((walletInfo.balance + totalExpenses) / walletInfo.expense_limit) * 100,
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
                      className="bg-white rounded-lg border border-slate-200 shadow-sm group hover:border-primary/30 transition-colors p-2.5 sm:p-4"
                    >
                      {/* Desktop: single row */}
                      <div className="hidden sm:flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-md text-slate-400 flex-shrink-0">
                          <BanknotesIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleExpenseItemChange(item.id, 'description', e.target.value)}
                            placeholder="กรอกรายละเอียด..."
                            className={`w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white ${
                              isDefaultExpense(item.id) ? 'text-slate-700 bg-slate-50' : ''
                            }`}
                            readOnly={isDefaultExpense(item.id)}
                          />
                        </div>
                        <div className="flex-shrink-0 w-[200px]">
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              value={item.amount}
                              onChange={(e) => handleExpenseItemChange(item.id, 'amount', e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base font-bold text-right pr-12 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 pointer-events-none">บาท</span>
                          </div>
                        </div>
                        {isDefaultExpense(item.id) ? (
                          <div className="w-10 flex-shrink-0" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemoveExpenseItem(item.id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-200 focus:outline-none flex-shrink-0"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      {/* Mobile: two rows, inputs aligned */}
                      <div className="sm:hidden flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded-md text-slate-400 flex-shrink-0">
                            <BanknotesIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleExpenseItemChange(item.id, 'description', e.target.value)}
                              placeholder="กรอกรายละเอียด..."
                              className={`w-full border border-slate-300 rounded-lg px-2 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white ${
                                isDefaultExpense(item.id) ? 'text-slate-700 bg-slate-50' : ''
                              }`}
                              readOnly={isDefaultExpense(item.id)}
                            />
                          </div>
                          {isDefaultExpense(item.id) ? (
                            <div className="w-6 flex-shrink-0" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveExpenseItem(item.id)}
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-xl transition-all duration-200 focus:outline-none flex-shrink-0"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 flex-shrink-0 invisible">
                            <BanknotesIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                value={item.amount}
                                onChange={(e) => handleExpenseItemChange(item.id, 'amount', e.target.value)}
                                placeholder="0.00"
                                className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm font-bold text-right pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">บาท</span>
                            </div>
                          </div>
                          {isDefaultExpense(item.id) ? (
                            <div className="w-6 flex-shrink-0" />
                          ) : (
                            <div className="w-6 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={handleAddExpense}
                    className="flex items-center gap-2 px-6 py-2.5 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 hover:shadow-sm transition-all font-medium"
                  >
                    <PlusIcon className="h-5 w-5" />
                    เพิ่มรายการเบิกเงิน
                  </button>
                </div>

                {expenseItems.length > 0 && (
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4">
                    <span className="text-sm font-bold text-slate-600">ยอดรวมขอเบิกเงิน</span>
                    <span className="text-xl font-black text-primary">
                      {totalExpenses.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
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
              isOverLimit ? 'border-amber-400 ring-1 ring-amber-100 bg-amber-50/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600">
                <DocumentCheckIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">ข้อมูลอ้างอิงและหมายเหตุ</h3>
                <p className="text-sm text-slate-500 mt-0.5">กรอกเอกสารอ้างอิงและเหตุผลการเบิก</p>
              </div>
            </div>
            <div className="p-5">

            {isOverLimit && (
              <div className="mb-5 text-sm font-semibold text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>
                  จำเป็นต้องกรอก <strong>"เอกสารอ้างอิง"</strong> และ <strong>"หมายเหตุ"</strong>{' '}
                  เนื่องจากมีการขอเบิกเงินเกินโควต้าที่ได้รับ
                </span>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">
                  เอกสารอ้างอิง {isOverLimit && <span className="text-red-500">*</span>}
                </label>
                <div className="mb-2 relative z-20">
                  <div className="w-full">
                    <SearchableSelect
                      value={jobId || ''}
                      onChange={(value) => setJobId(value || '')}
                      options={fetchedJobs.map((j) => {
                        const jExt = j as unknown as Record<string, unknown>;
                        const c = jExt.customer as Record<string, string> | undefined;
                        const customerName = c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '-';
                        const workDate = (jExt.start_date || jExt.appointment_date || j.created_at) as string;
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
                  หมายเหตุ {isOverLimit && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className={`w-full border rounded-xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none shadow-sm transition-colors ${
                    isOverLimit && !notes.trim()
                      ? 'border-amber-300 bg-white placeholder:text-amber-400/70'
                      : 'border-slate-300 bg-white placeholder:text-slate-400'
                  }`}
                  placeholder="กรอกเหตุผลการเบิกเพิ่มเติม (เช่น นำไปใช้กับงานซ่อมแซม, ซื้อของเข้าสต๊อก...)"
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
