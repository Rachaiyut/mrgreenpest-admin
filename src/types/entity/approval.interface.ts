import { User } from './core.interface';

export enum ApprovalEntityType {
  QUOTATION = 'QUOTATION',
  WITHDRAWAL = 'WITHDRAWAL',
  REQUISITION = 'REQUISITION',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface Approval {
  id: string;
  entity_type: ApprovalEntityType | string;
  entity_id: string;
  status: ApprovalStatus;
  requested_by: string;
  approved_by?: string;
  rejected_by?: string;
  reason?: string;
  created_at: string;
  updated_at?: string;

  requester?: User;
  approver?: User;
}
