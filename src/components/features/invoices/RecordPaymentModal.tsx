import React, { useEffect, useMemo, useState } from 'react';
import Swal from '@/src/utils/swal';
import { Modal } from '../../common/Modal';
import { Button, FormField, Input, Textarea } from '../../common/FormControls';
import { DropdownSelect } from '../../common/DropdownSelect';
import { Invoice } from '@/src/types/entity/financial.interface';
import { PaymentMethod } from '@/src/types/enums/financial';
import { PaymentApi } from '@/src/api/payment';
import { StorageApi } from '@/src/api/storage';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess?: () => void;
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.TRANSFER, label: 'โอนผ่านธนาคาร' },
  { value: PaymentMethod.CASH, label: 'เงินสด' },
  { value: PaymentMethod.QR_PAYMENT, label: 'QR / พร้อมเพย์' },
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

  const outstanding = useMemo(() => {
    if (!invoice) return 0;
    const total = Number(invoice.total || 0);
    const paid = Number((invoice as any).paid_amount || 0);
    return Number(Math.max(total - paid, 0).toFixed(2));
  }, [invoice]);

  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
  const [paidAt, setPaidAt] = useState<string>(today);
  const [notes, setNotes] = useState<string>('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

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
          <Button type="submit" form="record-payment-form" variant="primary" disabled={submitting}>
            {submitting ? 'กำลังบันทึก...' : 'บันทึกการชำระ'}
          </Button>
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
          <div className="flex justify-between">
            <span className="text-slate-600">ยอดคงค้าง</span>
            <span className="font-bold text-blue-700">{outstanding.toLocaleString()} บาท</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <FormField label="แนบหลักฐานการชำระ (สลิป)" htmlFor="rp-slip">
            <input
              id="rp-slip"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </FormField>
        </div>

        {slipPreview && (
          <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
            <p className="text-xs text-slate-500 mb-2">ตัวอย่างสลิป:</p>
            {slipFile?.type.startsWith('image/') ? (
              <img src={slipPreview} alt="slip preview" className="max-h-64 mx-auto rounded" />
            ) : (
              <p className="text-sm text-slate-600">{slipFile?.name}</p>
            )}
          </div>
        )}

        <FormField label="หมายเหตุ" htmlFor="rp-notes">
          <Textarea
            id="rp-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="เลขที่อ้างอิง / ธนาคาร / รายละเอียดเพิ่มเติม"
          />
        </FormField>

        <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded p-3">
          ⚠️ เมื่อบันทึก ระบบจะเปลี่ยนสถานะใบแจ้งหนี้เป็น <b>"รอตรวจสอบ"</b> เพื่อให้ admin
          เลือกบัญชีรับเงินและออกใบเสร็จต่อไป
        </div>
      </form>
    </Modal>
  );
};

export default RecordPaymentModal;
