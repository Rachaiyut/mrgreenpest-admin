// ===== React / External =====
import Swal from '@/src/utils/swal';
import {
  FC,
  Fragment,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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

import { WithdrawalLifecycle, WithdrawalLineStatus } from '@/src/types/enums/inventory';

// ===== Context =====
import { useData } from '../../../contexts/DataContext';

// ===== Components =====
import { WithdrawalModal } from '../../../components/features/inventory/withdrawal/WithdrawalModal';
import { WithdrawalDetailsModal } from '../../../components/features/inventory/withdrawal/WithdrawalDetailsModal';

import { Card } from '../../../components/common/Card';
import { Input, Button } from '../../../components/common/FormControls';
import { DropdownSelect } from '../../../components/common/DropdownSelect';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { Pagination } from '../../../components/common/Pagination';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { usePermissions } from '../../../hooks/usePermissions';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useNotificationFocus } from '../../../hooks/useNotificationFocus';
import { renderApprovalDetails, renderItemList, joinName, pickName } from '../../../utils/approvalSwal';
import { isFieldRole } from '../../../utils/role';
import DatePicker from '@/src/components/common/BuddhistDatePicker';

// ===== API =====
import {
  CustomerApi,
  ProductApi,
  UserApi,
  WarehouseApi,
  IssueNoteApi,
  AccountApi,
} from '../../../api';

// ===== Utils =====
import { formatThaiDate } from '../../../utils/date';

// ===== Assets =====
import {
  CurrencyDollarIcon,
  DocumentCheckIcon,
  EyeIcon,
  ManageIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  TruckIcon,
  XCircleIcon,
  LoadingIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '../../../assets/icons/Icons';

const Issue: FC = () => {
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
  const [lifecycleFilter, setLifecycleFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('all');
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
          ...(lifecycleFilter !== 'all' ? { lifecycle: lifecycleFilter } : {}),
          ...(stockStatusFilter !== 'all' ? { stock_status: stockStatusFilter } : {}),
          ...(expenseStatusFilter !== 'all' ? { expense_status: expenseStatusFilter } : {}),
        }),
        UserApi.getAll(),
        WarehouseApi.getWarehouses(),
        CustomerApi.getCustomers(),
        ProductApi.getProducts({ is_active: true }),
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
  }, [currentPage, itemsPerPage, searchDebounced, lifecycleFilter, stockStatusFilter, expenseStatusFilter]);

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
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
    event: ReactMouseEvent<HTMLButtonElement>,
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

  const handleApprovalAction = async (
    action: 'approve' | 'reject',
    overrideId?: string,
    category?: 'STOCK' | 'EXPENSE',
  ) => {
    const targetId = overrideId ?? openDropdownId;
    const withdrawal = withdrawals.find((w) => w.id === targetId);
    if (!withdrawal) return;
    setOpenDropdownId(null);

    if (action === 'approve') {
      // ถ้าระบุ category = EXPENSE → ตัดเงินบัญชี (ต้องเลือกบัญชี)
      // ถ้าระบุ category = STOCK → ไม่ต้องถามบัญชี (ตัดเฉพาะ stock)
      const hasExpense = category === 'EXPENSE'
        || (category === undefined && (withdrawal.expenses?.length || 0) > 0);
      const totalExpense = (withdrawal.expenses || []).reduce(
        (s, e) => s + Number(e.amount || 0),
        0,
      );

      // ใบเบิกมีค่าใช้จ่าย → ต้องเลือกบัญชีก่อน
      if (hasExpense) {
        let accountId: string | null = null;
        try {
          const accountsRes = await AccountApi.getAll({ limit: 10, page: 1 });
          const accounts = (accountsRes?.data || []).filter((a) => a.is_active);
          if (accounts.length === 0) {
            const totalAll = accountsRes?.data?.length || 0;
            await Swal.fire({
              icon: 'warning',
              title: 'ไม่มีบัญชีให้เลือก',
              text:
                totalAll === 0
                  ? 'กรุณาสร้างบัญชีอย่างน้อย 1 บัญชีก่อนอนุมัติใบเบิกที่มีค่าใช้จ่าย'
                  : 'บัญชีทั้งหมดถูกปิดการใช้งาน — กรุณาเปิดใช้งานหรือสร้างบัญชีใหม่',
            });
            return;
          }
          const fmtMoney = (v: number) =>
            `${Number(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
          const escape = (s: string) =>
            s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
          const optionsHtml = accounts
            .map(
              (a) =>
                `<option value="${a.id}" data-bal="${Number(a.current_balance || 0)}" data-name="${escape(a.account_name)}" data-bank="${escape(a.bank_name)}" data-num="${escape(a.account_number)}">${escape(a.account_name)} (${escape(a.bank_name)})</option>`,
            )
            .join('');
          const r = await Swal.fire({
            icon: 'question',
            title: 'ยืนยันการอนุมัติ',
            width: 640,
            html: `
              <div style="max-width:520px; margin:0 auto;">
                <!-- Summary text -->
                <div style="text-align:center; font-size:14px; color:#475569; margin-bottom:16px; line-height:1.8;">
                  <div>เลขที่ใบเบิก: <strong style="color:#0f172a;">${escape(withdrawal.code || withdrawal.id)}</strong></div>
                  <div>ยอดเบิกจ่าย: <strong style="color:#dc2626; font-size:16px;">${fmtMoney(totalExpense)}</strong></div>
                </div>

                <!-- Account select -->
                <label style="display:block; text-align:left; font-size:13px; font-weight:600; color:#334155; margin-bottom:6px;">
                  เลือกบัญชี <span style="color:#dc2626;">*</span>
                </label>
                <select id="swal-account-select" class="swal2-select" style="display:block; width:100%; margin:0; font-size:14px; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; color:#0f172a; height:auto; appearance:auto; -webkit-appearance:auto; -moz-appearance:auto; cursor:pointer; transition:border-color .15s, box-shadow .15s;">
                  <option value="" style="color:#94a3b8;">กรุณาเลือกบัญชี</option>
                  ${optionsHtml}
                </select>

                <!-- Info area -->
                <div id="swal-account-info" style="margin-top:14px; min-height:130px;">
                  <div style="text-align:center; padding:24px 12px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:10px; color:#94a3b8; font-size:13px; display:flex; flex-direction:column; align-items:center; gap:6px;">
                    <span style="font-size:24px; line-height:1;">📊</span>
                    <span>เลือกบัญชีจากด้านบน เพื่อดูยอดคงเหลือและสรุปการตัดเงิน</span>
                  </div>
                </div>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'อนุมัติ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#10b981',
            didOpen: () => {
              const sel = document.getElementById('swal-account-select') as HTMLSelectElement | null;
              const info = document.getElementById('swal-account-info');
              if (!sel || !info) return;
              sel.addEventListener('focus', () => {
                sel.style.borderColor = '#10b981';
                sel.style.boxShadow = '0 0 0 3px rgba(16,185,129,.15)';
              });
              sel.addEventListener('blur', () => {
                sel.style.borderColor = '#cbd5e1';
                sel.style.boxShadow = 'none';
              });
              const update = () => {
                const opt = sel.selectedOptions[0];
                if (!opt?.value) {
                  info.innerHTML = '';
                  return;
                }
                const bal = Number(opt.dataset.bal || '0');
                const after = bal - totalExpense;
                const isOk = after >= 0;

                if (isOk) {
                  // ✅ สถานะ "ผ่าน" — card สะอาด สี soft green ที่ footer
                  info.innerHTML = `
                    <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; box-shadow:0 1px 2px rgba(15,23,42,0.04);">
                      <div style="padding:12px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0; text-align:left;">
                        <div style="font-size:13px;">
                          <span style="color:#64748b;">ชื่อบัญชี:</span>
                          <span style="color:#0f172a; font-weight:600; margin-left:6px;">${escape(opt.dataset.name || '')}</span>
                        </div>
                        <div style="font-size:13px; margin-top:4px;">
                          <span style="color:#64748b;">ธนาคาร:</span>
                          <span style="color:#0f172a; font-weight:600; margin-left:6px;">${escape(opt.dataset.bank || '')}</span>
                        </div>
                        <div style="font-size:13px; margin-top:4px;">
                          <span style="color:#64748b;">เลขที่บัญชี:</span>
                          <span style="color:#0f172a; font-weight:600; margin-left:6px;">${escape(opt.dataset.num || '')}</span>
                        </div>
                      </div>
                      <div style="padding:12px 16px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
                          <span style="color:#64748b;">ยอดคงเหลือปัจจุบัน</span>
                          <span style="color:#0f172a; font-weight:600;">${fmtMoney(bal)}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; margin-top:6px;">
                          <span style="color:#64748b;">ยอดเบิกจ่าย</span>
                          <span style="color:#dc2626; font-weight:600;">− ${fmtMoney(totalExpense)}</span>
                        </div>
                      </div>
                      <div style="padding:10px 16px; background:#ecfdf5; border-top:1px solid #a7f3d0; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:13px; font-weight:600; color:#0f172a;">ยอดคงเหลือหลังทำรายการ</span>
                        <span style="font-size:18px; font-weight:700; color:#047857;">${fmtMoney(after)}</span>
                      </div>
                    </div>
                  `;
                  return;
                }

                // ❌ สถานะ "ไม่ผ่าน" — redesign ใหม่หมด: เน้น warning, math breakdown
                info.innerHTML = `
                  <div style="background:#fff; border:2px solid #ef4444; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(239,68,68,0.12);">
                    <!-- Banner -->
                    <div style="background:linear-gradient(90deg,#fef2f2 0%,#fee2e2 100%); padding:14px 16px; display:flex; align-items:center; gap:12px; border-bottom:1px solid #fecaca;">
                      <div style="flex-shrink:0; width:36px; height:36px; border-radius:50%; background:#dc2626; display:flex; align-items:center; justify-content:center;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
                        </svg>
                      </div>
                      <div style="flex:1; text-align:left; min-width:0;">
                        <div style="font-size:15px; font-weight:700; color:#991b1b;">ยอดเงินไม่เพียงพอ</div>
                        <div style="font-size:12px; color:#7f1d1d; margin-top:1px;">${escape(opt.dataset.name || '')} · ${escape(opt.dataset.bank || '')}</div>
                      </div>
                    </div>

                    <!-- Math breakdown -->
                    <div style="padding:14px 16px; background:#fff;">
                      <div style="display:grid; grid-template-columns:1fr auto 1fr auto 1fr; align-items:center; gap:6px;">
                        <div style="text-align:center;">
                          <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.04em;">คงเหลือ</div>
                          <div style="font-size:14px; font-weight:600; color:#0f172a; margin-top:2px;">${fmtMoney(bal)}</div>
                        </div>
                        <div style="font-size:18px; color:#94a3b8; font-weight:300;">−</div>
                        <div style="text-align:center;">
                          <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.04em;">ตัด</div>
                          <div style="font-size:14px; font-weight:600; color:#0f172a; margin-top:2px;">${fmtMoney(totalExpense)}</div>
                        </div>
                        <div style="font-size:18px; color:#94a3b8; font-weight:300;">=</div>
                        <div style="text-align:center; padding:6px; background:#fef2f2; border-radius:6px;">
                          <div style="font-size:10px; color:#dc2626; text-transform:uppercase; letter-spacing:.04em; font-weight:600;">ขาด</div>
                          <div style="font-size:15px; font-weight:800; color:#dc2626; margin-top:2px;">${fmtMoney(Math.abs(after))}</div>
                        </div>
                      </div>
                    </div>

                    <!-- Action hint -->
                    <div style="padding:10px 16px; background:#fef2f2; border-top:1px solid #fecaca; font-size:12px; color:#7f1d1d; text-align:center;">
                      💡 กรุณาเลือกบัญชีอื่นที่มียอดเพียงพอ หรือเติมเงินเข้าบัญชีก่อนอนุมัติ
                    </div>
                  </div>
                `;
              };
              sel.addEventListener('change', update);
            },
            preConfirm: () => {
              const sel = (document.getElementById('swal-account-select') as HTMLSelectElement | null)?.value;
              if (!sel) {
                Swal.showValidationMessage('กรุณาเลือกบัญชี');
                return false;
              }
              return sel;
            },
          });
          if (!r.isConfirmed || !r.value) return;
          accountId = r.value as string;
        } catch (err) {
          console.error('Failed to load accounts', err);
          await Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดบัญชีได้', 'error');
          return;
        }
        await submitApproval(withdrawal.id, 'APPROVED', '', accountId || undefined, category);
        return;
      }

      // ใบเบิกไม่มีค่าใช้จ่าย → confirm ปกติ ไม่ต้องเลือกบัญชี
      const wAny: any = withdrawal;
      const requester = wAny.requester
        ? pickName(
            joinName(wAny.requester.first_name, wAny.requester.last_name),
            wAny.requester.nick_name,
          ) || '-'
        : (() => {
            const u = users?.find((x: any) => x.id === wAny.created_by);
            return u
              ? pickName(joinName(u.first_name, u.last_name), u.nick_name) || '-'
              : '-';
          })();
      const warehouseName =
        warehouses?.find((w: any) => w.id === wAny.warehouse_id)?.name || '-';
      const items = wAny.items || [];

      const html =
        renderApprovalDetails([
          { label: 'เลขที่ใบเบิก', value: withdrawal.code || null },
          { label: 'ผู้เบิก', value: requester },
          { label: 'คลัง', value: warehouseName },
          { label: 'จำนวนรายการ', value: items.length ? `${items.length} รายการ` : null },
        ]) +
        renderItemList(
          items.map((it: any) => ({
            name:
              it.product?.name
              || it.product_name
              || productMap.get(it.product_id)?.name
              || it.name
              || '-',
            right: `${Number(it.quantity || 0)} ชิ้น`,
            rightColor: '#64748b',
          })),
        );

      const r = await Swal.fire({
        icon: 'question',
        title: 'ยืนยันการอนุมัติใบเบิก',
        width: 560,
        html,
        showCancelButton: true,
        confirmButtonText: 'อนุมัติ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#10b981',
      });
      if (!r.isConfirmed) return;
      await submitApproval(withdrawal.id, 'APPROVED', '', undefined, category);
    } else {
      const r = await Swal.fire({
        icon: 'warning',
        title: 'ยืนยันการไม่อนุมัติ',
        html: `ไม่อนุมัติใบเบิก <strong>${withdrawal.code || withdrawal.id}</strong>`,
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
      await submitApproval(withdrawal.id, 'REJECTED', r.value.trim(), undefined, category);
    }
  };

  const submitApproval = async (
    withdrawalId: string,
    status: 'APPROVED' | 'REJECTED',
    remarks: string,
    accountId?: string,
    category?: 'STOCK' | 'EXPENSE',
  ) => {
    try {
      await IssueNoteApi.approve(withdrawalId, {
        status,
        remark: remarks,
        ...(accountId ? { account_id: accountId } : {}),
        ...(category ? { category } : {}),
      });
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

  // Auto-trigger approval flow when navigating from a notification click
  useNotificationFocus('approve', true, async (focusId) => {
    let target: any = withdrawals.find((w) => w.id === focusId);
    if (!target) {
      try {
        target = await IssueNoteApi.getById(focusId);
        // inject into local state so handleApprovalAction can find it
        setWithdrawals((prev) => {
          if (prev.some((w) => w.id === target.id)) return prev;
          return [target, ...prev];
        });
      } catch {
        Swal.fire('ไม่พบใบเบิก', 'อาจถูกลบหรือคุณไม่มีสิทธิ์เข้าถึง', 'error');
        return;
      }
    }
    if (!target) return;
    const hasPendingLine = (target.items || []).some((i) => i.status === WithdrawalLineStatus.PENDING)
      || (target.expenses || []).some((e) => e.status === WithdrawalLineStatus.PENDING);
    if (target.lifecycle !== WithdrawalLifecycle.SUBMITTED || !hasPendingLine) {
      Swal.fire('ใบเบิกไม่มีรายการที่รออนุมัติ', 'อาจถูกอนุมัติ/ยกเลิก หรือยังเป็นฉบับร่าง', 'info');
      return;
    }
    // give React a tick to update state if we just injected the record
    setTimeout(() => handleApprovalAction('approve', focusId), 0);
  });

  const handleCancel = async (withdrawalId: string) => {
    const withdrawalToUpdate = withdrawals.find((w) => w.id === withdrawalId);
    setOpenDropdownId(null);
    if (!withdrawalToUpdate) return;

    const r = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการยกเลิกใบเบิก',
      html: `ใบเบิก <strong>${withdrawalToUpdate.code || withdrawalToUpdate.id}</strong>`,
      input: 'textarea',
      inputLabel: 'เหตุผลการยกเลิก',
      inputPlaceholder: 'กรอกเหตุผล...',
      showCancelButton: true,
      confirmButtonText: 'ยกเลิกใบเบิก',
      cancelButtonText: 'ปิด',
      confirmButtonColor: '#ef4444',
      inputValidator: (v) => (!v || !v.trim() ? 'กรุณากรอกเหตุผล' : null),
    });
    if (!r.isConfirmed || !r.value) return;

    await onUpdateWithdrawal({
      id: withdrawalToUpdate.id,
      lifecycle: WithdrawalLifecycle.CANCELLED,
      cancellation_reason: r.value.trim(),
    } as any);
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

  type ActionEntry =
    | {
        kind: 'item';
        label: string;
        icon: typeof EyeIcon;
        color: string;
        hoverBg: string;
        onClick: () => void;
      }
    | { kind: 'header'; label: string }
    | { kind: 'divider' };

  const getActionItems = (withdrawal: WithdrawalType): ActionEntry[] => {
    const actions: ActionEntry[] = [
      {
        kind: 'item',
        label: 'ดูรายละเอียด',
        icon: EyeIcon,
        color: 'text-slate-700',
        hoverBg: 'hover:bg-slate-50',
        onClick: () => handleViewDetails(withdrawal),
      },
    ];

    const isDraft = withdrawal.lifecycle === WithdrawalLifecycle.DRAFT;
    const isSubmitted = withdrawal.lifecycle === WithdrawalLifecycle.SUBMITTED;

    // แก้ไขได้เฉพาะตอน DRAFT — ส่งแล้วห้ามแก้ (ใช้ flow approve/reject แทน)
    if (isDraft) {
      actions.push({
        kind: 'item',
        label: 'แก้ไข',
        icon: PencilIcon,
        color: 'text-blue-600',
        hoverBg: 'hover:bg-blue-50',
        onClick: () => handleEditWithdrawal(withdrawal),
      });
    }

    if (isSubmitted) {
      const canApproveStock = hasPermission('APPROVE_STOCK_ISSUE_NOTE');
      const canApproveExpense = hasPermission('APPROVE_EXPENSE_ISSUE_NOTE');
      const stockPending = (withdrawal.items || []).some((i) => i.status === WithdrawalLineStatus.PENDING);
      const expensePending = (withdrawal.expenses || []).some((e) => e.status === WithdrawalLineStatus.PENDING);
      const showStockActions = categoryTab !== 'expense';
      const showExpenseActions = categoryTab !== 'stock';
      const stockGroup = stockPending && canApproveStock && showStockActions;
      const expenseGroup = expensePending && canApproveExpense && showExpenseActions;

      if (stockGroup) {
        actions.push(
          { kind: 'divider' },
          { kind: 'header', label: 'สินค้า / สารเคมี' },
          {
            kind: 'item',
            label: 'อนุมัติ',
            icon: DocumentCheckIcon,
            color: 'text-green-600',
            hoverBg: 'hover:bg-green-50',
            onClick: () => handleApprovalAction('approve', undefined, 'STOCK'),
          },
          {
            kind: 'item',
            label: 'ไม่อนุมัติ',
            icon: XCircleIcon,
            color: 'text-red-600',
            hoverBg: 'hover:bg-red-50',
            onClick: () => handleApprovalAction('reject', undefined, 'STOCK'),
          },
        );
      }

      if (expenseGroup) {
        actions.push(
          { kind: 'divider' },
          { kind: 'header', label: 'ค่าใช้จ่าย' },
          {
            kind: 'item',
            label: 'อนุมัติ',
            icon: DocumentCheckIcon,
            color: 'text-green-600',
            hoverBg: 'hover:bg-green-50',
            onClick: () => handleApprovalAction('approve', undefined, 'EXPENSE'),
          },
          {
            kind: 'item',
            label: 'ไม่อนุมัติ',
            icon: XCircleIcon,
            color: 'text-red-600',
            hoverBg: 'hover:bg-red-50',
            onClick: () => handleApprovalAction('reject', undefined, 'EXPENSE'),
          },
        );
      }

      actions.push(
        { kind: 'divider' },
        {
          kind: 'item',
          label: 'ยกเลิก',
          icon: TrashIcon,
          color: 'text-red-600',
          hoverBg: 'hover:bg-red-50',
          onClick: () => handleCancel(withdrawal.id),
        },
      );
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
            สร้างใบเบิกสินค้า
          </Button>
        </div>

        <Card className="!p-3 sm:!p-4 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
            <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-sm">
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
              <div className="w-full sm:w-48 sm:flex-shrink-0">
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
            <div className="w-full sm:w-auto">
              <DropdownSelect
                value={lifecycleFilter}
                onChange={(val) => { setLifecycleFilter(val); setCurrentPage(1); }}
                className="w-full sm:w-fit text-sm"
                options={[
                  { value: 'all', label: 'สถานะใบทั้งหมด' },
                  { value: 'DRAFT', label: 'ฉบับร่าง' },
                  { value: 'SUBMITTED', label: 'ส่งแล้ว' },
                  { value: 'CANCELLED', label: 'ยกเลิก' },
                ]}
              />
            </div>
            <div className="w-full sm:w-auto">
              <DropdownSelect
                value={stockStatusFilter}
                onChange={(val) => { setStockStatusFilter(val); setCurrentPage(1); }}
                className="w-full sm:w-fit text-sm"
                options={[
                  { value: 'all', label: 'สถานะสินค้าทั้งหมด' },
                  { value: 'PENDING', label: 'สินค้า: รออนุมัติ' },
                  { value: 'APPROVED', label: 'สินค้า: อนุมัติแล้ว' },
                  { value: 'REJECTED', label: 'สินค้า: ไม่อนุมัติ' },
                ]}
              />
            </div>
            <div className="w-full sm:w-auto">
              <DropdownSelect
                value={expenseStatusFilter}
                onChange={(val) => { setExpenseStatusFilter(val); setCurrentPage(1); }}
                className="w-full sm:w-fit text-sm"
                options={[
                  { value: 'all', label: 'สถานะค่าใช้จ่ายทั้งหมด' },
                  { value: 'PENDING', label: 'ค่าใช้จ่าย: รออนุมัติ' },
                  { value: 'APPROVED', label: 'ค่าใช้จ่าย: อนุมัติแล้ว' },
                  { value: 'REJECTED', label: 'ค่าใช้จ่าย: ไม่อนุมัติ' },
                ]}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <DatePicker
                selected={startDate ? new Date(startDate) : null}
                onChange={(date: Date | null) => {
                  setStartDate(date ? date.toISOString().substring(0, 10) : '');
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
                  setEndDate(date ? date.toISOString().substring(0, 10) : '');
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
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 sm:ml-auto">
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

        {/* --- Table View (all screen sizes) --- */}
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden relative">
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
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    เลขที่เอกสารเบิก
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    วันที่เบิก
                  </th>
                  {categoryTab !== 'expense' && (
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-center text-sm font-medium text-slate-600 uppercase lg:table-cell hidden whitespace-nowrap"
                    >
                      จำนวนรายการสินค้า
                    </th>
                  )}
                  {categoryTab !== 'stock' && (
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      รวมจำนวนเงินที่เบิก
                    </th>
                  )}
                  {categoryTab !== 'stock' && (
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      ผู้รับเงิน
                    </th>
                  )}
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    ผู้สร้าง
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    สถานะใบ
                  </th>
                  {categoryTab !== 'expense' && (
                    <th
                      scope="col"
                      className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      สถานะสินค้า
                    </th>
                  )}
                  {categoryTab !== 'stock' && (
                    <th
                      scope="col"
                      className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      สถานะค่าใช้จ่าย
                    </th>
                  )}
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
                    <td colSpan={12} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-500">
                        <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-base font-medium">กำลังโหลดข้อมูลการเบิก...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-0 border-b-0 h-0">
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

                    const isAllTab = categoryTab === 'all';
                    const isExpanded = isAllTab && expandedKeys.has(withdrawal.id);
                    const hasItems = (withdrawal.items?.length || 0) > 0;
                    const hasExpenses = (withdrawal.expenses?.length || 0) > 0;
                    const colSpan =
                      6 +
                      (categoryTab !== 'expense' ? 2 : 0) +
                      (categoryTab !== 'stock' ? 3 : 0);
                    const fmtMoney = (v: number) =>
                      `${v.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} บาท`;

                    return (
                      <Fragment key={withdrawal.id}>
                        <tr
                          className={`hover:bg-slate-50 [&>td]:align-top ${isAllTab ? 'cursor-pointer' : ''}`}
                          onClick={isAllTab ? () => toggleExpanded(withdrawal.id) : undefined}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center xl:table-cell hidden">
                            {isAllTab ? (
                              <div className="inline-flex items-center gap-1">
                                {isExpanded ? (
                                  <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                                )}
                                <span>{(currentPage - 1) * itemsPerPage + index + 1}</span>
                              </div>
                            ) : (
                              <span>{(currentPage - 1) * itemsPerPage + index + 1}</span>
                            )}
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(withdrawal);
                            }}
                          >
                            {withdrawal.code}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            {withdrawal.created_at
                              ? formatThaiDate(withdrawal.created_at)
                              : '-'}
                          </td>
                          {categoryTab !== 'expense' && (
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center lg:table-cell hidden">
                              {withdrawal.items?.length || 0}
                            </td>
                          )}
                          {categoryTab !== 'stock' && (
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-right">
                              {totalExpenseAmount.toLocaleString('th-TH', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}บาท
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
                              const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(
                                withdrawal.created_by || '',
                              );
                              return looksLikeUuid ? 'ไม่กรอก' : withdrawal.created_by || '-';
                            })()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <StatusBadge status={withdrawal.lifecycle} />
                          </td>
                          {categoryTab !== 'expense' && (
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {hasItems ? (
                                <StatusBadge status={(withdrawal.items || [])[0]?.status || 'PENDING'} />
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                          )}
                          {categoryTab !== 'stock' && (
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {hasExpenses ? (
                                <StatusBadge status={(withdrawal.expenses || [])[0]?.status || 'PENDING'} />
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                          )}
                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm font-medium text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                        {isExpanded && (
                          <tr className="bg-gradient-to-b from-slate-50 to-slate-100/60">
                            <td colSpan={colSpan} className="px-6 py-5 border-t border-b border-slate-200">
                              <div className="grid grid-cols-2 gap-5">
                                {/* รายการสินค้า */}
                                <div className="rounded-xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
                                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-50 to-emerald-50/40 border-b border-emerald-100">
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                        <TruckIcon className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-semibold text-slate-800">รายการสินค้า/สารเคมี</h4>
                                        <p className="text-xs text-slate-500">ทั้งหมด {withdrawal.items?.length || 0} รายการ</p>
                                      </div>
                                    </div>
                                    {hasItems && (
                                      <div className="text-right">
                                        <div className="text-xs text-slate-500">รวมจำนวน</div>
                                        <div className="text-sm font-semibold text-emerald-700">
                                          {(withdrawal.items || []).reduce((s, it) => s + Number(it.quantity || 0), 0).toLocaleString('th-TH')}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {hasItems ? (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-sm text-left">
                                        <thead>
                                          <tr className="text-sm font-semibold text-slate-700 bg-slate-100 border-b border-slate-200">
                                            <th className="px-4 py-2.5 w-12 text-center">ลำดับ</th>
                                            <th className="px-4 py-2.5 text-left">รหัสสินค้า</th>
                                            <th className="px-4 py-2.5 text-left">ชื่อสินค้า</th>
                                            <th className="px-4 py-2.5 w-24 text-center">จำนวน</th>
                                            <th className="px-4 py-2.5 w-24 text-left">หน่วย</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {withdrawal.items!.map((item, i) => {
                                            const product = productMap.get(item.product_id);
                                            const unitText = (() => {
                                              const u = product?.unit as { name?: string } | string | undefined;
                                              if (typeof u === 'string') return u;
                                              if (u && typeof u === 'object' && u.name) return u.name;
                                              return (item as { unit?: string }).unit || '-';
                                            })();
                                            return (
                                              <tr
                                                key={item.id || `${withdrawal.id}-item-${i}`}
                                                className="hover:bg-emerald-50/40 transition-colors"
                                              >
                                                <td className="px-4 py-2.5 text-slate-500 tabular-nums text-center">{i + 1}</td>
                                                <td className="px-4 py-2.5 text-slate-500 font-mono text-xs text-left">
                                                  {product?.code || (item as { product_code?: string }).product_code || '-'}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-700 text-left">
                                                  {product?.name || (item as { product_name?: string }).product_name || item.product_id}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-800 font-medium tabular-nums text-center">
                                                  {Number(item.quantity || 0).toLocaleString('th-TH')}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-500 text-left">{unitText}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="px-4 py-8 text-center text-sm text-slate-400 italic">
                                      ไม่มีรายการสินค้า
                                    </div>
                                  )}
                                </div>

                                {/* รายการค่าใช้จ่าย */}
                                <div className="rounded-xl border border-amber-100 bg-white shadow-sm overflow-hidden">
                                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-amber-50/40 border-b border-amber-100">
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                                        <CurrencyDollarIcon className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-semibold text-slate-800">รายการค่าใช้จ่าย</h4>
                                        <p className="text-xs text-slate-500">ทั้งหมด {withdrawal.expenses?.length || 0} รายการ</p>
                                      </div>
                                    </div>
                                    {hasExpenses && (
                                      <div className="text-right">
                                        <div className="text-xs text-slate-500">รวมจำนวนเงิน</div>
                                        <div className="text-sm font-semibold text-amber-700">
                                          {fmtMoney((withdrawal.expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {hasExpenses ? (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-sm text-left">
                                        <thead>
                                          <tr className="text-sm font-semibold text-slate-700 bg-slate-100 border-b border-slate-200">
                                            <th className="px-4 py-2.5 w-12 text-center">ลำดับ</th>
                                            <th className="px-4 py-2.5 text-left">รายละเอียด</th>
                                            <th className="px-4 py-2.5 w-36 text-center">จำนวนเงิน</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {withdrawal.expenses!.map((exp, i) => (
                                            <tr
                                              key={(exp as { id?: string }).id || `${withdrawal.id}-exp-${i}`}
                                              className="hover:bg-amber-50/40 transition-colors"
                                            >
                                              <td className="px-4 py-2.5 text-slate-500 tabular-nums text-center">{i + 1}</td>
                                              <td className="px-4 py-2.5 text-slate-700 text-left">{exp.description || '-'}</td>
                                              <td className="px-4 py-2.5 text-slate-800 font-medium tabular-nums text-center">
                                                {fmtMoney(Number(exp.amount || 0))}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="px-4 py-8 text-center text-sm text-slate-400 italic">
                                      ไม่มีรายการค่าใช้จ่าย
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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

                return getActionItems(withdrawal).map((action, index) => {
                  if (action.kind === 'divider') {
                    return <div key={`d-${index}`} className="my-1 border-t border-slate-100" role="none" />;
                  }
                  if (action.kind === 'header') {
                    return (
                      <div
                        key={`h-${index}`}
                        className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                        role="none"
                      >
                        {action.label}
                      </div>
                    );
                  }
                  return (
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
                  );
                });
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