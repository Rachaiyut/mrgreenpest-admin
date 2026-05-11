import { PaymentMethod } from '@/src/types/enums/financial';
import { AuthService } from './auth';

export interface CreatePaymentPayload {
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  paid_at: string;
  payment_proof?: string;
  notes?: string;
  requires_review?: boolean;
}

class PaymentService extends AuthService {
  protected path = '/payments';

  async create(data: CreatePaymentPayload): Promise<any> {
    const res = await this.http.post(this.path, data);
    return res.data;
  }
}

export const PaymentApi = new PaymentService();
