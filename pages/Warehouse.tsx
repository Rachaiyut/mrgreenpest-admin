import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card } from '../components/Card';
import { PlusIcon } from '../icons/PlusIcon';
import { ManageIcon } from '../icons/ManageIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { LimitIcon } from '../icons/LimitIcon';
import { Button } from '../components/FormControls';
import { AddWarehouseModal } from '../components/AddWarehouseModal';
import { WarehouseDetailsModal } from '../components/WarehouseDetailsModal';
import { Warehouse as WarehouseType, Product, Status } from '../types';
import { Pagination } from '../components/Pagination';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { EditWarehouseModal } from '../components/EditWarehouseModal';

// FIX: Define props interface
interface WarehouseProps {
    warehouses: WarehouseType[];
    products: Product[];
    onCreateWarehouse: (data: Omit<WarehouseType, 'id'>) => void;
    onUpdateWarehouse: (warehouse: WarehouseType) => void;
    onDeleteWarehouse: (id: string) => void;
    onUpdateWarehouseLimits: (warehouseId: string, limits: { [productId: string]: number }) => void;
    stockMap?: Record<string, Record<string, number>>;
}

const Warehouse: React.FC<WarehouseProps> = ({ warehouses, products, onCreateWarehouse, onUpdateWarehouse, onDeleteWarehouse, onUpdateWarehouseLimits, stockMap = {} }) => {
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [warehouseToActivate, setWarehouseToActivate] = useState<WarehouseType | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [warehouseToEdit, setWarehouseToEdit] = useState<WarehouseType | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [warehouseToDelete, setWarehouseToDelete] = useState<WarehouseType | null>(null);
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [warehouseForLimits, setWarehouseForLimits] = useState<WarehouseType | null>(null);

    const reversedWarehouses = useMemo(() => [...warehouses].reverse(), [warehouses]);
    const totalItems = reversedWarehouses.length;
    const paginatedWarehouses = reversedWarehouses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleItemsPerPageChange = (size: number) => {
        setItemsPerPage(size);
        setCurrentPage(1);
    };

    const handleDropdownToggle = (event: React.MouseEvent<HTMLButtonElement>, warehouseId: string) => {
        event.stopPropagation();
        if (openDropdownId === warehouseId) {
            setOpenDropdownId(null);
        } else {
            const buttonRect = event.currentTarget.getBoundingClientRect();
            setOpenDropdownId(warehouseId);
            setDropdownPosition({
                top: buttonRect.bottom + window.scrollY,
                left: buttonRect.right + window.scrollX,
            });
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!openDropdownId) return;
            if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
                return;
            }
            if ((event.target as HTMLElement).closest('button[data-warehouse-id]')) {
                return;
            }
            setOpenDropdownId(null);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openDropdownId]);

    const handleViewDetails = (warehouse: WarehouseType) => {
        setSelectedWarehouse(warehouse);
        setIsDetailsModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleEdit = (warehouse: WarehouseType) => {
        setWarehouseToEdit(warehouse);
        setIsEditModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleDelete = (warehouse: WarehouseType) => {
        setWarehouseToDelete(warehouse);
        setIsDeleteModalOpen(true);
        setOpenDropdownId(null);
    };
    
    const handleSetLimits = (warehouse: WarehouseType) => {
        setWarehouseForLimits(warehouse);
        setIsLimitModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleConfirmDelete = () => {
        if (warehouseToDelete) {
            onDeleteWarehouse(warehouseToDelete.id);
        }
        setIsDeleteModalOpen(false);
        setWarehouseToDelete(null);
    };
    
    const handleToggleChange = (warehouse: WarehouseType) => {
        // Only trigger confirmation if we are activating an inactive warehouse
        if (warehouse.status !== Status.Approved) {
            setWarehouseToActivate(warehouse);
            setIsConfirmModalOpen(true);
        }
    };

    const handleConfirmActivate = () => {
        if (!warehouseToActivate) return;

        // Find and deactivate the current primary warehouse
        const currentActive = warehouses.find(w => w.type === 'คลัง' && w.status === Status.Approved);
        if (currentActive && currentActive.id !== warehouseToActivate.id) {
            onUpdateWarehouse({ ...currentActive, status: Status.Rejected });
        }

        // Activate the new one
        onUpdateWarehouse({ ...warehouseToActivate, status: Status.Approved });

        // Close modal and reset state
        setIsConfirmModalOpen(false);
        setWarehouseToActivate(null);
    };

    const actions = [
        { label: 'ดูรายละเอียด', icon: EyeIcon },
        { label: 'แก้ไข', icon: PencilIcon },
        { label: 'จำกัดการเบิก', icon: LimitIcon },
        { label: 'ลบ', icon: TrashIcon, isDanger: true },
    ];


    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
                <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">คลังสินค้า</h1>
                        <p className="mt-1 text-slate-600">จัดการคลังสินค้าและรถบริการ</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button onClick={() => setIsAddModalOpen(true)}>
                            <PlusIcon className="h-5 w-5" />
                            สร้างคลังสินค้า
                        </Button>
                    </div>
                </div>

                <Card className="!p-0 flex-grow min-h-0 flex flex-col">
                    <div className="overflow-auto flex-grow">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">ลำดับ</th>
                                    <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">รหัส</th>
                                    <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">ชื่อคลัง/รถ</th>
                                    <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">ประเภท</th>
                                    <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">ที่ตั้ง/ทะเบียน</th>
                                    <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">สถานะคลังหลัก</th>
                                    <th scope="col" className="relative px-4 py-2.5">
                                        <span className="sr-only">จัดการ</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {paginatedWarehouses.map((warehouse, index) => (
                                    <tr key={warehouse.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{warehouse.id}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{warehouse.name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{warehouse.type}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{warehouse.type === 'รถ' ? warehouse.licensePlate : warehouse.location}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                                            {warehouse.type === 'คลัง' && (
                                                <label htmlFor={`toggle-${warehouse.id}`} className="flex items-center cursor-pointer">
                                                    <div className="relative">
                                                        <input
                                                            id={`toggle-${warehouse.id}`}
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={warehouse.status === Status.Approved}
                                                            onChange={() => handleToggleChange(warehouse)}
                                                            disabled={warehouse.status === Status.Approved}
                                                        />
                                                        <div className={`block w-14 h-8 rounded-full ${warehouse.status === Status.Approved ? 'bg-primary' : 'bg-slate-300'}`}></div>
                                                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${warehouse.status === Status.Approved ? 'transform translate-x-6' : ''}`}></div>
                                                    </div>
                                                </label>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="inline-block text-left">
                                                <Button
                                                    data-warehouse-id={warehouse.id}
                                                    onClick={(e) => handleDropdownToggle(e, warehouse.id)}
                                                    variant="icon"
                                                    title="ตัวเลือก"
                                                >
                                                    <span className="sr-only">Open options</span>
                                                    <ManageIcon className="h-5 w-5" aria-hidden="true" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex-shrink-0">
                        <Pagination 
                            currentPage={currentPage}
                            itemsPerPage={itemsPerPage}
                            totalItems={totalItems}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={handleItemsPerPageChange}
                        />
                    </div>
                </Card>
            </div>
            
            {openDropdownId && dropdownPosition && (
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'absolute',
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        transform: 'translateX(-100%)',
                    }}
                    className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div className="py-1" role="none">
                        {(() => {
                            const warehouse = warehouses.find(w => w.id === openDropdownId);
                            if (!warehouse) return null;

                            return actions.map(action => {
                                if (action.label === 'จำกัดการเบิก' && warehouse.type !== 'รถ') {
                                    return null;
                                }
                                return (
                                    <a
                                        key={action.label}
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (action.label === 'ดูรายละเอียด') {
                                                handleViewDetails(warehouse);
                                            } else if (action.label === 'แก้ไข') {
                                                handleEdit(warehouse);
                                            } else if (action.label === 'จำกัดการเบิก') {
                                                handleSetLimits(warehouse);
                                            } else if (action.label === 'ลบ') {
                                                handleDelete(warehouse);
                                            }
                                        }}
                                        className={`flex items-center w-full text-left px-4 py-2 text-sm ${action.isDanger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}
                                        role="menuitem"
                                    >
                                        <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                                        <span>{action.label}</span>
                                    </a>
                                );
                            });
                        })()}
                    </div>
                </div>
            )}
            <AddWarehouseModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onCreateWarehouse={onCreateWarehouse} />
            <EditWarehouseModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} warehouse={warehouseToEdit} onUpdateWarehouse={onUpdateWarehouse} />
            <WarehouseDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                warehouse={selectedWarehouse}
                products={products}
                stockMap={stockMap as any}
            />
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmActivate}
                title="ยืนยันการเปลี่ยนคลังหลัก"
                message={<p>คุณต้องการเปลี่ยน <strong>{warehouseToActivate?.name}</strong> เป็นคลังหลักหรือไม่? คลังหลักเดิมจะถูกปิดใช้งาน</p>}
                confirmButtonText="ยืนยัน"
            />
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="ยืนยันการลบ"
                message={<p>คุณแน่ใจหรือไม่ว่าต้องการลบคลัง <strong>{warehouseToDelete?.name}</strong>? การกระทำนี้ไม่สามารถย้อนกลับได้</p>}
                confirmButtonText="ยืนยันการลบ"
                confirmButtonClass="bg-danger hover:bg-danger/90"
            />
            <SetWithdrawalLimitModal
                isOpen={isLimitModalOpen}
                onClose={() => setIsLimitModalOpen(false)}
                warehouse={warehouseForLimits}
                onSave={onUpdateWarehouseLimits}
                products={products}
            />
        </>
    );
};
// FIX: Add default export to fix import error in App.tsx
export default Warehouse;
