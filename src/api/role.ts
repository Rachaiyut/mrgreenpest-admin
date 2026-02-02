import {
    IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { AuthService } from './auth';

// Define Role interface temporarily if not exists, but better to import shared one
export interface Role {
    id: string;
    name: string;
}

class RoleService extends AuthService {
    protected path = '/roles';

    async getAll(): Promise<IBaseResponseArray<Role>> {
        const res = await this.http.get<IBaseResponseArray<Role>>(this.path);
        return res.data;
    }
}

export const RoleApi = new RoleService();
