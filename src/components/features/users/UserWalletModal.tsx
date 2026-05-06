import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { User } from '@/src/types/entity/app.interface';
import { FormField, Input, Button } from '../../common/FormControls';
import { formatThaiDateTime } from '../../../utils/date';
import { PencilIcon, WalletIcon } from '../../../assets/icons/Icons';
import { UserApi } from '../../../api/user';

interface UserWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const UserWalletModal: React.FC<UserWalletModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [showLimitForm, setShowLimitForm] = useState(false);
  const [limitAmount, setLimitAmount] = useState<number | ''>('');

  const [wallet, setWallet] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // DF-403: ประวัติรายการ filter by date range
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');

  // DF-404: Pagination — default page 1, pageSize 10
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (isOpen && user) {
      fetchWallet();
    }
  }, [isOpen, user]);

  const fetchWallet = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await UserApi.getWallet(user.id);
      setWallet(data);
      setLimitAmount(data.expense_limit || 0);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const balance = useMemo(() => {
    if (wallet && 'balance' in wallet) {
      return wallet.expense_limit;
    }
    return 0;
  }, [wallet]);

  const sortedTransactions = useMemo(() => {
    if (!wallet || !wallet.transactions) return [];
    return [...wallet.transactions].sort(
      (a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [wallet]);

  // DF-403: filter by date range (inclusive)
  const filteredTransactions = useMemo(() => {
    if (!filterFrom && !filterTo) return sortedTransactions;
    const fromMs = filterFrom ? new Date(filterFrom).setHours(0, 0, 0, 0) : -Infinity;
    const toMs = filterTo ? new Date(filterTo).setHours(23, 59, 59, 999) : Infinity;
    return sortedTransactions.filter((txn: any) => {
      const ms = new Date(txn.date).getTime();
      return ms >= fromMs && ms <= toMs;
    });
  }, [sortedTransactions, filterFrom, filterTo]);

  // DF-404: paginate filtered results
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));

  // reset to page 1 whenever filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterFrom, filterTo]);

  const handleUpdateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      try {
        await UserApi.update(user.id, {
          expense_limit: Number(limitAmount),
        });

        // Refresh wallet
        await fetchWallet();
        setShowLimitForm(false);
      } catch (error) {
        console.error('Failed to update limit:', error);
      }
    }
  };

  if (!isOpen || !user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`กระเป๋าเงิน: ${user.name}`}
      size="3xl"
      footer={
        <Button
          type="button"
          onClick={onClose}
          className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
          variant="primary"
        >
          ปิด
        </Button>
      }
    >
      <div className="space-y-5">
        {/* ── Section 1: วงเงินการเบิก (centered + edit button top-right) ── */}
        <div className="p-4 bg-primary/10 rounded-lg text-center relative">
          <p className="text-sm font-medium text-primary/80">วงเงินการเบิก</p>
          <p className="text-4xl font-bold text-primary">
            {balance.toLocaleString('th-TH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}บาท
          </p>
          <button
            onClick={() => setShowLimitForm(!showLimitForm)}
            className="absolute top-4 right-4 text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-medium"
          >
            <PencilIcon className="w-4 h-4" />
            แก้ไขวงเงิน
          </button>
        </div>

        {/* ── Section 2: ฟอร์มแก้ไขวงเงิน (toggle) ───────────────── */}
        {showLimitForm && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <PencilIcon className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-slate-800">แก้ไขวงเงินอนุมัติ</h3>
            </div>
            <form onSubmit={handleUpdateLimit} className="space-y-4">
              <FormField label="วงเงิน (บาท)" htmlFor="limit-amount">
                <Input
                  id="limit-amount"
                  type="number"
                  value={limitAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') { setLimitAmount(''); return; }
                    const num = Number(val);
                    if (num > 99999) return;
                    setLimitAmount(num);
                  }}
                  min="1"
                  max="99999"
                  step="1"
                  required
                />
              </FormField>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={() => setShowLimitForm(false)}
                  className="py-2 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300"
                  variant="ghost"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold"
                  variant="primary"
                >
                  บันทึกวงเงิน
                </Button>
              </div>
            </form>
          </section>
        )}


        {/* ── Section 4: ประวัติรายการ ───────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">ประวัติรายการ</h3>
            <span className="text-xs text-slate-500">
              ทั้งหมด {filteredTransactions.length} รายการ
            </span>
          </div>

          {/* Filter row */}
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">จากวันที่</label>
                <Input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">ถึงวันที่</label>
                <Input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              {(filterFrom || filterTo) && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFilterFrom('');
                    setFilterTo('');
                  }}
                  className="h-9 px-3 text-sm text-slate-600 border border-slate-300 hover:bg-white rounded-lg"
                >
                  ล้างตัวกรอง
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">
                    วันที่
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    รายละเอียด
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">
                    จำนวนเงิน
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((txn: any) => (
                    <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {formatThaiDateTime(txn.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {txn.description}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-sm font-semibold text-right ${
                          txn.type === 'รายรับ'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {txn.type === 'รายรับ' ? '+' : '-'}
                        {txn.amount.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <WalletIcon className="w-10 h-10 text-slate-300 opacity-60" />
                        <p className="text-sm font-medium">
                          {loading
                            ? 'กำลังโหลด...'
                            : filterFrom || filterTo
                            ? 'ไม่พบรายการในช่วงวันที่เลือก'
                            : 'ยังไม่มีรายการ'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination (DF-404) */}
            {filteredTransactions.length > pageSize && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 text-sm">
                <span className="text-slate-600">
                  แสดง {(currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, filteredTransactions.length)} จาก {filteredTransactions.length} รายการ
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-white disabled:opacity-40"
                  >
                    ก่อนหน้า
                  </Button>
                  <span className="px-3 text-slate-600 font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-white disabled:opacity-40"
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
};
