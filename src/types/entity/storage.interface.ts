export interface StorageModel {
  id: string;
  path: string;
  provider: string;
  visibility: 'public' | 'private';
  url?: string;
  type?: string;
  note?: string;
  entity_type?: string;
  entity_id?: string;
  size: number;
  mimetype: string;
  originalname: string;
  created_at?: string;
  updated_at?: string;
}

export interface UploadStorageDto {
  file: File;
  path: string;
  visibility?: 'public' | 'private';
  provider?: string;
  type?: string;
  note?: string;
  entity_type?: string;
  entity_id?: string;
}

export interface UploadMultipleStorageDto {
  files: File[];
  path: string;
  visibility?: 'public' | 'private';
  provider?: string;
  type?: string;
  note?: string;
  entity_type?: string;
  entity_id?: string;
}

export interface UpdateStorageDto {
  path?: string;
  visibility?: 'public' | 'private';
  type?: string;
  note?: string;
}
