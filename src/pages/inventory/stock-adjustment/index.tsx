import React, { useCallback, useState, useRef, useEffect } from 'react';
import { ActionDropdown, ActionDropdownItem } from '../../../components/common/ActionDropdown';
import Swal from '@/src/utils/swal';
import { Card } from '../../../components/common/Card';
import { Pagination } from '../../../components/common/Pagination';
import {
  DocumentCheckIcon,
  LoadingIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XCircleIcon,
} from '../../../assets/icons/Icons';
import { Button } from '../../../components/common/FormControls';
import { DropdownSelect } from '../../../components/common/DropdownSelect';
import { formatThaiDate } from '../../../utils/date';
import { AdjustmentModal } from '../../../components/features/inventory/adjustment/AdjustmentModal';
import { StockAdjustment as StockAdjustmentType } from '@/src/types/entity/app.interface';
import { Input } from '../../../components/common/FormControls';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { StatusBadge } from '../../../components/common/StatusBadge';

import { StockAdjustmentApi } from '../../../api/stock-adjustment';
import { WarehouseApi } from '../../../api/warehouse';
import { ProductApi } from '../../../api/product';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import {
  Warehouse as WarehouseType,
  Product as ProductType,
} from '@/src/types/entity/app.interface';

const StockAdjustment: React.FC = () => {
  // หน้านี้ fetch master data เองทั้งหมด — ไม่อ่านจาก DataContext เพื่อกัน race
  // condition ที่ context limit แค่ 10 record (ทำให้ dropdown ขึ้นไม่ครบ)
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, Record<string, number>>>({});

  const [adjustments, setAdjustments] = useState<StockAdjustmentType[]>([]);
  const [totalItemsServer, setTotalItemsServer] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchDebounced, setSearchDebounced] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [adjustmentToEdit, setAdjustmentToEdit] =
    useState<StockAdjustmentType | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');


  // Server-side fetch (page / limit / search / date range)
  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await StockAdjustmentApi.getAll({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(warehouseFilter !== 'all' ? { warehouse_id: warehouseFilter } : {}),
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
  }, [currentPage, itemsPerPage, searchDebounced, startDate, endDate, statusFilter, warehouseFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Fetch master data ตอน mount (เพื่อให้ dropdown / modal มีข้อมูลครบ)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [whRes, prodRes, stockRes] = await Promise.all([
          WarehouseApi.getWarehouses({ limit: 100 }),
          ProductApi.getProducts({ limit: 100, is_active: true }),
          WarehouseApi.getWarehousesWithItems(),
        ]);
        if (!active) return;
        if (whRes?.data) setWarehouses(whRes.data);
        if (prodRes?.data) setProducts(prodRes.data);

        const map: Record<string, Record<string, number>> = {};
        const list = (stockRes as any)?.data || stockRes || [];
        if (Array.isArray(list)) {
          list.forEach((wh: any) => {
            map[wh.id] = {};
            const balances =
              wh.stock || wh.stocks || wh.stockBalances || wh.stock_balances
              || wh.stocks_balances || wh.items || [];
            balances.forEach((b: any) => {
              const pid = b.product_id || b.productId;
              const qty = Number(b.quantity || 0);
              if (pid) map[wh.id][pid] = qty;
            });
          });
        }
        setStockMap(map);
      } catch (err) {
        console.error('Failed to fetch master data', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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

  const onDeleteAdjustment = async (id: string, reason?: string) => {
    try {
      await StockAdjustmentApi.delete(id, reason);
      Swal.fire({ icon: 'success', title: 'ยกเลิกเรียบร้อย', timer: 1200, showConfirmButton: false });
      await fetchList();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถยกเลิกได้', 'error');
    }
  };

  const totalItems = totalItemsServer;
  const paginatedAdjustments = adjustments;

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (adjustment: StockAdjustmentType) => {
    setAdjustmentToEdit(adjustment);
    setIsViewMode(true);
    setIsAddModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleEdit = (adjustment: StockAdjustmentType) => {
    setAdjustmentToEdit(adjustment);
    setIsViewMode(false);
    setIsAddModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = async (adjustment: StockAdjustmentType) => {
    setOpenDropdownId(null);
    const code = (adjustment as { adjustment_code?: string }).adjustment_code || adjustment.id;
    const r = await Swal.fire({
      title: 'ยืนยันการยกเลิก',
      html: `คุณแน่ใจหรือไม่ว่าต้องการยกเลิกใบปรับปรุงสต็อก <strong>${code}</strong>?`,
      icon: 'warning',
      input: 'textarea',
      inputLabel: 'เหตุผลในการยกเลิก',
      inputPlaceholder: 'กรุณาระบุเหตุผล...',
      inputAttributes: { 'aria-label': 'เหตุผลในการยกเลิก' },
      inputValidator: (value) => {
        if (!value || !value.trim()) return 'กรุณาระบุเหตุผลในการยกเลิก';
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการยกเลิก',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
    });
    if (r.isConfirmed) {
      onDeleteAdjustment(adjustment.id, r.value);
    }
  };


  const onApproveAdjustment = async (adj: StockAdjustmentType) => {
    setOpenDropdownId(null);
    const r = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันการอนุมัติ',
      html: `อนุมัติใบปรับปรุง <strong>${(adj as { adjustment_code?: string }).adjustment_code || adj.id}</strong>?<br/><span class="text-xs text-slate-500">ระบบจะปรับ stock ตามรายการที่กรอก</span>`,
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
      inputPlaceholder: 'กรอกเหตุผล...',
      showCancelButton: true,
      confirmButtonText: 'ปฏิเสธ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      inputValidator: (v) => (!v || !v.trim() ? 'กรุณากรอกเหตุผล' : null),
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

  const getActionItems = (adj: StockAdjustmentType): ActionDropdownItem[] => {
    const status = (adj as { status?: string }).status;
    const items: ActionDropdownItem[] = [
      {
        label: 'ดูรายละเอียด',
        icon: EyeIcon,
        onClick: () => handleViewDetails(adj),
      },
      {
        label: 'อนุมัติ',
        icon: DocumentCheckIcon,
        onClick: () => onApproveAdjustment(adj),
        isPrimary: true,
        hidden: status !== 'PENDING',
      },
      {
        label: 'ไม่อนุมัติ',
        icon: XCircleIcon,
        onClick: () => onRejectAdjustment(adj),
        isDanger: true,
        hidden: status !== 'PENDING',
      },
      {
        label: 'แก้ไข',
        icon: PencilIcon,
        onClick: () => handleEdit(adj),
        hidden: status !== 'DRAFT',
      },
      {
        label: 'ยกเลิก',
        icon: TrashIcon,
        onClick: () => handleDelete(adj),
        isDanger: true,
        hidden: status !== 'DRAFT' && status !== 'PENDING',
      },
    ];
    return items;
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              ปรับปรุงสต็อก
            </h1>
            <p className="mt-1 text-slate-600">
              จัดการและติดตามการปรับปรุงสต็อกสินค้า
            </p>
          </div>
          <Button onClick={() => {
            setAdjustmentToEdit(null);
            setIsViewMode(false);
            setIsAddModalOpen(true);
          }}>
            <PlusIcon className="h-5 w-5" />
            สร้างใบปรับปรุงสต็อก
          </Button>
        </div>

        <Card className="!p-4 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center justify-start">
            <div className="relative w-full sm:w-80 sm:flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหาเลขที่เอกสารปรับปรุง"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10"
                title="ค้นหาด้วย: เลขที่เอกสารปรับปรุง"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="w-full sm:w-48 sm:flex-shrink-0">
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
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200 text-left">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ลำดับ</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">เลขที่เอกสารปรับปรุง</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">วันที่</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">คลัง</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จำนวนรายการ</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">สถานะ</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ผู้สร้าง</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จัดการ</th>
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
                        <p className="text-lg font-medium">ไม่พบข้อมูลการปรับปรุงสต็อก</p>
                        <p className="text-sm mt-1">ลองเปลี่ยนคำค้นหา หรือสร้างใบปรับปรุงใหม่</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedAdjustments.map((adj, index) => (
                  <tr key={adj.id} className="hover:bg-slate-50 [&>td]:align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-left text-sm font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => handleViewDetails(adj)}
                    >
                      {(adj as { adjustment_code?: string }).adjustment_code || adj.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-left text-sm text-slate-700">
                      {formatThaiDate(adj.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-left text-sm text-slate-700">
                      {(adj as { warehouse?: { name?: string } }).warehouse?.name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-slate-700">
                      {adj.items.length}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <StatusBadge status={adj.status || 'PENDING'} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-left">
                      {(() => {
                        const creator = (adj as {
                          created_by_user?: {
                            first_name?: string;
                            last_name?: string;
                            nick_name?: string;
                          };
                        }).created_by_user;
                        if (!creator) return 'ไม่กรอก';
                        const fullName = `${creator.first_name || ''} ${creator.last_name || ''}`.trim();
                        return fullName || creator.nick_name || 'ไม่กรอก';
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-center">
                      <ActionDropdown
                        itemId={adj.id}
                        openId={openDropdownId}
                        onToggle={setOpenDropdownId}
                        actions={getActionItems(adj)}
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

      <AdjustmentModal
        isOpen={isAddModalOpen}
        mode={adjustmentToEdit ? 'edit' : 'create'}
        initialValues={adjustmentToEdit}
        viewOnly={isViewMode}
        onClose={() => {
          setIsAddModalOpen(false);
          setAdjustmentToEdit(null);
          setIsViewMode(false);
        }}
        onSubmit={adjustmentToEdit ? onUpdateAdjustment : onCreateAdjustment}
        warehouses={warehouses}
        products={products}
        stockMap={stockMap}
      />
    </div>
  );
};

export default StockAdjustment;
