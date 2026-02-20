
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
  BellIcon,
  BuildingOfficeIcon
} from '../assets/icons/Icons';
import { Role } from '../types/enums/role';


export const PAGE_PATH: Record<string, string> = {
  'Dashboard': 'dashboard',
  'ลูกค้า': 'customers',
  'ใบประเมิน': 'assessments',
  'ภาคสนาม': 'field-operations',
  'ใบเสนอราคา': 'quotations',
  'ใบสัญญา': 'contracts',
  'ใบแจ้งหนี้': 'invoice',
  'ใบกำกับภาษี/ใบเสร็จรับเงิน': 'receipts',
  'ฟอร์ม': 'forms',
  'หมวดหมู่': 'categories',
  'สินค้า/บริการ': 'products',
  'แพ็กเกจ': 'packages',
  'คลังสินค้า': 'warehouse',
  'ผู้จัดจำหน่าย': 'suppliers',
  'รับเข้า': 'goods-receipt',
  'สรุปการเบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย': 'withdrawals',
  'โอนย้าย': 'transfers',
  'ใบเบิกสินค้า': 'requisitions',
  'ปรับปรุง Stock': 'stock-adjustment',
  'คืนสินค้า': 'returns',
  'เบิกสินค้าเข้าคลังย่อย': 'withdraw-vehicle',
  'ผู้ใช้งาน': 'users',
  'จัดการบทบาท': 'roles',
  'การแจ้งเตือนและนัดหมาย': 'notifications',
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
    access: 'ACCESS_DASHBOARD',
  },
  {
    type: 'link',
    name: 'การแจ้งเตือนและนัดหมาย',
    icon: BellIcon,
    roles: [Role.SUPERADMIN, Role.ADMIN, Role.CEO, Role.COO, Role.CFO]
  },
  {
    type: 'link',
    name: 'ลูกค้า',
    icon: NewCustomerIcon,
    access: 'ACCESS_CUSTOMER',
  },
  {
    type: 'link',
    name: 'ใบประเมิน',
    icon: DocumentTextIcon,
    access: 'ACCESS_ASSESSMENT',
  },
  {
    type: 'link',
    name: 'ภาคสนาม',
    icon: NewFieldOpsIcon,
    access: 'ACCESS_OPERATION',
  },
  {
    type: 'group',
    name: 'การเงินและบัญชี',
    icon: NewAccountingIcon,
    subItems: [
      {
        name: 'ใบเสนอราคา',
        icon: DocumentTextIcon,
        access: 'ACCESS_QUOTATION',
      },
      {
        name: 'ใบสัญญา',
        icon: DocumentTextIcon,
        access: 'ACCESS_CONTRACT',
      },
      {
        name: 'ใบแจ้งหนี้',
        icon: CurrencyDollarIcon,
        access: 'ACCESS_INVOICE',
      },
      {
        name: 'ใบกำกับภาษี/ใบเสร็จรับเงิน',
        icon: ShieldCheckIcon,
        access: 'ACCESS_RECEIPT',
      },
    ],
  },
  {
    type: 'group',
    name: 'คลังสินค้า',
    icon: BuildingOfficeIcon,
    subItems: [
      {
        name: 'คลังสินค้า',
        icon: BuildingOfficeIcon,
        access: 'ACCESS_WAREHOUSE',
      },
      {
        name: 'รับเข้า',
        icon: NewWarehouseIcon,
        access: 'ACCESS_RECEIVE_NOTE',
      },
      {
        name: 'โอนย้าย',
        icon: NewWarehouseIcon,
        access: 'ACCESS_TRANSFER_NOTE',
      },
      {
        name: 'ปรับปรุง Stock',
        icon: NewWarehouseIcon,
        access: 'ACCESS_ADJUSTMENT_NOTE',
      },
      {
        name: 'เบิกสินค้าคืนผู้จำหน่าย',
        icon: NewWarehouseIcon,
        access: 'ACCESS_RETURN_NOTE',
      },
    ],
  },
  {
    type: 'group',
    name: 'จัดการสินค้าภายใน',
    icon: NewWarehouseIcon,
    subItems: [
      {
        name: 'เบิกสินค้าเข้าคลังย่อย',
        icon: NewWarehouseIcon,
        access: 'ACCESS_WITHDRAW_NOTE',
      },
      {
        name: 'สรุปการเบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย',
        icon: DocumentTextIcon,
        access: 'ACCESS_SUMMARY_WITHDRAW',
      },
      {
        name: 'คืนสินค้า',
        icon: NewWarehouseIcon,
        access: 'ACCESS_RETURN_NOTE',
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
        access: 'ACCESS_PRODUCT',
      },
      {
        name: 'แพ็กเกจ',
        icon: PackageIcon,
        access: 'ACCESS_PACKAGES',
      },
      {
        name: 'หมวดหมู่',
        icon: BookOpenIcon,
        access: 'ACCESS_CATEGORY',
      },
      {
        name: 'ผู้จัดจำหน่าย',
        icon: NewUsersIcon,
        access: 'ACCESS_SUPPLIER',
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
        access: 'ACCESS_USER',
      },
      {
        name: 'จัดการบทบาท',
        access: 'ACCESS_ROLE',
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
        access: 'ACCESS_REPORT_ANALYSIS',
      },
      {
        name: 'รายได้ออกใบกำกับ(รายเดือน)',
        access: 'ACCESS_REPORT_ANALYSIS',
      },
      {
        name: 'ค่าใช้จ่ายทางอ้อม',
        access: 'ACCESS_REPORT_ANALYSIS',
      },
      {
        name: 'บัญชีเงินสดรายวัน',
        access: 'ACCESS_REPORT_ANALYSIS',
      },
      {
        name: 'ค่าใช้จ่ายทางตรง',
        access: 'ACCESS_REPORT_ANALYSIS',
      },
      {
        name: 'ยอดขาย(รายเดือน)',
        access: 'ACCESS_REPORT_ANALYSIS',
      },
      {
        name: 'สรุปยอดขาย(รายเดือน)',
        access: 'ACCESS_REPORT_ANALYSIS',
      },
    ],
  },
];
