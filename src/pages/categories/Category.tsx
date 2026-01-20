import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

// Interface
import { ICategory } from '@/src/libs/common/interface/entity/category.interface';

// API
import { Category } from '@/src/libs/api/category';

// Icon
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ManageIcon,
} from '../../assets/icons/Icons';

// Component
import { Card } from '../../components/common/Card';
import { Input, Button } from '../../components/common/FormControls';
import { Pagination } from '../../components/common/Pagination';
import { AddCategoryModal } from '../../components/features/category/AddCategoryModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<ICategory | null>(null);
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
  const [categoryToDelete, setCategoryToDelete] = useState<ICategory | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalCategories, setTotalCategories] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Category.getCategories({
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

  const handleEdit = (category: ICategory) => {
    setCategoryToEdit(category);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (category: ICategory) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (categoryToDelete) {
      try {
        await Category.deleteCategory(categoryToDelete.id);
        fetchCategories(); // Refresh the list
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
    setIsDeleteModalOpen(false);
    setCategoryToDelete(null);
  };

  const onCreateCategory = useCallback(
    async (newCategory: Partial<ICategory>) => {
      try {
        await Category.createCategory(newCategory);
        fetchCategories(); // Refresh the list
        setIsAddModalOpen(false);
      } catch (error) {
        console.error('Error creating category:', error);
      }
    },
    [fetchCategories]
  );

  const onUpdateCategory = useCallback(
    async (id: string, updatedCategory: Partial<ICategory>) => {
      try {
        await Category.updateCategory(id, updatedCategory);
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

    </>
  );
};

export default Categories;
