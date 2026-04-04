import { User } from './core.interface';
import { Warehouse, Vehicle } from './inventory.interface';
import { Product } from './product.interface';

export enum RequisitionType {
  ITEM = 'ITEM',
  EXPENSE = 'EXPENSE',
}

export enum RequisitionStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ApprovalRole {
  ADMIN = 'ADMIN',
  LEAD_ADMIN = 'LEAD_ADMIN',
  CFO = 'CFO',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface RequisitionItem {
  id: string;
  requisition_id: string;
  product_id: string;
  quantity: number;
  stock_before?: number;
  stock_after?: number;
  remark?: string;
  product?: Product;
}

export interface RequisitionExpense {
  id: string;
  requisition_id: string;
  expense_category_id?: string;
  description: string;
  amount: number;
}

export interface Approval {
  id: string;
  requisition_id: string;
  step: number;
  role: ApprovalRole;
  status: ApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  remark?: string;
  approver?: User;
}

export interface Requisition {
  id: string;
  doc_no: string;
  type: RequisitionType;
  request_date: string;
  requester_id: string;
  warehouse_id?: string;
  vehicle_id?: string;
  status: RequisitionStatus;
  total_amount?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;

  requester?: User;
  warehouse?: Warehouse;
  vehicle?: Vehicle;
  items?: RequisitionItem[];
  expenses?: RequisitionExpense[];
  approvals?: Approval[];
}

export interface CreateRequisitionDto {
  type: RequisitionType;
  request_date: string;
  warehouse_id?: string;
  vehicle_id?: string; // If RequisitionType.ITEM (optional if generic)
  description?: string;
  items?: {
    product_id: string;
    quantity: number;
    remark?: string;
  }[];
  expenses?: {
    description: string;
    amount: number;
    expense_category_id?: string;
  }[];
}

export interface UpdateRequisitionDto extends Partial<CreateRequisitionDto> {}

export interface ApproveRequisitionDto {
  status: ApprovalStatus;
  remark?: string;
}
