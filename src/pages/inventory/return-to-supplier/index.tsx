import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from '../../../components/common/Card';
import { formatThaiDate } from '../../../constants';
import {
  PlusIcon,
  ManageIcon,
  EyeIcon,
  DocumentCheckIcon,
  XCircleIcon,
  TrashIcon,
} from '../../../assets/icons/Icons';
import { AddReturnToSupplierModal } from '../../../components/features/inventory/AddReturnToSupplierModal';
import { StatusBadge } from '../../../components/common/StatusBadge';
import {
  ReturnToSupplier,
  Status,
  Warehouse as WarehouseType,
  Supplier,
  Product,
} from '@/src/libs/common/interface/entity/app.interface';
import { ReturnToSupplierDetailsModal } from '../../../components/features/inventory/ReturnToSupplierDetailsModal';
import { Pagination } from '../../../components/common/Pagination';
import { ApprovalModal } from '../../../components/common/ApprovalModal';
import { Input, Button } from '../../../components/common/FormControls';

import { useData } from '../../../../contexts/DataContext';

interface ReturnToSupplierProps {
  onCreateReturn: (data: Omit<ReturnToSupplier, 'id'>) => void;
  onUpdateReturn: (data: ReturnToSupplier) => void;
  onDeleteReturn: (id: string) => void;
}

const ReturnToSupplierPage: React.FC<ReturnToSupplierProps> = ({
  onCreateReturn,
  onUpdateReturn,
  onDeleteReturn,
}) => {
  const {
    returnToSuppliers: returns,
    warehouses,
    suppliers,
    products,
  } = useData();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<
    'approve' | 'reject' | null
  >(null);
  const [selectedReturn, setSelectedReturn] = useState<ReturnToSupplier | null>(
    null
  );
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const reversedReturns = useMemo(() => [...returns].reverse(), [returns]);

  const warehouseMap = useMemo(() => {
    return warehouses.reduce(
      (acc, wh) => {
        acc[wh.id] = wh.name;
        return acc;
      },
      {} as Record<string, string>
    );
  }, [warehouses]);

  const supplierMap = useMemo(() => {
    return suppliers.reduce(
      (acc, s) => {
        acc[s.id] = s.name;
        return acc;
      },
      {} as Record<string, string>
    );
  }, [suppliers]);

  const filteredReturns = useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (!lowercasedQuery) {
      return reversedReturns;
    }

    return reversedReturns.filter((r) => {
      const supplierName = (r.supplierId && supplierMap[r.supplierId]) || '';
      const dateStr = formatThaiDate(r.createdAt);

      return (
        r.id.toLowerCase().includes(lowercasedQuery) ||
        (r.referenceId &&
          r.referenceId.toLowerCase().includes(lowercasedQuery)) ||
        supplierName.toLowerCase().includes(lowercasedQuery) ||
        dateStr.includes(lowercasedQuery) ||
        r.status.toLowerCase().includes(lowercasedQuery)
      );
    });
  }, [reversedReturns, searchQuery, supplierMap]);

  const totalItems = filteredReturns.length;
  const paginatedReturns = filteredReturns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (data: ReturnToSupplier) => {
    setSelectedReturn(data);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    id: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === id) {
      setOpenDropdownId(null);
      setSelectedReturn(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setSelectedReturn(returns.find((r) => r.id === id) || null);
      setOpenDropdownId(id);
      setDropdownPosition({
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.right + window.scrollX,
      });
    }
  };

  const handleApprovalAction = (action: 'approve' | 'reject') => {
    setApprovalAction(action);
    setIsApprovalModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmApproval = (id: string, remarks: string) => {
    const itemToUpdate = returns.find((r) => r.id === id);
    if (itemToUpdate) {
      onUpdateReturn({
        ...itemToUpdate,
        status:
          approvalAction === 'approve' ? Status.Approved : Status.Rejected,
        // remarks: remarks, // Type ReturnToSupplier uses remarks directly on object, similar to GoodsReceipt? Yes. But ApprovalModal passes remark string.
        // Assuming type has remarks. Yes defined in type.
        remarks: remarks || itemToUpdate.remarks, // Keep original if empty? Or overwrite? Usually overwrite or append. Mocking overwrite.
        approvedBy: 'ผู้ดูแลระบบ',
        updatedBy: 'ผู้ดูแลระบบ',
      });
    }
    setIsApprovalModalOpen(false);
    setOpenDropdownId(null);
    setApprovalAction(null);
    setSelectedReturn(null);
  };

  const handleCancel = (id: string) => {
    const itemToUpdate = returns.find((r) => r.id === id);
    if (itemToUpdate) {
      onUpdateReturn({
        ...itemToUpdate,
        status: Status.Cancelled,
        remarks: 'ยกเลิกโดยผู้ใช้',
        updatedBy: 'ผู้ดูแลระบบ',
      });
    }
    setOpenDropdownId(null);
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

  const renderActions = () => {
    if (!selectedReturn) return null;

    const actions = [
      <a
        key="view"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          handleViewDetails(selectedReturn);
        }}
        className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        role="menuitem"
      >
        <EyeIcon className="mr-3 h-5 w-5" aria-hidden="true" />
        <span>ดูรายละเอียด</span>
      </a>,
    ];

    if (selectedReturn.status === Status.PendingApproval) {
      actions.push(
        <a
          key="approve"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleApprovalAction('approve');
          }}
          className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          role="menuitem"
        >
          <DocumentCheckIcon
            className="mr-3 h-5 w-5 text-green-500"
            aria-hidden="true"
          />
          <span>อนุมัติ</span>
        </a>,
        <a
          key="reject"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleApprovalAction('reject');
          }}
          className="flex items-center w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
          role="menuitem"
        >
          <XCircleIcon className="mr-3 h-5 w-5" aria-hidden="true" />
          <span>ไม่อนุมัติ</span>
        </a>
      );
    }

    if (
      selectedReturn.status === Status.Draft ||
      selectedReturn.status === Status.PendingApproval
    ) {
      actions.push(
        <a
          key="cancel"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleCancel(selectedReturn.id);
          }}
          className="flex items-center w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
          role="menuitem"
        >
          <TrashIcon className="mr-3 h-5 w-5" aria-hidden="true" />
          <span>ยกเลิก</span>
        </a>
      );
    }

    return actions;
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full gap-6">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              เบิกสินค้าคืนผู้จำหน่าย
            </h1>
            <p className="mt-1 text-slate-600">
              จัดการการเบิกสินค้าเพื่อส่งคืนผู้จำหน่าย
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Input
                type="search"
                placeholder="ค้นหา..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                title="ค้นหาด้วย: เลขที่เอกสาร, ผู้จำหน่าย, วันที่, สถานะ"
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              สร้างใบเบิกคืน
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
                    เลขที่เอกสาร
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    อ้างอิง
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    วันที่
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    คืนจากคลัง
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ผู้จำหน่าย
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    สถานะ
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedReturns.map((r, index) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => handleViewDetails(r)}
                    >
                      {r.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {r.referenceId || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {formatThaiDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {warehouseMap[r.warehouseId] || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {r.supplierId ? supplierMap[r.supplierId] : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="inline-block text-left">
                        <Button
                          data-return-id={r.id}
                          onClick={(e) => handleDropdownToggle(e, r.id)}
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
            {renderActions()}
          </div>
        </div>
      )}

      <AddReturnToSupplierModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreateReturn={onCreateReturn}
        returns={returns}
        warehouses={warehouses}
        suppliers={suppliers}
        products={products}
      />
      <ReturnToSupplierDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        returnToSupplier={selectedReturn}
        warehouses={warehouses}
        suppliers={suppliers}
        products={products}
      />
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        action={approvalAction}
        item={selectedReturn}
        onConfirm={handleConfirmApproval}
      />
    </>
  );
};

export default ReturnToSupplierPage;
