import React, { useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import {
  Requisition,
  RequisitionType,
  RequisitionStatus,
} from '@/src/types/entity/requisition.interface';
import { Warehouse } from '@/src/types/entity/inventory.interface';
import { Product } from '@/src/types/entity/product.interface';
import { formatThaiDate } from '../../../utils/date';
import { StatusBadge } from '../../common/StatusBadge';

interface RequisitionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: Requisition | null;
  warehouses: Warehouse[]; // For reference if needed
  products: Product[];
}

export const RequisitionDetailsModal: React.FC<
  RequisitionDetailsModalProps
> = ({
  isOpen,
  onClose,
  requisition,
  // warehouses,
  products,
}) => {
  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  if (!isOpen || !requisition) return null;

  const totalAmount = requisition.total_amount || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบเบิก: ${requisition.doc_no}`}
      size="4xl"
      footer={
        <div className="flex w-full justify-between items-center">
          <p className="text-lg font-semibold text-slate-800">
            {requisition.type === RequisitionType.EXPENSE && (
              <>
                ยอดรวมทั้งหมด:{' '}
                <span className="text-primary">
                  ฿
                  {totalAmount.toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </>
            )}
          </p>
          <Button variant="primary" type="button" onClick={onClose}>
            ปิด
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            ข้อมูลใบเบิก
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6 text-sm">
            <div>
              <dt className="font-medium text-slate-500">เลขที่เอกสาร</dt>
              <dd className="mt-1 text-slate-900 font-semibold">
                {requisition.doc_no}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ประเภท</dt>
              <dd className="mt-1 text-slate-900">{requisition.type}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">สถานะ</dt>
              <dd className="mt-1">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${
                                      requisition.status ===
                                        RequisitionStatus.APPROVED ||
                                      requisition.status ===
                                        RequisitionStatus.COMPLETED
                                        ? 'bg-green-100 text-green-800'
                                        : requisition.status ===
                                            RequisitionStatus.REJECTED
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                    }`}
                >
                  {requisition.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">วันที่เบิก</dt>
              <dd className="mt-1 text-slate-900">
                {formatThaiDate(requisition.request_date)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ผู้เบิก</dt>
              <dd className="mt-1 text-slate-900">
                {requisition.requester?.name || requisition.requester_id}
              </dd>
            </div>
            {requisition.warehouse && (
              <div>
                <dt className="font-medium text-slate-500">คลังสินค้า</dt>
                <dd className="mt-1 text-slate-900">
                  {requisition.warehouse.name}
                </dd>
              </div>
            )}
            {requisition.description && (
              <div className="md:col-span-3">
                <dt className="font-medium text-slate-500">
                  รายละเอียดเพิ่มเติม
                </dt>
                <dd className="mt-1 text-slate-900 bg-slate-50 p-2 rounded-md">
                  {requisition.description}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Items Section */}
        {requisition.type === RequisitionType.ITEM && requisition.items && (
          <div>
            <h4 className="text-base font-semibold text-slate-800 mb-3">
              รายการสินค้า
            </h4>
            <div className="overflow-hidden border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
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
                      หมายเหตุ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {requisition.items.map((item, index) => {
                    const product =
                      productMap.get(item.product_id) || item.product;
                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {product?.name || item.product_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.quantity} {product?.unit?.name || ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {item.remark || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expenses Section */}
        {requisition.type === RequisitionType.EXPENSE &&
          requisition.expenses && (
            <div>
              <h4 className="text-base font-semibold text-slate-800 mb-3">
                รายการค่าใช้จ่าย
              </h4>
              <div className="overflow-hidden border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                        ลำดับ
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase">
                        รายละเอียด
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600 uppercase">
                        จำนวนเงิน
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {requisition.expenses.map((exp, index) => (
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
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {/* Approval History */}
        {requisition.approvals && requisition.approvals.length > 0 && (
          <div>
            <h4 className="text-base font-semibold text-slate-800 mb-3">
              ประวัติการอนุมัติ
            </h4>
            <div className="space-y-4">
              {requisition.approvals
                .sort((a, b) => a.step - b.step)
                .map((approval) => (
                  <div
                    key={approval.id}
                    className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex-shrink-0 pt-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          approval.status === 'APPROVED'
                            ? 'bg-green-500'
                            : approval.status === 'REJECTED'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                        }`}
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between">
                        <p className="font-medium text-sm text-slate-900">
                          Step {approval.step}: {approval.role}
                        </p>
                        <span
                          className={`text-xs font-semibold ${
                            approval.status === 'APPROVED'
                              ? 'text-green-600'
                              : approval.status === 'REJECTED'
                                ? 'text-red-600'
                                : 'text-yellow-600'
                          }`}
                        >
                          {approval.status}
                        </span>
                      </div>
                      {approval.approved_at && (
                        <p className="text-xs text-slate-500 mt-1">
                          เมื่อ: {formatThaiDate(approval.approved_at)} โดย{' '}
                          {approval.approver?.name ||
                            approval.approved_by ||
                            '-'}
                        </p>
                      )}
                      {approval.remark && (
                        <p className="text-sm text-slate-600 mt-2 bg-white p-2 rounded border">
                          Remark: {approval.remark}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
