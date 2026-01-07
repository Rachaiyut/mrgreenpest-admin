import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import {
  PlusIcon,
  ManageIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  LimitIcon,
  NewWarehouseIcon,
  SearchIcon,
  FilterIcon,
} from '../../assets/icons/Icons';
import { Button, Input, Select } from '../../components/common/FormControls';
import { AddWarehouseModal } from '../../components/features/warehouses/AddWarehouseModal';
import { WarehouseDetailsModal } from '../../components/features/warehouses/WarehouseDetailsModal';
import { Warehouse as WarehouseType, Product, Status } from '../../types';
import { Pagination } from '../../components/common/Pagination';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { EditWarehouseModal } from '../../components/features/warehouses/EditWarehouseModal';
import { SetWithdrawalLimitModal } from '../../components/features/warehouses/SetWithdrawalLimitModal';
import { StatusBadge } from '../../components/common/StatusBadge';

interface WarehouseProps {
  warehouses: WarehouseType[];
  products: Product[];
  onCreateWarehouse: (data: Omit<WarehouseType, 'id'>) => void;
  onUpdateWarehouse: (warehouse: WarehouseType) => void;
  onDeleteWarehouse: (id: string) => void;
  onUpdateWarehouseLimits: (
    warehouseId: string,
    limits: { [productId: string]: number }
  ) => void;
  stockMap?: Record<string, Record<string, number>>;
}

const Warehouse: React.FC<WarehouseProps> = ({
  warehouses,
  products,
  onCreateWarehouse,
  onUpdateWarehouse,
  onDeleteWarehouse,
  onUpdateWarehouseLimits,
  stockMap = {},
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'all' | 'warehouse' | 'vehicle'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  // Selected Items
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<WarehouseType | null>(null);
  const [warehouseToEdit, setWarehouseToEdit] = useState<WarehouseType | null>(
    null
  );
  const [warehouseToDelete, setWarehouseToDelete] =
    useState<WarehouseType | null>(null);
  const [warehouseToActivate, setWarehouseToActivate] =
    useState<WarehouseType | null>(null);
  const [warehouseForLimits, setWarehouseForLimits] =
    useState<WarehouseType | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter Logic
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((w) => {
      // Tab Filter
      if (activeTab === 'warehouse' && w.type !== 'คลัง') return false;
      if (activeTab === 'vehicle' && w.type !== 'รถ') return false;

      // Search Filter
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        w.name.toLowerCase().includes(query) ||
        w.location.toLowerCase().includes(query) ||
        (w.licensePlate && w.licensePlate.toLowerCase().includes(query)) ||
        w.id.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Status Filter (Mocking logic based on Status enum)
      // Assuming Status.Approved is 'Active' equivalent for this context
      if (statusFilter === 'active' && w.status !== Status.Approved)
        return false;
      if (statusFilter === 'inactive' && w.status === Status.Approved)
        return false;

      return true;
    });
  }, [warehouses, activeTab, searchQuery, statusFilter]);

  const paginatedWarehouses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWarehouses.slice(start, start + itemsPerPage);
  }, [filteredWarehouses, currentPage, itemsPerPage]);

  // Statistics
  const stats = useMemo(() => {
    const total = warehouses.length;
    const fixed = warehouses.filter((w) => w.type === 'คลัง').length;
    const mobile = warehouses.filter((w) => w.type === 'รถ').length;
    const active = warehouses.filter(
      (w) => w.status === Status.Approved
    ).length;
    return { total, fixed, mobile, active };
  }, [warehouses]);

  // Handlers
  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    warehouseId: string
  ) => {
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
      if (
        dropdownRef.current &&
        dropdownRef.current.contains(event.target as Node)
      )
        return;
      if ((event.target as HTMLElement).closest('button[data-warehouse-id]'))
        return;
      setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    if (warehouseToDelete) onDeleteWarehouse(warehouseToDelete.id);
    setIsDeleteModalOpen(false);
    setWarehouseToDelete(null);
  };

  const handleToggleChange = (warehouse: WarehouseType) => {
    if (warehouse.status !== Status.Approved) {
      setWarehouseToActivate(warehouse);
      setIsConfirmModalOpen(true);
    }
  };

  const handleConfirmActivate = () => {
    if (!warehouseToActivate) return;
    // Logic to deactivate current main warehouse if necessary logic exists, OR allows multiple active?
    // App.tsx logic suggests singular main warehouse logic might be enforced, or maybe just simple toggle.
    // Replicating existing logic: Deactivate other 'คลัง' if activating 'คลัง'.
    if (warehouseToActivate.type === 'คลัง') {
      const currentActive = warehouses.find(
        (w) => w.type === 'คลัง' && w.status === Status.Approved
      );
      if (currentActive && currentActive.id !== warehouseToActivate.id) {
        onUpdateWarehouse({ ...currentActive, status: Status.Rejected });
      }
    }

    onUpdateWarehouse({ ...warehouseToActivate, status: Status.Approved });
    setIsConfirmModalOpen(false);
    setWarehouseToActivate(null);
  };

  const actions = [
    { label: 'ดูรายละเอียด', icon: EyeIcon, action: handleViewDetails },
    { label: 'แก้ไข', icon: PencilIcon, action: handleEdit },
    {
      label: 'จำกัดการเบิก',
      icon: LimitIcon,
      action: handleSetLimits,
      condition: (w: WarehouseType) => w.type === 'รถ',
    },
    { label: 'ลบ', icon: TrashIcon, isDanger: true, action: handleDelete },
  ];

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full bg-slate-50/50">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              คลังสินค้า
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              จัดการข้อมูลคลังสินค้าและรถบริการของบริษัท
            </p>
          </div>
          <div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              variant="primary"
              className="shadow-sm"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              เพิ่มคลัง/รถบริการ
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:border-blue-200">
            <div className="flex-shrink-0 p-3 rounded-xl bg-blue-50 text-blue-600">
              <NewWarehouseIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">ทั้งหมด</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {stats.total}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:border-emerald-200">
            <div className="flex-shrink-0 p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <NewWarehouseIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">คลังถาวร</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {stats.fixed}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:border-amber-200">
            <div className="flex-shrink-0 p-3 rounded-xl bg-amber-50 text-amber-600">
              <ManageIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">รถบริการ</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {stats.mobile}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:border-green-200">
            <div className="flex-shrink-0 p-3 rounded-xl bg-green-50 text-green-600">
              <EyeIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">สถานะใช้งาน</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {stats.active}
              </h3>
            </div>
          </div>
        </div>

        {/* Controls & Filter */}
        <Card className="!p-0 flex-grow min-h-0 flex flex-col bg-white shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg self-start">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setActiveTab('warehouse')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'warehouse'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                คลังสินค้า
              </button>
              <button
                onClick={() => setActiveTab('vehicle')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'vehicle'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                รถบริการ
              </button>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหา..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-64"
                />
              </div>
              {/* Potential future status filter dropdown here if needed */}
            </div>
          </div>

          <div className="overflow-auto flex-grow">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    รหัส
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    ชื่อคลัง/รถ
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    ประเภท
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    ที่ตั้ง/ทะเบียน
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    สถานะ
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    ใช้งานคลังหลัก
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedWarehouses.length > 0 ? (
                  paginatedWarehouses.map((warehouse, index) => (
                    <tr
                      key={warehouse.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                        {warehouse.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        <div className="flex items-center">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${warehouse.type === 'คลัง' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}
                          >
                            {warehouse.type === 'คลัง' ? (
                              <NewWarehouseIcon className="h-4 w-4" />
                            ) : (
                              <ManageIcon className="h-4 w-4" />
                            )}
                          </div>
                          {warehouse.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${warehouse.type === 'คลัง' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}
                        >
                          {warehouse.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {warehouse.type === 'รถ' ? (
                          <div className="flex flex-col">
                            <span>{warehouse.licensePlate}</span>
                            <span className="text-xs text-slate-400">
                              {warehouse.brand} {warehouse.model}
                            </span>
                          </div>
                        ) : (
                          warehouse.location
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {/* Status Badge from existing type logic if available, or custom */}
                        <StatusBadge
                          status={warehouse.status || Status.Draft}
                        />{' '}
                        {/* Assuming Approved means Active */}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {warehouse.type === 'คลัง' ? (
                          <label
                            htmlFor={`toggle-${warehouse.id}`}
                            className="inline-flex relative items-center cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              id={`toggle-${warehouse.id}`}
                              className="sr-only peer"
                              checked={warehouse.status === Status.Approved}
                              onChange={() => handleToggleChange(warehouse)}
                              disabled={warehouse.status === Status.Approved} // Prevent deactivating via toggle directly if it requires selecting another
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          data-warehouse-id={warehouse.id}
                          onClick={(e) => handleDropdownToggle(e, warehouse.id)}
                          variant="icon"
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <ManageIcon className="h-5 w-5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <NewWarehouseIcon className="h-10 w-10 text-slate-300 mb-2" />
                        <p>ไม่พบข้อมูลคลังสินค้า</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredWarehouses.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        </Card>
      </div>

      {/* Dropdown Menu */}
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
        >
          <div className="py-1">
            {(() => {
              const warehouse = warehouses.find((w) => w.id === openDropdownId);
              if (!warehouse) return null;

              return actions.map((action) => {
                if (action.condition && !action.condition(warehouse))
                  return null;
                return (
                  <button
                    key={action.label}
                    onClick={() => action.action(warehouse)}
                    className={`flex w-full items-center px-4 py-2 text-sm ${
                      action.isDanger
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                    {action.label}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddWarehouseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreateWarehouse={onCreateWarehouse}
      />
      <EditWarehouseModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        warehouse={warehouseToEdit}
        onUpdateWarehouse={onUpdateWarehouse}
      />
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
        message={
          <p>
            คุณต้องการเปลี่ยน <strong>{warehouseToActivate?.name}</strong>{' '}
            เป็นคลังหลักหรือไม่? คลังหลักเดิมจะถูกปิดใช้งาน
          </p>
        }
        confirmButtonText="ยืนยัน"
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบคลัง{' '}
            <strong>{warehouseToDelete?.name}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
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

export default Warehouse;
