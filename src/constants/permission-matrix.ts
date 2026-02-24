export const PERMISSION_ACTIONS = [
  { label: 'เข้าใช้งาน', action: 'ACCESS' },
  { label: 'ดู', action: 'READ' },
  { label: 'สร้าง', action: 'CREATE' },
  { label: 'แก้ไข', action: 'UPDATE' },
  { label: 'ลบ', action: 'DELETE' },
  { label: 'อนุมัติ', action: 'APPROVE' },
];

export interface PermissionRow {
  label: string;
  module: string; // Maps to suffix in permission name (e.g. 'SALES' -> READ_SALES)
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
    groupName: 'กลุ่ม คลังสินค้า',
    items: [
      { label: 'หมวดหมู่', module: 'CATEGORY' },
      { label: 'แพ็กเกจ', module: 'PACKAGES' },
      { label: 'สินค้า/บริการ', module: 'PRODUCT' },
      { label: 'คลังสินค้า', module: 'WAREHOUSE' },
      { label: 'ผู้จัดจำหน่าย', module: 'SUPPLIER' },
      { label: 'รับเข้า', module: 'RECEIVE_NOTE' },
      { label: 'เบิกสินค้าเข้าคลังย่อย', module: 'WITHDRAW_NOTE' },
      {
        label: 'สรุปการเบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย',
        module: 'SUMMARY_WITHDRAW',
      },
      { label: 'โอนย้าย', module: 'TRANSFER_NOTE' },
      { label: 'ปรับปรุง Stock', module: 'ADJUSTMENT_NOTE' },
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
