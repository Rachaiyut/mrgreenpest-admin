import React from 'react';
import { Status } from '../../types';

interface StatusBadgeProps {
  status: Status;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusColors: Record<Status, string> = {
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
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-slate-100 text-slate-600'}`}
    >
      {status}
    </span>
  );
};
