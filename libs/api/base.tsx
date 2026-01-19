import axios, { AxiosInstance, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

export abstract class BaseHttpClient {
  protected http: AxiosInstance;
  private isRefreshing = false;
  private refreshWaiters: Array<(token: string) => void> = [];
  private pendingRequests = 0;

  protected abstract path: string;
  protected abstract getAccessToken(): string | null;
  protected abstract handleRefreshToken(): Promise<string>;
  protected abstract onAuthFailure(): void;

  constructor(baseURL: string, timeout: number) {
    this.http = axios.create({ baseURL, timeout, headers: { 'Content-Type': 'application/json' } });
    this.initializeInterceptors();
  } 

  public get(): AxiosInstance {
    return this.http;
  }

  private notifyLoading() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('global:loading', { detail: { pending: this.pendingRequests } }));
    }
  }

  private initializeInterceptors() {
    this.http.interceptors.request.use((config) => {
      this.pendingRequests++;
      this.notifyLoading();

      // Inject Token
      const token = this.getAccessToken();
      if (token) {
        config.headers = config.headers || new AxiosHeaders();
        config.headers.set('Authorization', `Bearer ${token}`);
      }
      return config;
    });

    this.http.interceptors.response.use(
      (res) => {
        this.pendingRequests = Math.max(0, this.pendingRequests - 1);
        this.notifyLoading();
        return res;
      },
      async (error) => {
        this.pendingRequests = Math.max(0, this.pendingRequests - 1);
        this.notifyLoading();

        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshWaiters.push((token) => {
                originalRequest.headers.set('Authorization', `Bearer ${token}`);
                resolve(this.http(originalRequest));
              });
            });
          }

          this.isRefreshing = true;
          try {
            const newToken = await this.handleRefreshToken();
            this.isRefreshing = false;
            this.refreshWaiters.forEach((cb) => cb(newToken));
            this.refreshWaiters = [];
            
            originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
            return this.http(originalRequest);
          } catch (refreshErr) {
            this.isRefreshing = false;
            this.refreshWaiters = [];
            this.onAuthFailure();
            return Promise.reject(refreshErr);
          }
        }
        return Promise.reject(error);
      }
    );
  }
}