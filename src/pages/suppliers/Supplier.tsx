import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import Swal from 'sweetalert2';

// Components
import { Card } from '../../components/common/Card';

// Interface
import { Supplier } from '@/src/types/entity/supplier.interface';

// Api
import { SupplierApi } from '@/src/api/supplier';

import {
  LoadingIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ManageIcon,
  TruckIcon,
} from '../../assets/icons/Icons';
import { Pagination } from '../../components/common/Pagination';
import { SupplierModal } from '../../components/features/suppliers/SupplierModal';
import { SupplierDetailsModal } from '../../components/features/suppliers/SupplierDetailsModal';
import { Input, Select, Button } from '../../components/common/FormControls';
import { SupplierType } from '@/src/types';

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<'create' | 'edit'>('create');
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );

  const [typeFilter, setTypeFilter] = useState<SupplierType>();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleEdit = (supplier: Supplier) => {
    setSupplierToEdit(supplier);
    setFormModalMode('edit');
    setIsFormModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      await SupplierApi.updateSupplier(supplier.id, { is_active: !supplier.is_active } as Partial<Supplier>);
      fetchSupplier();
    } catch (error) {
      console.error('Error toggling supplier status:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเปลี่ยนสถานะได้' });
    }
    setOpenDropdownId(null);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    supplierId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === supplierId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setOpenDropdownId(supplierId);
      setDropdownPosition({
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.right + window.scrollX,
      });
    }
  };

  const fetchSupplier = useCallback(async () => {
    setLoading(true);
    try {
      const response = await SupplierApi.getSuppliers({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        type: typeFilter,
        sort_by: 'created_at',
        sort_order: 'desc',
        ...(statusFilter !== '' ? { is_active: statusFilter === 'true' } : {}),
      });
      setSuppliers(response.data);
      setTotalItems(response.meta?.total || response.data.length);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, typeFilter, statusFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openDropdownId) return;
      if (
        dropdownRef.current &&
        dropdownRef.current.contains(event.target as Node)
      ) {
        return;
      }
      if ((event.target as HTMLElement).closest('button[data-supplier-id]')) {
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
    fetchSupplier();
  }, [fetchSupplier]);

  const onSubmitSupplier = async (data: Partial<Supplier>) => {
    try {
      if (formModalMode === 'create') {
        await SupplierApi.createSupplier(data as Partial<Supplier>);
      } else if (supplierToEdit) {
        await SupplierApi.updateSupplier(supplierToEdit.id, data);
      }
      fetchSupplier();
      setIsFormModalOpen(false);
      setSupplierToEdit(null);
    } catch (error) {
      console.error('Error saving supplier:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกได้' });
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1 space-y-6 max-w-full">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ผู้จัดจำหน่าย</h1>
            <p className="mt-1 text-slate-600">
              จัดการข้อมูลผู้จัดจำหน่าย (Suppliers)
            </p>
          </div>
          <Button onClick={() => { setSupplierToEdit(null); setFormModalMode('create'); setIsFormModalOpen(true); }}>
            <PlusIcon className="h-5 w-5" />
            สร้างผู้จัดจำหน่าย
          </Button>
        </div>

        {/* Toolbar */}
        <Card className="!p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-80 flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหารหัส, ชื่อ, เลขประจำตัวผู้เสียภาษี"
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
              <Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as SupplierType);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border-slate-300 shadow-sm text-sm h-10"
              >
                <option value="">ทุกประเภท</option>
                <option value={SupplierType.CORPORATE}>นิติบุคคล</option>
                <option value={SupplierType.INDIVIDUAL}>บุคคลธรรมดา</option>
              </Select>
            </div>
            <div className="w-full sm:w-44 flex-shrink-0">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border-slate-300 shadow-sm text-sm h-10"
              >
                <option value="">สถานะทั้งหมด</option>
                <option value="true">ใช้งาน</option>
                <option value="false">ไม่ใช้งาน</option>
              </Select>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden items-center justify-center">
            <div className="flex flex-col items-center justify-center text-slate-500">
              <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="text-base font-medium">กำลังโหลดข้อมูลผู้จัดจำหน่าย...</p>
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
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    รหัสผู้จัดจำหน่าย
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    ชื่อผู้จัดจำหน่าย
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    ประเภทผู้จัดจำหน่าย
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    เลขประจำตัวผู้เสียภาษี
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    ชื่อผู้ติดต่อ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    เบอร์โทรศัพท์
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    อีเมล
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    สถานะ
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[49px] flex flex-col items-center justify-center text-slate-400">
                        <TruckIcon className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-base font-medium text-slate-500">ไม่พบผู้จัดจำหน่าย</p>
                        <p className="text-sm mt-1">ลองปรับตัวกรองหรือสร้างผู้จัดจำหน่ายใหม่</p>
                      </div>
                    </td>
                  </tr>
                ) : suppliers.map((supplier, index) => (
                  <tr key={supplier.id} className="hover:bg-slate-50 [&>td]:text-center [&>td]:align-middle">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {supplier.code}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                      {supplier.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${supplier.type === SupplierType.INDIVIDUAL ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {supplier.type === SupplierType.INDIVIDUAL ? 'บุคคลธรรมดา' : 'นิติบุคคล'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {supplier.tax_id || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {supplier.contact_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {(() => {
                        const raw = (supplier.phone || '').replace(/\D/g, '');
                        if (raw.length === 10) return `${raw.slice(0,3)}-${raw.slice(3,6)}-${raw.slice(6)}`;
                        if (raw.length === 9) return `${raw.slice(0,2)}-${raw.slice(2,5)}-${raw.slice(5)}`;
                        return supplier.phone || '-';
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {supplier.email || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          supplier.is_active !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {supplier.is_active !== false ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                      <div className="inline-block text-left">
                        <Button
                          data-supplier-id={supplier.id}
                          onClick={(e) => handleDropdownToggle(e, supplier.id)}
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
                const supplier = suppliers.find((s) => s.id === openDropdownId);
                if (supplier) handleViewDetails(supplier);
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              role="menuitem"
            >
              <EyeIcon className="mr-3 h-5 w-5" aria-hidden="true" />
              <span>ดูรายละเอียด</span>
            </button>
            <button
              onClick={() => {
                const supplier = suppliers.find((s) => s.id === openDropdownId);
                if (supplier) handleEdit(supplier);
              }}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              role="menuitem"
            >
              <PencilIcon className="mr-3 h-5 w-5" aria-hidden="true" />
              <span>แก้ไข</span>
            </button>
            {(() => {
              const supplier = suppliers.find((s) => s.id === openDropdownId);
              if (!supplier) return null;
              return (
                <button
                  onClick={() => handleToggleStatus(supplier)}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  role="menuitem"
                >
                  {supplier.is_active !== false ? (
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

      <SupplierModal
        isOpen={isFormModalOpen}
        onClose={() => { setIsFormModalOpen(false); setSupplierToEdit(null); }}
        mode={formModalMode}
        initialValues={supplierToEdit}
        onSubmit={onSubmitSupplier}
      />
      <SupplierDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        supplier={selectedSupplier}
      />
    </div>
  );
};

export default Suppliers;
