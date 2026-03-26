// ===== React =====
import Swal from 'sweetalert2';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// ===== Enums =====
import { CategoryType } from '@/src/types/enums/category';

// ===== Interfaces =====
import { Category } from '@/src/types/entity/category.interface';
import { Product as IProduct } from '@/src/types/entity/product.interface';
import { Unit } from '@/src/types/entity/unit.interface';

// ===== API =====
import { CategoryApi } from '@/src/api/category';
import { ProductApi } from '@/src/api/product';
import { Unit as UnitApi } from '@/src/api/unit';

// ===== Components (Absolute) =====
import { AddProductModal } from '@/src/components/features/products/AddProductModal';
import { EditProductModal } from '@/src/components/features/products/EditProductModal';
import { ConfirmationModal } from '@/src/components/common/ConfirmationModal';

// ===== Components (Relative) =====
import { Card } from '../../../components/common/Card';
import { Input, Button } from '../../../components/common/FormControls';
import { Pagination } from '../../../components/common/Pagination';

// ===== Assets =====
import {
  ManageIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '../../../assets/icons/Icons';

const Product: React.FC = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<IProduct | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<IProduct | null>(null);

  const fetchCategories = async () => {
    try {
      const response = await CategoryApi.getCategories({});
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await UnitApi.getUnit({ limit: 10 });
      setUnits(response.data);
    } catch (error) {
      console.error('Failed to fetch units:', error);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ProductApi.getProducts({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setProducts(response.data);
      setTotalItems(response.meta?.total || response.data.length);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    fetchCategories();
    fetchUnits();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onUpdateProduct = async (product: IProduct) => {
    try {
      const { id, ...data } = product;
      await ProductApi.updateProduct(id, data);
      fetchProducts();
      setIsEditModalOpen(false);
      setProductToEdit(null);
    } catch (error) {
      console.error('Failed to update product:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'Failed to update product' });
    }
  };

  const onDeleteProduct = async (id: string) => {
    try {
      await ProductApi.deleteProduct(id);
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'Failed to delete product' });
    }
  };

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

  const handleEdit = (product: IProduct) => {
    setProductToEdit(product);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (product: IProduct) => {
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
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
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

        <Card className="p-0 grow min-h-0 flex flex-col">
          <div className="overflow-auto grow">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    รหัสสินค้า
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    รหัสบาร์โค้ด
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    ชื่อสินค้า/บริการ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    หมวดหมู่
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    ราคา/หน่วย
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    จำนวนคงเหลือ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    สต็อกขั้นต่ำ
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {products.map((product, index) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {product.code}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {product.barcode || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {product.name}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {product.category.name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      ฿{Number(product.cost_price).toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm `}>
                      {product.category?.type === CategoryType.PRODUCT
                        ? 'สินค้า'
                        : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {product.min_stock}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-right text-sm font-medium">
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
          <div className="shrink-0">
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
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-30"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {actions.map((action) => (
              <button
                key={action.label}
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
              </button>
            ))}
          </div>
        </div>
      )}

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchProducts}
        categories={categories}
        units={units}
      />
      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={productToEdit}
        onUpdateProduct={onUpdateProduct}
        categories={categories}
        units={units}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า/บริการ{' '}
            <strong>{productToDelete?.code}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
    </>
  );
};

export default Product;
