import React, { useCallback, useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Card } from '../../../components/common/Card';
import { Pagination } from '../../../components/common/Pagination';
import {
  DocumentCheckIcon,
  LoadingIcon,
  PlusIcon,
  ManageIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XCircleIcon,
} from '../../../assets/icons/Icons';
import { Button } from '../../../components/common/FormControls';
import { formatThaiDate } from '../../../utils/date';
import { AdjustmentModal } from '../../../components/features/inventory/adjustment/AdjustmentModal';
import { StockAdjustment as StockAdjustmentType } from '@/src/types/entity/app.interface';
import { StockAdjustmentDetailsModal } from '../../../components/features/inventory/adjustment/StockAdjustmentDetailsModal';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { Input } from '../../../components/common/FormControls';
import { StatusBadge } from '../../../components/common/StatusBadge';

import { useData } from '../../../contexts/DataContext';
import { StockAdjustmentApi } from '../../../api/stock-adjustment';

const StockAdjustment: React.FC = () => {
  // ดึงเฉพาะ master data ที่ใช้ใน modal — list ของใบ adjustment fetch เองในหน้านี้
  const {
    warehouses,
    products,
    warehouseStocks: stockMap,
  } = useData();

  const [adjustments, setAdjustments] = useState<StockAdjustmentType[]>([]);
  const [totalItemsServer, setTotalItemsServer] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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


  // Server-side fetch (page / limit / search)
  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await StockAdjustmentApi.getAll({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
      });
      if (res?.data) setAdjustments(res.data);
      if (res?.meta?.total !== undefined) {
        setTotalItemsServer(res.meta.total);
      } else if (res?.data) {
        setTotalItemsServer(res.data.length);
      }
    } catch (err) {
      console.error('Failed to fetch stock adjustments', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchDebounced]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Debounce searchQuery → searchDebounced
  useEffect(() => {
    if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
    searchDebounceTimerRef.current = setTimeout(() => {
      setSearchDebounced(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
    };
  }, [searchQuery]);

  // CRUD handlers — เรียก API ตรง + refresh list
  const onCreateAdjustment = async (data: any) => {
    try {
      await StockAdjustmentApi.create(data);
      Swal.fire({ icon: 'success', title: 'สร้างใบปรับปรุงแล้ว', timer: 1200, showConfirmButton: false });
      await fetchList();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถสร้างใบปรับปรุงได้', 'error');
    }
  };

  const onUpdateAdjustment = async (data: any) => {
    try {
      await StockAdjustmentApi.update(data.id, data);
      Swal.fire({ icon: 'success', title: 'บันทึกการแก้ไข', timer: 1200, showConfirmButton: false });
      await fetchList();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถแก้ไขได้', 'error');
    }
  };

  const onDeleteAdjustment = async (id: string) => {
    try {
      await StockAdjustmentApi.delete(id);
      Swal.fire({ icon: 'success', title: 'ลบเรียบร้อย', timer: 1200, showConfirmButton: false });
      await fetchList();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถลบได้', 'error');
    }
  };

  const totalItems = totalItemsServer;
  const paginatedAdjustments = adjustments;

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

  const onApproveAdjustment = async (adj: StockAdjustmentType) => {
    setOpenDropdownId(null);
    const r = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันการอนุมัติ',
      html: `อนุมัติใบปรับปรุง <strong>${(adj as { adjustment_code?: string }).adjustment_code || adj.id}</strong>?<br/><span class="text-xs text-slate-500">ระบบจะปรับ stock ตามรายการที่ระบุ</span>`,
      showCancelButton: true,
      confirmButtonText: 'อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
    });
    if (!r.isConfirmed) return;
    try {
      await StockAdjustmentApi.approve(adj.id);
      Swal.fire({ icon: 'success', title: 'อนุมัติแล้ว', timer: 1200, showConfirmButton: false });
      await fetchList();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถอนุมัติได้', 'error');
    }
  };

  const onRejectAdjustment = async (adj: StockAdjustmentType) => {
    setOpenDropdownId(null);
    const r = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการปฏิเสธ',
      html: `ปฏิเสธใบปรับปรุง <strong>${(adj as { adjustment_code?: string }).adjustment_code || adj.id}</strong>?`,
      input: 'textarea',
      inputLabel: 'เหตุผลการปฏิเสธ',
      inputPlaceholder: 'ระบุเหตุผล...',
      showCancelButton: true,
      confirmButtonText: 'ปฏิเสธ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      inputValidator: (v) => (!v || !v.trim() ? 'กรุณาระบุเหตุผล' : null),
    });
    if (!r.isConfirmed || !r.value) return;
    try {
      await StockAdjustmentApi.reject(adj.id, r.value.trim());
      Swal.fire({ icon: 'success', title: 'ปฏิเสธแล้ว', timer: 1200, showConfirmButton: false });
      await fetchList();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถปฏิเสธได้', 'error');
    }
  };

  const getActionItems = (adj: StockAdjustmentType) => {
    const items: Array<{
      label: string;
      icon: typeof EyeIcon;
      onClick: () => void;
      color: string;
      hoverBg: string;
    }> = [
      {
        label: 'ดูรายละเอียด',
        icon: EyeIcon,
        onClick: () => handleViewDetails(adj),
        color: 'text-slate-700',
        hoverBg: 'hover:bg-slate-50',
      },
    ];
    const status = (adj as { status?: string }).status;
    if (status === 'PENDING') {
      items.push(
        {
          label: 'อนุมัติ',
          icon: DocumentCheckIcon,
          onClick: () => onApproveAdjustment(adj),
          color: 'text-emerald-600',
          hoverBg: 'hover:bg-emerald-50',
        },
        {
          label: 'ปฏิเสธ',
          icon: XCircleIcon,
          onClick: () => onRejectAdjustment(adj),
          color: 'text-red-600',
          hoverBg: 'hover:bg-red-50',
        },
        {
          label: 'แก้ไข',
          icon: PencilIcon,
          onClick: () => handleEdit(adj),
          color: 'text-blue-600',
          hoverBg: 'hover:bg-blue-50',
        },
      );
    }
    items.push({
      label: 'ลบ',
      icon: TrashIcon,
      onClick: () => handleDelete(adj),
      color: 'text-red-600',
      hoverBg: 'hover:bg-red-50',
    });
    return items;
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              ปรับปรุง Stock
            </h1>
            <p className="mt-1 text-slate-600">
              จัดการและติดตามการปรับปรุงสต็อกสินค้า
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <PlusIcon className="h-5 w-5" />
            สร้างใบปรับปรุง Stock
          </Button>
        </div>

        <Card className="!p-4 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-80 flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหา (เลขที่, วันที่)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10"
                title="ค้นหาด้วย: เลขที่เอกสาร, วันที่ปรับปรุง"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-auto flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200 text-center">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ลำดับ</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">เลขที่เอกสาร</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">วันที่</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">คลัง</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จำนวนรายการ</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">สถานะ</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ผู้สร้าง</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-500">
                        <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-base font-medium">กำลังโหลดข้อมูล...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                        <DocumentCheckIcon className="w-12 h-12 text-slate-300 mb-3 opacity-50" />
                        <p className="text-lg font-medium">ไม่พบข้อมูลการปรับปรุง Stock</p>
                        <p className="text-sm mt-1">ลองเปลี่ยนคำค้นหา หรือสร้างใบปรับปรุงใหม่</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedAdjustments.map((adj, index) => (
                  <tr key={adj.id} className="hover:bg-slate-50 [&>td]:align-middle">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => handleViewDetails(adj)}
                    >
                      {(adj as { adjustment_code?: string }).adjustment_code || adj.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {formatThaiDate(adj.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {(adj as { warehouse?: { name?: string } }).warehouse?.name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {adj.items.length}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <StatusBadge status={adj.status || 'PENDING'} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {(() => {
                        const creator = (adj as {
                          created_by_user?: {
                            first_name?: string;
                            last_name?: string;
                            nick_name?: string;
                          };
                        }).created_by_user;
                        if (!creator) return 'ไม่ระบุ';
                        const fullName = `${creator.first_name || ''} ${creator.last_name || ''}`.trim();
                        return fullName || creator.nick_name || 'ไม่ระบุ';
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="inline-block">
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
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {(() => {
              const adjustment = adjustments.find((adj) => adj.id === openDropdownId);
              if (!adjustment) return null;
              return getActionItems(adjustment).map((action) => (
              <a
                key={action.label}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  action.onClick();
                }}
                className={`flex items-center w-full text-left px-4 py-2 text-sm transition-colors ${action.color} ${action.hoverBg}`}
                role="menuitem"
              >
                <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                <span>{action.label}</span>
              </a>
              ));
            })()}
          </div>
        </div>
      )}

      <AdjustmentModal
        isOpen={isAddModalOpen}
        mode="create"
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={onCreateAdjustment}
        warehouses={warehouses}
        products={products}
        stockMap={stockMap}
      />
      <AdjustmentModal
        isOpen={isEditModalOpen}
        mode="edit"
        initialValues={adjustmentToEdit}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={onUpdateAdjustment}
        warehouses={warehouses}
        products={products}
        stockMap={stockMap}
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
    </div>
  );
};

export default StockAdjustment;
