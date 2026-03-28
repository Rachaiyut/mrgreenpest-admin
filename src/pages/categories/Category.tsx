import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

// Interface
import { Category } from '@/src/types/entity/category.interface';
import { CategoryType } from '@/src/types/enums/category';

// API
import { CategoryApi } from '@/src/api/category';

// Icon
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ManageIcon,
  EyeIcon,
} from '../../assets/icons/Icons';

// Component
import { Card } from '../../components/common/Card';
import { Input, Button, Select } from '../../components/common/FormControls';
import { Pagination } from '../../components/common/Pagination';
import { CategoryModal } from '../../components/features/category/CategoryModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [totalCategories, setTotalCategories] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await CategoryApi.getCategories({
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        sort_by: sortBy,
        sort_order: sortOrder as 'asc' | 'desc',
        ...(typeFilter ? { type: typeFilter as CategoryType } : {}),
        ...(statusFilter !== '' ? { is_active: statusFilter === 'true' } : {}),
      });
      setCategories(response.data);

      setTotalCategories(response.meta.total);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลหมวดหมู่');
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, sortBy, sortOrder, typeFilter, statusFilter]);

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setModalMode('edit');
    setIsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (categoryToDelete) {
      try {
        await CategoryApi.deleteCategory(categoryToDelete.id);
        fetchCategories(); // Refresh the list
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
    setIsDeleteModalOpen(false);
    setCategoryToDelete(null);
  };

  const onSubmitCategory = useCallback(
    async (data: Partial<Category>) => {
      try {
        if (modalMode === 'create') {
          await CategoryApi.createCategory(data);
        } else if (selectedCategory) {
          await CategoryApi.updateCategory(selectedCategory.id, data);
        }
        fetchCategories();
        setIsModalOpen(false);
        setSelectedCategory(null);
      } catch (error) {
        console.error('Error saving category:', error);
      }
    },
    [fetchCategories, modalMode, selectedCategory]
  );

  const handleToggleStatus = useCallback(
    async (category: Category) => {
      try {
        await CategoryApi.updateCategory(category.id, {
          is_active: !category.is_active,
        });
        fetchCategories();
      } catch (error) {
        console.error('Error toggling category status:', error);
      }
      setOpenDropdownId(null);
    },
    [fetchCategories]
  );

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    categoryId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === categoryId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setOpenDropdownId(categoryId);
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
      if ((event.target as HTMLElement).closest('button[data-category-id]')) {
        return;
      }
      setOpenDropdownId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              หมวดหมู่สินค้า
            </h1>
            <p className="mt-1 text-slate-600">จัดการหมวดหมู่สำหรับสินค้า</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-80">
              <Input
                type="search"
                placeholder="ค้นหารหัส, ชื่อ, รายละเอียด"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="w-48">
              <Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">ประเภททั้งหมด</option>
                <option value={CategoryType.PRODUCT}>สินค้า</option>
                <option value={CategoryType.SERVICE}>บริการ</option>
              </Select>
            </div>
            <div className="w-48">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">สถานะทั้งหมด</option>
                <option value="true">ใช้งาน</option>
                <option value="false">ไม่ใช้งาน</option>
              </Select>
            </div>
            <Button onClick={() => { setSelectedCategory(null); setModalMode('create'); setIsModalOpen(true); }}>
              <PlusIcon className="h-5 w-5" />
              สร้างหมวดหมู่
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
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    รหัสหมวดหมู่
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    ชื่อหมวดหมู่
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    ประเภทหมวดหมู่
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    รายละเอียด
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    สถานะ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {categories.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                ) : categories.map((category, index) => (
                  <tr key={category.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {category.code}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                      {category.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {category.type === CategoryType.PRODUCT ? 'สินค้า' : category.type === CategoryType.SERVICE ? 'บริการ' : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 truncate max-w-sm">
                      {category.description || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          category.is_active !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {category.is_active !== false ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                      <div className="inline-block">
                        <Button
                          data-package-id={category.id}
                          onClick={(e) => handleDropdownToggle(e, category.id)}
                          variant="icon"
                          title="ตัวเลือก"
                        >
                          <span className="sr-only">Open options</span>
                          <ManageIcon className="h-5 w-5" />
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
              totalItems={totalCategories}
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
            zIndex: 50,
          }}
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          <div className="py-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                const category = categories.find(
                  (p) => p.id === openDropdownId
                );
                if (category) handleEdit(category);
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <PencilIcon className="mr-3 h-5 w-5" />
              <span>แก้ไข</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                const category = categories.find(
                  (p) => p.id === openDropdownId
                );
                if (category) handleToggleStatus(category);
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              {(() => {
                const category = categories.find((p) => p.id === openDropdownId);
                return category?.is_active !== false ? (
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
                );
              })()}
            </button>
          </div>
        </div>
      )}

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedCategory(null); }}
        mode={modalMode}
        initialValues={selectedCategory}
        onSubmit={onSubmitCategory}
      />
    </>
  );
};

export default Categories;
