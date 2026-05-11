import React, { useEffect, useMemo, useState } from 'react';
import Swal from '@/src/utils/swal';
import { Modal } from '../../common/Modal';
import { Button, FormField, Input, Textarea } from '../../common/FormControls';
import { DropdownSelect } from '../../common/DropdownSelect';
import { Invoice } from '@/src/types/entity/financial.interface';
import { PaymentMethod } from '@/src/types/enums/financial';
import { PaymentApi } from '@/src/api/payment';
import { StorageApi } from '@/src/api/storage';
import { InvoiceApi } from '@/src/api/invoice';
import { formatThaiDate } from '@/src/utils/date';
import { EyeIcon, DocumentTextIcon, LoadingIcon } from '@/src/assets/icons/Icons';

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'เงินสด',
  TRANSFER: 'โอน',
  CREDIT_CARD: 'บัตรเครดิต',
  CHEQUE: 'เช็ค',
  QR_PAYMENT: 'QR / พร้อมเพย์',
  DIVIDED: 'แบ่งชำระ',
  INSTALLMENT: 'ผ่อนชำระ',
};

const resolveFileUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = (import.meta as any).env?.VITE_API_URL || '';
  return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
};

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess?: () => void;
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.TRANSFER, label: 'โอน' },
  { value: PaymentMethod.CASH, label: 'เงินสด' },
  { value: PaymentMethod.CREDIT_CARD, label: 'บัตรเครดิต' },
  { value: PaymentMethod.CHEQUE, label: 'เช็ค' },
];

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const today = new Date().toISOString().substring(0, 10);

  const [existingPayments, setExistingPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);
  const [attachingSlipFor, setAttachingSlipFor] = useState<string | null>(null);

  const totalPaid = useMemo(
    () => existingPayments.reduce((sum, p) => sum + Number(p?.amount || 0), 0),
    [existingPayments],
  );

  const outstanding = useMemo(() => {
    if (!invoice) return 0;
    const total = Number(invoice.total || 0);
    return Number(Math.max(total - totalPaid, 0).toFixed(2));
  }, [invoice, totalPaid]);

  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
  const [paidAt, setPaidAt] = useState<string>(today);
  const [notes, setNotes] = useState<string>('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !invoice?.id) return;
    let cancelled = false;
    setLoadingPayments(true);
    InvoiceApi.getById(invoice.id)
      .then((res: any) => {
        if (cancelled) return;
        const data = res?.data || res;
        const payments = Array.isArray(data?.payments) ? data.payments : [];
        setExistingPayments(payments);
      })
      .catch((err) => console.error('Failed to load invoice payments', err))
      .finally(() => {
        if (!cancelled) setLoadingPayments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, invoice?.id]);

  useEffect(() => {
    if (!isOpen) return;
    setAmount(outstanding ? String(outstanding) : '');
    setPaymentMethod(PaymentMethod.TRANSFER);
    setPaidAt(today);
    setNotes('');
    setSlipFile(null);
    setSlipPreview(null);
  }, [isOpen, outstanding]);

  useEffect(() => {
    if (!slipFile) {
      setSlipPreview(null);
      return;
    }
    const url = URL.createObjectURL(slipFile);
    setSlipPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [slipFile]);

  const reloadExistingPayments = async () => {
    if (!invoice?.id) return;
    try {
      const res = await InvoiceApi.getById(invoice.id);
      const data: any = (res as any)?.data || res;
      const payments = Array.isArray(data?.payments) ? data.payments : [];
      setExistingPayments(payments);
    } catch (err) {
      console.error('Failed to reload payments', err);
    }
  };

  const handleAttachSlipToPayment = async (paymentId: string, file: File) => {
    setAttachingSlipFor(paymentId);
    try {
      const uploaded = await StorageApi.upload({
        file,
        path: 'payments/slips',
        entity_type: 'invoice',
        entity_id: invoice?.id || '',
      });
      const fileId = uploaded?.id || (uploaded as any)?.url;
      if (!fileId) throw new Error('Upload failed');
      await PaymentApi.update(paymentId, { payment_proof: fileId });
      await reloadExistingPayments();
      onSuccess?.();
      Swal.fire({
        icon: 'success',
        title: 'แนบสลิปสำเร็จ',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Attach slip failed', error);
      Swal.fire({
        icon: 'error',
        title: 'แนบสลิปไม่สำเร็จ',
        text: (error as any)?.response?.data?.message || 'ไม่สามารถแนบสลิปได้',
      });
    } finally {
      setAttachingSlipFor(null);
    }
  };

  // Payment ที่ยังไม่มีสลิป (รอแนบย้อนหลัง) — เรียงล่าสุดก่อน
  const paymentMissingSlip = useMemo(() => {
    return [...existingPayments]
      .reverse()
      .find((p) => !p.payment_slip_url);
  }, [existingPayments]);

  // โหมด "แนบสลิปย้อนหลัง" — ใช้เมื่อ outstanding = 0 และมี payment เก่าที่ไม่มีสลิป
  const isAttachOnlyMode = outstanding === 0 && !!paymentMissingSlip;

  // ครบทุกอย่างแล้ว (จ่ายครบ + ทุก payment มีสลิป) — ซ่อนฟอร์มกรอกข้อมูล
  const isFullyDone = outstanding === 0 && existingPayments.length > 0 && !paymentMissingSlip;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    // โหมดแนบสลิปย้อนหลัง — ใช้ไฟล์ที่เลือกใน form อัปไปยัง payment เก่า
    if (isAttachOnlyMode) {
      if (!slipFile) {
        Swal.fire({ icon: 'warning', title: 'กรุณาเลือกไฟล์สลิป' });
        return;
      }
      await handleAttachSlipToPayment(paymentMissingSlip!.id, slipFile);
      onClose();
      return;
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกยอดชำระ', text: 'ยอดชำระต้องมากกว่า 0' });
      return;
    }
    if (numericAmount > outstanding + 0.01) {
      Swal.fire({
        icon: 'warning',
        title: 'ยอดชำระเกินยอดคงค้าง',
        text: `ยอดคงค้าง: ${outstanding.toLocaleString()} บาท`,
      });
      return;
    }

    setSubmitting(true);
    try {
      let slipUrlOrId: string | undefined;
      if (slipFile) {
        const uploaded = await StorageApi.upload({
          file: slipFile,
          path: 'payments/slips',
          entity_type: 'invoice',
          entity_id: invoice.id,
        });
        slipUrlOrId = uploaded?.id || (uploaded as any)?.url;
      }

      await PaymentApi.create({
        invoice_id: invoice.id,
        customer_id: invoice.customer_id,
        amount: numericAmount,
        payment_method: paymentMethod,
        paid_at: new Date(paidAt).toISOString(),
        payment_proof: slipUrlOrId,
        notes: notes || undefined,
        requires_review: true,
      });

      Swal.fire({
        icon: 'success',
        title: 'บันทึกการชำระเงินสำเร็จ',
        text: 'ใบแจ้งหนี้รอ admin ตรวจสอบและอนุมัติ',
        timer: 1800,
        showConfirmButton: false,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Record payment failed', error);
      Swal.fire({
        icon: 'error',
        title: 'บันทึกไม่สำเร็จ',
        text: (error as any)?.response?.data?.message || 'ไม่สามารถบันทึกการชำระเงินได้',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`บันทึกการชำระเงิน - ${invoice.code || ''}`}
      size="2xl"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </Button>
          {!isFullyDone && (
            <Button type="submit" form="record-payment-form" variant="primary" disabled={submitting || attachingSlipFor !== null}>
              {submitting || attachingSlipFor !== null
                ? 'กำลังบันทึก...'
                : isAttachOnlyMode
                  ? 'แนบสลิป'
                  : 'บันทึกการชำระ'}
            </Button>
          )}
        </div>
      }
    >
      <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-slate-600">ลูกค้า</span>
            <span className="font-medium">{invoice.customer_name}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-600">ยอดรวม</span>
            <span className="font-medium">{Number(invoice.total).toLocaleString()} บาท</span>
          </div>
          {totalPaid > 0 && (
            <div className="flex justify-between mb-1">
              <span className="text-slate-600">ยอดที่ชำระแล้ว / รอตรวจสอบ</span>
              <span className="font-medium text-emerald-700">{totalPaid.toLocaleString()} บาท</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-600">ยอดคงค้าง</span>
            <span className="font-bold text-blue-700">{outstanding.toLocaleString()} บาท</span>
          </div>
        </div>

        {(loadingPayments || existingPayments.length > 0) && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 border-b border-slate-200">
              ประวัติการชำระ ({existingPayments.length} รายการ)
            </div>
            {loadingPayments ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <LoadingIcon className="w-6 h-6 animate-spin mb-2 text-primary" />
                <p className="text-sm">กำลังโหลด...</p>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:text-xs [&>th]:font-medium [&>th]:text-slate-500 [&>th]:uppercase">
                    <th>ช่องทาง</th>
                    <th>ยอด</th>
                    <th>วันที่</th>
                    <th className="!text-center">สลิป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {existingPayments.map((p: any) => (
                    <tr key={p.id} className="[&>td]:px-3 [&>td]:py-2 [&>td]:text-slate-700">
                      <td>{PAYMENT_METHOD_LABEL[p.payment_method] || p.payment_method || '-'}</td>
                      <td className="font-medium text-emerald-700">
                        {Number(p.amount || 0).toLocaleString()} บาท
                      </td>
                      <td>{p.paid_at ? formatThaiDate(p.paid_at) : '-'}</td>
                      <td className="text-center">
                        {p.payment_slip_url ? (
                          <button
                            type="button"
                            onClick={() => setSlipPreviewUrl(resolveFileUrl(p.payment_slip_url))}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs"
                          >
                            <EyeIcon className="w-3.5 h-3.5" /> ดูสลิป
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-slate-400"
                            title="ยังไม่มีสลิป"
                          >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>ยังไม่มี</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!isFullyDone && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isAttachOnlyMode && (
              <>
                <FormField label="ยอดชำระ (บาท)" htmlFor="rp-amount">
                  <Input
                    id="rp-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="วิธีการชำระ" htmlFor="rp-method">
                  <DropdownSelect
                    value={paymentMethod}
                    onChange={(v) => setPaymentMethod(v as PaymentMethod)}
                    options={PAYMENT_METHOD_OPTIONS}
                  />
                </FormField>
                <FormField label="วันที่ชำระ" htmlFor="rp-date">
                  <Input
                    id="rp-date"
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    required
                  />
                </FormField>
              </>
            )}
            <FormField label="แนบหลักฐานการชำระ" htmlFor="rp-slip">
              <input
                id="rp-slip"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </FormField>
          </div>
        )}

        {!isFullyDone && slipPreview && (
          <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
            <p className="text-xs text-slate-500 mb-2">ตัวอย่างสลิป:</p>
            {slipFile?.type.startsWith('image/') ? (
              <img src={slipPreview} alt="slip preview" className="max-h-64 mx-auto rounded" />
            ) : (
              <p className="text-sm text-slate-600">{slipFile?.name}</p>
            )}
          </div>
        )}

        {!isFullyDone && (
          <FormField label="หมายเหตุ" htmlFor="rp-notes">
            <Textarea
              id="rp-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เลขที่อ้างอิง / ธนาคาร / รายละเอียดเพิ่มเติม"
            />
          </FormField>
        )}

      </form>

      {slipPreviewUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setSlipPreviewUrl(null)}
        >
          <img
            src={slipPreviewUrl}
            alt="payment slip"
            className="max-h-[90vh] max-w-[90vw] rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Modal>
  );
};

export default RecordPaymentModal;
