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
    Failed = 'Failed'
}


export enum JobMainStatus {
    PENDING = 'PENDING',
    INPROGRESS = 'IN_PROGRESS',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}