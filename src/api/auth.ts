// Constant
import { AxiosInstance } from 'axios';
import { API_CONFIG } from '@/src/constants/config';

// Constant
import { STORAGE_KEYS } from '../constants';

// Interface
import { IBaseResponse } from '@/src/types/entity/base.interface';
import {
  AuthUser,
  LoginPayload,
  LoginResponse,
} from '../types/entity/auth.interface';

// API
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
      ? localStorage.getItem(STORAGE_KEYS.TOKEN)
      : null;
  }

  protected async handleRefreshToken(): Promise<string> {
    const res = await this.http.post<{ token: string }>(`${this.path}/refresh`);
    const newToken = res.data.token;
    localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
    return newToken;
  }

  protected onAuthFailure() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  }

  // Your Public API Methods
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const res = await this.http.post<IBaseResponse<LoginResponse>>(
      `${this.path}/login`,
      payload
    );

    const { access_token, user } = res.data.data;

    localStorage.setItem(STORAGE_KEYS.TOKEN, access_token);
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));

    return { access_token, user };
  }

  async logout() {
    try {
      await this.http.post(`${this.path}/logout`);
    } finally {
      this.onAuthFailure();
    }
  }

  async getUserProfile(): Promise<AuthUser> {
    const res = await this.http.get<AuthUser>(`${this.path}/profile`);
    return res.data;
  }

  async getDemoUsers(): Promise<any[]> {
    const res = await this.http.get<IBaseResponse<any[]>>(`${this.path}/demo-users`);
    return res.data.data;
  }
}

export const Auth = new AuthService();

