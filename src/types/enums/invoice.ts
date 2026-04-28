export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  SENT = 'SENT',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  CARRIED_OVER = 'CARRIED_OVER',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PENDING_ACCOUNTING_REVIEW = 'PENDING_ACCOUNTING_REVIEW',
}

export const InvoiceStatusLabel: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: 'ร่าง',
  [InvoiceStatus.PENDING]: 'รอชำระ',
  [InvoiceStatus.SENT]: 'ส่งแล้ว',
  [InvoiceStatus.PAID]: 'ชำระแล้ว',
  [InvoiceStatus.PARTIAL]: 'ชำระบางส่วน',
  [InvoiceStatus.OVERDUE]: 'เกินกำหนด',
  [InvoiceStatus.CANCELLED]: 'ยกเลิก',
  [InvoiceStatus.CARRIED_OVER]: 'ยกยอด',
  [InvoiceStatus.PENDING_REVIEW]: 'รอตรวจสอบ',
  [InvoiceStatus.PENDING_ACCOUNTING_REVIEW]: 'รอบัญชีอนุมัติ',
};

export const InvoiceStatusColor: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: 'bg-slate-100 text-slate-600',
  [InvoiceStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
  [InvoiceStatus.SENT]: 'bg-indigo-100 text-indigo-700',
  [InvoiceStatus.PAID]: 'bg-green-100 text-green-700',
  [InvoiceStatus.PARTIAL]: 'bg-amber-100 text-amber-700',
  [InvoiceStatus.OVERDUE]: 'bg-rose-100 text-rose-700',
  [InvoiceStatus.CANCELLED]: 'bg-red-100 text-red-700',
  [InvoiceStatus.CARRIED_OVER]: 'bg-zinc-100 text-zinc-600',
  [InvoiceStatus.PENDING_REVIEW]: 'bg-purple-100 text-purple-700',
  [InvoiceStatus.PENDING_ACCOUNTING_REVIEW]: 'bg-orange-100 text-orange-700',
};
