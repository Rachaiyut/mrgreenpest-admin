// ===== React / External =====
import Swal from 'sweetalert2';
import React, {
  useCallback,
  useEffect,
  useMemo, 
  useRef, 
  useState 
} from 'react';
import { createPortal } from 'react-dom';

// ===== Types =====
import {
  Status,
  User as UserType,
  Customer as CustomerType,
  Product as ProductType,
  Withdrawal as WithdrawalType,
  Warehouse as WarehouseType,
} from '@/src/types/entity/app.interface';

import { WithdrawalStatus } from '@/src/types/enums/inventory';

// ===== Context =====
import { useData } from '../../../contexts/DataContext';

// ===== Components =====
import { WithdrawalModal } from '../../../components/features/inventory/withdrawal/WithdrawalModal';
import { WithdrawalDetailsModal } from '../../../components/features/inventory/withdrawal/WithdrawalDetailsModal';

import { Card } from '../../../components/common/Card';
import { Input, Button, Select } from '../../../components/common/FormControls';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { Pagination } from '../../../components/common/Pagination';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { usePermissions } from '../../../hooks/usePermissions';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { isFieldRole } from '../../../utils/role';
import DatePicker from '@/src/components/common/BuddhistDatePicker';

// ===== API =====
import {
  CustomerApi,
  ProductApi,
  UserApi,
  WarehouseApi,
  IssueNoteApi,
} from '../../../api';

// ===== Utils =====
import { formatThaiDate } from '../../../utils/date';

// ===== Assets =====
import {
  CalendarDaysIcon,
  CurrencyDollarIcon,
  DocumentCheckIcon,
  EyeIcon,
  ManageIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  TruckIcon,
  UserIcon,
  XCircleIcon,
  LoadingIcon,
} from '../../../assets/icons/Icons';

const Issue: React.FC = () => {
  const { handlers } = useData();
  const { hasPermission } = usePermissions();
  const authUser = useCurrentUser();
  const isTechRole = isFieldRole(authUser?.roleType);

  // --- เพิ่ม State สำหรับ Loading ---
  const [isLoading, setIsLoading] = useState(true);

  const [withdrawals, setWithdrawals] = useState<WithdrawalType[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [extraUsers, setExtraUsers] = useState<UserType[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [totalItemsServer, setTotalItemsServer] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const creatorSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search users on backend when typing in creator dropdown
  const searchCreators = useCallback(async (search: string) => {
    try {
      const q = (search || '').trim();
      if (!q) {
        setExtraUsers([]);
        return;
      }
      const res = await UserApi.getAll({ search: q, limit: 10, page: 1 });
      if (res?.data) setExtraUsers(res.data);
    } catch (e) {
      console.error('Failed to search creators', e);
    }
  }, []);

  // 1. แยก fetchAllData ออกมาไว้ข้างนอก และใช้ useCallback เพื่อให้เรียกซ้ำได้
  const fetchAllData = useCallback(async () => {
    setIsLoading(true); // เริ่มหมุน
    try {
      const [
        withdrawalsRes,
        usersRes,
        warehousesRes,
        customersRes,
        productsRes,
      ] = await Promise.all([
        IssueNoteApi.getAll({
          page: currentPage,
          limit: itemsPerPage,
          ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        }),
        UserApi.getAll(),
        WarehouseApi.getWarehouses(),
        CustomerApi.getCustomers(),
        ProductApi.getProducts(),
      ]);

      if (withdrawalsRes?.data) setWithdrawals(withdrawalsRes.data);
      if (withdrawalsRes?.meta?.total !== undefined) {
        setTotalItemsServer(withdrawalsRes.meta.total);
      } else if (withdrawalsRes?.data) {
        setTotalItemsServer(withdrawalsRes.data.length);
      }
      if (usersRes?.data) setUsers(usersRes.data);
      if (warehousesRes?.data) setWarehouses(warehousesRes.data);
      if (customersRes?.data) setCustomers(customersRes.data);
      if (productsRes?.data) setProducts(productsRes.data);

    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false); // หยุดหมุน
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, searchDebounced, statusFilter]);

  // 2. เรียกใช้ fetchAllData ตอนโหลดหน้าครั้งแรก
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 3. เพิ่ม await fetchAllData() หลังจาก Create สำเร็จ
  const onCreateWithdrawal = async (data: Omit<WithdrawalType, 'id'>) => {
    try {
      await handlers.withdrawals.create(data);
      setIsAddModalOpen(false); // ปิด Modal
      await fetchAllData();     // รีเฟรชข้อมูลใหม่จาก API
    } catch (error: any) {
      console.error('Failed to create withdrawal', error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.response.data.message });
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถสร้างใบเบิกได้' });
      }
    }
  };

  // 4. เพิ่ม await fetchAllData() หลังจาก Update สำเร็จ
  const onUpdateWithdrawal = async (updatedItem: WithdrawalType) => {
    try {
      await handlers.withdrawals.update(updatedItem);
      setIsEditModalOpen(false);  // ปิด Modal
      setSelectedWithdrawal(null);
      await fetchAllData();       // รีเฟรชข้อมูลใหม่จาก API
    } catch (error) {
      console.error('Failed to update withdrawal', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถอัปเดตข้อมูลได้' });
    }
  };

  // 5. เพิ่ม await fetchAllData() หลังจาก Delete สำเร็จ
  const onDeleteWithdrawal = async (id: string) => {
    try {
      await handlers.withdrawals.delete(id);
      await fetchAllData();       // รีเฟรชข้อมูลใหม่จาก API
    } catch (error) {
      console.error('Failed to delete withdrawal', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถลบข้อมูลได้' });
    }
  };

  const stockMap = useMemo(() => new Map<string, Map<string, number>>(), []);
  const currentUser = users.length > 0 ? users[0] : null;

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<WithdrawalType | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [categoryTab, setCategoryTab] = useState<'all' | 'stock' | 'expense'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Debounce searchQuery → searchDebounced (triggers server fetch via fetchAllData dep)
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

  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w])),
    [warehouses]
  );

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const userMap = useMemo(
    () =>
      new Map(
        users.map((u) => {
          let name = u.name;
          if (typeof name !== 'string' || name === '[object Object]') {
            name =
              `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
              u.nick_name ||
              'Unknown';
          }
          return [u.id, name];
        })
      ),
    [users]
  );

  // Build creator filter options:
  // 1. users prop (default 10 คน)
  // 2. extraUsers (ผลลัพธ์จาก backend search)
  // 3. creator จาก withdrawals (กันกรณีไม่อยู่ใน users ทั้ง 2 set)
  const creatorOptions = useMemo(() => {
    const map = new Map<string, string>();

    // จาก users prop + extraUsers (รวมกัน dedup by id)
    for (const u of [...users, ...extraUsers]) {
      if (map.has(u.id)) continue;
      const label = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      map.set(u.id, label || u.id);
    }

    // จาก creator association ของ withdrawals
    for (const w of withdrawals) {
      const id = w.created_by;
      if (!id || map.has(id)) continue;
      const c = (w as WithdrawalType & {
        creator?: { first_name?: string; last_name?: string; nick_name?: string };
      }).creator;
      let label = '';
      if (c?.first_name) {
        label = `${c.first_name} ${c.last_name || ''}`.trim();
      } else {
        const fromMap = userMap.get(id);
        if (fromMap && fromMap !== '[object Object]') label = fromMap;
      }
      if (!label) label = `${id.substring(0, 8)}...`;
      map.set(id, label);
    }

    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [users, extraUsers, withdrawals, userMap]);

  const filteredIssues = useMemo(() => {
    let filtered = [...withdrawals].sort((a, b) => {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    if (creatorFilter !== 'all') {
      filtered = filtered.filter((w) => w.created_by === creatorFilter);
    }

    // Category tab filter — แยกตามประเภทที่เบิก
    if (categoryTab === 'stock') {
      filtered = filtered.filter((w) => (w.items?.length || 0) > 0);
    } else if (categoryTab === 'expense') {
      filtered = filtered.filter((w) => (w.expenses?.length || 0) > 0);
    }

    if (startDate || endDate) {
      const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : -Infinity;
      const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;
      filtered = filtered.filter((w) => {
        if (!w.created_at) return false;
        const t = new Date(w.created_at).getTime();
        return t >= startMs && t <= endMs;
      });
    }

    return filtered;
  }, [withdrawals, creatorFilter, categoryTab, startDate, endDate]);

  // search ยิงที่ server แล้ว → ไม่ต้องนับเป็น client filter
  // client filter คือ: creator / category tab / date range
  const hasClientFilter = !!(
    creatorFilter !== 'all' ||
    categoryTab !== 'all' ||
    startDate ||
    endDate
  );
  const totalItems = hasClientFilter ? filteredIssues.length : totalItemsServer;
  const paginatedWithdrawals = hasClientFilter
    ? filteredIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : filteredIssues;

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

  const handleApprovalAction = async (action: 'approve' | 'reject') => {
    const withdrawal = withdrawals.find((w) => w.id === openDropdownId);
    if (!withdrawal) return;
    setOpenDropdownId(null);

    if (action === 'approve') {
      const r = await Swal.fire({
        icon: 'question',
        title: 'ยืนยันการอนุมัติ',
        html: `ยืนยันการอนุมัติใบเบิก <strong>${withdrawal.code || withdrawal.id}</strong> ใช่หรือไม่?`,
        showCancelButton: true,
        confirmButtonText: 'อนุมัติ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#10b981',
      });
      if (!r.isConfirmed) return;
      await submitApproval(withdrawal.id, 'APPROVED', '');
    } else {
      const r = await Swal.fire({
        icon: 'warning',
        title: 'ยืนยันการไม่อนุมัติ',
        html: `ไม่อนุมัติใบเบิก <strong>${withdrawal.code || withdrawal.id}</strong>`,
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
      await submitApproval(withdrawal.id, 'REJECTED', r.value.trim());
    }
  };

  const submitApproval = async (
    withdrawalId: string,
    status: 'APPROVED' | 'REJECTED',
    remarks: string,
  ) => {
    try {
      await IssueNoteApi.approve(withdrawalId, { status, remark: remarks });
      await fetchAllData();
      Swal.fire({
        icon: 'success',
        title: status === 'APPROVED' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติแล้ว',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      const errMsg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', errMsg || 'ไม่สามารถดำเนินการได้', 'error');
    }
  };

  const handleCancel = async (withdrawalId: string) => {
    const withdrawalToUpdate = withdrawals.find((w) => w.id === withdrawalId);
    if (withdrawalToUpdate) {
      await onUpdateWithdrawal({
        ...withdrawalToUpdate,
        expenses: (withdrawalToUpdate.expenses || []).map((exp: any) => ({
          ...exp,
          type: exp.type || 'INCOME',
        })),
        status: WithdrawalStatus.CANCELLED,
        notes: 'ยกเลิกโดยผู้ใช้',
      });
    }
    setOpenDropdownId(null);
  };

  useEffect(() => {
    if (isDetailsModalOpen) {
      setOpenDropdownId(null);
    }
  }, [isDetailsModalOpen]);

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
      const canApprove =
        hasPermission('APPROVE_STOCK_ISSUE_NOTE') ||
        hasPermission('APPROVE_EXPENSE_ISSUE_NOTE');

      if (canApprove) {
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
        );
      }

      actions.push({
        label: 'ยกเลิก',
        icon: TrashIcon,
        color: 'text-red-600',
        hoverBg: 'hover:bg-red-50',
        onClick: () => handleCancel(withdrawal.id),
      });
    }

    return actions;
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              เบิกสินค้าเข้าคลังย่อย
            </h1>
            <p className="mt-1 text-slate-600">
              ติดตามและจัดการการเบิกสินค้าและอุปกรณ์
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <PlusIcon className="h-5 w-5" />
            สร้างใบเบิก
          </Button>
        </div>

        <Card className="!p-4 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-72 flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหาเลขที่เอกสารเบิก"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10"
                title="ค้นหาด้วยเลขที่เอกสารเบิก"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {!isTechRole && (
              <div className="w-full sm:w-48 flex-shrink-0">
                <SearchableSelect
                  value={creatorFilter === 'all' ? '' : creatorFilter}
                  onChange={(v) => {
                    setCreatorFilter(v || 'all');
                    setCurrentPage(1);
                  }}
                  onSearchChange={(q) => {
                    if (creatorSearchTimerRef.current) clearTimeout(creatorSearchTimerRef.current);
                    creatorSearchTimerRef.current = setTimeout(() => {
                      searchCreators(q);
                    }, 300);
                  }}
                  options={[
                    { value: '', label: 'ผู้เบิกทั้งหมด' },
                    ...creatorOptions,
                  ]}
                  placeholder="ผู้เบิกทั้งหมด"
                />
              </div>
            )}

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
              <option value="APPROVED">อนุมัติแล้ว</option>
              <option value="PARTIALLY_APPROVED">อนุมัติบางส่วน</option>
              <option value="REJECTED">ไม่อนุมัติ</option>
              <option value="COMPLETED">เสร็จสิ้น</option>
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

            {/* Category Tabs — กรองตามประเภทรายการ */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 ml-auto">
              {[
                { value: 'all', label: 'ทั้งหมด' },
                { value: 'stock', label: 'สินค้า/สารเคมี' },
                { value: 'expense', label: 'ค่าใช้จ่าย' },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setCategoryTab(t.value as 'all' | 'stock' | 'expense');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${
                    categoryTab === t.value
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* --- Mobile View: Cards --- */}
        <div className="md:hidden space-y-4 flex-grow min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col flex-grow items-center justify-center text-slate-500 py-16 min-h-[40vh]">
              <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="text-base font-medium">กำลังโหลดข้อมูลการเบิก...</p>
            </div>
          ) : paginatedWithdrawals.length === 0 ? (
            <div className="flex flex-col flex-grow items-center justify-center text-slate-400 py-16 min-h-[40vh]">
              <DocumentCheckIcon className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">ไม่พบข้อมูลใบเบิกสินค้า</p>
            </div>
          ) : (
            <>
              {paginatedWithdrawals.map((withdrawal) => {
                const fromWarehouse = warehouseMap.get(withdrawal.warehouse_id);
                const toWarehouse = withdrawal.to_warehouse_id
                  ? warehouseMap.get(withdrawal.to_warehouse_id)
                  : null;
                const totalGoodsAmount =
                  withdrawal.items?.reduce((sum, item) => {
                    const product = productMap.get(item.product_id);
                    return sum + (product ? product.price * item.quantity : 0);
                  }, 0) || 0;
                const totalExpenseAmount =
                  withdrawal.expenses?.reduce(
                    (sum, exp) => sum + Number(exp.amount),
                    0
                  ) || 0;
                const totalAmount = totalGoodsAmount + totalExpenseAmount;
                const recipientObj = (withdrawal as WithdrawalType & {
                  recipient?: { first_name?: string; last_name?: string; nick_name?: string };
                }).recipient;
                const recipientName = recipientObj?.first_name
                  ? `${recipientObj.first_name} ${recipientObj.last_name || ''}`.trim()
                  : withdrawal.recipient_id
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
                        <span>
                          {withdrawal.created_at
                            ? formatThaiDate(withdrawal.created_at)
                            : '-'}
                        </span>
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
                          {toWarehouse?.type === 'VEHICLE' &&
                            `(${toWarehouse.vehicle?.vehicle_registration || '-'})`}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
                        <span>ผู้สร้าง: {withdrawal.created_by}</span>
                      </div>
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
                        <span>ผู้รับเงิน: {recipientName}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {totalItems > 0 && (
                <Pagination
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalItems}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              )}
            </>
          )}
        </div>

        {/* --- Desktop View: Table --- */}
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden hidden md:flex relative">
          <div className="overflow-auto flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200">
              {/* เปลี่ยนให้เหมือนเดิม และเพิ่ม border-b เพื่อกันเส้นหาย */}
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider xl:table-cell hidden whitespace-nowrap"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    เลขที่เอกสารเบิก
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    วันที่เบิก
                  </th>
                  {categoryTab !== 'expense' && (
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-center text-sm font-medium text-slate-600 uppercase lg:table-cell hidden whitespace-nowrap"
                    >
                      จำนวนรายการ
                    </th>
                  )}
                  {categoryTab !== 'stock' && (
                    <th
                      scope="col"
                      className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      จำนวนเงินที่เบิก
                    </th>
                  )}
                  {categoryTab !== 'stock' && (
                    <th
                      scope="col"
                      className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      ผู้รับเงิน
                    </th>
                  )}
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    ผู้สร้าง
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    สถานะ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    จัดการ
                  </th>
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-500">
                        <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-base font-medium">กำลังโหลดข้อมูลการเบิก...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                        <DocumentCheckIcon className="w-12 h-12 text-slate-300 mb-3 opacity-50" />
                        <p className="text-lg font-medium">ไม่พบข้อมูลใบเบิกสินค้า</p>
                        <p className="text-sm mt-1">ลองปรับตัวกรองหรือสร้างใบเบิกใหม่</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedWithdrawals.map((withdrawal, index) => {
                    const totalItemsCount =
                      (withdrawal.items?.length || 0) +
                      (withdrawal.expenses?.length || 0);

                    const totalGoodsAmount =
                      withdrawal.items?.reduce((sum, item) => {
                        const product = productMap.get(item.product_id);
                        return (
                          sum + (product ? product.price * item.quantity : 0)
                        );
                      }, 0) || 0;
                    const totalExpenseAmount =
                      withdrawal.expenses?.reduce(
                        (sum, exp) => sum + Number(exp.amount),
                        0
                      ) || 0;
                    const totalAmount = totalGoodsAmount + totalExpenseAmount;
                    const recipientObj = (withdrawal as WithdrawalType & {
                      recipient?: { first_name?: string; last_name?: string; nick_name?: string };
                    }).recipient;
                    const recipientName = recipientObj?.first_name
                      ? `${recipientObj.first_name} ${recipientObj.last_name || ''}`.trim()
                      : withdrawal.recipient_id
                        ? userMap.get(withdrawal.recipient_id) || '-'
                        : '-';

                    return (
                      <tr key={withdrawal.id} className="hover:bg-slate-50 [&>td]:text-center [&>td]:align-middle">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 xl:table-cell hidden">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td
                          className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer"
                          onClick={() => handleViewDetails(withdrawal)}
                        >
                          {withdrawal.code}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                          {withdrawal.created_at
                            ? formatThaiDate(withdrawal.created_at)
                            : '-'}
                        </td>
                        {categoryTab !== 'expense' && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 lg:table-cell hidden">
                            {totalItemsCount}
                          </td>
                        )}
                        {categoryTab !== 'stock' && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            ฿
                            {totalAmount.toLocaleString('th-TH', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        )}
                        {categoryTab !== 'stock' && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            {recipientName === '[object Object]'
                              ? 'Unknown'
                              : recipientName}
                          </td>
                        )}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                          {(() => {
                            const creator = (withdrawal as WithdrawalType & {
                              creator?: { first_name?: string; last_name?: string; nick_name?: string };
                            }).creator;
                            if (creator?.first_name) {
                              return `${creator.first_name} ${creator.last_name || ''}`.trim();
                            }
                            const fromMap = userMap.get(withdrawal.created_by);
                            if (fromMap && fromMap !== '[object Object]') return fromMap;
                            // fallback: ถ้ายังไม่เจอและเป็น UUID → แสดง 'ไม่ระบุ'
                            const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(
                              withdrawal.created_by || '',
                            );
                            return looksLikeUuid ? 'ไม่ระบุ' : withdrawal.created_by || '-';
                          })()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={withdrawal.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="inline-block">
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

          {!isLoading && totalItems > 0 && (
            <div className="mt-auto border-t border-slate-200">
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          )}
        </div>
      </div>

      {openDropdownId &&
        dropdownPosition &&
        createPortal(
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
                const withdrawal = withdrawals.find(
                  (w) => w.id === openDropdownId
                );
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

      <WithdrawalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        mode="create"
        onSubmit={async (payload) => {
          await onCreateWithdrawal(payload as Omit<WithdrawalType, 'id'>);
          setIsAddModalOpen(false);
        }}
        users={users}
        warehouses={warehouses}
        products={products}
        stockMap={stockMap}
        currentUser={users[0]}
      />
      <WithdrawalDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        withdrawal={selectedWithdrawal}
        warehouses={warehouses}
        products={products}
        users={users}
      />
      <WithdrawalModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedWithdrawal(null);
        }}
        mode="edit"
        initialValues={selectedWithdrawal}
        onSubmit={async (payload) => {
          if (!selectedWithdrawal) return;
          await onUpdateWithdrawal({
            ...selectedWithdrawal,
            ...payload,
          } as WithdrawalType);
          setIsEditModalOpen(false);
          setSelectedWithdrawal(null);
        }}
        users={users}
        warehouses={warehouses}
        products={products}
        stockMap={stockMap}
        currentUser={users[0]}
      />
    </div>
  );
};

export default Issue;