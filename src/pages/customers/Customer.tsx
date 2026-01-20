import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

// Interface
import { ICustomer } from '@/src/libs/common/interface/entity/customer.interface';

// Icon
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
} from '../../assets/icons/Icons';

// Component
import CustomerCardView from './CustomerCardView';
import CustomerListView from './CustomerListView';
import { Card } from '../../components/common/Card';
import { AddCustomerModal } from '../../components/features/customers/AddCustomerModal';
import { Pagination } from '../../components/common/Pagination';
import { CustomerDetailsModal } from '../../components/features/customers/CustomerDetailsModal';
import { EditCustomerModal } from '../../components/features/customers/EditCustomerModal';
import { CustomerContractsListModal } from '../../components/features/customers/CustomerContractsListModal';
import { Input, Button } from '../../components/common/FormControls';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';

// Api
import { Customer } from '@/src/libs/api/customer';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isContractsModalOpen, setIsContractsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<ICustomer | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'list' | 'card'>('list');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<ICustomer | null>(
    null
  );

  const reversedCustomers = useMemo(
    () => [...customers].reverse(),
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) {
      return reversedCustomers;
    }
  }, [reversedCustomers, searchQuery]);

  const totalItems = filteredCustomers.length;
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (customer: ICustomer) => {
    setSelectedCustomer(customer);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleEdit = (customer: ICustomer) => {
    setCustomerToEdit(customer);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (customer: ICustomer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleCreateCustomer = async (customerData: Omit<ICustomer, 'id'>) => {
    try {
      await Customer.createCustomer(customerData);
      fetchCustomers(); // Refresh the list
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  const handleUpdateCustomer = async (updatedCustomer: ICustomer) => {
    try {
      await Customer.updateCustomer(updatedCustomer.id, updatedCustomer);
      fetchCustomers(); // Refresh the list
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (customerToDelete) {
      try {
        await Customer.deleteCustomer(customerToDelete.id);
        fetchCustomers(); // Refresh the list
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
    setIsDeleteModalOpen(false);
    setCustomerToDelete(null);
  };

  const actions = [
    { label: 'ดูรายละเอียด', icon: EyeIcon },
    { label: 'แก้ไข', icon: PencilIcon },
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

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Customer.getCustomers({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setCustomers(response.data);
      setTotalCustomers(response.meta.total);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ลูกค้า</h1>
            <p className="mt-1 text-slate-600">จัดการฐานข้อมูลลูกค้าของคุณ</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Input
                type="search"
                placeholder="ค้นหา (สัญญา, รหัส, ชื่อ, ชื่อเล่น, โทร, ที่อยู่)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset page on search
                }}
                title="ค้นหาด้วย: เลขที่สัญญา, รหัสลูกค้า, ชื่อนามสกุล, ชื่อเล่น, เบอร์โทรศัพท์, ที่อยู่"
              />
            </div>
            <div className="flex items-center rounded-lg bg-slate-200 p-1">
              <Button
                onClick={() => setView('list')}
                variant="ghost"
                className={`px-3 py-1 text-sm font-medium rounded-md h-auto ${view === 'list' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`}
                title="มุมมองรายการ"
              >
                <ListBulletIcon className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => setView('card')}
                variant="ghost"
                className={`px-3 py-1 text-sm font-medium rounded-md h-auto ${view === 'card' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`}
                title="มุมมองการ์ด"
              >
                <ViewColumnsIcon className="h-5 w-5" />
              </Button>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <PlusIcon className="h-5 w-5" />
              สร้างลูกค้า
            </Button>
          </div>
        </div>

        {view === 'list' ? (
          <Card className="!p-0">
            <CustomerListView
              customers={paginatedCustomers}
              handleDropdownToggle={handleDropdownToggle}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
            />
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </Card>
        ) : (
          <>
            <CustomerCardView
              customers={paginatedCustomers}
              handleDropdownToggle={handleDropdownToggle}
            />
            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              className="mt-6 rounded-lg shadow-sm"
            />
          </>
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
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
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
                    handleEdit(customer);
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
                className={`flex items-center w-full text-left px-4 py-2 text-sm ${action.isDanger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}
                role="menuitem"
              >
                <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                <span>{action.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateCustomer={handleCreateCustomer}
      />
      <CustomerDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        customer={selectedCustomer}
      />
      <EditCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={customerToEdit}
        onUpdateCustomer={handleUpdateCustomer}
      />
      {/* <CustomerContractsListModal
        isOpen={isContractsModalOpen}
        onClose={() => setIsContractsModalOpen(false)}
        customer={selectedCustomer}
        contracts={contracts}
        quotations={quotations}
        onCreateContract={onCreateContract}
        onCreateJob={onCreateJob}
      /> */}
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
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
    </>
  );
};

export default Customers;
