import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Swal from '@/src/utils/swal';

// ===== Types =====
import {
  ReturnToSupplier,
  Status,
  Warehouse as WarehouseType,
  Supplier,
  Product,
} from '@/src/types/entity/app.interface';

// ===== API =====
import { ReturnToSupplierApi } from '@/src/api/return-to-supplier';
import { WarehouseApi } from '@/src/api/warehouse';
import { SupplierApi } from '@/src/api/supplier';
import { ProductApi } from '@/src/api/product';
import DatePicker from '@/src/components/common/BuddhistDatePicker';

// ===== Components =====
import { Card } from '../../../components/common/Card';
import { Input, Button } from '../../../components/common/FormControls';
import { DropdownSelect } from '../../../components/common/DropdownSelect';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { Pagination } from '../../../components/common/Pagination';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { AddReturnToSupplierModal } from '../../../components/features/inventory/return-to-supplier/AddReturnToSupplierModal';

// ===== Utils =====
import { formatThaiDate } from '../../../utils/date';

// ===== Assets =====
import {
  PlusIcon,
  ManageIcon,
  EyeIcon,
  DocumentCheckIcon,
  XCircleIcon,
  TrashIcon,
  PencilIcon,
  LoadingIcon,
} from '../../../assets/icons/Icons';

const ReturnToSupplierPage: React.FC = () => {
  // ===== Master data (local fetch with limit 1000) =====
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // ===== List state =====
  const [returns, setReturns] = useState<ReturnToSupplier[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // ===== Filters =====
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // ===== Modals =====
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingReturn, setEditingReturn] = useState<ReturnToSupplier | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<ReturnToSupplier | null>(null);

  // ===== Dropdown =====
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ===== Master fetch on mount =====
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const [whRes, supRes, prodRes] = await Promise.all([
          WarehouseApi.getWarehouses({ limit: 1000 }),
          SupplierApi.getSuppliers({ limit: 1000, is_active: true }),
          ProductApi.getProducts({ limit: 1000, is_active: true }),
        ]);
        setWarehouses((whRes.data || []) as WarehouseType[]);
        setSuppliers((supRes.data || []) as Supplier[]);
        setProducts((prodRes.data || []) as Product[]);
      } catch (err) {
        console.error('Failed to fetch master data', err);
      }
    };
    fetchMaster();
  }, []);

  // ===== List fetch =====
  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await ReturnToSupplierApi.getAll({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
        ...(supplierFilter !== 'all' ? { supplier_id: supplierFilter } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      setReturns(res.data || []);
      setTotalItems(res.meta?.total ?? (res.data?.length ?? 0));
    } catch (err) {
      console.error('Failed to fetch return-to-suppliers', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchDebounced, startDate, endDate, supplierFilter, statusFilter]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

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

  // ===== Maps for display =====
  const warehouseMap = useMemo(
    () => warehouses.reduce((acc, wh) => { acc[wh.id] = wh.name; return acc; }, {} as Record<string, string>),
    [warehouses],
  );
  const supplierMap = useMemo(
    () => suppliers.reduce((acc, s) => { acc[s.id] = s.name; return acc; }, {} as Record<string, string>),
    [suppliers],
  );

  // ===== CRUD handlers =====
  const handleCreate = async (data: Omit<ReturnToSupplier, 'id'>) => {
    try {
      await ReturnToSupplierApi.create(data as any);
      await fetchReturns();
      setIsAddModalOpen(false);
      Swal.fire({ icon: 'success', title: 'สร้างใบเบิกคืนแล้ว', timer: 1200, showConfirmButton: false });
    } catch (err) {
      const data = (err as { response?: { data?: { message?: string | string[]; errors?: Record<string, string> } } })?.response?.data;
      const msg = Array.isArray(data?.message)
        ? data?.message.join(', ')
        : data?.message
        || (data?.errors ? Object.values(data.errors).join(', ') : '')
        || 'ไม่สามารถสร้างใบเบิกคืนได้';
      Swal.fire('เกิดข้อผิดพลาด', msg, 'error');
    }
  };

  const handleUpdateStatus = async (
    target: ReturnToSupplier,
    nextStatus: 'APPROVED' | 'REJECTED' | 'CANCELLED',
    remarks?: string,
  ) => {
    try {
      await ReturnToSupplierApi.update(target.id, {
        ...target,
        status: nextStatus as any,
        ...(remarks !== undefined ? { remarks } : {}),
      } as Partial<ReturnToSupplier>);
      await fetchReturns();
      const successText: Record<string, string> = {
        APPROVED: 'อนุมัติแล้ว',
        REJECTED: 'ไม่อนุมัติแล้ว',
        CANCELLED: 'ยกเลิกแล้ว',
      };
      Swal.fire({ icon: 'success', title: successText[nextStatus], timer: 1200, showConfirmButton: false });
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

  const handleApprove = async (target: ReturnToSupplier) => {
    setOpenDropdownId(null);
    const r = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันการอนุมัติ',
      html: `อนุมัติใบเบิกคืน <strong>${(target as { code?: string }).code || target.id}</strong> ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
    });
    if (!r.isConfirmed) return;
    await handleUpdateStatus(target, 'APPROVED');
  };

  const handleReject = async (target: ReturnToSupplier) => {
    setOpenDropdownId(null);
    const r = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการไม่อนุมัติ',
      html: `ไม่อนุมัติใบเบิกคืน <strong>${(target as { code?: string }).code || target.id}</strong>`,
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
    await handleUpdateStatus(target, 'REJECTED', r.value.trim());
  };

  const handleCancel = async (target: ReturnToSupplier) => {
    setOpenDropdownId(null);
    const r = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการยกเลิก',
      html: `ยกเลิกใบเบิกคืน <strong>${(target as { code?: string }).code || target.id}</strong>`,
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
    await handleUpdateStatus(target, 'CANCELLED', r.value.trim());
  };

  // ===== UI helpers =====
  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (data: ReturnToSupplier) => {
    setEditingReturn(data);
    setIsViewMode(true);
    setIsAddModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleEdit = (data: ReturnToSupplier) => {
    setEditingReturn(data);
    setIsViewMode(false);
    setIsAddModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleSaveEdit = async (updated: ReturnToSupplier) => {
    if (!updated.id) return;
    try {
      await ReturnToSupplierApi.update(updated.id, updated as Partial<ReturnToSupplier>);
      await fetchReturns();
      Swal.fire({ icon: 'success', title: 'บันทึกแล้ว', timer: 1200, showConfirmButton: false });
    } catch (err) {
      const apiData = (err as { response?: { data?: { message?: string | string[]; errors?: Record<string, string> } } })?.response?.data;
      const msg = Array.isArray(apiData?.message)
        ? apiData?.message.join(', ')
        : apiData?.message
        || (apiData?.errors ? Object.values(apiData.errors).join(', ') : '')
        || 'ไม่สามารถบันทึกการแก้ไขได้';
      Swal.fire('เกิดข้อผิดพลาด', msg, 'error');
    }
  };

  const handleDropdownToggle = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openDropdownId) return;
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
      if ((event.target as HTMLElement).closest('button[data-return-id]')) return;
      setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const renderActions = () => {
    if (!selectedReturn) return null;
    const status = (selectedReturn as { status?: string }).status;

    const actions = [
      <a
        key="view"
        href="#"
        onClick={(e) => { e.preventDefault(); handleViewDetails(selectedReturn); }}
        className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
        role="menuitem"
      >
        <EyeIcon className="mr-3 h-5 w-5 text-slate-400" aria-hidden="true" />
        <span>ดูรายละเอียด</span>
      </a>,
    ];

    if (status === 'PENDING') {
      actions.push(
        <a
          key="approve"
          href="#"
          onClick={(e) => { e.preventDefault(); handleApprove(selectedReturn); }}
          className="flex items-center w-full text-left px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
          role="menuitem"
        >
          <DocumentCheckIcon className="mr-3 h-5 w-5 text-emerald-500" aria-hidden="true" />
          <span>อนุมัติ</span>
        </a>,
        <a
          key="reject"
          href="#"
          onClick={(e) => { e.preventDefault(); handleReject(selectedReturn); }}
          className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          role="menuitem"
        >
          <XCircleIcon className="mr-3 h-5 w-5 text-red-500" aria-hidden="true" />
          <span>ไม่อนุมัติ</span>
        </a>,
      );
    }

    if (status === 'DRAFT') {
      actions.push(
        <a
          key="edit"
          href="#"
          onClick={(e) => { e.preventDefault(); handleEdit(selectedReturn); }}
          className="flex items-center w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
          role="menuitem"
        >
          <PencilIcon className="mr-3 h-5 w-5 text-blue-500" aria-hidden="true" />
          <span>แก้ไข</span>
        </a>,
      );
    }

    if (status === 'DRAFT' || status === 'PENDING') {
      actions.push(
        <a
          key="cancel"
          href="#"
          onClick={(e) => { e.preventDefault(); handleCancel(selectedReturn); }}
          className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          role="menuitem"
        >
          <TrashIcon className="mr-3 h-5 w-5 text-red-500" aria-hidden="true" />
          <span>ยกเลิก</span>
        </a>,
      );
    }

    return actions;
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
              เบิกสินค้าคืนผู้จำหน่าย
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-600">
              จัดการการเบิกสินค้าเพื่อส่งคืนผู้จำหน่าย
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} variant="primary" className="w-full sm:w-auto justify-center shrink-0">
            <PlusIcon className="h-5 w-5 mr-2" />
            สร้างใบเบิกคืน
          </Button>
        </div>

        <Card className="!p-3 sm:!p-4 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center justify-start">
            <div className="relative w-full sm:w-80 sm:flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหาเลขที่เอกสาร, ผู้จำหน่าย"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10"
                title="ค้นหาด้วย: เลขที่เอกสาร, ผู้จำหน่าย"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="w-full sm:w-48 sm:flex-shrink-0">
              <SearchableSelect
                value={supplierFilter === 'all' ? '' : supplierFilter}
                onChange={(v) => {
                  setSupplierFilter(v || 'all');
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'ผู้จำหน่ายทั้งหมด' },
                  ...suppliers.map((s) => ({ value: s.id, label: s.name })),
                ]}
                placeholder="ผู้จำหน่ายทั้งหมด"
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
                { value: 'COMPLETED', label: 'เสร็จสิ้น' },
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
              <span className="text-slate-400 shrink-0">-</span>
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
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ลำดับ</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">เลขที่เอกสาร</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">วันที่</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">คืนจากคลัง</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ผู้จำหน่าย</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">สถานะ</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ผู้สร้าง</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จัดการ</th>
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
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                        <DocumentCheckIcon className="w-12 h-12 text-slate-300 mb-3 opacity-50" />
                        <p className="text-lg font-medium">ไม่พบข้อมูลการเบิกคืนผู้จำหน่าย</p>
                        <p className="text-sm mt-1">ลองเปลี่ยนคำค้นหา หรือสร้างใบเบิกคืนใหม่</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  returns.map((r, index) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors [&>td]:align-middle">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer"
                        onClick={() => handleViewDetails(r)}
                      >
                        {(r as { code?: string }).code || r.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {formatThaiDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {warehouseMap[r.warehouse_id] || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {r.supplier_id ? supplierMap[r.supplier_id] : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={r.status as Status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {(() => {
                          const u = (r as { creator?: { first_name?: string; last_name?: string; nick_name?: string } }).creator;
                          if (!u) return 'ไม่กรอก';
                          const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                          return full || u.nick_name || 'ไม่กรอก';
                        })()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="inline-block">
                          <Button
                            data-return-id={r.id}
                            onClick={(e) => handleDropdownToggle(e, r.id)}
                            variant="icon"
                            title="ตัวเลือก"
                          >
                            <span className="sr-only">Open options</span>
                            <ManageIcon className="h-5 w-5 text-slate-400 hover:text-slate-600" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
          className="origin-top-right mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-30 overflow-hidden"
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
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingReturn(null);
          setIsViewMode(false);
        }}
        onCreateReturn={handleCreate}
        onUpdateReturn={handleSaveEdit}
        editingReturn={editingReturn}
        viewOnly={isViewMode}
        returns={returns}
        warehouses={warehouses}
        suppliers={suppliers}
        products={products}
      />
    </div>
  );
};

export default ReturnToSupplierPage;
