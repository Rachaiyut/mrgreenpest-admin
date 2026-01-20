export interface ILoginResponse {
  access_token: string;
  user: IAuthUser;
}

export interface ILoginPayload {
  citizen_id: string;
  password: string;
}

export interface IAuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export const ILOCAL_STORAGE = {
  USER_PROFILE: 'user_Profile',
  CUSTOMER_USER: 'customer_user',
  USER_TOKEN: 'access_token_user',
} as const;
