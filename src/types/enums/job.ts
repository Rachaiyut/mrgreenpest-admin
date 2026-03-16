// Legacy status - for backwards compatibility
export enum JobStatus {
  Draft = 'Draft',
  Scheduled = 'Scheduled',
  Planned = 'Planned',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Pending = 'Pending',
  PendingApproval = 'PendingApproval',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Paused = 'Paused',
  Failed = 'Failed',
}

// Backend compatible status
export enum JobMainStatus {
  UNASSIGNED = 'UNASSIGNED',
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}
