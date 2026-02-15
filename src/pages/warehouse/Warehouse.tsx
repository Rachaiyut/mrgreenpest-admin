import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
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
} from '../../assets/icons/Icons';
import { Button, Input } from '../../components/common/FormControls';
import { AddWarehouseModal } from '../../components/features/warehouses/AddWarehouseModal';
import { WarehouseDetailsModal } from '../../components/features/warehouses/WarehouseDetailsModal';
import {
  Warehouse as WarehouseType,
  Status,
  Product,
  WarehouseStats,
} from '@/src/types/entity/app.interface';
import { Pagination } from '../../components/common/Pagination';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { EditWarehouseModal } from '../../components/features/warehouses/EditWarehouseModal';
import { SetWithdrawalLimitModal } from '../../components/features/warehouses/SetWithdrawalLimitModal';
import { ReturnToMainWarehouseModal } from '../../components/features/warehouses/ReturnToMainWarehouseModal';
import { StatusBadge } from '../../components/common/StatusBadge';

import { WarehouseApi } from '@/src/api/warehouse';
import { ProductApi } from '@/src/api/product';
import { WarehouseType as WarehouseTypeEnum } from '@/src/types/enums/inventory';

const Warehouse: React.FC = () => {
  // Data State
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [warehouseStats, setWarehouseStats] = useState<WarehouseStats | null>(
    null
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // State
  const [activeTab, setActiveTab] = useState<'all' | 'warehouse' | 'vehicle'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');

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
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

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
  const [warehouseForReturn, setWarehouseForReturn] =
    useState<WarehouseType | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchWarehousesStats = async () => {
    try {
      const result = await WarehouseApi.getWarehouseStats();
      setWarehouseStats(result['data']);
    } catch (error) {
      console.error('Failed to fetch warehouses stats:', error);
    }
  };

  // Fetch WArehouse Data
  const fetchWarehouses = useCallback(async () => {
    try {
      setIsLoading(true);
      const query: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (searchQuery) query.search = searchQuery;

      // Filter by Type based on activeTab
      if (activeTab === 'warehouse') query.type = WarehouseTypeEnum.MAIN;
      if (activeTab === 'vehicle') query.type = WarehouseTypeEnum.VEHICLE;

      const res = await WarehouseApi.getWarehouses(query);
      setWarehouses(res.data);
      setTotalItems(res.meta.total);
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, activeTab]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await ProductApi.getProducts({ page: 1, limit: 10 });
      setProducts(res.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  }, []);

  useEffect(() => {
    fetchWarehousesStats();
    fetchWarehouses();
    fetchProducts();
  }, [fetchWarehouses, fetchProducts]);

  const onCreateWarehouse = async (data: Omit<WarehouseType, 'id'>) => {
    try {
      await WarehouseApi.create(data);
      setIsAddModalOpen(false);
      fetchWarehouses();
      fetchWarehousesStats();
    } catch (error) {
      console.error('Failed to create warehouse:', error);
    }
  };

  const onUpdateWarehouse = async (warehouse: WarehouseType) => {
    try {
      // Backend validates `address` as required even on partial updates.
      // For vehicle-warehouses, backend validation errors indicate it expects
      // vehicle fields flattened in the DTO:
      // `brand`, `model`, `vehicle_registration`, `color` (not nested).
      const address =
        (warehouse as any).address ||
        warehouse.warehouse_branch?.location ||
        (warehouse.vehicle ? 'เคลื่อนที่' : '-') ||
        '-';

      const isVehicleWarehouse =
        !!warehouse.vehicle ||
        warehouse.type === WarehouseTypeEnum.SUB ||
        warehouse.type === WarehouseTypeEnum.VEHICLE;

      const payload: any = {
        name: warehouse.name,
        type: warehouse.type,
        status: warehouse.status,
        address,
      };

      if (isVehicleWarehouse) {
        payload.vehicle_registration =
          (warehouse as any).vehicle_registration ||
          warehouse.vehicle?.vehicle_registration ||
          '';
        payload.brand = (warehouse as any).brand || warehouse.vehicle?.brand || '';
        payload.model = (warehouse as any).model || warehouse.vehicle?.model || '';
        payload.color = (warehouse as any).color || warehouse.vehicle?.color || '';
      }

      await WarehouseApi.update(warehouse.id, payload);
      setIsEditModalOpen(false);
      fetchWarehouses();
      fetchWarehousesStats();
    } catch (error) {
      console.error('Failed to update warehouse:', error);
    }
  };

  const onDeleteWarehouse = async (id: string) => {
    try {
      await WarehouseApi.delete(id);
      setIsDeleteModalOpen(false);
      setWarehouseToDelete(null);
      fetchWarehouses();
      fetchWarehousesStats();
    } catch (error) {
      console.error('Failed to delete warehouse:', error);
    }
  };

  const onUpdateWarehouseLimits = async (
    warehouseId: string,
    limits: { [productId: string]: number }
  ) => {
    if (!warehouseId) {
      console.error('Cannot update limits: Warehouse ID is missing');
      return;
    }
    try {
      const limitsArray = Object.entries(limits).map(
        ([productId, max_quantity]) => ({
          product_id: productId,
          max_quantity,
        })
      );
      await WarehouseApi.updateLimits(warehouseId, limitsArray);
      setIsLimitModalOpen(false);
      // Fetch the authoritative warehouse (in case backend enriches / transforms limits)
      try {
        const full = await WarehouseApi.getWarehouseById(warehouseId);
        if (full && full.id) {
          setWarehouses((prev) => prev.map((w) => (w.id === warehouseId ? (full as any) : w)));
          setWarehouseForLimits((prev) =>
            prev && prev.id === warehouseId ? (full as any) : prev
          );
        }
      } catch (e) {
        console.error('Failed to refetch warehouse after limits update; falling back to local state', e);
        // Fallback: update local state with what we just sent
        setWarehouses((prev) =>
          prev.map((w) =>
            w.id === warehouseId ? { ...w, withdrawal_limits: limitsArray as any } : w
          )
        );
        setWarehouseForLimits((prev) =>
          prev && prev.id === warehouseId
            ? { ...(prev as any), withdrawal_limits: limitsArray as any }
            : prev
        );
      }
    } catch (error) {
      console.error('Failed to update limits', error);
    }
  };

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

  // State for stock map
  const [stockMap, setStockMap] = useState<Record<string, Record<string, number>>>({});

  const handleViewDetails = async (warehouse: WarehouseType) => {
    setSelectedWarehouse(warehouse);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);

    // Fetch stock
    try {
      const res: any = await WarehouseApi.getStockBalances(warehouse.id);
      const stocks = res.data || res; // Handle if it returns { data: [...] } or just [...]
      const map: Record<string, number> = {};

      if (Array.isArray(stocks)) {
        stocks.forEach((s: any) => {
          const qty = typeof s.quantity === 'string' ? parseFloat(s.quantity) : Number(s.quantity || 0);
          const productId = s.product?.id || s.product_id;
          if (productId) {
            map[productId] = qty;
          }
        });
      }
      setStockMap(prev => ({ ...prev, [warehouse.id]: map }));
    } catch (e) {
      console.error("Failed to fetch stock for warehouse", warehouse.id, e);
    }
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

  const handleSetLimits = async (warehouse: WarehouseType) => {
    if (!warehouse?.id) {
      console.error('Cannot set limits: Warehouse ID is missing', warehouse);
      return;
    }
    setOpenDropdownId(null);
    setIsLimitModalOpen(true);
    setWarehouseForLimits(null);

    // Ensure we have latest withdrawal_limits from API (list endpoint may omit).
    try {
      const full = await WarehouseApi.getWarehouseById(warehouse.id);
      if (full && full.id) {
        setWarehouseForLimits(full as any);
      } else {
        throw new Error('Warehouse data is invalid or missing ID');
      }
    } catch (e) {
      console.error('Failed to fetch warehouse limits', warehouse.id, e);
      // Fallback to whatever we already had.
      setWarehouseForLimits(warehouse);
    }
  };

  const handleReturnStock = (warehouse: WarehouseType) => {
    setWarehouseForReturn(warehouse);
    setIsReturnModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (warehouseToDelete) await onDeleteWarehouse(warehouseToDelete.id);
  };

  const handleToggleChange = (warehouse: WarehouseType) => {
    if (warehouse.status !== Status.Approved) {
      setWarehouseToActivate(warehouse);
      setIsConfirmModalOpen(true);
    }
  };

  const handleConfirmActivate = async () => {
    if (!warehouseToActivate) return;
    try {
      await onUpdateWarehouse({
        ...warehouseToActivate,
        status: Status.Approved,
      });
      setIsConfirmModalOpen(false);
      setWarehouseToActivate(null);
    } catch (error) {
      console.error('Error activating warehouse', error);
    }
  };

  const actions = [
    { label: 'ดูรายละเอียด', icon: EyeIcon, action: handleViewDetails },
    { label: 'แก้ไข', icon: PencilIcon, action: handleEdit },
    {
      label: 'จำกัดการเบิก',
      icon: LimitIcon,
      action: handleSetLimits,
      // Limits apply to vehicle warehouses (บาง backend ส่งเป็น SUB แต่มี vehicle)
      condition: (w: WarehouseType) =>
        !!(w as any).vehicle ||
        w.type === WarehouseTypeEnum.SUB ||
        w.type === WarehouseTypeEnum.VEHICLE,
    },
    {
      label: 'คืนสินค้าเข้าคลังหลัก',
      icon: NewWarehouseIcon,
      action: handleReturnStock,
      // Only for Vehicle Warehouses
      condition: (w: WarehouseType) =>
        !!(w as any).vehicle ||
        w.type === WarehouseTypeEnum.VEHICLE,
    },
    { label: 'ลบ', icon: TrashIcon, isDanger: true, action: handleDelete },
  ];

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">คลังสินค้า</h1>
            <p className="mt-1 text-slate-600">
              จัดการข้อมูลคลังสินค้าและรถบริการของบริษัท
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Input
                type="search"
                placeholder="ค้นหา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)} variant="primary">
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
                {warehouseStats?.total}
              </h3>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:border-blue-200">
            <div className="flex-shrink-0 p-3 rounded-xl bg-blue-50 text-blue-600">
              <NewWarehouseIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">คลังหลัก</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {warehouseStats?.fixed}
              </h3>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:border-blue-200">
            <div className="flex-shrink-0 p-3 rounded-xl bg-blue-50 text-blue-600">
              <NewWarehouseIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">คลังย่อย</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {warehouseStats?.mobile}
              </h3>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md hover:border-blue-200">
            <div className="flex-shrink-0 p-3 rounded-xl bg-blue-50 text-blue-600">
              <NewWarehouseIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">ทั้งหมด</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {warehouseStats?.active}
              </h3>
            </div>
          </div>
        </div>

        {/* Card & Filter */}
        <Card className="p-0 grow min-h-0 flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg self-start">
              <button
                onClick={() => {
                  setActiveTab('all');
                  setCurrentPage(1);
                }}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'all'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => {
                  setActiveTab('warehouse');
                  setCurrentPage(1);
                }}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'warehouse'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                คลังสินค้า
              </button>
              <button
                onClick={() => {
                  setActiveTab('vehicle');
                  setCurrentPage(1);
                }}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'vehicle'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                รถบริการ
              </button>
            </div>
          </div>

          <div className="overflow-auto grow">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    รหัส
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ชื่อคลัง/รถ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ประเภท
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ที่ตั้ง/ทะเบียน
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-center text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    สถานะ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : warehouses.length > 0 ? (
                  warehouses.map((warehouse, index) => (
                    <tr
                      key={warehouse.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-700">
                        {warehouse.code || warehouse.id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                        <div className="flex items-center">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${warehouse.type === WarehouseTypeEnum.MAIN ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}
                          >
                            {warehouse.type === WarehouseTypeEnum.MAIN ? (
                              <NewWarehouseIcon className="h-4 w-4" />
                            ) : (
                              <ManageIcon className="h-4 w-4" />
                            )}
                          </div>
                          {warehouse.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${warehouse.type === WarehouseTypeEnum.MAIN ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}
                        >
                          {warehouse.type === WarehouseTypeEnum.MAIN
                            ? 'คลังหลัก'
                            : 'คลังย่อย'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                        {warehouse.type === WarehouseTypeEnum.SUB &&
                          warehouse.vehicle ? (
                          <div className="flex flex-col">
                            <span>
                              {warehouse.vehicle.vehicle_registration}
                            </span>
                            <span className="text-xs text-slate-400">
                              {warehouse.vehicle.brand}{' '}
                              {warehouse.vehicle.model}
                            </span>
                          </div>
                        ) : (
                          warehouse.warehouse_branch?.location || '-'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <StatusBadge
                          status={warehouse.status || Status.Draft}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
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
                      colSpan={7}
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
              totalItems={totalItems}
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
                    className={`flex w-full items-center px-4 py-2 text-sm ${action.isDanger
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
        stockMap={stockMap}
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

      <ReturnToMainWarehouseModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        sourceWarehouse={warehouseForReturn}
        onSuccess={() => {
          fetchWarehousesStats();
          // Optionally refresh stock if we were viewing it
        }}
        products={products}
      />
    </>
  );
};

export default Warehouse;
