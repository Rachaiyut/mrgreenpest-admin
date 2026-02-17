import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  PencilIcon,
} from '../../../assets/icons/Icons';
import { formatThaiDate } from '../../../utils/date';
import {
  Withdrawal as WithdrawalType,
  Warehouse as WarehouseEntity,
} from '@/src/types/entity/inventory.interface';
import { WarehouseType, WithdrawalStatus } from '@/src/types/enums/inventory';
import {
  Status,
  User,
  FieldJob,
  Customer,
  Product,
} from '@/src/types/entity/app.interface';
import { AddWithdrawalModal } from '../../../components/features/inventory/AddWithDrawModal';
import { EditWithdrawalModal } from '../../../components/features/inventory/EditWithdrawalModal';
import { ApprovalModal } from '../../../components/common/ApprovalModal';
import { WithdrawalDetailsModal } from '../../../components/features/inventory/WithdrawalDetailsModal';
import { Input, Select, Button } from '../../../components/common/FormControls';

import { useData } from '../../../contexts/DataContext';

const Withdrawals: React.FC = () => {
  const {
    withdrawals,
    users,
    warehouses,
    jobs,
    customers,
    products,
    assessments,
    contracts,
    handlers,
  } = useData();

  const onCreateWithdrawal = async (data: Omit<WithdrawalType, 'id'>) => {
    try {
      await handlers.withdrawals.create(data);
      // Optional: Show success toast
    } catch (error: any) {
      console.error('Failed to create withdrawal', error);
      if (error.response && error.response.data && error.response.data.message) {
        alert(error.response.data.message);
      } else {
        alert('ไม่สามารถสร้างใบเบิกได้');
      }
    }
  };

  const onUpdateWithdrawal = async (updatedItem: WithdrawalType) => {
    try {
      await handlers.withdrawals.update(updatedItem);
      // Optional: Show success toast
    } catch (error) {
      console.error('Failed to update withdrawal', error);
    }
  };

  const onDeleteWithdrawal = async (id: string) => {
    try {
      await handlers.withdrawals.delete(id);
      // Optional: Show success toast
    } catch (error) {
      console.error('Failed to delete withdrawal', error);
    }
  };

  const stockMap = useMemo(() => new Map<string, Map<string, number>>(), []);
  const currentUser = users.length > 0 ? users[0] : null;

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
    () => new Map(users.map((u) => {
      let name = u.name;
      if (typeof name !== 'string' || name === '[object Object]') {
        name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.nick_name || 'Unknown';
      }
      return [u.id, name];
    })),
    [users]
  );

  const uniqueCreators = useMemo(
    () => [...new Set(withdrawals.map((w) => w.created_by))],
    [withdrawals]
  );

  const filteredWithdrawals = useMemo(() => {
    let filtered = [...withdrawals].reverse();

    // Filter by creator
    if (creatorFilter !== 'all') {
      filtered = filtered.filter((w) => w.created_by === creatorFilter);
    }

    // Filter by search query
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (lowercasedQuery) {
      filtered = filtered.filter((withdrawal) => {
        const totalGoodsAmount = withdrawal.items?.reduce((sum, item) => {
          const product = productMap.get(item.product_id);
          return sum + (product ? product.price * item.quantity : 0);
        }, 0) || 0;
        const totalExpenseAmount =
          withdrawal.expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
        const totalAmount = totalGoodsAmount + totalExpenseAmount;

        const productNames = (withdrawal.items || [])
          .map((item) => productMap.get(item.product_id)?.name || '')
          .join(' ')
          .toLowerCase();

        const expenseDescriptions = (
          withdrawal.expenses?.map((exp) => exp.description) || []
        )
          .join(' ')
          .toLowerCase();

        return (
          (withdrawal.id || '').toLowerCase().includes(lowercasedQuery) ||
          productNames.includes(lowercasedQuery) ||
          expenseDescriptions.includes(lowercasedQuery) ||
          totalAmount.toString().includes(lowercasedQuery) ||
          (withdrawal.created_at && formatThaiDate(withdrawal.created_at).includes(lowercasedQuery))
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

  const handleEditWithdrawal = (withdrawal: WithdrawalType) => {
    setSelectedWithdrawal(withdrawal);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
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
          approvalAction === 'approve'
            ? WithdrawalStatus.APPROVED
            : WithdrawalStatus.REJECTED,
        notes: remarks,
        // approvedBy: 'ผู้ดูแลระบบ', // Mock approver - field might not exist in type
        updated_by: 'ผู้ดูแลระบบ',
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
        status: WithdrawalStatus.CANCELLED,
        notes: 'ยกเลิกโดยผู้ใช้',
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

  const getActionItems = (withdrawal: WithdrawalType) => {
    const actions = [
      {
        label: 'ดูรายละเอียด',
        icon: EyeIcon,
        color: 'text-slate-700',
        hoverBg: 'hover:bg-slate-50',
        onClick: () => handleViewDetails(withdrawal),
      },
    ];

    // Allow editing for Draft and PendingApproval statuses
    if (
      withdrawal.status === WithdrawalStatus.DRAFT ||
      withdrawal.status === WithdrawalStatus.PENDING ||
      withdrawal.status === Status.Draft ||
      withdrawal.status === Status.PendingApproval
    ) {
      actions.push({
        label: 'แก้ไข',
        icon: PencilIcon,
        color: 'text-blue-600',
        hoverBg: 'hover:bg-blue-50',
        onClick: () => handleEditWithdrawal(withdrawal),
      });
    }

    if (
      withdrawal.status === WithdrawalStatus.PENDING ||
      withdrawal.status === Status.PendingApproval
    ) {
      actions.push(
        {
          label: 'อนุมัติ',
          icon: DocumentCheckIcon,
          color: 'text-green-600',
          hoverBg: 'hover:bg-green-50',
          onClick: () => handleApprovalAction('approve'),
        },
        {
          label: 'ไม่อนุมัติ',
          icon: XCircleIcon,
          color: 'text-red-600',
          hoverBg: 'hover:bg-red-50',
          onClick: () => handleApprovalAction('reject'),
        },
        {
          label: 'ยกเลิก',
          icon: TrashIcon,
          color: 'text-red-600',
          hoverBg: 'hover:bg-red-50',
          onClick: () => handleCancel(withdrawal.id),
        }
      );
    }

    return actions;
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">เบิกสินค้าเข้าคลังย่อย</h1>
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
            const fromWarehouse = warehouseMap.get(withdrawal.warehouse_id);
            const toWarehouse = withdrawal.to_warehouse_id
              ? warehouseMap.get(withdrawal.to_warehouse_id)
              : null;
            const totalGoodsAmount = withdrawal.items?.reduce((sum, item) => {
              const product = productMap.get(item.product_id);
              return sum + (product ? product.price * item.quantity : 0);
            }, 0) || 0;
            const totalExpenseAmount =
              withdrawal.expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) ||
              0;
            const totalAmount = totalGoodsAmount + totalExpenseAmount;
            const recipientName = withdrawal.recipient_id
              ? userMap.get(withdrawal.recipient_id)
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
                    <span>{withdrawal.created_at ? formatThaiDate(withdrawal.created_at) : '-'}</span>
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
                      {toWarehouse?.type === 'VEHICLE' && // Assuming string check if enum not available easily or map
                        `(${toWarehouse.vehicle?.vehicle_registration || '-'})`}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
                    <span>ผู้สร้าง: {withdrawal.created_by}</span>
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
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase xl:table-cell hidden whitespace-nowrap"
                  >
                    อ้างอิง
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
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
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
                {paginatedWithdrawals.map((withdrawal, index) => {
                  const fromWarehouse = warehouseMap.get(
                    withdrawal.warehouse_id
                  );
                  const toWarehouse = withdrawal.to_warehouse_id
                    ? warehouseMap.get(withdrawal.to_warehouse_id)
                    : null;
                  const totalItemsCount =
                    (withdrawal.items?.length || 0) +
                    (withdrawal.expenses?.length || 0);

                  const totalGoodsAmount = withdrawal.items?.reduce(
                    (sum, item) => {
                      const product = productMap.get(item.product_id);
                      return (
                        sum + (product ? product.price * item.quantity : 0)
                      );
                    },
                    0
                  ) || 0;
                  const totalExpenseAmount =
                    withdrawal.expenses?.reduce(
                      (sum, exp) => sum + Number(exp.amount),
                      0
                    ) || 0;
                  const totalAmount = totalGoodsAmount + totalExpenseAmount;
                  const recipientName = withdrawal.recipient_id
                    ? (userMap.get(withdrawal.recipient_id) || '-')
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
                        {withdrawal.code}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {withdrawal.created_at ? formatThaiDate(withdrawal.created_at) : '-'}
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 xl:table-cell hidden">
                        {(Array.isArray(withdrawal.reference_ids) ? withdrawal.reference_ids.length : 0)} รายการ
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {(() => {
                          const creatorName = userMap.get(withdrawal.created_by) || withdrawal.created_by;
                          return creatorName === '[object Object]' ? 'Unknown' : creatorName;
                        })()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {recipientName === '[object Object]' ? 'Unknown' : recipientName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={withdrawal.status} />
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

      {openDropdownId && dropdownPosition && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999]"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {(() => {
              const withdrawal = withdrawals.find((w) => w.id === openDropdownId);
              if (!withdrawal) return null;

              return getActionItems(withdrawal).map((action, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    action.onClick();
                  }}
                  className={`flex items-center w-full text-left px-4 py-2 text-sm transition-colors ${action.color} ${action.hoverBg}`}
                  role="menuitem"
                >
                  <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                  <span>{action.label}</span>
                </button>
              ));
            })()}
          </div>
        </div>,
        document.body
      )}

      <AddWithdrawalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreateWithdrawal={onCreateWithdrawal}
        withdrawals={withdrawals}
        users={users}
        warehouses={warehouses}
        jobs={jobs as any}
        customers={customers}
        products={products}
        stockMap={stockMap}
        assessments={assessments}
        contracts={contracts} currentUser={undefined}      
      />
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        action={approvalAction}
        item={selectedWithdrawal as any}
        onConfirm={handleConfirmApproval}
      />
      <WithdrawalDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        withdrawal={selectedWithdrawal}
        warehouses={warehouses}
        products={products}
        users={users}
      />
      <EditWithdrawalModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedWithdrawal(null);
        }}
        onUpdateWithdrawal={onUpdateWithdrawal}
        withdrawal={selectedWithdrawal}
        users={users}
        warehouses={warehouses}
        jobs={jobs as any}
        customers={customers}
        products={products}
        stockMap={stockMap}
        assessments={assessments}
        contracts={contracts}
      />
    </>
  );
};

export default Withdrawals;
