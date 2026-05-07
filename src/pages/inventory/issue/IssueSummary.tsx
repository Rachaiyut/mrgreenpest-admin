import { isFieldRole } from '@/src/utils/role';
// ===== React / External =====
import Swal from '@/src/utils/swal';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ===== Types =====
import {
  StockIssueSummary as StockIssueSummaryType,
  Warehouse as WarehouseEntity,
} from '@/src/types/entity/inventory.interface';
import { UserExpense } from '@/src/types/entity/user-expense.interface';
import { WarehouseType } from '@/src/types/enums/inventory';

// ===== Context =====
import { useData } from '../../../contexts/DataContext';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { usePermissions } from '../../../hooks/usePermissions';
import { useNotificationFocus } from '../../../hooks/useNotificationFocus';
import { renderApprovalDetails, renderItemList, joinName, pickName } from '../../../utils/approvalSwal';

// ===== Components =====
import { IssueSummaryModal } from '../../../components/features/inventory/issue-summary/IssueSummaryModal';
import { StockIssueSummaryDetailsModal } from '../../../components/features/inventory/issue-summary/StockIssueSummaryDetailsModal';
import { Card } from '../../../components/common/Card';
import { Input, Button } from '../../../components/common/FormControls';
import { DropdownSelect } from '../../../components/common/DropdownSelect';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { Pagination } from '../../../components/common/Pagination';

// ===== Utils =====
import { formatThaiDate } from '../../../utils/date';
import { StockIssueSummaryApi } from '../../../api/stock-issue-summary';
import { UserApi } from '../../../api/user';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import DatePicker from '@/src/components/common/BuddhistDatePicker';

// ===== Assets =====
import {
  CurrencyDollarIcon,
  EyeIcon,
  ManageIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  TruckIcon,
  UserIcon,
  DocumentCheckIcon,
  LoadingIcon,
  CheckCircleIcon,
} from '../../../assets/icons/Icons';

// Helper function สำหรับแสดงสถานะเป็นภาษาไทยและสี
const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'DRAFT':
      return { text: 'ฉบับร่าง', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'PENDING':
      return { text: 'รออนุมัติ', className: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'CANCELLED':
      return { text: 'ยกเลิก', className: 'bg-red-100 text-red-700 border-red-200' };
    case 'APPROVED':
      return { text: 'อนุมัติแล้ว', className: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'COMPLETED':
      return { text: 'เสร็จสิ้น', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    default:
      return { text: status || '-', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

const IssueSummaryPage: React.FC = () => {
  const currentUser = useCurrentUser();
  const { hasPermission } = usePermissions();
  const canApproveStock =
    hasPermission('APPROVE_ISSUE_SUMMARY') ||
    hasPermission('APPROVE_STOCK_ISSUE_SUMMARY');
  const canApproveExpense =
    hasPermission('APPROVE_ISSUE_SUMMARY') ||
    hasPermission('APPROVE_EXPENSE_ISSUE_SUMMARY');
  const isTechRole = isFieldRole(currentUser?.roleType);

  const {
    users,
    warehouses,
    products,
    jobs,
    handlers,
    fetchData,
  } = useData();

  // --- State สำหรับ Loading ---
  const [isLoading, setIsLoading] = useState(true);

  // --- Local list state (server-side driven) ---
  const [stockIssueSummaries, setStockIssueSummaries] = useState<StockIssueSummaryType[]>([]);
  const [totalItemsServer, setTotalItemsServer] = useState(0);

  // ผู้ใช้ที่ fetch มาเพิ่มตอน search ใน dropdown ผู้เบิก
  const [extraUsers, setExtraUsers] = useState<typeof users>([]);
  const creatorSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchCreators = useCallback(async (query: string) => {
    try {
      const q = (query || '').trim();
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

  const onCreateStockIssueSummary = async (data: Omit<StockIssueSummaryType, 'id'>) => {
    try {
      await handlers.stockIssueSummaries.create(data);
      await fetchList();
    } catch (error: any) {
      console.error('Failed to create stock issue summary', error);
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

  const onUpdateStockIssueSummary = async (updatedItem: StockIssueSummaryType) => {
    try {
      await handlers.stockIssueSummaries.update(updatedItem);
      await fetchList();
    } catch (error) {
      console.error('Failed to update stock issue summary', error);
    }
  };

  const onUpdateStatus = async (summaryId: string, newStatus: string) => {
    try {
      const summary = stockIssueSummaries.find((s) => s.id === summaryId);
      if (!summary) return;
      await handlers.stockIssueSummaries.update({ ...summary, status: newStatus } as StockIssueSummaryType);
      await fetchList();
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const handleStatusClick = (summary: StockIssueSummaryType) => {
    setSelectedSummary(summary);
    setTargetStatus(summary.status || 'DRAFT');
    setIsStatusModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleStatusConfirm = async () => {
    if (!selectedSummary) return;
    try {
      await StockIssueSummaryApi.updateStatus(selectedSummary.id, targetStatus);
      // Refresh list
      await fetchList();
    } catch (error) {
      console.error('Failed to update status', error);
    }
    setIsStatusModalOpen(false);
  };

  const onDeleteStockIssueSummary = async (id: string) => {
    try {
      await handlers.stockIssueSummaries.delete(id);
      await fetchList();
    } catch (error) {
      console.error('Failed to delete stock issue summary', error);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openDropdownCategory, setOpenDropdownCategory] = useState<'STOCK' | 'EXPENSE' | null>(null);
  const [openDropdownApprovalStatus, setOpenDropdownApprovalStatus] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedSummary, setSelectedSummary] =
    useState<StockIssueSummaryType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'stock' | 'expense'>('all');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- Server-side list fetch (page / limit / search) ---
  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await StockIssueSummaryApi.getAll({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchDebounced.trim() ? { search: searchDebounced.trim() } : {}),
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      });
      if (res?.data) setStockIssueSummaries(res.data);
      if (res?.meta?.total !== undefined) {
        setTotalItemsServer(res.meta.total);
      } else if (res?.data) {
        setTotalItemsServer(res.data.length);
      }
    } catch (e) {
      console.error('Failed to fetch stock issue summaries', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchDebounced, startDate, endDate]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Load warehouses / users once
  useEffect(() => {
    fetchData(['warehouses', 'users', 'jobs']).catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce searchQuery → searchDebounced (triggers server fetch)
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

  const jobMap = useMemo(
    () =>
      new Map(
        jobs.map((j) => {
          const jExt = j as unknown as Record<string, unknown>;
          const c = jExt.customer as Record<string, string> | undefined;
          const customerName = c
            ? `${c.first_name || ''} ${c.last_name || ''}`.trim()
            : '';
          const workDate = (jExt.start_date || jExt.appointment_date || j.created_at) as string;
          const formattedDate = workDate
            ? new Date(workDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
            : '';
          const label = customerName
            ? `${customerName}${formattedDate ? ` (${formattedDate})` : ''}`
            : formattedDate || j.id.substring(0, 8);
          return [j.id, label];
        })
      ),
    [jobs]
  );

  const uniqueCreators = useMemo(
    () => [...new Set(stockIssueSummaries.map((s) => s.created_by).filter(Boolean))],
    [stockIssueSummaries]
  );

  // Creator dropdown options: users prop + extraUsers (backend search) + creator จาก summaries
  const creatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of [...users, ...extraUsers]) {
      if (map.has(u.id)) continue;
      const label = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      map.set(u.id, label || u.id);
    }
    for (const id of uniqueCreators) {
      if (!id || map.has(id)) continue;
      const fromMap = userMap.get(id);
      map.set(id, (fromMap && fromMap !== '[object Object]') ? fromMap : `${id.substring(0, 8)}...`);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [users, extraUsers, uniqueCreators, userMap]);

  const filteredSummaries = useMemo(() => {
    let filtered = [...stockIssueSummaries].sort((a, b) => {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    // LEAD_TECH / TECH เห็นเฉพาะที่ตัวเองสร้าง
    if (isTechRole && currentUser?.id) {
      filtered = filtered.filter((s) =>
        s.requester_id === currentUser.id || s.created_by === currentUser.id
      );
    }

    // Tab filter: keep all summaries (tab-based row-level filter applied later in flatten step)

    // Filter by creator
    if (creatorFilter !== 'all') {
      filtered = filtered.filter((s) => s.created_by === creatorFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    return filtered;
  }, [stockIssueSummaries, creatorFilter, statusFilter, isTechRole, currentUser?.id]);

  // Option B — flatten แต่ละใบเบิกเป็นหลายแถวตาม approval category
  // - ไม่มี approval records → 1 แถว (category = null)
  // - มี approval records → 1 แถวต่อ 1 record (STOCK / EXPENSE แยก)
  type SummaryRow = {
    summary: StockIssueSummaryType;
    category: 'STOCK' | 'EXPENSE' | null;
    approvalStatus?: string | null;
  };

  const flattenedRows: SummaryRow[] = useMemo(() => {
    const rows: SummaryRow[] = [];
    for (const s of filteredSummaries) {
      const approvals = (s as any).approvals as Array<{ category: 'STOCK' | 'EXPENSE'; status: string }> | undefined;

      // Map approvals by category so we can attach approvalStatus to the right row
      const approvalByCategory = new Map<'STOCK' | 'EXPENSE', { status: string }>();
      for (const a of approvals || []) {
        approvalByCategory.set(a.category, a);
      }

      const hasStock = (s.items?.length || 0) > 0;
      const hasExpense = (s.expense_items?.length || 0) > 0;

      // Always render one row per category present on the summary — regardless
      // of whether that category exceeded a limit. Rows for categories that did
      // exceed get the matching approvalStatus (PENDING / APPROVED / REJECTED);
      // ones that didn't exceed have no approvalStatus and follow the parent
      // summary's status badge.
      if (hasStock) {
        const a = approvalByCategory.get('STOCK');
        rows.push({ summary: s, category: 'STOCK', approvalStatus: a?.status ?? null });
      }
      if (hasExpense) {
        const a = approvalByCategory.get('EXPENSE');
        rows.push({ summary: s, category: 'EXPENSE', approvalStatus: a?.status ?? null });
      }
      if (!hasStock && !hasExpense) {
        rows.push({ summary: s, category: null });
      }
    }

    // Filter ตาม tab (row-level)
    if (activeTab === 'stock') {
      return rows.filter((r) =>
        r.category === 'STOCK' ||
        (r.category === null && (r.summary.items?.length || 0) > 0),
      );
    }
    if (activeTab === 'expense') {
      return rows.filter((r) =>
        r.category === 'EXPENSE' ||
        (r.category === null && (r.summary.expense_items?.length || 0) > 0),
      );
    }
    return rows;
  }, [filteredSummaries, activeTab]);

  // Server paginates already when no extra client filters are active.
  // When user applies creator / status / tab / date filter → paginate the filtered rows client-side.
  const hasClientFilter = !!(
    creatorFilter !== 'all' ||
    statusFilter !== 'all' ||
    activeTab !== 'all'
  );
  const totalItems = hasClientFilter ? flattenedRows.length : totalItemsServer;
  const paginatedRows = hasClientFilter
    ? flattenedRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : flattenedRows;

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (summary: StockIssueSummaryType) => {
    setSelectedSummary(summary);
    setIsDetailsModalOpen(true);
  };

  const handleRowApprove = async (
    summaryId: string,
    category: 'STOCK' | 'EXPENSE',
  ) => {
    const summary = stockIssueSummaries.find((s) => s.id === summaryId);
    const title = category === 'STOCK' ? 'อนุมัติเบิกสินค้า/สารเคมี?' : 'อนุมัติค่าใช้จ่าย?';

    const requesterName = (() => {
      const r: any = (summary as any)?.requester;
      if (r) return pickName(joinName(r.first_name, r.last_name), r.nick_name) || '-';
      const u = users?.find((x: any) => x.id === summary?.created_by);
      if (u) return pickName(joinName(u.first_name, u.last_name), u.nick_name) || '-';
      return '-';
    })();
    const warehouseName =
      warehouses?.find((w: any) => w.id === summary?.warehouse_id)?.name || '-';
    const code = (summary as any)?.code || null;
    const fmt = (v: number) =>
      `${Number(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;

    let html = '';
    if (category === 'STOCK') {
      const items = summary?.items || [];
      const totalQty = items.reduce((s, it: any) => s + Number(it.quantity || 0), 0);
      html = renderApprovalDetails(
        [
          { label: 'เลขที่ใบเบิก', value: code },
          { label: 'ผู้เบิก', value: requesterName },
          { label: 'คลัง', value: warehouseName },
          { label: 'จำนวนรายการ', value: `${items.length} รายการ (${totalQty} ชิ้น)` },
        ],
        summary?.over_limit_reason,
        'เหตุผลเกินลิมิต',
      );
      html += renderItemList(
        items.map((it: any) => ({
          name: it.product?.name || it.name || it.product_id || '-',
          right: `${Number(it.quantity || 0)} ชิ้น`,
          rightColor: '#64748b',
        })),
      );
    } else {
      const expenses = (summary?.expense_items || []) as any[];
      const totalAmount = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
      html = renderApprovalDetails(
        [
          { label: 'เลขที่ใบเบิก', value: code },
          { label: 'ผู้เบิก', value: requesterName },
          { label: 'คลัง', value: warehouseName },
          { label: 'จำนวนรายการ', value: `${expenses.length} รายการ` },
          { label: 'ยอดรวม', value: fmt(totalAmount), accent: 'money' },
        ],
        summary?.over_limit_reason,
        'เหตุผลเกินลิมิต',
      );
      html += renderItemList(
        expenses.map((e: any) => ({
          name: e.description || e.note || '-',
          right: fmt(Number(e.amount || 0)),
          rightColor: '#10b981',
        })),
      );
    }

    const confirm = await Swal.fire({
      title,
      html,
      icon: 'question',
      width: 560,
      showCancelButton: true,
      confirmButtonText: 'อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
    });
    if (!confirm.isConfirmed) return;
    try {
      await StockIssueSummaryApi.approve(summaryId, {
        status: 'APPROVED',
        category,
      });
      Swal.fire({ icon: 'success', title: 'อนุมัติแล้ว', timer: 1500, showConfirmButton: false });
      await fetchData(['stockIssueSummaries']);
    } catch (error) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถอนุมัติได้', 'error');
    }
  };

  const handleRowReject = async (
    summaryId: string,
    category: 'STOCK' | 'EXPENSE',
  ) => {
    const title = category === 'STOCK' ? 'ไม่อนุมัติเบิกสินค้า?' : 'ไม่อนุมัติค่าใช้จ่าย?';
    const r = await Swal.fire({
      title,
      text: 'การไม่อนุมัติจะยกเลิกใบเบิกทั้งใบ',
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
    try {
      await StockIssueSummaryApi.approve(summaryId, {
        status: 'REJECTED',
        category,
        remark: r.value.trim(),
      });
      Swal.fire({ icon: 'success', title: 'ไม่อนุมัติแล้ว', timer: 1500, showConfirmButton: false });
      await fetchData(['stockIssueSummaries']);
    } catch (error) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถดำเนินการได้', 'error');
    }
  };

  // Auto-trigger approval flow when navigating from a notification click
  useNotificationFocus('approve', true, async (focusId, extra) => {
    let target: any = stockIssueSummaries.find((s) => s.id === focusId);
    if (!target) {
      try {
        target = await StockIssueSummaryApi.getById(focusId);
        setStockIssueSummaries((prev) => {
          if (prev.some((s) => s.id === target.id)) return prev;
          return [target, ...prev];
        });
      } catch {
        Swal.fire('ไม่พบใบเบิก', 'อาจถูกลบหรือคุณไม่มีสิทธิ์เข้าถึง', 'error');
        return;
      }
    }
    if (!target) return;
    const cat = (extra.get('category') || '').toUpperCase();
    const category: 'STOCK' | 'EXPENSE' = cat === 'EXPENSE' ? 'EXPENSE' : 'STOCK';
    setTimeout(() => handleRowApprove(focusId, category), 0);
  });

  const handleEditSummary = (summary: StockIssueSummaryType) => {
    setSelectedSummary(summary);
    setModalMode('edit'); setIsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    summaryId: string,
    category?: 'STOCK' | 'EXPENSE' | null,
    approvalStatus?: string | null,
  ) => {
    event.stopPropagation();
    if (openDropdownId === summaryId && openDropdownCategory === (category ?? null)) {
      setOpenDropdownId(null);
      setOpenDropdownCategory(null);
      setOpenDropdownApprovalStatus(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setOpenDropdownId(summaryId);
      setOpenDropdownCategory(category ?? null);
      setOpenDropdownApprovalStatus(approvalStatus ?? null);
      setDropdownPosition({
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.right + window.scrollX,
      });
    }
  };

  const handleDelete = (summaryId: string) => {
    if (confirm('ยืนยันการลบใบเบิก?')) {
      onDeleteStockIssueSummary(summaryId);
    }
    setOpenDropdownId(null);
  };

  // Effect to close dropdown when modal opens
  useEffect(() => {
    if (isDetailsModalOpen) {
      setOpenDropdownId(null);
    }
  }, [isDetailsModalOpen]);

  // Effect to handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        if (
          !(event.target as HTMLElement).closest('button[data-summary-id]')
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

  const getActionItems = (
    summary: StockIssueSummaryType,
    category?: 'STOCK' | 'EXPENSE' | null,
    approvalStatus?: string | null,
  ) => {
    const canApproveThisRow =
      approvalStatus === 'PENDING' &&
      ((category === 'STOCK' && canApproveStock) ||
        (category === 'EXPENSE' && canApproveExpense));

    const isDraft = summary.status === 'DRAFT';

    // ช่าง (LEAD_TECH/TECH) เห็นได้แค่ "ดูรายละเอียด" ไม่ให้แก้/เปลี่ยนสถานะ/ลบ
    // แก้ไข / เปลี่ยนสถานะ / ลบ — เปิดให้ทำเฉพาะใบที่สถานะเป็น DRAFT (ฉบับร่าง)
    const actions = [
      ...(canApproveThisRow
        ? [
            {
              label: 'อนุมัติ',
              icon: CheckCircleIcon,
              color: 'text-green-600',
              hoverBg: 'hover:bg-green-50',
              onClick: () =>
                handleRowApprove(summary.id as string, category as 'STOCK' | 'EXPENSE'),
            },
            {
              label: 'ไม่อนุมัติ',
              icon: TrashIcon,
              color: 'text-red-600',
              hoverBg: 'hover:bg-red-50',
              onClick: () =>
                handleRowReject(summary.id as string, category as 'STOCK' | 'EXPENSE'),
            },
          ]
        : []),
      {
        label: 'ดูรายละเอียด',
        icon: EyeIcon,
        color: 'text-slate-700',
        hoverBg: 'hover:bg-slate-50',
        onClick: () => handleViewDetails(summary),
      },
      ...(!isTechRole && isDraft
        ? [
            {
              label: 'แก้ไข',
              icon: PencilIcon,
              color: 'text-blue-600',
              hoverBg: 'hover:bg-blue-50',
              onClick: () => handleEditSummary(summary),
            },
            {
              label: 'เปลี่ยนสถานะ',
              icon: CheckCircleIcon,
              color: 'text-slate-700',
              hoverBg: 'hover:bg-slate-50',
              onClick: () => handleStatusClick(summary),
            },
            {
              label: 'ลบ',
              icon: TrashIcon,
              color: 'text-red-600',
              hoverBg: 'hover:bg-red-50',
              onClick: () => handleDelete(summary.id),
            },
          ]
        : []),
    ];

    return actions;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1 min-h-0 gap-4 max-w-full">
        {/* --- Header: Title + Create Button --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
              สรุปการเบิกสินค้า/อุปกรณ์
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-600">
              ติดตามและจัดการการเบิกสินค้าและอุปกรณ์
            </p>
          </div>
          <Button onClick={() => { setModalMode('create'); setIsModalOpen(true); }} className="self-start sm:self-auto">
            <PlusIcon className="h-5 w-5" />
            สร้างใบเบิกสินค้า/อุปกรณ์
          </Button>
        </div>

        {/* --- Filter Bar + Tabs --- */}
        <Card className="!p-3 sm:!p-4 flex-shrink-0">
          <div className="flex flex-col lg:flex-row flex-wrap lg:items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Input
                type="search"
                placeholder="ค้นหาเลขที่เอกสารเบิก"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {!isTechRole && (
              <div className="w-full sm:w-48 sm:flex-shrink-0">
                <SearchableSelect
                  value={creatorFilter === 'all' ? '' : creatorFilter}
                  onChange={(v) => {
                    setCreatorFilter(v || 'all');
                    setCurrentPage(1);
                  }}
                  onSearchChange={(q) => {
                    if (creatorSearchTimerRef.current) clearTimeout(creatorSearchTimerRef.current);
                    creatorSearchTimerRef.current = setTimeout(() => searchCreators(q), 300);
                  }}
                  options={[
                    { value: '', label: 'ผู้เบิกทั้งหมด' },
                    ...creatorOptions,
                  ]}
                  placeholder="ผู้เบิกทั้งหมด"
                />
              </div>
            )}
            <div className="w-full sm:w-auto">
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
                  { value: 'CANCELLED', label: 'ยกเลิก' },
                ]}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <DatePicker
                selected={startDate ? new Date(startDate) : null}
                onChange={(date: Date | null) => {
                  setStartDate(date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '');
                  setCurrentPage(1);
                }}
                dateFormat="dd/MM/yyyy"
                locale="th"
                placeholderText="วันที่เริ่มต้น"
                isClearable
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
                wrapperClassName="flex-1 sm:w-36"
              />
              <span className="text-slate-400 shrink-0">-</span>
              <DatePicker
                selected={endDate ? new Date(endDate) : null}
                onChange={(date: Date | null) => {
                  setEndDate(date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '');
                  setCurrentPage(1);
                }}
                dateFormat="dd/MM/yyyy"
                locale="th"
                placeholderText="วันที่สิ้นสุด"
                isClearable
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
                wrapperClassName="flex-1 sm:w-36"
              />
            </div>
            {/* Category Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg flex-shrink-0 lg:ml-auto">
              {([
                { key: 'all', label: 'ทั้งหมด' },
                { key: 'stock', label: 'สินค้า/สารเคมี' },
                { key: 'expense', label: 'ค่าใช้จ่าย' },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* --- Desktop View: Table --- */}
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden relative min-h-0">
          <div className="overflow-auto flex-1 relative min-h-0">
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-16">ลำดับ</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">วันที่เบิก</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จำนวนรายการ</th>
                  {activeTab !== 'expense' && (
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จำนวนสินค้าที่เบิกเกิน</th>
                  )}
                  {activeTab !== 'stock' && (
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จำนวนเงินที่เบิก</th>
                  )}
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">คลัง</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ผู้เบิก</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">เอกสารอ้างอิง</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">หมายเหตุ</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ประเภท</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">สถานะ</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-20">จัดการ</th>
                </tr>
              </thead>
              
              {!isLoading && paginatedRows.length > 0 && (
                <tbody className="bg-white divide-y divide-slate-200">
                  {paginatedRows.map((row, index) => {
                    const summary = row.summary;
                    const warehouse = warehouseMap.get(summary.warehouse_id);

                    const stockCount = summary.items?.length || 0;
                    const expenseCount = summary.expense_items?.length || 0;

                    // รวมจำนวนสินค้าที่เบิก (quantity) แทนการคำนวณมูลค่า
                    const totalGoodsQuantity =
                      summary.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;

                    const totalExpenseAmount =
                      summary.expense_items?.reduce(
                        (sum: number, exp: UserExpense) => sum + Number(exp.amount || 0),
                        0,
                      ) || 0;

                    // ถ้า row นี้แยกตาม category → แสดงเฉพาะฝั่งที่กรอก
                    const showStockOnly = row.category === 'STOCK';
                    const showExpenseOnly = row.category === 'EXPENSE';

                    const displayCount = showStockOnly
                      ? stockCount
                      : showExpenseOnly
                        ? expenseCount
                        : activeTab === 'stock'
                          ? stockCount
                          : activeTab === 'expense'
                            ? expenseCount
                            : stockCount + expenseCount;

                    const _displayAmount = showStockOnly
                      ? totalGoodsQuantity
                      : showExpenseOnly
                        ? totalExpenseAmount
                        : activeTab === 'stock'
                          ? totalGoodsQuantity
                          : activeTab === 'expense'
                            ? totalExpenseAmount
                            : totalExpenseAmount;
                    void _displayAmount;

                    // Prefer nested requester from backend → fallback to userMap → '-'
                    const nestedRequester = (summary as any).requester;
                    const nestedRequesterName = nestedRequester
                      ? [nestedRequester.first_name, nestedRequester.last_name].filter(Boolean).join(' ').trim() ||
                        nestedRequester.nick_name ||
                        ''
                      : '';
                    const requesterName = nestedRequesterName ||
                      (summary.requester_id ? userMap.get(summary.requester_id) || '-' : '-');

                    // Status badge: ถ้า row แยกตาม category → ใช้สถานะของ approval นั้น
                    let badgeStatusText = '';
                    let badgeStatusClass = 'bg-slate-100 text-slate-700 border-slate-200';
                    if (row.category && row.approvalStatus) {
                      const apMap: Record<string, { text: string; className: string }> = {
                        PENDING: { text: 'รออนุมัติ', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                        APPROVED: { text: 'อนุมัติแล้ว', className: 'bg-green-100 text-green-700 border-green-200' },
                        REJECTED: { text: 'ไม่อนุมัติ', className: 'bg-red-100 text-red-700 border-red-200' },
                        VERIFIED: { text: 'ตรวจสอบแล้ว', className: 'bg-blue-100 text-blue-700 border-blue-200' },
                      };
                      const meta = apMap[row.approvalStatus] || { text: row.approvalStatus, className: 'bg-slate-100 text-slate-700 border-slate-200' };
                      badgeStatusText = meta.text;
                      badgeStatusClass = meta.className;
                    } else {
                      const b = getStatusBadge(summary.status);
                      badgeStatusText = b.text;
                      badgeStatusClass = b.className;
                    }

                    // ประเภท (column ใหม่ ก่อนสถานะ)
                    const typeText =
                      row.category === 'STOCK'
                        ? 'สินค้า/สารเคมี'
                        : row.category === 'EXPENSE'
                          ? 'ค่าใช้จ่าย'
                          : '-';
                    const typeClass =
                      row.category === 'STOCK'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : row.category === 'EXPENSE'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200';

                    // แยก stock / expense value ต่อ column
                    // - category=STOCK → ใส่ที่ column มูลค่าสินค้า เท่านั้น
                    // - category=EXPENSE → ใส่ที่ column จำนวนเงินที่เบิก เท่านั้น
                    // - ไม่มี category (ใบไม่เกิน limit) → ใส่ทั้ง 2 column ตามค่าจริง
                    const showStockCell = !row.category || row.category === 'STOCK';
                    const showExpenseCell = !row.category || row.category === 'EXPENSE';

                    const fmtMoney = (v: number) =>
                      `${v.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} บาท`;

                    return (
                      <tr key={`${summary.id}-${row.category || 'all'}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                          {summary.issue_date
                            ? formatThaiDate(summary.issue_date)
                            : summary.created_at
                              ? formatThaiDate(summary.created_at)
                              : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                          {displayCount}
                        </td>
                        {activeTab !== 'expense' && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                            {showStockCell ? (
                              <span>{totalGoodsQuantity.toLocaleString('th-TH')} <span className="text-xs text-slate-500">ชิ้น</span></span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )}
                        {activeTab !== 'stock' && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                            {showExpenseCell ? fmtMoney(totalExpenseAmount) : <span className="text-slate-300">—</span>}
                          </td>
                        )}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                          {warehouse?.name || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                          {requesterName}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 text-center max-w-[200px]">
                          {summary.job_id ? (
                            <span className="truncate block" title={jobMap.get(summary.job_id) || summary.job_id}>
                              {jobMap.get(summary.job_id) || `#${summary.job_id.substring(0, 8)}`}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 text-center max-w-[180px]">
                          {summary.notes ? (
                            <span className="truncate block" title={summary.notes}>
                              {summary.notes}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${typeClass}`}>
                            {typeText}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${badgeStatusClass}`}>
                            {badgeStatusText}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                          <Button
                            variant="icon"
                            data-summary-id={summary.id}
                            onClick={(e) =>
                              handleDropdownToggle(
                                e,
                                summary.id,
                                row.category,
                                row.approvalStatus || null,
                              )
                            }
                          >
                            <span className="sr-only">จัดการ</span>
                            <ManageIcon className="h-5 w-5" aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>

            {/* --- Loading State — overlay กึ่งกลางตาราง --- */}
            {isLoading && (
              <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-500 bg-white/70">
                <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                <p className="text-base font-medium">กำลังโหลดข้อมูลสรุปการเบิก...</p>
              </div>
            )}

            {/* --- Empty State — overlay กึ่งกลางตาราง --- */}
            {!isLoading && paginatedRows.length === 0 && (
              <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                <DocumentCheckIcon className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-lg font-medium">ไม่พบข้อมูลสรุปการเบิก</p>
                <p className="text-sm mt-1">ลองปรับตัวกรองหรือสร้างใบเบิกใหม่</p>
              </div>
            )}
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
                const summary = stockIssueSummaries.find(
                  (s) => s.id === openDropdownId
                );
                if (!summary) return null;

                return getActionItems(summary, openDropdownCategory, openDropdownApprovalStatus).map((action, index) => (
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

      {/* Create / Edit Modal */}
      <IssueSummaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        onSubmit={modalMode === 'edit' ? onUpdateStockIssueSummary : onCreateStockIssueSummary}
        summary={modalMode === 'edit' ? selectedSummary : null}
        warehouses={warehouses}
        products={products}
        users={users}
      />

      {/* Details Modal */}
      <StockIssueSummaryDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        summary={selectedSummary}
        warehouses={warehouses}
        products={products}
        users={users}
      />

      {/* Status Change Modal */}
      <ConfirmationModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleStatusConfirm}
        title="อัปเดตสถานะ"
        message={
          <div className="space-y-4 text-left">
            <p className="text-sm text-slate-600">
              กรุณาเลือกสถานะใหม่
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">สถานะ</label>
              <DropdownSelect
                value={targetStatus}
                onChange={(val) => setTargetStatus(val)}
                options={[
                  { value: 'DRAFT', label: 'ฉบับร่าง' },
                  { value: 'PENDING', label: 'รออนุมัติ' },
                  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
                  { value: 'COMPLETED', label: 'เสร็จสิ้น' },
                  { value: 'CANCELLED', label: 'ยกเลิก' },
                ]}
              />
            </div>
          </div>
        }
      />
    </div>
  );
};

export default IssueSummaryPage;