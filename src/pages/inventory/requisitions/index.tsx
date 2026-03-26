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
import { AddRequisitionModal } from '../../../components/features/inventory/AddRequisitionModal';
import {
  Requisition as RequisitionType,
  RequisitionStatus,
} from '@/src/types/entity/requisition.interface';
// import { RequisitionDetailsModal } from '../../../components/features/inventory/RequisitionDetailsModal';
import { RequisitionDetailsModal } from '../../../components/features/inventory/RequisitionDetailsModal';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { ApprovalModal } from '../../../components/common/ApprovalModal';
import { Input } from '../../../components/common/FormControls';
import { ApprovalStatus } from '@/src/types/entity/requisition.interface';

import { useData } from '../../../contexts/DataContext';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { UserApi } from '../../../api/user';

interface RequisitionsProps {}

const Requisitions: React.FC<RequisitionsProps> = () => {
  const {
    requisitions,
    products,
    warehouses,
    handlers: { requisitions: requisitionHandlers },
  } = useData();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] =
    useState<RequisitionType | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<
    'approve' | 'reject' | null
  >(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [requisitionToDelete, setRequisitionToDelete] =
    useState<RequisitionType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [userOptions, setUserOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    const fetchInitialUsers = async () => {
      try {
        const res = await UserApi.getAll({ limit: 20 });
        if (res && res.data) {
          setUserOptions(res.data.map((u) => ({ value: u.id, label: u.name })));
        } else if (Array.isArray(res)) {
          setUserOptions(
            (res as any).map((u: any) => ({ value: u.id, label: u.name }))
          );
        }
      } catch (error) {
        console.error('Failed to fetch initial users', error);
      }
    };
    fetchInitialUsers();
  }, []);

  const handleUserSearch = async (search: string) => {
    if (!search) {
      // If search is cleared, maybe reset to initial list or just keep current options
      const res = await UserApi.getAll({ limit: 20 });
      if (res && res.data) {
        setUserOptions(res.data.map((u) => ({ value: u.id, label: u.name })));
      } else if (Array.isArray(res)) {
        setUserOptions(
          (res as any).map((u: any) => ({ value: u.id, label: u.name }))
        );
      }
      return;
    }
    try {
      const res = await UserApi.getAll({ search, limit: 20 });
      if (res && res.data) {
        setUserOptions(res.data.map((u) => ({ value: u.id, label: u.name })));
      } else if (Array.isArray(res)) {
        setUserOptions(
          (res as any).map((u: any) => ({ value: u.id, label: u.name }))
        );
      }
    } catch (error) {
      console.error('Failed to search users', error);
    }
  };

  const filteredRequisitions = useMemo(() => {
    if (!requisitions) return [];
    let result = [...requisitions].reverse();

    if (requesterId) {
      result = result.filter(
        (item) =>
          (typeof item.requester_id === 'string' &&
            item.requester_id === requesterId) ||
          (typeof item.requester === 'object' &&
            item.requester?.id === requesterId)
      );
    }

    if (searchQuery.trim()) {
      const lowercasedQuery = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.doc_no && item.doc_no.toLowerCase().includes(lowercasedQuery)
      );
    }

    return result;
  }, [requisitions, searchQuery, requesterId]);

  const totalItems = filteredRequisitions.length;
  const paginatedRequisitions = filteredRequisitions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleDelete = (req: RequisitionType) => {
    setRequisitionToDelete(req);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (requisitionToDelete) {
      await requisitionHandlers.delete(requisitionToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setRequisitionToDelete(null);
  };

  const handleViewDetails = (req: RequisitionType) => {
    setSelectedRequisition(req);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleApprovalAction = (
    req: RequisitionType,
    action: 'approve' | 'reject'
  ) => {
    setSelectedRequisition(req);
    setApprovalAction(action);
    setIsApprovalModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmApproval = async (itemId: string, remarks: string) => {
    if (selectedRequisition) {
      await requisitionHandlers.approve(selectedRequisition.id, {
        status:
          approvalAction === 'approve'
            ? ApprovalStatus.APPROVED
            : ApprovalStatus.REJECTED,
        remark: remarks,
      });
    }
    setIsApprovalModalOpen(false);
    setApprovalAction(null);
    setSelectedRequisition(null);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    reqId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === reqId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setOpenDropdownId(reqId);
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
      if ((event.target as HTMLElement).closest('button[data-req-id]')) {
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
    {
      label: 'ดูรายละเอียด',
      icon: EyeIcon,
      isDanger: false,
      onClick: (req: RequisitionType) => handleViewDetails(req),
    },
    // { label: 'แก้ไข', icon: PencilIcon, isDanger: false, onClick: () => { } }, // Implement edit later
    {
      label: 'อนุมัติ',
      icon: EyeIcon,
      isDanger: false,
      onClick: (req: RequisitionType) => handleApprovalAction(req, 'approve'),
    }, // Using EyeIcon as placeholder or need CheckIcon
    {
      label: 'ปฏิเสธ',
      icon: TrashIcon,
      isDanger: true,
      onClick: (req: RequisitionType) => handleApprovalAction(req, 'reject'),
    },
    {
      label: 'ลบ',
      icon: TrashIcon,
      isDanger: true,
      onClick: (req: RequisitionType) => handleDelete(req),
    },
  ];

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              ใบเบิกสินค้า (Requisitions)
            </h1>
            <p className="mt-1 text-slate-600">
              จัดการใบเบิกสินค้าและค่าใช้จ่าย
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <SearchableSelect
                options={userOptions}
                value={requesterId}
                onChange={(val) => {
                  setRequesterId(val);
                  setCurrentPage(1);
                }}
                onSearchChange={handleUserSearch}
                placeholder="ค้นหาตามผู้เบิก..."
              />
            </div>
            <div className="w-64">
              <Input
                type="search"
                placeholder="ค้นหา (เลขที่)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset page on search
                }}
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              สร้างใบเบิก
            </Button>
          </div>
        </div>

        <Card className="!p-0 flex-grow min-h-0 flex flex-col">
          <div className="overflow-auto flex-grow">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    ลำดับ
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    เลขที่เอกสาร
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    ประเภท
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    วันที่เบิก
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    ผู้เบิก
                  </th>
                  <th className="px-4 py-2.5 text-center text-sm font-medium text-slate-600 uppercase">
                    สถานะ
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedRequisitions.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => handleViewDetails(item)}
                    >
                      {item.doc_no}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {item.type}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {item.request_date
                        ? formatThaiDate(item.request_date)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {item.requester?.name || item.requester_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${
                          item.status === RequisitionStatus.APPROVED
                            ? 'bg-green-100 text-green-800'
                            : item.status === RequisitionStatus.REJECTED
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="inline-block text-left">
                        <Button
                          data-req-id={item.id}
                          onClick={(e) => handleDropdownToggle(e, item.id)}
                          variant="icon"
                          title="ตัวเลือก"
                        >
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
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-30"
          role="menu"
        >
          <div className="py-1" role="none">
            {actions.map((action) => (
              <a
                key={action.label}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const req = requisitions.find((r) => r.id === openDropdownId);
                  if (!req) {
                    setOpenDropdownId(null);
                    return;
                  }
                  action.onClick(req);
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

      {/* Placeholders for Modals */}
      <AddRequisitionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        products={products}
      />

      <RequisitionDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        requisition={selectedRequisition}
        products={products}
        warehouses={warehouses}
      />

      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        action={approvalAction}
        item={selectedRequisition}
        onConfirm={handleConfirmApproval}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={<p>คุณแน่ใจหรือไม่ว่าต้องการลบใบเบิกนี้?</p>}
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
    </>
  );
};

export default Requisitions;
