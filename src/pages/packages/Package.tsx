import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { Card } from '../../components/common/Card';
import { Package } from '@/src/types/entity/package.interface';
import { Category } from '@/src/types/entity/category.interface';
import { PackageApi } from '@/src/api/package';
import { CategoryApi } from '@/src/api/category';
import {
  PlusIcon,
  ManageIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from '../../assets/icons/Icons';
import { Pagination } from '../../components/common/Pagination';
import { AddPackageModal } from '../../components/features/package/AddPackageModal';
import { EditPackageModal } from '../../components/features/package/EditPackageModal';
import { PackageDetailsModal } from '../../components/features/package/PackageDetailsModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Input, Button } from '../../components/common/FormControls';
import { CategoryType } from '@/src/types';

const Packages: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<Package | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalItems, setTotalItems] = useState(0);

  const fetchCategories = async () => {
    try {
      const response = await CategoryApi.getCategories({ limit: 100 });
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await PackageApi.getPackages({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
      });

      setPackages(response.data);
      setTotalItems(response.meta?.total || response.data.length);
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    fetchCategories();
    fetchPackages();
  }, [fetchPackages]);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (pkg: Package) => {
    setSelectedPackage(pkg);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleEdit = (pkg: Package) => {
    setSelectedPackage(pkg);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (pkg: Package) => {
    setPackageToDelete(pkg);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const onCreatePackage = async (data: Partial<Package>) => {
    try {
      await PackageApi.createPackage(data);
      fetchPackages();
    } catch (error) {
      console.error('Failed to create package:', error);
      alert('Failed to create package');
    }
  };

  const onUpdatePackage = async (id: string, data: Partial<Package>) => {
    try {
      await PackageApi.updatePackage(id, data);
      fetchPackages();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update package:', error);
      alert('Failed to update package');
    }
  };

  const onDeletePackage = async (id: string) => {
    try {
      await PackageApi.deletePackage(id);
      fetchPackages();
    } catch (error) {
      console.error('Failed to delete package:', error);
      alert('Failed to delete package');
    }
  };

  const handleConfirmDelete = () => {
    if (packageToDelete) {
      onDeletePackage(packageToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setPackageToDelete(null);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    pkgId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === pkgId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setOpenDropdownId(pkgId);
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
      )
        return;
      if ((event.target as HTMLElement).closest('button[data-package-id]'))
        return;
      setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">แพ็กเกจ</h1>
            <p className="mt-1 text-slate-600">จัดการแพ็กเกจบริการทั้งหมด</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Input
                type="search"
                placeholder="ค้นหา (รหัส, ชื่อ, จำนวนครั้ง)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                title="ค้นหาด้วย: รหัสแพ็กเกจ, ชื่อแพ็กเกจ, จำนวนครั้ง"
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              สร้างแพ็กเกจ
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
                    รหัสแพ็กเกจ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    ชื่อแพ็กเกจ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase"
                  >
                    หมวดหมู่
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-center text-sm font-medium text-slate-600 uppercase"
                  >
                    จำนวนครั้ง
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-sm font-medium text-slate-600 uppercase"
                  >
                    ราคาแพ็กเกจ
                  </th>
                  <th scope="col" className="relative px-4 py-2.5">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {packages.map((pkg, index) => (
                  <tr key={pkg.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => handleViewDetails(pkg)}
                    >
                      {pkg.code || pkg.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {pkg.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {categoryMap.get(pkg.category_id) || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-center">
                      {pkg.visit_limit ? `${pkg.visit_limit} ครั้ง` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 text-right">
                      {/* TODO: Handle price range or min price display */}
                      {pkg.package_price && pkg.package_price.length > 0
                        ? `เริ่มต้น ฿${Math.min(...pkg.package_price.map((c) => c.minimum_price)).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : 'ตามเงื่อนไข'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="inline-block text-left">
                        <Button
                          data-package-id={pkg.id}
                          onClick={(e) => handleDropdownToggle(e, pkg.id)}
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
            zIndex: 50,
          }}
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          <div className="py-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                const pkg = packages.find((p) => p.id === openDropdownId);
                if (pkg) handleViewDetails(pkg);
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <EyeIcon className="mr-3 h-5 w-5" />
              <span>ดูรายละเอียด</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                const pkg = packages.find((p) => p.id === openDropdownId);
                if (pkg) handleEdit(pkg);
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <PencilIcon className="mr-3 h-5 w-5" />
              <span>แก้ไข</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                const pkg = packages.find((p) => p.id === openDropdownId);
                if (pkg) handleDelete(pkg);
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="mr-3 h-5 w-5" />
              <span>ลบ</span>
            </button>
          </div>
        </div>
      )}

      <AddPackageModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreatePackage={onCreatePackage}
        categories={categories}
      />
      <EditPackageModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        pkg={selectedPackage}
        onUpdatePackage={(updatedPkg) =>
          onUpdatePackage(updatedPkg.id, updatedPkg)
        }
        categories={categories}
      />
      <PackageDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        pkg={selectedPackage}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบแพ็กเกจ{' '}
            <strong>{packageToDelete?.name}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
    </>
  );
};

export default Packages;
