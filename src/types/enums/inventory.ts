export enum WarehouseType {
  MAIN = 'MAIN',
  SUB = 'SUB',
  VEHICLE = 'VEHICLE',
}

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  BLOCK = 'BLOCK',
}

/**
 * Document-level state of a withdrawal slip.
 *  - DRAFT     ยังกรอกไม่เสร็จ
 *  - SUBMITTED ส่งเข้าระบบแล้ว (state การอนุมัติเก็บที่ items/expenses)
 *  - CANCELLED ผู้ใช้กดยกเลิกใบ
 */
export enum WithdrawalLifecycle {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  CANCELLED = 'CANCELLED',
}

/**
 * Per-line approval state. Applies to withdrawal_items และ withdrawal_expenses.
 * CANCELLED ถูกตั้งเมื่อใบเบิกถูกยกเลิก
 */
export enum WithdrawalLineStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * @deprecated kept for backward compat while pages migrate to
 * WithdrawalLifecycle / WithdrawalLineStatus.
 */
export enum WithdrawalStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PARTIALLY_APPROVED = 'PARTIALLY_APPROVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProductReturnStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum StockAdjustmentStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum TransferStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum GoodsReceiptStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RECEIVED = 'RECEIVED',
  PARTIAL = 'PARTIAL',
  REJECTED = 'REJECTED',
}

export enum IssueSummaryStatus {
	DRAFT = 'DRAFT',
	PENDING = 'PENDING',
	CANCELLED = 'CANCELLED',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED'
}


