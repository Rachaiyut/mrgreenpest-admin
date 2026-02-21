import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

// Interface
import { Category } from '@/src/types/entity/category.interface';

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
import { Input, Button } from '../../components/common/FormControls';
import { Pagination } from '../../components/common/Pagination';
import { AddCategoryModal } from '../../components/features/category/AddCategoryModal';
import EditCategoryModal from '@/src/components/features/category/EditCategoryModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
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
  const [loading, setLoading] = useState(false);
  const [totalCategories, setTotalCategories] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await CategoryApi.getCategories({
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        sort_by: sortBy,
        sort_order: sortOrder as 'asc' | 'desc',
      });
      setCategories(response.data);

      setTotalCategories(response.meta.total);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลหมวดหมู่');
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, sortBy, sortOrder]);

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleEdit = (category: Category) => {
    setCategoryToEdit(category);
    setIsEditModalOpen(true);
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

  const onCreateCategory = useCallback(
    async (newCategory: Partial<Category>) => {
      try {
        await CategoryApi.createCategory(newCategory);
        fetchCategories();
        setIsAddModalOpen(false);
      } catch (error) {
        console.error('Error creating category:', error);
      }
    },
    [fetchCategories]
  );

  const onUpdateCategory = useCallback(
    async (id: string, updatedCategory: Partial<Category>) => {
      try {
        console.log('payload', id, updatedCategory);

        await CategoryApi.updateCategory(id, updatedCategory);
        fetchCategories();
        setIsEditModalOpen(false);
      } catch (error) {
        console.error('Error updating category:', error);
      }
    },
    [fetchCategories, setIsEditModalOpen]
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
            <div className="w-64">
              <Input
                type="search"
                placeholder="ค้นหา (รหัส, ชื่อ, รายละเอียด)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                title="ค้นหาด้วย: รหัส, ชื่อ, หรือรายละเอียดหมวดหมู่"
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
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
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    รหัสหมวดหมู่
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    ชื่อหมวดหมู่
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    รายละเอียด
                  </th>
                  <th scope="col" className="relative px-4 py-2.5">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {categories.map((category, index) => (
                  <tr key={category.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {category.code}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                      {category.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-sm">
                      {category.description || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="inline-block text-left">
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
          </div>
        </div>
      )}

      <AddCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreateCategory={onCreateCategory}
      />
      <EditCategoryModal
        isOpen={isEditModalOpen}
        category={categoryToEdit}
        onClose={() => setIsEditModalOpen(false)}
        onUpdateCategory={onUpdateCategory}
      />
    </>
  );
};

export default Categories;
