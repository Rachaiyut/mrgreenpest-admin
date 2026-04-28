export const PERMISSION_ACTIONS = [
  { label: 'เข้าใช้งาน', action: 'ACCESS' },
  { label: 'ดู', action: 'READ' },
  { label: 'สร้าง', action: 'CREATE' },
  { label: 'แก้ไข', action: 'UPDATE' },
  { label: 'ยกเลิก', action: 'CANCEL' },
  { label: 'ลบ', action: 'DELETE' },
  { label: 'อนุมัติ', action: 'APPROVE' },
  { label: 'แจ้งเตือน', action: 'NOTIFY' },
];

export interface PermissionRow {
  label: string;
  module: string; // Maps to suffix in permission name (e.g. 'SALES' -> READ_SALES)
  // Actions ที่ไม่ต้องการให้แสดง checkbox (จะเป็นเทากดไม่ได้) — ใช้กรณี parent row ที่อยากปิด action บางตัว
  // เช่น ISSUE_SUMMARY row ปิด APPROVE เพราะย้ายไปใช้ sub-row 2 หมวดแทน
  skipActions?: string[];
}

export interface PermissionGroup {
  groupName: string;
  items: PermissionRow[];
}

export const PERMISSION_MATRIX: PermissionGroup[] = [
  {
    groupName: 'ภาพรวมและลูกค้า',
    items: [
      { label: 'Dashboard', module: 'DASHBOARD' },
      { label: 'การแจ้งเตือนและนัดหมาย', module: 'NOTIFICATION' },
      { label: 'ลูกค้า', module: 'CUSTOMER' },
      { label: 'สัญญา', module: 'CONTRACT' },
      { label: 'การต่ออายุสัญญา', module: 'CONTRACT' },
    ],
  },
  {
    groupName: 'ภาคสนาม',
    items: [
      { label: 'ใบประเมิน', module: 'ASSESSMENT' },
      { label: 'ภาคสนาม', module: 'OPERATION' },
      { label: 'รายงานบริการ', module: 'SERVICE_REPORT' },
      { label: 'ยานพาหนะ', module: 'VEHICLE' },
      { label: 'สรุปงานรายวัน', module: 'DAILY_CLOSURE' },
    ],
  },
  {
    groupName: 'แผนการเข้าปฏิบัติงาน',
    items: [
      { label: 'ตารางปฏิบัติงาน', module: 'SERVICE_SCHEDULE' },
      { label: 'รายละเอียดขั้นตอนบริการ', module: 'SERVICE_PROCEDURE_TEMPLATE' },
    ],
  },
  {
    groupName: 'กลุ่มเอกสารการจัดซื้อและบัญชี',
    items: [
      { label: 'ใบเสนอราคา', module: 'QUOTATION' },
      { label: 'ใบแจ้งหนี้/ใบวางบิล', module: 'INVOICE' },
      { label: 'ใบกำกับภาษี/ใบเสร็จรับเงิน', module: 'RECEIPT' },
    ],
  },
  {
    groupName: 'ระบบเงินสดภายใน',
    items: [
      { label: 'บัญชี', module: 'ACCOUNT' },
    ],
  },
  {
    groupName: 'กลุ่ม คลังสินค้า',
    items: [
      { label: 'หมวดหมู่', module: 'CATEGORY' },
      { label: 'แพ็กเกจ', module: 'PACKAGES' },
      { label: 'สินค้า/บริการ', module: 'PRODUCT' },
      { label: 'คลังสินค้า', module: 'WAREHOUSE' },
      { label: 'ผู้จัดจำหน่าย', module: 'SUPPLIER' },
      { label: 'หน่วยนับ', module: 'UNIT' },
      { label: 'รับสินค้าเข้า', module: 'RECEIVE_NOTE' },
      {
        label: 'เบิกสินค้าเข้าคลังย่อย',
        module: 'ISSUE_NOTE',
        // ปิด APPROVE + NOTIFY ที่ parent row — ย้ายไปอยู่ใน sub-row 2 หมวดแทน (STOCK + EXPENSE)
        skipActions: ['APPROVE', 'NOTIFY'],
      },
      {
        // Sub-row STOCK — มีเฉพาะ permission APPROVE_STOCK_ISSUE_NOTE / NOTIFY_STOCK_ISSUE_NOTE
        label: '└ อนุมัติเบิกสินค้า/สารเคมีเกินลิมิต',
        module: 'STOCK_ISSUE_NOTE',
      },
      {
        // Sub-row EXPENSE — มีเฉพาะ permission APPROVE_EXPENSE_ISSUE_NOTE / NOTIFY_EXPENSE_ISSUE_NOTE
        label: '└ อนุมัติค่าใช้จ่ายเกินลิมิต',
        module: 'EXPENSE_ISSUE_NOTE',
      },
      {
        label: 'สรุปการเบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย',
        module: 'ISSUE_SUMMARY',
        // ปิด APPROVE + NOTIFY ที่ parent row — ย้ายไปอยู่ใน sub-row 2 หมวดแทน (STOCK + EXPENSE)
        skipActions: ['APPROVE', 'NOTIFY'],
      },
      {
        // Sub-row STOCK — มีเฉพาะ permission APPROVE_STOCK_ISSUE_SUMMARY
        label: '└ อนุมัติเบิกสินค้า/สารเคมีเกินลิมิต',
        module: 'STOCK_ISSUE_SUMMARY',
      },
      {
        // Sub-row EXPENSE — มีเฉพาะ permission APPROVE_EXPENSE_ISSUE_SUMMARY (SUPERADMIN เท่านั้น)
        label: '└ อนุมัติค่าใช้จ่ายเกินลิมิต',
        module: 'EXPENSE_ISSUE_SUMMARY',
      },
      { label: 'โอนย้าย', module: 'TRANSFER_NOTE' },
      { label: 'ปรับปรุงสต็อก', module: 'ADJUSTMENT_NOTE' },
      { label: 'คืนสินค้า', module: 'RETURN_NOTE' },
      { label: 'จำกัดการเบิก', module: 'WAREHOUSE' },
    ],
  },
  {
    groupName: 'ตั้งค่าระบบ',
    items: [
      { label: 'ผู้ใช้งาน', module: 'USER' },
      { label: 'จัดการบทบาท', module: 'ROLE' },
      { label: 'รายงาน', module: 'REPORT_MASTER' },
    ],
  },
];
