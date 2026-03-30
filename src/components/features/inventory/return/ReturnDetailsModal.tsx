import React, { useMemo } from 'react';
import { Modal } from '../../../common/Modal';
import { Button } from '../../../common/FormControls';
import { StatusBadge } from '../../../common/StatusBadge';
import {
  ProductReturn,
  Warehouse as WarehouseType,
  Product,
} from '@/src/types/entity/app.interface';
import { formatThaiDate } from '../../../../utils/date';

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

  // Safe Cast or access for properties that might satisfy multiple interfaces or runtime variations
  const r = returnItem as any;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="รายละเอียดการคืนสินค้า"
      size="4xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="text-sm text-slate-500">
            {(r.updated_at || r.updatedAt) && (
              <span>
                แก้ไขล่าสุด: {formatThaiDate(r.updated_at || r.updatedAt)}
              </span>
            )}
          </div>
          <Button variant="primary" type="button" onClick={onClose}>
            ปิด
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-slate-100">
            <div>
              <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                ใบคืนสินค้า
                <span className="text-sm font-normal text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full">
                  {r.code || r.id}
                </span>
              </h4>
              <p className="text-sm text-slate-500 mt-1">
                สร้างเมื่อ: {formatThaiDate(r.created_at || r.createdAt)} โดย{' '}
                {r.created_by || r.createdBy || '-'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={r.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            {/* Reference Doc */}
            <div className="bg-slate-50 p-3 rounded border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">เลขที่ใบเบิกอ้างอิง</p>
              <p className="font-semibold text-slate-800 text-base">
                {r.withdrawalRefId || r.withdrawal_ref_id || '-'}
              </p>
            </div>

            {/* From Warehouse (Source) */}
            <div className="bg-amber-50 p-3 rounded border border-amber-100">
              <p className="text-xs text-amber-600 mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                คืนจาก (รถ/คลัง)
              </p>
              <p className="font-semibold text-amber-900 text-base">
                {warehouseMap.get(
                  r.fromWarehouseId || r.warehouse_id || r.vehicle_id
                ) || '-'}
              </p>
            </div>

            {/* To Warehouse (Destination) */}
            <div className="bg-blue-50 p-3 rounded border border-blue-100 col-span-1 md:col-span-2">
              <p className="text-xs text-blue-600 mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                คืนเข้าคลัง
              </p>
              <p className="font-semibold text-blue-900 text-base">
                {warehouseMap.get(r.toWarehouseId || r.to_warehouse_id) || '-'}
              </p>
            </div>
          </div>

          {(r.note || r.notes) && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">หมายเหตุ</p>
              <p className="text-slate-700 italic">"{r.note || r.notes}"</p>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h4 className="font-bold text-slate-700 flex items-center gap-2">
              รายการสินค้าที่คืน
              <span className="bg-white text-slate-600 text-xs px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                {r.items?.length || 0} รายการ
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
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-sm font-semibold text-slate-600 uppercase"
                  >
                    เหตุผล
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {r.items && r.items.length > 0 ? (
                  r.items.map((item: any, index: number) => {
                    // Handle both snake_case and camelCase or flattened props
                    const productId = item.productId || item.product_id;
                    const product = productMap.get(productId) as any;
                    const qty = Number(item.quantity || 0);

                    // Safely access unit name
                    let unitName = 'ชิ้น';
                    if (product?.unit) {
                      if (typeof product.unit === 'string') {
                        unitName = product.unit;
                      } else if (
                        typeof product.unit === 'object' &&
                        product.unit.name
                      ) {
                        unitName = product.unit.name;
                      }
                    }

                    return (
                      <tr
                        key={index}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center font-medium">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                          <div>
                            {product?.code ||
                              (productId && productId.substring(0, 8))}
                          </div>
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
                          {unitName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {item.reason || '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
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
                        <p className="font-medium">ไม่มีรายการสินค้า</p>
                      </div>
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
