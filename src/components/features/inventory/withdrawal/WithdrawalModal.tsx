/**
 * @file WithdrawalModal.tsx
 * @description Unified modal for creating & editing withdrawals (ใบเบิกเข้าคลังย่อย).
 *              Follows the same split pattern as QuotationModal / QuotationForm.
 *              Mode is controlled via `mode` prop ('create' | 'edit').
 */
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
  BanknotesIcon,
  CalendarDaysIcon,
  LoadingIcon,
} from '../../../../assets/icons/Icons';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import { ProductSelectionModal } from '../../products/ProductSelectionModal';
import {
  Withdrawal as WithdrawalType,
  User,
  Warehouse as WarehouseType,
  Product,
} from '@/src/types/entity/app.interface';
import {
  WarehouseType as InventoryWarehouseType,
  WithdrawalLifecycle,
  WithdrawalLineStatus,
} from '@/src/types/enums/inventory';
import { UserApi } from '../../../../api/user';
import { WarehouseApi } from '../../../../api/warehouse';
import { IssueNoteApi } from '../../../../api/issue-note';
import { isFieldRole } from '@/src/utils/role';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialValues?: WithdrawalType | null;
  onSubmit: (payload: Omit<WithdrawalType, 'id'> | Partial<WithdrawalType>) => void | Promise<void>;
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

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSubmit,
  users,
  warehouses,
  currentUser,
  products,
  stockMap,
}) => {
  // Section toggles
  const [enableGoods, setEnableGoods] = useState(true);
  const [enableExpense, setEnableExpense] = useState(true);

  // Lock sections ที่ "ตัดสินใจแล้ว" (อนุมัติ/ไม่อนุมัติ/ยกเลิก) — แอดมินแก้ได้เฉพาะส่วนที่ยังรออนุมัติ
  const isLineLocked = (status: WithdrawalLineStatus | null | undefined) =>
    status === WithdrawalLineStatus.APPROVED ||
    status === WithdrawalLineStatus.COMPLETED ||
    status === WithdrawalLineStatus.REJECTED ||
    status === WithdrawalLineStatus.CANCELLED;

  const lockedLabel = (status: WithdrawalLineStatus | null | undefined) => {
    if (status === WithdrawalLineStatus.APPROVED || status === WithdrawalLineStatus.COMPLETED) return 'อนุมัติแล้ว — แก้ไม่ได้';
    if (status === WithdrawalLineStatus.REJECTED) return 'ไม่อนุมัติ — แก้ไม่ได้';
    if (status === WithdrawalLineStatus.CANCELLED) return 'ยกเลิกแล้ว — แก้ไม่ได้';
    return '';
  };

  const stockLocked = useMemo(
    () =>
      (initialValues?.items || []).length > 0 &&
      (initialValues?.items || []).every((i) => isLineLocked(i.status)),
    [initialValues],
  );
  const expenseLocked = useMemo(
    () =>
      (initialValues?.expenses || []).length > 0 &&
      (initialValues?.expenses || []).every((e) => isLineLocked(e.status)),
    [initialValues],
  );

  const stockLockedLabel = useMemo(
    () => (stockLocked ? lockedLabel((initialValues?.items || [])[0]?.status) : ''),
    [stockLocked, initialValues],
  );
  const expenseLockedLabel = useMemo(
    () => (expenseLocked ? lockedLabel((initialValues?.expenses || [])[0]?.status) : ''),
    [expenseLocked, initialValues],
  );

  // Form state
  const [goodsItems, setGoodsItems] = useState<LineItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseLineItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [issueDate, setIssueDate] = useState<Date | null>(null);
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
  const [walletInfo, setWalletInfo] = useState<{ balance: number; expense_limit: number } | null>(null);
  const [localStockMap, setLocalStockMap] = useState<Map<string, Map<string, number>>>(new Map());
  const [userOptionsExtra, setUserOptionsExtra] = useState<{ value: string; label: string }[]>([]);

  const goodsFormRef = useRef<HTMLFormElement>(null);
  const sourceSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vehicleSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Backend search สำหรับ dropdown ผู้เบิก / ผู้รับเงิน
  const searchUsers = useCallback(async (search: string) => {
    const q = (search || '').trim();
    if (!q) return;
    try {
      const res = await UserApi.getAll({ search: q, limit: 10, page: 1 });
      const items = res?.data || [];
      if (!items.length) return;
      const opts = items.map((u: User) => ({
        value: String(u.id),
        label: `${u.first_name} ${u.last_name}${u.nick_name ? ` (${u.nick_name})` : ''}`,
      }));
      setUserOptionsExtra((prev) => {
        const seen = new Set(prev.map((o) => o.value));
        const merged = [...prev];
        opts.forEach((o) => {
          if (!seen.has(o.value)) merged.push(o);
        });
        return merged;
      });
    } catch (err) {
      console.error('Failed to search users', err);
    }
  }, []);

  const debouncedSearchUsers = useCallback((q: string) => {
    if (userSearchTimerRef.current) clearTimeout(userSearchTimerRef.current);
    userSearchTimerRef.current = setTimeout(() => searchUsers(q), 300);
  }, [searchUsers]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // ==========================================
  // Logged-in user info
  // ==========================================
  const loggedInUser = useMemo(() => {
    let role = '';
    let roleType = '';
    let id = currentUser?.id || '';
    let name = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'ผู้เบิก (ตัวฉันเอง)';

    try {
      const raw = localStorage.getItem('user_info');
      if (raw) {
        const parsed = JSON.parse(raw);
        const rawRole = parsed?.role || parsed?.role_name || parsed?.role_code || parsed?.role_id || '';
        role = String(rawRole).toUpperCase().trim();
        const rawRoleType = parsed?.roleType || parsed?.role_type || '';
        roleType = String(rawRoleType).toUpperCase().trim();
        id = parsed?.id || parsed?.user_id || id;
        if (parsed?.firstName || parsed?.first_name) {
          const first = parsed.firstName || parsed.first_name;
          const last = parsed.lastName || parsed.last_name || '';
          name = `${first} ${last}`.trim();
        }
      }
    } catch (e) {
      console.error('Localstorage parsing error', e);
    }

    return { id: String(id), role, roleType, name };
  }, [currentUser]);

  const isRequesterLocked = useMemo(
    () => isFieldRole(loggedInUser.roleType),
    [loggedInUser.roleType],
  );

  // User options = from props + extras (requester/recipient from initialValues that may not be in `users`)
  const userOptions = useMemo(() => {
    const fromProp = users.map((u) => ({
      value: String(u.id),
      label: `${u.first_name} ${u.last_name}${u.nick_name ? ` (${u.nick_name})` : ''}`,
    }));
    const seen = new Set(fromProp.map((o) => o.value));
    const extras = userOptionsExtra.filter((o) => !seen.has(o.value));
    return [...fromProp, ...extras];
  }, [users, userOptionsExtra]);

  const ensureSelfOption = (opts: { value: string; label: string }[]) => {
    const hasMe = opts.some((opt) => opt.value === loggedInUser.id);
    if (!hasMe && loggedInUser.id) {
      return [{ value: loggedInUser.id, label: loggedInUser.name }, ...opts];
    }
    return opts;
  };

  const requesterOptions = useMemo(() => {
    if (isRequesterLocked && loggedInUser.id) {
      const myOption = userOptions.find((opt) => opt.value === loggedInUser.id);
      return [myOption ?? { value: loggedInUser.id, label: loggedInUser.name }];
    }
    return ensureSelfOption(userOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userOptions, isRequesterLocked, loggedInUser]);

  const recipientOptions = useMemo(() => {
    if (isRequesterLocked && loggedInUser.id) {
      const myOption = userOptions.find((opt) => opt.value === loggedInUser.id);
      return [myOption ?? { value: loggedInUser.id, label: loggedInUser.name }];
    }
    return ensureSelfOption(userOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userOptions, isRequesterLocked, loggedInUser]);

  // ==========================================
  // Warehouse / stock fetch
  // ==========================================
  const mergeStockMap = (allWarehouses: { id: string; stock?: unknown; stock_balances?: unknown }[]) => {
    setLocalStockMap((prev) => {
      const merged = new Map(prev);
      allWarehouses.forEach((w) => {
        const warehouseStock = new Map<string, number>();
        const stockItems = Array.isArray(w.stock)
          ? w.stock
          : Array.isArray(w.stock_balances)
            ? w.stock_balances
            : [];
        stockItems.forEach((s: { product_id?: string; product?: { id?: string }; quantity?: number | string }) => {
          const productId = s.product_id || s.product?.id;
          const quantity = typeof s.quantity === 'string' ? parseFloat(s.quantity) : Number(s.quantity);
          if (productId && !isNaN(quantity)) warehouseStock.set(productId, quantity);
        });
        merged.set(w.id, warehouseStock);
      });
      return merged;
    });
  };

  const fetchSourceWarehouses = useCallback(async (search?: string) => {
    try {
      const res = await WarehouseApi.getWarehousesWithItems({
        type: InventoryWarehouseType.MAIN,
        limit: 10,
        page: 1,
        ...(search && search.trim() ? { search: search.trim() } : {}),
      } as any);
      if (res && res.data) {
        mergeStockMap(res.data);
        setSourceWarehouseOptions(res.data.map((w: any) => ({ value: w.id, label: w.name })));
      }
    } catch (error) {
      console.error('Failed to fetch source warehouses', error);
    }
  }, []);

  const fetchVehicleWarehouses = useCallback(async (search?: string) => {
    try {
      const res = await WarehouseApi.getWarehousesWithItems({
        type: InventoryWarehouseType.VEHICLE,
        limit: 10,
        page: 1,
        ...(search && search.trim() ? { search: search.trim() } : {}),
      } as any);
      if (res && res.data) {
        mergeStockMap(res.data);
        setVehicleWarehouseOptions(res.data.map((w: any) => ({ value: w.id, label: w.name })));
      }
    } catch (error) {
      console.error('Failed to fetch vehicle warehouses', error);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    await Promise.all([fetchSourceWarehouses(), fetchVehicleWarehouses()]);
  }, [fetchSourceWarehouses, fetchVehicleWarehouses]);

  // Fetch destination (vehicle) withdrawal_limits when toWarehouseId changes
  useEffect(() => {
    if (!toWarehouseId) {
      setDestinationLimits(new Map());
      return;
    }
    WarehouseApi.getWarehouseById(toWarehouseId)
      .then((warehouse) => {
        const limits = new Map<string, number>();
        if (warehouse && Array.isArray(warehouse.withdrawal_limits)) {
          warehouse.withdrawal_limits.forEach((limit: { product_id?: string; max_quantity?: number }) => {
            if (limit.product_id) {
              limits.set(limit.product_id, Number(limit.max_quantity ?? 0));
            }
          });
        }
        setDestinationLimits(limits);
      })
      .catch((err) => {
        console.error('Failed to fetch destination warehouse limits', err);
        setDestinationLimits(new Map());
      });
  }, [toWarehouseId]);

  const effectiveStockMap = useMemo(
    () => (localStockMap.size > 0 ? localStockMap : stockMap),
    [stockMap, localStockMap],
  );
  const sourceWarehouse = useMemo(
    () => warehouses.find((w) => w.id === fromWarehouseId),
    [fromWarehouseId, warehouses],
  );
  const productsInWarehouse = useMemo(() => {
    if (!sourceWarehouse) return [];
    const stock = effectiveStockMap.get(sourceWarehouse.id);
    if (!stock) return [];
    return products.filter((p) => {
      const qty = stock.get(p.id);
      return qty && qty > 0;
    });
  }, [sourceWarehouse, products, effectiveStockMap]);

  // ==========================================
  // Hydrate form on open (mode-aware)
  // ==========================================
  const applyWithdrawal = useCallback(
    (w: WithdrawalType) => {
      const wAny = w as WithdrawalType & { requester?: User; recipient?: User };
      setFromWarehouseId(w.warehouse_id || '');
      setToWarehouseId(w.to_warehouse_id || '');
      setIssueDate(w.created_at ? new Date(w.created_at) : new Date());
      setRequesterId(w.requester_id || wAny.requester?.id || '');
      setRecipientId(w.recipient_id || wAny.recipient?.id || '');

      setGoodsItems(
        (w.items || []).map((item, idx) => ({
          id: `item-${idx}-${crypto.randomUUID()}`,
          productId: item.product_id,
          quantity: item.quantity,
        })),
      );

      setExpenseItems(
        (w.expenses || []).map((exp, idx) => ({
          id: `exp-${idx}-${crypto.randomUUID()}`,
          description: exp.description,
          amount: exp.amount,
        })),
      );

      const hasGoods = !!(w.items && w.items.length > 0);
      const hasExpenses = !!(w.expenses && w.expenses.length > 0);
      setEnableGoods(hasGoods || (!hasGoods && !hasExpenses));
      setEnableExpense(hasExpenses || (!hasGoods && !hasExpenses));

      // Inject requester/recipient user objects (from backend association) into extras
      const extra: { value: string; label: string }[] = [];
      [wAny.requester, wAny.recipient].forEach((u) => {
        if (u && u.id) {
          const label = `${u.first_name || ''} ${u.last_name || ''}${
            u.nick_name ? ` (${u.nick_name})` : ''
          }`.trim();
          extra.push({ value: u.id, label });
        }
      });
      if (extra.length > 0) {
        setUserOptionsExtra((prev) => {
          const seen = new Set(prev.map((o) => o.value));
          const add = extra.filter((o) => !seen.has(o.value));
          return add.length > 0 ? [...prev, ...add] : prev;
        });
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'create') {
      // Reset form for create
      setGoodsItems([]);
      setExpenseItems([]);
      setFromWarehouseId('');
      setToWarehouseId('');
      setIssueDate(null);
      setRequesterId(loggedInUser.id);
      setRecipientId(enableExpense ? loggedInUser.id : '');
      setErrors({});
      setIsSubmitting(false);
      setUserOptionsExtra([]);
      fetchWarehouses();
      return;
    }

    // mode === 'edit'
    if (!initialValues) return;
    applyWithdrawal(initialValues);
    setErrors({});
    setIsSubmitting(false);
    fetchWarehouses();

    // Re-fetch fresh data (list response may omit fields / associations)
    if (initialValues.id) {
      IssueNoteApi.getById(initialValues.id)
        .then((fresh) => {
          if (fresh && fresh.id === initialValues.id) {
            applyWithdrawal(fresh);
          }
        })
        .catch((err) => {
          console.error('Failed to reload withdrawal for edit', err);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, initialValues?.id, loggedInUser.id, fetchWarehouses, applyWithdrawal]);

  // Sync recipientId with "การเงิน & ค่าใช้จ่าย" checkbox
  useEffect(() => {
    if (!isOpen) return;
    if (enableExpense) {
      if (!recipientId && mode === 'create') setRecipientId(loggedInUser.id);
    } else {
      if (recipientId) setRecipientId('');
      setExpenseItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableExpense, isOpen, loggedInUser.id, mode]);

  // Wallet + fetched requester
  // — กระเป๋าเงินใช้ของ "ผู้รับเงิน" ถ้ามี (เป็นคนรับจ่ายจริง) ไม่งั้น fallback ไปผู้เบิก
  useEffect(() => {
    if (requesterId) {
      UserApi.getById(requesterId)
        .then(setFetchedRequester)
        .catch(() => {
          const found = users.find((u) => String(u.id) === String(requesterId));
          if (found) setFetchedRequester(found);
        });
    } else {
      setFetchedRequester(null);
    }

    const walletUserId = recipientId || requesterId;
    if (walletUserId) {
      UserApi.getWallet(walletUserId).then(setWalletInfo).catch(() => setWalletInfo(null));
    } else {
      setWalletInfo(null);
    }
  }, [requesterId, recipientId, users]);

  // ==========================================
  // Item / expense handlers
  // ==========================================
  const handleAddProducts = (productIds: string[]) => {
    const newItems: LineItem[] = productIds.map((pid) => ({
      id: crypto.randomUUID(),
      productId: pid,
      quantity: 1,
    }));
    setGoodsItems((prev) => [...prev, ...newItems]);
    if (errors.items) setErrors((prev) => ({ ...prev, items: undefined }));
    setIsProductModalOpen(false);
  };

  const handleRemoveGoodsItem = (id: string) =>
    setGoodsItems((prev) => prev.filter((item) => item.id !== id));

  const handleGoodsItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    setGoodsItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleAddExpense = () =>
    setExpenseItems((prev) => [...prev, { id: crypto.randomUUID(), description: '', amount: '' }]);

  const handleRemoveExpenseItem = (id: string) =>
    setExpenseItems((prev) => prev.filter((item) => item.id !== id));

  const handleExpenseItemChange = (id: string, field: keyof ExpenseLineItem, value: string) => {
    setExpenseItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const validate = () => {
    const newErrors: Record<string, string | undefined> = {};
    if (!issueDate) newErrors.issueDate = 'กรุณาเลือกวันที่เบิก';
    if (!requesterId) newErrors.requesterId = 'กรุณาเลือกผู้เบิก';
    if (enableGoods && !fromWarehouseId) {
      newErrors.fromWarehouseId = 'กรุณาเลือกคลังต้นทาง';
    }
    if (enableGoods && !toWarehouseId) {
      newErrors.toWarehouseId = 'กรุณาเลือกคลังปลายทาง';
    }
    const hasValidExpenses = expenseItems.some((exp) => Number(exp.amount) > 0);
    if (goodsItems.length === 0 && !hasValidExpenses) {
      newErrors.items = 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ หรือเพิ่มรายการเบิกเงิน';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => {
        const el = document.querySelector('.text-red-500.text-xs');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return false;
    }
    return true;
  };

  const buildPayload = (lifecycle: WithdrawalLifecycle): Partial<WithdrawalType> => ({
    created_at: issueDate ? issueDate.toISOString() : undefined,
    warehouse_id: fromWarehouseId || undefined,
    to_warehouse_id: toWarehouseId || undefined,
    requester_id: requesterId,
    recipient_id: recipientId || undefined,
    purpose: mode === 'edit' ? 'เบิกสินค้า/อุปกรณ์' : 'เบิกสินค้า/อุปกรณ์',
    items: goodsItems.map((item) => {
      const product = productMap.get(item.productId);
      return {
        product_id: item.productId,
        product_name: product?.name || '',
        quantity: item.quantity,
        unit: product?.unit?.symbol || 'หน่วย',
      };
    }),
    expenses: expenseItems
      .filter((exp) => Number(exp.amount) > 0)
      .map((item) => ({
        type: 'INCOME' as any,
        description: item.description,
        amount: Number(item.amount),
      })),
    lifecycle,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(buildPayload(WithdrawalLifecycle.SUBMITTED));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(buildPayload(WithdrawalLifecycle.DRAFT));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAnyItemOverLimit = useMemo(() => {
    return goodsItems.some((item) => {
      const limit = destinationLimits.get(item.productId);
      return limit !== undefined && item.quantity > limit;
    });
  }, [goodsItems, destinationLimits]);

  const selectedRequester = useMemo(
    () => fetchedRequester || users.find((u) => String(u.id) === String(requesterId)),
    [fetchedRequester, requesterId, users],
  );
  const totalExpenses = useMemo(
    () => expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [expenseItems],
  );
  const isOverLimit = useMemo(() => {
    // walletInfo.balance = "ยอดเบิกสะสม" (used); เกินวงเงินเมื่อ used + ขอเบิกใหม่ > limit
    if (walletInfo && typeof walletInfo.balance === 'number') {
      return walletInfo.balance + totalExpenses > walletInfo.expense_limit;
    }
    if (!selectedRequester || typeof selectedRequester.creditLimit !== 'number') return false;
    return totalExpenses > selectedRequester.creditLimit;
  }, [totalExpenses, selectedRequester, walletInfo]);

  const hasValidEntries = useMemo(() => {
    const hasValidProducts = goodsItems.length > 0;
    const hasValidExpenses = expenseItems.some(
      (item) => item.description.trim() !== '' && Number(item.amount) > 0,
    );
    return hasValidProducts || hasValidExpenses;
  }, [goodsItems, expenseItems]);

  const title =
    mode === 'create'
      ? 'สร้างใบเบิกเงิน สินค้า/สารเคมี'
      : `แก้ไขใบเบิกเงิน สินค้า/สารเคมี${initialValues?.code ? ` ${initialValues.code}` : ''}`;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="5xl"
        footer={
          <div className="flex flex-col sm:flex-row w-full sm:justify-between sm:items-center gap-3">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>* จำเป็นต้องกรอกข้อมูลที่มีเครื่องหมายดอกจัน</span>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="py-2.5 px-5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300"
              >
                ยกเลิก
              </Button>
              {(mode === 'create' || (mode === 'edit' && initialValues?.lifecycle === WithdrawalLifecycle.DRAFT)) && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="py-2.5 px-5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium border border-slate-300"
                >
                  บันทึกฉบับร่าง
                </Button>
              )}
              <Button
                variant="primary"
                type="submit"
                form="withdrawal-form"
                disabled={isSubmitting}
                className={`py-2.5 px-6 rounded-lg text-white font-semibold shadow-sm transition-all disabled:bg-slate-300 disabled:cursor-not-allowed ${
                  isOverLimit || isAnyItemOverLimit ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <LoadingIcon className="w-4 h-4" />
                    กำลังบันทึก...
                  </span>
                ) : mode === 'edit' && initialValues?.lifecycle !== WithdrawalLifecycle.DRAFT
                  ? 'บันทึกการแก้ไข'
                  : isAnyItemOverLimit || isOverLimit
                    ? 'ส่งเพื่อขออนุมัติ'
                    : 'บันทึกและส่งอนุมัติ'}
              </Button>
            </div>
          </div>
        }
      >
        <form ref={goodsFormRef} id="withdrawal-form" onSubmit={handleSubmit}>
          {/* วันที่เบิก — อยู่นอกกรอบ form ด้านบนสุด (ไม่มี label) */}
          {/* กรอบแดง + error เฉพาะตอนกด submit แล้วยังไม่ได้เลือก (ก่อนกด: เทาปกติ) */}
          <div className="flex items-end justify-end gap-3 mb-4 px-1">
            <div className="flex flex-col items-end">
              <div className={`flex items-center gap-2 bg-white px-3 py-2 rounded-lg border hover:border-slate-400 transition-colors cursor-pointer ${errors.issueDate ? 'border-red-500' : 'border-slate-300'}`}>
                <CalendarDaysIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <DatePicker
                  selected={issueDate}
                  onChange={(date: Date | null) => {
                    setIssueDate(date);
                    if (date) setErrors((prev) => ({ ...prev, issueDate: undefined }));
                  }}
                  dateFormat="dd/MM/yyyy"
                  locale="th"
                  placeholderText="เลือกวันที่เบิก *"
                  portalId="root"
                  popperClassName="!z-[9999]"
                  showCalendarIcon={false}
                  className="bg-transparent border-none p-0 text-slate-800 font-semibold focus:ring-0 focus:outline-none text-sm w-[130px] cursor-pointer placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
              {errors.issueDate && <p className="text-xs text-red-500 mt-1">{errors.issueDate}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Card 0: ประเภทการเบิก (Top — drives required fields below) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative z-[60]">
              <h3 className="text-lg font-bold text-slate-800 mb-3">ประเภทการเบิก <span className="text-red-500">*</span></h3>
              <div className="flex items-center gap-6 flex-wrap">
                <label className={`flex items-center gap-2 select-none ${stockLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={enableGoods}
                    disabled={stockLocked}
                    onChange={(e) => {
                      if (!e.target.checked && !enableExpense) return;
                      if (!e.target.checked) {
                        setGoodsItems([]);
                        setFromWarehouseId('');
                        setToWarehouseId('');
                        setErrors((prev) => ({ ...prev, fromWarehouseId: undefined, toWarehouseId: undefined }));
                      }
                      setEnableGoods(e.target.checked);
                    }}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
                  />
                  <span className="text-base font-semibold text-slate-700">รายการสินค้า</span>
                  {stockLocked && <span className="text-xs text-slate-500 font-medium">({stockLockedLabel})</span>}
                </label>
                <label className={`flex items-center gap-2 select-none ${expenseLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={enableExpense}
                    disabled={expenseLocked}
                    onChange={(e) => {
                      if (!e.target.checked && !enableGoods) return;
                      if (!e.target.checked) setExpenseItems([]);
                      setEnableExpense(e.target.checked);
                    }}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
                  />
                  <span className="text-base font-semibold text-slate-700">การเงินและค่าใช้จ่าย</span>
                  {expenseLocked && <span className="text-xs text-slate-500 font-medium">({expenseLockedLabel})</span>}
                </label>
              </div>
            </div>

            {/* Card 1: การเคลื่อนย้ายสินค้า — แสดงเฉพาะตอนเลือก "รายการสินค้า" */}
            {enableGoods && (
              <div className={`bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm relative z-50 ${stockLocked ? 'pointer-events-none opacity-60' : ''}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                    <TruckIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">การเคลื่อนย้ายสินค้า</h3>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50/50 p-3 sm:p-5 rounded-lg border border-slate-100 relative z-50">
                  <div className="flex-1 w-full relative z-50">
                    <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">เบิกจากคลัง (ต้นทาง) <span className="text-red-500">*</span></label>
                    <SearchableSelect
                      value={fromWarehouseId}
                      onChange={(v) => {
                        setFromWarehouseId(v);
                        setErrors((prev) => ({ ...prev, fromWarehouseId: undefined }));
                      }}
                      onSearchChange={(q) => {
                        if (sourceSearchTimerRef.current) clearTimeout(sourceSearchTimerRef.current);
                        sourceSearchTimerRef.current = setTimeout(() => fetchSourceWarehouses(q), 300);
                      }}
                      options={sourceWarehouseOptions}
                      placeholder="เลือกคลังต้นทาง"
                    />
                    {errors.fromWarehouseId && <p className="text-red-500 text-xs mt-1">{errors.fromWarehouseId}</p>}
                  </div>
                  <div className="pt-6 hidden md:block">
                    <ArrowRightIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 w-full relative z-40">
                    <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">ไปยังคลัง/รถ (ปลายทาง) <span className="text-red-500">*</span></label>
                    <SearchableSelect
                      value={toWarehouseId}
                      onChange={(v) => {
                        setToWarehouseId(v);
                        setErrors((prev) => ({ ...prev, toWarehouseId: undefined }));
                      }}
                      onSearchChange={(q) => {
                        if (vehicleSearchTimerRef.current) clearTimeout(vehicleSearchTimerRef.current);
                        vehicleSearchTimerRef.current = setTimeout(() => fetchVehicleWarehouses(q), 300);
                      }}
                      options={vehicleWarehouseOptions}
                      placeholder="เลือกคลังปลายทาง"
                    />
                    {errors.toWarehouseId && <p className="text-red-500 text-xs mt-1">{errors.toWarehouseId}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Card 2: Requester / Recipient */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm relative z-40">
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
                    value={requesterId}
                    onChange={(v) => {
                      if (isRequesterLocked) return;
                      setRequesterId(v);
                      setErrors((prev) => ({ ...prev, requesterId: undefined }));
                    }}
                    onSearchChange={debouncedSearchUsers}
                    options={requesterOptions}
                    placeholder="ค้นหาชื่อผู้เบิก"
                    disabled={isRequesterLocked}
                  />
                  {errors.requesterId && <p className="text-red-500 text-xs mt-1">{errors.requesterId}</p>}
                </div>
                <div className="flex-1 w-full relative z-30">
                  <label className="block text-sm font-semibold text-slate-600 mb-2 ml-1">ผู้รับเงิน</label>
                  <SearchableSelect
                    value={recipientId}
                    onChange={(v) => {
                      if (isRequesterLocked) return;
                      setRecipientId(v);
                    }}
                    onSearchChange={debouncedSearchUsers}
                    options={recipientOptions}
                    placeholder={enableExpense ? 'ค้นหาชื่อผู้รับเงิน' : ''}
                    disabled={!enableExpense || isRequesterLocked}
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Items */}
            {enableGoods && (
              <div className={`bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[250px] relative z-20 ${stockLocked ? 'pointer-events-none opacity-60' : ''}`}>
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
                      <DocumentCheckIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">รายการสินค้า</h3>
                      <p className="text-sm text-slate-500 mt-0.5">สินค้าที่ต้องการเบิกออกจากคลัง</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(true)}
                    className="flex items-center gap-1 bg-primary/10 text-primary font-semibold py-1 px-2 rounded-md text-sm"
                    disabled={!fromWarehouseId}
                  >
                    <PlusIcon className="h-4 w-4" />
                    เพิ่มสินค้า
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto bg-slate-50/30 p-5">
                  {goodsItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                      <div className="bg-slate-50 p-5 rounded-full mb-4 border border-dashed border-slate-200">
                        <TruckIcon className="w-10 h-10 text-slate-300" />
                      </div>
                      <p className="font-bold text-slate-600 text-base">ยังไม่มีรายการสินค้า</p>
                      <p className="text-sm mt-1.5 text-slate-400">กดปุ่ม "เพิ่มสินค้า" เพื่อเลือกจากคลัง</p>
                      {errors.items && <p className="text-red-500 text-xs mt-2">{errors.items}</p>}
                    </div>
                  ) : (
                    <div className="space-y-3 mt-2">
                      <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50/80 rounded-lg text-sm font-bold text-slate-800 tracking-wide border border-slate-100 items-center">
                        <div className="col-span-1">รหัส</div>
                        <div className="col-span-3">สินค้า</div>
                        <div className="col-span-2 text-center">คงเหลือ</div>
                        <div className="col-span-2 text-center text-blue-600">จำกัดเบิกของรถ</div>
                        <div className="col-span-3 text-center">จำนวน</div>
                        <div className="col-span-1 text-center"></div>
                      </div>

                      {goodsItems.map((item) => {
                        const product = productMap.get(item.productId);
                        const available = fromWarehouseId
                          ? effectiveStockMap.get(fromWarehouseId)?.get(item.productId) || 0
                          : 0;
                        const limit = destinationLimits.get(item.productId);
                        const isOverStock = available > 0 && item.quantity > available;
                        const isOverLimitObj = limit !== undefined && item.quantity > limit;
                        const hasWarning = isOverStock || isOverLimitObj;
                        const unitName = product?.unit?.name || product?.unit?.symbol || 'หน่วย';

                        return (
                          <div
                            key={item.id}
                            className="px-4 sm:px-5 py-4 rounded-xl border transition-all duration-200 bg-white border-slate-200"
                          >
                            {/* Desktop: grid layout */}
                            <div className="hidden md:grid grid-cols-12 gap-4 items-center w-full">
                              <div className="col-span-1">
                                <span className="font-mono text-sm font-bold text-green-600">
                                  {product?.code || item.productId.substring(0, 8)}
                                </span>
                              </div>
                              <div className="col-span-3">
                                <span
                                  className="font-semibold text-slate-800 text-base truncate block pr-2"
                                  title={product?.name}
                                >
                                  {product?.name || 'Unknown Product'}
                                </span>
                              </div>
                              <div className="col-span-2 text-center">
                                <span className={`text-base font-bold ${available === 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                  {available.toLocaleString()}
                                </span>
                              </div>
                              <div className="col-span-2 text-center">
                                <span className="text-base font-bold text-blue-600">
                                  {limit !== undefined ? limit.toLocaleString() : '-'}
                                </span>
                              </div>
                              <div className="col-span-3 flex items-center justify-center">
                                <div className="relative flex items-center w-full max-w-[140px]">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleGoodsItemChange(item.id, 'quantity', Number(e.target.value))
                                    }
                                    className={`w-full text-center h-11 text-base font-bold rounded-lg pr-10 ${
                                      hasWarning
                                        ? 'border-red-400 text-red-600 bg-red-50'
                                        : 'border-slate-300 text-slate-800 bg-white'
                                    }`}
                                  />
                                  <span className="absolute right-3 text-xs font-semibold text-slate-400 pointer-events-none">
                                    {unitName}
                                  </span>
                                </div>
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGoodsItem(item.id)}
                                  className="text-red-400 hover:text-red-600 p-2 rounded-lg transition-colors"
                                >
                                  <TrashIcon className="w-6 h-6" />
                                </button>
                              </div>
                            </div>

                            {/* Mobile: stacked layout */}
                            <div className="md:hidden flex flex-col gap-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <span className="font-mono text-sm font-bold text-green-600 block">
                                    {product?.code || item.productId.substring(0, 8)}
                                  </span>
                                  <span className="font-semibold text-slate-800 text-base block mt-0.5">
                                    {product?.name || 'Unknown Product'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGoodsItem(item.id)}
                                  className="text-red-400 hover:text-red-600 p-1.5 rounded-lg transition-colors -mr-1.5 -mt-1.5"
                                >
                                  <TrashIcon className="w-6 h-6" />
                                </button>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500">คงเหลือ:</span>
                                  <span className={`text-base font-bold ${available === 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                    {available.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500">จำกัด:</span>
                                  <span className="text-base font-bold text-blue-600">
                                    {limit !== undefined ? limit.toLocaleString() : '-'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500 shrink-0">จำนวน:</span>
                                <div className="relative flex items-center w-full max-w-[150px]">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleGoodsItemChange(item.id, 'quantity', Number(e.target.value))
                                    }
                                    className={`w-full text-center h-11 text-base font-bold rounded-lg pr-10 ${
                                      hasWarning
                                        ? 'border-red-400 text-red-600 bg-red-50'
                                        : 'border-slate-300 text-slate-800 bg-white'
                                    }`}
                                  />
                                  <span className="absolute right-3 text-xs font-semibold text-slate-400 pointer-events-none">
                                    {unitName}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {hasWarning && (
                              <div className="mt-3 flex flex-col gap-1.5">
                                {isOverStock && (
                                  <div className="flex items-center gap-2 bg-gradient-to-r from-red-50 to-red-50/50 border-l-4 border-red-500 px-3 py-2 rounded-r-md">
                                    <div className="flex-shrink-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                      <XCircleIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 text-xs">
                                      <span className="font-bold text-red-700">เกินสต๊อก</span>
                                      <span className="text-slate-600 ml-1.5">
                                        ของในคลังเหลือ <span className="font-bold text-red-700">{available.toLocaleString()}</span> {unitName}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {isOverLimitObj && (
                                  <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-amber-50/50 border-l-4 border-amber-500 px-3 py-2 rounded-r-md">
                                    <div className="flex-shrink-0 bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                      <XCircleIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 text-xs">
                                      <span className="font-bold text-amber-700">เกินโควต้าของรถ</span>
                                      <span className="text-slate-600 ml-1.5">
                                        รถเบิกได้สูงสุด <span className="font-bold text-amber-700">{limit?.toLocaleString()}</span> {unitName}
                                      </span>
                                    </div>
                                  </div>
                                )}
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

            {/* Card 4: Finance */}
            {enableExpense && (
              <div
                className={`p-4 sm:p-6 rounded-xl border shadow-sm transition-all relative z-10 bg-white border-slate-200 ${expenseLocked ? 'pointer-events-none opacity-60' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5 border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                    <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-lg flex items-center justify-center text-base font-black border border-emerald-200">฿</span>
                    การเงิน & ค่าใช้จ่าย
                  </h3>
                </div>

                {walletInfo && (
                  <div className="mb-6 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
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
                    <div className="flex items-end justify-between mb-2 gap-2">
                      <span className="text-sm font-medium text-slate-500 shrink-0">วงเงินที่ได้รับ</span>
                      <span className="text-sm sm:text-base font-semibold text-slate-700 text-right">
                        {walletInfo.expense_limit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                      </span>
                    </div>
                    <div className="flex items-end justify-between mb-2 gap-2">
                      <span className="text-sm font-medium text-slate-500 shrink-0">ยอดเบิกสะสม</span>
                      <span className="text-sm sm:text-base font-semibold text-slate-700 text-right">{walletInfo.balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                    </div>
                    <div className="flex items-end justify-between mb-2 gap-2">
                      <span className="text-sm font-medium text-slate-500 shrink-0">เหลือเบิกได้</span>
                      <span className="text-sm sm:text-base font-semibold text-emerald-700 text-right">
                        {Math.max(0, walletInfo.expense_limit - walletInfo.balance).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                      </span>
                    </div>
                    {totalExpenses > 0 && (
                      <div className="flex items-end justify-between mb-2 gap-2">
                        <span className="text-sm font-medium text-slate-500 shrink-0">ขอเบิกครั้งนี้</span>
                        <span className="text-sm sm:text-base font-bold text-amber-600 text-right">+{totalExpenses.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                      </div>
                    )}
                    <div className="flex items-end justify-between mt-3 pt-3 border-t border-slate-100 mb-2 gap-2">
                      <span className="text-sm font-bold text-slate-600 shrink-0">รวมยอดเบิกหลังครั้งนี้</span>
                      <span className={`text-lg sm:text-xl font-black text-right ${isOverLimit ? 'text-red-600' : 'text-emerald-600'}`}>
                        {(walletInfo.balance + totalExpenses).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-1 overflow-hidden">
                      <div
                        style={{
                          width: `${
                            walletInfo.expense_limit > 0
                              ? Math.min(100, ((walletInfo.balance + totalExpenses) / walletInfo.expense_limit) * 100)
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
                        className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm group hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-3 sm:mb-0 sm:hidden justify-between">
                          <div className="p-2 bg-slate-100 rounded-md text-slate-400 shrink-0">
                            <BanknotesIcon className="w-5 h-5" />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExpenseItem(item.id)}
                            className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="hidden sm:flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-md text-slate-400 shrink-0">
                            <BanknotesIcon className="w-5 h-5" />
                          </div>
                          <div className="flex gap-3 flex-1 min-w-0">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleExpenseItemChange(item.id, 'description', e.target.value)}
                              placeholder="กรอกรายละเอียดค่าใช้จ่าย..."
                              className="w-[70%] rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm font-medium bg-white px-3 py-2 min-w-0"
                            />
                            <div className="relative flex items-center w-[30%]">
                              <input
                                type="number"
                                value={item.amount}
                                onChange={(e) => handleExpenseItemChange(item.id, 'amount', e.target.value)}
                                placeholder="0.00"
                                className="w-full rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary text-base font-bold text-right pr-12 bg-white px-3 py-2"
                              />
                              <span className="absolute right-3 text-sm font-semibold text-slate-400">บาท</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExpenseItem(item.id)}
                            className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="flex flex-col gap-3 sm:hidden">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleExpenseItemChange(item.id, 'description', e.target.value)}
                            placeholder="กรอกรายละเอียดค่าใช้จ่าย..."
                            className="w-full rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm font-medium bg-white px-3 py-2"
                          />
                          <div className="relative flex items-center w-full">
                            <input
                              type="number"
                              value={item.amount}
                              onChange={(e) => handleExpenseItemChange(item.id, 'amount', e.target.value)}
                              placeholder="0.00"
                              className="w-full rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary text-base font-bold text-right pr-12 bg-white px-3 py-2"
                            />
                            <span className="absolute right-3 text-sm font-semibold text-slate-400">บาท</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  <div className="flex justify-center mt-2">
                    <button
                      type="button"
                      onClick={handleAddExpense}
                      className="flex items-center gap-2 px-6 py-2.5 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 hover:shadow-sm transition-all font-medium"
                    >
                      <PlusIcon className="h-5 w-5" /> เพิ่มรายการเบิกเงิน
                    </button>
                  </div>

                  {expenseItems.length > 0 && (
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4">
                      <span className="text-sm font-bold text-slate-600">ยอดรวมขอเติมเงิน</span>
                      <span className="text-xl font-black text-primary">
                        {totalExpenses.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-base font-bold text-slate-500 ml-1">บาท</span>
                      </span>
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
        existingProductIds={goodsItems.map((i) => i.productId)}
        disableFetch={true}
        stockMap={effectiveStockMap.get(fromWarehouseId)}
      />
    </>
  );
};
