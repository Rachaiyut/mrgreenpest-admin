import { IBaseQuery, IBaseResponseArray } from '@/src/types/entity/base.interface';
import { ChemicalCatalog } from '@/src/types/entity/chemical-catalog.interface';
import { AuthService } from './auth';

class ChemicalCatalogService extends AuthService {
  protected path = '/chemical-catalogs';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<ChemicalCatalog>> {
    const res = await this.http.get<IBaseResponseArray<ChemicalCatalog>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getById(id: string): Promise<ChemicalCatalog> {
    const res = await this.http.get<ChemicalCatalog>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Partial<ChemicalCatalog>): Promise<ChemicalCatalog> {
    const res = await this.http.post<ChemicalCatalog>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<ChemicalCatalog>): Promise<ChemicalCatalog> {
    const res = await this.http.patch<ChemicalCatalog>(`${this.path}/${id}`, data);
    return res.data;
  }

  async remove(id: string): Promise<ChemicalCatalog> {
    const res = await this.http.delete<ChemicalCatalog>(`${this.path}/${id}`);
    return res.data;
  }
}

export const ChemicalCatalogApi = new ChemicalCatalogService();
