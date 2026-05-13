export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
  permissions: string[];
}

export interface LoginPayload {
  citizen_id: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  /** Backend ส่งเป็น role_type (เช่น 'MANAGEMENT') — ดูใน roleName เพื่อชื่อจริง */
  role?: string;
  /** ชื่อ role จริงในตาราง roles (เช่น 'SUPERADMIN' หรือชื่อภาษาไทย) */
  roleName?: string;
  roleType?: string;
  url?: string;
}
