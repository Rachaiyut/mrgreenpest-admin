export const getRoleNameTh = (roleName: string): string => {
  return roleName;
};

/**
 * เช็คว่า role เป็น "SUPERADMIN" หรือไม่ — รองรับทั้งชื่ออังกฤษ seed (`SUPERADMIN`)
 * และชื่อไทยที่ admin rename เช่น `ผู้ดูแลระบบ (สูงสุด)`, `หัวหน้าผู้ดูแลระบบ (...)`
 */
export const isSuperadminRoleName = (name?: string): boolean => {
  if (!name) return false;
  if (name === 'SUPERADMIN') return true;
  return name.includes('สูงสุด') || name.includes('หัวหน้าผู้ดูแล');
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
