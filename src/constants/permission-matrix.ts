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
            { label: 'Dashboard', module: 'REPORT_ANALYSIS' },
            { label: 'ลูกค้า', module: 'MASTER_DATA' }, 
            { label: 'สัญญา', module: 'SALES' },
            { label: 'การต่ออายุสัญญา', module: 'SALES' },
        ],
    },
    {
        groupName: 'ภาคสนาม',
        items: [
            { label: 'ใบประเมิน', module: 'OPERATION' },
            { label: 'ภาคสนาม', module: 'OPERATION' },
            { label: 'รายงานบริการ', module: 'REPORT_OPERATION' },
            { label: 'ยานพาหนะ', module: 'VEHICLE' },
        ],
    },
    {
        groupName: 'กลุ่มเอกสารการจัดซื้อและบัญชี',
        items: [
            { label: 'ใบเสนอราคา', module: 'SALES' },
            { label: 'ใบแจ้งหนี้/ใบวางบิล', module: 'FINANCIAL' },
            { label: 'ใบกำกับภาษี/ใบเสร็จรับเงิน', module: 'FINANCIAL' },
        ],
    },
    {
        groupName: 'กลุ่ม คลังสินค้า',
        items: [
            { label: 'แพ็กเกจ', module: 'INVENTORY' },
            { label: 'สินค้า/บริการ', module: 'INVENTORY' },
            { label: 'คลังสินค้า', module: 'WAREHOUSE' },
            { label: 'ผู้จัดจำหน่าย', module: 'PURCHASING' },
            { label: 'รับเข้า', module: 'PURCHASING' },
            { label: 'สรุปการเบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย', module: 'WAREHOUSE' },
            { label: 'โอนย้าย', module: 'WAREHOUSE' },
            { label: 'ปรับปรุง Stock', module: 'INVENTORY' },
            { label: 'คืนสินค้า', module: 'INVENTORY' },
            { label: 'จำกัดการเบิก', module: 'SETTINGS' },
        ],
    },
    {
        groupName: 'ตั้งค่าระบบ',
        items: [
            { label: 'ผู้ใช้งาน', module: 'SETTINGS' },
            { label: 'จัดการบทบาท', module: 'SETTINGS' },
            { label: 'รายงาน', module: 'REPORT_MASTER' }
        ]
    }
];
