import { FC, FormEvent, useEffect, useMemo, useState } from 'react';
import Swal from '@/src/utils/swal';

import { Modal } from '../../common/Modal';
import { Input, Button } from '../../common/FormControls';
import BuddhistDatePicker from '../../common/BuddhistDatePicker';
import { AccountApi } from '@/src/api/account';
import { Account } from '@/src/types/entity/account.interface';
import {
  BanknotesIcon,
  TrashIcon,
  PlusIcon,
} from '@/src/assets/icons/Icons';

type Props = {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
  onSubmitted?: () => void;
};

type ExpenseLine = {
  id: string;
  description: string;
  amount: number | '';
};

const todayISO = () => new Date().toISOString().substring(0, 10);

const fmtBaht = (v: number) =>
  v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CashWithdrawalModal: FC<Props> = ({ isOpen, account, onClose, onSubmitted }) => {
  const [date, setDate] = useState(todayISO());
  const [refCode, setRefCode] = useState('');
  const [note, setNote] = useState('');
  const [expenses, setExpenses] = useState<ExpenseLine[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDate(todayISO());
    setRefCode('');
    setNote('');
    setExpenses([{ id: crypto.randomUUID(), description: '', amount: '' }]);
    setIsSaving(false);
  }, [isOpen]);

  const totalAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [expenses],
  );

  const addLine = () =>
    setExpenses((prev) => [...prev, { id: crypto.randomUUID(), description: '', amount: '' }]);

  const removeLine = (id: string) =>
    setExpenses((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));

  const updateLine = (id: string, key: 'description' | 'amount', value: string) =>
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, [key]: key === 'amount' ? (value === '' ? '' : Number(value)) : value }
          : e,
      ),
    );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!account) return;

    const valid = expenses.filter(
      (item) => item.description.trim() !== '' && Number(item.amount) > 0,
    );
    if (valid.length === 0) {
      Swal.fire('ไม่สามารถบันทึกได้', 'กรุณากรอกรายการเบิกอย่างน้อย 1 รายการ', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      // ทยอยสร้าง WITHDRAW transactions ทีละรายการ
      for (const item of valid) {
        await AccountApi.createTransaction(account.id, {
          type: 'WITHDRAW',
          amount: Number(item.amount),
          transaction_date: date,
          reference_code: refCode || undefined,
          description: note
            ? `${item.description.trim()} — ${note.trim()}`
            : item.description.trim(),
        });
      }
      Swal.fire({
        icon: 'success',
        title: 'บันทึกการเบิกแล้ว',
        text: `${valid.length} รายการ รวม ${fmtBaht(totalAmount)} บาท`,
        timer: 1500,
        showConfirmButton: false,
      });
      onSubmitted?.();
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถบันทึกการเบิกได้', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="บันทึกการเบิกเงิน"
      size="3xl"
      footer={
        <div className="flex justify-end gap-3 py-2">
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
          >
            ยกเลิก
          </Button>
          <Button type="submit" form="cash-withdrawal-form" variant="primary" disabled={isSaving}>
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเบิก'}
          </Button>
        </div>
      }
    >
      <form id="cash-withdrawal-form" onSubmit={handleSubmit} className="p-4 bg-slate-50 rounded-lg space-y-4">
        {/* Account info */}
        {account && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <BanknotesIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">บัญชีต้นทาง</p>
              <p className="text-base font-semibold text-slate-800 truncate">
                {account.account_number} ({account.account_name})
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                ยอดคงเหลือ: <span className="font-semibold text-slate-700">{fmtBaht(Number(account.current_balance || 0))} บาท</span>
              </p>
            </div>
          </div>
        )}

        {/* Date + ref */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">วันที่</label>
            <BuddhistDatePicker
              selected={date ? new Date(date) : null}
              onChange={(d: Date | null) => setDate(d ? d.toISOString().substring(0, 10) : todayISO())}
              dateFormat="dd/MM/yyyy"
              locale="th"
              wrapperClassName="w-full"
              className="block w-full rounded-md border border-slate-300 py-2 px-3 text-sm shadow-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white h-10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">เลขอ้างอิง (ถ้ามี)</label>
            <Input
              type="text"
              value={refCode}
              onChange={(e) => setRefCode(e.target.value)}
              placeholder="เช่น เลขใบเสร็จ / เลขรายการ"
              className="h-10"
            />
          </div>
        </div>

        {/* Expense lines */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-700">รายการเบิกเงิน</h3>
            <span className="text-xs text-slate-500">{expenses.length} รายการ</span>
          </div>

          {expenses.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg border border-slate-200 group hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-md text-slate-400 shrink-0">
                  <BanknotesIcon className="w-5 h-5" />
                </div>
                <div className="flex gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLine(item.id, 'description', e.target.value)}
                    placeholder="กรอกรายละเอียดค่าใช้จ่าย..."
                    className="w-[70%] rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm font-medium bg-white px-3 py-2 min-w-0"
                  />
                  <div className="relative flex items-center w-[30%]">
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => updateLine(item.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      min={0}
                      className="w-full rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary text-base font-bold text-right pr-12 bg-white px-3 py-2"
                    />
                    <span className="absolute right-3 text-sm font-semibold text-slate-400">บาท</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(item.id)}
                  disabled={expenses.length <= 1}
                  className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-2 px-6 py-2.5 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 hover:shadow-sm transition-all font-medium"
            >
              <PlusIcon className="h-5 w-5" /> เพิ่มรายการเบิกเงิน
            </button>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-3">
            <span className="text-sm font-bold text-slate-600">ยอดรวมเบิก</span>
            <span className="text-xl font-black text-red-600">
              -{fmtBaht(totalAmount)} <span className="text-base font-bold text-slate-500 ml-1">บาท</span>
            </span>
          </div>
        </div>

        {/* Note */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุรวม (ถ้ามี)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="คำอธิบายเพิ่มเติม จะต่อท้ายทุกรายการที่บันทึก"
            rows={2}
            className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm shadow-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white"
          />
        </div>
      </form>
    </Modal>
  );
};
