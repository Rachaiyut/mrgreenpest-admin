import React, { useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import {
  StockAdjustment,
  Warehouse as WarehouseType,
  Product,
} from '@/src/libs/common/interface/entity/app.interface';
import { formatThaiDate } from '../../../constants';

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบปรับปรุง Stock: ${adjustment.id}`}
      size="5xl"
      footer={
        <Button variant="primary" type="button" onClick={onClose}>
          ปิด
        </Button>
      }
    >
      <div className="space-y-6">
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            ข้อมูลใบปรับปรุง
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6 text-sm">
            <div>
              <dt className="font-medium text-slate-500">เลขที่เอกสาร</dt>
              <dd className="mt-1 text-slate-900 font-semibold">
                {adjustment.id}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">วันที่</dt>
              <dd className="mt-1 text-slate-900">
                {formatThaiDate(adjustment.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">สถานะ</dt>
              <dd className="mt-1 text-slate-900">{adjustment.status}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">คลังสินค้า</dt>
              <dd className="mt-1 text-slate-900">
                {warehouseMap.get(adjustment.warehouseId)}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            รายละเอียดการปรับปรุงสินค้า
          </h4>
          <div className="overflow-hidden border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    สินค้า
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                    จำนวนเดิม
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                    จำนวนใหม่
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                    ผลต่าง
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                    หน่วย
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    เหตุผล
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {adjustment.items.map((item) => {
                  const product = productMap.get(item.productId);
                  const difference =
                    item.adjustedQuantity - item.originalQuantity;
                  return (
                    <tr key={item.productId}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {product?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-600">
                          {product?.id || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        {item.originalQuantity}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-800">
                        {item.adjustedQuantity}
                      </td>
                      <td
                        className={`px-4 py-3 text-center font-semibold ${difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-slate-700'}`}
                      >
                        {difference > 0 ? `+${difference}` : difference}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        {product?.unit}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.reason || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
