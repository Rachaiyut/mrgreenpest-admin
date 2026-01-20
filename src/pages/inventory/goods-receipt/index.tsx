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
import { AddGoodsReceiptModal } from '../../../components/features/inventory/AddGoodsReceiptModal';
import { StatusBadge } from '../../../components/common/StatusBadge';
import {
  GoodsReceipt as GoodsReceiptType,
  Status,
  Warehouse as WarehouseType,
  Supplier,
  Product,
} from '@/src/libs/common/interface/entity/app.interface';
import { GoodsReceiptDetailsModal } from '../../../components/features/inventory/GoodsReceiptDetailsModal';
import { Pagination } from '../../../components/common/Pagination';
import { ApprovalModal } from '../../../components/common/ApprovalModal';
import { Input, Button } from '../../../components/common/FormControls';

import { useData } from '../../../../contexts/DataContext';

// FIX: Define props interface
interface GoodsReceiptProps {
  onCreateReceipt: (receipt: Omit<GoodsReceiptType, 'id'>) => void;
  onUpdateReceipt: (receipt: GoodsReceiptType) => void;
  onDeleteReceipt: (receiptId: string) => void;
}

const GoodsReceipt: React.FC<GoodsReceiptProps> = ({
  onCreateReceipt,
  onUpdateReceipt,
  onDeleteReceipt,
}) => {
  const {
    receipts,
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
  const [selectedReceipt, setSelectedReceipt] =
    useState<GoodsReceiptType | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const reversedReceipts = useMemo(() => [...receipts].reverse(), [receipts]);

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

  const filteredReceipts = useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (!lowercasedQuery) {
      return reversedReceipts;
    }

    return reversedReceipts.filter((receipt) => {
      const supplierName =
        (receipt.supplierId && supplierMap[receipt.supplierId]) || '';
      const receiptDate = formatThaiDate(receipt.createdAt);

      return (
        receipt.id.toLowerCase().includes(lowercasedQuery) ||
        (receipt.referenceId &&
          receipt.referenceId.toLowerCase().includes(lowercasedQuery)) ||
        supplierName.toLowerCase().includes(lowercasedQuery) ||
        receiptDate.includes(lowercasedQuery) ||
        receipt.status.toLowerCase().includes(lowercasedQuery)
      );
    });
  }, [reversedReceipts, searchQuery, supplierMap]);

  const totalItems = filteredReceipts.length;
  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (receipt: GoodsReceiptType) => {
    setSelectedReceipt(receipt);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    receiptId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === receiptId) {
      setOpenDropdownId(null);
      setSelectedReceipt(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setSelectedReceipt(receipts.find((r) => r.id === receiptId) || null);
      setOpenDropdownId(receiptId);
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

  const handleConfirmApproval = (receiptId: string, remarks: string) => {
    const receiptToUpdate = receipts.find((r) => r.id === receiptId);
    if (receiptToUpdate) {
      onUpdateReceipt({
        ...receiptToUpdate,
        status:
          approvalAction === 'approve' ? Status.Approved : Status.Rejected,
        remarks: remarks,
        approvedBy: 'ผู้ดูแลระบบ', // Mock approver
        updatedBy: 'ผู้ดูแลระบบ',
      });
    }
    setIsApprovalModalOpen(false);
    setOpenDropdownId(null);
    setApprovalAction(null);
    setSelectedReceipt(null);
  };

  const handleCancel = (receiptId: string) => {
    const receiptToUpdate = receipts.find((r) => r.id === receiptId);
    if (receiptToUpdate) {
      onUpdateReceipt({
        ...receiptToUpdate,
        status: Status.Cancelled,
        remarks: 'ยกเลิกโดยผู้ใช้',
        updatedBy: 'ผู้ดูแลระบบ',
      });
    }
    // FIX: Incomplete statement 'set' corrected to 'setOpenDropdownId(null);'
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
      if ((event.target as HTMLElement).closest('button[data-receipt-id]')) {
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
    if (!selectedReceipt) return null;

    const actions = [
      <a
        key="view"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          handleViewDetails(selectedReceipt);
        }}
        className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        role="menuitem"
      >
        <EyeIcon className="mr-3 h-5 w-5" aria-hidden="true" />
        <span>ดูรายละเอียด</span>
      </a>,
    ];

    if (selectedReceipt.status === Status.PendingApproval) {
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
      selectedReceipt.status === Status.Draft ||
      selectedReceipt.status === Status.PendingApproval
    ) {
      actions.push(
        <a
          key="cancel"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleCancel(selectedReceipt.id);
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
            <h1 className="text-3xl font-bold text-slate-800">รับสินค้าเข้า</h1>
            <p className="mt-1 text-slate-600">จัดการการรับสินค้าเข้าคลัง</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Input
                type="search"
                placeholder="ค้นหา (เลขที่, อ้างอิง, ผู้ขาย)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset page on search
                }}
                title="ค้นหาด้วย: เลขที่เอกสาร, เลขที่อ้างอิง, ผู้จัดจำหน่าย, วันที่, สถานะ"
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              สร้างใบรับเข้า
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
                    เลขที่ใบรับเข้า
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    เลขที่อ้างอิง
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
                    คลัง
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ผู้จัดจำหน่าย
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
                {paginatedReceipts.map((receipt, index) => (
                  <tr key={receipt.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => handleViewDetails(receipt)}
                    >
                      {receipt.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {receipt.referenceId || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {formatThaiDate(receipt.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {warehouseMap[receipt.warehouseId] || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {receipt.supplierId
                        ? supplierMap[receipt.supplierId]
                        : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <StatusBadge status={receipt.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="inline-block text-left">
                        <Button
                          data-receipt-id={receipt.id}
                          onClick={(e) => handleDropdownToggle(e, receipt.id)}
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

      <AddGoodsReceiptModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreateReceipt={onCreateReceipt}
        receipts={receipts}
        warehouses={warehouses}
        suppliers={suppliers}
        products={products}
      />
      <GoodsReceiptDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        receipt={selectedReceipt}
        warehouses={warehouses}
        products={products}
      />
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        action={approvalAction}
        item={selectedReceipt}
        onConfirm={handleConfirmApproval}
      />
    </>
  );
};

export default GoodsReceipt;
