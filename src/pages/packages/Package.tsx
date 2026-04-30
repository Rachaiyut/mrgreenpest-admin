import Swal from 'sweetalert2';
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  Card,
  Pagination,
  ConfirmationModal,
  Input,
  Button,
} from '../../components/common';
import { Package, Category, CategoryType, Unit } from '@/src/types';
import { ContractDurationLabel } from '@/src/types/enums/package';
import { PackageApi, CategoryApi, Unit as UnitApi } from '@/src/api';
import {
  LoadingIcon,
  PlusIcon,
  ManageIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from '../../assets/icons/Icons';

import {
  PackageModal,
  PackageDetailsModal,
} from '../../components/features/package';

const Packages: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
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
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [totalItems, setTotalItems] = useState(0);

  const fetchCategories = async () => {
    try {
      const response = await CategoryApi.getCategories({
        type: CategoryType.SERVICE,
        limit: 100,
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await UnitApi.getUnit({ limit: 100 });
      setUnits(response.data);
    } catch (error) {
      console.error('Failed to fetch units:', error);
    }
  };

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await PackageApi.getPackages({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        ...(selectedCategoryId ? { category_id: selectedCategoryId } : {}),
      });

      setPackages(response.data);
      setTotalItems(response.meta?.total || response.data.length);
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, selectedCategoryId]);

  useEffect(() => {
    fetchCategories();
    fetchUnits();
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

  const handleEdit = async (pkg: Package) => {
    setOpenDropdownId(null);
    try {
      const res = await PackageApi.getPackageById(pkg.id);
      const fullPkg = (res as unknown as Record<string, unknown>).data || res;
      setSelectedPackage(fullPkg as Package);
      setModalMode('edit');
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch package:', error);
      setSelectedPackage(pkg);
      setModalMode('edit');
      setIsModalOpen(true);
    }
  };

  const handleDelete = (pkg: Package) => {
    setPackageToDelete(pkg);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const onCreatePackage = async (data: Partial<Package>): Promise<boolean> => {
    try {
      await PackageApi.createPackage(data);
      fetchPackages();
      return true;
    } catch (error: any) {
      console.error('Failed to create package:', error);
      const errMsg = error?.response?.data?.errors
        ? Object.values(error.response.data.errors).join(', ')
        : 'ไม่สามารถสร้างแพ็กเกจได้';
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: errMsg });
      return false;
    }
  };

  const onUpdatePackage = async (id: string, data: Partial<Package>): Promise<boolean> => {
    try {
      await PackageApi.updatePackage(id, data);
      fetchPackages();
      setIsModalOpen(false);
      return true;
    } catch (error: any) {
      console.error('Failed to update package:', error);
      const errMsg = error?.response?.data?.errors
        ? Object.values(error.response.data.errors).join(', ')
        : 'ไม่สามารถแก้ไขแพ็กเกจได้';
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: errMsg });
      return false;
    }
  };

  const onDeletePackage = async (id: string) => {
    try {
      await PackageApi.deletePackage(id);
      fetchPackages();
    } catch (error) {
      console.error('Failed to delete package:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'Failed to delete package' });
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
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1 space-y-6 max-w-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">แพ็กเกจ</h1>
            <p className="mt-1 text-slate-600">จัดการแพ็กเกจบริการทั้งหมด</p>
          </div>
          <Button onClick={() => { setSelectedPackage(null); setModalMode('create'); setIsModalOpen(true); }}>
            <PlusIcon className="h-5 w-5" />
            สร้างแพ็กเกจ
          </Button>
        </div>

        {/* Toolbar */}
        <Card className="!p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-80 flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหารหัสแพ็กเกจ, ชื่อแพ็กเกจ"
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
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">หมวดหมู่ทั้งหมด</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden items-center justify-center">
            <div className="flex flex-col items-center justify-center text-slate-500">
              <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="text-base font-medium">กำลังโหลดข้อมูลแพ็กเกจ...</p>
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
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    รหัสแพ็กเกจ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    ชื่อแพ็กเกจ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider"
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
                    className="px-4 py-2.5 text-center text-sm font-medium text-slate-600 uppercase"
                  >
                    อายุสัญญา
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    ราคาแพ็กเกจ (มีปลวก)
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    ราคาแพ็กเกจ (ไม่มีปลวก)
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-center text-sm font-medium text-slate-600 uppercase"
                  >
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {packages.map((pkg, index) => (
                  <tr key={pkg.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary hover:underline cursor-pointer text-center"
                      onClick={() => handleViewDetails(pkg)}
                    >
                      {pkg.code || pkg.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-center">
                      {pkg.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                      {pkg.category?.name ||
                        categoryMap.get(pkg.category_id) ||
                        '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-center">
                      {pkg.visit_limit ? `${pkg.visit_limit} ครั้ง` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-center">
                      {pkg.contract_duration ? ContractDurationLabel[pkg.contract_duration] : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 text-center">
                      {pkg.package_prices && pkg.package_prices.length > 0
                        ? `เริ่มต้น ${Math.min(...pkg.package_prices.map((c) => c.min_price_with_termite)).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`
                        : 'ตามเงื่อนไข'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 text-center">
                      {pkg.package_prices && pkg.package_prices.length > 0
                        ? `เริ่มต้น ${Math.min(...pkg.package_prices.map((c) => c.min_price_without_termite)).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`
                        : 'ตามเงื่อนไข'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-center">
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

      <PackageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        initialValues={selectedPackage}
        onSubmit={async (data) => {
          let success = false;
          if (modalMode === 'create') {
            success = await onCreatePackage(data);
          } else if (selectedPackage) {
            success = await onUpdatePackage(selectedPackage.id, data);
          }
          return success;
        }}
        categories={categories}
        units={units}
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
    </div>
  );
};

export default Packages;
