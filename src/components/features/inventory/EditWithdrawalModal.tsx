import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Button } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { PlusIcon, TrashIcon, XCircleIcon } from '../../../assets/icons/Icons';
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
import { WarehouseType as InventoryWarehouseType } from '@/src/types/enums/inventory';
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

    const sourceWarehouse = useMemo(
        () => warehouses.find((w) => w.id === fromWarehouseId),
        [fromWarehouseId, warehouses]
    );

    const productsInWarehouse = useMemo(() => {
        if (!sourceWarehouse) return [];
        const whId = sourceWarehouse.id;
        return products.filter(
            (p) => {
                const qty = stockMap.get(whId)?.get(p.id);
                return (qty || 0) > 0;
            }
        );
    }, [sourceWarehouse, products, stockMap]);

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

    // Fetch warehouses on modal open
    const fetchWarehouses = useCallback(async () => {
        try {
            const res = await WarehouseApi.getWarehouses();
            if (res && res.data) {
                const allWarehouses = res.data;
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
                        amount: exp.amount,
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

    const createWithdrawalObject = (status: Status): WithdrawalType => {
        return {
            id: withdrawal!.id,
            warehouse_id: fromWarehouseId,
            to_warehouse_id: toWarehouseId || undefined,
            reference_ids: referenceType === 'JOB' ? referenceIds : undefined,
            assessment_id: referenceType === 'ASSESSMENT' ? selectedAssessmentId : undefined,
            contract_id: referenceType === 'CONTRACT' ? selectedContractId : undefined,
            status: status,
            created_by: withdrawal!.created_by,

            items: goodsItems.map((item) => ({
                product_id: item.productId,
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
        onUpdateWithdrawal(createWithdrawalObject(withdrawal.status as Status));
        onClose();
    };

    const handleSaveAndSubmit = () => {
        if (!withdrawal) return;
        onUpdateWithdrawal(createWithdrawalObject(Status.PendingApproval));
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

    if (!withdrawal) return null;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={`แก้ไขใบเบิก ${withdrawal.id || ''}`}
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
                            variant="primary"
                            type="submit"
                            form="edit-goods-withdrawal-form"
                            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
                            disabled={isOverLimit}
                            title={isOverLimit ? 'ยอดรวมค่าใช้จ่ายเกินวงเงินที่กำหนด' : ''}
                        >
                            บันทึกการแก้ไข
                        </Button>
                        {withdrawal.status === Status.Draft && (
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={handleSaveAndSubmit}
                                className="py-2 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold"
                            >
                                ส่งเพื่ออนุมัติ
                            </Button>
                        )}
                    </div>
                }
            >
                <form
                    ref={goodsFormRef}
                    id="edit-goods-withdrawal-form"
                    onSubmit={handleSubmit}
                    className="space-y-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField label="เลขที่ใบเบิก" htmlFor="withdrawal-id">
                            <Input
                                id="withdrawal-id"
                                type="text"
                                value={withdrawal.id}
                                readOnly
                                className="bg-slate-100"
                            />
                        </FormField>
                        <FormField label="วันที่สร้าง" htmlFor="withdrawal-date">
                            <Input
                                id="withdrawal-date"
                                type="text"
                                value={withdrawal.created_at ? new Date(withdrawal.created_at).toLocaleDateString('th-TH') : '-'}
                                readOnly
                                className="bg-slate-100"
                            />
                        </FormField>
                        <FormField label="ผู้สร้าง" htmlFor="createdBy">
                            <Input
                                id="createdBy"
                                type="text"
                                value={withdrawal.created_by}
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
                                        {customer.first_name} {customer.last_name}
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
                                <SearchableSelect
                                    value={requesterId}
                                    onChange={setRequesterId}
                                    onSearchChange={handleUserSearch}
                                    options={userOptions}
                                    placeholder="-- ค้นหาผู้เบิก --"
                                    required={expenseItems.length > 0}
                                />
                            </FormField>
                        </div>
                        <div className="md:col-span-1">
                            <FormField label="ผู้รับเงิน" htmlFor="recipient-id">
                                <SearchableSelect
                                    value={recipientId}
                                    onChange={setRecipientId}
                                    onSearchChange={handleUserSearch}
                                    options={userOptions}
                                    placeholder="-- ค้นหาผู้รับเงิน --"
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
                                options={sourceWarehouseOptions}
                            />
                        </FormField>
                        <FormField label="ไปยังคลัง (รถ)" htmlFor="to-warehouse">
                            <SearchableSelect
                                value={toWarehouseId}
                                onChange={setToWarehouseId}
                                placeholder="-- เลือกคลังปลายทาง --"
                                options={vehicleWarehouseOptions}
                            />
                        </FormField>
                    </div>

                    <FormField label="อ้างอิง (Reference)">
                        <div className="space-y-3">
                            <select
                                className="w-full border border-slate-300 rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                value={referenceType}
                                onChange={(e) => setReferenceType(e.target.value as any)}
                            >
                                <option value="JOB">ใบงาน (Job)</option>
                                <option value="ASSESSMENT">ใบประเมิน (Assessment)</option>
                                <option value="CONTRACT">สัญญา (Contract)</option>
                            </select>

                            {referenceType === 'JOB' && (
                                <SearchableSelect
                                    value={referenceIds[0] || ''}
                                    onChange={(value) => setReferenceIds(value ? [value] : [])}
                                    options={jobs.map(j => ({
                                        value: j.id,
                                        label: `${j.id} - ${(j as any).customer_name || (j as any).customerName || j.customer?.first_name || ''}`
                                    }))}
                                    placeholder="-- เลือกใบงาน --"
                                />
                            )}

                            {referenceType === 'ASSESSMENT' && (
                                <SearchableSelect
                                    value={selectedAssessmentId}
                                    onChange={setSelectedAssessmentId}
                                    options={assessments.map(a => ({ value: a.id, label: `${a.code} - ${a.customer ? (a.customer.first_name + ' ' + a.customer.last_name) : 'Unknown Customer'}` }))}
                                    placeholder="-- เลือกใบประเมิน --"
                                />
                            )}

                            {referenceType === 'CONTRACT' && (
                                <SearchableSelect
                                    value={selectedContractId}
                                    onChange={setSelectedContractId}
                                    options={contracts.map(c => ({ value: c.id, label: `${c.code} - ${c.customer_name}` }))}
                                    placeholder="-- เลือกสัญญา --"
                                />
                            )}
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
                                        ? stockMap.get(sourceWarehouse.id)?.get(item.productId) || 0
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
                                                    {product?.unit?.name || '-'}
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
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
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
