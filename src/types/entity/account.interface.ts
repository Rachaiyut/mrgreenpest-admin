import { IBase } from './base.interface';

export type AccountType = 'SAVINGS' | 'CURRENT' | 'FIXED' | 'OTHER';

export type AccountTransactionType = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'ADJUSTMENT';

export interface Account extends IBase {
  account_number: string;
  account_name: string;
  bank_name: string;
  branch_name?: string;
  account_type: AccountType;
  credit_limit: number;
  current_balance: number;
  currency: string;
  is_active: boolean;
  notes?: string;
  qr_code?: string;
  created_by?: string;
  updated_by?: string;
}

export interface AccountTransaction extends IBase {
  account_id: string;
  type: AccountTransactionType;
  amount: number;
  balance_after: number;
  transaction_date: string;
  reference_code?: string;
  reference_id?: string;
  description?: string;
  account?: Account;
  created_by?: string;
  created_by_user?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    nick_name?: string;
  } | null;
}
