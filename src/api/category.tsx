// Constant
import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';

// Interface
import { Category, CategoryQuery } from '@/src/types/entity/category.interface';

// Service
import { AuthService } from './auth';

class CategoryService extends AuthService {
  protected path = '/categories';

  // Your Public API Methods
  async getCategories(
    query: CategoryQuery
  ): Promise<IBaseResponseArray<Category>> {
    const res = await this.http.get<IBaseResponseArray<Category>>(
      `${this.path}`,
      {
        params: query,
      }
    );
    return res.data;
  }

  async getCategoryById(id: string): Promise<Category> {
    const res = await this.http.get<Category>(`${this.path}/${id}`);
    return res.data;
  }

  async createCategory(data: Partial<Category>): Promise<Category> {
    const res = await this.http.post<Category>(`${this.path}`, data);
    return res.data;
  }

  async updateCategory(
    id: string,
    data: Partial<Category>
  ): Promise<Category> {
    const res = await this.http.patch<Category>(`${this.path}/${id}`, data);
    return res.data;
  }

  async deleteCategory(id: string): Promise<Category> {
    const res = await this.http.delete<Category>(`${this.path}/${id}`);
    return res.data;
  }
}

export const CategoryApi = new CategoryService();
