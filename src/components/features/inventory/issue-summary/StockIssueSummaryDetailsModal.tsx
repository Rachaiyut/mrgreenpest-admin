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

  // ตัด INCOME (refund record ที่ระบบสร้างขึ้นตอนยกเลิก) ออก — แสดงเฉพาะค่าใช้จ่ายจริง
  const rawExpenseEntries = (summary.expense_items || summary.expense_item || []) as Array<{
    id?: string;
    description?: string;
    amount?: number | string;
    type?: string;
  }>;
  const expenseItems = rawExpenseEntries.filter(
    (e) => String(e.type || 'EXPENSE').toUpperCase() !== 'INCOME',
  );
  const totalExpenseAmount = expenseItems.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0,
  );
  const shortId = (summary.id as string)?.slice(0, 8) || '-';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบเบิก: ${shortId}`}
      size="4xl"
      footer={
        <div className="flex w-full justify-end items-center gap-2">
          {isPending && (needStockApproval || needExpenseApproval) && needStockApproval && canApproveStock && needExpenseApproval && canApproveExpense && (
            <Button
              type="button"
              variant="primary"
              disabled={submitting}
              onClick={() => confirmApprove()}
              className="!bg-primary hover:!bg-primary/90"
            >
              ✓ อนุมัติทั้งหมด
            </Button>
          )}
          <Button variant="primary" type="button" onClick={onClose}>
            ปิด
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ข้อมูลใบเบิก */}
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">ข้อมูลใบเบิก</h4>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6 text-sm">
            <div>
              <dt className="font-medium text-slate-500">เลขที่ใบเบิก</dt>
              <dd className="mt-1 text-slate-900 font-semibold font-mono" title={summary.id as string}>
                #{shortId}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">สถานะใบ</dt>
              <dd className="mt-1">
                {(() => {
                  // ใช้ mapping เดียวกับหน้าตาราง IssueSummary (ภาษาไทย + สี)
                  const map: Record<string, { text: string; cls: string }> = {
                    DRAFT: { text: 'ฉบับร่าง', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
                    PENDING: { text: 'รออนุมัติ', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
                    CANCELLED: { text: 'ยกเลิก', cls: 'bg-red-100 text-red-700 border-red-200' },
                    APPROVED: { text: 'อนุมัติแล้ว', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
                    COMPLETED: { text: 'เสร็จสิ้น', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                  };
                  const entry = map[summaryStatus] || { text: summary.status || '-', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
                  return (
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${entry.cls}`}>
                      {entry.text}
                    </span>
                  );
                })()}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">วันที่สร้าง</dt>
              <dd className="mt-1 text-slate-900">
                {summary.created_at ? formatThaiDate(summary.created_at) : '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">คลัง/รถ</dt>
              <dd className="mt-1 text-slate-900">
                {warehouseMap.get(summary.warehouse_id)?.name || '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ผู้เบิก</dt>
              <dd className="mt-1 text-slate-900">
                {summary.requester_id ? userMap.get(summary.requester_id) || '-' : '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ผู้สร้าง</dt>
              <dd className="mt-1 text-slate-900">
                {summary.created_by ? userMap.get(summary.created_by) || '-' : '-'}
              </dd>
            </div>
            {summary.notes && (
              <div className="md:col-span-3">
                <dt className="font-medium text-slate-500">หมายเหตุ</dt>
                <dd className="mt-1 text-slate-900 bg-slate-50 p-2 rounded-md whitespace-pre-wrap">
                  {summary.notes}
                </dd>
              </div>
            )}
            {summary.over_limit_reason && (
              <div className="md:col-span-3">
                <dt className="font-medium text-amber-600">เหตุผลเกินลิมิต</dt>
                <dd className="mt-1 text-amber-800 bg-amber-50 p-2 rounded-md">
                  {summary.over_limit_reason}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* สถานะการอนุมัติ */}
        {(stockApproval || expenseApproval) && (
          <div>
            <h4 className="text-base font-semibold text-slate-800 mb-3">สถานะการอนุมัติ</h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
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
          </div>
        )}

        {/* รายการสินค้า */}
        {summary.items && summary.items.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-base font-semibold text-slate-800">
                รายการสินค้า/อุปกรณ์ที่เบิก
              </h4>
            </div>
            <div className="overflow-hidden border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">ลำดับ</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">สินค้า</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">จำนวน</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">หน่วย</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600 uppercase">มูลค่า (บาท)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {summary.items.map((item, index) => {
                    const product = productMap.get(item.product_id);
                    const total = getUnitValue(product) * item.quantity;
                    return (
                      <tr key={item.id || index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{index + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          <div>{item.product_name || product?.name || 'ไม่พบสินค้า'}</div>
                          {product?.code && (
                            <div className="text-xs text-slate-500 font-mono">{product.code}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {item.unit || product?.unit?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                          {total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={4} className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                      รวมค่าสินค้า/อุปกรณ์
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                      {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* รายการค่าใช้จ่ายเพิ่มเติม */}
        {expenseItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-base font-semibold text-slate-800">
                รายการค่าใช้จ่ายเพิ่มเติม
              </h4>
            </div>
            <div className="overflow-hidden border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">ลำดับ</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">รายการ</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600 uppercase">จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {expenseItems.map((e, index) => (
                    <tr key={e.id || index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{e.description || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                        {Number(e.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={2} className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                      รวมค่าใช้จ่ายเพิ่มเติม
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                      {totalExpenseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Per-category approve/reject actions */}
        {isPending && (needStockApproval || needExpenseApproval) && (
          <div className="flex flex-col gap-3">
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
          </div>
        )}
      </div>
    </Modal>
  );
};

export { StockIssueSummaryDetailsModal };
