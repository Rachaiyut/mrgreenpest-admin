import React, { useMemo } from 'react';
import { Modal } from '../../../common/Modal';
import { Button } from '../../../common/FormControls';
import { Transfer, Warehouse, Product } from '@/src/types/entity/app.interface';
import { TransferStatus } from '@/src/types/enums/inventory';
import { formatThaiDate } from '../../../../utils/date';
import { StatusBadge } from '../../../common/StatusBadge';

interface TransferDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: Transfer | null;
  warehouses: Warehouse[];
  products: Product[];
  onApprove?: (transfer: Transfer) => void;
}

export const TransferDetailsModal: React.FC<TransferDetailsModalProps> = ({
  isOpen,
  onClose,
  transfer,
  warehouses,
  products,
  onApprove,
}) => {
  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w.name])),
    [warehouses]
  );

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  if (!isOpen || !transfer) return null;

  const fromWarehouse =
    warehouseMap.get(transfer.from_warehouse_id) ||
    (transfer as unknown as Record<string, Record<string, string>>).from_warehouse?.name ||
    '-';
  const toWarehouse =
    warehouseMap.get(transfer.to_warehouse_id) ||
    (transfer as unknown as Record<string, Record<string, string>>).to_warehouse?.name ||
    '-';

  const totalQuantity =
    transfer.items?.reduce(
      (sum, item) => sum + Number(item.qty || item.quantity || 0),
      0
    ) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบโอนย้าย: ${transfer.code || transfer.id}`}
      size="5xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" type="button" onClick={onClose}>
            ปิด
          </Button>
          {transfer.status === TransferStatus.PENDING && onApprove && (
            <Button
              variant="primary"
              onClick={() => {
                onApprove(transfer);
                onClose();
              }}
            >
              อนุมัติ
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Section 1: ข้อมูลใบโอนย้าย */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-base font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">
            ข้อมูลใบโอนย้าย
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">เลขที่เอกสาร</dt>
              <dd className="mt-1 text-slate-900 font-semibold">
                {transfer.code || transfer.id}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">วันที่</dt>
              <dd className="mt-1 text-slate-900">
                {formatThaiDate(transfer.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">สถานะ</dt>
              <dd className="mt-1">
                <StatusBadge status={transfer.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">คลังต้นทาง</dt>
              <dd className="mt-1 text-slate-900">{fromWarehouse}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">คลังปลายทาง</dt>
              <dd className="mt-1 text-slate-900">{toWarehouse}</dd>
            </div>
          </dl>
          <div className="mt-4 text-sm">
            <dt className="text-xs font-medium text-slate-500">เหตุผล / หมายเหตุ</dt>
            <dd className="mt-1 text-slate-900 whitespace-pre-wrap">
              {transfer.remark || '-'}
            </dd>
          </div>
        </section>

        {/* Section 2: รายการสินค้า */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-base font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">
            รายการสินค้า
          </h4>
          <div className="overflow-hidden border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200 text-center">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase w-16">
                    ลำดับ
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase">
                    รหัสสินค้า
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase">
                    ชื่อสินค้า
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase">
                    จำนวน
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase">
                    หน่วย
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {transfer.items && transfer.items.length > 0 ? (
                  transfer.items.map((item, index) => {
                    const productId =
                      item.product_id || (item as unknown as Record<string, string>).productId;
                    const product = productMap.get(productId);
                    const qty = Number(item.qty || item.quantity || 0);
                    const unitText = (() => {
                      const u = product?.unit as { name?: string } | string | undefined;
                      if (typeof u === 'string') return u;
                      if (u && typeof u === 'object' && u.name) return u.name;
                      return '-';
                    })();
                    return (
                      <tr
                        key={`${transfer.id}-${productId}-${index}`}
                        className="hover:bg-slate-50 [&>td]:align-middle"
                      >
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {product?.code || 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {product?.name || 'ไม่พบสินค้า'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {qty.toLocaleString('th-TH')}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{unitText}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      ไม่มีรายการสินค้าในใบโอนย้ายนี้
                    </td>
                  </tr>
                )}
              </tbody>
              {transfer.items && transfer.items.length > 0 && (
                <tfoot className="bg-slate-50 font-semibold text-slate-700 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right uppercase text-xs tracking-wider">
                      รวมจำนวนทั้งสิ้น
                    </td>
                    <td className="px-4 py-3 text-blue-700 text-base font-bold">
                      {totalQuantity.toLocaleString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">รายการ</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      </div>
    </Modal>
  );
};
