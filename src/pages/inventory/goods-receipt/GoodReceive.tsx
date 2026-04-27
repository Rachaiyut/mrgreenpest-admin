// ===== React / Core =====
import React, { 
  useCallback, 
  useEffect, 
  useMemo, 
  useRef, 
  useState 
} from 'react';

// ===== Absolute Imports =====
import {
  GoodsReceive as GoodsReceiveType,
  Status,
  Warehouse as WarehouseType,
} from '@/src/types/entity/app.interface';

// ===== Components =====
import { Card } from '../../../components/common/Card';
import { Input, Button, Select } from '../../../components/common/FormControls';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { Pagination } from '../../../components/common/Pagination';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { AddGoodsReceiptModal } from '../../../components/features/inventory/goods-receipt/AddGoodsReceiveModal';
import { GoodsReceiptDetailsModal } from '../../../components/features/inventory/goods-receipt/GoodsReceiptDetailsModal';

// ===== Utils =====
import { formatThaiDate } from '../../../utils/date';

// ===== API =====
import { GoodsReceiptApi } from '../../../api/goods-receipt';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import { ProductApi } from '../../../api/product';
import { SupplierApi } from '../../../api/supplier';
import { WarehouseApi } from '../../../api/warehouse';

// ===== Libs =====
import Swal from 'sweetalert2';

// ===== Assets =====
import {
  DocumentCheckIcon,
  EyeIcon,
  ManageIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
  LoadingIcon, // 🌟 เพิ่ม LoadingIcon
} from '../../../assets/icons/Icons';

// FIX: Define props interface
interface GoodsReceiveProps {
  onCreateReceipt: (receipt: Omit<GoodsReceiveType, 'id'>) => Promise<void> | void;
  onUpdateReceipt: (receipt: GoodsReceiveType) => Promise<void> | void;
  onDeleteReceipt: (receiptId: string) => Promise<void> | void;
}

const GoodsReceive: React.FC<GoodsReceiveProps> = ({
  onCreateReceipt,
  onUpdateReceipt,
  onDeleteReceipt,
}) => {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [extraSuppliers, setExtraSuppliers] = useState<any[]>([]);
  const supplierSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchSuppliers = useCallback(async (query: string) => {
    try {
      const q = (query || '').trim();
      if (!q) {
        setExtraSuppliers([]);
        return;
      }
      const res = await SupplierApi.getSuppliers({ search: q, limit: 10, page: 1 });
      if (res?.data) setExtraSuppliers(res.data);
    } catch (e) {
      console.error('Failed to search suppliers', e);
    }
  }, []);
  const [products, setProducts] = useState<any[]>([]);

  const [receipts, setReceipts] = useState<GoodsReceiveType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<GoodsReceiveType | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceiveType | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchGoodReceives = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await GoodsReceiptApi.getAll({
        ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
        ...(warehouseFilter !== 'all' ? { warehouse_id: warehouseFilter } : {}),
        ...(supplierFilter !== 'all' ? { supplier_id: supplierFilter } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      if (response && response.data) {
        setReceipts(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch goods receipts', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchDebounced, startDate, endDate, warehouseFilter, supplierFilter, statusFilter]);

  // Debounce searchQuery → searchDebounced (300ms) → trigger refetch
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

  // 🟢 3. ดึงข้อมูลครั้งแรกเมื่อเปิดหน้า
  useEffect(() => {
    fetchGoodReceives();
  }, [fetchGoodReceives]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [warehousesRes, suppliersRes, productsRes] = await Promise.all([
          WarehouseApi.getWarehouses({ limit: 1000 }),
          SupplierApi.getSuppliers({ limit: 1000 }),
          ProductApi.getProducts({ limit: 1000 }),
        ]);
        setWarehouses(warehousesRes.data || []);
        setSuppliers(suppliersRes.data || []);
        setProducts(productsRes.data || []);
      } catch (error) {
        console.error('Failed to fetch initial data', error);
      }
    };

    fetchInitialData();
  }, []);

  // 🟢 4. สร้าง Wrapper Functions เพื่อดึงข้อมูลใหม่หลัง Action สำเร็จ
  const handleCreate = async (data: Omit<GoodsReceiveType, 'id'>) => {
    try {
      await onCreateReceipt(data);
      await fetchGoodReceives(); // ดึงใหม่หลังสร้างเสร็จ
      setIsAddModalOpen(false); // ปิด Modal ฝั่ง Parent เพื่อความชัวร์
    } catch (error) {
      console.error('Create error', error);
    }
  };

  const handleUpdate = async (data: GoodsReceiveType) => {
    try {
      await onUpdateReceipt(data);
      await fetchGoodReceives(); // ดึงใหม่หลังอัปเดตเสร็จ
    } catch (error) {
      console.error('Update error', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await onDeleteReceipt(id);
      await fetchGoodReceives(); // ดึงใหม่หลังลบเสร็จ
    } catch (error) {
      console.error('Delete error', error);
    }
  };

  // =====================================

  const sortedReceipts = useMemo(() => [...receipts], [receipts]);

  const warehouseMap = useMemo(() => {
    return warehouses.reduce((acc, wh) => {
      acc[wh.id] = wh.name;
      return acc;
    }, {} as Record<string, string>);
  }, [warehouses]);

  const supplierMap = useMemo(() => {
    return suppliers.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {} as Record<string, string>);
  }, [suppliers]);

  // Search ส่งไป API แล้ว — ไม่ต้องกรอง client side
  const filteredReceipts = sortedReceipts;
  
  const totalItems = filteredReceipts.length;
  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (receipt: GoodsReceiveType) => {
    setSelectedReceipt(receipt);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDropdownToggle = (event: React.MouseEvent<HTMLButtonElement>, receiptId: string) => {
    event.stopPropagation();
    if (openDropdownId === receiptId) {
      setOpenDropdownId(null);
      setSelectedReceipt(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      const found = receipts.find((r) => r.id === receiptId);
      setSelectedReceipt(found || null);
      setOpenDropdownId(receiptId);
      setDropdownPosition({
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.right + window.scrollX,
      });
    }
  };

  const handleApprovalAction = async (action: 'approve' | 'reject') => {
    const target = selectedReceipt;
    setOpenDropdownId(null);
    if (!target) return;

    if (action === 'reject') {
      const r = await Swal.fire({
        icon: 'warning',
        title: 'ยืนยันการไม่อนุมัติ',
        html: `ไม่อนุมัติใบรับเข้า <strong>${target.code || target.id}</strong>`,
        input: 'textarea',
        inputLabel: 'เหตุผลการไม่อนุมัติ',
        inputPlaceholder: 'ระบุเหตุผล...',
        showCancelButton: true,
        confirmButtonText: 'ไม่อนุมัติ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#ef4444',
        inputValidator: (v) => (!v || !v.trim() ? 'กรุณาระบุเหตุผล' : null),
      });
      if (!r.isConfirmed || !r.value) return;

      try {
        await handleUpdate({
          ...target,
          status: 'REJECTED',
          remarks: r.value.trim(),
        } as GoodsReceiveType);
        Swal.fire({
          icon: 'success',
          title: 'ไม่อนุมัติแล้ว',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        const errMsg = (error as { response?: { data?: { message?: string } } })
          ?.response?.data?.message;
        Swal.fire('เกิดข้อผิดพลาด', errMsg || 'ไม่สามารถดำเนินการได้', 'error');
      }
      setSelectedReceipt(null);
      return;
    }

    // approve
    const r = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันการอนุมัติ',
      html: `อนุมัติใบรับเข้า <strong>${target.code || target.id}</strong> ใช่หรือไม่?<br/><span class="text-xs text-slate-500">ระบบจะดำเนินการรับสินค้าเข้าคลังตามรายการ</span>`,
      showCancelButton: true,
      confirmButtonText: 'อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
    });
    if (!r.isConfirmed) return;

    try {
      await handleUpdate({
        ...target,
        status: 'RECEIVED',
      } as GoodsReceiveType);
      Swal.fire({
        icon: 'success',
        title: 'อนุมัติแล้ว',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      const errMsg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', errMsg || 'ไม่สามารถอนุมัติได้', 'error');
    }
    setSelectedReceipt(null);
  };

  const handleCancel = (receiptId: string) => {
    const receiptToUpdate = receipts.find((r) => r.id === receiptId);
    if (receiptToUpdate) {
      handleUpdate({
        ...receiptToUpdate,
        status: 'CANCELLED',
        remarks: 'ยกเลิกโดยผู้ใช้',
        updated_by: 'ผู้ดูแลระบบ',
      } as GoodsReceiveType);
    }
    setOpenDropdownId(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openDropdownId) return;
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
      if ((event.target as HTMLElement).closest('button[data-receipt-id]')) return;
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
        className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
        role="menuitem"
      >
        <EyeIcon className="mr-3 h-5 w-5 text-slate-400" aria-hidden="true" />
        <span>ดูรายละเอียด</span>
      </a>,
    ];

    if (selectedReceipt.status === 'PENDING' || selectedReceipt.status === Status.PendingApproval) {
      actions.push(
        <a
          key="approve"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleApprovalAction('approve');
          }}
          className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
          role="menuitem"
        >
          <DocumentCheckIcon className="mr-3 h-5 w-5 text-emerald-500" aria-hidden="true" />
          <span>อนุมัติ</span>
        </a>,
        <a
          key="reject"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleApprovalAction('reject');
          }}
          className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          role="menuitem"
        >
          <XCircleIcon className="mr-3 h-5 w-5 text-red-500" aria-hidden="true" />
          <span>ไม่อนุมัติ</span>
        </a>
      );
    }

    if (selectedReceipt.status === 'DRAFT' || selectedReceipt.status === Status.Draft) {
      actions.push(
        <a
          key="edit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setEditingReceipt(selectedReceipt);
            setIsAddModalOpen(true);
            setOpenDropdownId(null);
          }}
          className="flex items-center w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
          role="menuitem"
        >
          <PencilIcon className="mr-3 h-5 w-5 text-blue-500" aria-hidden="true" />
          <span>แก้ไข</span>
        </a>
      );
    }

    if (selectedReceipt.status === Status.Draft || selectedReceipt.status === Status.PendingApproval) {
      actions.push(
        <>
          <div key="divider" className="border-t border-slate-100 my-1"></div>
          <a
            key="cancel"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleCancel(selectedReceipt.id);
            }}
            className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            role="menuitem"
          >
            <TrashIcon className="mr-3 h-5 w-5 text-red-500" aria-hidden="true" />
            <span>ยกเลิก</span>
          </a>
        </>
      );
    }

    return actions;
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">

        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">รับสินค้าเข้า</h1>
            <p className="mt-1 text-slate-600">จัดการการรับสินค้าเข้าคลัง</p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} variant="primary" className="w-full sm:w-auto justify-center shrink-0">
            <PlusIcon className="h-5 w-5 mr-2" />
            สร้างใบรับเข้า
          </Button>
        </div>

        <Card className="!p-4 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-80 flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหาเลขที่ใบรับเข้า, เลขที่อ้างอิง"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10"
                title="ค้นหาด้วย: เลขที่ใบรับเข้า, เลขที่อ้างอิง"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="w-40 flex-shrink-0">
              <SearchableSelect
                value={warehouseFilter === 'all' ? '' : warehouseFilter}
                onChange={(v) => {
                  setWarehouseFilter(v || 'all');
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'คลังทั้งหมด' },
                  ...warehouses.map((wh) => ({ value: wh.id, label: wh.name })),
                ]}
                placeholder="คลังทั้งหมด"
              />
            </div>
            <div className="w-48 flex-shrink-0">
              <SearchableSelect
                value={supplierFilter === 'all' ? '' : supplierFilter}
                onChange={(v) => {
                  setSupplierFilter(v || 'all');
                  setCurrentPage(1);
                }}
                onSearchChange={(q) => {
                  if (supplierSearchTimerRef.current) clearTimeout(supplierSearchTimerRef.current);
                  supplierSearchTimerRef.current = setTimeout(() => searchSuppliers(q), 300);
                }}
                options={(() => {
                  const map = new Map<string, string>();
                  for (const s of [...suppliers, ...extraSuppliers]) {
                    if (!map.has(s.id)) map.set(s.id, s.name);
                  }
                  return [
                    { value: '', label: 'ผู้จัดจำหน่ายทั้งหมด' },
                    ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
                  ];
                })()}
                placeholder="ผู้จัดจำหน่ายทั้งหมด"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-fit text-sm !pr-8"
            >
              <option value="all">สถานะทั้งหมด</option>
              <option value="DRAFT">ฉบับร่าง</option>
              <option value="PENDING">รออนุมัติ</option>
              <option value="RECEIVED">อนุมัติแล้ว</option>
              <option value="CANCELLED">ยกเลิก</option>
            </Select>
            <div className="flex items-center gap-2">
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
                wrapperClassName="w-32 sm:w-36"
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
                wrapperClassName="w-32 sm:w-36"
              />
            </div>
          </div>
        </Card>

        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-auto w-full flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200 text-center">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ลำดับ</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">เลขที่ใบรับเข้า</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">เลขที่อ้างอิง</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">วันที่</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">คลัง</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ผู้จัดจำหน่าย</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">สถานะ</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ผู้สร้าง</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-500">
                        <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-base font-medium">กำลังโหลดข้อมูลใบรับเข้า...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedReceipts.length > 0 ? (
                  paginatedReceipts.map((receipt, index) => (
                    <tr key={receipt.id} className="hover:bg-slate-50 transition-colors [&>td]:align-middle">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:text-primary-dark cursor-pointer transition-colors"
                        onClick={() => handleViewDetails(receipt)}
                      >
                        {receipt.code || receipt.id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 font-medium">{receipt.receipt_no || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{formatThaiDate(receipt.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {(receipt as unknown as Record<string, { name?: string }>).warehouse?.name || warehouseMap[receipt.warehouse_id] || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {receipt.supplier_id ? supplierMap[receipt.supplier_id] : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={receipt.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {(() => {
                          const u = (receipt as { created_by_user?: { first_name?: string; last_name?: string; nick_name?: string } }).created_by_user;
                          if (!u) return 'ไม่ระบุ';
                          const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                          return full || u.nick_name || 'ไม่ระบุ';
                        })()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="inline-block">
                          <Button data-receipt-id={receipt.id} onClick={(e) => handleDropdownToggle(e, receipt.id)} variant="icon" title="ตัวเลือก">
                            <span className="sr-only">Open options</span>
                            <ManageIcon className="h-5 w-5 text-slate-400 hover:text-slate-600" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                        <DocumentCheckIcon className="w-12 h-12 text-slate-300 mb-3 opacity-50" />
                        <p className="text-lg font-medium">ไม่พบข้อมูลใบรับเข้า</p>
                        <p className="text-sm mt-1">ลองเปลี่ยนคำค้นหา หรือสร้างใบรับเข้าใหม่</p>
                      </div>
                    </td>
                  </tr>
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

      {/* Dropdown Menu */}
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

      {/* 🟢 6. เปลี่ยน onCreateReceipt ส่งเป็น handleCreate แทน */}
      {isAddModalOpen && (
        <AddGoodsReceiptModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingReceipt(null);
          }}
          onCreateReceipt={handleCreate}
          onUpdateReceipt={handleUpdate}
          editingReceipt={editingReceipt}
          receipts={receipts}
          warehouses={warehouses}
          suppliers={suppliers}
          products={products}
        />
      )}
      <GoodsReceiptDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        receipt={selectedReceipt}
        warehouses={warehouses}
        products={products}
      />
    </div>
  );
};

export default GoodsReceive;