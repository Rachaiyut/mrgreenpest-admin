import api from "..";

import { ApiResponse, PaginatedResponse } from "../type";

export interface Category {
  id: string,
  code: string,
  name: string,
  description: string,
  created_at: string,
  updated_at: string
}

export interface IGetCategoriesParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
}

export const getAllcategories = async (params: IGetCategoriesParams = {}): Promise<PaginatedResponse<Category>> => {
    const queryParams = new URLSearchParams();

  // Add pagination parameters
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  // Add sorting parameters
  if (params.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params.sort_order) queryParams.append('sort_order', params.sort_order);

  // Add search parameter
  if (params.search) queryParams.append('search', params.search);


  const quertString = queryParams.toString();
  const url = quertString ? `categories?${quertString}` : '/categories';

  const response = await api.get(url);
  return response.data;
}