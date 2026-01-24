import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { Input, Button } from '../../common/FormControls';
import { Product } from '@/src/types';

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProducts: (productIds: string[]) => void;
  existingProductIds: string[];
  products: Product[];
}

export const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
  isOpen,
  onClose,
  onAddProducts,
  existingProductIds,
  products,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const productSource = products;

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  const availableProducts = useMemo(
    () =>
      productSource.filter(
        (p) =>
          !existingProductIds.includes(p.id) &&
          (p.name || p.code)
      ),
    [searchTerm, existingProductIds, productSource]
  );

  const handleToggleSelection = (productId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    onAddProducts(Array.from(selectedIds));
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="เลือกสินค้า"
      size="3xl"
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
            variant="outline"
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm disabled:bg-slate-400"
            variant="primary"
          >
            เพิ่มรายการที่เลือก ({selectedIds.size})
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          type="search"
          placeholder="ค้นหาด้วยชื่อ หรือ รหัสสินค้า..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th scope="col" className="w-12 px-4 py-3">
                  <span className="sr-only">Select</span>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  รหัสสินค้า
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  Code
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  ชื่อสินค้า
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  หน่วย
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase"
                >
                  ราคา
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {availableProducts.map((product) => (
                <tr
                  key={product.id}
                  className={`cursor-pointer hover:bg-slate-50 ${selectedIds.has(product.id) ? 'bg-primary/10' : ''}`}
                  onClick={() => handleToggleSelection(product.id)}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      readOnly
                      className="pointer-events-none"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                    {product.code}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                    {product.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {product.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                    {product.unit?.name || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-right">
                    ฿
                    {product.cost_price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {availableProducts.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              ไม่พบสินค้าที่ตรงกัน
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
