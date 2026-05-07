import React, { useMemo } from 'react';
import { Modal } from '../../../common/Modal';
import { Button } from '../../../common/FormControls';
import {
  GoodsReceive as GoodsReceiveType,
  Warehouse as WarehouseType,
  Product,
} from '@/src/types/entity/app.interface';
import { formatThaiDate } from '../../../../utils/date';
import { StatusBadge } from '../../../common/StatusBadge';

interface GoodsReceiptDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: GoodsReceiveType | null;
  warehouses: WarehouseType[];
  products: Product[];
}

export const GoodsReceiptDetailsModal: React.FC<
  GoodsReceiptDetailsModalProps
> = ({ isOpen, onClose, receipt, warehouses, products }) => {
  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w.name])),
    [warehouses]
  );

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  if (!isOpen || !receipt) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = receipt as unknown as Record<string, any>;

  const code = r.code || r.id;
  const warehouseName = r.warehouse?.name || warehouseMap.get(r.warehouse_id) || '-';
  const supplierName = r.supplier?.name || r.supplier_name || '-';

  const totalQuantity =
    r.items?.reduce((sum: number, item: { qty_received?: number; quantity?: number }) => {
      const qty = Number((item.qty_received ?? item.quantity) || 0);
      return sum + qty;
    }, 0) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบรับเข้า: ${code}`}
      size="5xl"
      footer={
        <Button variant="primary" type="button" onClick={onClose}>
          ปิด
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Section 1: ข้อมูลใบรับเข้า */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-base font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">
            ข้อมูลใบรับเข้า
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">เลขที่ใบรับเข้า</dt>
              <dd className="mt-1 text-slate-900 font-semibold">{code}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">เลขที่อ้างอิง</dt>
              <dd className="mt-1 text-slate-900">{r.receipt_no || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">วันที่</dt>
              <dd className="mt-1 text-slate-900">
                {formatThaiDate(r.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">สถานะ</dt>
              <dd className="mt-1">
                <StatusBadge status={r.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">คลังสินค้า</dt>
              <dd className="mt-1 text-slate-900">{warehouseName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">ผู้จัดจำหน่าย</dt>
              <dd className="mt-1 text-slate-900">{supplierName}</dd>
            </div>
          </dl>
          <div className="mt-4 text-sm">
            <dt className="text-xs font-medium text-slate-500">หมายเหตุ</dt>
            <dd className="mt-1 text-slate-900 whitespace-pre-wrap">
              {r.remarks || '-'}
            </dd>
          </div>
        </section>

        {/* Section 2: รายการสินค้า */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-base font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">
            รายการสินค้า
          </h4>
          <div className="overflow-hidden border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase w-16">ลำดับ</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase">รหัสสินค้า</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase">ชื่อสินค้า</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase">จำนวน</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 uppercase">หน่วย</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {r.items && r.items.length > 0 ? (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  r.items.map((item: any, index: number) => {
                    const productDesc = item.product || productMap.get(item.product_id);
                    const qty = Number((item.qty_received ?? item.quantity) || 0);
                    const unitText = (() => {
                      const u = productDesc?.unit as { name?: string } | string | undefined;
                      if (typeof u === 'string') return u;
                      if (u && typeof u === 'object' && u.name) return u.name;
                      return '-';
                    })();
                    return (
                      <tr key={index} className="hover:bg-slate-50 [&>td]:align-top">
                        <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {productDesc?.code || '-'}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {productDesc?.name || 'ไม่พบสินค้า'}
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
                      ไม่มีรายการสินค้า
                    </td>
                  </tr>
                )}
              </tbody>
              {r.items && r.items.length > 0 && (
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
