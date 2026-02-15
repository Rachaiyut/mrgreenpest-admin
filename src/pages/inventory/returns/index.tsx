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
import { formatThaiDate } from '../../../utils/date';
import { AddReturnModal } from '../../../components/features/inventory/AddReturnModal';
import {
  ProductReturn as ReturnType,
  Warehouse as WarehouseType,
  Product,
} from '@/src/types/entity/app.interface';
import { ReturnDetailsModal } from '../../../components/features/inventory/ReturnDetailsModal';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { EditReturnModal } from '../../../components/features/inventory/EditReturnModal';
import { Input } from '../../../components/common/FormControls';

import { useData } from '../../../contexts/DataContext';

interface ReturnsProps {
  onCreateReturn: (data: Omit<ReturnType, 'id'>) => void;
  onUpdateReturn: (updatedItem: ReturnType) => void;
  onDeleteReturn: (id: string) => void;
}

const Returns: React.FC<ReturnsProps> = ({
  onCreateReturn,
  onUpdateReturn,
  onDeleteReturn,
}) => {
  const {
    productReturns: returns,
    warehouses,
    products,
    warehouseStocks: stockMap,
  } = useData();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [returnToEdit, setReturnToEdit] = useState<ReturnType | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedReturn, setSelectedReturn] = useState<ReturnType | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState<ReturnType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w.name])),
    [warehouses]
  );

  const filteredReturns = useMemo(() => {
    const reversed = [...returns].reverse();
    if (!searchQuery.trim()) {
      return reversed;
    }
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    return reversed.filter(
      (item) =>
        item.id.toLowerCase().includes(lowercasedQuery) ||
        formatThaiDate(item.createdAt).includes(lowercasedQuery)
    );
  }, [returns, searchQuery]);

  const totalItems = filteredReturns.length;
  const paginatedReturns = filteredReturns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (returnItem: ReturnType) => {
    setSelectedReturn(returnItem);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleEdit = (returnItem: ReturnType) => {
    setReturnToEdit(returnItem);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (returnItem: ReturnType) => {
    setReturnToDelete(returnItem);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = () => {
    if (returnToDelete) {
      onDeleteReturn(returnToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setReturnToDelete(null);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    returnId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === returnId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setOpenDropdownId(returnId);
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
      if ((event.target as HTMLElement).closest('button[data-return-id]')) {
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
    { label: 'ดูรายละเอียด', icon: EyeIcon, isDanger: false },
    { label: 'แก้ไข', icon: PencilIcon, isDanger: false },
    { label: 'ลบ', icon: TrashIcon, isDanger: true },
  ];

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">คืนสินค้า</h1>
            <p className="mt-1 text-slate-600">
              จัดการการคืนสินค้าจากรถบริการกลับเข้าคลัง
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
                title="ค้นหาด้วย: เลขที่เอกสาร, วันที่คืนสินค้า"
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              สร้างใบคืนสินค้า
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
                    วันที่คืน
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    คืนจาก (รถ)
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    คืนเข้าคลัง
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
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedReturns.map((item, index) => {
                  const fromWarehouse = warehouseMap.get((item as any).vehicle_id) || (item as any).vehicle_id;
                  const toWarehouse = warehouseMap.get(item.warehouse_id) || item.warehouse_id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer"
                        onClick={() => handleViewDetails(item)}
                      >
                        {item.code || item.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {formatThaiDate(item.created_at || item.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {fromWarehouse || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {toWarehouse || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center">
                        {item.items?.length || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {item.created_by || item.createdBy}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="inline-block text-left">
                          <Button
                            data-return-id={item.id}
                            onClick={(e) => handleDropdownToggle(e, item.id)}
                            variant="icon"
                            title="ตัวเลือก"
                          >
                            <span className="sr-only">Open options</span>
                            <ManageIcon
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                  const returnItem = returns.find(
                    (r) => r.id === openDropdownId
                  );
                  if (!returnItem) {
                    setOpenDropdownId(null);
                    return;
                  }

                  if (action.label === 'ดูรายละเอียด') {
                    handleViewDetails(returnItem);
                  } else if (action.label === 'แก้ไข') {
                    handleEdit(returnItem);
                  } else if (action.label === 'ลบ') {
                    handleDelete(returnItem);
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

      <AddReturnModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreateReturn={onCreateReturn}
        returns={returns}
        warehouses={warehouses}
        products={products}
        stockMap={stockMap}
      />
      <EditReturnModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        returnItem={returnToEdit}
        onUpdateReturn={onUpdateReturn}
        warehouses={warehouses}
        products={products}
      />
      <ReturnDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        returnItem={selectedReturn}
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
            คุณแน่ใจหรือไม่ว่าต้องการลบใบคืนสินค้า{' '}
            <strong>{returnToDelete?.id}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
    </>
  );
};

export default Returns;


