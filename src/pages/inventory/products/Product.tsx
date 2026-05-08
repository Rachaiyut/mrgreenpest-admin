// ===== React =====
import Swal from '@/src/utils/swal';
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
import { StorageApi } from '@/src/api/storage';

// ===== Components (Absolute) =====
import { ProductModal } from '@/src/components/features/products/ProductModal';

// ===== Components (Relative) =====
import { Card } from '../../../components/common/Card';
import { Input, Button } from '../../../components/common/FormControls';
import { Pagination } from '../../../components/common/Pagination';

// ===== Assets =====
import {
  LoadingIcon,
  ManageIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  ArchiveBoxIcon,
} from '../../../assets/icons/Icons';

const Product: React.FC = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedType, setSelectedType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
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

  const fetchCategories = async () => {
    try {
      const response = await CategoryApi.getCategories({ is_active: true });
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await UnitApi.getUnit({ limit: 100, is_active: true });
      setUnits(response.data);
    } catch (error) {
      console.error('Failed to fetch units:', error);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const baseQuery: any = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        sort_by: 'created_at',
        sort_order: 'desc',
        ...(selectedCategoryId ? { category_id: selectedCategoryId } : {}),
        ...(minPrice ? { minPrice: Number(minPrice) } : {}),
        ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
        ...(statusFilter !== '' ? { is_active: statusFilter === 'true' } : {}),
      };

      if (selectedType === 'SERVICE') {
        const response = await ProductServiceApi.getAll(baseQuery);
        const services = (response.data || []).map((s: any) => ({
          ...s,
          barcode: '',
          price: s.price ?? 0,
          cost_price: s.cost_price ?? 0,
          min_stock: 0,
          category: { ...(s.category || { name: '-' }), type: CategoryType.SERVICE },
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
  }, [currentPage, itemsPerPage, searchQuery, selectedCategoryId, selectedType, minPrice, maxPrice, statusFilter]);

  useEffect(() => {
    fetchCategories();
    fetchUnits();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onSubmitProduct = async (data: any, type: CategoryType, imageFile?: File | null): Promise<boolean> => {
    try {
      let resultId: string | null = null;

      if (modalMode === 'create') {
        if (type === CategoryType.SERVICE) {
          const res = await ProductServiceApi.create(data);
          resultId = ((res as unknown as Record<string, Record<string, string>>)?.data?.id || (res as unknown as Record<string, string>)?.id);
        } else {
          const res = await ProductApi.createProduct(data);
          resultId = ((res as unknown as Record<string, Record<string, string>>)?.data?.id || (res as unknown as Record<string, string>)?.id);
        }
      } else if (selectedProduct) {
        resultId = selectedProduct.id;
        if ((selectedProduct as unknown as Record<string, string>)._type === 'SERVICE') {
          await ProductServiceApi.update(selectedProduct.id, data);
        } else {
          await ProductApi.updateProduct(selectedProduct.id, data);
        }
      }

      // Upload image if selected
      if (imageFile && resultId) {
        try {
          const entityType = type === CategoryType.SERVICE ? 'product_service' : 'product';
          // Delete old image if exists
          if (selectedProduct?.image_id) {
            await StorageApi.remove(selectedProduct.image_id).catch(() => {});
          }
          const uploadRes = await StorageApi.upload({
            file: imageFile,
            path: `products/${resultId}`,
            entity_type: entityType,
            entity_id: resultId,
            type: 'image',
            visibility: 'private',
          });
          const storageId = ((uploadRes as unknown as Record<string, Record<string, string>>)?.data?.id || (uploadRes as unknown as Record<string, string>)?.id);
          if (storageId) {
            if (type === CategoryType.SERVICE) {
              await ProductServiceApi.update(resultId, { image_id: storageId });
            } else {
              await ProductApi.updateProduct(resultId, { image_id: storageId });
            }
          }
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr);
        }
      }

      fetchProducts();
      setIsModalOpen(false);
      setSelectedProduct(null);
      return true;
    } catch (error: any) {
      console.error('Failed to save:', error);
      const errorMessageMap: Record<string, string> = {
        'cost_price must not be less than 0': 'ราคาต้นทุนไม่ควรต่ำกว่า 0',
        'min_stock must not be less than 0': 'สต็อกสินค้าขั้นต่ำไม่ควรต่ำกว่า 0',
      };
      const rawMsg = error?.response?.data?.message
        || (error?.response?.data?.errors && Object.values(error.response.data.errors).join(', '))
        || 'ไม่สามารถบันทึกได้';
      const errMsg = Object.entries(errorMessageMap).reduce(
        (msg, [en, th]) => msg.replace(en, th),
        rawMsg,
      );
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: errMsg });
      return false;
    }
  };

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleToggleStatus = async (product: IProduct) => {
    try {
      const isService = (product as unknown as Record<string, string>)?._type === 'SERVICE';
      if (isService) {
        await ProductServiceApi.update(product.id, { is_active: !product.is_active } as any);
      } else {
        await ProductApi.updateProduct(product.id, { is_active: !product.is_active } as any);
      }
      fetchProducts();
    } catch (error) {
      console.error('Error toggling product status:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเปลี่ยนสถานะได้' });
    }
    setOpenDropdownId(null);
  };

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

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1 space-y-6 max-w-full">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">สินค้า/บริการ</h1>
            <p className="mt-1 text-slate-600">จัดการสินค้าและบริการ</p>
          </div>
          <Button onClick={() => { setSelectedProduct(null); setModalMode('create'); setIsModalOpen(true); }}>
            <PlusIcon className="h-5 w-5" />
            สร้างสินค้า/บริการ
          </Button>
        </div>

        {/* Toolbar */}
        <Card className="!p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center flex-wrap">
            <div className="relative w-full sm:w-80 flex-shrink-0">
              <Input
                type="search"
                placeholder={selectedType === 'SERVICE' ? 'ค้นหารหัสบริการ, ชื่อบริการ' : 'ค้นหารหัสสินค้า, รหัสบาร์โค้ด, ชื่อสินค้า'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="w-full sm:w-36 flex-shrink-0">
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
            <div className="w-full sm:w-44 flex-shrink-0">
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
            {selectedType === 'PRODUCT' && (
              <div className="flex items-center gap-1 w-full sm:w-56 lg:w-64 shrink-0">
                <input
                  type="number"
                  placeholder="ราคาต่ำสุด"
                  value={minPrice}
                  onChange={(e) => { setMinPrice(e.target.value); setCurrentPage(1); }}
                  min="0"
                  className="flex-1 min-w-0 h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <span className="text-slate-400 text-sm">-</span>
                <input
                  type="number"
                  placeholder="ราคาสูงสุด"
                  value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); setCurrentPage(1); }}
                  min="0"
                  className="flex-1 min-w-0 h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
            <div className="w-full sm:w-44 flex-shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">สถานะทั้งหมด</option>
                <option value="true">ใช้งาน</option>
                <option value="false">ไม่ใช้งาน</option>
              </select>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden items-center justify-center">
            <div className="flex flex-col items-center justify-center text-slate-500">
              <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="text-base font-medium">กำลังโหลดข้อมูลสินค้า...</p>
            </div>
          </div>
        ) : (
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-auto w-full flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    {selectedType === 'SERVICE' ? 'รหัสบริการ' : 'รหัสสินค้า'}
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
                    {selectedType === 'SERVICE' ? 'ชื่อบริการ' : 'ชื่อสินค้า'}
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
                    className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    ราคา/หน่วย
                  </th>
                  {selectedType === 'PRODUCT' && (
                  <>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    จำนวนคงเหลือ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    สต็อกขั้นต่ำ
                  </th>
                  </>
                  )}
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    สถานะ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[49px] flex flex-col items-center justify-center text-slate-400">
                        <ArchiveBoxIcon className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-base font-medium text-slate-500">
                          {selectedType === 'PRODUCT' ? 'ไม่พบสินค้า' : 'ไม่พบบริการ'}
                        </p>
                        <p className="text-sm mt-1">
                          ลองปรับตัวกรองหรือสร้าง{selectedType === 'PRODUCT' ? 'สินค้า' : 'บริการ'}ใหม่
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : products.map((product, index) => (
                  <tr key={product.id} className="hover:bg-slate-50 [&>td]:align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary">
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-right">
                      {Number(product.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                    </td>
                    {selectedType === 'PRODUCT' && (
                    <>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {Math.trunc(Number((product as unknown as Record<string, number>).stock_quantity ?? 0)).toLocaleString('th-TH')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                      {product.min_stock}
                    </td>
                    </>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.is_active !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.is_active !== false ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-center">
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
          <div className="mt-auto border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        </div>
        )}
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
            <button
              onClick={() => {
                const product = products.find((p) => p.id === openDropdownId);
                if (product) handleEdit(product);
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              role="menuitem"
            >
              <PencilIcon className="mr-3 h-5 w-5" aria-hidden="true" />
              <span>แก้ไข</span>
            </button>
            {(() => {
              const product = products.find((p) => p.id === openDropdownId);
              if (!product) return null;
              return (
                <button
                  onClick={() => handleToggleStatus(product)}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  role="menuitem"
                >
                  {product.is_active !== false ? (
                    <>
                      <svg className="mr-3 h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <span>ปิดใช้งาน</span>
                    </>
                  ) : (
                    <>
                      <svg className="mr-3 h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span>เปิดใช้งาน</span>
                    </>
                  )}
                </button>
              );
            })()}
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
    </div>
  );
};

export default Product;
