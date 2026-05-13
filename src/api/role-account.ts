import { IBaseResponse } from '@/src/types/entity/base.interface';
import { AuthService } from './auth';

export interface RoleAccount {
  role_id: string;
  account_id: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

class RoleAccountService extends AuthService {
  protected path = '/role-accounts';

  async getAll(): Promise<RoleAccount[]> {
    const res = await this.http.get<IBaseResponse<RoleAccount[]>>(this.path);
    return res.data?.data || [];
  }

  async getForMe(): Promise<RoleAccount | null> {
    const res = await this.http.get<IBaseResponse<RoleAccount | null>>(
      `${this.path}/me`,
    );
    return res.data?.data || null;
  }

  /** คืน Account objects ที่ผูกกับ role ของ user ที่ login (resolved) */
  async getMyBoundAccounts(): Promise<import('@/src/types/entity/account.interface').Account[]> {
    const res = await this.http.get<IBaseResponse<import('@/src/types/entity/account.interface').Account[]>>(
      `${this.path}/my-accounts`,
    );
    return res.data?.data || [];
  }

  async getByRoleId(roleId: string): Promise<RoleAccount | null> {
    const res = await this.http.get<IBaseResponse<RoleAccount | null>>(
      `${this.path}/${roleId}`,
    );
    return res.data?.data || null;
  }

  async upsert(roleId: string, accountId: string): Promise<RoleAccount> {
    const res = await this.http.put<IBaseResponse<RoleAccount>>(
      `${this.path}/${roleId}`,
      { account_id: accountId },
    );
    return res.data?.data;
  }

  async remove(roleId: string): Promise<void> {
    await this.http.delete(`${this.path}/${roleId}`);
  }
}

export const RoleAccountApi = new RoleAccountService();
