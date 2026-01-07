import React, { useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import {
  Withdrawal,
  Warehouse as WarehouseType,
  Product,
} from '../../../types';
import { formatThaiDate } from '../../../constants';
import { StatusBadge } from '../../common/StatusBadge';

interface WithdrawalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawal: Withdrawal | null;
  warehouses: WarehouseType[];
  products: Product[];
}

export const WithdrawalDetailsModal: React.FC<WithdrawalDetailsModalProps> = ({
  isOpen,
  onClose,
  withdrawal,
  warehouses,
  products,
}) => {
  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w])),
    [warehouses]
  );
  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  if (!isOpen || !withdrawal) return null;

  const fromWarehouse = warehouseMap.get(withdrawal.fromWarehouseId);
  const toWarehouse = withdrawal.toWarehouseId
    ? warehouseMap.get(withdrawal.toWarehouseId)
    : null;

  const totalGoodsAmount = useMemo(
    () =>
      withdrawal.items.reduce((sum, item) => {
        const product = productMap.get(item.productId);
        return sum + (product ? product.price * item.quantity : 0);
      }, 0),
    [withdrawal.items, productMap]
  );

  const totalExpenseAmount = useMemo(
    () => withdrawal.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0,
    [withdrawal.expenses]
  );

  const grandTotal = totalGoodsAmount + totalExpenseAmount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบเบิก: ${withdrawal.id}`}
      size="4xl"
      footer={
        <div className="flex w-full justify-between items-center">
          <p className="text-lg font-semibold text-slate-800">
            ยอดรวมทั้งหมด:{' '}
            <span className="text-primary">
              ฿
              {grandTotal.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
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
                {withdrawal.id}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">สถานะ</dt>
              <dd className="mt-1">
                <StatusBadge status={withdrawal.status} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">วันที่สร้าง</dt>
              <dd className="mt-1 text-slate-900">
                {formatThaiDate(withdrawal.createdAt)}
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
                {withdrawal.referenceIds &&
                withdrawal.referenceIds.length > 0 ? (
                  withdrawal.referenceIds.map((id) => (
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
              <dt className="font-medium text-slate-500">ผู้สร้าง</dt>
              <dd className="mt-1 text-slate-900">{withdrawal.createdBy}</dd>
            </div>
            {withdrawal.approvedBy && (
              <div>
                <dt className="font-medium text-slate-500">ผู้อนุมัติ</dt>
                <dd className="mt-1 text-slate-900">{withdrawal.approvedBy}</dd>
              </div>
            )}
            {withdrawal.remarks && (
              <div className="md:col-span-3">
                <dt className="font-medium text-slate-500">หมายเหตุ</dt>
                <dd className="mt-1 text-slate-900 bg-slate-50 p-2 rounded-md">
                  {withdrawal.remarks}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    สินค้า
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    จำนวน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    หน่วย
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                    มูลค่า (บาท)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {withdrawal.items.length > 0 ? (
                  withdrawal.items.map((item, index) => {
                    const product = productMap.get(item.productId);
                    const total = product ? product.price * item.quantity : 0;
                    return (
                      <tr key={`${withdrawal.id}-${item.productId}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          <div>{product?.name || item.productId}</div>
                          <div className="text-xs text-slate-500">
                            {product?.id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {product?.unit || '-'}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      ลำดับ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      รายการ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
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
