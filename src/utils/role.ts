export const roleNameMapping: Record<string, string> = {
  SUPERADMIN: 'หัวหน้าผู้ดูแลระบบ (หัวหน้า Admin)',
  ADMIN: 'ผู้ดูแลระบบ (Admin)',
  COO: 'ประธานเจ้าหน้าที่ฝ่ายปฏิบัติการ (COO)',
  CFO: 'ประธานเจ้าหน้าที่ฝ่ายการเงิน (CFO)',
  CEO: 'ผู้บริหาร (CEO)',
  SALE: 'ฝ่ายขาย',
  CS: 'ฝ่ายบริการลูกค้า (CS)',
  TECH: 'ลูกทีมปฏิบัติงาน (ช่าง)',
  LEAD_TECH: 'หัวหน้าทีมช่าง',
  ACCOUNT: 'ฝ่ายบัญชี',
  MANAGER: 'ผู้จัดการ',
  USER: 'ผู้ใช้งานทั่วไป',
};

export const getRoleNameTh = (roleName: string): string => {
  return roleNameMapping[roleName] || roleName;
};

// Role Type helpers
import { RoleType } from '../types/enums/role';

export const isRoleType = (userRoleType: string | undefined, ...types: RoleType[]): boolean => {
  if (!userRoleType) return false;
  return types.includes(userRoleType as RoleType);
};

export const isFieldRole = (roleType?: string): boolean =>
  isRoleType(roleType, RoleType.FIELD_LEAD, RoleType.FIELD_TECH);

export const isFieldLead = (roleType?: string): boolean =>
  isRoleType(roleType, RoleType.FIELD_LEAD);

export const isManagementRole = (roleType?: string): boolean =>
  isRoleType(roleType, RoleType.MANAGEMENT);

export const isExecutiveRole = (roleType?: string): boolean =>
  isRoleType(roleType, RoleType.EXECUTIVE);
