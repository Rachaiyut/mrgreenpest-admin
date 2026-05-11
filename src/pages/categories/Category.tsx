import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';
import Swal from '@/src/utils/swal';

// Interface
import { Category } from '@/src/types/entity/category.interface';
import { CategoryType } from '@/src/types/enums/category';

// API
import { CategoryApi } from '@/src/api/category';

// Icon
import {
  LoadingIcon,
  PlusIcon,
  PencilIcon,
  ArchiveBoxIcon,
  XCircleIcon,
  CheckCircleIcon,
} from '../../assets/icons/Icons';

// Component
import { Card } from '../../components/common/Card';
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '@/src/components/common/DropdownSelect';
import { Pagination } from '../../components/common/Pagination';
import { ActionDropdown, ActionDropdownItem } from '../../components/common/ActionDropdown';
import { CategoryModal } from '../../components/features/category/CategoryModal';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
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
      } catch (error: unknown) {
        console.error('Error saving category:', error);
        const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ไม่สามารถบันทึกได้';
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: msg });
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

  const getCategoryActions = (category: Category): ActionDropdownItem[] => [
    { label: 'แก้ไข', icon: PencilIcon, onClick: () => handleEdit(category) },
    {
      label: category.is_active !== false ? 'ปิดใช้งาน' : 'เปิดใช้งาน',
      icon: category.is_active !== false ? XCircleIcon : CheckCircleIcon,
      isDanger: category.is_active !== false,
      isPrimary: category.is_active === false,
      onClick: () => handleToggleStatus(category),
    },
  ];

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1 space-y-6 max-w-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              หมวดหมู่สินค้า
            </h1>
            <p className="mt-1 text-slate-600">จัดการหมวดหมู่สำหรับสินค้า</p>
          </div>
          <Button onClick={() => { setSelectedCategory(null); setModalMode('create'); setIsModalOpen(true); }}>
            <PlusIcon className="h-5 w-5" />
            สร้างหมวดหมู่
          </Button>
        </div>

        {/* Toolbar */}
        <Card className="!p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-80 flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหารหัส, ชื่อ, รายละเอียด"
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
            <div className="w-full sm:w-44 flex-shrink-0">
              <DropdownSelect
                value={typeFilter}
                onChange={(val) => {
                  setTypeFilter(val);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border-slate-300 shadow-sm text-sm h-10"
                options={[
                  { value: '', label: 'ประเภททั้งหมด' },
                  { value: CategoryType.PRODUCT, label: 'สินค้า' },
                  { value: CategoryType.SERVICE, label: 'บริการ' },
                ]}
              />
            </div>
            <div className="w-full sm:w-44 flex-shrink-0">
              <DropdownSelect
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border-slate-300 shadow-sm text-sm h-10"
                options={[
                  { value: '', label: 'สถานะทั้งหมด' },
                  { value: 'true', label: 'ใช้งาน' },
                  { value: 'false', label: 'ไม่ใช้งาน' },
                ]}
              />
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden items-center justify-center">
            <div className="flex flex-col items-center justify-center text-slate-500">
              <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="text-base font-medium">กำลังโหลดข้อมูลหมวดหมู่...</p>
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
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    อักษรย่อหมวดหมู่
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
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider"
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
                    <td colSpan={7} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[49px] flex flex-col items-center justify-center text-slate-400">
                        <ArchiveBoxIcon className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-base font-medium text-slate-500">
                          ไม่พบข้อมูลหมวดหมู่สินค้า
                        </p>
                        <p className="text-sm mt-1">
                          {searchQuery || typeFilter || statusFilter ? 'ลองค้นหาด้วยคำอื่น หรือปรับตัวกรองใหม่' : 'ลองสร้างหมวดหมู่ใหม่'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : categories.map((category, index) => (
                  <tr key={category.id} className="hover:bg-slate-50 [&>td]:align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
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
                      <ActionDropdown
                        actions={getCategoryActions(category)}
                        itemId={category.id}
                        openId={openDropdownId}
                        onToggle={setOpenDropdownId}
                      />
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
              totalItems={totalCategories}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        </div>
        )}
      </div>


      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedCategory(null); }}
        mode={modalMode}
        initialValues={selectedCategory}
        onSubmit={onSubmitCategory}
      />
    </div>
  );
};

export default Categories;
