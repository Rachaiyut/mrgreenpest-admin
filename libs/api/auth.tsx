// Constant
import { AxiosInstance } from 'axios';
import { API_CONFIG } from '../common/config/api.config';

// Interface
import { IBaseResponse } from '../common/interface/api/base.interface';
import {
  IAuthUser,
  ILOCAL_STORAGE,
  ILoginPayload,
  ILoginResponse,
} from '../common/interface/api/auth.interface';

// Base
import { BaseHttpClient } from './base';

export class AuthService extends BaseHttpClient {
  protected path = '/auth';

  constructor() {
    super(API_CONFIG.baseUrl, API_CONFIG.timeout);
  }

  protected getApi(): AxiosInstance {
    return this.http;
  }

  // Implementation of abstract requirements
  protected getAccessToken() {
    return typeof window !== 'undefined'
      ? localStorage.getItem(ILOCAL_STORAGE.USER_TOKEN)
      : null;
  }

  protected async handleRefreshToken(): Promise<string> {
    const res = await this.http.post<{ token: string }>(`${this.path}/refresh`);
    const newToken = res.data.token;
    localStorage.setItem(ILOCAL_STORAGE.USER_TOKEN, newToken);
    return newToken;
  }

  protected onAuthFailure() {
    localStorage.removeItem(ILOCAL_STORAGE.USER_TOKEN);
    localStorage.removeItem(ILOCAL_STORAGE.USER_PROFILE);
  }

  // Your Public API Methods
  async login(payload: ILoginPayload): Promise<ILoginResponse> {
    const res = await this.http.post<IBaseResponse<ILoginResponse>>(
      `${this.path}/login`,
      payload
    );

    const { access_token, user } = res.data.data;

    localStorage.setItem(ILOCAL_STORAGE.USER_TOKEN, access_token);
    localStorage.setItem(ILOCAL_STORAGE.USER_PROFILE, JSON.stringify(user));

    return { access_token, user };
  }

  async logout() {
    try {
      await this.http.post(`${this.path}/logout`);
    } finally {
      this.onAuthFailure();
    }
  }

  async getUserProfile(): Promise<IAuthUser> {
    const res = await this.http.get<IAuthUser>(`${this.path}/profile`);
    return res.data;
  }
}

export const Auth = new AuthService();
