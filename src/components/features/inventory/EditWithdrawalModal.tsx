import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Status,
  User,
  Warehouse as WarehouseType,
  Customer,
  Product,
  Assessment,
  Contract,
} from '@/src/types/entity/app.interface';
import { Job } from '@/src/types/entity/job.interface';
import { WarehouseType as InventoryWarehouseType, WithdrawalStatus } from '@/src/types/enums/inventory';
import { UserApi } from '../../../api/user';
import { WarehouseApi } from '../../../api/warehouse';
import { JobApi } from '../../../api/job';
import { ReferenceSelectionModal } from '../../common/ReferenceSelectionModal';
import { CustomerSelectionModal } from '../customers/CustomerSelectionModal';

interface EditWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateWithdrawal: (withdrawal: WithdrawalType) => void;
  withdrawal: WithdrawalType | null;
  users: User[];
  warehouses: WarehouseType[];
  jobs: Job[];
  customers: Customer[];
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
}) => {
  const [goodsItems, setGoodsItems] = useState<LineItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseLineItem[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');

  const [destinationLimits, setDestinationLimits] = useState<Map<string, number>>(new Map());

  // Fetch destination warehouse limits when toWarehouseId changes
  useEffect(() => {
    if (toWarehouseId) {
      WarehouseApi.getWarehouseById(toWarehouseId).then((warehouse) => {
        const limits = new Map<string, number>();
        if (warehouse && Array.isArray(warehouse.withdrawal_limits)) {
          warehouse.withdrawal_limits.forEach((limit: any) => {
            if (limit.product_id) {
              limits.set(limit.product_id, Number(limit.max_quantity));
            }
          });
        }
        setDestinationLimits(limits);
      }).catch(err => {
        console.error("Failed to fetch destination warehouse limits", err);
        setDestinationLimits(new Map());
      });
    } else {
      setDestinationLimits(new Map());
    }
  }, [toWarehouseId]);

  const isAnyItemOverLimit = useMemo(() => {
    return goodsItems.some(item => {
      const limit = destinationLimits.get(item.productId);
      return limit !== undefined && item.quantity > limit;
    });
  }, [goodsItems, destinationLimits]);

  const [requesterId, setRequesterId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([]);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [isCustomerSelectionModalOpen, setIsCustomerSelectionModalOpen] =
    useState(false);
  const [referenceIds, setReferenceIds] = useState<string[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [sourceWarehouseOptions, setSourceWarehouseOptions] = useState<{ value: string; label: string }[]>([]);
  const [vehicleWarehouseOptions, setVehicleWarehouseOptions] = useState<{ value: string; label: string }[]>([]);
  const [fetchedJobs, setFetchedJobs] = useState<Job[]>([]);
  const [notes, setNotes] = useState('');

  // Reference Type State
  const [referenceType, setReferenceType] = useState<'JOB' | 'ASSESSMENT' | 'CONTRACT'>('JOB');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');

  const goodsFormRef = useRef<HTMLFormElement>(null);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const [localStockMap, setLocalStockMap] = useState<Map<string, Map<string, number>>>(new Map());

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
          const stockItems = Array.isArray(w.stock) ? w.stock : (Array.isArray(w.stock_balances) ? w.stock_balances : []);

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

        // Filter source warehouses (MAIN or SUB)
        const sourceWhs = allWarehouses
          .filter((w: any) => w.type === InventoryWarehouseType.MAIN || w.type === InventoryWarehouseType.SUB)
          .map((w: any) => ({ value: w.id, label: w.name }));
        setSourceWarehouseOptions(sourceWhs);

        // Filter vehicle warehouses
        const vehicleWhs = allWarehouses
          .filter((w: any) => w.type === InventoryWarehouseType.VEHICLE)
          .map((w: any) => ({ value: w.id, label: w.name }));
        setVehicleWarehouseOptions(vehicleWhs);
      }
    } catch (error) {
      console.error("Failed to fetch warehouses", error);
      // Fallback to prop data
      const sourceWhs = warehouses
        .filter((w) => w.type === InventoryWarehouseType.MAIN || w.type === InventoryWarehouseType.SUB)
        .map((w) => ({ value: w.id, label: w.name }));
      setSourceWarehouseOptions(sourceWhs);

      const vehicleWhs = warehouses
        .filter((w) => w.type === InventoryWarehouseType.VEHICLE)
        .map((w) => ({ value: w.id, label: w.name }));
      setVehicleWarehouseOptions(vehicleWhs);
    }
  }, [warehouses]);

  const effectiveStockMap = useMemo(() => {
    if (localStockMap.size > 0) return localStockMap;
    return stockMap;
  }, [stockMap, localStockMap]);

  const sourceWarehouse = useMemo(
    () => warehouses.find((w) => w.id === fromWarehouseId),
    [fromWarehouseId, warehouses]
  );

  const productsInWarehouse = useMemo(() => {
    if (!sourceWarehouse) return [];
    const whId = sourceWarehouse.id;
    return products.filter(
      (p) => {
        const qty = effectiveStockMap.get(whId)?.get(p.id);
        return (qty || 0) > 0;
      }
    );
  }, [sourceWarehouse, products, effectiveStockMap]);

  // Initialize user options from props
  useEffect(() => {
    if (users) {
      setUserOptions(users.map(u => ({ value: u.id, label: u.name })));
    }
  }, [users]);

  const handleUserSearch = useCallback(async (search: string) => {
    if (!search) {
      setUserOptions(users.map(u => ({ value: u.id, label: u.name })));
      return;
    }
    try {
      const res = await UserApi.getAll({ search, limit: 20 });
      if (res && res.data) {
        setUserOptions(res.data.map(u => ({ value: u.id, label: u.name })));
      } else if (Array.isArray(res)) {
        setUserOptions((res as any).map((u: any) => ({ value: u.id, label: u.name })));
      }
    } catch (error) {
      console.error("Failed to search users", error);
    }
  }, [users]);

  // Initialize form with withdrawal data when modal opens
  useEffect(() => {
    if (isOpen && withdrawal) {
      // Set basic fields
      setFromWarehouseId(withdrawal.warehouse_id || '');
      setToWarehouseId(withdrawal.to_warehouse_id || '');
      setRequesterId(withdrawal.requester_id || '');
      setRecipientId(withdrawal.recipient_id || '');
      setNotes(withdrawal.notes || '');

      // Set reference type and IDs
      if (withdrawal.assessment_id) {
        setReferenceType('ASSESSMENT');
        setSelectedAssessmentId(withdrawal.assessment_id);
        setSelectedContractId('');
        setReferenceIds([]);
      } else if (withdrawal.contract_id) {
        setReferenceType('CONTRACT');
        setSelectedContractId(withdrawal.contract_id);
        setSelectedAssessmentId('');
        setReferenceIds([]);
      } else {
        setReferenceType('JOB');
        setReferenceIds(withdrawal.reference_ids || []);
        setSelectedAssessmentId('');
        setSelectedContractId('');
      }

      // Set goods items
      if (withdrawal.items && withdrawal.items.length > 0) {
        setGoodsItems(
          withdrawal.items.map((item, index) => ({
            id: `item-${index}-${Date.now()}`,
            productId: item.product_id,
            quantity: item.quantity,
          }))
        );
      } else {
        setGoodsItems([]);
      }

      // Set expense items
      if (withdrawal.expenses && withdrawal.expenses.length > 0) {
        setExpenseItems(
          withdrawal.expenses.map((exp, index) => ({
            id: `exp-${index}-${Date.now()}`,
            description: exp.description,
            amount: exp.amount, // Keep as is, Input usually handles string/number. Or Number(exp.amount) if strict.
          }))
        );
      } else {
        setExpenseItems([]);
      }

      // Derive selected customer IDs from reference jobs
      if (withdrawal.reference_ids && withdrawal.reference_ids.length > 0) {
        const customerIds = withdrawal.reference_ids
          .map((refId) => {
            const job = jobs.find((j) => j.id === refId);
            return job?.customer_id;
          })
          .filter((id): id is string => !!id);
        setSelectedCustomerIds([...new Set(customerIds)]);
      } else {
        setSelectedCustomerIds([]);
      }

      // Fetch warehouses when modal opens
      fetchWarehouses();

      // Fetch jobs
      JobApi.getAll().then(res => {
        if (res && res.data) {
          setFetchedJobs(res.data);
        }
      }).catch(err => console.error("Failed to fetch jobs", err));
    }
  }, [isOpen, withdrawal, jobs, fetchWarehouses]);

  const jobsForSelectedCustomers = useMemo(() => {
    if (selectedCustomerIds.length === 0) return [];
    const customerIdSet = new Set(selectedCustomerIds);
    return jobs.filter((job) => customerIdSet.has(job.customer_id));
  }, [jobs, selectedCustomerIds]);

  const selectedCustomers = useMemo(
    () => customers.filter((c) => selectedCustomerIds.includes(c.id)),
    [customers, selectedCustomerIds]
  );

  const handleAddProducts = (productIds: string[]) => {
    const newItems: LineItem[] = productIds.map((pid) => ({
      id: `item-${Date.now()}-${Math.random()}`,
      productId: pid,
      quantity: 1,
    }));
    setGoodsItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveGoodsItem = (id: string) => {
    setGoodsItems(goodsItems.filter((item) => item.id !== id));
  };

  const handleGoodsItemChange = (
    id: string,
    field: keyof LineItem,
    value: string | number
  ) => {
    setGoodsItems(
      goodsItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleAddExpense = () => {
    setExpenseItems((prev) => [
      ...prev,
      { id: `exp-${Date.now()}`, description: '', amount: '' },
    ]);
  };

  const handleRemoveExpenseItem = (id: string) => {
    setExpenseItems(expenseItems.filter((item) => item.id !== id));
  };

  const handleExpenseItemChange = (
    id: string,
    field: 'description' | 'amount',
    value: string
  ) => {
    setExpenseItems(
      expenseItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item };
          if (field === 'amount') {
            updatedItem.amount = value === '' ? '' : Number(value);
          } else if (field === 'description') {
            updatedItem.description = value;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleRemoveCustomer = (customerId: string) => {
    setSelectedCustomerIds((prev) => prev.filter((id) => id !== customerId));
    const jobsOfRemovedCustomer = new Set(
      jobs.filter((j) => j.customer_id === customerId).map((j) => j.id)
    );
    setReferenceIds((currentRefs) =>
      currentRefs.filter((refId) => !jobsOfRemovedCustomer.has(refId))
    );
  };

  const handleConfirmCustomers = (customerIds: string[]) => {
    const oldIds = new Set<string>(selectedCustomerIds);
    const newIds = new Set<string>(customerIds);

    const removedIds: string[] = [...oldIds].filter(
      (id: string) => !newIds.has(id)
    );

    if (removedIds.length > 0) {
      const removedCustomerJobs = new Set(
        jobs.filter((j) => removedIds.includes(j.customer_id)).map((j) => j.id)
      );
      setReferenceIds((currentRefs) =>
        currentRefs.filter((refId) => !removedCustomerJobs.has(refId))
      );
    }

    setSelectedCustomerIds(customerIds);
  };

  const createWithdrawalObject = (status: Status | WithdrawalStatus): WithdrawalType => {
    return {
      id: withdrawal!.id,
      warehouse_id: fromWarehouseId,
      to_warehouse_id: toWarehouseId || undefined,
      reference_ids: referenceType === 'JOB' ? referenceIds : undefined,
      assessment_id: referenceType === 'ASSESSMENT' ? selectedAssessmentId : undefined,
      contract_id: referenceType === 'CONTRACT' ? selectedContractId : undefined,
      purpose: withdrawal!.purpose || 'เบิกสินค้าสำหรับงานบริการ', // Preserve existing or default
      status: status,
      created_by: withdrawal!.created_by,

      items: goodsItems.map((item) => {
        const product = productMap.get(item.productId);
        return {
          product_id: item.productId,
          product_name: product?.name || '-',
          quantity: Number(item.quantity),
          unit: product?.unit?.name || '-',
        };
      }),

      expenses: expenseItems
        .filter(
          (item) =>
            item.description &&
            item.amount !== '' &&
            !isNaN(Number(item.amount))
        )
        .map((item) => ({
          description: item.description,
          amount: Number(item.amount) || 0,
        })),

      recipient_id: recipientId || undefined,
      requester_id: requesterId || undefined,
      notes: notes || undefined,
    };
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!withdrawal) return;
    
    // Default: Keep existing status
    let status = withdrawal.status as WithdrawalStatus;
    
    onUpdateWithdrawal(createWithdrawalObject(status));
    onClose();
  };

  const handleSubmitDraft = () => {
     if (!withdrawal) return;
     // This acts as "Submit" for a Draft
     const status = isAnyItemOverLimit ? WithdrawalStatus.PENDING : WithdrawalStatus.COMPLETED;
     onUpdateWithdrawal(createWithdrawalObject(status));
     onClose();
  }

  const existingProductIds = useMemo(
    () => goodsItems.map((item) => item.productId),
    [goodsItems]
  );

  const selectedRequester = useMemo(
    () => users.find((u) => u.id === requesterId),
    [requesterId, users]
  );

  const totalExpenses = useMemo(
    () =>
      expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [expenseItems]
  );

  const isOverLimit = useMemo(() => {
    if (!selectedRequester || typeof selectedRequester.creditLimit !== 'number')
      return false;
    return totalExpenses > selectedRequester.creditLimit;
  }, [totalExpenses, selectedRequester]);

  if (!withdrawal) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`แก้ไขใบเบิก ${withdrawal.id || ''}`}
        size="5xl"
        footer={
          <div className="flex w-full justify-between items-center">
            <div className="text-sm text-slate-500">
              * จำเป็นต้องกรอกข้อมูลที่มีเครื่องหมายดอกจัน
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
              
              {/* If Draft, show "Save Draft" and "Submit" */}
              {(withdrawal.status === WithdrawalStatus.DRAFT || withdrawal.status === Status.Draft) ? (
                  <>
                    <Button
                        variant="secondary"
                        type="submit"
                        form="edit-goods-withdrawal-form"
                        className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
                    >
                        บันทึกฉบับร่าง
                    </Button>
                    <Button
                        variant="primary"
                        type="button"
                        onClick={handleSubmitDraft}
                        className="py-2 px-6 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
                        disabled={isOverLimit}
                    >
                        {isAnyItemOverLimit ? 'ส่งเพื่อขออนุมัติ (เกินลิมิต)' : 'บันทึกและตัดสต็อก'}
                    </Button>
                  </>
              ) : (
                  // If not Draft (Pending/Approved/etc.), show "Save Changes"
                  <Button
                    variant="primary"
                    type="submit"
                    form="edit-goods-withdrawal-form"
                    className="py-2 px-6 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                    disabled={isOverLimit}
                    title={
                      isOverLimit
                        ? 'ยอดรวมค่าใช้จ่ายเกินวงเงินที่กำหนด'
                        : isAnyItemOverLimit
                          ? 'มีรายการสินค้าที่เกินลิมิตของรถ'
                          : ''
                    }
                  >
                    บันทึกการแก้ไข
                  </Button>
              )}
            </div>
          </div>
        }
      >
        <form
          ref={goodsFormRef}
          id="edit-goods-withdrawal-form"
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          {/* Header Section */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white p-2 rounded-md shadow-sm border border-slate-200">
                <DocumentCheckIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-sm text-slate-500">เลขที่ใบเบิก</div>
                <div className="font-mono font-bold text-lg text-slate-800">{withdrawal.code}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-500">วันที่สร้าง</div>
                  <div className="text-sm font-medium text-slate-800">
                    {withdrawal.created_at ? new Date(withdrawal.created_at).toLocaleDateString('th-TH') : '-'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-500">ผู้สร้าง</div>
                  <div className="text-sm font-medium text-slate-800">{users.find(u => u.id === withdrawal.created_by)?.name || withdrawal.created_by}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Logistics & People */}
            <div className="lg:col-span-7 space-y-6">
              {/* Logistics Section */}
              <section>
                <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <TruckIcon className="w-5 h-5 text-slate-500" />
                  การเคลื่อนย้ายสินค้า
                </h3>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
                        เบิกจากคลัง (ต้นทาง) <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        required
                        value={fromWarehouseId}
                        onChange={setFromWarehouseId}
                        placeholder="เลือกคลังสินค้า"
                        options={sourceWarehouseOptions}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="flex items-center justify-center pt-6 text-slate-400">
                      <ArrowRightIcon className="w-6 h-6 hidden md:block" />
                      <ArrowRightIcon className="w-6 h-6 rotate-90 md:hidden" />
                    </div>

                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
                        ไปยังคลัง/รถ (ปลายทาง)
                      </label>
                      <SearchableSelect
                        value={toWarehouseId}
                        onChange={setToWarehouseId}
                        placeholder="เลือกรถบริการ (ถ้ามี)"
                        options={vehicleWarehouseOptions}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* People Section */}
              <section>
                <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-slate-500" />
                  ผู้เกี่ยวข้อง
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
                      ผู้เบิก
                    </label>
                    <SearchableSelect
                      value={requesterId}
                      onChange={setRequesterId}
                      onSearchChange={handleUserSearch}
                      options={userOptions}
                      placeholder="ค้นหาชื่อผู้เบิก"
                      required={expenseItems.length > 0}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
                      ผู้รับเงิน (กรณีมีค่าใช้จ่าย)
                    </label>
                    <SearchableSelect
                      value={recipientId}
                      onChange={setRecipientId}
                      onSearchChange={handleUserSearch}
                      options={userOptions}
                      placeholder="ค้นหาชื่อผู้รับเงิน"
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Context (Customer & Ref) */}
            <div className="lg:col-span-5 space-y-6">
              <section className="h-full flex flex-col">
                <h3 className="text-base font-semibold text-slate-800 mb-3">
                  ข้อมูลอ้างอิง
                </h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-full space-y-4">
                  
                  {/* Customer Selection */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-medium text-slate-500">ลูกค้า</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomerSelectionModalOpen(true)}
                        className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
                      >
                        <PlusIcon className="w-3 h-3" />
                        เพิ่ม/แก้ไขลูกค้า
                      </button>
                    </div>
                    
                    {selectedCustomers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-800 text-sm px-3 py-1.5 rounded-full shadow-sm"
                          >
                            <span className="break-words">{customer.first_name} {customer.last_name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomer(customer.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div 
                        onClick={() => setIsCustomerSelectionModalOpen(true)}
                        className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-white transition-all group"
                      >
                        <p className="text-sm text-slate-500 group-hover:text-primary">ยังไม่ได้เลือกลูกค้า</p>
                      </div>
                    )}
                  </div>

                  <hr className="border-slate-200" />

                  {/* Reference Selection */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      เอกสารอ้างอิง
                    </label>
                    <div className="space-y-2">
                      <select
                        className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        value={referenceType}
                        onChange={(e) => setReferenceType(e.target.value as any)}
                      >
                        <option value="JOB">ใบงาน (Job)</option>
                      </select>

                      {referenceType === 'JOB' && (
                        <SearchableSelect
                          value={referenceIds[0] || ''}
                          onChange={(value) => setReferenceIds(value ? [value] : [])}
                          options={(fetchedJobs.length > 0 ? fetchedJobs : jobs).map(j => {
                            const c = (j as any).customer;
                            const customerName = c
                              ? `${c.first_name || ''} ${c.last_name || ''}`.trim()
                              : (j as any).customer_name || 'Unknown Customer';
                            
                            const jobDate = (j as any).start_date || (j as any).created_at;
                            const dateStr = jobDate 
                              ? new Date(jobDate).toLocaleDateString('th-TH') 
                              : '-';

                            return {
                              value: j.id,
                              label: `${customerName} - ${dateStr}`
                            };
                          })}
                          placeholder="ค้นหาใบงาน..."
                        />
                      )}
                    </div>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      หมายเหตุ
                    </label>
                    <textarea
                      name="remarks"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      placeholder="ระบุหมายเหตุเพิ่มเติม..."
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Items Section */}
          <section>
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">รายการเบิกสินค้า</h3>
                <p className="text-sm text-slate-500">เลือกสินค้าและระบุจำนวนที่ต้องการเบิก</p>
              </div>
              <Button
                type="button"
                onClick={() => setIsProductModalOpen(true)}
                variant="outline"
                className="text-primary border-primary hover:bg-primary/5 active:bg-primary/10 transition-colors"
                disabled={!fromWarehouseId}
                title={!fromWarehouseId ? 'กรุณาเลือกคลังต้นทางก่อน' : ''}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                เพิ่มรายการสินค้า
              </Button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {goodsItems.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
                  <div className="bg-slate-50 p-4 rounded-full mb-3">
                    <TruckIcon className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="font-medium text-slate-600">ยังไม่มีรายการสินค้า</p>
                  <p className="text-sm mt-1">กดปุ่ม "เพิ่มรายการสินค้า" เพื่อเริ่มต้น</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  <div className="bg-slate-50 px-4 py-2 grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-6 md:col-span-7">สินค้า</div>
                    <div className="col-span-4 md:col-span-4 text-right">จำนวน</div>
                    <div className="col-span-2 md:col-span-1 text-center">ลบ</div>
                  </div>
                  {goodsItems.map((item, index) => {
                    const product = productMap.get(item.productId);
                    const available = sourceWarehouse
                      ? effectiveStockMap.get(sourceWarehouse.id)?.get(item.productId) || 0
                      : 0;
                    const limit = destinationLimits.get(item.productId);
                    const isItemOverLimit = limit !== undefined && item.quantity > limit;
                    
                    return (
                      <div
                        key={item.id}
                        className={`px-4 py-3 grid grid-cols-12 gap-4 items-center transition-colors ${
                          isItemOverLimit ? 'bg-red-50 border-l-4 border-l-red-500' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="col-span-6 md:col-span-7">
                          <div className="font-medium text-slate-900">
                            {product?.name || 'Unknown Product'}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                              {product?.id}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                              คงเหลือ: {available} {product?.unit?.name || '-'}
                            </span>
                          </div>
                        </div>
                        <div className="col-span-4 md:col-span-4 flex flex-col items-end gap-1">
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
                            className={`w-24 text-right transition-all ${
                              item.quantity > available 
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                                : isItemOverLimit
                                  ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-200 bg-orange-50'
                                  : ''
                            }`}
                          />
                          {item.quantity > available && (
                            <span className="text-xs text-red-600 font-medium">
                              เกินจำนวนคงเหลือ
                            </span>
                          )}
                          {isItemOverLimit && (
                            <span className="text-xs text-orange-600 font-medium">
                              เกินลิมิตรถ ({limit})
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 md:col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveGoodsItem(item.id)}
                            className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Expenses Section */}
          <section className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <span className="bg-white p-1 rounded border border-slate-200 text-xs">฿</span>
                ค่าใช้จ่ายเพิ่มเติม
              </h3>
              <Button
                type="button"
                onClick={handleAddExpense}
                variant="ghost"
                className="text-sm text-primary hover:text-primary/80 hover:bg-white"
              >
                + เพิ่มค่าใช้จ่าย
              </Button>
            </div>
            
            <div className="space-y-3">
              {expenseItems.length === 0 ? (
                <div className="text-sm text-slate-500 italic text-center py-2 border border-dashed border-slate-300 rounded-lg">
                  ไม่มีรายการค่าใช้จ่าย
                </div>
              ) : (
                expenseItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 items-start bg-white p-3 rounded-lg border border-slate-200 shadow-sm"
                  >
                    <div className="flex-grow">
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
                        placeholder="รายละเอียดค่าใช้จ่าย"
                        className="w-full border-0 border-b border-slate-200 focus:border-primary focus:ring-0 text-sm px-0 py-1"
                      />
                    </div>
                    <div className="w-32">
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
                        placeholder="จำนวนเงิน"
                        className="w-full border-0 border-b border-slate-200 focus:border-primary focus:ring-0 text-sm text-right px-0 py-1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpenseItem(item.id)}
                      className="text-slate-400 hover:text-red-500 pt-1"
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
              
              {expenseItems.length > 0 && (
                <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-200 mt-2">
                  <span className="text-sm font-medium text-slate-600">รวมเป็นเงิน:</span>
                  <span className="text-lg font-bold text-slate-800">{totalExpenses.toLocaleString()} บาท</span>
                  {selectedRequester &&
                    typeof selectedRequester.creditLimit === 'number' && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${isOverLimit ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                      >
                        วงเงิน: {selectedRequester.creditLimit.toLocaleString()}
                      </span>
                    )}
                </div>
              )}
            </div>
          </section>
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
        jobs={jobsForSelectedCustomers as any}
        currentSelection={referenceIds}
        allUsedReferenceIds={[]}
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