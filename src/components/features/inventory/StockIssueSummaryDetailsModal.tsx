import React, { useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import {
  CalendarDaysIcon,
  UserIcon,
  TruckIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
} from '../../../assets/icons/Icons';
import { formatThaiDate } from '../../../utils/date';
import {
  StockIssueSummary,
  Warehouse,
} from '@/src/types/entity/inventory.interface';
import { Product } from '@/src/types/entity/product.interface';

interface StockIssueSummaryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: StockIssueSummary | null;
  warehouses: Warehouse[];
  products: Product[];
  users: { id: string; name: string; first_name?: string; last_name?: string; nick_name?: string }[];
}

const StockIssueSummaryDetailsModal: React.FC<StockIssueSummaryDetailsModalProps> = ({
  isOpen,
  onClose,
  summary,
  warehouses,
  products,
  users,
}) => {
  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w])),
    [warehouses]
  );

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const userMap = useMemo(
    () =>
      new Map(
        users.map((u) => {
          let name = u.name;
          if (typeof name !== 'string' || name === '[object Object]') {
            name =
              `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
              u.nick_name ||
              'Unknown';
          }
          return [u.id, name];
        })
      ),
    [users]
  );

  const totalAmount = useMemo(() => {
    if (!summary?.items) return 0;
    return summary.items.reduce((sum, item) => {
      const product = productMap.get(item.product_id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  }, [summary?.items, productMap]);

  if (!summary) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stock Issue Details">
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">
              Document ID
            </label>
            <p className="text-slate-800 font-medium">{summary.id}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">
              Created At
            </label>
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
              <p className="text-slate-800">
                {summary.created_at
                  ? formatThaiDate(summary.created_at)
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">
              Warehouse
            </label>
            <div className="flex items-center gap-2">
              <TruckIcon className="h-4 w-4 text-slate-400" />
              <p className="text-slate-800">
                {warehouseMap.get(summary.warehouse_id)?.name || '-'}
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">
              Requester
            </label>
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-slate-400" />
              <p className="text-slate-800">
                {summary.requester_id
                  ? userMap.get(summary.requester_id) || '-'
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">
              Created By
            </label>
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-slate-400" />
              <p className="text-slate-800">
                {summary.created_by
                  ? userMap.get(summary.created_by) || summary.created_by
                  : '-'}
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">
              Total Amount
            </label>
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-4 w-4 text-slate-400" />
              <p className="text-slate-800 font-semibold">
                a{totalAmount.toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {summary.notes && (
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">
              Notes
            </label>
            <div className="flex items-start gap-2">
              <DocumentTextIcon className="h-4 w-4 text-slate-400 mt-0.5" />
              <p className="text-slate-800">{summary.notes}</p>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-2">
            Items ({summary.items?.length || 0} items)
          </label>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-slate-600 uppercase">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-slate-600 uppercase">
                    Product
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-slate-600 uppercase">
                    Quantity
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-slate-600 uppercase">
                    Unit
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-slate-600 uppercase">
                    Price
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-slate-600 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {summary.items?.map((item, index) => {
                  const product = productMap.get(item.product_id);
                  const price = product?.price || 0;
                  const itemTotal = price * item.quantity;

                  return (
                    <tr key={item.id || index} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-sm text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-800">
                        {item.product_name ||
                          product?.name ||
                          '-'}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-800 text-right">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-500">
                        {item.unit || product?.unit?.name || '-'}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-800 text-right">
                        a{price.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-800 text-right font-medium">
                        a{itemTotal.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-2 text-sm text-slate-800 text-right font-medium"
                  >
                    Total
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-800 text-right font-bold">
                    a{totalAmount.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export { StockIssueSummaryDetailsModal };