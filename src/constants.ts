import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  NewDashboardIcon,
  NewCustomerIcon,
  NewAssessmentIcon,
  NewFieldOpsIcon,
  NewAccountingIcon,
  NewWarehouseIcon,
  NewUsersIcon,
  NewReportIcon,
  PackageIcon,
  BookOpenIcon,
  BellIcon,
} from './assets/icons/Icons';
import { NavigationItem } from '@/src/types/nav';

// FIX: Add and export date formatting utility functions.
export const formatThaiDate = (isoString: string | undefined): string => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatThaiDateTime = (isoString: string | undefined): string => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return (
    date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.'
  );
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { type: 'link', name: 'Dashboard', icon: NewDashboardIcon },
  { type: 'link', name: 'ลูกค้า', icon: NewCustomerIcon },
  { type: 'link', name: 'ฟอร์ม', icon: DocumentTextIcon },
  // { type: 'link', name: 'ใบประเมิน', icon: NewAssessmentIcon },
  // { type: 'link', name: 'ภาคสนาม', icon: NewFieldOpsIcon },
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
