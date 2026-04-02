import React from 'react';

interface StatusBadgeProps {
  status: string;
}

// Standard status config: label ภาษาไทย + สี
// ใช้ backend status (UPPERCASE) เป็น key ตรงๆ
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  // ===== สถานะทั่วไป =====
  DRAFT:              { label: 'ฉบับร่าง',           color: 'bg-slate-100 text-slate-600' },
  PENDING:            { label: 'รอดำเนินการ',       color: 'bg-yellow-100 text-yellow-700' },
  PENDING_APPROVAL:   { label: 'รออนุมัติ',         color: 'bg-orange-100 text-orange-700' },
  PENDING_SIGNATURE:  { label: 'รอเซ็น',           color: 'bg-amber-100 text-amber-700' },
  APPROVED:           { label: 'อนุมัติ',           color: 'bg-emerald-100 text-emerald-700' },
  SIGNED:             { label: 'เซ็นแล้ว',          color: 'bg-green-100 text-green-700' },
  IN_PROGRESS:        { label: 'ระหว่างดำเนินการ',   color: 'bg-blue-100 text-blue-700' },
  COMPLETED:          { label: 'เสร็จสิ้น',         color: 'bg-green-100 text-green-700' },
  COMPLETE:           { label: 'เสร็จสิ้น',         color: 'bg-green-100 text-green-700' },
  CANCELLED:          { label: 'ยกเลิก',           color: 'bg-red-100 text-red-700' },
  REJECTED:           { label: 'ปฏิเสธ',           color: 'bg-red-100 text-red-700' },
  EXPIRED:            { label: 'หมดอายุ',           color: 'bg-zinc-100 text-zinc-600' },
  REVISED:            { label: 'ปรับปรุง',          color: 'bg-pink-100 text-pink-700' },
  RENEWED:            { label: 'ต่อสัญญา',         color: 'bg-indigo-100 text-indigo-700' },

  // ===== ใบเสนอราคา =====
  FOLLOW_UP:          { label: 'ติดตาม',           color: 'bg-purple-100 text-purple-700' },

  // ===== สัญญา =====
  ACTIVE:             { label: 'กำลังดำเนินการ',    color: 'bg-green-100 text-green-700' },

  // ===== ใบแจ้งหนี้ =====
  SENT:               { label: 'ส่งแล้ว',           color: 'bg-indigo-100 text-indigo-700' },
  PAID:               { label: 'ชำระแล้ว',          color: 'bg-green-100 text-green-700' },
  PARTIAL:            { label: 'ชำระบางส่วน',       color: 'bg-amber-100 text-amber-700' },
  OVERDUE:            { label: 'เกินกำหนด',         color: 'bg-rose-100 text-rose-700' },
  CARRIED_OVER:       { label: 'ทบยอดแล้ว',        color: 'bg-zinc-100 text-zinc-600' },
  PENDING_REVIEW:     { label: 'รอตรวจสอบ',        color: 'bg-purple-100 text-purple-700' },

  // ===== ใบเสร็จ =====
  ISSUED:             { label: 'ออกแล้ว',           color: 'bg-green-100 text-green-700' },
  VOIDED:             { label: 'ยกเลิก (Void)',     color: 'bg-red-100 text-red-700' },

  // ===== ใบประเมิน =====
  APPOINTMENT:        { label: 'นัดหมายแล้ว',       color: 'bg-blue-100 text-blue-700' },

  // ===== ภาคสนาม =====
  UNASSIGNED:         { label: 'รอจัดคิว',          color: 'bg-amber-100 text-amber-700' },
  PLANNED:            { label: 'วางแผนแล้ว',        color: 'bg-sky-100 text-sky-700' },
  SCHEDULED:          { label: 'นัดหมายแล้ว',       color: 'bg-blue-100 text-blue-700' },

  // ===== คลังสินค้า =====
  IN_TRANSIT:         { label: 'กำลังขนส่ง',        color: 'bg-blue-100 text-blue-700' },
  RECEIVED:           { label: 'รับเข้าแล้ว',       color: 'bg-green-100 text-green-700' },

  // ===== ทั่วไป =====
  INACTIVE:           { label: 'ไม่ใช้งาน',         color: 'bg-red-100 text-red-700' },
  VERIFIED:           { label: 'ตรวจสอบแล้ว',       color: 'bg-teal-100 text-teal-700' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const key = String(status || '').trim().toUpperCase().replace(/\s+/g, '_');
  const config = STATUS_CONFIG[key];

  const label = config?.label || status || '-';
  const color = config?.color || 'bg-slate-100 text-slate-600';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
};
