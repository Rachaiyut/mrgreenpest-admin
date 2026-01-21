import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Card } from '../../../components/common/Card';
import { Pagination } from '../../../components/common/Pagination';
import { StatusBadge } from '../../../components/common/StatusBadge';
import {
  PlusIcon,
  ManageIcon,
  EyeIcon,
  DocumentCheckIcon,
  XCircleIcon,
  TrashIcon,
  TruckIcon,
  UserIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
} from '../../../assets/icons/Icons';
import { formatThaiDate } from '../../../constants';
import {
  Withdrawal as WithdrawalType,
  Status,
  User,
  Warehouse as WarehouseType,
  FieldJob,
  Customer,
  Product,
} from '@/src/types/entity/app.interface';
import { AddWithdrawalModal } from '../../../components/features/inventory/AddWithdrawalModal';
import { ApprovalModal } from '../../../components/common/ApprovalModal';
import { WithdrawalDetailsModal } from '../../../components/features/inventory/WithdrawalDetailsModal';
import { Input, Select, Button } from '../../../components/common/FormControls';

import { useData } from '../../../contexts/DataContext';

interface WithdrawalsProps {
  onCreateWithdrawal: (data: Omit<WithdrawalType, 'id'>) => void;
  onUpdateWithdrawal: (updatedItem: WithdrawalType) => void;
  onDeleteWithdrawal: (id: string) => void;
}

const Withdrawals: React.FC<WithdrawalsProps> = ({
  onCreateWithdrawal,
  onUpdateWithdrawal,
  onDeleteWithdrawal,
}) => {
  const {
    withdrawals,
    users,
    warehouses,
    fieldJobs: jobs,
    customers,
    products,
    warehouseStocks: stockMap,
  } = useData();

  const currentUser = users[0]; // Mock user for now

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<WithdrawalType | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<
    'approve' | 'reject' | null
  >(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('all');

  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w])),
    [warehouses]
  );

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const userMap = useMemo(
    () => new Map(users.map((u) => [u.id, u.name])),
    [users]
  );

  const uniqueCreators = useMemo(
    () => [...new Set(withdrawals.map((w) => w.createdBy))],
    [withdrawals]
  );

  const filteredWithdrawals = useMemo(() => {
    let filtered = [...withdrawals].reverse();

    // Filter by creator
    if (creatorFilter !== 'all') {
      filtered = filtered.filter((w) => w.createdBy === creatorFilter);
    }

    // Filter by search query
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (lowercasedQuery) {
      filtered = filtered.filter((withdrawal) => {
        const totalGoodsAmount = withdrawal.items.reduce((sum, item) => {
          const product = productMap.get(item.productId);
          return sum + (product ? product.price * item.quantity : 0);
        }, 0);
        const totalExpenseAmount =
          withdrawal.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
        const totalAmount = totalGoodsAmount + totalExpenseAmount;

        const productNames = withdrawal.items
          .map((item) => productMap.get(item.productId)?.name || '')
          .join(' ')
          .toLowerCase();

        const expenseDescriptions = (
          withdrawal.expenses?.map((exp) => exp.description) || []
        )
          .join(' ')
          .toLowerCase();

        return (
          withdrawal.id.toLowerCase().includes(lowercasedQuery) ||
          productNames.includes(lowercasedQuery) ||
          expenseDescriptions.includes(lowercasedQuery) ||
          totalAmount.toString().includes(lowercasedQuery) ||
          formatThaiDate(withdrawal.createdAt).includes(lowercasedQuery)
        );
      });
    }

    return filtered;
  }, [withdrawals, searchQuery, creatorFilter, productMap]);

  const totalItems = filteredWithdrawals.length;
  const paginatedWithdrawals = filteredWithdrawals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (withdrawal: WithdrawalType) => {
    setSelectedWithdrawal(withdrawal);
    setIsDetailsModalOpen(true);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    withdrawalId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === withdrawalId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setOpenDropdownId(withdrawalId);
      setDropdownPosition({
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.right + window.scrollX,
      });
    }
  };

  const handleApprovalAction = (action: 'approve' | 'reject') => {
    const withdrawal = withdrawals.find((w) => w.id === openDropdownId);
    if (withdrawal) {
      setSelectedWithdrawal(withdrawal);
      setApprovalAction(action);
      setIsApprovalModalOpen(true);
      setOpenDropdownId(null);
    }
  };

  const handleConfirmApproval = (withdrawalId: string, remarks: string) => {
    const withdrawalToUpdate = withdrawals.find((w) => w.id === withdrawalId);
    if (withdrawalToUpdate) {
      onUpdateWithdrawal({
        ...withdrawalToUpdate,
        status:
          approvalAction === 'approve' ? Status.Approved : Status.Rejected,
        remarks: remarks,
        approvedBy: 'ผู้ดูแลระบบ', // Mock approver
        updatedBy: 'ผู้ดูแลระบบ',
      });
    }
    setIsApprovalModalOpen(false);
    setApprovalAction(null);
    setSelectedWithdrawal(null);
  };

  const handleCancel = (withdrawalId: string) => {
    const withdrawalToUpdate = withdrawals.find((w) => w.id === withdrawalId);
    if (withdrawalToUpdate) {
      onUpdateWithdrawal({
        ...withdrawalToUpdate,
        status: Status.Cancelled,
        remarks: 'ยกเลิกโดยผู้ใช้',
      });
    }
    setOpenDropdownId(null);
  };

  // Effect to close dropdown when modal opens, ensuring state updates correctly.
  useEffect(() => {
    if (isDetailsModalOpen || isApprovalModalOpen) {
      setOpenDropdownId(null);
    }
  }, [isDetailsModalOpen, isApprovalModalOpen]);

  // Effect to handle clicks outside the dropdown to close it.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        if (
          !(event.target as HTMLElement).closest('button[data-withdrawal-id]')
        ) {
          setOpenDropdownId(null);
        }
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  const renderActions = () => {
    const withdrawal = withdrawals.find((w) => w.id === openDropdownId);
    if (!withdrawal) return null;

    const actions = [
      <a
        key="view"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          handleViewDetails(withdrawal);
        }}
        className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        role="menuitem"
      >
        <EyeIcon className="mr-3 h-5 w-5" aria-hidden="true" />
        <span>ดูรายละเอียด</span>
      </a>,
    ];

    if (withdrawal.status === Status.PendingApproval) {
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
        </a>,
        <a
          key="cancel"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleCancel(withdrawal.id);
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
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              เบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย
            </h1>
            <p className="mt-1 text-slate-600">
              ติดตามและจัดการการเบิกสินค้าและอุปกรณ์
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Input
                type="search"
                placeholder="ค้นหา (เลขที่, สินค้า, ค่าใช้จ่าย, จำนวนเงิน, วันที่)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                title="ค้นหาด้วย: เลขที่เอกสารเบิก, สินค้า/อุปกรณ์, รายการค่าใช้จ่าย, จำนวนเงินที่เบิก, วันที่เบิก"
              />
            </div>
            <div className="w-48">
              <Select
                value={creatorFilter}
                onChange={(e) => {
                  setCreatorFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">ผู้เบิกทั้งหมด</option>
                {uniqueCreators.map((creator) => (
                  <option key={creator} value={creator}>
                    {creator}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              สร้างใบเบิก
            </Button>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden space-y-4 flex-grow min-h-0 overflow-y-auto">
          {paginatedWithdrawals.map((withdrawal) => {
            const fromWarehouse = warehouseMap.get(withdrawal.fromWarehouseId);
            const toWarehouse = withdrawal.toWarehouseId
              ? warehouseMap.get(withdrawal.toWarehouseId)
              : null;
            const totalGoodsAmount = withdrawal.items.reduce((sum, item) => {
              const product = productMap.get(item.productId);
              return sum + (product ? product.price * item.quantity : 0);
            }, 0);
            const totalExpenseAmount =
              withdrawal.expenses?.reduce((sum, exp) => sum + exp.amount, 0) ||
              0;
            const totalAmount = totalGoodsAmount + totalExpenseAmount;
            const recipientName = withdrawal.recipientId
              ? userMap.get(withdrawal.recipientId)
              : '-';

            return (
              <Card key={withdrawal.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p
                      className="font-bold text-primary hover:underline cursor-pointer"
                      onClick={() => handleViewDetails(withdrawal)}
                    >
                      {withdrawal.id}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={withdrawal.status} />
                    </div>
                  </div>
                  <div className="relative">
                    <Button
                      variant="icon"
                      data-withdrawal-id={withdrawal.id}
                      onClick={(e) => handleDropdownToggle(e, withdrawal.id)}
                      className="-mr-2 -mt-2"
                    >
                      <ManageIcon className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center">
                    <CalendarDaysIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
                    <span>{formatThaiDate(withdrawal.createdAt)}</span>
                  </div>
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
                    <span className="font-semibold text-slate-800">
                      ฿
                      {totalAmount.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <TruckIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">
                      {fromWarehouse?.name} &rarr; {toWarehouse?.name}{' '}
                      {toWarehouse?.type === 'รถ' &&
                        `(${toWarehouse.licensePlate})`}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
                    <span>ผู้สร้าง: {withdrawal.createdBy}</span>
                  </div>
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
                    <span>ผู้เบิก/ผู้รับเงิน: {recipientName}</span>
                  </div>
                </div>
              </Card>
            );
          })}
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>

        {/* Desktop View: Table */}
        <Card className="!p-0 flex-grow min-h-0 flex-col hidden md:flex">
          <div className="overflow-auto flex-grow">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase xl:table-cell hidden whitespace-nowrap"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    เลขที่เอกสารเบิก
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    วันที่เบิก
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-center text-sm font-medium text-slate-600 uppercase lg:table-cell hidden whitespace-nowrap"
                  >
                    จำนวนรายการ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    จำนวนเงินที่เบิก
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    เส้นทาง
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase xl:table-cell hidden whitespace-nowrap"
                  >
                    อ้างอิง
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    สถานะ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ผู้สร้าง
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ผู้เบิก/ผู้รับเงิน
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase xl:table-cell hidden whitespace-nowrap"
                  >
                    หมายเหตุ
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedWithdrawals.map((withdrawal, index) => {
                  const fromWarehouse = warehouseMap.get(
                    withdrawal.fromWarehouseId
                  );
                  const toWarehouse = withdrawal.toWarehouseId
                    ? warehouseMap.get(withdrawal.toWarehouseId)
                    : null;
                  const totalItemsCount =
                    (withdrawal.items?.length || 0) +
                    (withdrawal.expenses?.length || 0);

                  const totalGoodsAmount = withdrawal.items.reduce(
                    (sum, item) => {
                      const product = productMap.get(item.productId);
                      return (
                        sum + (product ? product.price * item.quantity : 0)
                      );
                    },
                    0
                  );
                  const totalExpenseAmount =
                    withdrawal.expenses?.reduce(
                      (sum, exp) => sum + exp.amount,
                      0
                    ) || 0;
                  const totalAmount = totalGoodsAmount + totalExpenseAmount;
                  const recipientName = withdrawal.recipientId
                    ? userMap.get(withdrawal.recipientId)
                    : '-';

                  return (
                    <tr key={withdrawal.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 xl:table-cell hidden">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer"
                        onClick={() => handleViewDetails(withdrawal)}
                      >
                        {withdrawal.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {formatThaiDate(withdrawal.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center lg:table-cell hidden">
                        {totalItemsCount}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-right">
                        ฿
                        {totalAmount.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        <div>
                          {fromWarehouse?.name || '-'} &rarr;{' '}
                          {toWarehouse?.name || '-'}
                        </div>
                        {toWarehouse?.type === 'รถ' && (
                          <div className="text-xs text-slate-400">
                            {toWarehouse.licensePlate}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 xl:table-cell hidden">
                        {withdrawal.referenceIds?.length || 0} รายการ
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={withdrawal.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {withdrawal.createdBy}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {recipientName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 truncate max-w-xs xl:table-cell hidden">
                        {withdrawal.remarks || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="inline-block text-left">
                          <Button
                            variant="icon"
                            data-withdrawal-id={withdrawal.id}
                            onClick={(e) =>
                              handleDropdownToggle(e, withdrawal.id)
                            }
                          >
                            <span className="sr-only">จัดการ</span>
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
            {renderActions()}
          </div>
        </div>
      )}

      <AddWithdrawalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreateWithdrawal={onCreateWithdrawal}
        withdrawals={withdrawals}
        users={users}
        warehouses={warehouses}
        jobs={jobs}
        customers={customers}
        currentUser={currentUser}
        products={products}
        stockMap={stockMap}
      />
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        action={approvalAction}
        item={selectedWithdrawal}
        onConfirm={handleConfirmApproval}
      />
      <WithdrawalDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        withdrawal={selectedWithdrawal}
        warehouses={warehouses}
        products={products}
      />
    </>
  );
};

export default Withdrawals;
