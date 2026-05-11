import React, { useMemo, useState, useEffect } from 'react';
import { Card } from '../../../components/common/Card';
import { Pagination } from '../../../components/common/Pagination';
import { ActionDropdown, ActionDropdownItem } from '../../../components/common/ActionDropdown';
import {
  DocumentCheckIcon,
  PlusIcon,
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
// import { RequisitionDetailsModal } from '../../../components/features/inventory/requisition/RequisitionDetailsModal';
import { RequisitionDetailsModal } from '../../../components/features/inventory/requisition/RequisitionDetailsModal';
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
            (Array.isArray(res) ? res : []).map((u: Record<string, string>) => ({ value: u.id, label: u.name }))
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
          (Array.isArray(res) ? res : []).map((u: Record<string, string>) => ({ value: u.id, label: u.name }))
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
          (Array.isArray(res) ? res : []).map((u: Record<string, string>) => ({ value: u.id, label: u.name }))
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

  const getActions = (req: RequisitionType): ActionDropdownItem[] => [
    {
      label: 'ดูรายละเอียด',
      icon: EyeIcon,
      onClick: () => handleViewDetails(req),
    },
    {
      label: 'อนุมัติ',
      icon: EyeIcon,
      onClick: () => handleApprovalAction(req, 'approve'),
      isPrimary: true,
    },
    {
      label: 'ปฏิเสธ',
      icon: TrashIcon,
      onClick: () => handleApprovalAction(req, 'reject'),
      isDanger: true,
    },
    {
      label: 'ลบ',
      icon: TrashIcon,
      onClick: () => handleDelete(req),
      isDanger: true,
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              ใบเบิกสินค้า (Requisitions)
            </h1>
            <p className="mt-1 text-slate-600">
              จัดการใบเบิกสินค้าและค่าใช้จ่าย
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <PlusIcon className="h-5 w-5" />
            สร้างใบเบิก
          </Button>
        </div>

        <Card className="!p-4 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-80 flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหา (เลขที่)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="w-full sm:w-64 flex-shrink-0">
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
          </div>
        </Card>

        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-auto flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
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
                  <th scope="col" className="relative px-6 py-3 text-center">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedRequisitions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                        <DocumentCheckIcon className="w-12 h-12 text-slate-300 mb-3 opacity-50" />
                        <p className="text-lg font-medium">ไม่พบข้อมูลใบเบิกสินค้า</p>
                        <p className="text-sm mt-1">ลองเปลี่ยนคำค้นหา หรือสร้างใบเบิกใหม่</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRequisitions.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
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
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                      <ActionDropdown
                        itemId={item.id}
                        openId={openDropdownId}
                        onToggle={setOpenDropdownId}
                        actions={getActions(item)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-auto border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default Requisitions;
