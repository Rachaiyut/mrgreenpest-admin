// Enum
import { Role } from '../enum/role.enum';

// Type
import { NavigationItem } from '../type/nav';

// ICon
import {
  NewDashboardIcon,
  NewCustomerIcon,
  NewAccountingIcon,
  NewWarehouseIcon,
  PackageIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  NewReportIcon,
  NewUsersIcon,
  BellIcon,
  BookOpenIcon,
} from '../../../assets/icons/Icons';

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { type: 'link', name: 'Dashboard', icon: NewDashboardIcon },
  {
    type: 'link',
    name: 'ลูกค้า',
    icon: NewCustomerIcon,
    roles: [Role.CEO, Role.SUPERADMIN, Role.ADMIN],
  },
  {
    type: 'group',
    name: 'การเงินและบัญชี',
    icon: NewAccountingIcon,
    roles: [Role.CEO, Role.CFO],
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
    roles: [Role.CEO, Role.COO, Role.SUPERADMIN, Role.ADMIN],
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
    roles: [Role.CEO, Role.COO, Role.SUPERADMIN, Role.ADMIN],
    subItems: [
      { name: 'เบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย', icon: NewWarehouseIcon },
      { name: 'คืนสินค้า', icon: NewWarehouseIcon },
    ],
  },
  {
    type: 'group',
    name: 'ข้อมูลสินค้าและคู่ค้า',
    icon: PackageIcon,
    roles: [Role.CEO, Role.COO, Role.CFO, Role.SUPERADMIN, Role.ADMIN],
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
    roles: [Role.CEO, Role.COO, Role.CFO, Role.SUPERADMIN, Role.ADMIN],
    subItems: [{ name: 'ผู้ใช้งาน' }, { name: 'จัดการบทบาท' }],
  },
  {
    type: 'group',
    name: 'รายงาน',
    icon: NewReportIcon,
    roles: [Role.CEO, Role.COO, Role.CFO, Role.SUPERADMIN, Role.ADMIN],
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
