import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import {
  PlusIcon,
  ManageIcon,
  PencilIcon,
  TrashIcon,
} from '../../../assets/icons/Icons';
import { AddProductModal } from '../../../components/features/products/AddProductModal';
import { Pagination } from '../../../components/common/Pagination';
import { Product, Category } from '../../../types';
import { EditProductModal } from '../../../components/features/products/EditProductModal';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { Input, Button } from '../../../components/common/FormControls';

// FIX: Define props interface to accept data and handlers from App.tsx
interface InventoryProps {
  products: Product[];
  onCreateProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  categories: Category[];
}

const Inventory: React.FC<InventoryProps> = ({
  products,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  categories,
}) => {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const reversedProducts = useMemo(
    () => [...products].reverse().filter((p) => !p.id.startsWith('PK')),
    [products]
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const filteredProducts = useMemo(() => {
    if (!searchQuery) {
      return reversedProducts;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return reversedProducts.filter(
      (product) =>
        product.id.toLowerCase().includes(lowercasedQuery) ||
        product.name.toLowerCase().includes(lowercasedQuery)
    );
  }, [reversedProducts, searchQuery]);

  const totalItems = filteredProducts.length;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const actions = [
    { label: 'แก้ไข', icon: PencilIcon },
    { label: 'ลบ', icon: TrashIcon, isDanger: true },
  ];

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    productId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === productId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setOpenDropdownId(productId);
      setDropdownPosition({
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.right + window.scrollX,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openDropdownId) return;
      if (
        dropdownRef.current &&
        dropdownRef.current.contains(event.target as Node)
      ) {
        return;
      }
      if ((event.target as HTMLElement).closest('button[data-product-id]')) {
        return;
      }
      setOpenDropdownId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  const handleEdit = (product: Product) => {
    setProductToEdit(product);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      onDeleteProduct(productToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setProductToDelete(null);
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">สินค้า/บริการ</h1>
            <p className="mt-1 text-slate-600">จัดการสินค้าและบริการ</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Input
                type="search"
                placeholder="ค้นหา (รหัส, ชื่อ)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset page on search
                }}
                title="ค้นหาด้วย: รหัสสินค้า/บริการ, ชื่อสินค้า/บริการ"
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              สร้างสินค้า/บริการ
            </Button>
          </div>
        </div>

        <Card className="!p-0 flex-grow min-h-0 flex flex-col">
          <div className="overflow-auto flex-grow">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    รหัสสินค้า
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    รหัสบาร์โค้ด
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ชื่อสินค้า/บริการ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    หมวดหมู่
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ประเภท
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ราคา/หน่วย
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    จำนวนคงเหลือ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    สต็อกขั้นต่ำ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    หน่วย
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ผู้สร้าง
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedProducts.map((product, index) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {product.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {product.barcode || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {categoryMap.get(product.categoryId) || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {product.type}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      ฿
                      {product.price.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-sm ${product.type === 'สินค้า' && product.stock < product.lowStockThreshold ? 'text-red-600 font-bold' : 'text-slate-500'}`}
                    >
                      {product.type === 'สินค้า' ? product.stock : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {product.type === 'สินค้า'
                        ? product.lowStockThreshold
                        : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {product.unit}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {product.createdBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="inline-block text-left">
                        <Button
                          data-product-id={product.id}
                          onClick={(e) => handleDropdownToggle(e, product.id)}
                          variant="icon"
                          title="ตัวเลือก"
                        >
                          <span className="sr-only">Open options</span>
                          <ManageIcon className="h-5 w-5" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex-shrink-0">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        </Card>
      </div>

      {openDropdownId && dropdownPosition && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {actions.map((action) => (
              <a
                key={action.label}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const product = products.find((p) => p.id === openDropdownId);
                  if (!product) {
                    setOpenDropdownId(null);
                    return;
                  }
                  if (action.label === 'แก้ไข') {
                    handleEdit(product);
                  } else if (action.label === 'ลบ') {
                    handleDelete(product);
                  } else {
                    setOpenDropdownId(null);
                  }
                }}
                className={`flex items-center w-full text-left px-4 py-2 text-sm ${action.isDanger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}
                role="menuitem"
              >
                <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                <span>{action.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreateProduct={onCreateProduct}
        products={products}
        categories={categories}
      />
      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={productToEdit}
        onUpdateProduct={onUpdateProduct}
        categories={categories}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า/บริการ{' '}
            <strong>{productToDelete?.name}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
    </>
  );
};

export default Inventory;
