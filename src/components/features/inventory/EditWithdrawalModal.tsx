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
  const [walletInfo, setWalletInfo] = useState<{ balance: number; expense_limit: number } | null>(null);

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
        setReferenceIds(Array.isArray(withdrawal.reference_ids) ? withdrawal.reference_ids : []);
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
      if (withdrawal.reference_ids && Array.isArray(withdrawal.reference_ids) && withdrawal.reference_ids.length > 0) {
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

      // Fetch wallet info if requester exists
      if (withdrawal.requester_id) {
        UserApi.getWallet(withdrawal.requester_id).then(wallet => {
          setWalletInfo(wallet);
        }).catch(err => {
          console.error("Failed to fetch wallet info", err);
          setWalletInfo(null);
        });
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

  const handleSaveDraft = () => {
    if (!withdrawal) return;
    // For draft, we don't strictly enforce limit checks with confirmation
    // just save as DRAFT
    const status = withdrawal.status === Status.Draft ? WithdrawalStatus.DRAFT : WithdrawalStatus.PENDING; // If it was somehow not draft, revert? No, this function is for Save Draft button which only appears if Draft.
    
    onUpdateWithdrawal(createWithdrawalObject(WithdrawalStatus.DRAFT));
    onClose();
  };

  const handleSubmitForApproval = () => {
     if (!withdrawal) return;
     
     // Limit Checks
     if (isOverLimit || isAnyItemOverLimit) {
       const hasReference = referenceIds.length > 0;
       if (!hasReference) {
          if (isOverLimit) {
             if (!confirm('คุณกำลังเบิกค่าใช้จ่ายเกินวงเงินโดยไม่มีการอ้างอิงงาน \nระบบจะส่งการแจ้งเตือนไปยัง CFO และ CEO \nต้องการดำเนินการต่อหรือไม่?')) return;
          } else if (isAnyItemOverLimit) {
             if (!confirm('คุณกำลังเบิกสินค้าเกินลิมิตโดยไม่มีการอ้างอิงงาน \nระบบจะส่งการแจ้งเตือนไปยัง COO และ CEO \nต้องการดำเนินการต่อหรือไม่?')) return;
          }
       }
     }

     const status = WithdrawalStatus.PENDING;
     onUpdateWithdrawal(createWithdrawalObject(status));
     onClose();
  }

  const handleSaveChanges = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!withdrawal) return;

    // Same Limit Checks as Submit
    if (isOverLimit || isAnyItemOverLimit) {
      const hasReference = referenceIds.length > 0;
      if (!hasReference) {
        if (isOverLimit) {
           if (!confirm('คุณกำลังเบิกค่าใช้จ่ายเกินวงเงินโดยไม่มีการอ้างอิงงาน \nระบบจะส่งการแจ้งเตือนไปยัง CFO และ CEO \nต้องการดำเนินการต่อหรือไม่?')) return;
        } else if (isAnyItemOverLimit) {
           if (!confirm('คุณกำลังเบิกสินค้าเกินลิมิตโดยไม่มีการอ้างอิงงาน \nระบบจะส่งการแจ้งเตือนไปยัง COO และ CEO \nต้องการดำเนินการต่อหรือไม่?')) return;
        }
      }
    }
    
    // For existing Pending/Approved, we usually keep it Pending after edit
    let status = WithdrawalStatus.PENDING;
    if (withdrawal.status === WithdrawalStatus.COMPLETED || withdrawal.status === WithdrawalStatus.APPROVED) {
        // If policy allows editing approved docs without status reset, set here. 
        // But usually editing resets to PENDING.
        status = WithdrawalStatus.PENDING; 
    } else if (withdrawal.status === WithdrawalStatus.DRAFT) {
        // Should not happen here if using specific buttons, but fallback
        status = WithdrawalStatus.DRAFT;
    }
    
    onUpdateWithdrawal(createWithdrawalObject(status));
    onClose();
  };

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
    // If we have wallet info, check against balance
    if (walletInfo && typeof walletInfo.balance === 'number') {
      return totalExpenses > walletInfo.balance;
    }
    // Fallback to creditLimit (total limit) if wallet info is missing
    if (!selectedRequester || typeof selectedRequester.creditLimit !== 'number')
      return false;
    return totalExpenses > selectedRequester.creditLimit;
  }, [totalExpenses, selectedRequester, walletInfo]);

  // Update wallet info when requester changes
  useEffect(() => {
    if (requesterId) {
       UserApi.getWallet(requesterId).then(setWalletInfo).catch(() => setWalletInfo(null));
    } else {
       setWalletInfo(null);
    }
  }, [requesterId]);

  if (!withdrawal) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`แก้ไขใบเบิก ${withdrawal.code || withdrawal.id || ''}`}
        size="7xl"
        footer={
          <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>* จำเป็นต้องกรอกข้อมูลที่มีเครื่องหมายดอกจัน</span>
              {(isOverLimit || isAnyItemOverLimit) && (
                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  ⚠️ การดำเนินการนี้อาจต้องได้รับการอนุมัติเพิ่มเติม
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
              
              {/* If Draft, show "Save Draft" and "Submit" */}
              {(withdrawal.status === WithdrawalStatus.DRAFT || withdrawal.status === Status.Draft) ? (
                  <>
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
                        type="button"
                        onClick={handleSubmitForApproval}
                        className={`py-2 px-6 rounded-lg text-white font-semibold shadow-sm transition-all ${
                          isOverLimit || isAnyItemOverLimit ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/90'
                        }`}
                        title={
                          isOverLimit
                            ? 'ยอดรวมค่าใช้จ่ายเกินวงเงินที่กำหนด (ต้องรอการอนุมัติ)'
                            : isAnyItemOverLimit
                              ? 'มีรายการสินค้าที่เกินลิมิตของรถ (ต้องรอการอนุมัติ)'
                              : ''
                        }
                    >
                        {isAnyItemOverLimit || isOverLimit ? 'ส่งเพื่อขออนุมัติ' : 'บันทึกและตัดสต็อก'}
                    </Button>
                  </>
              ) : (
                  // If not Draft (Pending/Approved/etc.), show "Save Changes"
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleSaveChanges}
                    className="py-2 px-6 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
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
          className="h-full"
        >
          <div className="grid grid-cols-12 gap-6 h-full">
            {/* Left Column: Items & Logistics (Main Content) - span 8 */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
              
              {/* Logistics Header Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <TruckIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800">การเคลื่อนย้ายสินค้า</h3>
                  
                  {/* Read-only Info Badge */}
                  <div className="ml-auto flex items-center gap-3">
                     <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <span className="text-xs text-slate-500">เลขที่:</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{withdrawal.code}</span>
                     </div>
                     <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-800">
                          {withdrawal.created_at ? new Date(withdrawal.created_at).toLocaleDateString('th-TH') : '-'}
                        </span>
                     </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                      เบิกจากคลัง (ต้นทาง) <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      required
                      value={fromWarehouseId}
                      onChange={setFromWarehouseId}
                      placeholder="เลือกคลังสินค้า"
                      options={sourceWarehouseOptions}
                      className="w-full bg-white"
                    />
                  </div>
                  
                  <div className="flex items-center justify-center pt-6 text-slate-300">
                    <ArrowRightIcon className="w-5 h-5 hidden md:block" />
                    <ArrowRightIcon className="w-5 h-5 rotate-90 md:hidden" />
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
                      className="w-full bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Items List Card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-grow flex flex-col min-h-[400px]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                      <DocumentCheckIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">รายการสินค้า</h3>
                      <p className="text-xs text-slate-500">สินค้าที่ต้องการเบิกออกจากคลัง</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setIsProductModalOpen(true)}
                    variant="outline"
                    className="text-primary border-primary hover:bg-primary/5 active:bg-primary/10 transition-colors text-sm"
                    disabled={!fromWarehouseId}
                    title={!fromWarehouseId ? 'กรุณาเลือกคลังต้นทางก่อน' : ''}
                  >
                    <PlusIcon className="w-4 h-4 mr-1.5" />
                    เพิ่มสินค้า
                  </Button>
                </div>

                <div className="flex-grow overflow-y-auto bg-slate-50/30 p-4">
                  {goodsItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                      <div className="bg-slate-50 p-6 rounded-full mb-4 border border-dashed border-slate-200">
                        <TruckIcon className="w-10 h-10 text-slate-300" />
                      </div>
                      <p className="font-medium text-slate-600">ยังไม่มีรายการสินค้า</p>
                      <p className="text-sm mt-1 text-slate-400">กดปุ่ม "เพิ่มสินค้า" เพื่อเลือกจากคลัง</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-6">รายละเอียดสินค้า</div>
                        <div className="col-span-3 text-right">จำนวน</div>
                        <div className="col-span-3 text-center">จัดการ</div>
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
                            className={`p-4 rounded-xl border transition-all shadow-sm ${
                              isItemOverLimit 
                                ? 'bg-red-50 border-red-200' 
                                : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'
                            }`}
                          >
                            <div className="grid grid-cols-12 gap-4 items-center">
                              <div className="col-span-6">
                                <div className="font-semibold text-slate-900 text-sm">
                                  {product?.name || 'Unknown Product'}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                    Code: {product?.id}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                    Stock: {available} {product?.unit?.name || '-'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="col-span-3 flex flex-col items-end gap-1">
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
                                  className={`w-24 text-right transition-all h-9 text-sm font-semibold ${
                                    item.quantity > available 
                                      ? 'border-red-300 text-red-600 focus:border-red-500 focus:ring-red-200' 
                                      : isItemOverLimit
                                        ? 'border-orange-300 text-orange-600 focus:border-orange-500 focus:ring-orange-200 bg-orange-50'
                                        : 'border-slate-200'
                                  }`}
                                />
                                {(item.quantity > available || isItemOverLimit) && (
                                  <span className={`text-[10px] font-medium ${item.quantity > available ? 'text-red-600' : 'text-orange-600'}`}>
                                    {item.quantity > available ? 'เกินสต็อก' : `เกินลิมิตรถ (${limit})`}
                                  </span>
                                )}
                              </div>
                              
                              <div className="col-span-3 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGoodsItem(item.id)}
                                  className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
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
            </div>

            {/* Right Column: Context & Finance - span 4 */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              
              {/* People Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  ผู้เกี่ยวข้อง
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">
                      ผู้เบิก (Requester) <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      value={requesterId}
                      onChange={setRequesterId}
                      onSearchChange={handleUserSearch}
                      options={userOptions}
                      placeholder="ค้นหาชื่อผู้เบิก"
                      required={expenseItems.length > 0}
                      className="w-full"
                    />
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
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Finance Card (Wallet & Expenses) */}
              <div className={`p-5 rounded-xl border shadow-sm transition-all ${
                isOverLimit 
                  ? 'bg-red-50/50 border-red-200 ring-1 ring-red-100' 
                  : 'bg-white border-slate-200'
              }`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                    <span className="bg-emerald-100 text-emerald-700 p-0.5 rounded text-[10px] px-1.5 border border-emerald-200">฿</span>
                    การเงิน & ค่าใช้จ่าย
                  </h3>
                  <Button
                    type="button"
                    onClick={handleAddExpense}
                    variant="ghost"
                    className="text-xs text-primary hover:text-primary/80 hover:bg-primary/5 px-2 py-1 h-auto"
                  >
                    + เพิ่มรายการ
                  </Button>
                </div>

                {/* Wallet Status Widget */}
                {walletInfo && (
                  <div className="mb-5 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-slate-500">สถานะวงเงิน</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isOverLimit ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isOverLimit ? 'เกินวงเงิน' : 'ปกติ'}
                      </span>
                    </div>
                    
                    <div className="flex items-end justify-between mb-1">
                      <span className="text-xs text-slate-400">คงเหลือสุทธิ</span>
                      <span className={`text-lg font-bold ${
                        (walletInfo.balance - totalExpenses) < 0 ? 'text-red-600' : 'text-slate-800'
                      }`}>
                        {(walletInfo.balance - totalExpenses).toLocaleString()} <span className="text-xs font-normal text-slate-400">บาท</span>
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                      <div 
                        style={{ width: `${walletInfo.expense_limit > 0 ? Math.min(100, (((walletInfo.expense_limit - walletInfo.balance) + totalExpenses) / walletInfo.expense_limit) * 100) : 100}%` }}
                        className={`h-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`}
                      />
                    </div>
                    
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>ใช้ไป: {((walletInfo.expense_limit - walletInfo.balance) + totalExpenses).toLocaleString()}</span>
                      <span>วงเงิน: {walletInfo.expense_limit.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Expense Items List */}
                <div className="space-y-2">
                  {expenseItems.map((item) => (
                    <div key={item.id} className="flex gap-2 items-start bg-white p-2 rounded border border-slate-200">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleExpenseItemChange(item.id, 'description', e.target.value)}
                        placeholder="รายละเอียด"
                        className="flex-grow min-w-0 border-0 border-b border-slate-200 focus:border-primary focus:ring-0 text-xs px-0 py-1"
                      />
                      <input
                        type="number"
                        min="0"
                        value={item.amount}
                        onChange={(e) => handleExpenseItemChange(item.id, 'amount', e.target.value)}
                        placeholder="บาท"
                        className="w-20 border-0 border-b border-slate-200 focus:border-primary focus:ring-0 text-xs text-right px-0 py-1 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExpenseItem(item.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {expenseItems.length === 0 && (
                    <div className="text-center py-4 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs">
                      ไม่มีรายการค่าใช้จ่ายเพิ่มเติม
                    </div>
                  )}

                  {expenseItems.length > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                      <span className="text-xs font-semibold text-slate-600">รวมค่าใช้จ่าย</span>
                      <span className="text-sm font-bold text-slate-800">{totalExpenses.toLocaleString()} บาท</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reference Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-grow">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <DocumentCheckIcon className="w-4 h-4 text-slate-400" />
                  ข้อมูลอ้างอิง
                </h3>
                
                <div className="space-y-4">
                  {/* Customer */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-slate-500">ลูกค้า</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomerSelectionModalOpen(true)}
                        className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider"
                      >
                        + เลือกลูกค้า
                      </button>
                    </div>
                    {selectedCustomers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md border border-slate-200"
                          >
                            <span className="truncate max-w-[150px]">{customer.first_name} {customer.last_name}</span>
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
                      <div className="text-xs text-slate-400 italic">ยังไม่ได้ระบุลูกค้า</div>
                    )}
                  </div>

                  {/* Reference Doc */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      เอกสารอ้างอิง
                    </label>
                    <div className="flex gap-2 mb-2">
                      <select
                        className="w-1/3 border border-slate-300 rounded-lg p-1.5 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        value={referenceType}
                        onChange={(e) => setReferenceType(e.target.value as any)}
                      >
                        <option value="JOB">ใบงาน (Job)</option>
                      </select>
                      <div className="w-2/3">
                         {referenceType === 'JOB' && (
                          <SearchableSelect
                            value={referenceIds[0] || ''}
                            onChange={(value) => setReferenceIds(value ? [value] : [])}
                            options={(fetchedJobs.length > 0 ? fetchedJobs : jobs).map(j => {
                              const c = (j as any).customer;
                              const customerName = c
                                ? `${c.first_name || ''} ${c.last_name || ''}`.trim()
                                : (j as any).customer_name || 'Unknown';
                              const jobDate = (j as any).start_date || (j as any).created_at;
                              const dateStr = jobDate ? new Date(jobDate).toLocaleDateString('th-TH') : '-';
                              return {
                                value: j.id,
                                label: `${customerName} (${dateStr})`
                              };
                            })}
                            placeholder="เลือกใบงาน..."
                            className="text-xs"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      หมายเหตุ
                    </label>
                    <textarea
                      name="remarks"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none bg-slate-50"
                      placeholder="ระบุหมายเหตุเพิ่มเติม..."
                    />
                  </div>
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