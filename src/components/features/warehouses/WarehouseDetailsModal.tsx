import React from 'react';
import { Modal } from '../../common/Modal';
import { Warehouse, Product } from '@/src/types/entity/app.interface';
import { WarehouseType } from '@/src/types/enums/warehouse';
import {
  SectionTitle,
  DetailsList,
  DetailsItem,
} from '../../common/FormControls';

interface WarehouseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: Warehouse | null;
  products: Product[];
  stockMap: Record<string, Record<string, number>>;
}

export const WarehouseDetailsModal: React.FC<WarehouseDetailsModalProps> = ({
  isOpen,
  onClose,
  warehouse,
  products,
  stockMap,
}) => {
  if (!isOpen || !warehouse) return null;
  const productsInWarehouse = products.filter(
    (p) => (stockMap[warehouse.id]?.[p.id] ?? 0) >= 0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดคลังสินค้า: ${warehouse.name}`}
      size="3xl"
    >
      <div className="space-y-6">
        <div>
          <SectionTitle>ข้อมูลคลัง</SectionTitle>
          <DetailsList cols={3} className="text-sm">
            <DetailsItem label="ชื่อคลัง" valueClassName="font-semibold">
              {warehouse.name}
            </DetailsItem>
            <DetailsItem label="ประเภท">{warehouse.type}</DetailsItem>
            <DetailsItem label="ที่ตั้ง">{warehouse.warehouse_branch?.location || '-'}</DetailsItem>
          </DetailsList>
          {warehouse.type === WarehouseType.SUB && warehouse.vehicle && (
            <DetailsList cols={4} className="mt-2 pt-2 border-t text-sm">
              <DetailsItem label="ทะเบียนรถ">
                {warehouse.vehicle.vehicle_registration || '-'}
              </DetailsItem>
              <DetailsItem label="ยี่ห้อ">{warehouse.vehicle.brand || '-'}</DetailsItem>
              <DetailsItem label="รุ่น">{warehouse.vehicle.model || '-'}</DetailsItem>
              <DetailsItem label="สี">{warehouse.vehicle.color || '-'}</DetailsItem>
            </DetailsList>
          )}
        </div>

        {/* Products Table */}
        <div>
          <SectionTitle>สินค้าในคลัง</SectionTitle>
          <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 table-fixed">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase w-32"
                  >
                    รหัสสินค้า
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase w-40"
                  >
                    รหัสบาร์โค้ด
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    ชื่อสินค้า/บริการ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase w-28"
                  >
                    จำนวนคงเหลือ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase w-28"
                  >
                    สต็อกขั้นต่ำ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase w-24"
                  >
                    หน่วย
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {productsInWarehouse.length > 0 ? (
                  productsInWarehouse.map((product) => {
                    const quantity = stockMap[warehouse.id]?.[product.id] ?? 0;
                    return (
                      <tr key={product.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                          {product.code}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {product.barcode || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                          {product.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 font-semibold">
                          {quantity}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {product.min_stock}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {product.unit?.name || product.unit_id}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      ไม่พบสินค้าในคลัง
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
