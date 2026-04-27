import { FC, FormEvent, useEffect, useState } from 'react';
import Swal from 'sweetalert2';

import { Modal } from '../../common/Modal';
import { Input, Select, Button } from '../../common/FormControls';
import { AccountApi } from '../../../api/account';
import { Account, AccountTransactionType } from '../../../types/entity/account.interface';

interface Props {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
  onSubmitted: () => Promise<void> | void;
}

const todayISO = () => new Date().toISOString().substring(0, 10);

export const AccountTransactionModal: FC<Props> = ({ isOpen, account, onClose, onSubmitted }) => {
  const [type, setType] = useState<AccountTransactionType>('DEPOSIT');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(todayISO());
  const [refCode, setRefCode] = useState('');
  const [desc, setDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setType('DEPOSIT');
    setAmount(0);
    setDate(todayISO());
    setRefCode('');
    setDesc('');
  }, [isOpen]);

  if (!account) return null;

  const previewBalance = (() => {
    const before = Number(account.current_balance || 0);
    const amt = Number(amount || 0);
    if (type === 'DEPOSIT') return before + amt;
    if (type === 'WITHDRAW') return before - amt;
    if (type === 'ADJUSTMENT') return before + amt;
    return before;
  })();

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
      await onSubmitted();
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
      title={`บันทึกรายการเดินบัญชี · ${account.account_number}`}
      size="lg"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button type="button" onClick={onClose} variant="ghost" className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50">
            ยกเลิก
          </Button>
          <Button type="submit" form="account-trx-form" variant="primary" disabled={isSaving}>
            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      }
    >
      <form id="account-trx-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-slate-50 border border-slate-200">
          <div>
            <p className="text-xs text-slate-500">บัญชี</p>
            <p className="text-sm font-semibold text-slate-800">{account.account_name}</p>
            <p className="text-xs text-slate-500">{account.bank_name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">ยอดคงเหลือปัจจุบัน</p>
            <p className="text-lg font-bold text-slate-800 tabular-nums">
              ฿{Number(account.current_balance || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทรายการ <span className="text-red-500">*</span></label>
            <Select value={type} onChange={(e) => setType(e.target.value as AccountTransactionType)}>
              <option value="DEPOSIT">เงินเข้า (Deposit)</option>
              <option value="WITHDRAW">เงินออก (Withdraw)</option>
              <option value="ADJUSTMENT">ปรับปรุงยอด (Adjustment)</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">วันที่รายการ <span className="text-red-500">*</span></label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนเงิน <span className="text-red-500">*</span></label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
            {type === 'ADJUSTMENT' && (
              <p className="text-xs text-slate-500 mt-1">Adjustment ใส่เครื่องหมาย − ได้ (เช่น -500 เพื่อลดยอด)</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">เลขอ้างอิง / เช็ค</label>
            <Input value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder="เช่น CHQ-0012345" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด</label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="เช่น โอนจากบัญชีกลาง" />
          </div>
        </div>

        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-sm">
          <p className="text-slate-600">
            ยอดคงเหลือหลังรายการนี้จะเป็น:{' '}
            <span className="font-bold text-emerald-700 tabular-nums">
              ฿{previewBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
      </form>
    </Modal>
  );
};
