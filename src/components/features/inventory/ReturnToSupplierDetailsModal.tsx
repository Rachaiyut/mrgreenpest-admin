import React, { useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import {
  ReturnToSupplier,
  Warehouse as WarehouseType,
  Product,
  Supplier,
} from '@/src/libs/common/interface/entity/app.interface';
import { formatThaiDate } from '../../../constants';
import { StatusBadge } from '../../common/StatusBadge';

interface ReturnToSupplierDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnToSupplier: ReturnToSupplier | null;
  warehouses: WarehouseType[];
  suppliers: Supplier[];
  products: Product[];
}

export const ReturnToSupplierDetailsModal: React.FC<
  ReturnToSupplierDetailsModalProps
> = ({
  isOpen,
  onClose,
  returnToSupplier,
  warehouses,
  suppliers,
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

  const supplierMap = useMemo(() => {
    return suppliers.reduce(
      (acc, s) => {
        acc[s.id] = s.name;
        return acc;
      },
      {} as Record<string, string>
    );
  }, [suppliers]);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  if (!isOpen || !returnToSupplier) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบเบิกคืน: ${returnToSupplier.id}`}
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
            ข้อมูลเอกสาร
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6 text-sm">
            <div>
              <dt className="font-medium text-slate-500">เลขที่เอกสาร</dt>
              <dd className="mt-1 text-slate-900 font-semibold">
                {returnToSupplier.id}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">คืนจากคลัง</dt>
              <dd className="mt-1 text-slate-900">
                {warehouseMap[returnToSupplier.warehouseId]}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">
                ผู้จำหน่ายที่รับคืน
              </dt>
              <dd className="mt-1 text-slate-900">
                {supplierMap[returnToSupplier.supplierId] ||
                  returnToSupplier.supplierId}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">สถานะ</dt>
              <dd className="mt-1 text-slate-900">
                <StatusBadge status={returnToSupplier.status} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">อ้างอิง</dt>
              <dd className="mt-1 text-slate-900">
                {returnToSupplier.referenceId || '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">วันที่สร้าง</dt>
              <dd className="mt-1 text-slate-900">
                {formatThaiDate(returnToSupplier.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ผู้สร้าง</dt>
              <dd className="mt-1 text-slate-900">
                {returnToSupplier.createdBy}
              </dd>
            </div>
            {returnToSupplier.approvedBy && (
              <div>
                <dt className="font-medium text-slate-500">ผู้อนุมัติ</dt>
                <dd className="mt-1 text-slate-900">
                  {returnToSupplier.approvedBy}
                </dd>
              </div>
            )}
            {returnToSupplier.remarks && (
              <div className="md:col-span-3">
                <dt className="font-medium text-slate-500">หมายเหตุ</dt>
                <dd className="mt-1 text-slate-900 bg-slate-50 p-2 rounded-md">
                  {returnToSupplier.remarks}
                </dd>
              </div>
            )}
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
                    จำนวนที่คืน
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                  >
                    หน่วย
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                  >
                    สาเหตุ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {returnToSupplier.items.length > 0 ? (
                  returnToSupplier.items.map((item, index) => {
                    const product = productMap.get(item.productId);
                    return (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {item.productId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {product?.name || 'ไม่พบสินค้า'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {product?.unit || 'ชิ้น'}
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
                      className="px-6 py-4 text-center text-sm text-slate-500"
                    >
                      ไม่มีรายการสินค้า
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
