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
  role?: string;
}
