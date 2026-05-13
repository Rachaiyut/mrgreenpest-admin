import { FC, FormEvent, useEffect, useState } from 'react';
import Swal from '@/src/utils/swal';

import { Modal } from '../../common/Modal';
import { Input, Button } from '../../common/FormControls';
import { AccountApi } from '../../../api/account';
import { Account, AccountTransaction, AccountTransactionType } from '../../../types/entity/account.interface';

export type AccountTransactionModalMode = 'create' | 'view';

interface Props {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
  onSubmitted?: () => Promise<void> | void;
  /** create (default) = ฟอร์มสร้าง, view = อ่านอย่างเดียวจาก transaction */
  mode?: AccountTransactionModalMode;
  /** transaction ที่จะแสดงใน view mode (จำเป็นเมื่อ mode='view') */
  transaction?: AccountTransaction | null;
}

const todayISO = () => new Date().toISOString().substring(0, 10);

const formatTHB = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCompactTHB = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const fmt = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 2 });
  if (abs >= 1_000_000_000_000) return `${sign}${fmt(abs / 1_000_000_000_000)}T`;
  if (abs >= 1_000_000_000) return `${sign}${fmt(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${fmt(abs / 1_000_000)}M`;
  if (abs >= 10_000) return `${sign}${fmt(abs / 1_000)}K`;
  return formatTHB(n);
};

/* ---------- icons ---------- */
const IconArrowDown: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0l-6-6m6 6l6-6" />
  </svg>
);
const IconArrowUp: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V4m0 0l-6 6m6-6l6 6" />
  </svg>
);
const IconAdjust: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h13m0 0l-3-3m3 3l-3 3M20 18H7m0 0l3 3m-3-3l3-3" />
  </svg>
);
const IconBank: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l9-6 9 6M5 10v9m4-9v9m6-9v9m4-9v9M3 21h18" />
  </svg>
);

const TYPE_META: Record<
  AccountTransactionType,
  { label: string; color: 'emerald' | 'rose' | 'amber'; icon: FC<{ className?: string }> }
> = {
  DEPOSIT: { label: 'เงินเข้า', color: 'emerald', icon: IconArrowDown },
  WITHDRAW: { label: 'เงินออก', color: 'rose', icon: IconArrowUp },
  ADJUSTMENT: { label: 'ปรับปรุงยอด', color: 'amber', icon: IconAdjust },
  TRANSFER: { label: 'โอน', color: 'emerald', icon: IconArrowUp },
};

const TYPE_CLASSES: Record<
  'emerald' | 'rose' | 'amber',
  { active: string; idle: string; iconActive: string; iconIdle: string }
> = {
  emerald: {
    active: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20',
    idle: 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30',
    iconActive: 'bg-emerald-500 text-white',
    iconIdle: 'bg-emerald-100 text-emerald-600',
  },
  rose: {
    active: 'border-rose-500 bg-rose-50 ring-2 ring-rose-500/20',
    idle: 'border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/30',
    iconActive: 'bg-rose-500 text-white',
    iconIdle: 'bg-rose-100 text-rose-600',
  },
  amber: {
    active: 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20',
    idle: 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/30',
    iconActive: 'bg-amber-500 text-white',
    iconIdle: 'bg-amber-100 text-amber-600',
  },
};

export const AccountTransactionModal: FC<Props> = ({
  isOpen,
  account,
  onClose,
  onSubmitted,
  mode = 'create',
  transaction,
}) => {
  const isView = mode === 'view';

  const [type, setType] = useState<AccountTransactionType>('DEPOSIT');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(todayISO());
  const [refCode, setRefCode] = useState('');
  const [desc, setDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (isView && transaction) {
      setType(transaction.type);
      setAmount(Number(transaction.amount || 0));
      setDate((transaction.transaction_date || todayISO()).substring(0, 10));
      setRefCode(transaction.reference_code || '');
      setDesc(transaction.description || '');
    } else {
      setType('DEPOSIT');
      setAmount(0);
      setDate(todayISO());
      setRefCode('');
      setDesc('');
    }
  }, [isOpen, isView, transaction]);

  if (!account) return null;

  const before = Number(account.current_balance || 0);
  const amt = Number(amount || 0);
  // view mode: คำนวณ "ยอดก่อน" จาก balance_after − delta จริงของ trx
  const previewBalance = isView && transaction
    ? Number(transaction.balance_after || 0)
    : (
      type === 'DEPOSIT' ? before + amt :
      type === 'WITHDRAW' ? before - amt :
      type === 'ADJUSTMENT' ? before + amt :
      before
    );
  const beforeForDisplay = isView && transaction
    ? Number(transaction.balance_after || 0) -
        (transaction.type === 'WITHDRAW' ? -Number(transaction.amount) : Number(transaction.amount))
    : before;
  const delta = previewBalance - beforeForDisplay;
  const deltaPositive = delta > 0;
  const deltaNegative = delta < 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (amount === 0 && type !== 'ADJUSTMENT') {
      Swal.fire('กรอกจำนวนเงิน', 'จำนวนเงินต้องไม่เป็น 0', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      await AccountApi.createTransaction(account.id, {
        type,
        amount: Math.abs(Number(amount)),
        transaction_date: date,
        reference_code: refCode.trim() || undefined,
        description: desc.trim() || undefined,
      });
      Swal.fire({ icon: 'success', title: 'บันทึกรายการแล้ว', timer: 1200, showConfirmButton: false });
      await onSubmitted?.();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถบันทึกได้', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isView
        ? `รายละเอียดรายการ · ${account.account_number}`
        : `บันทึกรายการเดินบัญชี · ${account.account_number}`}
      size="2xl"
      footer={
        isView ? (
          <div className="flex gap-2 justify-end w-full">
            <Button type="button" onClick={onClose} variant="primary">
              ปิด
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end w-full">
            <Button type="button" onClick={onClose} variant="ghost" className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50">
              ยกเลิก
            </Button>
            <Button type="submit" form="account-trx-form" variant="primary" disabled={isSaving}>
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
            </Button>
          </div>
        )
      }
    >
      <form id="account-trx-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Account info card */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                <IconBank className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{account.account_name}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p
                className="text-lg font-bold text-slate-800 tabular-nums leading-tight"
                title={`${formatTHB(before)} บาท`}
              >
                {formatCompactTHB(before)}
                <span className="text-xs font-medium text-slate-400 ml-1">บาท</span>
              </p>
            </div>
          </div>
        </div>

        {/* Transaction type tiles */}
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">ประเภทรายการ <span className="text-red-500">*</span></p>
          <div className="grid grid-cols-3 gap-2">
            {(['DEPOSIT', 'WITHDRAW', 'ADJUSTMENT'] as const).map((t) => {
              const meta = TYPE_META[t];
              const Icon = meta.icon;
              const cls = TYPE_CLASSES[meta.color];
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => !isView && setType(t)}
                  disabled={isView && !active}
                  className={`relative rounded-xl border-2 transition-all px-3 py-3 text-left ${active ? cls.active : cls.idle} ${isView ? 'cursor-default' : ''} ${isView && !active ? 'opacity-40' : ''}`}
                >
                  <div className={`inline-flex items-center justify-center h-8 w-8 rounded-lg mb-2 transition-colors ${active ? cls.iconActive : cls.iconIdle}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{meta.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount hero */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-600">จำนวนเงิน <span className="text-red-500">*</span></span>
            {type === 'ADJUSTMENT' && (
              <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                ใส่ − ได้ (เช่น -500)
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required={!isView}
              readOnly={isView}
              className="flex-1 min-w-0 text-3xl font-bold text-slate-800 bg-transparent border-0 outline-none focus:ring-0 p-0 tabular-nums placeholder:text-slate-300"
            />
            <span className="text-sm font-medium text-slate-400">{account.currency || 'THB'}</span>
          </div>
        </div>

        {/* Secondary fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">วันที่รายการ {!isView && <span className="text-red-500">*</span>}</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required={!isView} readOnly={isView} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">เลขอ้างอิง / เช็ค</label>
            <Input value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder="เช่น CHQ-0012345" readOnly={isView} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">รายละเอียด</label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="เช่น โอนจากบัญชีกลาง" readOnly={isView} />
          </div>
        </div>

        {/* Balance preview */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="px-5 py-4 min-w-0">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">ยอดก่อน</p>
              <p
                className="text-2xl font-bold text-slate-700 tabular-nums mt-1.5 leading-tight truncate"
                title={`${formatTHB(before)} บาท`}
              >
                {formatCompactTHB(before)}
                <span className="text-xs font-medium text-slate-400 ml-1">บาท</span>
              </p>
            </div>
            <div className="px-5 py-4 min-w-0">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">การเปลี่ยนแปลง</p>
              <p
                className={`text-2xl font-bold tabular-nums mt-1.5 leading-tight truncate ${
                  deltaPositive ? 'text-emerald-600' : deltaNegative ? 'text-rose-600' : 'text-slate-700'
                }`}
                title={`${deltaPositive ? '+' : ''}${formatTHB(delta)} บาท`}
              >
                {deltaPositive ? '+' : ''}{formatCompactTHB(delta)}
                <span className={`text-xs font-medium ml-1 ${deltaPositive ? 'text-emerald-400' : deltaNegative ? 'text-rose-400' : 'text-slate-400'}`}>บาท</span>
              </p>
            </div>
            <div className="px-5 py-4 bg-emerald-50/60 min-w-0">
              <p className="text-xs uppercase tracking-wider text-emerald-700/80 font-medium">ยอดหลังบันทึก</p>
              <p
                className="text-2xl font-bold text-emerald-700 tabular-nums mt-1.5 leading-tight truncate"
                title={`${formatTHB(previewBalance)} บาท`}
              >
                {formatCompactTHB(previewBalance)}
                <span className="text-xs font-medium text-emerald-600/70 ml-1">บาท</span>
              </p>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
