export const getRoleNameTh = (roleName: string): string => {
  return roleName;
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
