// ===== React =====
import Swal from '@/src/utils/swal';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ===== Types =====
import {
  Transfer as TransferType,
  Status,
  Warehouse as WarehouseType,
  Product,
} from '@/src/types/entity/app.interface';

import { TransferStatus } from '@/src/types/enums/inventory';

// ===== API =====
import { TransferApi } from '@/src/api/transfer';
import { WarehouseApi } from '@/src/api/warehouse';
import { ProductApi } from '@/src/api/product';
import DatePicker from '@/src/components/common/BuddhistDatePicker';

// ===== Components =====
import { AddTransferModal } from '../../../components/features/inventory/transfer/AddTransferModal';

import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { Card } from '../../../components/common/Card';
import { Input, Button } from '../../../components/common/FormControls';
import { DropdownSelect } from '../../../components/common/DropdownSelect';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { Pagination } from '../../../components/common/Pagination';
import { StatusBadge } from '../../../components/common/StatusBadge';

// ===== Utils =====
import { formatThaiDate } from '../../../utils/date';

// ===== Assets =====
import {
  CheckCircleIcon,
  DocumentCheckIcon,
  EyeIcon,
  LoadingIcon,
  ManageIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
} from '../../../assets/icons/Icons';

const Transfers: React.FC = () => {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [whRes, prodRes] = await Promise.all([
          WarehouseApi.getWarehouses({ limit: 1000 }),
          ProductApi.getProducts({ limit: 1000, is_active: true }),
        ]);
        setWarehouses(whRes.data || []);
        setProducts(prodRes.data || []);
      } catch (err) {
        console.error('Failed to fetch warehouses/products', err);
      }
    };
    fetchInitialData();
  }, []);

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [transferToEdit, setTransferToEdit] = useState<TransferType | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<TransferType | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fromWarehouseFilter, setFromWarehouseFilter] = useState('all');
  const [toWarehouseFilter, setToWarehouseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [totalItems, setTotalItems] = useState(0);

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await TransferApi.getAll({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
        ...(fromWarehouseFilter !== 'all' ? { from_warehouse_id: fromWarehouseFilter } : {}),
        ...(toWarehouseFilter !== 'all' ? { to_warehouse_id: toWarehouseFilter } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      setTransfers(res.data || []);
      setTotalItems(res.meta?.total ?? (res.data?.length ?? 0));
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchDebounced, startDate, endDate, fromWarehouseFilter, toWarehouseFilter, statusFilter]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Debounce searchQuery → searchDebounced (300ms)
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

  const handleCreateTransfer = async (data: any) => {
    try {
      await TransferApi.create(data);
      await fetchTransfers();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Failed to create transfer:', error);
      const apiData = (error as { response?: { data?: { message?: string | string[]; errors?: Record<string, string> } } })?.response?.data;
      const apiMsg = Array.isArray(apiData?.message)
        ? apiData?.message.join(', ')
        : apiData?.message
        || (apiData?.errors ? Object.values(apiData.errors).join(', ') : '');

      // Backend ส่ง "Insufficient stock for ..." มาตอน stock ไม่พอ
      const isInsufficientStock = typeof apiMsg === 'string' && /insufficient stock/i.test(apiMsg);

      Swal.fire({
        icon: 'error',
        title: isInsufficientStock ? 'ไม่สามารถสร้างการโอนย้ายได้' : 'เกิดข้อผิดพลาด',
        text: isInsufficientStock
          ? 'เนื่องจากจำนวนคงเหลือในคลังเท่ากับ 0'
          : apiMsg || 'ไม่สามารถสร้างการโอนย้ายได้',
        confirmButtonText: 'ตกลง',
      });
    }
  };

  const handleDeleteTransfer = async (id: string) => {
    try {
      // API delete endpoint? TransferNoteController doesn't have delete.
      Swal.fire({ icon: 'info', title: 'แจ้งเตือน', text: 'Delete transfer not supported by API yet.' });
    } catch (error) {
      console.error(error);
    }
  };

  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w.name])),
    [warehouses]
  );

  // Pagination ทำที่ API แล้ว — ใช้ผลที่ได้ตรงๆ
  const paginatedTransfers = transfers;

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (transfer: TransferType) => {
    setTransferToEdit(transfer);
    setIsViewMode(true);
    setIsAddModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleEdit = (transfer: TransferType) => {
    setTransferToEdit(transfer);
    setIsViewMode(false);
    setIsAddModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleSaveTransferEdit = async (updated: TransferType) => {
    if (!updated.id) {
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่พบรหัสเอกสาร', 'error');
      return;
    }
    try {
      await TransferApi.update(updated.id, updated as Partial<TransferType>);
      await fetchTransfers();
      Swal.fire({ icon: 'success', title: 'บันทึกแล้ว', timer: 1200, showConfirmButton: false });
    } catch (err) {
      const data = (err as { response?: { data?: { message?: string | string[]; errors?: Record<string, string> } } })?.response?.data;
      const msg = Array.isArray(data?.message)
        ? data?.message.join(', ')
        : data?.message
        || (data?.errors ? Object.values(data.errors).join(', ') : '')
        || 'ไม่สามารถบันทึกการแก้ไขได้';
      Swal.fire('เกิดข้อผิดพลาด', msg, 'error');
    }
  };

  const handleCancel = async (transfer: TransferType) => {
    setOpenDropdownId(null);
    const r = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการยกเลิก',
      html: `ยกเลิกใบโอนย้าย <strong>${transfer.code || transfer.id}</strong>`,
      input: 'textarea',
      inputLabel: 'เหตุผลการยกเลิก',
      inputPlaceholder: 'กรอกเหตุผล...',
      showCancelButton: true,
      confirmButtonText: 'ยกเลิกใบนี้',
      cancelButtonText: 'ปิด',
      confirmButtonColor: '#ef4444',
      inputValidator: (v) => (!v || !v.trim() ? 'กรุณากรอกเหตุผล' : null),
    });
    if (!r.isConfirmed || !r.value) return;
    const target = transfer.id || transfer.code;
    if (!target) {
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่พบรหัสเอกสาร', 'error');
      return;
    }
    try {
      await TransferApi.updateStatus(target, TransferStatus.CANCELLED, r.value.trim());
      await fetchTransfers();
      Swal.fire({ icon: 'success', title: 'ยกเลิกแล้ว', timer: 1500, showConfirmButton: false });
    } catch (err) {
      const data = (err as { response?: { data?: { message?: string | string[]; errors?: Record<string, string> } } })?.response?.data;
      const msg = Array.isArray(data?.message)
        ? data?.message.join(', ')
        : data?.message
        || (data?.errors ? Object.values(data.errors).join(', ') : '')
        || 'ไม่สามารถยกเลิกได้';
      Swal.fire('เกิดข้อผิดพลาด', msg, 'error');
    }
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

  const handleReject = async (transfer: TransferType) => {
    const r = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการไม่อนุมัติ',
      html: `ไม่อนุมัติใบโอนย้าย <strong>${transfer.code || transfer.id}</strong>`,
      input: 'textarea',
      inputLabel: 'เหตุผลการไม่อนุมัติ',
      inputPlaceholder: 'กรอกเหตุผล...',
      showCancelButton: true,
      confirmButtonText: 'ไม่อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      inputValidator: (v) => (!v || !v.trim() ? 'กรุณากรอกเหตุผล' : null),
    });
    if (!r.isConfirmed || !r.value) return;
    const target = transfer.id || transfer.code;
    if (!target) {
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่พบรหัสเอกสาร', 'error');
      return;
    }
    try {
      await TransferApi.updateStatus(target, TransferStatus.REJECTED, r.value.trim());
      await fetchTransfers();
      Swal.fire({ icon: 'success', title: 'ไม่อนุมัติแล้ว', timer: 1500, showConfirmButton: false });
    } catch (err) {
      const data = (err as { response?: { data?: { message?: string | string[]; errors?: Record<string, string> } } })?.response?.data;
      const msg = Array.isArray(data?.message)
        ? data?.message.join(', ')
        : data?.message
        || (data?.errors ? Object.values(data.errors).join(', ') : '')
        || 'ไม่สามารถดำเนินการได้';
      Swal.fire('เกิดข้อผิดพลาด', msg, 'error');
    }
  };

  const handleApprove = async (transfer: TransferType) => {
    const r = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันการอนุมัติ',
      html: `อนุมัติใบโอนย้าย <strong>${transfer.code || transfer.id}</strong> ใช่หรือไม่?<br/><span class="text-xs text-slate-500">ระบบจะดำเนินการโอนย้ายสินค้าระหว่างคลังตามรายการ</span>`,
      showCancelButton: true,
      confirmButtonText: 'อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
    });
    if (!r.isConfirmed) return;
    const target = transfer.id || transfer.code;
    if (!target) {
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่พบรหัสเอกสาร', 'error');
      return;
    }
    try {
      await TransferApi.updateStatus(target, TransferStatus.APPROVED);
      await fetchTransfers();
      Swal.fire({ icon: 'success', title: 'อนุมัติแล้ว', timer: 1200, showConfirmButton: false });
    } catch (err) {
      const data = (err as { response?: { data?: { message?: string | string[]; errors?: Record<string, string> } } })?.response?.data;
      const msg = Array.isArray(data?.message)
        ? data?.message.join(', ')
        : data?.message
        || (data?.errors ? Object.values(data.errors).join(', ') : '')
        || 'ไม่สามารถอนุมัติได้';
      Swal.fire('เกิดข้อผิดพลาด', msg, 'error');
    }
  };

  const actions = [
    {
      label: 'ดูรายละเอียด',
      icon: EyeIcon,
      handler: handleViewDetails,
      color: 'text-slate-700',
      hoverBg: 'hover:bg-slate-50',
    },
    {
      label: 'อนุมัติ',
      icon: CheckCircleIcon,
      handler: handleApprove,
      color: 'text-emerald-600',
      hoverBg: 'hover:bg-emerald-50',
      show: (t: TransferType) => t.status === TransferStatus.PENDING,
    },
    {
      label: 'แก้ไข',
      icon: PencilIcon,
      handler: handleEdit,
      color: 'text-blue-600',
      hoverBg: 'hover:bg-blue-50',
      show: (t: TransferType) => t.status === TransferStatus.DRAFT,
    },
    {
      label: 'ไม่อนุมัติ',
      icon: XCircleIcon,
      handler: handleReject,
      color: 'text-red-600',
      hoverBg: 'hover:bg-red-50',
      show: (t: TransferType) => t.status === TransferStatus.PENDING,
    },
    {
      label: 'ยกเลิก',
      icon: TrashIcon,
      handler: handleCancel,
      color: 'text-red-600',
      hoverBg: 'hover:bg-red-50',
      show: (t: TransferType) =>
        t.status === TransferStatus.DRAFT || t.status === TransferStatus.PENDING,
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">โอนย้ายสินค้า</h1>
            <p className="mt-1 text-slate-600">
              จัดการการโอนย้ายสินค้าระหว่างคลัง
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} variant="primary">
            <PlusIcon className="h-5 w-5" />
            สร้างใบโอนย้าย
          </Button>
        </div>

        <Card className="!p-4 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center">
            <div className="relative w-full sm:w-80 sm:flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหาเลขที่เอกสารโอนย้าย"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10"
                title="ค้นหาด้วย: เลขที่เอกสารโอนย้าย"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="w-full sm:w-48 sm:flex-shrink-0">
              <SearchableSelect
                value={fromWarehouseFilter === 'all' ? '' : fromWarehouseFilter}
                onChange={(v) => {
                  setFromWarehouseFilter(v || 'all');
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'คลังต้นทางทั้งหมด' },
                  ...warehouses.map((wh) => ({ value: wh.id, label: wh.name })),
                ]}
                placeholder="คลังต้นทางทั้งหมด"
              />
            </div>
            <div className="w-full sm:w-48 sm:flex-shrink-0">
              <SearchableSelect
                value={toWarehouseFilter === 'all' ? '' : toWarehouseFilter}
                onChange={(v) => {
                  setToWarehouseFilter(v || 'all');
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'คลังปลายทางทั้งหมด' },
                  ...warehouses.map((wh) => ({ value: wh.id, label: wh.name })),
                ]}
                placeholder="คลังปลายทางทั้งหมด"
              />
            </div>
            <DropdownSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
              className="w-full sm:w-fit text-sm"
              options={[
                { value: 'all', label: 'สถานะทั้งหมด' },
                { value: 'DRAFT', label: 'ฉบับร่าง' },
                { value: 'PENDING', label: 'รออนุมัติ' },
                { value: 'APPROVED', label: 'อนุมัติแล้ว' },
                { value: 'REJECTED', label: 'ไม่อนุมัติ' },
                { value: 'CANCELLED', label: 'ยกเลิก' },
              ]}
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <DatePicker
                selected={startDate ? new Date(startDate) : null}
                onChange={(date: Date | null) => {
                  setStartDate(date ? date.toISOString().substring(0, 10) : '');
                  setCurrentPage(1);
                }}
                dateFormat="dd/MM/yyyy"
                locale="th"
                placeholderText="เริ่มต้น"
                isClearable
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
                wrapperClassName="flex-1 sm:flex-none sm:w-36"
              />
              <span className="text-slate-400">-</span>
              <DatePicker
                selected={endDate ? new Date(endDate) : null}
                onChange={(date: Date | null) => {
                  setEndDate(date ? date.toISOString().substring(0, 10) : '');
                  setCurrentPage(1);
                }}
                dateFormat="dd/MM/yyyy"
                locale="th"
                placeholderText="สิ้นสุด"
                isClearable
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
                wrapperClassName="flex-1 sm:flex-none sm:w-36"
              />
            </div>
          </div>
        </Card>

        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-auto flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200 text-center">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ลำดับ</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">เลขที่เอกสารโอนย้าย</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">วันที่โอนย้าย</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">คลังต้นทาง</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">คลังปลายทาง</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จำนวนสินค้า</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">สถานะ</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ผู้สร้าง</th>
                  <th scope="col" className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-500">
                        <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-base font-medium">กำลังโหลดข้อมูลการโอนย้าย...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                        <DocumentCheckIcon className="w-12 h-12 text-slate-300 mb-3 opacity-50" />
                        <p className="text-lg font-medium">ไม่พบข้อมูลการโอนย้าย</p>
                        <p className="text-sm mt-1">ลองเปลี่ยนคำค้นหา หรือสร้างใบโอนย้ายใหม่</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedTransfers.map((transfer, index) => {
                  const fromWarehouse =
                    warehouseMap.get(transfer.from_warehouse_id) ||
                    (transfer as unknown as Record<string, Record<string, string>>).from_warehouse?.name;
                  const toWarehouse =
                    warehouseMap.get(transfer.to_warehouse_id) ||
                    (transfer as unknown as Record<string, Record<string, string>>).to_warehouse?.name;
                  const totalQuantity =
                    transfer.items?.reduce(
                      (sum, item) =>
                        sum + Number(item.qty || item.quantity || 0),
                      0
                    ) || 0;

                  return (
                    <tr key={transfer.id} className="hover:bg-slate-50 [&>td]:align-middle">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer"
                        onClick={() => handleViewDetails(transfer)}
                      >
                        {transfer.code || transfer.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {formatThaiDate(transfer.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {fromWarehouse || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {toWarehouse || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {totalQuantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={transfer.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {(() => {
                          const u = (transfer as { created_by_user?: { first_name?: string; last_name?: string; nick_name?: string } }).created_by_user;
                          if (!u) return 'ไม่กรอก';
                          const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                          return full || u.nick_name || 'ไม่กรอก';
                        })()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="inline-block">
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
                  className={`flex items-center w-full text-left px-4 py-2 text-sm transition-colors ${action.color} ${action.hoverBg}`}
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
        onClose={() => {
          setIsAddModalOpen(false);
          setTransferToEdit(null);
          setIsViewMode(false);
        }}
        onCreateTransfer={handleCreateTransfer}
        onUpdateTransfer={handleSaveTransferEdit}
        editingTransfer={transferToEdit}
        viewOnly={isViewMode}
        transfers={transfers}
        warehouses={warehouses}
        products={products}
        stockMap={stockMap}
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
    </div>
  );
};

export default Transfers;
