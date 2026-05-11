import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import Swal from '@/src/utils/swal';

import { Card } from '../../components/common/Card';
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { Pagination } from '../../components/common/Pagination';
import { ActionDropdown, ActionDropdownItem } from '../../components/common/ActionDropdown';
import { AccountApi } from '../../api/account';
import { Account as AccountType } from '../../types/entity/account.interface';
import {
  PlusIcon,
  PencilIcon,
  LoadingIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  XCircleIcon,
  EyeIcon,
} from '../../assets/icons/Icons';
import { AccountModal } from '../../components/features/accounts/AccountModal';
import { AccountTransactionModal } from '../../components/features/accounts/AccountTransactionModal';
import { AccountTransactionHistoryModal } from '../../components/features/accounts/AccountTransactionHistoryModal';

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
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<AccountType | null>(null);
  const [trxModalOpen, setTrxModalOpen] = useState(false);
  const [trxAccount, setTrxAccount] = useState<AccountType | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyAccount, setHistoryAccount] = useState<AccountType | null>(null);

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await AccountApi.getAll({
        page,
        limit,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(activeFilter === 'active' ? { is_active: true } : activeFilter === 'inactive' ? { is_active: false } : {}),
      });
      setAccounts(res.data || []);
      setTotal(res.meta?.total ?? (res.data?.length ?? 0));
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, activeFilter]);

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

  const handleCloseAccount = async (a: AccountType) => {
    setOpenDropdownId(null);
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการปิดบัญชี',
      html: `ปิดบัญชี <strong>${a.account_name}</strong> (${a.account_number}) ใช่หรือไม่?<br/><span class="text-xs text-slate-500">บัญชีจะถูกเปลี่ยนสถานะเป็น "ไม่ใช้งาน"</span>`,
      showCancelButton: true,
      confirmButtonText: 'ปิดบัญชี',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
    });
    if (!result.isConfirmed) return;
    try {
      await AccountApi.close(a.id);
      Swal.fire({ icon: 'success', title: 'ปิดบัญชีแล้ว', timer: 1200, showConfirmButton: false });
      await fetchList();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถปิดบัญชีได้', 'error');
    }
  };

  const getActionItems = (a: AccountType): ActionDropdownItem[] => [
    { label: 'ดูประวัติรายการ', icon: EyeIcon, onClick: () => openHistory(a) },
    { label: 'บันทึกรายการ', icon: CurrencyDollarIcon, isPrimary: true, onClick: () => openTransaction(a) },
    { label: 'แก้ไข', icon: PencilIcon, onClick: () => openEdit(a) },
    { label: 'ปิดบัญชี', icon: XCircleIcon, isDanger: true, onClick: () => handleCloseAccount(a), hidden: !a.is_active },
  ];

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
            <h1 className="text-3xl font-bold text-slate-800">บัญชี</h1>
            <p className="mt-1 text-slate-600">จัดการบัญชีเงินสดและธนาคารภายใน</p>
          </div>
          <Button onClick={openCreate}>
            <PlusIcon className="h-5 w-5" />
            เพิ่มบัญชี
          </Button>
        </div>

        {/* Summary card */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mb-4">
          <Card className="p-3 sm:p-4 border-l-4 border-emerald-400">
            <p className="text-xs sm:text-sm text-slate-500">จำนวนบัญชีทั้งหมด</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-800 mt-1">{total.toLocaleString('th-TH')}</p>
          </Card>
          <Card className="p-3 sm:p-4 border-l-4 border-blue-400">
            <p className="text-xs sm:text-sm text-slate-500">ยอดรวมในหน้านี้</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-800 mt-1">{fmtMoney(totalBalance)}</p>
          </Card>
          <Card className="p-3 sm:p-4 border-l-4 border-amber-400">
            <p className="text-xs sm:text-sm text-slate-500">บัญชีใช้งาน</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-800 mt-1">
              {accounts.filter((a) => a.is_active).length} / {accounts.length}
            </p>
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
                        className="px-4 py-3 text-left text-sm font-mono text-primary hover:underline cursor-pointer"
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
                            a.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {a.is_active ? 'ใช้งาน' : 'ปิดบัญชี'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <ActionDropdown
                          actions={getActionItems(a)}
                          itemId={a.id}
                          openId={openDropdownId}
                          onToggle={setOpenDropdownId}
                        />
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
      </div>


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
