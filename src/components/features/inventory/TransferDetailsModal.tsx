import React, { useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { Transfer, Warehouse as WarehouseType, Product } from '@/src/types/entity/app.interface';
import { formatThaiDate } from '../../../constants';

interface TransferDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: Transfer | null;
  warehouses: WarehouseType[];
  products: Product[];
}

export const TransferDetailsModal: React.FC<TransferDetailsModalProps> = ({
  isOpen,
  onClose,
  transfer,
  warehouses,
  products,
}) => {
  const warehouseMap = useMemo(() => {
    return warehouses.reduce(
      (acc, wh) => {
        acc[wh.id] = wh.name;
        return acc;
      },
      {} as Record<string, string>
    );
  }, [warehouses]);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  if (!isOpen || !transfer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบโอนย้าย: ${transfer.id}`}
      size="4xl"
      footer={
        <Button variant="primary" type="button" onClick={onClose}>
          ปิด
        </Button>
      }
    >
      <div className="space-y-6">
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            ข้อมูลใบโอนย้าย
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6 text-sm">
            <div>
              <dt className="font-medium text-slate-500">เลขที่เอกสาร</dt>
              <dd className="mt-1 text-slate-900 font-semibold">
                {transfer.id}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">วันที่โอนย้าย</dt>
              <dd className="mt-1 text-slate-900">
                {formatThaiDate(transfer.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">สถานะ</dt>
              <dd className="mt-1 text-slate-900">{transfer.status}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">คลังต้นทาง</dt>
              <dd className="mt-1 text-slate-900">
                {warehouseMap[transfer.fromWarehouseId]}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">คลังปลายทาง</dt>
              <dd className="mt-1 text-slate-900">
                {warehouseMap[transfer.toWarehouseId]}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            รายการสินค้าในใบโอนย้าย
          </h4>
          <div className="overflow-hidden border border-slate-200 rounded-lg max-h-80 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                  >
                    รหัสสินค้า
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                  >
                    ชื่อสินค้า
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                  >
                    จำนวน
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                  >
                    หน่วย
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {transfer.items.length > 0 ? (
                  transfer.items.map((item, index) => {
                    const product = productMap.get(item.productId);
                    return (
                      <tr key={`${transfer.id}-${item.productId}`}>
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
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-10 text-slate-500"
                    >
                      ไม่มีรายการสินค้าในใบโอนย้ายนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
