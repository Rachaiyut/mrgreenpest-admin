import React, { useMemo, useState } from 'react';
import Swal from '@/src/utils/swal';
import { Modal } from '../../../common/Modal';
import { Button } from '../../../common/FormControls';
import { formatThaiDate } from '../../../../utils/date';
import { usePermissions } from '@/src/hooks/usePermissions';
import { StockIssueSummaryApi } from '@/src/api/stock-issue-summary';
import {
  StockIssueSummary,
  Warehouse,
  ApprovalHistoryEntry,
} from '@/src/types/entity/inventory.interface';
import { Product } from '@/src/types/entity/product.interface';

interface StockIssueSummaryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: StockIssueSummary | null;
  warehouses: Warehouse[];
  products: Product[];
  users: { id: string; name: string; first_name?: string; last_name?: string; nick_name?: string }[];
  onActionDone?: () => void;
}

const StockIssueSummaryDetailsModal: React.FC<StockIssueSummaryDetailsModalProps> = ({
  isOpen,
  onClose,
  summary,
  warehouses,
  products,
  users,
  onActionDone,
}) => {
  const { hasPermission } = usePermissions();
  const canApproveStock =
    hasPermission('APPROVE_ISSUE_SUMMARY') ||
    hasPermission('APPROVE_STOCK_ISSUE_SUMMARY');
  const canApproveExpense =
    hasPermission('APPROVE_ISSUE_SUMMARY') ||
    hasPermission('APPROVE_EXPENSE_ISSUE_SUMMARY');
  const [submitting, setSubmitting] = useState(false);

  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w])),
    [warehouses]
  );
  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );
  const userMap = useMemo(
    () =>
      new Map(
        users.map((u) => {
          let name = u.name;
          if (typeof name !== 'string' || name === '[object Object]') {
            name =
              `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
              u.nick_name ||
              'Unknown';
          }
          return [u.id, name];
        })
      ),
    [users]
  );

  // ราคาต่อหน่วย — ใช้ cost_price ก่อน (ราคาทุน = มูลค่าสต๊อกที่ถูกหัก) → fallback ไป price
  const getUnitValue = (product?: { price?: number; cost_price?: number }) =>
    Number(product?.cost_price || product?.price || 0);

  const totalAmount = useMemo(() => {
    if (!summary?.items) return 0;
    return summary.items.reduce((sum, item) => {
      const product = productMap.get(item.product_id);
      return sum + getUnitValue(product) * item.quantity;
    }, 0);
  }, [summary?.items, productMap]);

  if (!summary) return null;

  const stockApproval: ApprovalHistoryEntry | undefined = summary.approvals?.find(
    (a) => a.category === 'STOCK',
  );
  const expenseApproval: ApprovalHistoryEntry | undefined = summary.approvals?.find(
    (a) => a.category === 'EXPENSE',
  );
  const needStockApproval = !!stockApproval && stockApproval.status === 'PENDING';
  const needExpenseApproval = !!expenseApproval && expenseApproval.status === 'PENDING';
  const summaryStatus = String(summary.status || '').toUpperCase();
  const isPending = summaryStatus === 'PENDING';

  const approverLabel = (entry?: ApprovalHistoryEntry) => {
    if (!entry || !entry.approver) return '';
    const a = entry.approver;
    return (
      [a.first_name, a.last_name].filter(Boolean).join(' ').trim() ||
      a.nick_name ||
      ''
    );
  };

  const StatusBadge = ({ entry }: { entry?: ApprovalHistoryEntry }) => {
    if (!entry) return <span className="text-xs text-slate-400">—</span>;
    const colorMap: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      VERIFIED: 'bg-blue-100 text-blue-700',
    };
    const labelMap: Record<string, string> = {
      PENDING: 'รออนุมัติ',
      APPROVED: 'อนุมัติแล้ว',
      REJECTED: 'ถูกปฏิเสธ',
      VERIFIED: 'ตรวจสอบแล้ว',
    };
    const cls = colorMap[entry.status] || 'bg-slate-100 text-slate-600';
    const txt = labelMap[entry.status] || entry.status;
    const approver = approverLabel(entry);
    const when = entry.approved_at ? formatThaiDate(entry.approved_at) : '';
    return (
      <div className="flex flex-col items-end">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{txt}</span>
        {approver && (
          <span className="text-[11px] text-slate-500 mt-0.5">
            โดย {approver}{when ? ` · ${when}` : ''}
          </span>
        )}
      </div>
    );
  };

  const runApprove = async (
    status: 'APPROVED' | 'REJECTED',
    category?: 'STOCK' | 'EXPENSE',
    remark?: string,
  ) => {
    try {
      setSubmitting(true);
      await StockIssueSummaryApi.approve(summary.id as string, {
        status,
        category,
        remark,
      });
      Swal.fire({
        icon: 'success',
        title: status === 'APPROVED' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว',
        timer: 1500,
        showConfirmButton: false,
      });
      onActionDone?.();
      onClose();
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถดำเนินการได้', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmApprove = async (category?: 'STOCK' | 'EXPENSE') => {
    const title =
      category === 'STOCK'
        ? 'อนุมัติเบิกสินค้า?'
        : category === 'EXPENSE'
          ? 'อนุมัติค่าใช้จ่าย?'
          : 'อนุมัติทั้งหมด?';
    const r = await Swal.fire({
      title,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
    });
    if (r.isConfirmed) await runApprove('APPROVED', category);
  };

  const confirmReject = async (category?: 'STOCK' | 'EXPENSE') => {
    const title =
      category === 'STOCK'
        ? 'ปฏิเสธเบิกสินค้า?'
        : category === 'EXPENSE'
          ? 'ปฏิเสธค่าใช้จ่าย?'
          : 'ปฏิเสธใบนี้?';
    const r = await Swal.fire({
      title,
      text: 'การปฏิเสธจะยกเลิกใบเบิกทั้งใบ',
      input: 'textarea',
      inputLabel: 'เหตุผลการปฏิเสธ',
      inputPlaceholder: 'กรอกเหตุผล...',
      showCancelButton: true,
      confirmButtonText: 'ปฏิเสธ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      inputValidator: (v) => (!v || !v.trim() ? 'กรุณากรอกเหตุผล' : null),
    });
    if (r.isConfirmed && r.value) await runApprove('REJECTED', category, r.value.trim());
  };

  const expenseItems = (summary.expense_items || summary.expense_item || []) as Array<{
    id?: string;
    description?: string;
    amount?: number | string;
  }>;
  const totalExpenseAmount = expenseItems.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0,
  );
  const shortId = (summary.id as string)?.slice(0, 8) || '-';
  const fmtMoney = (v: number) =>
    `${v.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} บาท`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="รายละเอียดใบเบิก">
      <div className="space-y-4 text-sm">
        {/* Header Info Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
            <div>
              <div className="text-xs text-slate-500 mb-0.5">เลขที่ใบเบิก</div>
              <div className="font-mono text-slate-800" title={summary.id as string}>
                #{shortId}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-0.5">วันที่สร้าง</div>
              <div className="text-slate-800">
                {summary.created_at ? formatThaiDate(summary.created_at) : '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-0.5">คลัง/รถ</div>
              <div className="text-slate-800">
                {warehouseMap.get(summary.warehouse_id)?.name || '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-0.5">ผู้เบิก</div>
              <div className="text-slate-800">
                {summary.requester_id ? userMap.get(summary.requester_id) || '-' : '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-0.5">ผู้สร้าง</div>
              <div className="text-slate-800">
                {summary.created_by ? userMap.get(summary.created_by) || '-' : '-'}
              </div>
            </div>
            {summary.items && summary.items.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-0.5">มูลค่าสินค้า</div>
                <div className="text-slate-800 font-semibold">
                  {fmtMoney(totalAmount)}
                </div>
              </div>
            )}
            {expenseItems.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-0.5">จำนวนเงินที่เบิก</div>
                <div className="text-slate-800 font-semibold">
                  {fmtMoney(totalExpenseAmount)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {summary.notes && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-500 mb-1">หมายเหตุ</div>
            <p className="text-slate-800 whitespace-pre-wrap">{summary.notes}</p>
          </div>
        )}

        {/* Approval Panel */}
        {(stockApproval || expenseApproval) && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-semibold text-slate-700">
              สถานะการอนุมัติ
            </div>
            <div className="divide-y divide-slate-100">
              {stockApproval && (
                <div className="flex items-center justify-between px-4 py-3 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded bg-emerald-500"></span>
                    <span className="font-medium text-slate-700">เบิกสินค้า/สารเคมี</span>
                  </div>
                  <StatusBadge entry={stockApproval} />
                </div>
              )}
              {expenseApproval && (
                <div className="flex items-center justify-between px-4 py-3 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded bg-amber-500"></span>
                    <span className="font-medium text-slate-700">ค่าใช้จ่าย</span>
                  </div>
                  <StatusBadge entry={expenseApproval} />
                </div>
              )}
            </div>
            {summary.over_limit_reason && (
              <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-800">
                <span className="font-semibold">เหตุผลเกินลิมิต:</span> {summary.over_limit_reason}
              </div>
            )}
          </div>
        )}

        {/* Items Table */}
        {summary.items && summary.items.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1 h-5 bg-emerald-500 rounded"></span>
              <h4 className="font-semibold text-slate-700">
                รายการสินค้า ({summary.items.length})
              </h4>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-xs [&>th]:font-semibold [&>th]:text-slate-600 [&>th]:uppercase">
                    <th className="text-left w-12">ลำดับ</th>
                    <th className="text-left">สินค้า</th>
                    <th className="text-left w-20">จำนวน</th>
                    <th className="text-left w-20">หน่วย</th>
                    <th className="text-right w-28">ราคา/หน่วย</th>
                    <th className="text-right w-28">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {summary.items.map((item, index) => {
                    const product = productMap.get(item.product_id);
                    const price = getUnitValue(product);
                    const itemTotal = price * item.quantity;
                    return (
                      <tr key={item.id || index} className="hover:bg-slate-50 [&>td]:px-3 [&>td]:py-2 [&>td]:text-slate-800">
                        <td className="text-center text-slate-500">{index + 1}</td>
                        <td>{item.product_name || product?.name || '-'}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-center text-slate-500">
                          {item.unit || product?.unit?.name || '-'}
                        </td>
                        <td className="text-right">{fmtMoney(price)}</td>
                        <td className="text-right font-medium">{fmtMoney(itemTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right text-slate-600 font-medium">
                      รวมมูลค่าสินค้า
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-800">
                      {fmtMoney(totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Expense Items */}
        {expenseItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1 h-5 bg-amber-500 rounded"></span>
              <h4 className="font-semibold text-slate-700">
                รายการค่าใช้จ่าย ({expenseItems.length})
              </h4>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-xs [&>th]:font-semibold [&>th]:text-slate-600 [&>th]:uppercase">
                    <th className="text-left w-12">ลำดับ</th>
                    <th className="text-left">รายการ</th>
                    <th className="text-right w-32">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {expenseItems.map((e, index) => (
                    <tr key={e.id || index} className="hover:bg-slate-50 [&>td]:px-3 [&>td]:py-2 [&>td]:text-slate-800">
                      <td className="text-center text-slate-500">{index + 1}</td>
                      <td>{e.description || '-'}</td>
                      <td className="text-right font-medium">{fmtMoney(Number(e.amount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right text-slate-600 font-medium">
                      รวมค่าใช้จ่าย
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-800">
                      {fmtMoney(totalExpenseAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 border-t">
          {isPending && (needStockApproval || needExpenseApproval) && (
            <>
              {needStockApproval && canApproveStock && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="flex-1 text-sm text-emerald-900 font-medium">
                    อนุมัติเบิกสินค้า/สารเคมี
                  </span>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={submitting}
                    onClick={() => confirmApprove('STOCK')}
                    className="!bg-emerald-600 hover:!bg-emerald-700 !py-1.5 !px-3 !text-xs"
                  >
                    ✓ อนุมัติ
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={submitting}
                    onClick={() => confirmReject('STOCK')}
                    className="!py-1.5 !px-3 !text-xs"
                  >
                    ✗ ปฏิเสธ
                  </Button>
                </div>
              )}
              {needExpenseApproval && canApproveExpense && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="flex-1 text-sm text-amber-900 font-medium">
                    อนุมัติค่าใช้จ่าย
                  </span>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={submitting}
                    onClick={() => confirmApprove('EXPENSE')}
                    className="!bg-amber-600 hover:!bg-amber-700 !py-1.5 !px-3 !text-xs"
                  >
                    ✓ อนุมัติ
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={submitting}
                    onClick={() => confirmReject('EXPENSE')}
                    className="!py-1.5 !px-3 !text-xs"
                  >
                    ✗ ปฏิเสธ
                  </Button>
                </div>
              )}
              {needStockApproval &&
                needExpenseApproval &&
                canApproveStock &&
                canApproveExpense && (
                  <Button
                    type="button"
                    variant="primary"
                    disabled={submitting}
                    onClick={() => confirmApprove()}
                    className="w-full !bg-primary hover:!bg-primary/90"
                  >
                    ✓ อนุมัติทั้งหมด (สินค้า + ค่าใช้จ่าย)
                  </Button>
                )}
            </>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              onClick={onClose}
              className="!bg-emerald-600 hover:!bg-emerald-700"
            >
              ปิด
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export { StockIssueSummaryDetailsModal };
