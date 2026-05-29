import { FC, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Card } from '../../components/common/Card';
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { Pagination } from '../../components/common/Pagination';
import BuddhistDatePicker from '../../components/common/BuddhistDatePicker';
import { AccountTransactionModal } from '../../components/features/accounts/AccountTransactionModal';
import { CashTab, CashTabBar } from '../../components/features/accounts/CashTabBar';
import { CreateCashWithdrawalRequestModal } from '../../components/features/cash-withdrawal-request/CreateCashWithdrawalRequestModal';
import { CashWithdrawalRequestList } from '../../components/features/cash-withdrawal-request/CashWithdrawalRequestList';
import { AccountApi } from '../../api/account';
import { RoleAccountApi } from '../../api/role-account';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const isSuperadminRoleName = (name?: string): boolean => {
  if (!name) return false;
  if (name === 'SUPERADMIN') return true;
  return name.includes('สูงสุด') || name.includes('หัวหน้าผู้ดูแล');
};
import {
  Account,
  AccountTransaction,
  AccountTransactionType,
} from '../../types/entity/account.interface';
import {
  LoadingIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  WalletIcon,
  PlusIcon,
  ManageIcon,
  EyeIcon,
} from '../../assets/icons/Icons';
import { formatThaiDateTime } from '../../utils/date';

const fmtMoney = (v: number) =>
  `${Number(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;

const TYPE_META: Record<
  string,
  { label: string; badge: string; amount: string; sign: '+' | '-' | '±' }
> = {
  DEPOSIT: { label: 'เงินเข้า', badge: 'bg-emerald-100 text-emerald-700', amount: 'text-emerald-700', sign: '+' },
  WITHDRAW: { label: 'เงินออก', badge: 'bg-red-100 text-red-700', amount: 'text-red-700', sign: '-' },
  ADJUSTMENT: { label: 'ปรับยอด', badge: 'bg-slate-100 text-slate-700', amount: 'text-slate-700', sign: '±' },
  TRANSFER: { label: 'โอน', badge: 'bg-blue-100 text-blue-700', amount: 'text-blue-700', sign: '±' },
};

const toISO = (d: Date | null) => (d ? d.toISOString().substring(0, 10) : '');

const AccountTransactions: FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [type, setType] = useState<string>('');
  // Default: เดือนปัจจุบัน (วันที่ 1 → วันสุดท้ายของเดือน)
  const monthRange = useMemo(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start: fmt(first), end: fmt(last) };
  }, []);
  const [startDate, setStartDate] = useState<string>(monthRange.start);
  const [endDate, setEndDate] = useState<string>(monthRange.end);
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // role-account mapping ของผู้ใช้ปัจจุบัน (ไม่ใช่ SUPERADMIN)
  const [mappedAccountId, setMappedAccountId] = useState<string | null>(null);
  const [mappingLoaded, setMappingLoaded] = useState(false);

  const currentUser = useCurrentUser();
  const isSuperadmin = isSuperadminRoleName(currentUser?.roleName);

  // Modal สำหรับบันทึกรายการเดินบัญชี (create)
  const [createTrxOpen, setCreateTrxOpen] = useState(false);
  // Modal สำหรับขอเบิกเงิน (เข้า approval flow → CFO อนุมัติ)
  const [requestOpen, setRequestOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<CashTab>('transactions');
  const [cashTabRefreshKey, setCashTabRefreshKey] = useState(0);

  // Dropdown menu state per row
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detail modal state
  const [detailTrx, setDetailTrx] = useState<AccountTransaction | null>(null);

  const handleDropdownToggle = (event: ReactMouseEvent<HTMLButtonElement>, id: string) => {
    event.stopPropagation();
    if (openDropdownId === id) {
      setOpenDropdownId(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setOpenDropdownId(id);
    setDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.right + window.scrollX });
  };

  useEffect(() => {
    if (!openDropdownId) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (!(e.target as HTMLElement).closest('button[data-trx-id]')) {
          setOpenDropdownId(null);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdownId]);

  const openTransactionDetail = (t: AccountTransaction) => {
    setOpenDropdownId(null);
    setDetailTrx(t);
  };

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  // Fetch active accounts once for the dropdown
  useEffect(() => {
    AccountApi.getAll({ limit: 100, is_active: true })
      .then((res) => setAccounts(res?.data || []))
      .catch((err) => console.error('Failed to load accounts:', err));
  }, []);

  // โหลด role-account mapping ของ user ปัจจุบัน — ใช้กับทุก role รวม SUPERADMIN
  useEffect(() => {
    RoleAccountApi.getForMe()
      .then((m) => setMappedAccountId(m?.account_id || null))
      .catch((err) => {
        console.error('Failed to load role-account mapping:', err);
        setMappedAccountId(null);
      })
      .finally(() => setMappingLoaded(true));
  }, []);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [type, startDate, endDate]);

  // ทุก role ถูก lock ตาม mapping ของ role ตัวเอง
  const effectiveAccountId = mappedAccountId || '';
  const hasNoMapping = mappingLoaded && !mappedAccountId;

  const fetchTransactions = useCallback(async () => {
    if (!mappingLoaded) return;
    if (hasNoMapping) {
      setTransactions([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await AccountApi.getTransactions({
        page,
        limit,
        ...(effectiveAccountId ? { account_id: effectiveAccountId } : {}),
        ...(type ? { type: type as AccountTransactionType } : {}),
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      });
      setTransactions(res?.data || []);
      setTotal(res?.meta?.total ?? (res?.data?.length || 0));
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, effectiveAccountId, type, startDate, endDate, debouncedSearch, mappingLoaded, hasNoMapping]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ทุกครั้งที่สลับกลับมา tab "รายการรับ-จ่าย" → re-fetch
  useEffect(() => {
    if (activeTab === 'transactions') fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  // Stats for top cards — รวมยอดทั้งช่วงเดือน (ไม่จำกัด pagination)
  const [statsTotals, setStatsTotals] = useState<{ income: number; expense: number; net: number }>({
    income: 0,
    expense: 0,
    net: 0,
  });
  useEffect(() => {
    if (!mappingLoaded || hasNoMapping) {
      setStatsTotals({ income: 0, expense: 0, net: 0 });
      return;
    }
    // ใช้ /accounts/transactions/stats — SQL SUM/GROUP BY type, ไม่ต้องดึง row จริง
    let cancelled = false;
    AccountApi.getTransactionStats({
      ...(effectiveAccountId ? { account_id: effectiveAccountId } : {}),
      ...(type ? { type: type as AccountTransactionType } : {}),
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    })
      .then((s) => {
        if (cancelled) return;
        const income = s.deposit;
        const expense = s.withdraw;
        setStatsTotals({ income, expense, net: income - expense });
      })
      .catch(() => {
        if (!cancelled) setStatsTotals({ income: 0, expense: 0, net: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [mappingLoaded, hasNoMapping, effectiveAccountId, type, startDate, endDate, debouncedSearch]);

  const stats = statsTotals;

  // ฟอร์แมตช่วงวันที่ไว้แสดงใต้การ์ด stats
  const rangeLabel = useMemo(() => {
    const fmt = (iso: string) => {
      if (!iso) return '';
      const d = new Date(iso);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`;
    };
    if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
    if (startDate) return `ตั้งแต่ ${fmt(startDate)}`;
    if (endDate) return `ถึง ${fmt(endDate)}`;
    return 'ทั้งหมด';
  }, [startDate, endDate]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              {activeTab === 'requests' ? 'ใบขอเบิกเงิน' : 'รายรับรายจ่าย'}
            </h1>
            <p className="mt-1 text-slate-600">
              {activeTab === 'requests'
                ? 'สร้างและติดตามใบขอเบิกเงิน'
                : (() => {
                    const acc = mappedAccountId ? accountMap.get(mappedAccountId) : null;
                    if (acc) {
                      return (
                        <>
                          ประวัติรายการของบัญชี{' '}
                          <span className="font-semibold text-primary">
                            {acc.account_number} ({acc.account_name})
                          </span>
                        </>
                      );
                    }
                    return 'ประวัติรายการของบัญชีที่ผูกกับบทบาทของคุณ';
                  })()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isSuperadmin && (
              <Button
                onClick={() => setRequestOpen(true)}
                variant="primary"
                className="!bg-amber-500 hover:!bg-amber-600 !border-amber-500 !text-white"
              >
                <PlusIcon className="h-5 w-5" />
                สร้างใบขอเบิกเงิน
              </Button>
            )}
            {!hasNoMapping && (
              <Button
                onClick={() => setCreateTrxOpen(true)}
                variant="primary"
              >
                <PlusIcon className="h-5 w-5" />
                บันทึกรายรับรายจ่าย
              </Button>
            )}
          </div>
        </div>

        {activeTab === 'requests' ? (
          <CashWithdrawalRequestList
            toolbarExtra={
              <CashTabBar
                active={activeTab}
                onChange={setActiveTab}
                refreshKey={cashTabRefreshKey}
              />
            }
            hideSourceAccount
            onMutated={() => setCashTabRefreshKey((k) => k + 1)}
          />
        ) : (
          <>
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <ArrowTrendingUpIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-emerald-600 font-medium whitespace-nowrap">รายรับ</p>
                <p className="text-2xl font-bold text-emerald-800">+{fmtMoney(stats.income)}</p>
                <p className="text-[10px] text-emerald-600/70 mt-0.5">{rangeLabel}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <ArrowTrendingUpIcon className="h-5 w-5 text-white rotate-180" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-red-600 font-medium whitespace-nowrap">รายจ่าย</p>
                <p className="text-2xl font-bold text-red-800">-{fmtMoney(stats.expense)}</p>
                <p className="text-[10px] text-red-600/70 mt-0.5">{rangeLabel}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <WalletIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-blue-600 font-medium whitespace-nowrap">คงเหลือ</p>
                <p className="text-2xl font-bold text-blue-800">
                  {stats.net >= 0 ? '+' : ''}{fmtMoney(stats.net)}
                </p>
                <p className="text-[10px] text-blue-600/70 mt-0.5">{rangeLabel}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <Card className="!p-4 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-72 flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหาเลขอ้างอิง / รายละเอียด"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="w-full sm:w-44 flex-shrink-0">
              <DropdownSelect
                value={type}
                onChange={(v) => setType(v)}
                placeholder="ทุกประเภท"
                className="w-full bg-white border-slate-300 shadow-sm text-sm h-10"
                options={[
                  { value: '', label: 'ทุกประเภท' },
                  { value: 'DEPOSIT', label: 'เงินเข้า' },
                  { value: 'WITHDRAW', label: 'เงินออก' },
                ]}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
              <BuddhistDatePicker
                selected={startDate ? new Date(startDate) : null}
                onChange={(d: Date | null) => setStartDate(toISO(d))}
                dateFormat="dd/MM/yyyy"
                locale="th"
                placeholderText="วันเริ่มต้น"
                isClearable
                wrapperClassName="flex-1 sm:w-36 min-w-0"
                className="block w-full rounded-md border border-slate-300 py-2 pr-3 text-sm shadow-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white h-10"
              />
              <span className="text-slate-400 shrink-0">-</span>
              <BuddhistDatePicker
                selected={endDate ? new Date(endDate) : null}
                onChange={(d: Date | null) => setEndDate(toISO(d))}
                dateFormat="dd/MM/yyyy"
                locale="th"
                placeholderText="วันสิ้นสุด"
                isClearable
                wrapperClassName="flex-1 sm:w-36 min-w-0"
                className="block w-full rounded-md border border-slate-300 py-2 pr-3 text-sm shadow-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white h-10"
              />
            </div>
            <CashTabBar
              active={activeTab}
              onChange={setActiveTab}
              refreshKey={cashTabRefreshKey}
              className="w-full sm:w-auto xl:ml-auto"
            />
          </div>
        </Card>

        {/* Table */}
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-20">
              <LoadingIcon className="w-10 h-10 animate-spin mb-3 text-primary" />
              <span className="text-sm">กำลังโหลดรายการ...</span>
            </div>
          ) : hasNoMapping ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-20">
              <CurrencyDollarIcon className="w-12 h-12 mb-3 opacity-40" />
              <span className="text-sm">บทบาทของคุณยังไม่ได้ผูกบัญชี กรุณาตั้งค่าในหน้าผู้ใช้งาน</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-20">
              <CurrencyDollarIcon className="w-12 h-12 mb-3 opacity-40" />
              <span className="text-sm">ไม่พบรายการในเงื่อนไขนี้</span>
            </div>
          ) : (
          <div className="overflow-x-auto flex flex-col flex-grow">
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ลำดับ</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">วันที่</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ประเภท</th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จำนวนเงิน</th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">คงเหลือ</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">เลขอ้างอิง</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">รายละเอียด</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {transactions.map((t, idx) => {
                    const meta = TYPE_META[t.type] || TYPE_META.ADJUSTMENT;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center tabular-nums">{(page - 1) * limit + idx + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{formatThaiDateTime(t.created_at || t.transaction_date)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold tabular-nums ${meta.amount}`}>
                          {meta.sign}{fmtMoney(t.amount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right tabular-nums text-slate-700">{fmtMoney(t.balance_after)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-slate-600">{t.reference_code || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[260px]">
                          <span className="line-clamp-2" title={t.description || ''}>{t.description || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="icon"
                            onClick={(e) => handleDropdownToggle(e as ReactMouseEvent<HTMLButtonElement>, t.id)}
                            data-trx-id={t.id}
                            className="!p-1.5"
                          >
                            <ManageIcon className="w-5 h-5 text-slate-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          )}
          {!loading && total > 0 && (
            <Pagination
              currentPage={page}
              totalItems={total}
              itemsPerPage={limit}
              onPageChange={setPage}
              onItemsPerPageChange={(size) => { setLimit(size); setPage(1); }}
            />
          )}
        </div>
          </>
        )}
      </div>

      <AccountTransactionModal
        isOpen={createTrxOpen}
        account={mappedAccountId ? (accountMap.get(mappedAccountId) || null) : null}
        mode="create"
        onClose={() => setCreateTrxOpen(false)}
        onSubmitted={fetchTransactions}
      />
      <CreateCashWithdrawalRequestModal
        isOpen={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSubmitted={fetchTransactions}
      />
      <AccountTransactionModal
        isOpen={!!detailTrx}
        account={detailTrx?.account_id ? (accountMap.get(detailTrx.account_id) || null) : null}
        transaction={detailTrx}
        mode="view"
        onClose={() => setDetailTrx(null)}
      />

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
            className="origin-top-right mt-2 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30"
            role="menu"
          >
            <div className="py-1">
              {/* ห้ามลบรายรับรายจ่าย — ปิดทั้ง FE/BE เพื่อกัน balance ไม่ตรงกับ document ที่ผูกอยู่ */}
              {(() => {
                const t = transactions.find((x) => x.id === openDropdownId);
                if (!t) return null;
                return (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); openTransactionDetail(t); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <EyeIcon className="w-4 h-4" />
                    ดูรายละเอียด
                  </button>
                );
              })()}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default AccountTransactions;
