
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
import { Role } from '../types/enums/role';


export const PAGE_PATH: Record<string, string> = {
  'Dashboard': 'dashboard',
  'ลูกค้า': 'customers',
  'ใบประเมิน': 'assessments',
  'ภาคสนาม': 'field-operations',
  'ใบเสนอราคา': 'quotations',
  'ใบสัญญา': 'contracts',
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
  'ใบเบิกสินค้า': 'requisitions',
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
  {
    type: 'link',
    name: 'Dashboard',
    icon: NewDashboardIcon,
    roles: [Role.SUPERADMIN, Role.ADMIN, Role.CEO, Role.COO, Role.CFO]
  },
  {
    type: 'link',
    name: 'ลูกค้า',
    icon: NewCustomerIcon,
    roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO]
  },
  {
    type: 'link',
    name: 'ใบประเมิน',
    icon: NewCustomerIcon,
    roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO]
  },
  {
    type: 'link',
    name: 'ฟอร์ม',
    icon: DocumentTextIcon,
    roles: [Role.SUPERADMIN, Role.ADMIN, Role.CEO, Role.COO, Role.CFO]
  },
  {
    type: 'link',
    name: 'ภาคสนาม',
    icon: NewFieldOpsIcon,
    roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO, Role.LEAD_TECH, Role.TECH]
  },
  {
    type: 'group',
    name: 'การเงินและบัญชี',
    icon: NewAccountingIcon,
    subItems: [
      {
        name: 'ใบเสนอราคา',
        icon: DocumentTextIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.CFO, Role.COO, Role.LEAD_TECH, Role.TECH]
      },
      {
        name: 'ใบสัญญา',
        icon: DocumentTextIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.CFO, Role.COO]
      },
      {
        name: 'ใบแจ้งหนี้',
        icon: CurrencyDollarIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.CFO]
      },
      {
        name: 'ใบกำกับภาษี/ใบเสร็จรับเงิน',
        icon: ShieldCheckIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.CFO]
      },
    ],
  },
  {
    type: 'group',
    name: 'คลังสินค้า',
    icon: NewWarehouseIcon,
    subItems: [
      {
        name: 'คลังสินค้า',
        icon: NewWarehouseIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO]
      },
      {
        name: 'รับเข้า',
        icon: NewWarehouseIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO]
      },
      {
        name: 'โอนย้าย',
        icon: NewWarehouseIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO]
      },
      {
        name: 'ปรับปรุง Stock',
        icon: NewWarehouseIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO]
      },
      {
        name: 'เบิกสินค้าคืนผู้จำหน่าย',
        icon: NewWarehouseIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO]
      },
    ],
  },
  {
    type: 'group',
    name: 'จัดการสินค้าภายใน',
    icon: NewWarehouseIcon,
    subItems: [
      {
        name: 'เบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย',
        icon: NewWarehouseIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO, Role.LEAD_TECH, Role.TECH]
      },
      {
        name: 'ใบเบิกสินค้า',
        icon: DocumentTextIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO, Role.CFO, Role.LEAD_TECH, Role.TECH]
      },
      {
        name: 'คืนสินค้า',
        icon: NewWarehouseIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO, Role.LEAD_TECH, Role.TECH]
      },
    ],
  },
  {
    type: 'group',
    name: 'ข้อมูลสินค้าและคู่ค้า',
    icon: PackageIcon,
    subItems: [
      {
        name: 'สินค้า/บริการ',
        icon: PackageIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN]
      },
      {
        name: 'แพ็กเกจ',
        icon: PackageIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN]
      },
      {
        name: 'หมวดหมู่',
        icon: BookOpenIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN]
      },
      {
        name: 'ผู้จัดจำหน่าย',
        icon: NewUsersIcon,
        roles: [Role.SUPERADMIN, Role.ADMIN, Role.COO]
      },
    ],
  },
  {
    type: 'group',
    name: 'การตั้งค่าระบบ',
    icon: NewUsersIcon,
    subItems: [
      {
        name: 'ผู้ใช้งาน',
        roles: [Role.SUPERADMIN, Role.ADMIN]
      },
      {
        name: 'จัดการบทบาท',
        roles: [Role.SUPERADMIN, Role.ADMIN]
      }
    ],
  },
  {
    type: 'group',
    name: 'รายงาน',
    icon: NewReportIcon,
    subItems: [
      {
        name: 'รายงานรายได้ (รายเดือน)',
        roles: [Role.SUPERADMIN, Role.CEO, Role.CFO]
      },
      {
        name: 'รายได้ออกใบกำกับ(รายเดือน)',
        roles: [Role.SUPERADMIN, Role.CEO, Role.CFO]
      },
      {
        name: 'ค่าใช้จ่ายทางอ้อม',
        roles: [Role.SUPERADMIN, Role.CEO, Role.CFO]
      },
      {
        name: 'บัญชีเงินสดรายวัน',
        roles: [Role.SUPERADMIN, Role.CEO, Role.CFO]
      },
      {
        name: 'ค่าใช้จ่ายทางตรง',
        roles: [Role.SUPERADMIN, Role.CEO, Role.CFO]
      },
      {
        name: 'ยอดขาย(รายเดือน)',
        roles: [Role.SUPERADMIN, Role.CEO, Role.CFO, Role.COO]
      },
      {
        name: 'สรุปยอดขาย(รายเดือน)',
        roles: [Role.SUPERADMIN, Role.CEO, Role.CFO, Role.COO]
      },
    ],
  },
  {
    type: 'link',
    name: 'การแจ้งเตือน',
    icon: BellIcon,
    roles: [Role.SUPERADMIN, Role.ADMIN, Role.CEO, Role.COO, Role.CFO]
  },
];
