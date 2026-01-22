export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface LoginPayload {
  citizen_id: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}
