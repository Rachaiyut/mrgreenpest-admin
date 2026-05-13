import { FC, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from '@/src/utils/swal';

import { Card } from '../../components/common/Card';
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { Pagination } from '../../components/common/Pagination';
import { AccountApi } from '../../api/account';
import { RoleAccountApi } from '../../api/role-account';
import { Account as AccountType } from '../../types/entity/account.interface';
import { usePermissions } from '../../hooks/usePermissions';

import {
  PlusIcon,
  PencilIcon,
  LoadingIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ManageIcon,
  XCircleIcon,
  CheckCircleIcon,
  EyeIcon,
} from '../../assets/icons/Icons';
import { AccountModal } from '../../components/features/accounts/AccountModal';
import { AccountTransactionModal } from '../../components/features/accounts/AccountTransactionModal';
import { AccountTransactionHistoryModal } from '../../components/features/accounts/AccountTransactionHistoryModal';
import { CashWithdrawalRequestList } from '../../components/features/cash-withdrawal-request/CashWithdrawalRequestList';
import { CashWithdrawalRequestApi } from '../../api/cash-withdrawal-request';

const fmtMoney = (v: number) =>
  `${Number(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  SAVINGS: 'ออมทรัพย์',
  CURRENT: 'กระแสรายวัน',
  FIXED: 'เงินฝากประจำ',
  OTHER: 'อื่นๆ',
};

const ACCOUNT_TYPE_COLOR: Record<string, string> = {
  SAVINGS: 'bg-emerald-100 text-emerald-700',
  CURRENT: 'bg-blue-100 text-blue-700',
  FIXED: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-slate-100 text-slate-700',
};

const AccountPage: FC = () => {
  const { hasPermission } = usePermissions();
  // ใครก็ตามที่มี ACCESS_ACCOUNT จะเห็นทุกบัญชี (เป็น permission กลางของหน้านี้)
  const canSeeAllAccounts = hasPermission('ACCESS_ACCOUNT');

  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // role-account mapping (สำหรับ non-SUPERADMIN จะถูกล็อกบัญชี)
  const [mappedAccountId, setMappedAccountId] = useState<string | null>(null);
  const [mappingLoaded, setMappingLoaded] = useState(false);

  useEffect(() => {
    if (canSeeAllAccounts) {
      setMappingLoaded(true);
      return;
    }
    RoleAccountApi.getForMe()
      .then((m) => setMappedAccountId(m?.account_id || null))
      .catch((err) => console.error('Failed to load role-account mapping:', err))
      .finally(() => setMappingLoaded(true));
  }, [canSeeAllAccounts]);

  // Tab state — บัญชี (default) | ใบขอเบิกเงิน
  const [activeTab, setActiveTab] = useState<'accounts' | 'requests'>('accounts');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    CashWithdrawalRequestApi.getAll({ status: 'PENDING', limit: 1, page: 1 })
      .then((res) => setPendingCount(res?.meta?.total ?? 0))
      .catch(() => setPendingCount(0));
  }, [activeTab]);

  const renderTabBar = () => (
    <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg gap-1">
      <button
        type="button"
        onClick={() => setActiveTab('accounts')}
        className={`px-3 sm:px-4 h-10 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap flex items-center ${
          activeTab === 'accounts'
            ? 'bg-white text-primary shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        บัญชี
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('requests')}
        className={`px-3 sm:px-4 h-10 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap flex items-center ${
          activeTab === 'requests'
            ? 'bg-white text-amber-600 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        ใบขอเบิกเงิน
        {pendingCount > 0 && (
          <span className="ml-1.5 bg-amber-100 text-amber-700 py-0.5 px-1.5 rounded-full text-[10px] sm:text-xs">
            {pendingCount}
          </span>
        )}
      </button>
    </div>
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<AccountType | null>(null);
  const [trxModalOpen, setTrxModalOpen] = useState(false);
  const [trxAccount, setTrxAccount] = useState<AccountType | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyAccount, setHistoryAccount] = useState<AccountType | null>(null);

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleDropdownToggle = (event: ReactMouseEvent<HTMLButtonElement>, accountId: string) => {
    event.stopPropagation();
    if (openDropdownId === accountId) {
      setOpenDropdownId(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setOpenDropdownId(accountId);
    setDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.right + window.scrollX });
  };

  useEffect(() => {
    if (!openDropdownId) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (!(e.target as HTMLElement).closest('button[data-account-id]')) {
          setOpenDropdownId(null);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdownId]);

  const fetchList = useCallback(async () => {
    if (!mappingLoaded) return;

    // ผู้ใช้ทั่วไป (ไม่ใช่ SUPERADMIN/ผู้อนุมัติ) + ไม่มี mapping → ไม่เห็นบัญชี
    if (!canSeeAllAccounts && !mappedAccountId) {
      setAccounts([]);
      setTotal(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await AccountApi.getAll({
        page,
        limit,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(activeFilter === 'active' ? { is_active: true } : activeFilter === 'inactive' ? { is_active: false } : {}),
      });
      const raw = res.data || [];
      // SUPERADMIN / ผู้อนุมัติ: เห็นทุกบัญชี; ผู้ใช้ทั่วไป: เฉพาะบัญชีที่ผูกกับ role
      const filtered = canSeeAllAccounts ? raw : raw.filter((a) => a.id === mappedAccountId);
      setAccounts(filtered);
      setTotal(canSeeAllAccounts ? (res.meta?.total ?? raw.length) : filtered.length);
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, activeFilter, canSeeAllAccounts, mappedAccountId, mappingLoaded]);

  useEffect(() => {
    const t = setTimeout(fetchList, 250);
    return () => clearTimeout(t);
  }, [fetchList]);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + Number(a.current_balance || 0), 0),
    [accounts],
  );

  const openCreate = () => {
    setModalMode('create');
    setSelected(null);
    setModalOpen(true);
  };
  const openEdit = (a: AccountType) => {
    setModalMode('edit');
    setSelected(a);
    setModalOpen(true);
    setOpenDropdownId(null);
  };
  const openTransaction = (a: AccountType) => {
    setTrxAccount(a);
    setTrxModalOpen(true);
    setOpenDropdownId(null);
  };
  const openHistory = (a: AccountType) => {
    setHistoryAccount(a);
    setHistoryModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleToggleActive = async (a: AccountType) => {
    setOpenDropdownId(null);
    const turningOff = a.is_active;
    const result = await Swal.fire({
      icon: turningOff ? 'warning' : 'question',
      title: turningOff ? 'ยืนยันปิดใช้งานบัญชี' : 'ยืนยันเปิดใช้งานบัญชี',
      html: `${turningOff ? 'ปิดใช้งาน' : 'เปิดใช้งาน'} <strong>${a.account_name}</strong> ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: turningOff ? 'ปิดใช้งาน' : 'เปิดใช้งาน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: turningOff ? '#ef4444' : '#10b981',
    });
    if (!result.isConfirmed) return;
    try {
      await AccountApi.setActive(a.id, !turningOff);
      Swal.fire({
        icon: 'success',
        title: turningOff ? 'ปิดใช้งานแล้ว' : 'เปิดใช้งานแล้ว',
        timer: 1200,
        showConfirmButton: false,
      });
      await fetchList();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถเปลี่ยนสถานะบัญชีได้', 'error');
    }
  };

  const getActionItems = (a: AccountType) => {
    const items: Array<{ label: string; icon: typeof PencilIcon; color: string; hoverBg: string; onClick: () => void }> = [];
    // ดูประวัติรายการ — กั้นด้วย READ_ACCOUNT (สิทธิ์ดูบัญชีธนาคาร)
    if (hasPermission('READ_ACCOUNT')) {
      items.push({
        label: 'ดูประวัติรายการ',
        icon: EyeIcon,
        color: 'text-slate-700',
        hoverBg: 'hover:bg-slate-50',
        onClick: () => openHistory(a),
      });
    }
    // บันทึกรายการ — กั้นด้วย CREATE_ACCOUNT_TRANSACTION
    if (hasPermission('CREATE_ACCOUNT_TRANSACTION')) {
      items.push({
        label: 'บันทึกรายการ',
        icon: CurrencyDollarIcon,
        color: 'text-amber-600',
        hoverBg: 'hover:bg-amber-50',
        onClick: () => openTransaction(a),
      });
    }
    // กั้นด้วย permission: UPDATE_ACCOUNT สำหรับแก้ไข, CANCEL_ACCOUNT สำหรับ toggle ใช้งาน
    if (hasPermission('UPDATE_ACCOUNT')) {
      items.push({
        label: 'แก้ไข',
        icon: PencilIcon,
        color: 'text-blue-600',
        hoverBg: 'hover:bg-blue-50',
        onClick: () => openEdit(a),
      });
    }
    if (hasPermission('UPDATE_ACCOUNT') || hasPermission('CANCEL_ACCOUNT')) {
      items.push(
        a.is_active
          ? {
              label: 'ปิดใช้งาน',
              icon: XCircleIcon,
              color: 'text-red-600',
              hoverBg: 'hover:bg-red-50',
              onClick: () => handleToggleActive(a),
            }
          : {
              label: 'เปิดใช้งาน',
              icon: CheckCircleIcon,
              color: 'text-emerald-600',
              hoverBg: 'hover:bg-emerald-50',
              onClick: () => handleToggleActive(a),
            },
      );
    }
    return items;
  };

  const handleSubmitAccount = async (payload: Partial<AccountType>) => {
    try {
      if (modalMode === 'create') {
        await AccountApi.create(payload as Omit<AccountType, 'id' | 'current_balance'>);
        Swal.fire({ icon: 'success', title: 'สร้างบัญชีแล้ว', timer: 1200, showConfirmButton: false });
      } else if (selected) {
        await AccountApi.update(selected.id, payload);
        Swal.fire({ icon: 'success', title: 'บันทึกการแก้ไข', timer: 1200, showConfirmButton: false });
      }
      setModalOpen(false);
      await fetchList();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถบันทึกได้', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              {activeTab === 'requests' ? 'ใบขอเบิกเงิน' : 'บัญชี'}
            </h1>
            <p className="mt-1 text-slate-600">
              {activeTab === 'requests'
                ? 'สร้างและติดตามใบขอเบิกเงิน'
                : 'จัดการบัญชีเงินสดและธนาคารภายใน'}
            </p>
          </div>
          {activeTab === 'accounts' && hasPermission('CREATE_ACCOUNT') && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-5 w-5" />
              เพิ่มบัญชี
            </Button>
          )}
        </div>

        {activeTab === 'requests' ? (
          <CashWithdrawalRequestList toolbarExtra={renderTabBar()} />
        ) : (
          <>

        {/* Summary card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
          <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <BuildingOfficeIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-emerald-600 font-medium whitespace-nowrap">จำนวนบัญชีทั้งหมด</p>
                <p className="text-2xl font-bold text-emerald-800">{total.toLocaleString('th-TH')}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-blue-600 font-medium whitespace-nowrap">ยอดรวมในหน้านี้</p>
                <p className="text-2xl font-bold text-blue-800">{fmtMoney(totalBalance)}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-amber-600 font-medium whitespace-nowrap">บัญชีใช้งาน</p>
                <p className="text-2xl font-bold text-amber-800">
                  {accounts.filter((a) => a.is_active).length} / {accounts.length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="!p-4 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative w-full sm:w-80">
              <Input
                type="search"
                placeholder="ค้นหาเลขที่บัญชี / ชื่อบัญชี / ธนาคาร"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <DropdownSelect
              value={activeFilter}
              onChange={(val) => {
                setActiveFilter(val as 'all' | 'active' | 'inactive');
                setPage(1);
              }}
              className="w-full sm:w-fit text-sm"
              placeholder="สถานะทั้งหมด"
              options={[
                { value: 'all', label: 'สถานะทั้งหมด' },
                { value: 'active', label: 'ใช้งาน' },
                { value: 'inactive', label: 'ไม่ใช้งาน' },
              ]}
            />
            <div className="sm:ml-auto">{renderTabBar()}</div>
          </div>
        </Card>

        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden relative">
          <div className="overflow-auto flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200 text-left">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                <tr className="text-sm font-semibold text-slate-600">
                  <th className="px-4 py-3 text-center w-12">ลำดับ</th>
                  <th className="px-4 py-3 text-left">เลขที่บัญชี</th>
                  <th className="px-4 py-3 text-left">ชื่อบัญชี</th>
                  <th className="px-4 py-3 text-left">ธนาคาร</th>
                  <th className="px-4 py-3 text-left">สาขา</th>
                  <th className="px-4 py-3 text-left">ประเภท</th>
                  <th className="px-4 py-3 text-right">วงเงินจำกัด</th>
                  <th className="px-4 py-3 text-right">ยอดคงเหลือ</th>
                  <th className="px-4 py-3 text-center">สถานะ</th>
                  <th className="px-4 py-3 text-center w-32">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-500 bg-white/70">
                        <LoadingIcon className="w-10 h-10 animate-spin mb-3 text-primary" />
                        <p>กำลังโหลด...</p>
                      </div>
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                        <BuildingOfficeIcon className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-lg font-medium">ไม่พบข้อมูลบัญชี</p>
                        <p className="text-sm">ลองปรับตัวกรองหรือสร้างบัญชีใหม่</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  accounts.map((a, i) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-center text-slate-500 text-sm tabular-nums">
                        {(page - 1) * limit + i + 1}
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-bold text-primary hover:underline cursor-pointer text-left"
                        onClick={() => openHistory(a)}
                      >
                        {a.account_number}
                      </td>
                      <td className="px-4 py-3 text-left text-sm text-slate-700">{a.account_name}</td>
                      <td className="px-4 py-3 text-left text-sm text-slate-700">{a.bank_name}</td>
                      <td className="px-4 py-3 text-left text-sm text-slate-600">
                        {a.branch_name || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-left text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACCOUNT_TYPE_COLOR[a.account_type] || 'bg-slate-100 text-slate-700'}`}>
                          {ACCOUNT_TYPE_LABEL[a.account_type] || a.account_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600 tabular-nums">
                        {Number(a.credit_limit) > 0 ? fmtMoney(a.credit_limit) : <span className="text-slate-400">ไม่จำกัด</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800 tabular-nums">
                        {fmtMoney(a.current_balance)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            a.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {a.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <div className="inline-block">
                          <Button
                            variant="icon"
                            data-account-id={a.id}
                            onClick={(e) => handleDropdownToggle(e, a.id)}
                          >
                            <span className="sr-only">จัดการ</span>
                            <ManageIcon className="h-5 w-5" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && total > 0 && (
            <div className="mt-auto border-t border-slate-200">
              <Pagination
                currentPage={page}
                itemsPerPage={limit}
                totalItems={total}
                onPageChange={setPage}
                onItemsPerPageChange={(s) => {
                  setLimit(s);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
          </>
        )}
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
          >
            <div className="py-1">
              {(() => {
                const a = accounts.find((x) => x.id === openDropdownId);
                if (!a) return null;
                return getActionItems(a).map((action, i) => (
                  <button
                    key={i}
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
          document.body,
        )}

      <AccountModal
        isOpen={modalOpen}
        mode={modalMode}
        initialValues={selected}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitAccount}
      />
      <AccountTransactionModal
        isOpen={trxModalOpen}
        account={trxAccount}
        onClose={() => setTrxModalOpen(false)}
        onSubmitted={async () => {
          setTrxModalOpen(false);
          await fetchList();
        }}
      />
      <AccountTransactionHistoryModal
        isOpen={historyModalOpen}
        account={historyAccount}
        onClose={() => setHistoryModalOpen(false)}
      />
    </div>
  );
};

export default AccountPage;
