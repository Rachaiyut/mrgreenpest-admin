import {
  IBaseQuery,
  IBaseResponse,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { Account } from '@/src/types/entity/account.interface';
import { AuthService } from './auth';

export type CashWithdrawalRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CashWithdrawalRequestItem {
  id: string;
  request_id: string;
  description: string;
  amount: number;
}

export interface CashWithdrawalRequest {
  id: string;
  request_code: string;
  destination_account_id?: string | null;
  source_account_id?: string | null;
  total_amount: number;
  status: CashWithdrawalRequestStatus;
  request_note?: string | null;
  reject_reason?: string | null;
  requested_by?: string | null;
  requested_at?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  source_withdraw_trx_id?: string | null;
  dest_deposit_trx_id?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: CashWithdrawalRequestItem[];
  destinationAccount?: Account;
  sourceAccount?: Account;
}

export interface CashWithdrawalRequestFilterQuery extends IBaseQuery {
  status?: CashWithdrawalRequestStatus;
}

export interface CreateCashWithdrawalRequestPayload {
  request_note?: string;
  items: Array<{ description: string; amount: number }>;
}

class CashWithdrawalRequestService extends AuthService {
  protected path = '/cash-withdrawal-requests';

  async getAll(
    query?: CashWithdrawalRequestFilterQuery,
  ): Promise<IBaseResponseArray<CashWithdrawalRequest>> {
    const res = await this.http.get<IBaseResponseArray<CashWithdrawalRequest>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getById(id: string): Promise<CashWithdrawalRequest> {
    const res = await this.http.get<IBaseResponse<CashWithdrawalRequest>>(
      `${this.path}/${id}`,
    );
    return res.data.data;
  }

  async create(payload: CreateCashWithdrawalRequestPayload): Promise<CashWithdrawalRequest> {
    const res = await this.http.post<IBaseResponse<CashWithdrawalRequest>>(
      this.path,
      payload,
    );
    return res.data.data;
  }

  async approve(id: string, sourceAccountId: string): Promise<CashWithdrawalRequest> {
    const res = await this.http.patch<IBaseResponse<CashWithdrawalRequest>>(
      `${this.path}/${id}/approve`,
      { source_account_id: sourceAccountId },
    );
    return res.data.data;
  }

  async reject(id: string, rejectReason: string): Promise<CashWithdrawalRequest> {
    const res = await this.http.patch<IBaseResponse<CashWithdrawalRequest>>(
      `${this.path}/${id}/reject`,
      { reject_reason: rejectReason },
    );
    return res.data.data;
  }
}

export const CashWithdrawalRequestApi = new CashWithdrawalRequestService();
