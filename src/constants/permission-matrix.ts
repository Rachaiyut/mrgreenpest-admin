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
    groupName: 'ภาพรวมและการแจ้งเตือนนัดหมาย',
    items: [
      { label: 'แดชบอร์ด', module: 'DASHBOARD', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'การแจ้งเตือนและนัดหมาย', module: 'NOTIFICATION', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'สรุปงานรายวัน', module: 'DAILY_CLOSURE', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
    ],
  },
  {
    groupName: 'ลูกค้าและสัญญา',
    items: [
      { label: 'ลูกค้า', module: 'CUSTOMER', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'สัญญา', module: 'CONTRACT', skipActions: ['DELETE', 'APPROVE'] },
      { label: 'การต่ออายุสัญญา', module: 'CONTRACT', skipActions: ['DELETE', 'APPROVE'] },
    ],
  },
  {
    groupName: 'การปฏิบัติงานและภาคสนาม',
    items: [
      { label: 'ใบประเมิน', module: 'ASSESSMENT' },
      { label: 'ภาคสนาม', module: 'OPERATION' },
      { label: 'รายงานบริการ', module: 'SERVICE_REPORT', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'ยานพาหนะ', module: 'VEHICLE', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
    ],
  },
  {
    groupName: 'เอกสารการขายและการเงิน',
    items: [
      { label: 'ใบเสนอราคา', module: 'QUOTATION', skipActions: ['DELETE'] },
      { label: 'ใบสัญญา', module: 'CONTRACT', skipActions: ['DELETE', 'NOTIFY'] },
      { label: 'ใบแจ้งหนี้', module: 'INVOICE', skipActions: ['DELETE', 'NOTIFY'] },
      { label: 'ใบกำกับภาษี / ใบเสร็จรับเงิน', module: 'RECEIPT', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
    ],
  },
  {
    groupName: 'แผนการเข้าปฏิบัติงาน',
    items: [
      { label: 'ตารางปฏิบัติงาน', module: 'SERVICE_SCHEDULE', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'รายละเอียดขั้นตอนบริการ', module: 'SERVICE_PROCEDURE_TEMPLATE', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'ตัวอย่าง Catalog สารเคมี', module: 'CHEMICAL_CATALOG', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
    ],
  },
  {
    groupName: 'ระบบเงินสดภายใน',
    items: [
      { label: 'บัญชี', module: 'ACCOUNT', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'รายรับรายจ่าย', module: 'ACCOUNT_TRANSACTION', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'ใบขอเบิกเงิน', module: 'CASH_WITHDRAWAL_REQUEST', skipActions: ['DELETE'] },
    ],
  },
  {
    groupName: 'คลังสินค้า',
    items: [
      { label: 'คลังสินค้า', module: 'WAREHOUSE', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'จำกัดการเบิก', module: 'WAREHOUSE', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'รับสินค้าเข้า', module: 'RECEIVE_NOTE', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'โอนย้ายสินค้า', module: 'TRANSFER_NOTE', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'ปรับปรุงสต็อก', module: 'ADJUSTMENT_NOTE', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
    ],
  },
  {
    groupName: 'จัดการสินค้าภายใน',
    items: [
      {
        label: 'เบิกเงิน สินค้า/สารเคมี',
        module: 'ISSUE_NOTE',
        // ปิด APPROVE + NOTIFY ที่ parent row — ย้ายไปอยู่ใน sub-row 2 หมวดแทน (STOCK + EXPENSE)
        skipActions: ['DELETE', 'APPROVE', 'NOTIFY'],
      },
      { label: '- อนุมัติเบิกสินค้า/สารเคมีเกินลิมิต', module: 'STOCK_ISSUE_NOTE' },
      { label: '- อนุมัติค่าใช้จ่ายเกินลิมิต', module: 'EXPENSE_ISSUE_NOTE' },
      { label: 'สรุปการเบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย', module: 'ISSUE_SUMMARY' },
      {
        label: '- อนุมัติเบิกสินค้า/สารเคมีเกินลิมิต',
        module: 'STOCK_ISSUE_SUMMARY',
        skipActions: ['CREATE', 'UPDATE', 'CANCEL'],
      },
      {
        label: '- อนุมัติค่าใช้จ่ายเกินลิมิตเปลี่ยน ',
        module: 'EXPENSE_ISSUE_SUMMARY',
        skipActions: ['CREATE', 'UPDATE', 'CANCEL'],
      },
      { label: 'คืนสินค้า', module: 'RETURN_NOTE', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      // ซ่อนจาก role matrix — เมนู "เบิกสินค้าคืนผู้จำหน่าย" ถูก hide จาก sidebar แล้ว
      // { label: 'เบิกสินค้าคืนผู้จำหน่าย', module: 'RETURN_NOTE', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
    ],
  },
  {
    groupName: 'แพ็กเกจ และ สินค้า/บริการ',
    items: [
      { label: 'แพ็กเกจ', module: 'PACKAGES', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'หมวดหมู่สินค้า', module: 'CATEGORY', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'หน่วยนับ', module: 'UNIT', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'สินค้า/บริการ', module: 'PRODUCT', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'ผู้จัดจำหน่าย', module: 'SUPPLIER', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
    ],
  },
  {
    groupName: 'รายงาน',
    items: [
      { label: 'รายงานการขาย', module: 'REPORT_SALES', skipActions: ['CREATE', 'UPDATE', 'CANCEL', 'DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'รายงานวิเคราะห์', module: 'REPORT_ANALYSIS', skipActions: ['CREATE', 'UPDATE', 'CANCEL', 'DELETE', 'APPROVE', 'NOTIFY'] },
    ],
  },
  {
    groupName: 'ตั้งค่าบทบาทและผู้ใช้งาน',
    items: [
      { label: 'จัดการบทบาท', module: 'ROLE', skipActions: ['DELETE', 'APPROVE', 'NOTIFY'] },
      { label: 'จัดการผู้ใช้งาน', module: 'USER', skipActions: ['APPROVE', 'NOTIFY'] },
    ],
  },
];
