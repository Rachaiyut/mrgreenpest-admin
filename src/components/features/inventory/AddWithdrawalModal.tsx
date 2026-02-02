import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Select, Button } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { PlusIcon, TrashIcon, XCircleIcon } from '../../../assets/icons/Icons';
import { ProductSelectionModal } from '../products/ProductSelectionModal';
import {
  Withdrawal as WithdrawalType,
  Status,
  User,
  Warehouse as WarehouseType,
  FieldJob,
  Customer,
  Product,
} from '@/src/types/entity/app.interface';
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
  currentUser: User;
  products: Product[];
  stockMap: Record<string, Record<string, number>>;
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
}) => {
  const [goodsItems, setGoodsItems] = useState<LineItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseLineItem[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [isCustomerSelectionModalOpen, setIsCustomerSelectionModalOpen] =
    useState(false);
  const [referenceIds, setReferenceIds] = useState<string[]>([]);
  const [createdBy, setCreatedBy] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const goodsFormRef = useRef<HTMLFormElement>(null);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const sourceWarehouse = useMemo(
    () => warehouses.find((w) => w.id === fromWarehouseId),
    [fromWarehouseId, warehouses]
  );

  const productsInWarehouse = useMemo(() => {
    if (!sourceWarehouse) return [];
    const whId = sourceWarehouse.id;
    return products.filter(
      (p) => (stockMap[whId]?.[p.id] || 0) > 0 && p.type === 'สินค้า'
    );
  }, [sourceWarehouse, products, stockMap]);

  const allUsedReferenceIds = useMemo(
    () => withdrawals.flatMap((w) => w.referenceIds || []),
    [withdrawals]
  );

  const generatedGoodsId = useMemo(() => {
    if (!isOpen) return '';

    const thaiYearLastTwoDigits = (new Date().getFullYear() + 543)
      .toString()
      .slice(-2);
    const prefix = `SR${thaiYearLastTwoDigits}`;

    const withdrawalsThisYear = withdrawals.filter((w) =>
      w.id.startsWith(prefix)
    );

    const maxId = withdrawalsThisYear.reduce((max, w) => {
      const num = parseInt(w.id.slice(4), 10);
      return num > max ? num : max;
    }, 0);

    const newIdNumber = maxId + 1;
    return `${prefix}${String(newIdNumber).padStart(4, '0')}`;
  }, [isOpen, withdrawals]);

  useEffect(() => {
    if (isOpen) {
      setGoodsItems([]);
      setExpenseItems([]);
      setFromWarehouseId('');
      setToWarehouseId('');
      setReferenceIds([]);
      setSelectedCustomerIds([]);
      setCreatedBy(currentUser.name);
      setRequesterId('');
    }
  }, [isOpen, currentUser]);

  const jobsForSelectedCustomers = useMemo(() => {
    if (selectedCustomerIds.length === 0) return [];
    const customerIdSet = new Set(selectedCustomerIds);
    return jobs.filter((job) => customerIdSet.has(job.customerId));
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
      jobs.filter((j) => j.customerId === customerId).map((j) => j.id)
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
        jobs.filter((j) => removedIds.includes(j.customerId)).map((j) => j.id)
      );
      setReferenceIds((currentRefs) =>
        currentRefs.filter((refId) => !removedCustomerJobs.has(refId))
      );
    }

    setSelectedCustomerIds(customerIds);
  };

  const createWithdrawalObject = (
    status: Status,
    formData: FormData
  ): Omit<WithdrawalType, 'id'> => {
    return {
      createdAt: formData.get('createdAt') as string,
      fromWarehouseId: fromWarehouseId,
      toWarehouseId: toWarehouseId,
      referenceIds: referenceIds,
      customerIds: selectedCustomerIds,
      status: status,
      createdBy: createdBy,
      items: goodsItems.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
      expenses: expenseItems
        .filter(
          (item) =>
            item.description &&
            item.amount !== '' &&
            !isNaN(Number(item.amount))
        )
        .map((item) => ({
          id: item.id,
          description: item.description,
          amount: Number(item.amount) || 0,
        })),
      recipientId: expenseItems.length > 0 ? requesterId : undefined,
      remarks: (formData.get('remarks') as string) || undefined,
    };
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onCreateWithdrawal(
      createWithdrawalObject(Status.PendingApproval, formData)
    );
    onClose();
  };

  const handleSaveDraft = () => {
    if (goodsFormRef.current) {
      const formData = new FormData(goodsFormRef.current);
      onCreateWithdrawal(createWithdrawalObject(Status.Draft, formData));
    }
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
    if (!selectedRequester || typeof selectedRequester.creditLimit !== 'number')
      return false;
    return totalExpenses > selectedRequester.creditLimit;
  }, [totalExpenses, selectedRequester]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="สร้างใบเบิกสินค้า/อุปกรณ์และค่าใช้จ่าย"
        size="5xl"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
            >
              ยกเลิก
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={handleSaveDraft}
              className="py-2 px-4 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold"
            >
              บันทึกฉบับร่าง
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="add-goods-withdrawal-form"
              className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
              disabled={isOverLimit}
              title={isOverLimit ? 'ยอดรวมค่าใช้จ่ายเกินวงเงินที่กำหนด' : ''}
            >
              ส่งเพื่ออนุมัติ
            </Button>
          </div>
        }
      >
        <form
          ref={goodsFormRef}
          id="add-goods-withdrawal-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="เลขที่ใบเบิก" htmlFor="withdrawal-id">
              <Input
                id="withdrawal-id"
                type="text"
                value={generatedGoodsId}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
            <FormField label="วันที่เบิก" htmlFor="withdrawal-date">
              <Input
                id="withdrawal-date"
                name="createdAt"
                type="date"
                defaultValue={new Date().toISOString().substring(0, 10)}
                required
              />
            </FormField>
            <FormField label="ผู้สร้าง (ผู้บันทึก)" htmlFor="createdBy">
              <Input
                id="createdBy"
                name="createdBy"
                type="text"
                value={createdBy}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
          </div>

          <FormField label="ลูกค้า">
            <div className="p-2 border rounded-md bg-slate-50 min-h-[5rem] flex flex-wrap gap-2 items-start">
              {selectedCustomers.length > 0 ? (
                selectedCustomers.map((customer) => (
                  <span
                    key={customer.id}
                    className="flex items-center gap-1.5 bg-slate-200 text-slate-800 text-sm font-medium px-2 py-1 rounded-md"
                  >
                    {customer.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomer(customer.id)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-slate-500 text-sm p-2">
                  ยังไม่ได้เลือกลูกค้า
                </p>
              )}
              <button
                type="button"
                onClick={() => setIsCustomerSelectionModalOpen(true)}
                className="text-sm text-primary hover:underline font-semibold p-2"
              >
                + เพิ่ม/แก้ไขลูกค้า
              </button>
            </div>
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <FormField label="ผู้เบิก" htmlFor="requester-id">
                <Select
                  id="requester-id"
                  value={requesterId}
                  onChange={(e) => setRequesterId(e.target.value)}
                  required={expenseItems.length > 0}
                >
                  <option value="">-- เลือกผู้เบิก --</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <div className="md:col-span-1">
              <FormField label="ผู้รับเงิน" htmlFor="recipient-display">
                <Input
                  id="recipient-display"
                  type="text"
                  value={selectedRequester?.name || ''}
                  readOnly
                  className="bg-slate-100"
                />
              </FormField>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="เบิกจากคลัง" htmlFor="from-warehouse">
              <SearchableSelect
                required
                value={fromWarehouseId}
                onChange={setFromWarehouseId}
                placeholder="-- เลือกคลังต้นทาง --"
                options={warehouses
                  .filter((w) => w.type === 'คลัง')
                  .map((w) => ({
                    value: w.id,
                    label: w.name,
                  }))}
              />
            </FormField>
            <FormField label="ไปยังคลัง (รถ)" htmlFor="to-warehouse">
              <SearchableSelect
                value={toWarehouseId}
                onChange={setToWarehouseId}
                placeholder="-- เลือกคลังปลายทาง --"
                options={warehouses
                  .filter((w) => w.type === 'รถ')
                  .map((w) => ({
                    value: w.id,
                    label: w.name,
                  }))}
              />
            </FormField>
          </div>

          <FormField label="อ้างอิงใบงาน/สัญญา">
            <div className="p-2 border rounded-md bg-slate-50 min-h-[5rem] flex flex-wrap gap-2 items-start">
              {referenceIds.length > 0 ? (
                referenceIds.map((refId) => {
                  const job = jobs.find((j) => j.id === refId);
                  return (
                    <span
                      key={refId}
                      className="flex items-center gap-1.5 bg-slate-200 text-slate-800 text-sm font-medium px-2 py-1 rounded-md"
                    >
                      {job ? `ใบงาน: ${job.customerName}` : `อ้างอิง: ${refId}`}
                      <button
                        type="button"
                        onClick={() =>
                          setReferenceIds((prev) =>
                            prev.filter((id) => id !== refId)
                          )
                        }
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                    </span>
                  );
                })
              ) : (
                <p className="text-slate-500 text-sm p-2">ไม่มีการอ้างอิง</p>
              )}
              <button
                type="button"
                onClick={() => setIsReferenceModalOpen(true)}
                className="text-sm text-primary hover:underline font-semibold p-2"
                disabled={selectedCustomerIds.length === 0}
                title={
                  selectedCustomerIds.length === 0 ? 'กรุณาเลือกลูกค้าก่อน' : ''
                }
              >
                + เพิ่มอ้างอิง
              </button>
            </div>
          </FormField>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-slate-900">
                รายการสินค้า/อุปกรณ์
              </h3>
              <Button
                type="button"
                onClick={() => setIsProductModalOpen(true)}
                variant="outline"
                className="text-primary border-primary hover:bg-primary/10"
                disabled={!fromWarehouseId}
                title={!fromWarehouseId ? 'กรุณาเลือกคลังต้นทางก่อน' : ''}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                เพิ่มสินค้า
              </Button>
            </div>
            {goodsItems.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed rounded-lg text-slate-500">
                ยังไม่มีรายการสินค้า
              </div>
            ) : (
              <div className="space-y-2">
                {goodsItems.map((item, index) => {
                  const product = productMap.get(item.productId);
                  const available = sourceWarehouse
                    ? stockMap[sourceWarehouse.id]?.[item.productId] || 0
                    : 0;
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg bg-white shadow-sm"
                    >
                      <div className="col-span-6 md:col-span-7">
                        <div className="font-medium text-slate-900">
                          {product?.name || 'Unknown Product'}
                        </div>
                        <div className="text-xs text-slate-500">
                          รหัส: {product?.id} | คงเหลือ: {available}{' '}
                          {product?.unit}
                        </div>
                      </div>
                      <div className="col-span-4 md:col-span-4">
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
                          placeholder="จำนวน"
                          className="w-full text-right"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveGoodsItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
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

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-slate-900">
                ค่าใช้จ่ายอื่นๆ
              </h3>
              <Button
                type="button"
                onClick={handleAddExpense}
                variant="outline"
                className="text-primary border-primary hover:bg-primary/10"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                เพิ่มค่าใช้จ่าย
              </Button>
            </div>
            {expenseItems.length === 0 ? (
              <div className="p-4 text-center border border-slate-200 rounded-lg text-slate-500 text-sm">
                ไม่มีค่าใช้จ่ายเพิ่มเติม
              </div>
            ) : (
              <div className="space-y-2">
                {expenseItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg bg-white shadow-sm"
                  >
                    <div className="col-span-6 md:col-span-7">
                      <Input
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
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-4">
                      <Input
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
                        className="w-full text-right"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveExpenseItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2 text-slate-700 font-medium">
                  รวมเป็นเงิน: {totalExpenses.toLocaleString()} บาท
                  {selectedRequester &&
                    typeof selectedRequester.creditLimit === 'number' && (
                      <span
                        className={`ml-2 text-sm ${isOverLimit ? 'text-red-600' : 'text-green-600'}`}
                      >
                        (วงเงิน:{' '}
                        {selectedRequester.creditLimit.toLocaleString()} บาท)
                      </span>
                    )}
                </div>
              </div>
            )}
          </div>

          <FormField label="หมายเหตุ" htmlFor="remarks">
            <Input
              id="remarks"
              name="remarks"
              type="text"
              placeholder="ระบุหมายเหตุ (ถ้ามี)"
            />
          </FormField>
        </form>
      </Modal>

      <ProductSelectionModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onAddProducts={handleAddProducts}
        products={productsInWarehouse}
        existingProductIds={existingProductIds}
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

