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
import { ProductApi, ProductServiceApi } from '@/src/api/product';
import { Unit as UnitApi } from '@/src/api/unit';

// ===== Components (Absolute) =====
import { ProductModal } from '@/src/components/features/products/ProductModal';
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
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedType, setSelectedType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
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
      const baseQuery = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        sort_by: 'created_at',
        sort_order: 'desc',
        ...(selectedCategoryId ? { category_id: selectedCategoryId } : {}),
      };

      if (selectedType === 'SERVICE') {
        const response = await ProductServiceApi.getAll(baseQuery);
        const services = (response.data || []).map((s: any) => ({
          ...s,
          barcode: '',
          price: s.price || 0,
          cost_price: s.cost_price || 0,
          min_stock: 0,
          category: s.category || { name: '-', type: CategoryType.SERVICE },
          _type: 'SERVICE',
        }));
        setProducts(services);
        setTotalItems(response.meta?.total || services.length);
      } else {
        const response = await ProductApi.getProducts(baseQuery);
        setProducts(response.data.map((p: any) => ({ ...p, _type: 'PRODUCT' })));
        setTotalItems(response.meta?.total || response.data.length);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, selectedCategoryId, selectedType]);

  useEffect(() => {
    fetchCategories();
    fetchUnits();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onSubmitProduct = async (data: any, type: CategoryType): Promise<boolean> => {
    try {
      if (modalMode === 'create') {
        if (type === CategoryType.SERVICE) {
          await ProductServiceApi.create(data);
        } else {
          await ProductApi.createProduct(data);
        }
      } else if (selectedProduct) {
        if ((selectedProduct as any)._type === 'SERVICE') {
          await ProductServiceApi.update(selectedProduct.id, data);
        } else {
          await ProductApi.updateProduct(selectedProduct.id, data);
        }
      }
      fetchProducts();
      setIsModalOpen(false);
      setSelectedProduct(null);
      return true;
    } catch (error: any) {
      console.error('Failed to save:', error);
      const errMsg = error?.response?.data?.message
        || (error?.response?.data?.errors && Object.values(error.response.data.errors).join(', '))
        || 'ไม่สามารถบันทึกได้';
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: errMsg });
      return false;
    }
  };

  const onDeleteProduct = async (id: string) => {
    try {
      const item = products.find((p) => p.id === id);
      if ((item as any)?._type === 'SERVICE') {
        await ProductServiceApi.remove(id);
      } else {
        await ProductApi.deleteProduct(id);
      }
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถลบได้' });
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
    setSelectedProduct(product);
    setModalMode('edit');
    setIsModalOpen(true);
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
            {/* DF-1/12: wider search + placeholder */}
            <div className="w-96">
              <Input
                type="search"
                placeholder={selectedType === 'SERVICE' ? 'ค้นหารหัสบริการ, ชื่อบริการ' : 'ค้นหารหัสสินค้า, รหัสบาร์โค้ด, ชื่อสินค้า'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            {/* DF-2: type filter (สินค้า/บริการ) */}
            <div className="w-36">
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value as 'PRODUCT' | 'SERVICE');
                  setSelectedCategoryId('');
                  setCurrentPage(1);
                }}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="PRODUCT">สินค้า</option>
                <option value="SERVICE">บริการ</option>
              </select>
            </div>
            {/* DF-2/13: category filter */}
            <div className="w-44">
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">หมวดหมู่ทั้งหมด</option>
                {categories
                  .filter((cat) => !selectedType || cat.type === selectedType)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
              </select>
            </div>
            <Button onClick={() => { setSelectedProduct(null); setModalMode('create'); setIsModalOpen(true); }}>
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
                  {selectedType === 'PRODUCT' && (
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    รหัสบาร์โค้ด
                  </th>
                  )}
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
                    ประเภท
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    ราคา/หน่วย
                  </th>
                  {selectedType === 'PRODUCT' && (
                  <>
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
                  </>
                  )}
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    จัดการ
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
                    {selectedType === 'PRODUCT' && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {product.barcode || '-'}
                    </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {product.name}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {product.category?.name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {product.category?.type === CategoryType.PRODUCT ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">สินค้า</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">บริการ</span>
                      )}
                    </td>
                    {/* DF-10: show price not cost_price */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      ฿{Number(product.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    {selectedType === 'PRODUCT' && (
                    <>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {(product as any).stock_quantity ?? 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {product.min_stock}
                    </td>
                    </>
                    )}
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

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        initialValues={selectedProduct}
        onSubmit={onSubmitProduct}
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
