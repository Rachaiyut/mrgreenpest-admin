import { FC, MouseEvent as ReactMouseEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Card } from '../../common/Card';
import { Input, Button } from '../../common/FormControls';
import { DropdownSelect } from '../../common/DropdownSelect';
import { Pagination } from '../../common/Pagination';
import {
  CashWithdrawalRequest,
  CashWithdrawalRequestApi,
  CashWithdrawalRequestStatus,
} from '@/src/api/cash-withdrawal-request';
import { AccountApi } from '@/src/api/account';
import { usePermissions } from '@/src/hooks/usePermissions';
import {
  LoadingIcon,
  CurrencyDollarIcon,
  XCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  ManageIcon,
} from '@/src/assets/icons/Icons';
import { formatThaiDateTime } from '@/src/utils/date';
import { CreateCashWithdrawalRequestModal } from './CreateCashWithdrawalRequestModal';
import Swal from '@/src/utils/swal';

const fmtBaht = (v: number) =>
  v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_META: Record<CashWithdrawalRequestStatus, { label: string; badge: string }> = {
  PENDING: { label: 'รออนุมัติ', badge: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'อนุมัติแล้ว', badge: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'ไม่อนุมัติ', badge: 'bg-red-100 text-red-700' },
};

type Props = {
  /** Render เพิ่ม element ขวาบนของ toolbar (เช่น tab bar) */
  toolbarExtra?: ReactNode;
  /** เปิด modal สร้างใบจาก parent (ถ้าไม่ส่ง จะใช้ state ภายในเอง) */
  externalCreateOpen?: boolean;
  onExternalCreateClose?: () => void;
  /** ซ่อน column "บัญชีที่ตัด" — default แสดง (ใช้กับเมนู รายรับรายจ่าย ที่ไม่อยากแสดง) */
  hideSourceAccount?: boolean;
  /** ถูกเรียกหลังสร้าง/อนุมัติ/ปฏิเสธสำเร็จ — ให้ parent refresh count อื่น ๆ */
  onMutated?: () => void;
};

export const CashWithdrawalRequestList: FC<Props> = ({
  toolbarExtra,
  externalCreateOpen,
  onExternalCreateClose,
  hideSourceAccount = false,
  onMutated,
}) => {
  const { hasPermission } = usePermissions();
  const canApprove = hasPermission('APPROVE_CASH_WITHDRAWAL_REQUEST');

  const [items, setItems] = useState<CashWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CashWithdrawalRequestStatus | ''>('');

  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const createOpen = externalCreateOpen ?? internalCreateOpen;
  const closeCreate = () => {
    setInternalCreateOpen(false);
    onExternalCreateClose?.();
  };

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [detailRequest, setDetailRequest] = useState<CashWithdrawalRequest | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleDropdownToggle = (event: ReactMouseEvent<HTMLButtonElement>, id: string) => {
    event.stopPropagation();
    if (openDropdownId === id) {
      setOpenDropdownId(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setOpenDropdownId(id);
    setDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.right + window.scrollX });
  };

  useEffect(() => {
    if (!openDropdownId) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (!(e.target as HTMLElement).closest('button[data-cw-id]')) {
          setOpenDropdownId(null);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdownId]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await CashWithdrawalRequestApi.getAll({
        page,
        limit,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status ? { status } : {}),
      });
      setItems(res?.data || []);
      setTotal(res?.meta?.total ?? (res?.data?.length || 0));
    } catch (err) {
      console.error('Failed to fetch cash withdrawal requests:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status]);

  useEffect(() => {
    const t = setTimeout(fetchList, 250);
    return () => clearTimeout(t);
  }, [fetchList]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const openApprove = async (req: CashWithdrawalRequest) => {
    setOpenDropdownId(null);

    // โหลด accounts มาก่อน
    let accounts: Awaited<ReturnType<typeof AccountApi.getAll>>['data'] = [];
    try {
      const res = await AccountApi.getAll({ limit: 200, is_active: true });
      accounts = res?.data || [];
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }

    if (accounts.length === 0) {
      Swal.fire('ไม่มีบัญชี', 'ระบบยังไม่มีบัญชีที่เปิดใช้งาน', 'warning');
      return;
    }

    const accountOptions = accounts.reduce<Record<string, string>>((acc, a) => {
      acc[a.id] = `${a.account_number} (${a.account_name}) — ${fmtBaht(Number(a.current_balance || 0))} บาท`;
      return acc;
    }, {});

    const itemsHtml = (req.items || [])
      .map(
        (it, i) =>
          `<div class="flex justify-between py-1 border-b border-slate-100 last:border-0 text-sm">
             <span class="text-slate-700">${i + 1}. ${it.description}</span>
             <span class="font-semibold">${fmtBaht(Number(it.amount))} บาท</span>
           </div>`,
      )
      .join('');

    const { isConfirmed, value: sourceAccountId } = await Swal.fire<string>({
      title: `อนุมัติใบขอเบิก: ${req.request_code}`,
      html: `
        <div class="text-left space-y-3">
          <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
            <span class="text-xs text-slate-500">ยอดรวม</span>
            <span class="font-bold text-primary text-lg">${fmtBaht(Number(req.total_amount))} บาท</span>
          </div>
          ${req.request_note ? `<div class="text-sm"><span class="text-slate-500">หมายเหตุ:</span> ${req.request_note}</div>` : ''}
          <div>
            <div class="text-sm font-semibold text-slate-700 mb-1">รายการ (${req.items?.length || 0})</div>
            ${itemsHtml}
          </div>
        </div>
      `,
      input: 'select',
      inputLabel: 'บัญชีต้นทาง (ที่จะหักเงินออก)',
      inputOptions: accountOptions,
      inputPlaceholder: 'เลือกบัญชีต้นทาง',
      showCancelButton: true,
      confirmButtonText: 'อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
      width: 600,
      inputValidator: (v) => (!v ? 'กรุณาเลือกบัญชีต้นทาง' : null),
    });

    if (!isConfirmed || !sourceAccountId) return;

    const src = accounts.find((a) => a.id === sourceAccountId);
    if (src && Number(src.current_balance) < Number(req.total_amount)) {
      const cont = await Swal.fire({
        icon: 'warning',
        title: 'ยอดเงินไม่พอ',
        text: `บัญชี ${src.account_name} มียอด ${fmtBaht(Number(src.current_balance))} บาท แต่ต้องโอน ${fmtBaht(Number(req.total_amount))} บาท ต้องการอนุมัติต่อหรือไม่?`,
        showCancelButton: true,
        confirmButtonText: 'อนุมัติต่อ',
        cancelButtonText: 'ยกเลิก',
      });
      if (!cont.isConfirmed) return;
    }

    try {
      await CashWithdrawalRequestApi.approve(req.id, sourceAccountId);
      Swal.fire({
        icon: 'success',
        title: 'อนุมัติแล้ว',
        text: `โอนเงิน ${fmtBaht(Number(req.total_amount))} บาท เรียบร้อย`,
        timer: 1800,
        showConfirmButton: false,
      });
      fetchList();
      onMutated?.();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถอนุมัติได้', 'error');
    }
  };

  const openDetail = (req: CashWithdrawalRequest) => {
    setOpenDropdownId(null);
    setDetailRequest(req);
  };

  const handleReject = async (req: CashWithdrawalRequest) => {
    setOpenDropdownId(null);
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ไม่อนุมัติคำขอเบิก',
      input: 'textarea',
      inputLabel: 'เหตุผลในการปฏิเสธ',
      inputPlaceholder: 'กรอกเหตุผล...',
      inputAttributes: { 'aria-label': 'เหตุผลในการปฏิเสธ' },
      showCancelButton: true,
      confirmButtonText: 'ไม่อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      inputValidator: (v) => (!v || !v.trim() ? 'กรุณากรอกเหตุผล' : null),
    });
    if (!result.isConfirmed || !result.value) return;
    try {
      await CashWithdrawalRequestApi.reject(req.id, result.value.trim());
      Swal.fire({ icon: 'success', title: 'ปฏิเสธคำขอแล้ว', timer: 1500, showConfirmButton: false });
      fetchList();
      onMutated?.();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถปฏิเสธได้', 'error');
    }
  };

  return (
    <>
      {/* Toolbar */}
      <Card className="!p-4 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72 flex-shrink-0">
            <Input
              type="search"
              placeholder="ค้นหาเลขที่ / หมายเหตุ"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="w-full sm:w-48 flex-shrink-0">
            <DropdownSelect
              value={status}
              onChange={(v) => setStatus(v as CashWithdrawalRequestStatus | '')}
              placeholder="ทุกสถานะ"
              className="w-full bg-white border-slate-300 shadow-sm text-sm h-10"
              options={[
                { value: '', label: 'ทุกสถานะ' },
                { value: 'PENDING', label: 'รออนุมัติ' },
                { value: 'APPROVED', label: 'อนุมัติแล้ว' },
                { value: 'REJECTED', label: 'ไม่อนุมัติ' },
              ]}
            />
          </div>
          {toolbarExtra && <div className="w-full xl:w-auto xl:ml-auto">{toolbarExtra}</div>}
        </div>
      </Card>

      {/* Table */}
      <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-20">
            <LoadingIcon className="w-10 h-10 animate-spin mb-3 text-primary" />
            <span className="text-sm">กำลังโหลด...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-20">
            <CurrencyDollarIcon className="w-12 h-12 mb-3 opacity-40" />
            <span className="text-sm">ไม่พบใบขอเบิก</span>
          </div>
        ) : (
          <div className="overflow-x-auto flex flex-col flex-grow">
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase">ลำดับ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">เลขที่</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">วันที่ขอ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">หมายเหตุ</th>
                  {!hideSourceAccount && (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">บัญชีที่ตัด</th>
                  )}
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase">ยอดรวม</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase">สถานะ</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {items.map((req, idx) => {
                  const meta = STATUS_META[req.status];
                  return (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-center text-sm text-slate-500 tabular-nums">{(page - 1) * limit + idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-bold text-primary">{req.request_code}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                        {formatThaiDateTime(req.requested_at || req.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 max-w-[260px]">
                        <span className="line-clamp-2" title={req.request_note || ''}>
                          {req.request_note || <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                      {!hideSourceAccount && (
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {req.sourceAccount
                            ? `${req.sourceAccount.account_number} (${req.sourceAccount.account_name})`
                            : <span className="text-slate-300">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-right font-bold tabular-nums">
                        {fmtBaht(Number(req.total_amount))} บาท
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="icon"
                          onClick={(e) => handleDropdownToggle(e as ReactMouseEvent<HTMLButtonElement>, req.id)}
                          data-cw-id={req.id}
                          className="!p-1.5"
                        >
                          <ManageIcon className="w-5 h-5 text-slate-500" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && total > 0 && (
          <Pagination
            currentPage={page}
            totalItems={total}
            itemsPerPage={limit}
            onPageChange={setPage}
            onItemsPerPageChange={(size) => { setLimit(size); setPage(1); }}
          />
        )}
      </div>

      <CreateCashWithdrawalRequestModal
        isOpen={createOpen}
        onClose={closeCreate}
        onSubmitted={() => {
          fetchList();
          onMutated?.();
        }}
      />
      <CreateCashWithdrawalRequestModal
        isOpen={!!detailRequest}
        mode="view"
        request={detailRequest}
        onClose={() => setDetailRequest(null)}
      />
      {openDropdownId &&
        dropdownPosition &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              transform: 'translateX(-100%)',
            }}
            className="origin-top-right mt-2 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30"
            role="menu"
          >
            <div className="py-1">
              {(() => {
                const req = items.find((r) => r.id === openDropdownId);
                if (!req) return null;
                const actions: Array<{ label: string; color: string; hoverBg: string; icon: typeof EyeIcon; onClick: () => void }> = [
                  {
                    label: 'ดูรายละเอียด',
                    color: 'text-slate-700',
                    hoverBg: 'hover:bg-slate-50',
                    icon: EyeIcon,
                    onClick: () => openDetail(req),
                  },
                ];
                if (req.status === 'PENDING' && canApprove) {
                  actions.push({
                    label: 'อนุมัติ',
                    color: 'text-emerald-600',
                    hoverBg: 'hover:bg-emerald-50',
                    icon: CheckCircleIcon,
                    onClick: () => openApprove(req),
                  });
                  actions.push({
                    label: 'ไม่อนุมัติ',
                    color: 'text-red-600',
                    hoverBg: 'hover:bg-red-50',
                    icon: XCircleIcon,
                    onClick: () => handleReject(req),
                  });
                }
                return actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.preventDefault();
                      action.onClick();
                    }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm ${action.color} ${action.hoverBg}`}
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                  </button>
                ));
              })()}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
