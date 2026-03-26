import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import Swal from 'sweetalert2';
import { Customer } from '@/src/types/entity/customer.interface';
import { useData } from '../../contexts/DataContext';
import { CustomerApi } from '@/src/api/customer';
import {
  PlusIcon,
  EyeIcon,
  DocumentTextIcon,
  RenewIcon,
  PencilIcon,
  ClipboardDocumentListIcon,
  TrashIcon,
  ViewColumnsIcon,
  ListBulletIcon,
  LoadingIcon,
  DocumentCheckIcon,
} from '../../assets/icons/Icons';

import CustomerCardView from './CustomerCardView';
import CustomerListView from './CustomerListView';
import { Card } from '../../components/common/Card';

import { CustomerModal } from '../../components/features/customers/CustomerModal';

import { Pagination } from '../../components/common/Pagination';
import { CustomerDetailsModal } from '../../components/features/customers/CustomerDetailsModal';
import { CustomerContractsListModal } from '../../components/features/customers/CustomerContractsListModal';
import { Input, Button, Select } from '../../components/common/FormControls';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { SupplierType } from '@/src/types';

const Customers: React.FC = () => {
  const { contracts, quotations, handlers } = useData();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [sortBy, setSortBy] = useState<string>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 🟢 2. รวบ State ของ Modal สร้าง/แก้ไข ไว้ด้วยกัน
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  const [isContractsModalOpen, setIsContractsModalOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'list' | 'card'>('list');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<SupplierType | undefined>(
    undefined
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await CustomerApi.getCustomers({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        type: typeFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setCustomers(response.data);
      setTotalItems(response.meta.total);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, typeFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  // 🟢 3. ฟังก์ชันตอนกด "แก้ไข"
  const handleEditClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalMode('edit');
    setIsCustomerModalOpen(true);
    setOpenDropdownId(null);
  };

  // 🟢 4. ฟังก์ชันตอนกด "สร้างใหม่"
  const handleCreateClick = () => {
    setSelectedCustomer(null);
    setModalMode('create');
    setIsCustomerModalOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  // 🟢 5. ฟังก์ชันสำหรับ Submit ข้อมูล (รวบ Create กับ Update ไว้ที่เดียวกัน)
  const handleSubmitCustomer = async (data: Omit<Customer, 'id' | 'code'> | Customer) => {
    try {
      if (modalMode === 'edit' && selectedCustomer) {
        await CustomerApi.updateCustomer(selectedCustomer.id, data as Customer);
      } else {
        await CustomerApi.createCustomer(data);
      }
      setIsCustomerModalOpen(false);
      setSelectedCustomer(null);
      fetchCustomers(); // โหลดตารางใหม่
    } catch (error) {
      console.error(`Error ${modalMode} customer:`, error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
  };

  const handleConfirmDelete = async () => {
    if (customerToDelete) {
      try {
        await CustomerApi.deleteCustomer(customerToDelete.id);
        setIsDeleteModalOpen(false);
        setCustomerToDelete(null);
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  const handleCopyPortalLink = async (customer: Customer) => {
    try {
      const response = await CustomerApi.generatePortalToken(customer.id);
      const portalUrl = `${window.location.origin}/portal?token=${response.data.token}`;
      await navigator.clipboard.writeText(portalUrl);
      Swal.fire({ icon: 'success', title: 'คัดลอกลิงก์ Portal สำเร็จ!', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error('Error generating portal token:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการสร้างลิงก์' });
    }
    setOpenDropdownId(null);
  };

  const actions = [
    { label: 'ดูรายละเอียด', icon: EyeIcon },
    { label: 'แก้ไข', icon: PencilIcon },
    { label: 'คัดลอก Link Portal', icon: DocumentCheckIcon },
    { label: 'สัญญา', icon: DocumentTextIcon },
    { label: 'ต่อสัญญา', icon: RenewIcon },
    { label: 'ประวัติ', icon: ClipboardDocumentListIcon },
    { label: 'ลบ', icon: TrashIcon, isDanger: true },
  ];

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    customerId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === customerId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setOpenDropdownId(customerId);
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
      if ((event.target as HTMLElement).closest('button[data-customer-id]')) {
        return;
      }
      setOpenDropdownId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col min-h-[calc(100vh-64px)] space-y-6 max-w-full">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
          <div className="shrink-0">
            <h1 className="text-3xl font-bold text-slate-800">ลูกค้า</h1>
            <p className="mt-1 text-slate-600">จัดการฐานข้อมูลลูกค้าของคุณ</p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full xl:w-auto xl:flex-nowrap">
            <div className="w-full sm:flex-1 xl:w-72">
              <Input
                type="search"
                placeholder="ค้นหารหัส, ชื่อ-นามสกุล, ชื่อเล่น, เบอร์โทรศัพท์, ที่อยู่"
                value={searchQuery || ''}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset page on search
                }}
                className="w-full"
                title="ค้นหาด้วย: เลขที่สัญญา, รหัสลูกค้า, ชื่อนามสกุล, ชื่อเล่น, เบอร์โทรศัพท์, ที่อยู่"
              />
            </div>
            <div className="w-full sm:w-48 shrink-0">
              <Select
                value={typeFilter || ''}
                onChange={(e) => {
                  setTypeFilter(e.target.value as SupplierType);
                  setCurrentPage(1);
                }}
                className="w-full"
              >
                <option value="">ทุกประเภท</option>
                <option value={SupplierType.CORPORATE}>นิติบุคคล</option>
                <option value={SupplierType.INDIVIDUAL}>บุคคลธรรมดา</option>
              </Select>
            </div>
            <div className="flex items-center justify-between w-full sm:w-auto gap-3">
              <div className="flex items-center rounded-lg bg-slate-200 p-1 shrink-0">
                <Button
                  onClick={() => setView('list')}
                  variant="ghost"
                  className={`px-3 py-1.5 text-sm font-medium rounded-md h-auto ${view === 'list' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`}
                  title="มุมมองรายการ"
                >
                  <ListBulletIcon className="h-5 w-5" />
                </Button>
                <Button
                  onClick={() => setView('card')}
                  variant="ghost"
                  className={`px-3 py-1.5 text-sm font-medium rounded-md h-auto ${view === 'card' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`}
                  title="มุมมองการ์ด"
                >
                  <ViewColumnsIcon className="h-5 w-5" />
                </Button>
              </div>
              <Button onClick={handleCreateClick} className="shrink-0 flex-1 sm:flex-none justify-center">
                <PlusIcon className="h-5 w-5 sm:mr-2" />
                 <span className="hidden sm:inline">สร้างลูกค้า</span>
                 <span className="sm:hidden">สร้าง</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 🌟 Content Area with Loading State */}
        {loading ? (
           <Card className="!p-0 w-full flex flex-col overflow-hidden border border-slate-200 flex-1 shadow-sm items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center justify-center text-slate-500">
                <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                <p className="text-base font-medium">กำลังโหลดข้อมูลลูกค้า...</p>
              </div>
           </Card>
        ) : view === 'list' ? (
          <Card className="!p-0 w-full flex flex-col overflow-hidden border border-slate-200 flex-1 shadow-sm">
            <div className="overflow-auto w-full flex-1 relative">
              <CustomerListView
                customers={customers}
                handleDropdownToggle={handleDropdownToggle}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
              />
            </div>
            <div className="border-t border-slate-200 bg-white mt-auto sticky bottom-0 z-20 w-full pb-safe">
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          </Card>
        ) : (
          <div className="flex flex-col w-full space-y-6 flex-1">
             <div className="flex-1">
              <CustomerCardView
                customers={customers}
                handleDropdownToggle={handleDropdownToggle}
              />
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 mt-auto sticky bottom-0 z-20">
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
            {actions.map((action) => (
              <a
                key={action.label}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const customer = customers.find(
                    (c) => c.id === openDropdownId
                  );
                  if (!customer) {
                    setOpenDropdownId(null);
                    return;
                  }

                  if (action.label === 'ดูรายละเอียด') {
                    handleViewDetails(customer);
                  } else if (action.label === 'แก้ไข') {
                    handleEditClick(customer);
                  } else if (action.label === 'คัดลอก Link Portal') {
                    handleCopyPortalLink(customer);
                  } else if (action.label === 'สัญญา') {
                    setSelectedCustomer(customer);
                    setIsContractsModalOpen(true);
                    setOpenDropdownId(null);
                  } else if (action.label === 'ลบ') {
                    handleDelete(customer);
                  } else {
                    setOpenDropdownId(null);
                  }
                }}
                className={`flex items-center w-full text-left px-4 py-2.5 text-sm transition-colors ${action.isDanger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}
                role="menuitem"
              >
                <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                <span>{action.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 🟢 6. เรียกใช้งาน CustomerModal แทน 2 ตัวเก่า */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        mode={modalMode}
        initialValues={selectedCustomer}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setSelectedCustomer(null);
        }}
        onSubmit={handleSubmitCustomer}
      />

      <CustomerDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        customer={selectedCustomer}
      />
      
      <CustomerContractsListModal
        isOpen={isContractsModalOpen}
        onClose={() => setIsContractsModalOpen(false)}
        customer={selectedCustomer}
        contracts={contracts}
        onCreateContract={() => {}}
        onCreateJob={() => {}}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้า{' '}
            <strong>{customerToDelete?.id}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </>
  );
};

export default Customers;