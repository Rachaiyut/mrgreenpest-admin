import React, { useMemo } from 'react';
import { Modal } from '../../../common/Modal';
import { Button } from '../../../common/FormControls';
import {
  Withdrawal,
  Warehouse as WarehouseType,
  Product,
  User,
} from '@/src/types/entity/app.interface';
import { formatThaiDate } from '../../../../utils/date';
import { StatusBadge } from '../../../common/StatusBadge';

interface WithdrawalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawal: Withdrawal | null;
  warehouses: WarehouseType[];
  products: Product[];
  users?: User[];
}

export const WithdrawalDetailsModal: React.FC<WithdrawalDetailsModalProps> = ({
  isOpen,
  onClose,
  withdrawal,
  warehouses,
  products,
  users = [],
}) => {
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

  const fromWarehouse = withdrawal
    ? warehouseMap.get(withdrawal.warehouse_id)
    : undefined;
  const toWarehouse =
    withdrawal && withdrawal.to_warehouse_id
      ? warehouseMap.get(withdrawal.to_warehouse_id)
      : null;

  const totalGoodsAmount = useMemo(
    () =>
      (withdrawal?.items || []).reduce((sum, item) => {
        const product = productMap.get(item.product_id);
        return sum + (product ? product.price * item.quantity : 0);
      }, 0),
    [withdrawal?.items, productMap]
  );

  const totalExpenseAmount = useMemo(
    () =>
      withdrawal?.expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) ||
      0,
    [withdrawal?.expenses]
  );

  const grandTotal = totalGoodsAmount + totalExpenseAmount;

  if (!isOpen || !withdrawal) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบเบิก: ${withdrawal.code || withdrawal.id || 'N/A'}`}
      size="4xl"
      footer={
        <div className="flex w-full justify-between items-center">
          <p className="text-lg font-semibold text-slate-800">
            ยอดรวมทั้งหมด:{' '}
            <span className="text-primary">
              {grandTotal.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}บาท
            </span>
          </p>
          <Button variant="primary" type="button" onClick={onClose}>
            ปิด
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            ข้อมูลใบเบิก
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6 text-sm">
            <div>
              <dt className="font-medium text-slate-500">เลขที่ใบเบิก</dt>
              <dd className="mt-1 text-slate-900 font-semibold">
                {withdrawal.code || '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">สถานะใบ</dt>
              <dd className="mt-1">
                <StatusBadge status={withdrawal.lifecycle} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">สถานะสินค้า</dt>
              <dd className="mt-1">
                {(withdrawal.items || []).length > 0 ? (
                  <StatusBadge status={(withdrawal.items || [])[0]?.status || 'PENDING'} />
                ) : (
                  <span className="text-slate-400 text-xs">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">สถานะค่าใช้จ่าย</dt>
              <dd className="mt-1">
                {(withdrawal.expenses || []).length > 0 ? (
                  <StatusBadge status={(withdrawal.expenses || [])[0]?.status || 'PENDING'} />
                ) : (
                  <span className="text-slate-400 text-xs">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">วันที่สร้าง</dt>
              <dd className="mt-1 text-slate-900">
                {withdrawal.created_at
                  ? formatThaiDate(withdrawal.created_at)
                  : '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">เบิกจากคลัง</dt>
              <dd className="mt-1 text-slate-900">{fromWarehouse?.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ไปยังคลัง/รถ</dt>
              <dd className="mt-1 text-slate-900">
                {toWarehouse?.name || '-'}
              </dd>
            </div>
            <div className="md:col-span-3">
              <dt className="font-medium text-slate-500">เลขที่อ้างอิง</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {withdrawal.reference_ids &&
                Array.isArray(withdrawal.reference_ids) &&
                withdrawal.reference_ids.length > 0 ? (
                  withdrawal.reference_ids.map((id) => (
                    <span
                      key={id}
                      className="px-2 py-1 bg-slate-200 text-slate-800 text-xs font-medium rounded-md"
                    >
                      {id}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-900">-</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ผู้เบิก</dt>
              <dd className="mt-1 text-slate-900">
                {withdrawal.requester_id
                  ? userMap.get(withdrawal.requester_id) || '-'
                  : '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ผู้รับเงิน</dt>
              <dd className="mt-1 text-slate-900">
                {withdrawal.recipient_id
                  ? userMap.get(withdrawal.recipient_id) || '-'
                  : '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ผู้สร้าง</dt>
              <dd className="mt-1 text-slate-900">
                {(() => {
                  const creator = (withdrawal as Withdrawal & {
                    creator?: { first_name?: string; last_name?: string; nick_name?: string };
                  }).creator;
                  if (creator?.first_name) {
                    return `${creator.first_name} ${creator.last_name || ''}`.trim();
                  }
                  const fromMap = withdrawal.created_by ? userMap.get(withdrawal.created_by) : null;
                  if (fromMap) return fromMap;
                  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(
                    withdrawal.created_by || '',
                  );
                  return looksLikeUuid ? 'ไม่กรอก' : withdrawal.created_by || '-';
                })()}
              </dd>
            </div>
            {/* 
            {withdrawal.approvedBy && (
              <div>
                <dt className="font-medium text-slate-500">ผู้อนุมัติ</dt>
                <dd className="mt-1 text-slate-900">{withdrawal.approvedBy}</dd>
              </div>
            )}
             */}
            {withdrawal.notes && (
              <div className="md:col-span-3">
                <dt className="font-medium text-slate-500">หมายเหตุ</dt>
                <dd className="mt-1 text-slate-900 bg-slate-50 p-2 rounded-md">
                  {withdrawal.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            รายการสินค้า/อุปกรณ์ที่เบิก
          </h4>
          <div className="overflow-hidden border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                    สินค้า
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                    จำนวน
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                    หน่วย
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600 uppercase">
                    มูลค่า (บาท)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {(withdrawal.items || []).length > 0 ? (
                  (withdrawal.items || []).map((item, index) => {
                    const product = productMap.get(item.product_id);
                    const total = product ? product.price * item.quantity : 0;
                    return (
                      <tr key={`${withdrawal.id}-${item.product_id}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          <div>{product?.name || 'ไม่พบสินค้า'}</div>
                          {product?.code && (
                            <div className="text-xs text-slate-500 font-mono">
                              {product.code}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {product?.unit?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                          {total.toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-center text-sm text-slate-500"
                    >
                      ไม่มีรายการสินค้า
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-3 text-right text-sm font-medium text-slate-900"
                  >
                    รวมค่าสินค้า/อุปกรณ์
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                    {totalGoodsAmount.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {withdrawal.expenses && withdrawal.expenses.length > 0 && (
          <div>
            <h4 className="text-base font-semibold text-slate-800 mb-3">
              รายการค่าใช้จ่ายเพิ่มเติม
            </h4>
            <div className="overflow-hidden border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                      ลำดับ
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                      รายการ
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600 uppercase">
                      จำนวนเงิน (บาท)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {withdrawal.expenses.map((exp, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {exp.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                        {exp.amount.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td
                      colSpan={2}
                      className="px-6 py-3 text-right text-sm font-medium text-slate-900"
                    >
                      รวมค่าใช้จ่ายเพิ่มเติม
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                      {totalExpenseAmount.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
