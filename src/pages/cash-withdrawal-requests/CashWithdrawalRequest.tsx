import { FC, useCallback, useEffect, useMemo, useState } from 'react';

import { Card } from '../../components/common/Card';
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { Pagination } from '../../components/common/Pagination';
import {
  CashWithdrawalRequest,
  CashWithdrawalRequestApi,
  CashWithdrawalRequestStatus,
} from '../../api/cash-withdrawal-request';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import {
  LoadingIcon,
  CurrencyDollarIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '../../assets/icons/Icons';
import { formatThaiDateTime } from '../../utils/date';
import { CreateCashWithdrawalRequestModal } from '../../components/features/cash-withdrawal-request/CreateCashWithdrawalRequestModal';
import { ApproveCashWithdrawalRequestModal } from '../../components/features/cash-withdrawal-request/ApproveCashWithdrawalRequestModal';
import { CashTabBar } from '../../components/features/accounts/CashTabBar';

const isSuperadminRoleName = (name?: string): boolean => {
  if (!name) return false;
  if (name === 'SUPERADMIN') return true;
  return name.includes('สูงสุด') || name.includes('หัวหน้าผู้ดูแล');
};

const isCfoRoleName = (name?: string, roleType?: string): boolean => {
  if (name === 'CFO') return true;
  if (name?.includes('CFO')) return true;
  if (name?.includes('การเงิน')) return true;
  return roleType === 'EXECUTIVE' && name?.includes('การเงิน') === true;
};

const fmtBaht = (v: number) =>
  v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_META: Record<CashWithdrawalRequestStatus, { label: string; badge: string }> = {
  PENDING: { label: 'รออนุมัติ', badge: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'อนุมัติแล้ว', badge: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'ปฏิเสธ', badge: 'bg-red-100 text-red-700' },
};

const CashWithdrawalRequestPage: FC = () => {
  const currentUser = useCurrentUser();
  const isSuperadmin = isSuperadminRoleName(currentUser?.roleName);
  const isCfo = isCfoRoleName(currentUser?.roleName, currentUser?.roleType);

  const [items, setItems] = useState<CashWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CashWithdrawalRequestStatus | ''>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [selected, setSelected] = useState<CashWithdrawalRequest | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await CashWithdrawalRequestApi.getAll({
        page,
        limit,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status ? { status } : {}),
      });
      setItems(res?.data || []);
      setTotal(res?.meta?.total ?? (res?.data?.length || 0));
    } catch (err) {
      console.error('Failed to fetch cash withdrawal requests:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status]);

  useEffect(() => {
    const t = setTimeout(fetchList, 250);
    return () => clearTimeout(t);
  }, [fetchList]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const stats = useMemo(() => {
    let pending = 0;
    let approvedAmount = 0;
    items.forEach((it) => {
      if (it.status === 'PENDING') pending += 1;
      if (it.status === 'APPROVED') approvedAmount += Number(it.total_amount);
    });
    return { pending, approvedAmount };
  }, [items]);

  const openApprove = (req: CashWithdrawalRequest) => {
    setSelected(req);
    setApproveOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ใบขอเบิกเงิน</h1>
            <p className="mt-1 text-slate-600">
              {isCfo ? 'รายการที่รออนุมัติ และประวัติการอนุมัติ' : 'สร้างและติดตามใบขอเบิกเงิน'}
            </p>
          </div>
          {isSuperadmin && (
            <Button onClick={() => setCreateOpen(true)} variant="primary">
              <PlusIcon className="h-5 w-5" />
              สร้างใบขอเบิก
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-amber-600 font-medium whitespace-nowrap">รออนุมัติ (หน้านี้)</p>
                <p className="text-2xl font-bold text-amber-800">{stats.pending}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-emerald-600 font-medium whitespace-nowrap">อนุมัติแล้ว (หน้านี้)</p>
                <p className="text-2xl font-bold text-emerald-800">{fmtBaht(stats.approvedAmount)} บาท</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-500 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-600 font-medium whitespace-nowrap">ทั้งหมด</p>
                <p className="text-2xl font-bold text-slate-800">{total}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <Card className="!p-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative w-full sm:w-72">
              <Input
                type="search"
                placeholder="ค้นหาเลขที่ / หมายเหตุ"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="w-full sm:w-48">
              <DropdownSelect
                value={status}
                onChange={(v) => setStatus(v as CashWithdrawalRequestStatus | '')}
                placeholder="ทุกสถานะ"
                className="w-full bg-white border-slate-300 shadow-sm text-sm h-10"
                options={[
                  { value: '', label: 'ทุกสถานะ' },
                  { value: 'PENDING', label: 'รออนุมัติ' },
                  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
                  { value: 'REJECTED', label: 'ปฏิเสธ' },
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Table */}
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-20">
              <LoadingIcon className="w-10 h-10 animate-spin mb-3 text-primary" />
              <span className="text-sm">กำลังโหลด...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-20">
              <CurrencyDollarIcon className="w-12 h-12 mb-3 opacity-40" />
              <span className="text-sm">ไม่พบใบขอเบิก</span>
            </div>
          ) : (
            <div className="overflow-x-auto flex flex-col flex-grow">
              <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase">ลำดับ</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">เลขที่</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">วันที่ขอ</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">หมายเหตุ</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">บัญชีที่ตัด</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase">ยอดรวม</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase">สถานะ</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {items.map((req, idx) => {
                    const meta = STATUS_META[req.status];
                    return (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-center text-sm text-slate-500 tabular-nums">{(page - 1) * limit + idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-bold text-primary">{req.request_code}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                          {formatThaiDateTime(req.requested_at || req.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 max-w-[260px]">
                          <span className="line-clamp-2" title={req.request_note || ''}>
                            {req.request_note || <span className="text-slate-300">—</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {req.sourceAccount
                            ? `${req.sourceAccount.account_number} (${req.sourceAccount.account_name})`
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold tabular-nums">
                          {fmtBaht(Number(req.total_amount))} บาท
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {req.status === 'PENDING' && isCfo ? (
                            <Button
                              variant="primary"
                              onClick={() => openApprove(req)}
                              className="!py-1 !px-3 text-xs"
                            >
                              พิจารณา
                            </Button>
                          ) : req.status === 'REJECTED' && req.reject_reason ? (
                            <button
                              type="button"
                              onClick={() => {
                                import('@/src/utils/swal').then(({ default: Swal }) =>
                                  Swal.fire({
                                    icon: 'info',
                                    title: 'เหตุผลที่ปฏิเสธ',
                                    text: req.reject_reason || '',
                                  }),
                                );
                              }}
                              className="text-red-500 text-xs underline hover:text-red-700 inline-flex items-center gap-1"
                            >
                              <XCircleIcon className="w-4 h-4" /> ดูเหตุผล
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
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
      </div>

      <CreateCashWithdrawalRequestModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmitted={fetchList}
      />
      <ApproveCashWithdrawalRequestModal
        isOpen={approveOpen}
        request={selected}
        onClose={() => { setApproveOpen(false); setSelected(null); }}
        onSubmitted={fetchList}
      />
    </div>
  );
};

export default CashWithdrawalRequestPage;
