import { FC, FormEvent, useEffect, useMemo, useState } from 'react';
import Swal from '@/src/utils/swal';

import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import {
  CashWithdrawalRequest,
  CashWithdrawalRequestApi,
} from '@/src/api/cash-withdrawal-request';
import {
  BanknotesIcon,
  TrashIcon,
  PlusIcon,
} from '@/src/assets/icons/Icons';

const STATUS_META: Record<string, { label: string; badge: string }> = {
  PENDING: { label: 'รออนุมัติ', badge: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'อนุมัติแล้ว', badge: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'ปฏิเสธ', badge: 'bg-red-100 text-red-700' },
};

export type CashWithdrawalRequestModalMode = 'create' | 'view';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
  /** create (default) = ฟอร์มใหม่, view = อ่านอย่างเดียวจาก request */
  mode?: CashWithdrawalRequestModalMode;
  request?: CashWithdrawalRequest | null;
};

type Line = {
  id: string;
  description: string;
  amount: number | '';
};

const fmtBaht = (v: number) =>
  v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CreateCashWithdrawalRequestModal: FC<Props> = ({
  isOpen,
  onClose,
  onSubmitted,
  mode = 'create',
  request,
}) => {
  const isView = mode === 'view';

  const [note, setNote] = useState('');
  const [items, setItems] = useState<Line[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (isView && request) {
      setNote(request.request_note || '');
      setItems(
        (request.items || []).map((it) => ({
          id: it.id,
          description: it.description,
          amount: Number(it.amount),
        })),
      );
    } else {
      setNote('');
      setItems([{ id: crypto.randomUUID(), description: '', amount: '' }]);
    }
    setIsSaving(false);
  }, [isOpen, isView, request]);

  const total = useMemo(
    () => items.reduce((s, it) => s + (Number(it.amount) || 0), 0),
    [items],
  );

  const addLine = () =>
    setItems((prev) => [...prev, { id: crypto.randomUUID(), description: '', amount: '' }]);

  const removeLine = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));

  const updateLine = (id: string, key: 'description' | 'amount', value: string) =>
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, [key]: key === 'amount' ? (value === '' ? '' : Number(value)) : value }
          : it,
      ),
    );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const valid = items.filter((it) => it.description.trim() && Number(it.amount) > 0);
    if (valid.length === 0) {
      Swal.fire('ไม่สามารถบันทึกได้', 'กรุณากรอกรายการอย่างน้อย 1 รายการ', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await CashWithdrawalRequestApi.create({
        request_note: note.trim() || undefined,
        items: valid.map((it) => ({
          description: it.description.trim(),
          amount: Number(it.amount),
        })),
      });
      Swal.fire({
        icon: 'success',
        title: 'ส่งคำขอเบิกแล้ว',
        text: `ยอดรวม ${fmtBaht(total)} บาท — รออนุมัติจาก CFO`,
        timer: 1800,
        showConfirmButton: false,
      });
      onSubmitted?.();
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถบันทึกได้', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const statusMeta = isView && request ? STATUS_META[request.status] : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isView ? `ใบขอเบิก: ${request?.request_code || ''}` : 'สร้างใบขอเบิกเงิน'}
      size="3xl"
      footer={
        isView ? (
          <div className="flex justify-end py-2">
            <Button type="button" onClick={onClose} variant="primary">
              ปิด
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-3 py-2">
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            >
              ยกเลิก
            </Button>
            <Button type="submit" form="create-cw-form" variant="primary" disabled={isSaving}>
              {isSaving ? 'กำลังบันทึก...' : 'ส่งคำขอ'}
            </Button>
          </div>
        )
      }
    >
      <form id="create-cw-form" onSubmit={handleSubmit} className="p-4 bg-slate-50 rounded-lg space-y-4">
        {/* View-only summary header */}
        {isView && request && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500">สถานะ</p>
              {statusMeta && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${statusMeta.badge} mt-1`}>
                  {statusMeta.label}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">บัญชีที่ตัด</p>
              <p className="text-sm font-semibold text-slate-800">
                {request.sourceAccount
                  ? `${request.sourceAccount.account_number} (${request.sourceAccount.account_name})`
                  : <span className="text-slate-400">— ยังไม่ได้อนุมัติ</span>}
              </p>
            </div>
            {request.reject_reason && (
              <div className="sm:col-span-2 bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-700">
                <span className="font-semibold">เหตุผลปฏิเสธ:</span> {request.reject_reason}
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-700">รายการขอเบิก</h3>
            <span className="text-xs text-slate-500">{items.length} รายการ</span>
          </div>

          {items.map((item) => (
            <div key={item.id} className="p-3 rounded-lg border border-slate-200 group hover:border-primary/30">
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
                    readOnly={isView}
                    className="w-[70%] rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm font-medium bg-white px-3 py-2 min-w-0"
                  />
                  <div className="relative flex items-center w-[30%]">
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => updateLine(item.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      min={0}
                      readOnly={isView}
                      className="w-full rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary text-base font-bold text-right pr-12 bg-white px-3 py-2"
                    />
                    <span className="absolute right-3 text-sm font-semibold text-slate-400">บาท</span>
                  </div>
                </div>
                {!isView && (
                  <button
                    type="button"
                    onClick={() => removeLine(item.id)}
                    disabled={items.length <= 1}
                    className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {!isView && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-2 px-6 py-2.5 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 font-medium"
              >
                <PlusIcon className="h-5 w-5" /> เพิ่มรายการ
              </button>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-3">
            <span className="text-sm font-bold text-slate-600">ยอดรวมที่ขอเบิก</span>
            <span className="text-xl font-black text-primary">
              {fmtBaht(total)} <span className="text-base font-bold text-slate-500 ml-1">บาท</span>
            </span>
          </div>
        </div>

        {/* Note */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ (ถ้ามี)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="เหตุผลในการขอเบิก เช่น เติมเงินเข้าบัญชี admin"
            rows={2}
            readOnly={isView}
            className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm shadow-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white"
          />
        </div>

      </form>
    </Modal>
  );
};
