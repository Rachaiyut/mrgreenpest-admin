import {
  StorageModel,
  UploadMultipleStorageDto,
  UploadStorageDto,
  UpdateStorageDto,
} from '@/src/types/entity/storage.interface';
import { AuthService } from './auth';

class StorageService extends AuthService {
  protected path = '/storage';

  async upload(data: UploadStorageDto): Promise<StorageModel> {
    const formData = new FormData();
    formData.append('path', data.path);
    if (data.visibility) formData.append('visibility', data.visibility);
    if (data.provider) formData.append('provider', data.provider);
    if (data.type) formData.append('type', data.type);
    if (data.note) formData.append('note', data.note);
    if (data.entity_type) formData.append('entity_type', data.entity_type);
    if (data.entity_id) formData.append('entity_id', data.entity_id);
    
    formData.append('file', data.file);

    const res = await this.http.post<StorageModel>(
      `${this.path}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  }

  async uploadMultiple(
    data: UploadMultipleStorageDto
  ): Promise<StorageModel[]> {
    const formData = new FormData();
    data.files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('path', data.path);
    if (data.visibility) formData.append('visibility', data.visibility);
    if (data.provider) formData.append('provider', data.provider);
    if (data.type) formData.append('type', data.type);
    if (data.note) formData.append('note', data.note);
    if (data.entity_type) formData.append('entity_type', data.entity_type);
    if (data.entity_id) formData.append('entity_id', data.entity_id);

    const res = await this.http.post<StorageModel[]>(
      `${this.path}/upload/multiple`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  }

  async update(id: string, data: UpdateStorageDto): Promise<StorageModel> {
    const res = await this.http.patch<StorageModel>(`${this.path}/${id}`, data);
    return res.data;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const res = await this.http.delete<{ success: boolean }>(
      `${this.path}/${id}`
    );
    return res.data;
  }

  async getSignedUrl(id: string, expiresIn?: number): Promise<{ url: string }> {
    const res = await this.http.get<{ url: string }>(
      `${this.path}/${id}/signed-url`,
      {
        params: { expiresIn },
      }
    );
    return res.data;
  }
}

export const StorageApi = new StorageService();
