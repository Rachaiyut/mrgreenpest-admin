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
import { AddCategoryModal } from '../../components/features/products/AddCategoryModal';
import { EditCategoryModal } from '../../components/features/products/EditCategoryModal';
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
  const [totalCategories, setTotalCategories] = useState<number>(0);
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

      console.log("res", response)

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
        fetchCategories(); // Refresh the list
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
                          data-category-id={category.id}
                          onClick={(e) => handleDropdownToggle(e, category.id)}
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
          }}
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const cat = categories.find((c) => c.id === openDropdownId);
                if (cat) handleEdit(cat);
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <PencilIcon className="mr-3 h-5 w-5" />
              <span>แก้ไข</span>
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const cat = categories.find((c) => c.id === openDropdownId);
                if (cat) handleDelete(cat);
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="mr-3 h-5 w-5" />
              <span>ลบ</span>
            </a>
          </div>
        </div>
      )}

      <AddCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreateCategory={onCreateCategory}
        categories={categories}
      />
      <EditCategoryModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        category={categoryToEdit}
        onUpdateCategory={onUpdateCategory}
        categories={categories}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบหมวดหมู่"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่{' '}
            <strong>{categoryToDelete?.name}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
    </>
  );
};

export default Categories;
