import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Card } from '../../../components/common/Card';
import { Pagination } from '../../../components/common/Pagination';
import { StatusBadge } from '../../../components/common/StatusBadge';
import {
  PlusIcon,
  ManageIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
} from '../../../assets/icons/Icons';
import { formatThaiDate } from '../../../utils/date';
import {
  Transfer as TransferType,
  Status,
  Warehouse as WarehouseType,
  Product,
} from '@/src/types/entity/app.interface';
import { TransferStatus } from '@/src/types/enums/inventory';
import { AddTransferModal } from '../../../components/features/inventory/AddTransferModal';
import { TransferDetailsModal } from '../../../components/features/inventory/TransferDetailsModal';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { EditTransferModal } from '../../../components/features/inventory/EditTransferModal';
import { Input, Button } from '../../../components/common/FormControls';

import { useData } from '../../../contexts/DataContext';
import { TransferApi } from '@/src/api/inventory/transfer';

const Transfers: React.FC = () => {
  const { warehouses, products } = useData();

  const stockMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    warehouses.forEach((wh) => {
      map[wh.id] = {};
      if (wh.stock) {
        wh.stock.forEach((s) => {
          map[wh.id][s.product_id] = Number(s.quantity);
        });
      }
    });
    return map;
  }, [warehouses]);

  const [transfers, setTransfers] = useState<TransferType[]>([]);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferType | null>(
    null
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [transferToEdit, setTransferToEdit] = useState<TransferType | null>(
    null
  );
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<TransferType | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await TransferApi.getAll();
      setTransfers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleCreateTransfer = async (data: any) => {
    try {
      await TransferApi.create(data);
      await fetchTransfers();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Failed to create transfer:', error);
      alert('Failed to create transfer');
    }
  };

  const handleUpdateTransfer = async (updatedItem: TransferType) => {
    try {
      if (updatedItem.status) {
        if (updatedItem.code) {
          await TransferApi.updateStatus(updatedItem.code, updatedItem.status);
          await fetchTransfers();
          setIsEditModalOpen(false);
          return;
        }
      }

      alert(
        'Update transfer details not supported by API yet. Only Status update is supported.'
      );
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update transfer:', error);
      alert('Failed to update transfer');
    }
  };

  const handleDeleteTransfer = async (id: string) => {
    try {
      // API delete endpoint? TransferNoteController doesn't have delete.
      alert('Delete transfer not supported by API yet.');
    } catch (error) {
      console.error(error);
    }
  };

  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w.name])),
    [warehouses]
  );

  const filteredTransfers = useMemo(() => {
    const reversed = [...transfers].reverse();
    if (!searchQuery.trim()) {
      return reversed;
    }
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    return reversed.filter(
      (transfer) =>
        (transfer.code || transfer.id)
          .toLowerCase()
          .includes(lowercasedQuery) ||
        formatThaiDate(transfer.created_at).includes(lowercasedQuery)
    );
  }, [transfers, searchQuery]);

  const totalItems = filteredTransfers.length;
  const paginatedTransfers = filteredTransfers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (transfer: TransferType) => {
    setSelectedTransfer(transfer);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleEdit = (transfer: TransferType) => {
    setTransferToEdit(transfer);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (transfer: TransferType) => {
    setTransferToDelete(transfer);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = () => {
    if (transferToDelete) {
      handleDeleteTransfer(transferToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setTransferToDelete(null);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    transferId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === transferId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setOpenDropdownId(transferId);
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
      if ((event.target as HTMLElement).closest('button[data-transfer-id]')) {
        return;
      }
      setOpenDropdownId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  const handleApprove = (transfer: TransferType) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการอนุมัติการโอนย้ายนี้?')) {
      handleUpdateTransfer({ ...transfer, status: TransferStatus.COMPLETED });
    }
  };

  const actions = [
    {
      label: 'ดูรายละเอียด',
      icon: EyeIcon,
      handler: handleViewDetails,
      isDanger: false,
    },
    {
      label: 'อนุมัติ',
      icon: CheckCircleIcon,
      handler: handleApprove,
      isDanger: false,
      show: (t: TransferType) => t.status === TransferStatus.PENDING,
    },
    {
      label: 'แก้ไข',
      icon: PencilIcon,
      handler: handleEdit,
      isDanger: false,
      show: (t: TransferType) => t.status === TransferStatus.PENDING,
    },
    {
      label: 'ลบ',
      icon: TrashIcon,
      handler: handleDelete,
      isDanger: true,
      show: (t: TransferType) => t.status === TransferStatus.PENDING,
    },
  ];

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">โอนย้ายสินค้า</h1>
            <p className="mt-1 text-slate-600">
              จัดการการโอนย้ายสินค้าระหว่างคลัง
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
                title="ค้นหาด้วย: เลขที่เอกสารโอนย้าย, วันที่โอนย้าย"
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)} variant="primary">
              <PlusIcon className="h-5 w-5" />
              สร้างใบโอนย้าย
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
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    เลขที่เอกสารโอนย้าย
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    วันที่โอนย้าย
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    คลังต้นทาง
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    คลังปลายทาง
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-center text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    จำนวนสินค้า
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    เหตุผล
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
                {paginatedTransfers.map((transfer, index) => {
                  const fromWarehouse =
                    warehouseMap.get(transfer.from_warehouse_id) ||
                    (transfer as any).from_warehouse?.name;
                  const toWarehouse =
                    warehouseMap.get(transfer.to_warehouse_id) ||
                    (transfer as any).to_warehouse?.name;
                  const totalQuantity =
                    transfer.items?.reduce(
                      (sum, item) =>
                        sum + Number(item.qty || item.quantity || 0),
                      0
                    ) || 0;

                  return (
                    <tr key={transfer.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer"
                        onClick={() => handleViewDetails(transfer)}
                      >
                        {transfer.code || transfer.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {formatThaiDate(transfer.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {fromWarehouse || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {toWarehouse || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center">
                        {totalQuantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 truncate max-w-sm">
                        {transfer.remark}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <StatusBadge status={transfer.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="inline-block text-left">
                          <Button
                            data-transfer-id={transfer.id}
                            onClick={(e) =>
                              handleDropdownToggle(e, transfer.id)
                            }
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
            {actions
              .filter((action) => {
                const transfer = transfers.find((t) => t.id === openDropdownId);
                return transfer && (!action.show || action.show(transfer));
              })
              .map((action) => (
                <a
                  key={action.label}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const transfer = transfers.find(
                      (t) => t.id === openDropdownId
                    );
                    if (transfer) {
                      action.handler(transfer);
                    }
                    setOpenDropdownId(null);
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
      <AddTransferModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreateTransfer={handleCreateTransfer}
        transfers={transfers}
        warehouses={warehouses}
        products={products}
        stockMap={stockMap}
      />
      <EditTransferModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setTransferToEdit(null);
        }}
        transfer={transferToEdit}
        onUpdateTransfer={handleUpdateTransfer}
        warehouses={warehouses}
        products={products}
      />
      <TransferDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedTransfer(null);
        }}
        transfer={selectedTransfer}
        warehouses={warehouses}
        products={products}
        onApprove={handleApprove}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบใบโอนย้าย{' '}
            <strong>{transferToDelete?.id}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
    </>
  );
};

export default Transfers;
