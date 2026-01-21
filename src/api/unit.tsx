// Constant
import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';

// Interface
import { IUnit } from '@/src/types/entity/unit.interface';

// Service
import { AuthService } from './auth';

class UnitService extends AuthService {
  protected path = '/units';

  // Your Public API Methods
  async getUnit(
    query: IBaseQuery
  ): Promise<IBaseResponseArray<IUnit>> {
    const res = await this.http.get<IBaseResponseArray<IUnit>>(
      `${this.path}`,
      {
        params: query,
      }
    );
    return res.data;
  }

  async getUnitById(id: string): Promise<IUnit> {
    const res = await this.http.get<IUnit>(`${this.path}/${id}`);
    return res.data;
  }

  async createUnit(data: Partial<IUnit>): Promise<IUnit> {
    const res = await this.http.post<IUnit>(`${this.path}`, data);
    return res.data;
  }

  async updateUnit(
    id: string,
    data: Partial<IUnit>
  ): Promise<IUnit> {
    const res = await this.http.patch<IUnit>(`${this.path}/${id}`, data);
    return res.data;
  }

  async deleteUnit(id: string): Promise<IUnit> {
    const res = await this.http.delete<IUnit>(`${this.path}/${id}`);
    return res.data;
  }
}

export const Unit = new UnitService();
