
import { NavigationItem } from '@/src/types/nav';
import { 
  NewDashboardIcon, 
  NewCustomerIcon, 
  DocumentTextIcon, 
  NewFieldOpsIcon,
  NewAccountingIcon, 
  CurrencyDollarIcon, 
  ShieldCheckIcon,
  NewWarehouseIcon, 
  PackageIcon, 
  BookOpenIcon, 
  NewUsersIcon, 
  NewReportIcon, 
  BellIcon 
} from '../assets/icons/Icons';


export const PAGE_PATH: Record<string, string> = {
  'Dashboard': 'dashboard',
  'ลูกค้า': 'customers',
  'ใบประเมิน': 'assessments',
  'ภาคสนาม': 'field-operations',
  'ใบเสนอราคา': 'quotations',
  'ใบแจ้งหนี้': 'billing',
  'ใบกำกับภาษี/ใบเสร็จรับเงิน': 'receipts',
  'ฟอร์ม': 'forms',
  'หมวดหมู่': 'categories',
  'สินค้า/บริการ': 'products',
  'แพ็กเกจ': 'packages',
  'คลังสินค้า': 'warehouse',
  'ผู้จัดจำหน่าย': 'suppliers',
  'รับเข้า': 'goods-receipt',
  'เบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย': 'withdrawals',
  'โอนย้าย': 'transfers',
  'ปรับปรุง Stock': 'stock-adjustment',
  'คืนสินค้า': 'returns',
  'ผู้ใช้งาน': 'users',
  'จัดการบทบาท': 'roles',
  'การแจ้งเตือน': 'notifications',
  'รายงาน': 'reports',
  'เบิกสินค้าคืนผู้จำหน่าย': 'return-to-supplier',
  'รายงานรายได้ (รายเดือน)': 'reports/total-income',
  'รายได้ออกใบกำกับ(รายเดือน)': 'reports/tax-invoice-income',
  'ค่าใช้จ่ายทางอ้อม': 'reports/indirect-expenses',
  'บัญชีเงินสดรายวัน': 'reports/daily-cash',
  'ค่าใช้จ่ายทางตรง': 'reports/direct-expenses',
  'ยอดขาย(รายเดือน)': 'reports/monthly-sales',
  'สรุปยอดขาย(รายเดือน)': 'reports/sales-summary',
};


export const NAVIGATION_ITEMS: NavigationItem[] = [
  { type: 'link', name: 'Dashboard', icon: NewDashboardIcon },
  { type: 'link', name: 'ลูกค้า', icon: NewCustomerIcon },
  { type: 'link', name: 'ใบประเมิน', icon: NewCustomerIcon },
  { type: 'link', name: 'ฟอร์ม', icon: DocumentTextIcon },
  { type: 'link', name: 'ภาคสนาม', icon: NewFieldOpsIcon },
  {
    type: 'group',
    name: 'การเงินและบัญชี',
    icon: NewAccountingIcon,
    subItems: [
      { name: 'ใบเสนอราคา', icon: DocumentTextIcon },
      { name: 'ใบแจ้งหนี้', icon: CurrencyDollarIcon },
      { name: 'ใบกำกับภาษี/ใบเสร็จรับเงิน', icon: ShieldCheckIcon },
    ],
  },
  {
    type: 'group',
    name: 'คลังสินค้า',
    icon: NewWarehouseIcon,
    subItems: [
      { name: 'คลังสินค้า', icon: NewWarehouseIcon },
      { name: 'รับเข้า', icon: NewWarehouseIcon },
      { name: 'โอนย้าย', icon: NewWarehouseIcon },
      { name: 'ปรับปรุง Stock', icon: NewWarehouseIcon },
      { name: 'เบิกสินค้าคืนผู้จำหน่าย', icon: NewWarehouseIcon },
    ],
  },
  {
    type: 'group',
    name: 'จัดการสินค้าภายใน',
    icon: NewWarehouseIcon,
    subItems: [
      { name: 'เบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย', icon: NewWarehouseIcon },
      { name: 'คืนสินค้า', icon: NewWarehouseIcon },
    ],
  },
  {
    type: 'group',
    name: 'ข้อมูลสินค้าและคู่ค้า',
    icon: PackageIcon,
    subItems: [
      { name: 'สินค้า/บริการ', icon: PackageIcon },
      { name: 'แพ็กเกจ', icon: PackageIcon },
      { name: 'หมวดหมู่', icon: BookOpenIcon },
      { name: 'ผู้จัดจำหน่าย', icon: NewUsersIcon },
    ],
  },
  {
    type: 'group',
    name: 'การตั้งค่าระบบ',
    icon: NewUsersIcon,
    subItems: [{ name: 'ผู้ใช้งาน' }, { name: 'จัดการบทบาท' }],
  },
  {
    type: 'group',
    name: 'รายงาน',
    icon: NewReportIcon,
    subItems: [
      { name: 'รายงานรายได้ (รายเดือน)' },
      { name: 'รายได้ออกใบกำกับ(รายเดือน)' },
      { name: 'ค่าใช้จ่ายทางอ้อม' },
      { name: 'บัญชีเงินสดรายวัน' },
      { name: 'ค่าใช้จ่ายทางตรง' },
      { name: 'ยอดขาย(รายเดือน)' },
      { name: 'สรุปยอดขาย(รายเดือน)' },
    ],
  },
  { type: 'link', name: 'การแจ้งเตือน', icon: BellIcon },
];

