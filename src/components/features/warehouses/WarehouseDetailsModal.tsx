import React from 'react';
import { Modal } from '../../common/Modal';
import { Warehouse, Product } from '@/src/types/entity/app.interface';
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
    (p) => p.type === 'สินค้า' && (stockMap[warehouse.id]?.[p.id] ?? 0) >= 0
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
            <DetailsItem label="ที่ตั้ง">{warehouse.location}</DetailsItem>
          </DetailsList>
          {warehouse.type === 'รถ' && (
            <DetailsList cols={4} className="mt-2 pt-2 border-t text-sm">
              <DetailsItem label="ทะเบียนรถ">
                {warehouse.licensePlate || '-'}
              </DetailsItem>
              <DetailsItem label="ยี่ห้อ">{warehouse.brand || '-'}</DetailsItem>
              <DetailsItem label="รุ่น">{warehouse.model || '-'}</DetailsItem>
              <DetailsItem label="สี">{warehouse.color || '-'}</DetailsItem>
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
                  productsInWarehouse.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                        {product.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {product.barcode || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {product.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {stockMap[warehouse.id]?.[product.id] ?? 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {product.lowStockThreshold}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {product.unit}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-10 text-slate-500"
                    >
                      ไม่มีสินค้าในคลังนี้
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

