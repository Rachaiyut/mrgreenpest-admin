import { FC, FormEvent, useEffect, useMemo, useState } from 'react';
import Swal from '@/src/utils/swal';

import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { DropdownSelect } from '../../common/DropdownSelect';
import { AccountApi } from '@/src/api/account';
import {
  CashWithdrawalRequest,
  CashWithdrawalRequestApi,
} from '@/src/api/cash-withdrawal-request';
import { Account } from '@/src/types/entity/account.interface';

type Props = {
  isOpen: boolean;
  request: CashWithdrawalRequest | null;
  onClose: () => void;
  onSubmitted?: () => void;
};

const fmtBaht = (v: number) =>
  v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const ApproveCashWithdrawalRequestModal: FC<Props> = ({
  isOpen,
  request,
  onClose,
  onSubmitted,
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSourceAccountId('');
    setIsSaving(false);
    AccountApi.getAll({ limit: 200, is_active: true })
      .then((res) => setAccounts(res?.data || []))
      .catch((err) => console.error('Failed to load accounts:', err));
  }, [isOpen]);

  const sourceOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.id,
        label: `${a.bank_name || ''} ${a.account_number} (${a.account_name}) — ${fmtBaht(Number(a.current_balance || 0))} บาท`.trim(),
      })),
    [accounts],
  );

  const handleApprove = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!request) return;
    if (!sourceAccountId) {
      Swal.fire('เลือกบัญชีต้นทาง', 'กรุณาเลือกบัญชีที่จะหักเงินออก', 'warning');
      return;
    }
    const src = accounts.find((a) => a.id === sourceAccountId);
    if (src && Number(src.current_balance) < Number(request.total_amount)) {
      const cont = await Swal.fire({
        icon: 'warning',
        title: 'ยอดเงินไม่พอ',
        text: `บัญชี ${src.account_name} มียอดคงเหลือ ${fmtBaht(Number(src.current_balance))} บาท แต่ต้องโอน ${fmtBaht(Number(request.total_amount))} บาท ต้องการดำเนินการต่อหรือไม่?`,
        showCancelButton: true,
        confirmButtonText: 'อนุมัติต่อ',
        cancelButtonText: 'ยกเลิก',
      });
      if (!cont.isConfirmed) return;
    }

    setIsSaving(true);
    try {
      await CashWithdrawalRequestApi.approve(request.id, sourceAccountId);
      Swal.fire({
        icon: 'success',
        title: 'อนุมัติแล้ว',
        text: `โอนเงิน ${fmtBaht(Number(request.total_amount))} บาท เรียบร้อย`,
        timer: 1800,
        showConfirmButton: false,
      });
      onSubmitted?.();
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถอนุมัติได้', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ปฏิเสธคำขอเบิก',
      input: 'textarea',
      inputLabel: 'เหตุผลในการปฏิเสธ',
      inputPlaceholder: 'กรอกเหตุผล...',
      inputAttributes: { 'aria-label': 'เหตุผลในการปฏิเสธ' },
      showCancelButton: true,
      confirmButtonText: 'ปฏิเสธ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      inputValidator: (value) => (!value || !value.trim() ? 'กรุณากรอกเหตุผล' : null),
    });
    if (!result.isConfirmed || !result.value) return;

    setIsSaving(true);
    try {
      await CashWithdrawalRequestApi.reject(request.id, result.value.trim());
      Swal.fire({
        icon: 'success',
        title: 'ปฏิเสธคำขอแล้ว',
        timer: 1500,
        showConfirmButton: false,
      });
      onSubmitted?.();
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถปฏิเสธได้', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!request) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`อนุมัติใบขอเบิก: ${request.request_code}`}
      size="3xl"
      footer={
        <div className="flex justify-between gap-3 py-2 w-full">
          <Button
            type="button"
            onClick={handleReject}
            variant="ghost"
            className="bg-white text-red-600 border border-red-300 hover:bg-red-50"
            disabled={isSaving}
          >
            ปฏิเสธคำขอ
          </Button>
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            >
              ปิด
            </Button>
            <Button type="submit" form="approve-cw-form" variant="primary" disabled={isSaving}>
              {isSaving ? 'กำลังอนุมัติ...' : 'อนุมัติ'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="approve-cw-form" onSubmit={handleApprove} className="p-4 bg-slate-50 rounded-lg space-y-4">
        {/* Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500">เลขที่ใบขอเบิก</p>
            <p className="font-bold text-primary">{request.request_code}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">ยอดรวมที่ขอ</p>
            <p className="font-bold text-primary text-lg">{fmtBaht(Number(request.total_amount))} บาท</p>
          </div>
          {request.request_note && (
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">หมายเหตุ</p>
              <p className="text-sm text-slate-700">{request.request_note}</p>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-700 mb-3">
            รายการ ({request.items?.length || 0})
          </h3>
          <div className="space-y-2">
            {(request.items || []).map((it, idx) => (
              <div
                key={it.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
              >
                <span className="text-sm text-slate-700">
                  <span className="text-slate-400 mr-2">{idx + 1}.</span>
                  {it.description}
                </span>
                <span className="text-sm font-bold text-slate-800 tabular-nums">
                  {fmtBaht(Number(it.amount))} บาท
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Source */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            บัญชีต้นทาง (ที่จะหักเงินออก) <span className="text-red-500">*</span>
          </label>
          <DropdownSelect
            value={sourceAccountId}
            onChange={(v) => setSourceAccountId(v)}
            placeholder="เลือกบัญชีต้นทาง"
            options={sourceOptions}
          />
          <p className="text-xs text-slate-500 mt-1">
            ระบบจะสร้างรายการ "เงินออก" ที่บัญชีนี้อัตโนมัติเมื่ออนุมัติ
          </p>
        </div>
      </form>
    </Modal>
  );
};
