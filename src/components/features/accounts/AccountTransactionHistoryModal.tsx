import { FC, useCallback, useEffect, useMemo, useState } from 'react';

import { Modal } from '../../common/Modal';
import { Select } from '../../common/FormControls';
import { Pagination } from '../../common/Pagination';
import { AccountApi } from '../../../api/account';
import {
  Account,
  AccountTransaction,
  AccountTransactionType,
} from '../../../types/entity/account.interface';
import { LoadingIcon, DocumentCheckIcon } from '../../../assets/icons/Icons';
import { formatThaiDate } from '../../../utils/date';

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
      size="5xl"
    >
      {/* Account summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-500">ชื่อบัญชี</p>
          <p className="text-sm font-semibold text-slate-800 truncate">{account.account_name}</p>
          <p className="text-xs text-slate-500">{account.bank_name}</p>
        </div>
        <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-500">ยอดคงเหลือ</p>
          <p className="text-lg font-bold text-slate-800 tabular-nums">
            {fmtMoney(account.current_balance)}
          </p>
        </div>
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200">
          <p className="text-xs text-emerald-700">เงินเข้า (ในหน้านี้)</p>
          <p className="text-lg font-bold text-emerald-700 tabular-nums">+{fmtMoney(summary.deposit)}</p>
        </div>
        <div className="p-3 rounded-md bg-red-50 border border-red-200">
          <p className="text-xs text-red-700">เงินออก (ในหน้านี้)</p>
          <p className="text-lg font-bold text-red-700 tabular-nums">-{fmtMoney(summary.withdraw)}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-3">
        <Select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as typeof typeFilter);
            setPage(1);
          }}
          className="w-fit text-sm !pr-8"
        >
          <option value="all">ทุกประเภทรายการ</option>
          <option value="DEPOSIT">เงินเข้า</option>
          <option value="WITHDRAW">เงินออก</option>
          <option value="TRANSFER">โอน</option>
          <option value="ADJUSTMENT">ปรับปรุงยอด</option>
        </Select>
        <span className="text-sm text-slate-500">ทั้งหมด {total.toLocaleString('th-TH')} รายการ</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-auto max-h-[50vh]">
          <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200 text-center">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr className="text-sm font-semibold text-slate-600">
                <th className="px-4 py-2.5 w-12">#</th>
                <th className="px-4 py-2.5">วันที่</th>
                <th className="px-4 py-2.5">ประเภท</th>
                <th className="px-4 py-2.5">รายละเอียด</th>
                <th className="px-4 py-2.5">อ้างอิง</th>
                <th className="px-4 py-2.5">จำนวนเงิน</th>
                <th className="px-4 py-2.5">ยอดคงเหลือ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <div className="flex flex-col items-center text-slate-500">
                      <LoadingIcon className="w-8 h-8 animate-spin mb-2 text-primary" />
                      <p className="text-sm">กำลังโหลด...</p>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <div className="flex flex-col items-center text-slate-400">
                      <DocumentCheckIcon className="h-10 w-10 mb-2 opacity-50" />
                      <p className="text-sm font-medium">ยังไม่มีรายการเดินบัญชี</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((t, i) => {
                  const meta = TYPE_META[t.type];
                  return (
                    <tr key={t.id} className={`${meta.rowClass} ${meta.hoverClass} transition-colors`}>
                      <td className={`px-4 py-2.5 text-sm text-slate-500 tabular-nums ${meta.accentClass}`}>
                        {(page - 1) * limit + i + 1}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-700">
                        {t.transaction_date ? formatThaiDate(t.transaction_date) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-700 text-left">
                        {t.description || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                        {t.reference_code || <span className="text-slate-300">-</span>}
                      </td>
                      <td className={`px-4 py-2.5 text-sm font-bold tabular-nums ${meta.amountClass}`}>
                        {meta.sign}
                        {fmtMoney(t.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-800 font-semibold tabular-nums">
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
