import React, { useMemo } from 'react';
import { Modal } from '../../common/Modal';
import {
  ProductReturn,
  Warehouse as WarehouseType,
  Product,
} from '@/src/types/entity/app.interface';
import { formatThaiDate } from '../../../utils/date';

interface ReturnDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnItem: ProductReturn | null;
  warehouses: WarehouseType[];
  products: Product[];
}

export const ReturnDetailsModal: React.FC<ReturnDetailsModalProps> = ({
  isOpen,
  onClose,
  returnItem,
  warehouses,
  products,
}) => {
  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w.name])),
    [warehouses]
  );
  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  if (!isOpen || !returnItem) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบคืนสินค้า: ${returnItem.id}`}
      size="4xl"
    >
      <div className="space-y-6">
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            ข้อมูลใบคืนสินค้า
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6 text-sm">
            <div>
              <dt className="font-medium text-slate-500">เลขที่เอกสาร</dt>
              <dd className="mt-1 text-slate-900 font-semibold">
                {returnItem.id}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">วันที่คืน</dt>
              <dd className="mt-1 text-slate-900">
                {formatThaiDate(returnItem.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ผู้สร้าง</dt>
              <dd className="mt-1 text-slate-900">{returnItem.createdBy}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">คืนจาก (รถ)</dt>
              <dd className="mt-1 text-slate-900">
                {warehouseMap.get(returnItem.fromWarehouseId)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">คืนเข้าคลัง</dt>
              <dd className="mt-1 text-slate-900">
                {warehouseMap.get(returnItem.toWarehouseId)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">อ้างอิงใบเบิก</dt>
              <dd className="mt-1 text-slate-900">
                {returnItem.withdrawalRefId || '-'}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            รายการสินค้าที่คืน
          </h4>
          <div className="overflow-hidden border border-slate-200 rounded-lg max-h-80 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    รหัสสินค้า
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    ชื่อสินค้า
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    จำนวน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    หน่วย
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    เหตุผล
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {returnItem.items.map((item, index) => {
                  const product = productMap.get(item.productId);
                  return (
                    <tr key={`${returnItem.id}-${item.productId}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {product?.id || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {product?.name || 'ไม่พบสินค้า'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {product?.unit || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
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


