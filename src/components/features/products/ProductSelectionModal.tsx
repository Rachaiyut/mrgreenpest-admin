import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { Input, Button } from '../../common/FormControls';
import { Product } from '@/src/types';
import { ProductApi } from '@/src/api/product';

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProducts: (productIds: string[]) => void;
  existingProductIds: string[];
  products: Product[];
  disableFetch?: boolean;
  stockMap?: Map<string, number>;
}

export const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
  isOpen,
  onClose,
  onAddProducts,
  existingProductIds,
  products,
  disableFetch = false,
  stockMap,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIds(new Set());
      setFetchedProducts([]);
      if (!disableFetch) {
        handleSearch('');
      }
    }
  }, [isOpen]);

  const handleSearch = async (term: string) => {
    if (disableFetch) return; // Should not happen if logic is correct, but safety check

    setIsLoading(true);
    try {
      const res = await ProductApi.getProducts({ search: term, limit: 10 });
      if (res && res.data) {
        setFetchedProducts(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (isOpen && !disableFetch) {
        handleSearch(searchTerm);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, isOpen, disableFetch]);

  const availableProducts = useMemo(() => {
    let source = products;

    // If fetching is enabled, use fetched products.
    // If disabled, use passed 'products' and filter locally by searchTerm.
    if (!disableFetch) {
      source = fetchedProducts.length > 0 ? fetchedProducts : products;
    } else if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      source = products.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(lowerTerm)) ||
          (p.code && p.code.toLowerCase().includes(lowerTerm)) ||
          (p.id && p.id.toLowerCase().includes(lowerTerm))
      );
    }

    return source.filter((p) => !existingProductIds.includes(p.id));
  }, [fetchedProducts, existingProductIds, products, disableFetch, searchTerm]);

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
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase"
                >
                  รหัสสินค้า
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase"
                >
                  Code
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase"
                >
                  ชื่อสินค้า
                </th>
                {stockMap && (
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase"
                  >
                    คงเหลือ
                  </th>
                )}
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase"
                >
                  หน่วย
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase"
                >
                  ราคา
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : (
                availableProducts.map((product) => (
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
                    {stockMap && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right font-medium">
                        {stockMap.get(product.id) || 0}
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {product.unit?.name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-right">
                      ฿{product.cost_price}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!isLoading && availableProducts.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              ไม่พบสินค้าที่ตรงกัน
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
