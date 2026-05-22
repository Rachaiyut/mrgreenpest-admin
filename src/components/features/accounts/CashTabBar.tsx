import { FC, useEffect, useState } from 'react';

import { CashWithdrawalRequestApi } from '@/src/api/cash-withdrawal-request';

export type CashTab = 'transactions' | 'requests';

type Props = {
  active: CashTab;
  onChange: (tab: CashTab) => void;
  className?: string;
  /** เปลี่ยนค่าเพื่อบังคับ refetch จำนวนใบรออนุมัติ (ใช้หลังสร้าง/อนุมัติ/ปฏิเสธ) */
  refreshKey?: number;
};

export const CashTabBar: FC<Props> = ({ active, onChange, className, refreshKey = 0 }) => {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    CashWithdrawalRequestApi.getAll({ status: 'PENDING', limit: 1, page: 1 })
      .then((res) => setPendingCount(res?.meta?.total ?? 0))
      .catch(() => setPendingCount(0));
  }, [active, refreshKey]);

  const baseBtn =
    'px-3 sm:px-4 h-10 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap flex items-center';

  return (
    <div
      className={`inline-flex items-center bg-slate-100 p-1 rounded-lg gap-1 ${className || ''}`}
    >
      <button
        type="button"
        onClick={() => onChange('transactions')}
        className={`${baseBtn} ${
          active === 'transactions'
            ? 'bg-white text-primary shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        รายการรับ-จ่าย
      </button>
      <button
        type="button"
        onClick={() => onChange('requests')}
        className={`${baseBtn} ${
          active === 'requests'
            ? 'bg-white text-amber-600 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        ใบขอเบิกเงิน
        {pendingCount > 0 && (
          <span className="ml-1.5 bg-amber-100 text-amber-700 py-0.5 px-1.5 rounded-full text-[10px] sm:text-xs">
            {pendingCount}
          </span>
        )}
      </button>
    </div>
  );
};
