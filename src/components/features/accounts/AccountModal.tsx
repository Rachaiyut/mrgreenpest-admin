import { FC, FormEvent, useEffect, useState } from 'react';

import { Modal } from '../../common/Modal';
import { Input, Button } from '../../common/FormControls';
import { DropdownSelect } from '../../common';
import { Account, AccountType } from '../../../types/entity/account.interface';

interface AccountModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialValues?: Account | null;
  onClose: () => void;
  onSubmit: (payload: Partial<Account>) => Promise<void> | void;
}

const emptyForm = {
  account_number: '',
  account_name: '',
  bank_name: '',
  branch_name: '',
  account_type: 'SAVINGS' as AccountType,
  credit_limit: 0,
  current_balance: 0,
  currency: 'THB',
  is_active: true,
  notes: '',
};

export const AccountModal: FC<AccountModalProps> = ({
  isOpen,
  mode,
  initialValues,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialValues) {
      setForm({
        account_number: initialValues.account_number || '',
        account_name: initialValues.account_name || '',
        bank_name: initialValues.bank_name || '',
        branch_name: initialValues.branch_name || '',
        account_type: initialValues.account_type || 'SAVINGS',
        credit_limit: Number(initialValues.credit_limit || 0),
        current_balance: Number(initialValues.current_balance || 0),
        currency: initialValues.currency || 'THB',
        is_active: initialValues.is_active ?? true,
        notes: initialValues.notes || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, mode, initialValues]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Partial<Account> = {
        account_number: form.account_number.trim(),
        account_name: form.account_name.trim(),
        bank_name: form.bank_name.trim(),
        branch_name: form.branch_name.trim() || undefined,
        account_type: form.account_type,
        credit_limit: Number(form.credit_limit),
        currency: form.currency.trim() || 'THB',
        is_active: form.is_active,
        notes: form.notes.trim() || undefined,
      };
      if (mode === 'create') {
        payload.current_balance = Number(form.current_balance);
      }
      await onSubmit(payload);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'เพิ่มบัญชี' : 'แก้ไขบัญชี'}
      size="2xl"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button type="button" onClick={onClose} variant="ghost" className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50">
            ยกเลิก
          </Button>
          <Button type="submit" form="account-form" variant="primary" disabled={isSaving}>
            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      }
    >
      <form id="account-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">เลขที่บัญชี <span className="text-red-500">*</span></label>
          <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} required />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อบัญชี <span className="text-red-500">*</span></label>
          <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} required />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อธนาคาร <span className="text-red-500">*</span></label>
          <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} required />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อสาขา</label>
          <Input value={form.branch_name} onChange={(e) => setForm({ ...form, branch_name: e.target.value })} />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทบัญชี</label>
          <DropdownSelect
            value={form.account_type}
            onChange={(v) => setForm({ ...form, account_type: v as AccountType })}
            options={[
              { value: 'SAVINGS', label: 'ออมทรัพย์' },
              { value: 'CURRENT', label: 'กระแสรายวัน' },
              { value: 'FIXED', label: 'เงินฝากประจำ' },
              { value: 'OTHER', label: 'อื่นๆ' },
            ]}
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">สกุลเงิน</label>
          <Input value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">วงเงินจำกัด (0 = ไม่จำกัด)</label>
          <Input type="number" min={0} step="0.01" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) })} />
        </div>
        {mode === 'create' && (
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">ยอดเริ่มต้น</label>
            <Input type="number" step="0.01" value={form.current_balance} onChange={(e) => setForm({ ...form, current_balance: Number(e.target.value) })} />
          </div>
        )}
        <div className="md:col-span-1 flex items-center">
          <label className="inline-flex items-center gap-2 mt-5">
            <input type="checkbox" className="rounded border-slate-300" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <span className="text-sm text-slate-700">ใช้งาน</span>
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
          <textarea
            className="block w-full rounded-md border border-slate-300 py-2 px-3 text-sm shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
};
