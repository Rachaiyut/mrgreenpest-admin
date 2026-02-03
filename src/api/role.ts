import {
    IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { AuthService } from './auth';

// Define Role interface temporarily if not exists, but better to import shared one
export interface Role {
    id: string;
    name: string;
    description?: string;
    status: boolean;
    created_at?: string;
    updated_at?: string;
    permissions?: any[]; // Allow permissions to be included
}

export interface Permission {
    id: string;
    name: string;
    group: string;
}

class RoleService extends AuthService {
    protected path = '/roles';

    async getAll(params?: any): Promise<IBaseResponseArray<Role>> {
        const res = await this.http.get<IBaseResponseArray<Role>>(this.path, { params });
        return res.data;
    }

    async getById(id: string): Promise<Role> {
        const res = await this.http.get<any>(`${this.path}/${id}`);
        return res.data.data;
    }

    async create(data: Partial<Role>): Promise<Role> {
        const res = await this.http.post<any>(this.path, data);
        return res.data.data;
    }

    async update(id: string, data: Partial<Role>): Promise<Role> {
        const res = await this.http.patch<any>(`${this.path}/${id}`, data);
        return res.data.data;
    }

    async delete(id: string): Promise<void> {
        await this.http.delete(`${this.path}/${id}`);
    }

    async assignPermissions(id: string, permissionIds: string[]): Promise<Role> {
        const res = await this.http.post<any>(`${this.path}/${id}/permissions`, {
            permission_ids: permissionIds
        });
        return res.data.data;
    }
}

export const RoleApi = new RoleService();
