/**
 * @file AddWithDrawModal.tsx
 * @description Modal component for creating a new goods withdrawal.
 * This component handles the form for creating a new withdrawal, including selecting products, specifying quantities, adding expenses, and selecting references.
 * It also includes validation and logic for submitting the withdrawal for approval or saving it as a draft.
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
  FieldJob,
  Customer,
  Product,
  Assessment,
  Contract,
} from '@/src/types/entity/app.interface';
import {
  WarehouseType as InventoryWarehouseType,
  WithdrawalStatus,
} from '@/src/types/enums/inventory';
import { UserApi } from '../../../api/user';
import { WarehouseApi } from '../../../api/warehouse';
import { ReferenceSelectionModal } from '../../common/ReferenceSelectionModal';
import { CustomerSelectionModal } from '../customers/CustomerSelectionModal';

interface AddWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWithdrawal: (withdrawal: Omit<WithdrawalType, 'id'>) => void;
  withdrawals: WithdrawalType[];
  users: User[];
  warehouses: WarehouseType[];
  jobs: FieldJob[];
  customers: Customer[];
  currentUser: User | null;
  products: Product[];
  stockMap: Map<string, Map<string, number>>;
  assessments: Assessment[];
  contracts: Contract[];
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
  withdrawals,
  users,
  warehouses,
  jobs,
  customers,
  currentUser,
  products,
  stockMap,
  assessments,
  contracts,
}) => {
  // Form state
  const [goodsItems, setGoodsItems] = useState<LineItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseLineItem[]>([]);
  const [errors, setErrors] = useState<any>({});
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [referenceIds, setReferenceIds] = useState<string[]>([]);
  const [createdBy, setCreatedBy] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [referenceType, setReferenceType] = useState<
    'JOB' | 'ASSESSMENT' | 'CONTRACT'
  >('JOB');

  // UI state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [isCustomerSelectionModalOpen, setIsCustomerSelectionModalOpen] =
    useState(false);

  // Data state
  const [destinationLimits, setDestinationLimits] = useState<
    Map<string, number>
  >(new Map());
  const [sourceWarehouseOptions, setSourceWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [vehicleWarehouseOptions, setVehicleWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [fetchedRequester, setFetchedRequester] = useState<User | null>(null);
  const [walletInfo, setWalletInfo] = useState<{
    balance: number;
    expense_limit: number;
  } | null>(null);
  const [localStockMap, setLocalStockMap] = useState<
    Map<string, Map<string, number>>
  >(new Map());

  const goodsFormRef = useRef<HTMLFormElement>(null);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const userOptions = useMemo(() => {
    return users.map((u) => ({
      value: u.id,
      label: `${u.first_name} ${u.last_name}${u.nick_name ? ` (${u.nick_name})` : ''}`,
    }));
  }, [users]);

  // Fetch warehouses on modal open
  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await WarehouseApi.getWarehousesWithItems(); // Use getWarehousesWithItems
      if (res && res.data) {
        const allWarehouses = res.data;
        const newStockMap = new Map<string, Map<string, number>>();

        allWarehouses.forEach((w: any) => {
          const warehouseStock = new Map<string, number>();
          // Handle both 'stock' and 'stock_balances' keys, and ensure it's an array
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
              warehouseStock.set(productId, quantity);
            }
          });
          newStockMap.set(w.id, warehouseStock);
        });
        setLocalStockMap(newStockMap);

        // Filter source warehouses (MAIN or SUB)
        const sourceWhs = allWarehouses
          .filter(
            (w: any) =>
              w.type === InventoryWarehouseType.MAIN ||
              w.type === InventoryWarehouseType.SUB
          )
          .map((w: any) => ({ value: w.id, label: w.name }));
        setSourceWarehouseOptions(sourceWhs);

        // Filter vehicle warehouses
        const vehicleWhs = allWarehouses
          .filter((w: any) => w.type === InventoryWarehouseType.VEHICLE)
          .map((w: any) => ({ value: w.id, label: w.name }));
        setVehicleWarehouseOptions(vehicleWhs);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
      // Fallback to prop data
      const sourceWhs = warehouses
        .filter(
          (w) =>
            w.type === InventoryWarehouseType.MAIN ||
            w.type === InventoryWarehouseType.SUB
        )
        .map((w) => ({ value: w.id, label: w.name }));
      setSourceWarehouseOptions(sourceWhs);

      const vehicleWhs = warehouses
        .filter((w) => w.type === InventoryWarehouseType.VEHICLE)
        .map((w) => ({ value: w.id, label: w.name }));
      setVehicleWarehouseOptions(vehicleWhs);
    }
  }, [warehouses]);

  const effectiveStockMap = useMemo(() => {
    // Merge prop stockMap and localStockMap, preferring local since it's freshly fetched with-items
    if (localStockMap.size > 0) return localStockMap;
    return stockMap;
  }, [stockMap, localStockMap]);

  const sourceWarehouse = useMemo(
    () => warehouses.find((w) => w.id === fromWarehouseId),
    [fromWarehouseId, warehouses]
  );

  const productsInWarehouse = useMemo(() => {
    if (!sourceWarehouse) return [];

    // Use effective stock map to get products with > 0 quantity
    const stock = effectiveStockMap.get(sourceWarehouse.id);
    if (!stock) return [];

    return products.filter((p) => {
      const qty = stock.get(p.id);
      return qty && qty > 0;
    });
  }, [sourceWarehouse, products, effectiveStockMap]);

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setGoodsItems([]);
      setExpenseItems([]);
      setFromWarehouseId('');
      setToWarehouseId('');
      setRequesterId(currentUser?.id || '');
      setRecipientId('');
      setReferenceIds([]);
      setCreatedBy(currentUser?.id || '');
      setSelectedCustomerIds([]);
      setReferenceType('JOB');
      fetchWarehouses();
    }
  }, [isOpen, currentUser, fetchWarehouses]);

  const handleUserSearch = (search: string) => {
    // Implement search logic if needed, or rely on SearchableSelect internal search
  };

  const handleAddProducts = (productIds: string[]) => {
    const newItems: LineItem[] = productIds.map((pid) => ({
      id: crypto.randomUUID(),
      productId: pid,
      quantity: 1,
    }));
    setGoodsItems((prev) => [...prev, ...newItems]);
    setIsProductModalOpen(false);
  };

  const handleRemoveGoodsItem = (id: string) => {
    setGoodsItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleGoodsItemChange = (
    id: string,
    field: keyof LineItem,
    value: any
  ) => {
    setGoodsItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddExpense = () => {
    setExpenseItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: '', amount: '' },
    ]);
  };

  const handleRemoveExpenseItem = (id: string) => {
    setExpenseItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleExpenseItemChange = (
    id: string,
    field: keyof ExpenseLineItem,
    value: any
  ) => {
    setExpenseItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const validate = () => {
    const newErrors: any = {};
    if (!fromWarehouseId) newErrors.fromWarehouseId = 'กรุณาเลือกคลังต้นทาง';
    if (!requesterId) newErrors.requesterId = 'กรุณาเลือกผู้เบิก';
    if (goodsItems.length === 0)
      newErrors.goodsItems = 'ต้องมีสินค้าอย่างน้อย 1 รายการ';
    goodsItems.forEach((item, index) => {
      if (!item.quantity || item.quantity <= 0) {
        if (!newErrors.goods) newErrors.goods = [];
        newErrors.goods[index] = {
          ...newErrors.goods[index],
          quantity: 'จำนวนต้องมากกว่า 0',
        };
      }
      const product = productMap.get(item.productId);
      const available = sourceWarehouse
        ? effectiveStockMap.get(sourceWarehouse.id)?.get(item.productId) || 0
        : 0;
      if (item.quantity > available) {
        if (!newErrors.goods) newErrors.goods = [];
        newErrors.goods[index] = {
          ...newErrors.goods[index],
          quantity: 'จำนวนเกินสต็อก',
        };
      }
    });
    expenseItems.forEach((item, index) => {
      if (!item.description.trim()) {
        if (!newErrors.expenses) newErrors.expenses = [];
        newErrors.expenses[index] = {
          ...newErrors.expenses[index],
          description: 'กรุณาระบุรายละเอียด',
        };
      }
      if (
        item.amount === '' ||
        item.amount === null ||
        isNaN(Number(item.amount)) ||
        Number(item.amount) <= 0
      ) {
        if (!newErrors.expenses) newErrors.expenses = [];
        newErrors.expenses[index] = {
          ...newErrors.expenses[index],
          amount: 'ระบุจำนวนเงิน',
        };
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
      purpose: 'เบิกสินค้า/อุปกรณ์', // Default purpose
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
        amount: Number(item.amount),
      })),
      notes: (e.target as any).remarks?.value,
      status: WithdrawalStatus.PENDING,
    };

    if (referenceIds.length > 0) {
      payload.reference_ids = referenceIds;
    }

    // Add customer info if available
    if (selectedCustomerIds.length > 0) {
      payload.customer_id = selectedCustomerIds[0];
    }

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
      expenses: expenseItems.map((item) => ({
        description: item.description,
        amount: Number(item.amount),
      })),
      status: WithdrawalStatus.DRAFT,
      notes: goodsFormRef.current?.remarks?.value,
    };

    if (referenceIds.length > 0) {
      payload.reference_ids = referenceIds;
    }

    if (selectedCustomerIds.length > 0) {
      payload.customer_id = selectedCustomerIds[0];
    }

    onCreateWithdrawal(payload);
    onClose();
  };

  const existingProductIds = useMemo(
    () => Array.from(new Set(goodsItems.map((item) => item.productId))),
    [goodsItems]
  );

  const selectedCustomers = useMemo(() => {
    return customers.filter((c) => selectedCustomerIds.includes(c.id));
  }, [customers, selectedCustomerIds]);

  const handleConfirmCustomers = (customerIds: string[]) => {
    setSelectedCustomerIds(customerIds);
    setIsCustomerSelectionModalOpen(false);
  };

  const handleRemoveCustomer = (id: string) => {
    setSelectedCustomerIds((prev) => prev.filter((cId) => cId !== id));
  };

  const jobsForSelectedCustomers = useMemo(() => {
    if (selectedCustomerIds.length === 0) return jobs;
    return jobs.filter((job) => {
      const cId = (job as any).customer_id || (job as any).customer?.id;
      return selectedCustomerIds.includes(cId);
    });
  }, [jobs, selectedCustomerIds]);

  const allUsedReferenceIds = useMemo(() => {
    // Collect all reference IDs used in existing withdrawals to disable them if needed
    // For now, return empty or implement if required
    return [];
  }, []);

  const isAnyItemOverLimit = useMemo(() => {
    return goodsItems.some((item) => {
      const limit = destinationLimits.get(item.productId);
      return limit !== undefined && item.quantity > limit;
    });
  }, [goodsItems, destinationLimits]);

  // Effect to fetch requester details including wallet/credit limit
  useEffect(() => {
    if (requesterId) {
      // Fetch from API to get the latest creditLimit
      UserApi.getById(requesterId)
        .then((u) => {
          setFetchedRequester(u);
        })
        .catch((err) => {
          console.error('Failed to fetch requester details', err);
          // Fallback to finding in users prop
          const found = users.find((u) => u.id === requesterId);
          if (found) setFetchedRequester(found);
        });

      // Fetch wallet info
      UserApi.getWallet(requesterId)
        .then((wallet) => {
          setWalletInfo(wallet);
        })
        .catch((err) => {
          console.error('Failed to fetch wallet info', err);
          setWalletInfo(null);
        });
    } else {
      setFetchedRequester(null);
      setWalletInfo(null);
    }
  }, [requesterId, users]);

  const selectedRequester = useMemo(
    () => fetchedRequester || users.find((u) => u.id === requesterId),
    [fetchedRequester, requesterId, users]
  );
  const totalExpenses = useMemo(
    () =>
      expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [expenseItems]
  );
  const isOverLimit = useMemo(() => {
    // If we have wallet info, check against balance
    if (walletInfo && typeof walletInfo.balance === 'number') {
      return totalExpenses > walletInfo.balance;
    }
    // Fallback to creditLimit (total limit) if wallet info is missing
    if (!selectedRequester || typeof selectedRequester.creditLimit !== 'number')
      return false;
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
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300"
              >
                ยกเลิก
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={handleSaveDraft}
                className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
              >
                บันทึกฉบับร่าง
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="add-goods-withdrawal-form"
                className={`py-2 px-6 rounded-lg text-white font-semibold shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed transition-all ${
                  isOverLimit || isAnyItemOverLimit
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-primary hover:bg-primary/90'
                }`}
                title={
                  isOverLimit
                    ? 'ยอดรวมค่าใช้จ่ายเกินวงเงินที่กำหนด (ต้องรอการอนุมัติ)'
                    : isAnyItemOverLimit
                      ? 'มีรายการสินค้าที่เกินลิมิตของรถ (ต้องรอการอนุมัติ)'
                      : ''
                }
              >
                {isAnyItemOverLimit || isOverLimit
                  ? 'ส่งเพื่อขออนุมัติ'
                  : 'บันทึกและตัดสต็อก'}
              </Button>
            </div>
          </div>
        }
      >
        <form
          ref={goodsFormRef}
          id="add-goods-withdrawal-form"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-6">
            {/* Logistics Header Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <TruckIcon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  การเคลื่อนย้ายสินค้า
                </h3>
                <div className="ml-auto flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
                  <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">
                    วันที่เบิก:
                  </span>
                  <input
                    type="date"
                    name="createdAt"
                    defaultValue={new Date().toISOString().substring(0, 10)}
                    className="bg-transparent border-none p-0 text-slate-800 font-bold focus:ring-0 text-sm w-32 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                    เบิกจากคลัง (ต้นทาง) <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    value={fromWarehouseId}
                    onChange={(value) => {
                      setFromWarehouseId(value);
                      setErrors((prev: any) => ({
                        ...prev,
                        fromWarehouseId: undefined,
                      }));
                    }}
                    placeholder="เลือกคลังสินค้า"
                    options={sourceWarehouseOptions}
                    className="w-full bg-white shadow-sm border-slate-200"
                  />
                  {errors.fromWarehouseId && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.fromWarehouseId}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-center pt-6 text-slate-300">
                  <ArrowRightIcon className="w-5 h-5 hidden md:block text-slate-400" />
                  <ArrowRightIcon className="w-5 h-5 rotate-90 md:hidden text-slate-400" />
                </div>

                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                    ไปยังคลัง/รถ (ปลายทาง)
                  </label>
                  <SearchableSelect
                    value={toWarehouseId}
                    onChange={setToWarehouseId}
                    placeholder="เลือกรถบริการ (ถ้ามี)"
                    options={vehicleWarehouseOptions}
                    className="w-full bg-white shadow-sm border-slate-200"
                  />
                </div>
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
                      รายการสินค้า
                    </h3>
                    <p className="text-xs text-slate-500">
                      สินค้าที่ต้องการเบิกออกจากคลัง
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => setIsProductModalOpen(true)}
                  variant="outline"
                  className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all text-sm font-medium"
                  disabled={!fromWarehouseId}
                  title={!fromWarehouseId ? 'กรุณาเลือกคลังต้นทางก่อน' : ''}
                >
                  <PlusIcon className="w-4 h-4 mr-1.5" />
                  เพิ่มสินค้า
                </Button>
              </div>

              <div className="flex-grow overflow-y-auto bg-slate-50/30 p-4">
                {errors.goodsItems && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{errors.goodsItems}</p>
                  </div>
                )}
                {goodsItems.length === 0 ? (
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
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                      <div className="col-span-2">รหัส</div>
                      <div className="col-span-4">รายละเอียดสินค้า</div>
                      <div className="col-span-2 text-center">คงเหลือ</div>
                      <div className="col-span-1 text-center">หน่วย</div>
                      <div className="col-span-2 text-right">จำนวนเบิก</div>
                      <div className="col-span-1 text-center">จัดการ</div>
                    </div>

                    {goodsItems.map((item, index) => {
                      const product = productMap.get(item.productId);
                      const available = sourceWarehouse
                        ? effectiveStockMap
                            .get(sourceWarehouse.id)
                            ?.get(item.productId) || 0
                        : 0;
                      const limit = destinationLimits.get(item.productId);
                      const isItemOverLimit =
                        limit !== undefined && item.quantity > limit;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-xl border transition-all shadow-sm group ${
                            isItemOverLimit
                              ? 'bg-red-50 border-red-200'
                              : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'
                          }`}
                        >
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 text-sm font-bold text-slate-800">
                              {product?.code || product?.id?.substring(0, 8)}
                            </div>
                            <div className="col-span-4">
                              <div className="font-bold text-slate-800 text-sm">
                                {product?.name || 'Unknown Product'}
                              </div>
                            </div>
                            <div className="col-span-2 text-sm font-bold text-slate-800 text-center">
                              {available.toLocaleString()}
                            </div>
                            <div className="col-span-1 text-sm text-slate-800 font-bold text-center">
                              {product?.unit?.name || '-'}
                            </div>

                            <div className="col-span-2 flex flex-col items-end gap-1">
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="1"
                                  max={available}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    handleGoodsItemChange(
                                      item.id,
                                      'quantity',
                                      Number(e.target.value)
                                    );
                                    if (
                                      errors.goods &&
                                      errors.goods[index]?.quantity
                                    ) {
                                      setErrors((prev: any) => {
                                        const newErrors = { ...prev };
                                        if (
                                          newErrors.goods &&
                                          newErrors.goods[index]
                                        ) {
                                          delete newErrors.goods[index]
                                            .quantity;
                                          if (
                                            Object.keys(newErrors.goods[index])
                                              .length === 0
                                          ) {
                                            newErrors.goods.splice(index, 1);
                                          }
                                        }
                                        return newErrors;
                                      });
                                    }
                                  }}
                                  className={`w-28 text-right transition-all h-9 text-sm font-bold pr-8 ${
                                    item.quantity > available
                                      ? 'border-red-300 text-red-600 focus:border-red-500 focus:ring-red-200'
                                      : isItemOverLimit
                                        ? 'border-orange-300 text-orange-600 focus:border-orange-500 focus:ring-orange-200 bg-orange-50'
                                        : 'border-slate-200 focus:border-indigo-500'
                                  }`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none">
                                  {product?.unit?.name || 'หน่วย'}
                                </span>
                              </div>
                              {(item.quantity > available ||
                                isItemOverLimit) && (
                                <span
                                  className={`text-[10px] font-bold ${item.quantity > available ? 'text-red-600' : 'text-orange-600'}`}
                                >
                                  {item.quantity > available
                                    ? 'เกินสต็อก'
                                    : `เกินลิมิตรถ (${limit})`}
                                </span>
                              )}
                              {errors.goods &&
                                errors.goods[index]?.quantity && (
                                  <span className="text-red-600 text-[10px] font-bold">
                                    {errors.goods[index].quantity}
                                  </span>
                                )}
                            </div>

                            <div className="col-span-1 flex justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveGoodsItem(item.id)}
                                className="text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
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

            {/* People Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-2">
                <UserIcon className="w-4 h-4 text-slate-400" />
                ผู้เกี่ยวข้อง
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                    ผู้เบิก (Requester) <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    value={requesterId}
                    onChange={(value) => {
                      setRequesterId(value);
                      setErrors((prev: any) => ({
                        ...prev,
                        requesterId: undefined,
                      }));
                    }}
                    onSearchChange={handleUserSearch}
                    options={userOptions}
                    placeholder="ค้นหาชื่อผู้เบิก"
                    className="w-full text-sm"
                  />
                  {errors.requesterId && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.requesterId}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                    ผู้รับเงิน (Recipient)
                  </label>
                  <SearchableSelect
                    value={recipientId}
                    onChange={setRecipientId}
                    onSearchChange={handleUserSearch}
                    options={userOptions}
                    placeholder="ค้นหาชื่อผู้รับเงิน"
                    className="w-full text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Finance Card (Wallet & Expenses) */}
            <div
              className={`p-5 rounded-xl border shadow-sm transition-all ${
                isOverLimit
                  ? 'bg-red-50/50 border-red-200 ring-1 ring-red-100'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide pb-2">
                  <span className="bg-emerald-100 text-emerald-700 p-0.5 rounded text-[10px] px-1.5 border border-emerald-200 font-serif">
                    ฿
                  </span>
                  การเงิน & ค่าใช้จ่าย
                </h3>

                <Button
                  type="button"
                  onClick={handleAddExpense}
                  variant="outline"
                  className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all text-sm font-medium"
                >
                  <PlusIcon className="w-4 h-4 mr-1.5" />
                  เพิ่มรายการ
                </Button>
              </div>

              {/* Wallet Status Widget */}
              {walletInfo && (
                <div className="mb-5 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-500">
                      สถานะวงเงิน
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOverLimit
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isOverLimit ? 'เกินวงเงิน' : 'ปกติ'}
                    </span>
                  </div>

                  <div className="flex items-end justify-between mb-1">
                    <span className="text-xs text-slate-400">คงเหลือสุทธิ</span>
                    <span
                      className={`text-lg font-bold ${
                        walletInfo.balance - totalExpenses < 0
                          ? 'text-red-600'
                          : 'text-slate-800'
                      }`}
                    >
                      {(walletInfo.balance - totalExpenses).toLocaleString()}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        บาท
                      </span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
                    <div
                      style={{
                        width: `${walletInfo.expense_limit > 0 ? Math.min(100, ((walletInfo.expense_limit - walletInfo.balance + totalExpenses) / walletInfo.expense_limit) * 100) : 100}%`,
                      }}
                      className={`h-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>
                      ใช้ไป:{' '}
                      {(
                        walletInfo.expense_limit -
                        walletInfo.balance +
                        totalExpenses
                      ).toLocaleString()}
                    </span>
                    <span>
                      วงเงิน: {walletInfo.expense_limit.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Expense Items List */}
              <div className="space-y-2">
                {expenseItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm group"
                  >
                    <div className="p-1.5 bg-slate-100 rounded text-slate-400">
                      <BanknotesIcon className="w-3 h-3" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          handleExpenseItemChange(
                            item.id,
                            'description',
                            e.target.value
                          );
                          if (
                            errors.expenses &&
                            errors.expenses[index]?.description
                          ) {
                            setErrors((prev: any) => {
                              const newErrors = { ...prev };
                              if (
                                newErrors.expenses &&
                                newErrors.expenses[index]
                              ) {
                                delete newErrors.expenses[index].description;
                                if (
                                  Object.keys(newErrors.expenses[index])
                                    .length === 0
                                ) {
                                  newErrors.expenses.splice(index, 1);
                                }
                              }
                              return newErrors;
                            });
                          }
                        }}
                        placeholder="ระบุรายละเอียด..."
                        className="flex-grow min-w-0 border-0 border-b border-transparent focus:border-primary focus:ring-0 text-sm px-0 py-1 bg-transparent font-medium text-slate-700 placeholder:text-slate-300 w-full"
                      />
                      {errors.expenses &&
                        errors.expenses[index]?.description && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.expenses[index].description}
                          </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                      <div>
                        <input
                          type="number"
                          min="0"
                          value={item.amount}
                          onChange={(e) => {
                            handleExpenseItemChange(
                              item.id,
                              'amount',
                              e.target.value
                            );
                            if (
                              errors.expenses &&
                              errors.expenses[index]?.amount
                            ) {
                              setErrors((prev: any) => {
                                const newErrors = { ...prev };
                                if (
                                  newErrors.expenses &&
                                  newErrors.expenses[index]
                                ) {
                                  delete newErrors.expenses[index].amount;
                                  if (
                                    Object.keys(newErrors.expenses[index])
                                      .length === 0
                                  ) {
                                    newErrors.expenses.splice(index, 1);
                                  }
                                }
                                return newErrors;
                              });
                            }
                          }}
                          placeholder="0.00"
                          className="w-16 border-0 border-b border-transparent focus:border-primary focus:ring-0 text-xs text-right px-0 py-1 font-bold text-slate-800 bg-transparent placeholder:text-slate-300"
                        />
                        {errors.expenses && errors.expenses[index]?.amount && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.expenses[index].amount}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">฿</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpenseItem(item.id)}
                      className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircleIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {expenseItems.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs bg-slate-50/50">
                    ไม่มีรายการค่าใช้จ่ายเพิ่มเติม
                  </div>
                )}

                {expenseItems.length > 0 && (
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-3">
                    <span className="text-xs font-bold text-slate-600">
                      รวมค่าใช้จ่าย
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {totalExpenses.toLocaleString()} บาท
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Reference Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide pb-2">
                  <DocumentCheckIcon className="w-5 h-5 text-slate-400" />
                  ข้อมูลอ้างอิง
                </h3>

                <Button
                  type="button"
                  onClick={() => setIsCustomerSelectionModalOpen(true)}
                  variant="outline"
                  className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all text-sm font-medium"
                  title={!fromWarehouseId ? 'กรุณาเลือกคลังต้นทางก่อน' : ''}
                >
                  <PlusIcon className="w-4 h-4 mr-1.5" />
                  เลือกลูกค้า
                </Button>
              </div>

              <div className="space-y-4">
                {/* Customer */}
                <div>
                  {selectedCustomers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md border border-slate-200 shadow-sm"
                        >
                          <span className="truncate max-w-[150px] font-medium">
                            {customer.first_name} {customer.last_name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomer(customer.id)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <XCircleIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic bg-slate-50 p-2 rounded border border-dashed border-slate-200 text-center">
                      ยังไม่ได้ระบุลูกค้า
                    </div>
                  )}
                </div>

                {/* Reference Doc */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                    เอกสารอ้างอิง
                  </label>
                  <div className="flex gap-2 mb-2">
                    <select
                      className="w-1/3 border border-slate-300 rounded-lg p-2 bg-slate-50 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
                      value={referenceType}
                      onChange={(e) => setReferenceType(e.target.value as any)}
                    >
                      <option value="JOB">ใบงาน (Job)</option>
                    </select>
                    <div className="w-2/3">
                      {referenceType === 'JOB' && (
                        <SearchableSelect
                          value={referenceIds[0] || ''}
                          onChange={(value) =>
                            setReferenceIds(value ? [value] : [])
                          }
                          options={jobsForSelectedCustomers.map((j) => {
                            const c = (j as any).customer;
                            const customerName = c
                              ? `${c.first_name || ''} ${c.last_name || ''}`.trim()
                              : (j as any).customer_name || 'Unknown';
                            const jobDate =
                              (j as any).start_date || (j as any).created_at;
                            const dateStr = jobDate
                              ? new Date(jobDate).toLocaleDateString('th-TH')
                              : '-';
                            return {
                              value: j.id,
                              label: `${customerName} (${dateStr})`,
                            };
                          })}
                          placeholder="เลือกใบงาน..."
                          className="text-xs w-full shadow-sm"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                    หมายเหตุ
                  </label>
                  <textarea
                    name="remarks"
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none bg-slate-50 placeholder:text-slate-400 shadow-sm"
                    placeholder="ระบุหมายเหตุเพิ่มเติม..."
                  />
                </div>
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
        stockMap={effectiveStockMap.get(fromWarehouseId)}
      />

      <ReferenceSelectionModal
        isOpen={isReferenceModalOpen}
        onClose={() => setIsReferenceModalOpen(false)}
        onAddReferences={(refIds) =>
          setReferenceIds((prev) => Array.from(new Set([...prev, ...refIds])))
        }
        jobs={jobsForSelectedCustomers}
        currentSelection={referenceIds}
        allUsedReferenceIds={allUsedReferenceIds}
      />

      <CustomerSelectionModal
        isOpen={isCustomerSelectionModalOpen}
        onClose={() => setIsCustomerSelectionModalOpen(false)}
        onConfirm={handleConfirmCustomers}
        customers={customers}
        initialSelectedIds={selectedCustomerIds}
      />
    </>
  );
};
