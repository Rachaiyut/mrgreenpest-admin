import React, { useMemo } from 'react';
import { Modal } from '../../../common/Modal';
import { Button } from '../../../common/FormControls';
import {
  StockAdjustment,
  Warehouse as WarehouseType,
  Product,
} from '@/src/types/entity/app.interface';
import { formatThaiDate } from '../../../../utils/date';

interface StockAdjustmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustment: StockAdjustment | null;
  warehouses: WarehouseType[];
  products: Product[];
}

export const StockAdjustmentDetailsModal: React.FC<
  StockAdjustmentDetailsModalProps
> = ({ isOpen, onClose, adjustment, warehouses, products }) => {
  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w.name])),
    [warehouses]
  );
  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  if (!isOpen || !adjustment) return null;

  const code =
    (adjustment as { adjustment_code?: string }).adjustment_code || adjustment.id;
  const warehouseName =
    (adjustment as { warehouse?: { name?: string } }).warehouse?.name ||
    warehouseMap.get(adjustment.warehouse_id) ||
    '-';
  const creator = (adjustment as {
    created_by_user?: { first_name?: string; last_name?: string; nick_name?: string };
  }).created_by_user;
  const creatorName = (() => {
    if (!creator) return 'ไม่กรอก';
    const fullName = `${creator.first_name || ''} ${creator.last_name || ''}`.trim();
    return fullName || creator.nick_name || 'ไม่กรอก';
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบปรับปรุงสต็อก: ${code}`}
      size="5xl"
      footer={
        <Button variant="primary" type="button" onClick={onClose}>
          ปิด
        </Button>
      }
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-base font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">
            ข้อมูลใบปรับปรุง
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">เลขที่เอกสาร</dt>
              <dd className="mt-1 text-slate-900 font-semibold">{code}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">วันที่</dt>
              <dd className="mt-1 text-slate-900">
                {formatThaiDate(adjustment.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">สถานะ</dt>
              <dd className="mt-1 text-slate-900">{adjustment.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">คลังสินค้า</dt>
              <dd className="mt-1 text-slate-900">{warehouseName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">ผู้สร้าง</dt>
              <dd className="mt-1 text-slate-900">{creatorName}</dd>
            </div>
          </dl>
          <div className="mt-4 text-sm">
            <dt className="text-xs font-medium text-slate-500">เหตุผลหลัก</dt>
            <dd className="mt-1 text-slate-900 whitespace-pre-wrap">
              {adjustment.reason || '-'}
            </dd>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-base font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">
            รายละเอียดการปรับปรุงสินค้า
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
                    สินค้า
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase">
                    จำนวนเดิม
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase">
                    จำนวนใหม่
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase">
                    ผลต่าง
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase">
                    หน่วย
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {adjustment.items.map((item, i) => {
                  const product = productMap.get(item.product_id);
                  const difference = Number(item.qty_adjustment || 0);
                  const unitText = (() => {
                    const u = product?.unit as { name?: string } | string | undefined;
                    if (typeof u === 'string') return u;
                    if (u && typeof u === 'object' && u.name) return u.name;
                    return '-';
                  })();
                  return (
                    <tr key={item.product_id || i} className="[&>td]:align-middle">
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {product?.code || '-'}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {product?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.qty_before}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {item.qty_after}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-slate-700'}`}
                      >
                        {difference > 0 ? `+${difference}` : difference}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {unitText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Modal>
  );
};
