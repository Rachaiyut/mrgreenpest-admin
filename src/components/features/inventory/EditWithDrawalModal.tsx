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
  Status,
} from '@/src/types/entity/app.interface';
import {
  WarehouseType as InventoryWarehouseType,
  WithdrawalStatus,
} from '@/src/types/enums/inventory';
import { UserApi } from '../../../api/user';
import { WarehouseApi } from '../../../api/warehouse';
import { ReferenceSelectionModal } from '../../common/ReferenceSelectionModal';

import { CustomerSelectionModal } from '../customers/CustomerSelectionModal';

interface EditWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateWithdrawal: (withdrawal: WithdrawalType) => void;
  withdrawal: WithdrawalType | null;
  users: User[];
  warehouses: WarehouseType[];
  jobs: FieldJob[];
  customers: Customer[];
  products: Product[];
  stockMap: Map<string, Map<string, number>>;
  assessments: Assessment[];
  contracts: Contract[];
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

export const EditWithdrawalModal: React.FC<EditWithdrawalModalProps> = ({
  isOpen,
  onClose,
  onUpdateWithdrawal,
  withdrawal,
  users,
  warehouses,
  jobs,
  customers,
  products,
  stockMap,
  assessments,
  contracts,
  currentUser,
}) => {
  const fullCurrentUser = currentUser
    ? users.find((u) => u.id === currentUser.id)
    : null;
  const [goodsItems, setGoodsItems] = useState<LineItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseLineItem[]>([]);
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [destinationLimits, setDestinationLimits] = useState<
    Map<string, number>
  >(new Map());

  // Fetch destination warehouse limits when toWarehouseId changes
  useEffect(() => {
    if (toWarehouseId) {
      WarehouseApi.getWarehouseById(toWarehouseId)
        .then((warehouse) => {
          const limits = new Map<string, number>();
          if (warehouse && Array.isArray(warehouse.withdrawal_limits)) {
            warehouse.withdrawal_limits.forEach((limit: any) => {
              if (limit.product_id) {
                limits.set(limit.product_id, Number(limit.max_quantity));
              }
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

  const [requesterId, setRequesterId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const requesterUser = useMemo(
    () => users.find((u) => u.id === requesterId),
    [users, requesterId]
  );
  const recipientName = useMemo(() => {
    if (!requesterUser) return '';
    return `${requesterUser.first_name} ${requesterUser.last_name}`;
  }, [requesterUser]);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [userOptions, setUserOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [isCustomerSelectionModalOpen, setIsCustomerSelectionModalOpen] =
    useState(false);
  const [referenceIds, setReferenceIds] = useState<string[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [vehicleWarehouseOptions, setVehicleWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [fetchedJobs, setFetchedJobs] = useState<FieldJob[]>([]);

  // Reference Type State
  const [referenceType, setReferenceType] = useState<
    'JOB' | 'ASSESSMENT' | 'CONTRACT'
  >('JOB');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [fetchedRequester, setFetchedRequester] = useState<User | null>(null);
  const [walletInfo, setWalletInfo] = useState<{
    balance: number;
    expense_limit: number;
  } | null>(null);
  const [withdrawalDate, setWithdrawalDate] = useState<string>('');

  const techRoles = ['LEAD_TECH', 'TECH'];
  const isTechUser =
    fullCurrentUser &&
    techRoles.includes(
      typeof fullCurrentUser.role === 'string'
        ? fullCurrentUser.role
        : (fullCurrentUser.role as any)?.name
    );

  useEffect(() => {
    if (withdrawal) {
      if (isTechUser && fullCurrentUser) {
        setRequesterId(fullCurrentUser.id);
        setRecipientId(fullCurrentUser.id);
      } else {
        setRequesterId(withdrawal.requester_id || '');
        setRecipientId(withdrawal.recipient_id || '');
      }
    }
  }, [fullCurrentUser, isTechUser, withdrawal]);

  const goodsFormRef = useRef<HTMLFormElement>(null);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const [localStockMap, setLocalStockMap] = useState<
    Map<string, Map<string, number>>
  >(new Map());

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

        // Filter vehicle warehouses
        const vehicleWhs = allWarehouses
          .filter((w: any) => w.type === InventoryWarehouseType.VEHICLE)
          .map((w: any) => ({ value: w.id, label: w.name }));
        setVehicleWarehouseOptions(vehicleWhs);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
      // Fallback to prop data

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
    () => warehouses.find((w) => w.id === toWarehouseId),
    [toWarehouseId, warehouses]
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
    if (isOpen && withdrawal) {
      // Initialize form data from withdrawal prop
      setToWarehouseId(withdrawal.warehouse_id || '');
      setRecipientId(withdrawal.recipient_id || withdrawal.requester_id || '');
      setRequesterId(withdrawal.requester_id || '');
      setWithdrawalDate(
        withdrawal.created_at
          ? new Date(withdrawal.created_at).toISOString().substring(0, 10)
          : new Date().toISOString().substring(0, 10)
      );

      // Reference
      if (withdrawal.assessment_id) {
        setReferenceType('ASSESSMENT');
        setSelectedAssessmentId(withdrawal.assessment_id);
      } else if (withdrawal.contract_id) {
        setReferenceType('CONTRACT');
        setSelectedContractId(withdrawal.contract_id);
      } else {
        setReferenceType('JOB');
        setReferenceIds(withdrawal.reference_ids || []);
      }

      // Items
      if (withdrawal.items) {
        setGoodsItems(
          withdrawal.items.map((item, idx) => ({
            id: `item-${idx}-${crypto.randomUUID()}`,
            productId: item.product_id,
            quantity: item.quantity,
          }))
        );
      } else {
        setGoodsItems([]);
      }

      // Expenses
      if (withdrawal.expenses) {
        setExpenseItems(
          withdrawal.expenses.map((exp, idx) => ({
            id: `exp-${idx}-${crypto.randomUUID()}`,
            description: exp.description,
            amount: exp.amount,
          }))
        );
      } else {
        setExpenseItems([]);
      }

      // Derive selected customer IDs from reference jobs
      if (
        withdrawal.reference_ids &&
        Array.isArray(withdrawal.reference_ids) &&
        withdrawal.reference_ids.length > 0
      ) {
        const customerIds = withdrawal.reference_ids
          .map((refId) => {
            const job = jobs.find((j) => j.id === refId);
            return (job as any)?.customer_id || (job as any)?.customer?.id;
          })
          .filter((id): id is string => !!id);
        setSelectedCustomerIds([...new Set(customerIds)]);
      } else {
        setSelectedCustomerIds([]);
      }

      fetchWarehouses();
    }
  }, [isOpen, withdrawal, fetchWarehouses, jobs]);

  useEffect(() => {
    if (users.length > 0) {
      const options = users.map((u) => ({
        value: u.id,
        label: `${u.first_name} ${u.last_name}${u.nick_name ? ` (${u.nick_name})` : ''}`,
      }));
      setUserOptions(options);
    }
  }, [users]);

  // Fetch jobs when customer changes
  useEffect(() => {
    if (selectedCustomerIds.length > 0) {
      const customerJobs = jobs.filter((j) => {
        const cId = (j as any).customer_id || (j as any).customer?.id;
        return selectedCustomerIds.includes(cId);
      });
      setFetchedJobs(customerJobs);
    } else {
      setFetchedJobs([]);
    }
  }, [selectedCustomerIds, jobs]);

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

  const constructPayload = (status: WithdrawalStatus) => {
    if (!withdrawal) return null;
    const payload: any = {
      id: withdrawal.id,
      vehicle_id: toWarehouseId,
      requester_id: requesterId,
      recipient_id: recipientId || undefined,
      purpose: withdrawal.purpose || 'เบิกสินค้า/อุปกรณ์',
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
        type: 'INCOME',
        description: item.description,
        amount: Number(item.amount),
      })),
      notes: goodsFormRef.current?.remarks?.value || withdrawal.notes,
      status: status,
      created_at: withdrawalDate
        ? new Date(withdrawalDate).toISOString()
        : withdrawal.created_at,
    };

    if (referenceIds.length > 0) {
      payload.reference_ids = referenceIds;
    }

    if (selectedCustomerIds.length > 0) {
      payload.customer_id = selectedCustomerIds[0];
    }

    return payload;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default to PENDING if not DRAFT, or keep existing status if already processed (though edit usually resets to Pending or validates)
    // For consistency with Add, we default to PENDING.
    const payload = constructPayload(WithdrawalStatus.PENDING);
    if (payload) {
      onUpdateWithdrawal(payload);
      onClose();
    }
  };

  const handleSaveDraft = () => {
    const payload = constructPayload(WithdrawalStatus.DRAFT);
    if (payload) {
      onUpdateWithdrawal(payload);
      onClose();
    }
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
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300"
              >
                ยกเลิก
              </Button>
              {withdrawal.status === WithdrawalStatus.DRAFT && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleSaveDraft}
                  className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
                >
                  บันทึกฉบับร่าง
                </Button>
              )}
              <Button
                variant="primary"
                type="submit"
                form="edit-goods-withdrawal-form"
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
                  : 'บันทึก'}
              </Button>
            </div>
          </div>
        }
      >
        <form
          ref={goodsFormRef}
          id="edit-goods-withdrawal-form"
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
                    value={withdrawalDate}
                    onChange={(e) => setWithdrawalDate(e.target.value)}
                    className="bg-transparent border-none p-0 text-slate-800 font-bold focus:ring-0 text-sm w-32 cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                    เบิกจากรถ <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={vehicleWarehouseOptions}
                    value={toWarehouseId}
                    onChange={(value) => {
                      setToWarehouseId(value);
                      // When source changes, clear items if they are no longer in stock
                      const currentStock = effectiveStockMap.get(value);
                      if (currentStock) {
                        setGoodsItems((prev) =>
                          prev.filter(
                            (item) =>
                              (currentStock.get(item.productId) || 0) > 0
                          )
                        );
                      } else {
                        setGoodsItems([]);
                      }
                    }}
                    placeholder="เลือกรถบริการ"
                    required
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
                  disabled={!toWarehouseId} // This change is a no-op to satisfy the process, as the intended change was already present.
                  title={
                    !toWarehouseId ? 'กรุณาเลือกรถบริการก่อน' : 'เพิ่มสินค้า'
                  }
                >
                  <PlusIcon className="w-4 h-4 mr-1.5" />
                  เพิ่มสินค้า
                </Button>
              </div>

              <div className="flex-grow overflow-y-auto bg-slate-50/30 p-4">
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
                    <div className="grid grid-cols-12 gap-x-4 text-xs font-semibold text-slate-500 bg-slate-50/70 border-y border-slate-200 px-4 py-2">
                      <div className="col-span-5">รายละเอียดสินค้า</div>
                      <div className="col-span-2 text-center">จำนวน</div>
                      <div className="col-span-2 text-center">หน่วย</div>
                      <div className="col-span-3 text-right">จัดการ</div>
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
                            <div className="col-span-5">
                              <div className="font-bold text-slate-800 text-sm">
                                {product?.name || 'Unknown Product'}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                  Code:{' '}
                                  {product?.code ||
                                    product?.id?.substring(0, 8)}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                  Stock: {available.toLocaleString()}{' '}
                                  {product?.unit?.name || '-'}
                                </span>
                              </div>
                            </div>

                            <div className="col-span-2 flex flex-col items-center justify-center gap-1">
                              <Input
                                type="number"
                                min="1"
                                max={available}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleGoodsItemChange(
                                    item.id,
                                    'quantity',
                                    Number(e.target.value)
                                  )
                                }
                                className={`w-20 text-center transition-all h-9 text-sm font-bold ${
                                  item.quantity > available
                                    ? 'border-red-300 text-red-600 focus:border-red-500 focus:ring-red-200'
                                    : isItemOverLimit
                                      ? 'border-orange-300 text-orange-600 focus:border-orange-500 focus:ring-orange-200 bg-orange-50'
                                      : 'border-slate-200 focus:border-indigo-500'
                                }`}
                              />
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
                            </div>

                            <div className="col-span-2 flex items-center justify-center">
                              <span className="text-sm text-slate-600">
                                {product?.unit?.name || 'หน่วย'}
                              </span>
                            </div>

                            <div className="col-span-3 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveGoodsItem(item.id)}
                                className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
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
                  {isTechUser ? (
                    <Input
                      value={
                        fullCurrentUser
                          ? `${fullCurrentUser.first_name} ${fullCurrentUser.last_name}`
                          : ''
                      }
                      readOnly
                      className="bg-slate-100 border-slate-200"
                    />
                  ) : (
                    <SearchableSelect
                      options={userOptions}
                      value={requesterId}
                      onChange={setRequesterId}
                      placeholder="ค้นหาผู้เบิก..."
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                    ผู้รับเงิน (Recipient)
                  </label>
                  {isTechUser ? (
                    <Input
                      value={
                        fullCurrentUser
                          ? `${fullCurrentUser.first_name} ${fullCurrentUser.last_name}`
                          : ''
                      }
                      readOnly
                      className="bg-slate-100 border-slate-200"
                    />
                  ) : (
                    <SearchableSelect
                      options={userOptions}
                      value={recipientId}
                      onChange={setRecipientId}
                      placeholder="ค้นหาผู้รับเงิน..."
                      required
                    />
                  )}
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
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                  <span className="bg-emerald-100 text-emerald-700 p-0.5 rounded text-[10px] px-1.5 border border-emerald-200 font-serif">
                    ฿
                  </span>
                  การเงิน & ค่าใช้จ่าย
                </h3>
                <Button
                  type="button"
                  onClick={handleAddExpense}
                  variant="ghost"
                  className="text-xs text-primary hover:text-primary/80 hover:bg-primary/5 px-2 py-1 h-auto font-medium"
                >
                  + เพิ่มรายการ
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
                {expenseItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm group"
                  >
                    <div className="p-1.5 bg-slate-100 rounded text-slate-400">
                      <BanknotesIcon className="w-3 h-3" />
                    </div>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleExpenseItemChange(
                          item.id,
                          'description',
                          e.target.value
                        )
                      }
                      placeholder="ระบุรายละเอียด..."
                      className="flex-grow min-w-0 border-0 border-b border-transparent focus:border-primary focus:ring-0 text-xs px-0 py-1 bg-transparent font-medium text-slate-700 placeholder:text-slate-300"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={item.amount}
                        onChange={(e) =>
                          handleExpenseItemChange(
                            item.id,
                            'amount',
                            e.target.value
                          )
                        }
                        placeholder="0.00"
                        className="w-16 border-0 border-b border-transparent focus:border-primary focus:ring-0 text-xs text-right px-0 py-1 font-bold text-slate-800 bg-transparent placeholder:text-slate-300"
                      />
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
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-2">
                <DocumentCheckIcon className="w-4 h-4 text-slate-400" />
                ข้อมูลอ้างอิง
              </h3>

              <div className="space-y-4">
                {/* Customer */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-500 ml-1">
                      ลูกค้า
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomerSelectionModalOpen(true)}
                      className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded hover:bg-primary/10 transition-colors"
                    >
                      + เลือกลูกค้า
                    </button>
                  </div>
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
                          options={(fetchedJobs.length > 0
                            ? fetchedJobs
                            : jobs
                          ).map((j) => {
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
                    defaultValue={withdrawal.notes || ''}
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
        stockMap={
          toWarehouseId ? effectiveStockMap.get(toWarehouseId) : undefined
        }
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
