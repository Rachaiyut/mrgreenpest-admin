import { ChangeEvent, FC, FormEvent, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';

import { Modal } from '../../common/Modal';
import { Input, Button } from '../../common/FormControls';
import { DropdownSelect } from '../../common';
import { Account, AccountType } from '../../../types/entity/account.interface';
import Swal from '@/src/utils/swal';

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
  qr_code: '',
};

const formatNumber = (n: number) =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const decodeQrFromImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('โหลดรูปไม่สำเร็จ'));
      img.onload = () => {
        const MAX_EDGE = 1024;
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('ไม่รองรับ canvas บน browser นี้'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const result = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
        if (result && result.data) {
          resolve(result.data);
        } else {
          reject(new Error('ไม่พบ QR ในรูปภาพ — ลองใช้รูปที่ชัดเจนกว่านี้'));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

/* ---------- icon helpers ---------- */
const IconBank: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l9-6 9 6M5 10v9m4-9v9m6-9v9m4-9v9M3 21h18" />
  </svg>
);
const IconCoin: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="12" cy="12" r="9" strokeLinecap="round" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.5C9 8.4 9.9 7.5 11 7.5h2a2 2 0 110 4h-2a2 2 0 100 4h2c1.1 0 2-.9 2-2M12 6v1.5M12 16.5V18" />
  </svg>
);
const IconNote: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h16" />
  </svg>
);
const IconQR: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5C19.746 3.75 20.25 4.254 20.25 4.875v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM13.5 14.625v4.5M13.5 19.125h6.75M16.875 16.5h3.375" />
  </svg>
);

/* ---------- section header ---------- */
const SectionHeader: FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">{icon}</div>
    <div>
      <h3 className="text-sm font-semibold text-slate-800 leading-tight">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

/* ---------- field label ---------- */
const FieldLabel: FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block text-xs font-medium text-slate-600 mb-1.5">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

export const AccountModal: FC<AccountModalProps> = ({
  isOpen,
  mode,
  initialValues,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const [formErrors, setFormErrors] = useState<{ account_number?: string; account_name?: string; bank_name?: string }>({});

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
        qr_code: initialValues.qr_code || '',
      });
    } else {
      setForm(emptyForm);
    }
    setFormErrors({});
  }, [isOpen, mode, initialValues]);

  const handleQrFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'error', title: 'รองรับเฉพาะไฟล์รูปภาพ', timer: 1500, showConfirmButton: false });
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: 'error', title: 'ไฟล์ใหญ่เกิน 5 MB', timer: 1800, showConfirmButton: false });
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
      return;
    }
    setIsDecoding(true);
    try {
      const decoded = await decodeQrFromImageFile(file);
      setForm((prev) => ({ ...prev, qr_code: decoded }));
      Swal.fire({ icon: 'success', title: 'อ่าน QR สำเร็จ', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ถอดรหัส QR ไม่สำเร็จ', text: (err as Error).message });
    } finally {
      setIsDecoding(false);
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errors: { account_number?: string; account_name?: string; bank_name?: string } = {};
    if (!form.account_number.trim()) errors.account_number = 'กรุณากรอกเลขที่บัญชี';
    if (!form.account_name.trim()) errors.account_name = 'กรุณากรอกชื่อบัญชี';
    if (!form.bank_name.trim()) errors.bank_name = 'กรุณากรอกชื่อธนาคาร';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setTimeout(() => document.querySelector('.text-red-500.text-xs')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      return;
    }
    setFormErrors({});
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
        qr_code: form.qr_code.trim() || undefined,
      };
      if (mode === 'create') {
        payload.current_balance = Number(form.current_balance);
      }
      await onSubmit(payload);
    } finally {
      setIsSaving(false);
    }
  };

  const qrValue = form.qr_code.trim();
  const previewBalance = mode === 'edit'
    ? Number(initialValues?.current_balance ?? form.current_balance)
    : Number(form.current_balance);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'เพิ่มบัญชี' : 'แก้ไขบัญชี'}
      size="3xl"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button type="button" onClick={onClose} variant="ghost" className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50">
            ยกเลิก
          </Button>
          <Button type="submit" form="account-form" variant="primary" disabled={isSaving || isDecoding}>
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </Button>
        </div>
      }
    >
      <form id="account-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Section: ข้อมูลบัญชี */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            icon={<IconBank className="h-4 w-4" />}
            title="ข้อมูลบัญชี"
            subtitle="รายละเอียดบัญชีและธนาคาร"
          />
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>เลขที่บัญชี</FieldLabel>
              <Input
                value={form.account_number}
                placeholder="123-4-56789-0"
                onChange={(e) => {
                  setForm({ ...form, account_number: e.target.value });
                  if (formErrors.account_number) setFormErrors((prev) => ({ ...prev, account_number: undefined }));
                }}
              />
              {formErrors.account_number && <p className="text-red-500 text-xs mt-1">{formErrors.account_number}</p>}
            </div>
            <div>
              <FieldLabel required>ชื่อบัญชี</FieldLabel>
              <Input
                value={form.account_name}
                placeholder="เช่น บริษัท มิสเตอร์กรีนเพสต์ จำกัด"
                onChange={(e) => {
                  setForm({ ...form, account_name: e.target.value });
                  if (formErrors.account_name) setFormErrors((prev) => ({ ...prev, account_name: undefined }));
                }}
              />
              {formErrors.account_name && <p className="text-red-500 text-xs mt-1">{formErrors.account_name}</p>}
            </div>
            <div>
              <FieldLabel required>ชื่อธนาคาร</FieldLabel>
              <Input
                value={form.bank_name}
                placeholder="เช่น ธนาคารกสิกรไทย"
                onChange={(e) => {
                  setForm({ ...form, bank_name: e.target.value });
                  if (formErrors.bank_name) setFormErrors((prev) => ({ ...prev, bank_name: undefined }));
                }}
              />
              {formErrors.bank_name && <p className="text-red-500 text-xs mt-1">{formErrors.bank_name}</p>}
            </div>
            <div>
              <FieldLabel>ชื่อสาขา</FieldLabel>
              <Input
                value={form.branch_name}
                placeholder="สาขารัชดาภิเษก"
                onChange={(e) => setForm({ ...form, branch_name: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>ประเภทบัญชี</FieldLabel>
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
            <div>
              <FieldLabel>สกุลเงิน</FieldLabel>
              <Input
                value={form.currency}
                maxLength={3}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
        </section>

        {/* Row: QR section + การเงิน section (side-by-side) */}
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
          {/* Section: QR Code */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              icon={<IconQR className="h-4 w-4" />}
              title="QR Code"
              subtitle="สำหรับรับชำระ"
            />
            <div className="p-4">
              <div className="w-full aspect-square border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 relative overflow-hidden group transition-all hover:border-emerald-500 hover:bg-emerald-50/30 cursor-pointer">
                <input
                  ref={qrFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQrFileChange}
                  disabled={isDecoding}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                />
                {qrValue ? (
                  <div className="w-full h-full flex items-center justify-center p-3 bg-white">
                    <QRCodeSVG value={qrValue} size={180} level="M" className="w-full h-full" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 px-2">
                    <div className="p-2.5 bg-white rounded-full shadow-sm mb-1.5 ring-1 ring-slate-200">
                      <IconQR className="h-6 w-6 text-emerald-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-600">
                      {isDecoding ? 'กำลังอ่าน QR...' : 'อัปโหลดรูป QR'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG ≤ 5 MB</span>
                  </div>
                )}
                {qrValue && !isDecoding && (
                  <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-white text-xs font-medium bg-slate-900/70 px-3 py-1.5 rounded-full backdrop-blur-sm">
                      เปลี่ยนรูป QR
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section: การเงิน */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              icon={<IconCoin className="h-4 w-4" />}
              title="การเงิน"
              subtitle="วงเงินและยอดคงเหลือ"
            />
            <div className="p-4 space-y-3">
              {/* วงเงินจำกัด */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 hover:border-emerald-200 transition-colors px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-600">วงเงินจำกัด</span>
                  <span className="text-[10px] text-slate-400">0 = ไม่จำกัด</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.credit_limit}
                    onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) })}
                    className="flex-1 min-w-0 text-2xl font-semibold text-slate-800 bg-transparent border-0 outline-none focus:ring-0 p-0 placeholder:text-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-400">{form.currency}</span>
                </div>
              </div>

              {/* ยอดเริ่มต้น (create) / ยอดคงเหลือ (edit, read-only) */}
              {mode === 'create' ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 hover:border-emerald-200 transition-colors px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-600">ยอดเริ่มต้น</span>
                    <span className="text-[10px] text-slate-400">เริ่มจาก 0 หรือยอดยกมา</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={form.current_balance}
                      onChange={(e) => setForm({ ...form, current_balance: Number(e.target.value) })}
                      className="flex-1 min-w-0 text-2xl font-semibold text-slate-800 bg-transparent border-0 outline-none focus:ring-0 p-0 placeholder:text-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-400">{form.currency}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-emerald-700">ยอดคงเหลือปัจจุบัน</span>
                    <span className="text-[10px] text-emerald-600/70">อัปเดตโดยระบบ</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-emerald-700 tabular-nums">
                      {formatNumber(previewBalance)}
                    </span>
                    <span className="text-sm font-medium text-emerald-600/70">{form.currency}</span>
                  </div>
                  {Number(form.credit_limit) > 0 && (
                    <div className="mt-2.5">
                      <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(0, (previewBalance / Number(form.credit_limit)) * 100))}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-emerald-700/70 mt-1">
                        {Math.round(Math.min(100, (previewBalance / Number(form.credit_limit)) * 100))}% ของวงเงิน {formatNumber(Number(form.credit_limit))} {form.currency}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Section: หมายเหตุ */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            icon={<IconNote className="h-4 w-4" />}
            title="หมายเหตุ"
            subtitle="ข้อมูลเพิ่มเติม (ไม่บังคับ)"
          />
          <div className="p-5">
            <textarea
              className="block w-full rounded-lg border border-slate-300 py-2.5 px-3 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-slate-400"
              rows={3}
              placeholder="เช่น ใช้สำหรับรับเงินค่าบริการลูกค้าทั่วไป"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </section>
      </form>
    </Modal>
  );
};
