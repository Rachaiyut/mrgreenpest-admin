import React, { useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { Transfer, Warehouse, Product } from '@/src/types/entity/app.interface';
import { TransferStatus } from '@/src/types/enums/inventory';
import { formatThaiDate } from '../../../utils/date';
import { StatusBadge } from '../../common/StatusBadge';

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

  const totalQuantity =
    transfer.items?.reduce(
      (sum, item) => sum + Number(item.qty || item.quantity || 0),
      0
    ) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="รายละเอียดใบโอนย้าย"
      size="4xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="text-sm text-slate-500">
            {/* Last updated or other info if available */}
          </div>
          <div className="flex justify-end gap-2">
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
        </div>
      }
    >
      <div className="space-y-6">
        {/* Document Header Info */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-slate-100">
            <div>
              <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                ใบโอนย้ายสินค้า
                <span className="text-sm font-normal text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full">
                  {transfer.code}
                </span>
              </h4>
              <p className="text-sm text-slate-500 mt-1">
                สร้างเมื่อ: {formatThaiDate(transfer.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={transfer.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {/* Source Warehouse */}
            <div className="bg-amber-50 p-3 rounded border border-amber-100">
              <p className="text-xs text-amber-600 mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                ต้นทาง (Source)
              </p>
              <p className="font-semibold text-amber-900 text-lg">
                {warehouseMap[transfer.from_warehouse_id] ||
                  (transfer as any).from_warehouse?.name ||
                  '-'}
              </p>
            </div>

            {/* Destination Warehouse */}
            <div className="bg-blue-50 p-3 rounded border border-blue-100">
              <p className="text-xs text-blue-600 mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                ปลายทาง (Destination)
              </p>
              <p className="font-semibold text-blue-900 text-lg">
                {warehouseMap[transfer.to_warehouse_id] ||
                  (transfer as any).to_warehouse?.name ||
                  '-'}
              </p>
            </div>
          </div>

          {transfer.remark && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">
                หมายเหตุ / เหตุผลการโอนย้าย
              </p>
              <p className="text-slate-700 italic">"{transfer.remark}"</p>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h4 className="font-bold text-slate-700 flex items-center gap-2">
              รายการสินค้า
              <span className="bg-white text-slate-600 text-xs px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                {transfer.items?.length || 0} รายการ
              </span>
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-sm font-semibold text-slate-600 uppercase w-16"
                  >
                    #
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase"
                  >
                    รหัสสินค้า
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase"
                  >
                    ชื่อสินค้า
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-sm font-semibold text-slate-600 uppercase w-32"
                  >
                    จำนวน
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-sm font-semibold text-slate-600 uppercase w-24"
                  >
                    หน่วย
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {transfer.items && transfer.items.length > 0 ? (
                  transfer.items.map((item, index) => {
                    const productId =
                      item.product_id || (item as any).productId;
                    const product = productMap.get(productId);
                    const qty = Number(item.qty || item.quantity || 0);
                    return (
                      <tr
                        key={`${transfer.id}-${productId}-${index}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center font-medium">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                          <div>{product?.code || 'N/A'}</div>
                          {product?.barcode && (
                            <div className="text-xs text-slate-400">
                              {product.barcode}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {product?.name || 'ไม่พบสินค้า'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-bold">
                          {qty.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">
                          {typeof product?.unit === 'object'
                            ? product.unit.name
                            : product?.unit || '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-slate-500 bg-slate-50/50"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <svg
                          className="w-12 h-12 text-slate-300 mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                        <p className="font-medium">
                          ไม่มีรายการสินค้าในใบโอนย้ายนี้
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold text-slate-700 border-t-2 border-slate-200">
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-4 text-right uppercase text-xs tracking-wider"
                  >
                    รวมจำนวนทั้งสิ้น
                  </td>
                  <td className="px-6 py-4 text-right text-blue-700 text-lg font-bold">
                    {totalQuantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    รายการ
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
