import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

// Components
import { Card } from '../../components/common/Card';

// Interface
import { Supplier } from '@/src/types/entity/supplier.interface';

// Api
import { SupplierApi } from '@/src/api/supplier';

import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ManageIcon,
} from '../../assets/icons/Icons';
import { Pagination } from '../../components/common/Pagination';
import { AddSupplierModal } from '../../components/features/suppliers/AddSupplierModal';
import { SupplierDetailsModal } from '../../components/features/suppliers/SupplierDetailsModal';
import { Input, Select, Button } from '../../components/common/FormControls';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { EditSupplierModal } from '../../components/features/suppliers/EditSupplierModal';
import { SupplierType } from '@/src/types';

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null
  );

  const onDeleteSupplier = async (id: string) => {
    try {
      await SupplierApi.deleteSupplier(id);
      fetchSupplier();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

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
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (supplierToDelete) {
      onDeleteSupplier(supplierToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setSupplierToDelete(null);
  };

  const actions = [
    { label: 'ดูรายละเอียด', icon: EyeIcon },
    { label: 'แก้ไข', icon: PencilIcon },
    { label: 'ลบ', icon: TrashIcon, isDanger: true },
  ];

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
      });
      setSuppliers(response.data);
      setTotalItems(response.meta?.total || response.data.length);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, typeFilter]);

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

  const handleCreateSupplier = async (supplierData: Omit<Supplier, 'id'>) => {
    try {
      await SupplierApi.createSupplier(supplierData);
      setIsModalOpen(false);
      fetchSupplier();
    } catch (error) {
      console.error('Error creating supplier:', error);
    }
  };

  const handleUpdateSupplier = async (supplier: Supplier) => {
    try {
      const { id, ...data } = supplier;
      await SupplierApi.updateSupplier(id, data);
      fetchSupplier();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update supplier:', error);
      alert('Failed to update supplier');
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ผู้จัดจำหน่าย</h1>
            <p className="mt-1 text-slate-600">
              จัดการข้อมูลผู้จัดจำหน่าย (Suppliers)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Input
                type="search"
                placeholder="ค้นหา (รหัส, ชื่อ, เลขผู้เสียภาษี)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                title="ค้นหาด้วย: รหัสผู้จัดจำหน่าย, ชื่อผู้จัดจำหน่าย, เลขประจำตัวผู้เสียภาษี"
              />
            </div>
            <div className="w-48">
              <Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as SupplierType);
                  setCurrentPage(1);
                }}
              >
                <option value="">ทุกประเภท</option>
                <option value={SupplierType.CORPORATE}>นิติบุคคล</option>
                <option value={SupplierType.INDIVIDUAL}>บุคคลธรรมดา</option>
              </Select>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              สร้างผู้จัดจำหน่าย
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
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ลำดับ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    รหัสผู้จัดจำหน่าย
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ชื่อผู้จัดจำหน่าย
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ประเภท
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    เลขประจำตัวผู้เสียภาษี
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    ชื่อผู้ติดต่อ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    เบอร์โทรศัพท์
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap"
                  >
                    อีเมล
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {suppliers.map((supplier, index) => (
                  <tr key={supplier.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {supplier.code}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                      {supplier.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {supplier.type === SupplierType.INDIVIDUAL
                        ? 'บุคคลธรรมดา'
                        : 'นิติบุคคล'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {supplier.tax_id || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {supplier.contact_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {supplier.phone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {supplier.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
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
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={(e) => {
                  e.preventDefault();
                  const supplier = suppliers.find(
                    (s) => s.id === openDropdownId
                  );
                  if (!supplier) {
                    setOpenDropdownId(null);
                    return;
                  }

                  if (action.label === 'ดูรายละเอียด') {
                    handleViewDetails(supplier);
                  } else if (action.label === 'แก้ไข') {
                    handleEdit(supplier);
                  } else if (action.label === 'ลบ') {
                    handleDelete(supplier);
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

      <AddSupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateSupplier={handleCreateSupplier}
        suppliers={suppliers}
      />
      <EditSupplierModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        supplier={supplierToEdit}
        onUpdateSupplier={handleUpdateSupplier}
      />
      <SupplierDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        supplier={selectedSupplier}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบผู้จัดจำหน่าย{' '}
            <strong>{supplierToDelete?.id}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
    </>
  );
};

export default Suppliers;

