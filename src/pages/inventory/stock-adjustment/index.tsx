import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Card } from '../../../components/common/Card';
import { Pagination } from '../../../components/common/Pagination';
import {
  PlusIcon,
  ManageIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '../../../assets/icons/Icons';
import { Button } from '../../../components/common/FormControls';
import { formatThaiDate } from '../../../constants';
import { AddStockAdjustmentModal } from '../../../components/features/inventory/AddStockAdjustmentModal';
import {
  StockAdjustment as StockAdjustmentType,
  Warehouse as WarehouseType,
  Product,
} from '../../../types';
import { StockAdjustmentDetailsModal } from '../../../components/features/inventory/StockAdjustmentDetailsModal';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { EditStockAdjustmentModal } from '../../../components/features/inventory/EditStockAdjustmentModal';
import { Input } from '../../../components/common/FormControls';

// FIX: Define props interface
interface StockAdjustmentProps {
  adjustments: StockAdjustmentType[];
  onCreateAdjustment: (data: Omit<StockAdjustmentType, 'id'>) => void;
  onUpdateAdjustment: (updatedItem: StockAdjustmentType) => void;
  onDeleteAdjustment: (id: string) => void;
  warehouses: WarehouseType[];
  products: Product[];
  stockMap: Record<string, Record<string, number>>;
}

const StockAdjustment: React.FC<StockAdjustmentProps> = ({
  adjustments,
  onCreateAdjustment,
  onUpdateAdjustment,
  onDeleteAdjustment,
  warehouses,
  products,
  stockMap,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [adjustmentToEdit, setAdjustmentToEdit] =
    useState<StockAdjustmentType | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] =
    useState<StockAdjustmentType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [adjustmentToDelete, setAdjustmentToDelete] =
    useState<StockAdjustmentType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w.name])),
    [warehouses]
  );

  const reversedAdjustments = useMemo(
    () => [...adjustments].reverse(),
    [adjustments]
  );

  const filteredAdjustments = useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (!lowercasedQuery) {
      return reversedAdjustments;
    }

    return reversedAdjustments.filter((adjustment) => {
      const adjustmentDate = formatThaiDate(adjustment.createdAt);

      return (
        adjustment.id.toLowerCase().includes(lowercasedQuery) ||
        adjustmentDate.includes(lowercasedQuery)
      );
    });
  }, [reversedAdjustments, searchQuery]);

  const totalItems = filteredAdjustments.length;
  const paginatedAdjustments = filteredAdjustments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (adjustment: StockAdjustmentType) => {
    setSelectedAdjustment(adjustment);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleEdit = (adjustment: StockAdjustmentType) => {
    setAdjustmentToEdit(adjustment);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (adjustment: StockAdjustmentType) => {
    setAdjustmentToDelete(adjustment);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = () => {
    if (adjustmentToDelete) {
      onDeleteAdjustment(adjustmentToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setAdjustmentToDelete(null);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    adjustmentId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === adjustmentId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setOpenDropdownId(adjustmentId);
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
      ) {
        return;
      }
      if ((event.target as HTMLElement).closest('button[data-adjustment-id]')) {
        return;
      }
      setOpenDropdownId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  const actions = [
    { label: 'ดูรายละเอียด', icon: EyeIcon },
    { label: 'แก้ไข', icon: PencilIcon },
    { label: 'ลบ', icon: TrashIcon, isDanger: true },
  ];

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              ปรับปรุง Stock
            </h1>
            <p className="mt-1 text-slate-600">
              จัดการและติดตามการปรับปรุงสต็อกสินค้า
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Input
                type="search"
                placeholder="ค้นหา (เลขที่, วันที่)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset page on search
                }}
                title="ค้นหาด้วย: เลขที่เอกสาร, วันที่ปรับปรุง"
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              สร้างใบปรับปรุง Stock
            </Button>
          </div>
        </div>

        <Card className="!p-0 flex-grow min-h-0 flex flex-col">
          <div className="overflow-auto flex-grow">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    เลขที่เอกสาร
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    วันที่
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    คลัง
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-center text-sm font-medium text-slate-600 uppercase"
                  >
                    จำนวนรายการ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    ผู้คืนสินค้า
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    เหตุผลหลัก
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedAdjustments.map((adj, index) => (
                  <tr key={adj.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => handleViewDetails(adj)}
                    >
                      {adj.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {formatThaiDate(adj.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {warehouseMap.get(adj.warehouseId) || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center">
                      {adj.items.length}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {adj.createdBy}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 truncate max-w-sm">
                      {adj.reason}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="inline-block text-left">
                        <Button
                          data-adjustment-id={adj.id}
                          onClick={(e) => handleDropdownToggle(e, adj.id)}
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
            {actions.map((action) => (
              <a
                key={action.label}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const adjustment = adjustments.find(
                    (adj) => adj.id === openDropdownId
                  );
                  if (!adjustment) {
                    setOpenDropdownId(null);
                    return;
                  }

                  if (action.label === 'ดูรายละเอียด') {
                    handleViewDetails(adjustment);
                  } else if (action.label === 'แก้ไข') {
                    handleEdit(adjustment);
                  } else if (action.label === 'ลบ') {
                    handleDelete(adjustment);
                  } else {
                    setOpenDropdownId(null);
                  }
                }}
                className={`flex items-center w-full text-left px-4 py-2 text-sm ${action.isDanger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}
                role="menuitem"
              >
                <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                <span>{action.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <AddStockAdjustmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreateAdjustment={onCreateAdjustment}
        adjustments={adjustments}
        warehouses={warehouses}
        products={products}
        stockMap={stockMap}
      />
      <EditStockAdjustmentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        adjustment={adjustmentToEdit}
        onUpdateAdjustment={onUpdateAdjustment}
        warehouses={warehouses}
        products={products}
      />
      <StockAdjustmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        adjustment={selectedAdjustment}
        warehouses={warehouses}
        products={products}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบใบปรับปรุงสต็อก{' '}
            <strong>{adjustmentToDelete?.id}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
    </>
  );
};

export default StockAdjustment;
