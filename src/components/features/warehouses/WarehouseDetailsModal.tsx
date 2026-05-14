import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { Pagination } from '../../common/Pagination';
import { Button, FormField, Input } from '../../common/FormControls';
import { Warehouse, Product } from '@/src/types/entity/app.interface';
import { WarehouseType } from '@/src/types';
import {
  InventoryTransactionApi,
  InventoryTransaction,
} from '@/src/api/inventory-transaction';
import {
  DocumentTextIcon,
  TruckIcon,
  PackageIcon,
} from '../../../assets/icons/Icons';

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
  const [txPage, setTxPage] = useState(1);
  const [txItemsPerPage, setTxItemsPerPage] = useState(10);
  const [txTotal, setTxTotal] = useState(0);

  useEffect(() => {
    // Reset to page 1 every time modal opens or tab switches
    if (isOpen && activeTab === 'transactions') {
      setTxPage(1);
    }
  }, [isOpen, warehouse, activeTab]);

  useEffect(() => {
    if (isOpen && warehouse && activeTab === 'transactions') {
      setLoadingTx(true);
      InventoryTransactionApi.getAll({
        warehouse_id: warehouse.id,
        page: txPage,
        limit: txItemsPerPage,
      })
        .then((res) => {
          setTransactions(res.data || []);
          setTxTotal((res as { meta?: { total?: number } }).meta?.total || 0);
        })
        .catch(() => {
          setTransactions([]);
          setTxTotal(0);
        })
        .finally(() => setLoadingTx(false));
    }
  }, [isOpen, warehouse, activeTab, txPage, txItemsPerPage]);

  if (!isOpen || !warehouse) return null;

  const productsInWarehouse = products.filter(
    (p) => (stockMap[warehouse.id]?.[p.id] ?? 0) > 0,
  );
  const lowStockCount = productsInWarehouse.filter(
    (p) => (stockMap[warehouse.id]?.[p.id] ?? 0) <= (p.min_stock ?? 0),
  ).length;
  const isVehicle = warehouse.type === WarehouseType.VEHICLE;

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return d;
    }
  };

  const disabledInputClass = 'bg-slate-100 text-slate-700 cursor-not-allowed';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดคลังสินค้า: ${warehouse.name}`}
      size="5xl"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={onClose}>
            ปิด
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Document Information Section (matches รับสินค้าเข้า view-mode) */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
            <DocumentTextIcon className="w-4 h-4 text-slate-500" />
            ข้อมูลคลัง
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="ชื่อคลัง" htmlFor="wh-name">
              <Input
                id="wh-name"
                type="text"
                value={warehouse.name}
                disabled
                className={disabledInputClass}
              />
            </FormField>
            <FormField label="ประเภท" htmlFor="wh-type">
              <Input
                id="wh-type"
                type="text"
                value={isVehicle ? 'รถ' : 'คลัง'}
                disabled
                className={disabledInputClass}
              />
            </FormField>
            <FormField label="จำนวนสินค้าในคลัง" htmlFor="wh-count">
              <Input
                id="wh-count"
                type="text"
                value={`${productsInWarehouse.length} รายการ`}
                disabled
                className={disabledInputClass}
              />
            </FormField>
          </div>
        </div>

        {/* Vehicle Section (only for VEHICLE type) — matches "ข้อมูลการขนส่ง" pattern */}
        {isVehicle && (
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
              <TruckIcon className="w-4 h-4 text-slate-500" />
              <span>ข้อมูลรถ</span>
            </h3>
            <div className="p-3 bg-amber-50/50 rounded-md border border-amber-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField label="ทะเบียนรถ" htmlFor="vh-reg">
                  <Input
                    id="vh-reg"
                    type="text"
                    value={warehouse.vehicle?.vehicle_registration || '-'}
                    disabled
                    className={disabledInputClass}
                  />
                </FormField>
                <FormField label="ยี่ห้อ" htmlFor="vh-brand">
                  <Input
                    id="vh-brand"
                    type="text"
                    value={warehouse.vehicle?.brand || '-'}
                    disabled
                    className={disabledInputClass}
                  />
                </FormField>
                <FormField label="รุ่น" htmlFor="vh-model">
                  <Input
                    id="vh-model"
                    type="text"
                    value={warehouse.vehicle?.model || '-'}
                    disabled
                    className={disabledInputClass}
                  />
                </FormField>
                <FormField label="สี" htmlFor="vh-color">
                  <Input
                    id="vh-color"
                    type="text"
                    value={warehouse.vehicle?.color || '-'}
                    disabled
                    className={disabledInputClass}
                  />
                </FormField>
              </div>
            </div>
          </div>
        )}

        {/* Items Section (matches รายการสินค้า pattern from GoodReceive) */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PackageIcon className="w-5 h-5 text-slate-500" />
              {activeTab === 'stock' ? 'รายการสินค้าในคลัง' : 'ประวัติเคลื่อนไหว'}
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                {activeTab === 'stock'
                  ? `${productsInWarehouse.length} รายการ`
                  : `${transactions.length} รายการ`}
              </span>
            </h4>
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${
                  activeTab === 'stock'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setActiveTab('stock')}
              >
                สินค้าในคลัง
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${
                  activeTab === 'transactions'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setActiveTab('transactions')}
              >
                ประวัติเคลื่อนไหว
              </button>
            </div>
          </div>

          {/* Low stock callout */}
          {activeTab === 'stock' && lowStockCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 mb-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                !
              </span>
              มีสินค้าที่ต่ำกว่าหรือเท่ากับสต็อกขั้นต่ำ <strong>{lowStockCount}</strong> รายการ
            </div>
          )}

          {/* Stock Tab */}
          {activeTab === 'stock' && (
            <div className="overflow-hidden border border-slate-200 rounded-lg shadow-sm">
              <div className="max-h-[420px] overflow-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-600 w-16">ลำดับ</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">รหัสสินค้า</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">บาร์โค้ด</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">ชื่อสินค้า</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 w-32">คงเหลือ</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 w-32">สต็อกขั้นต่ำ</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">หน่วย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {productsInWarehouse.length > 0 ? (
                      productsInWarehouse.map((product, index) => {
                        const stock = stockMap[warehouse.id]?.[product.id] ?? 0;
                        const minStock = product.min_stock ?? 0;
                        const isLow = stock <= minStock && minStock > 0;
                        return (
                          <tr
                            key={product.id}
                            className={`hover:bg-slate-50 transition-colors ${isLow ? 'bg-red-50/40' : ''}`}
                          >
                            <td className="px-4 py-3 align-top text-slate-700 font-medium">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-700 font-medium">
                              {product.code}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-600">
                              {product.barcode || '-'}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-800 font-medium">
                              {product.name}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <span
                                className={`inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-0.5 rounded-full text-sm font-semibold ${
                                  isLow
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {stock}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-top text-slate-600">
                              {minStock || '-'}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-700 font-medium">
                              {product.unit?.name || '-'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-12 text-center text-slate-400 bg-slate-50/50"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="p-3 bg-slate-100 rounded-full">
                              <PackageIcon className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="font-medium">ไม่มีสินค้าในคลังนี้</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="overflow-hidden border border-slate-200 rounded-lg shadow-sm">
              <div className="overflow-auto">
                {loadingTx ? (
                  <div className="text-center py-10 text-slate-500">กำลังโหลด...</div>
                ) : (
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">วันที่</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">ประเภท</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">สินค้า</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 w-24">จำนวน</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">เลขที่อ้างอิง</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">จาก/ไป</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {transactions.length > 0 ? (
                        transactions.map((tx) => {
                          const typeInfo =
                            TYPE_LABELS[tx.type] || {
                              label: tx.type,
                              color: 'bg-slate-100 text-slate-700',
                            };
                          const isIncoming = tx.to_warehouse_id === warehouse.id;
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 align-top text-xs text-slate-500 whitespace-nowrap">
                                {formatDate(tx.created_at)}
                              </td>
                              <td className="px-4 py-3 align-top whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}
                                >
                                  {typeInfo.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 align-top text-slate-700">
                                {tx.product?.name || '-'}
                              </td>
                              <td
                                className={`px-4 py-3 align-top font-semibold ${
                                  isIncoming ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {isIncoming ? '+' : '-'}
                                {tx.quantity}
                              </td>
                              <td className="px-4 py-3 align-top text-xs text-slate-500 whitespace-nowrap">
                                {tx.ref_no || '-'}
                              </td>
                              <td className="px-4 py-3 align-top text-xs text-slate-500">
                                {tx.fromWarehouse && tx.from_warehouse_id !== warehouse.id && (
                                  <span>จาก: {tx.fromWarehouse.name}</span>
                                )}
                                {tx.toWarehouse && tx.to_warehouse_id !== warehouse.id && (
                                  <span>ไป: {tx.toWarehouse.name}</span>
                                )}
                                {!tx.fromWarehouse && !tx.toWarehouse && '-'}
                              </td>
                              <td className="px-4 py-3 align-top text-xs text-slate-500 max-w-32 truncate">
                                {tx.remark || '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-6 py-12 text-center text-slate-400 bg-slate-50/50"
                          >
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="p-3 bg-slate-100 rounded-full">
                                <PackageIcon className="h-6 w-6 text-slate-400" />
                              </div>
                              <p className="font-medium">ไม่มีรายการเคลื่อนไหว</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
              {!loadingTx && txTotal > 0 && (
                <div className="border-t border-slate-200 px-3 py-2 bg-slate-50">
                  <Pagination
                    currentPage={txPage}
                    totalItems={txTotal}
                    itemsPerPage={txItemsPerPage}
                    onPageChange={setTxPage}
                    onItemsPerPageChange={(size) => {
                      setTxItemsPerPage(size);
                      setTxPage(1);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
