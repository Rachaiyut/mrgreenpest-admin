import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { Warehouse, Product } from '@/src/types/entity/app.interface';
import {
  SectionTitle,
  DetailsList,
  DetailsItem,
} from '../../common/FormControls';
import { WarehouseType } from '@/src/types';
import { InventoryTransactionApi, InventoryTransaction } from '@/src/api/inventory-transaction';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  RECEIVE: { label: 'รับเข้า', color: 'bg-green-100 text-green-700' },
  TRANSFER: { label: 'โอนย้าย', color: 'bg-blue-100 text-blue-700' },
  ADJUSTMENT: { label: 'ปรับปรุง', color: 'bg-yellow-100 text-yellow-700' },
  USAGE: { label: 'เบิกออก', color: 'bg-red-100 text-red-700' },
  COUNT: { label: 'ตรวจนับ', color: 'bg-purple-100 text-purple-700' },
};

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
  const [activeTab, setActiveTab] = useState<'stock' | 'transactions'>('stock');
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  useEffect(() => {
    if (isOpen && warehouse && activeTab === 'transactions') {
      setLoadingTx(true);
      InventoryTransactionApi.getAll({ warehouse_id: warehouse.id, limit: 50 })
        .then((res) => setTransactions(res.data || []))
        .catch(() => setTransactions([]))
        .finally(() => setLoadingTx(false));
    }
  }, [isOpen, warehouse, activeTab]);

  if (!isOpen || !warehouse) return null;

  const productsInWarehouse = products.filter(
    (p) => (stockMap[warehouse.id]?.[p.id] ?? 0) > 0
  );

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดคลังสินค้า: ${warehouse.name}`}
      size="4xl"
    >
      <div className="space-y-6">
        <div>
          <SectionTitle>ข้อมูลคลัง</SectionTitle>
          <DetailsList cols={3} className="text-sm">
            <DetailsItem label="ชื่อคลัง" valueClassName="font-semibold">
              {warehouse.name}
            </DetailsItem>
            <DetailsItem label="ประเภท">
              {warehouse.type === WarehouseType.VEHICLE ? 'รถ' : 'คลัง'}
            </DetailsItem>
          </DetailsList>
          {warehouse.type === WarehouseType.VEHICLE && (
            <DetailsList cols={4} className="mt-2 pt-2 border-t text-sm">
              <DetailsItem label="ทะเบียนรถ">
                {warehouse.vehicle?.vehicle_registration || '-'}
              </DetailsItem>
              <DetailsItem label="ยี่ห้อ">
                {warehouse.vehicle?.brand || '-'}
              </DetailsItem>
              <DetailsItem label="รุ่น">
                {warehouse.vehicle?.model || '-'}
              </DetailsItem>
              <DetailsItem label="สี">
                {warehouse.vehicle?.color || '-'}
              </DetailsItem>
            </DetailsList>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stock' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('stock')}
          >
            สินค้าในคลัง
          </button>
          <button
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transactions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('transactions')}
          >
            ประวัติเคลื่อนไหว
          </button>
        </div>

        {/* Stock Tab */}
        {activeTab === 'stock' && (
          <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 table-fixed">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase w-32">รหัสสินค้า</th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase w-40">รหัสบาร์โค้ด</th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase">ชื่อสินค้า/บริการ</th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase w-28">จำนวนคงเหลือ</th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase w-28">สต็อกขั้นต่ำ</th>
                  <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase w-24">หน่วย</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {productsInWarehouse.length > 0 ? (
                  productsInWarehouse.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{product.code}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{product.barcode || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{product.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{stockMap[warehouse.id]?.[product.id] ?? 0}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{product.min_stock}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{product.unit?.name || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500">ไม่มีสินค้าในคลังนี้</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto overflow-x-auto">
            {loadingTx ? (
              <div className="text-center py-10 text-slate-500">กำลังโหลด...</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-sm font-semibold text-slate-600 uppercase w-36">วันที่</th>
                    <th className="px-3 py-2.5 text-left text-sm font-semibold text-slate-600 uppercase w-24">ประเภท</th>
                    <th className="px-3 py-2.5 text-left text-sm font-semibold text-slate-600 uppercase">สินค้า</th>
                    <th className="px-3 py-2.5 text-right text-sm font-semibold text-slate-600 uppercase w-20">จำนวน</th>
                    <th className="px-3 py-2.5 text-left text-sm font-semibold text-slate-600 uppercase w-28">เลขที่อ้างอิง</th>
                    <th className="px-3 py-2.5 text-left text-sm font-semibold text-slate-600 uppercase">จาก/ไป</th>
                    <th className="px-3 py-2.5 text-left text-sm font-semibold text-slate-600 uppercase">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => {
                      const typeInfo = TYPE_LABELS[tx.type] || { label: tx.type, color: 'bg-slate-100 text-slate-700' };
                      const isIncoming = tx.to_warehouse_id === warehouse.id;
                      return (
                        <tr key={tx.id}>
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-500">{formatDate(tx.created_at)}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-slate-700">{tx.product?.name || '-'}</td>
                          <td className={`px-3 py-2.5 text-right text-sm font-medium ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                            {isIncoming ? '+' : '-'}{tx.quantity}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-500">{tx.ref_no || '-'}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">
                            {tx.fromWarehouse && tx.from_warehouse_id !== warehouse.id && <span>จาก: {tx.fromWarehouse.name}</span>}
                            {tx.toWarehouse && tx.to_warehouse_id !== warehouse.id && <span>ไป: {tx.toWarehouse.name}</span>}
                            {!tx.fromWarehouse && !tx.toWarehouse && '-'}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-500 max-w-32 truncate">{tx.remark || '-'}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">ไม่มีรายการเคลื่อนไหว</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
