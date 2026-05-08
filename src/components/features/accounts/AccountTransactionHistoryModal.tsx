import { FC, useCallback, useEffect, useMemo, useState } from 'react';

import { Modal } from '../../common/Modal';
import { DropdownSelect } from '../../common';
import { Pagination } from '../../common/Pagination';
import { AccountApi } from '../../../api/account';
import {
  Account,
  AccountTransaction,
  AccountTransactionType,
} from '../../../types/entity/account.interface';
import {
  LoadingIcon,
  DocumentCheckIcon,
  BuildingOfficeIcon,
  WalletIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
} from '../../../assets/icons/Icons';
import { formatThaiDateTime } from '../../../utils/date';

interface Props {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
}

const fmtMoney = (v: number) =>
  `${Number(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;

const TYPE_META: Record<
  AccountTransactionType,
  {
    label: string;
    badgeClass: string;
    rowClass: string;
    hoverClass: string;
    amountClass: string;
    accentClass: string;
    sign: '+' | '-' | '±';
  }
> = {
  DEPOSIT: {
    label: 'เงินเข้า',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    rowClass: 'bg-emerald-50/40',
    hoverClass: 'hover:bg-emerald-50',
    amountClass: 'text-emerald-700',
    accentClass: 'border-l-4 border-emerald-400',
    sign: '+',
  },
  WITHDRAW: {
    label: 'เงินออก',
    badgeClass: 'bg-red-100 text-red-700',
    rowClass: 'bg-red-50/40',
    hoverClass: 'hover:bg-red-50',
    amountClass: 'text-red-700',
    accentClass: 'border-l-4 border-red-400',
    sign: '-',
  },
  TRANSFER: {
    label: 'โอน',
    badgeClass: 'bg-blue-100 text-blue-700',
    rowClass: 'bg-blue-50/40',
    hoverClass: 'hover:bg-blue-50',
    amountClass: 'text-blue-700',
    accentClass: 'border-l-4 border-blue-400',
    sign: '±',
  },
  ADJUSTMENT: {
    label: 'ปรับปรุงยอด',
    badgeClass: 'bg-amber-100 text-amber-700',
    rowClass: 'bg-amber-50/40',
    hoverClass: 'hover:bg-amber-50',
    amountClass: 'text-amber-700',
    accentClass: 'border-l-4 border-amber-400',
    sign: '±',
  },
};

export const AccountTransactionHistoryModal: FC<Props> = ({ isOpen, account, onClose }) => {
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [typeFilter, setTypeFilter] = useState<'all' | AccountTransactionType>('all');
  const [isLoading, setIsLoading] = useState(false);

  const fetchTx = useCallback(async () => {
    if (!account || !isOpen) return;
    setIsLoading(true);
    try {
      const res = await AccountApi.getTransactions({
        account_id: account.id,
        page,
        limit,
        sort_by: 'created_at',
        sort_order: 'DESC',
        ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
      });
      setTransactions(res.data || []);
      setTotal(res.meta?.total ?? (res.data?.length ?? 0));
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setIsLoading(false);
    }
  }, [account, isOpen, page, limit, typeFilter]);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setTypeFilter('all');
    }
  }, [isOpen, account?.id]);

  useEffect(() => {
    fetchTx();
  }, [fetchTx]);

  const summary = useMemo(() => {
    let deposit = 0;
    let withdraw = 0;
    for (const t of transactions) {
      const amt = Number(t.amount || 0);
      if (t.type === 'DEPOSIT') deposit += amt;
      else if (t.type === 'WITHDRAW') withdraw += amt;
    }
    return { deposit, withdraw };
  }, [transactions]);

  if (!account) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ประวัติรายการเดินบัญชี · ${account.account_number}`}
      size="7xl"
    >
      {/* Account summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="p-3.5 rounded-lg bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 flex-shrink-0">
              <BuildingOfficeIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">ชื่อบัญชี</p>
              <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                {account.account_name}
              </p>
              <p className="text-[11px] text-slate-500 truncate">{account.bank_name}</p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 flex-shrink-0">
              <WalletIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">ยอดคงเหลือ</p>
              <p className="text-base font-bold text-slate-900 tabular-nums leading-tight whitespace-nowrap truncate">
                {fmtMoney(account.current_balance)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-50/30 border border-emerald-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-600 flex-shrink-0">
              <ArrowTrendingUpIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wide">
                เงินเข้า (ในหน้านี้)
              </p>
              <p className="text-base font-bold text-emerald-700 tabular-nums leading-tight whitespace-nowrap truncate">
                +{fmtMoney(summary.deposit)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-gradient-to-br from-red-50 to-red-50/30 border border-red-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-100 text-red-600 flex-shrink-0">
              <CurrencyDollarIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-red-700 uppercase tracking-wide">
                เงินออก (ในหน้านี้)
              </p>
              <p className="text-base font-bold text-red-700 tabular-nums leading-tight whitespace-nowrap truncate">
                -{fmtMoney(summary.withdraw)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <DropdownSelect
          value={typeFilter}
          onChange={(v) => {
            setTypeFilter(v as typeof typeFilter);
            setPage(1);
          }}
          className="w-fit text-sm"
          options={[
            { value: 'all', label: 'ทุกประเภทรายการ' },
            { value: 'DEPOSIT', label: 'เงินเข้า' },
            { value: 'WITHDRAW', label: 'เงินออก' },
            { value: 'TRANSFER', label: 'โอน' },
            { value: 'ADJUSTMENT', label: 'ปรับปรุงยอด' },
          ]}
        />
        <span className="ml-auto text-sm text-slate-500">
          ทั้งหมด{' '}
          <span className="font-semibold text-slate-700 tabular-nums">
            {total.toLocaleString('th-TH')}
          </span>{' '}
          รายการ
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-auto max-h-[55vh]">
          <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200 text-left">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                <th className="px-5 py-3.5 w-16">ลำดับ</th>
                <th className="px-5 py-3.5">วันที่และเวลา</th>
                <th className="px-5 py-3.5">ประเภท</th>
                <th className="px-5 py-3.5">รายละเอียด</th>
                <th className="px-5 py-3.5">อ้างอิง</th>
                <th className="px-5 py-3.5 text-right">จำนวนเงิน</th>
                <th className="px-5 py-3.5 text-right">ยอดคงเหลือ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16">
                    <div className="flex flex-col items-center text-slate-500">
                      <LoadingIcon className="w-10 h-10 animate-spin mb-3 text-primary" />
                      <p className="text-sm font-medium">กำลังโหลด...</p>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16">
                    <div className="flex flex-col items-center text-slate-400">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-3">
                        <DocumentCheckIcon className="h-8 w-8 opacity-60" />
                      </div>
                      <p className="text-base font-medium text-slate-500">ยังไม่มีรายการเดินบัญชี</p>
                      <p className="text-sm text-slate-400 mt-1">รายการที่บันทึกจะปรากฏที่นี่</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((t, i) => {
                  const meta = TYPE_META[t.type];
                  return (
                    <tr key={t.id} className={`${meta.rowClass} ${meta.hoverClass} transition-colors`}>
                      <td className={`px-5 py-4 text-sm text-slate-500 tabular-nums ${meta.accentClass}`}>
                        {(page - 1) * limit + i + 1}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">
                        {formatThaiDateTime(t.created_at || t.transaction_date)}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700 text-left">
                        {t.description || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">
                        {t.reference_code || <span className="text-slate-300">-</span>}
                      </td>
                      <td
                        className={`px-5 py-4 text-base font-bold tabular-nums text-right whitespace-nowrap ${meta.amountClass}`}
                      >
                        {meta.sign}
                        {fmtMoney(t.amount)}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-800 font-semibold tabular-nums text-right whitespace-nowrap">
                        {fmtMoney(t.balance_after)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && total > 0 && (
          <div className="border-t border-slate-200">
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
    </Modal>
  );
};
