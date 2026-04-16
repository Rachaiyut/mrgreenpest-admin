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
  WAITING_CLEAR = 'WAITING_CLEAR',
  COMPLETE = 'COMPLETE',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export const JobStatusLabel: Record<string, string> = {
  [JobMainStatus.UNASSIGNED]: 'รอจัดคิว',
  [JobMainStatus.PENDING]: 'รอเข้าดำเนินการ',
  [JobMainStatus.IN_PROGRESS]: 'ระหว่างดำเนินการ',
  [JobMainStatus.WAITING_CLEAR]: 'รอเคลียค่าใช้จ่ายและสารเคมี',
  [JobMainStatus.COMPLETE]: 'แล้วเสร็จ',
  [JobMainStatus.CANCELLED]: 'ยกเลิก',
  [JobMainStatus.FAILED]: 'ล้มเหลว',
};
