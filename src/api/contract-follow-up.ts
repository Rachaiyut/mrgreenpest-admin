import { IBaseQuery, IBaseResponseArray } from '@/src/types/entity/base.interface';
import { ContractFollowUp } from '@/src/types/entity/contract-follow-up.interface';
import { AuthService } from './auth';

class ContractFollowUpService extends AuthService {
  protected path = '/contract-follow-ups';

  async create(data: Partial<ContractFollowUp>): Promise<any> {
    const res = await this.http.post(this.path, data);
    return res.data;
  }

  async getByCustomerId(customerId: string): Promise<any> {
    const res = await this.http.get(`${this.path}/customer/${customerId}`);
    return res.data;
  }

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<ContractFollowUp>> {
    const res = await this.http.get<IBaseResponseArray<ContractFollowUp>>(this.path, {
      params: query,
    });
    return res.data;
  }
}

export const ContractFollowUpApi = new ContractFollowUpService();
