import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Select, Button, Textarea } from '../../common/FormControls';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';
import { ProductSelectionModal } from '../products/ProductSelectionModal';
import {
    Requisition as RequisitionType,
    RequisitionType as ReqTypeEnum,
    CreateRequisitionDto
} from '@/src/types/entity/requisition.interface';
import { Warehouse } from '@/src/types/entity/inventory.interface';
import { Product } from '@/src/types/entity/product.interface';
import { useData } from '../../../contexts/DataContext';

interface AddRequisitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    // onCreateRequisition: (data: CreateRequisitionDto) => void; 
}

interface RequisitionItemLocal {
    id: number;
    productId: string;
    quantity: number;
    remark?: string;
}

interface RequisitionExpenseLocal {
    id: number;
    description: string;
    amount: number;
}

export const AddRequisitionModal: React.FC<AddRequisitionModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { handlers: { requisitions: { create } }, warehouses, products } = useData();

    const [type, setType] = useState<ReqTypeEnum>(ReqTypeEnum.ITEM);
    const [requestDate, setRequestDate] = useState(new Date().toISOString().substring(0, 10));
    const [warehouseId, setWarehouseId] = useState('');
    const [vehicleId, setVehicleId] = useState('');
    const [description, setDescription] = useState('');

    const [items, setItems] = useState<RequisitionItemLocal[]>([]);
    const [expenses, setExpenses] = useState<RequisitionExpenseLocal[]>([]);

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);

    const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    // Filter warehouses by type
    const mainWarehouses = useMemo(() =>
        warehouses.filter(w => w.type === 'MAIN' || w.type === 'SUB'),
        [warehouses]
    );
    const vehicleWarehouses = useMemo(() =>
        warehouses.filter(w => w.type === 'VEHICLE'),
        [warehouses]
    );

    // Reset form on open
    useEffect(() => {
        if (isOpen) {
            setItems([]);
            setExpenses([]);
            setType(ReqTypeEnum.ITEM)
            setWarehouseId('');
            setVehicleId('');
            setDescription('');
            setRequestDate(new Date().toISOString().substring(0, 10));
        }
    }, [isOpen]);

    const handleAddProducts = (productIds: string[]) => {
        const newItems: RequisitionItemLocal[] = productIds.map(pid => ({
            id: Date.now() + Math.random(),
            productId: pid,
            quantity: 1,
            remark: ''
        }));
        setItems(prev => [...prev, ...newItems]);
    };

    const handleRemoveItem = (id: number) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleAddExpense = () => {
        setExpenses([...expenses, { id: Date.now(), description: '', amount: 0 }]);
    };

    const handleRemoveExpense = (id: number) => {
        setExpenses(expenses.filter(e => e.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: CreateRequisitionDto = {
                type,
                request_date: requestDate,
                warehouse_id: type === ReqTypeEnum.ITEM ? warehouseId : undefined,
                vehicle_id: type === ReqTypeEnum.ITEM && vehicleId ? vehicleId : undefined,
                description,
                items: type === ReqTypeEnum.ITEM ? items.map(i => ({
                    product_id: i.productId,
                    quantity: i.quantity,
                    remark: i.remark
                })) : undefined,
                expenses: type === ReqTypeEnum.EXPENSE ? expenses.map(e => ({
                    description: e.description,
                    amount: e.amount
                })) : undefined
            };

            await create(payload);
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to create requisition');
        }
    };

    const existingProductIds = useMemo(() => items.map(i => i.productId), [items]);

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="สร้างใบเบิกสินค้า (Create Requisition)"
                size="4xl"
                footer={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
                        <Button variant="primary" onClick={handleSubmit}>บันทึก</Button>
                    </div>
                }
            >
                <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="ประเภท (Type)">
                            <Select value={type} onChange={(e) => setType(e.target.value as ReqTypeEnum)}>
                                <option value={ReqTypeEnum.ITEM}>เบิกสินค้า (Item)</option>
                                <option value={ReqTypeEnum.EXPENSE}>เบิกค่าใช้จ่าย (Expense)</option>
                            </Select>
                        </FormField>
                        <FormField label="วันที่เบิก (Date)">
                            <Input type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} required />
                        </FormField>
                    </div>

                    {type === ReqTypeEnum.ITEM && (
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="คลังสินค้าหลัก (Source Warehouse)">
                                <Select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required>
                                    <option value="">-- เลือกคลังต้นทาง --</option>
                                    {mainWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </Select>
                            </FormField>
                            <FormField label="เลขทะเบียนรถ (Vehicle - optional)">
                                <Select value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
                                    <option value="">-- ไม่ระบุ --</option>
                                    {vehicleWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </Select>
                            </FormField>
                        </div>
                    )}

                    <FormField label="รายละเอียดเพิ่มเติม">
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                    </FormField>

                    <hr />

                    {type === ReqTypeEnum.ITEM ? (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold">รายการสินค้า</h4>
                                <Button variant="primary" type="button" onClick={() => setIsProductModalOpen(true)} className="text-sm py-1 px-3">
                                    <PlusIcon className="w-4 h-4 mr-1" /> เพิ่มสินค้า
                                </Button>
                            </div>
                            <table className="w-full text-sm border">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-2 border">สินค้า</th>
                                        <th className="p-2 border w-24">จำนวน</th>
                                        <th className="p-2 border">หมายเหตุ</th>
                                        <th className="p-2 border w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(item => {
                                        const product = productMap.get(item.productId);
                                        return (
                                            <tr key={item.id}>
                                                <td className="p-2 border">{product?.name || item.productId}</td>
                                                <td className="p-2 border">
                                                    <Input type="number" min={1} value={item.quantity}
                                                        onChange={e => {
                                                            const val = parseFloat(e.target.value);
                                                            setItems(items.map(i => i.id === item.id ? { ...i, quantity: val } : i));
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2 border">
                                                    <Input value={item.remark} onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, remark: e.target.value } : i))} />
                                                </td>
                                                <td className="p-2 border text-center">
                                                    <Button variant="ghost" type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold">รายการค่าใช้จ่าย</h4>
                                <Button variant="primary" type="button" onClick={handleAddExpense} className="text-sm py-1 px-3">
                                    <PlusIcon className="w-4 h-4 mr-1" /> เพิ่มรายดาร
                                </Button>
                            </div>
                            <table className="w-full text-sm border">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-2 border">รายละเอียด</th>
                                        <th className="p-2 border w-32">จำนวนเงิน</th>
                                        <th className="p-2 border w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map(exp => (
                                        <tr key={exp.id}>
                                            <td className="p-2 border">
                                                <Input value={exp.description} onChange={e => setExpenses(expenses.map(ex => ex.id === exp.id ? { ...ex, description: e.target.value } : ex))} placeholder="ค่า..." />
                                            </td>
                                            <td className="p-2 border">
                                                <Input type="number" value={exp.amount} onChange={e => setExpenses(expenses.map(ex => ex.id === exp.id ? { ...ex, amount: parseFloat(e.target.value) } : ex))} />
                                            </td>
                                            <td className="p-2 border text-center">
                                                <Button variant="ghost" type="button" onClick={() => handleRemoveExpense(exp.id)} className="text-red-500 hover:text-red-700 p-1">
                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                </form>
            </Modal>

            <ProductSelectionModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onAddProducts={handleAddProducts}
                existingProductIds={existingProductIds}
                products={products} // Should filter by available if strict
            />
        </>
    );
}
