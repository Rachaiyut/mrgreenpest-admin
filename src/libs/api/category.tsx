// Constant
import {
  IBaseQuery,
  IBaseResponseArray,
} from '../common/interface/entity/base.interface';

// Interface
import { ICategory } from '../common/interface/entity/category.interface';

// Service
import { AuthService } from './auth';

class CategoryService extends AuthService {
  protected path = '/categories';

  // Your Public API Methods
  async getCategories(
    query: IBaseQuery
  ): Promise<IBaseResponseArray<ICategory>> {
    const res = await this.http.get<IBaseResponseArray<ICategory>>(
      `${this.path}`,
      {
        params: query,
      }
    );
    return res.data;
  }

  async getCategoryById(id: string): Promise<ICategory> {
    const res = await this.http.get<ICategory>(`${this.path}/${id}`);
    return res.data;
  }

  async createCategory(data: Partial<ICategory>): Promise<ICategory> {
    const res = await this.http.post<ICategory>(`${this.path}`, data);
    return res.data;
  }

  async updateCategory(
    id: string,
    data: Partial<ICategory>
  ): Promise<ICategory> {
    const res = await this.http.patch<ICategory>(`${this.path}/${id}`, data);
    return res.data;
  }

  async deleteCategory(id: string): Promise<ICategory> {
    const res = await this.http.delete<ICategory>(`${this.path}/${id}`);
    return res.data;
  }
}

export const Category = new CategoryService();
