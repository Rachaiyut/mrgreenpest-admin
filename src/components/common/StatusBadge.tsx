import React from 'react';
import { Status } from '@/src/types/entity/app.interface';
import { JobStatus } from '@/src/types/enums/job';
import { AsessmentStatus } from '@/src/types/enums/assessment';
import { InvoiceStatus } from '@/src/types/enums/financial';

interface StatusBadgeProps {
  status: Status | JobStatus | AsessmentStatus | InvoiceStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = String(status || '').trim();
  const upper = s.toUpperCase();

  const statusLabels: Record<string, string> = {
    PENDING: Status.Pending,
    IN_PROGRESS: Status.InProgress,
    INPROGRESS: Status.InProgress,
    COMPLETED: Status.Completed,
    COMPLETE: Status.Completed,
    CANCELLED: Status.Cancelled,
    DRAFT: Status.Draft,
    PLANNED: Status.Planned,
    SCHEDULED: Status.Scheduled,
    PENDINGAPPROVAL: Status.PendingApproval,
    APPROVED: Status.Approved,
    REJECTED: Status.Rejected,
    PAUSED: Status.Paused,
    FAILED: Status.Failed,
    PAID: Status.Paid,
    OVERDUE: Status.Overdue,
    SENT: Status.Sent,
    UNDERREVIEW: Status.UnderReview,
    REVISE: Status.Revise,
    CLOSED: Status.Closed,
  };

  const statusColors: Record<string, string> = {
    // Core Status (Thai)
    [Status.Draft]: 'bg-slate-100 text-slate-600',
    [Status.Scheduled]: 'bg-blue-100 text-blue-700',
    [Status.Planned]: 'bg-sky-100 text-sky-700',
    [Status.InProgress]: 'bg-amber-100 text-amber-700',
    [Status.Paused]: 'bg-gray-100 text-gray-700',
    [Status.Completed]: 'bg-green-100 text-green-700',
    [Status.Converted]: 'bg-emerald-100 text-emerald-700',
    [Status.Failed]: 'bg-red-100 text-red-700',
    [Status.Cancelled]: 'bg-red-100 text-red-700',
    [Status.Pending]: 'bg-yellow-100 text-yellow-700',
    [Status.PendingApproval]: 'bg-orange-100 text-orange-700',
    [Status.Approved]: 'bg-green-100 text-green-700',
    [Status.Rejected]: 'bg-red-100 text-red-700',
    [Status.Paid]: 'bg-green-100 text-green-700',
    [Status.Overdue]: 'bg-rose-100 text-rose-700',
    [Status.Sent]: 'bg-indigo-100 text-indigo-700',
    [Status.UnderReview]: 'bg-violet-100 text-violet-700',
    [Status.Revise]: 'bg-pink-100 text-pink-700',
    [Status.Closed]: 'bg-zinc-100 text-zinc-700',

    // Job Status (English)
    [JobStatus.Scheduled]: 'bg-blue-100 text-blue-700',
    [JobStatus.InProgress]: 'bg-amber-100 text-amber-700',
    [JobStatus.Completed]: 'bg-green-100 text-green-700',
    [JobStatus.Cancelled]: 'bg-red-100 text-red-700',
    [JobStatus.Pending]: 'bg-yellow-100 text-yellow-700',

    // Assessment Status (English)
    [AsessmentStatus.APPOINTMENT]: 'bg-blue-100 text-blue-700',
    [AsessmentStatus.COMPLETE]: 'bg-green-100 text-green-700',

    // Invoice Status (English) - Only unique values
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-rose-100 text-rose-700',
    DRAFT: 'bg-slate-100 text-slate-600',
    PENDING: 'bg-yellow-100 text-yellow-700',
    CANCELLED: 'bg-red-100 text-red-700',
    SENT: 'bg-indigo-100 text-indigo-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
  };

  const displayLabel =
    statusLabels[upper] ||
    (s === JobStatus.Pending
      ? Status.Pending
      : s === JobStatus.InProgress
      ? Status.InProgress
      : s === JobStatus.Completed
      ? Status.Completed
      : s === JobStatus.Cancelled
      ? Status.Cancelled
      : s === JobStatus.Scheduled
      ? Status.Scheduled
      : s);

  const colorKey =
    statusLabels[upper] ||
    (s === JobStatus.Pending
      ? JobStatus.Pending
      : s === JobStatus.InProgress
      ? JobStatus.InProgress
      : s === JobStatus.Completed
      ? JobStatus.Completed
      : s === JobStatus.Cancelled
      ? JobStatus.Cancelled
      : s === JobStatus.Scheduled
      ? JobStatus.Scheduled
      : displayLabel);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[colorKey] || 'bg-slate-100 text-slate-600'}`}
    >
      {displayLabel}
    </span>
  );
};
