import React, { useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import {
  GoodsReceive as GoodsReceiveType,
  Warehouse as WarehouseType,
  Product,
} from '@/src/types/entity/app.interface';
import { formatThaiDate } from '../../../utils/date';
import { StatusBadge } from '../../common/StatusBadge';

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
  const warehouseMap = useMemo(() => {
    return warehouses.reduce(
      (acc, wh) => {
        acc[wh.id] = wh.name;
        return acc;
      },
      {} as Record<string, string>
    );
  }, [warehouses]);

  // Map for fallback if product details are not nested in items
  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  if (!isOpen || !receipt) return null;

  // Safe Cast or access for properties that might satisfy multiple interfaces
  const r = receipt as any;

  // Calculate total quantity safely
  const totalQuantity =
    r.items?.reduce((sum: number, item: any) => {
      const qty = Number((item.qty_received ?? item.quantity) || 0);
      return sum + qty;
    }, 0) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="รายละเอียดใบรับเข้า"
      size="4xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="text-sm text-slate-500">
            {r.updated_at && (
              <span>แก้ไขล่าสุด: {formatThaiDate(r.updated_at)}</span>
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
                ใบรับสินค้าเข้า
                <span className="text-sm font-normal text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full">
                  {r.code}
                </span>
              </h4>
              <p className="text-sm text-slate-500 mt-1">
                สร้างเมื่อ: {formatThaiDate(r.created_at)} โดย{' '}
                {r.created_by || '-'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={r.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            {/* Reference Doc */}
            <div className="bg-slate-50 p-3 rounded border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">เลขที่เอกสารอ้างอิง</p>
              <p className="font-semibold text-slate-800 text-base">
                {r.receipt_no || '-'}
              </p>
            </div>

            {/* Warehouse */}
            <div className="bg-blue-50 p-3 rounded border border-blue-100">
              <p className="text-xs text-blue-600 mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                คลังสินค้าปลายทาง
              </p>
              <p className="font-semibold text-blue-900 text-base">
                {r.warehouse?.name || warehouseMap[r.warehouse_id] || '-'}
              </p>
            </div>

            {/* Supplier */}
            <div className="bg-amber-50 p-3 rounded border border-amber-100 col-span-1 md:col-span-2">
              <p className="text-xs text-amber-600 mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                ผู้จัดจำหน่าย (Supplier)
              </p>
              <p className="font-semibold text-amber-900 text-base">
                {r.supplier ? r.supplier.name : r.supplier_name || '-'}
              </p>
            </div>
          </div>

          {r.remarks && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">หมายเหตุ</p>
              <p className="text-slate-700 italic">"{r.remarks}"</p>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h4 className="font-bold text-slate-700 flex items-center gap-2">
              รายการสินค้า
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {r.items && r.items.length > 0 ? (
                  r.items.map((item: any, index: number) => {
                    const productDesc =
                      item.product || productMap.get(item.product_id);
                    const qty = Number(
                      (item.qty_received ?? item.quantity) || 0
                    );

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
                            {productDesc?.code ||
                              item.product_id?.substring(0, 8)}
                          </div>
                          {productDesc?.barcode && (
                            <div className="text-xs text-slate-400">
                              {productDesc.barcode}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {productDesc?.name || 'ไม่พบสินค้า'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-bold">
                          {qty.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">
                          {productDesc?.unit?.name ||
                            productDesc?.unit ||
                            'ชิ้น'}
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
                        <p className="font-medium">ไม่มีรายการสินค้า</p>
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
