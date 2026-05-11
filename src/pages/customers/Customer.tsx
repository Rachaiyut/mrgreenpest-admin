import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';
import Swal from '@/src/utils/swal';
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
import { ActionDropdown, ActionDropdownItem } from '../../components/common';

import { CustomerModal } from '../../components/features/customers/CustomerModal';

import { Pagination } from '../../components/common/Pagination';
import { CustomerDetailsModal } from '../../components/features/customers/CustomerDetailsModal';
import { CustomerContractsListModal } from '../../components/features/customers/CustomerContractsListModal';
import { CustomerHistoryModal } from '../../components/features/customers/CustomerHistoryModal';
import { CustomerFollowUpModal } from '../../components/features/customers/CustomerFollowUpModal';
import { Input, Button } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
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

  const handleReactivate = async (customer: Customer) => {
    setOpenDropdownId(null);
    const fullName = [customer.first_name, customer.last_name]
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter((p) => p && p !== '-')
      .join(' ') || (customer as any).nickname || customer.code || '-';

    const r = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันการเปิดใช้งาน',
      html: `
        <div style="text-align:left;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;padding:14px 18px;box-shadow:0 1px 2px rgba(15,23,42,0.04);">
            <div style="display:flex;gap:8px;align-items:baseline;padding:6px 0;font-size:15px;line-height:1.5;">
              <span style="color:#64748b;font-weight:500;">รหัสลูกค้า:</span>
              <span style="color:#0f172a;font-weight:600;">${customer.code || '-'}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:baseline;padding:6px 0;border-top:1px solid #eef2f7;font-size:15px;line-height:1.5;">
              <span style="color:#64748b;font-weight:500;">ลูกค้า:</span>
              <span style="color:#0f172a;font-weight:600;">${fullName}</span>
            </div>
          </div>
          <div style="margin-top:14px;padding:12px 16px;background:#ecfdf5;border-left:4px solid #10b981;font-size:14px;color:#065f46;line-height:1.55;">
            เมื่อเปิดใช้งานแล้ว ลูกค้านี้จะกลับมาแสดงในรายการที่ใช้งาน
          </div>
        </div>
      `,
      width: 520,
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการเปิดใช้งาน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
    });
    if (!r.isConfirmed) return;

    try {
      await CustomerApi.updateCustomer(customer.id, { status: 'ACTIVE' as any });
      Swal.fire({
        icon: 'success',
        title: 'เปิดใช้งานแล้ว',
        timer: 1500,
        showConfirmButton: false,
      });
      fetchCustomers();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'เกิดข้อผิดพลาดในการเปิดใช้งาน';
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: message });
    }
  };

  const handleDelete = async (customer: Customer) => {
    setOpenDropdownId(null);
    const fullName = [customer.first_name, customer.last_name]
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter((p) => p && p !== '-')
      .join(' ') || (customer as any).nickname || customer.code || '-';

    const r = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการปิดใช้งาน',
      html: `
        <div style="text-align:left;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;padding:14px 18px;box-shadow:0 1px 2px rgba(15,23,42,0.04);">
            <div style="display:flex;gap:8px;align-items:baseline;padding:6px 0;font-size:15px;line-height:1.5;">
              <span style="color:#64748b;font-weight:500;">รหัสลูกค้า:</span>
              <span style="color:#0f172a;font-weight:600;">${customer.code || '-'}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:baseline;padding:6px 0;border-top:1px solid #eef2f7;font-size:15px;line-height:1.5;">
              <span style="color:#64748b;font-weight:500;">ลูกค้า:</span>
              <span style="color:#0f172a;font-weight:600;">${fullName}</span>
            </div>
          </div>
          <div style="margin-top:14px;padding:12px 16px;background:#fef2f2;border-left:4px solid #ef4444;font-size:14px;color:#991b1b;line-height:1.55;">
            เมื่อปิดใช้งานแล้ว ลูกค้านี้จะไม่แสดงในรายการที่ใช้งาน สามารถเปิดใช้งานใหม่ได้ภายหลัง
          </div>
        </div>
      `,
      width: 520,
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการปิดใช้งาน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
    });
    if (!r.isConfirmed) return;

    try {
      await CustomerApi.deleteCustomer(customer.id);
      Swal.fire({
        icon: 'success',
        title: 'ปิดใช้งานแล้ว',
        timer: 1500,
        showConfirmButton: false,
      });
      fetchCustomers();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'เกิดข้อผิดพลาดในการลบลูกค้า';
      Swal.fire({
        icon: 'warning',
        title: 'ลูกค้าอยู่ระหว่างสัญญา',
        text: message,
      });
    }
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
      } catch (error: any) {
        setIsDeleteModalOpen(false);
        const message = error?.response?.data?.message || 'เกิดข้อผิดพลาดในการลบลูกค้า';
        Swal.fire({
          icon: 'warning',
          title: 'ลูกค้าอยู่ระหว่างสัญญา',
          text: message,
          confirmButtonText: 'ตกลง',
        });
      }
    }
  };

  const handleCopyPortalLink = async (customer: Customer) => {
    try {
      const response = await CustomerApi.generatePortalToken(customer.id);
      const portalUrl = `${window.location.origin}/portal?token=${response.token}`;
      await navigator.clipboard.writeText(portalUrl);
      Swal.fire({ icon: 'success', title: 'คัดลอกลิงก์ Portal สำเร็จ!', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error('Error generating portal token:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการสร้างลิงก์' });
    }
    setOpenDropdownId(null);
  };

  const getActions = (customer: Customer): ActionDropdownItem[] => {
    const isInactive = customer.status === 'INACTIVE';
    return [
      { label: 'ดูรายละเอียด', icon: EyeIcon, onClick: () => handleViewDetails(customer) },
      { label: 'แก้ไข', icon: PencilIcon, onClick: () => handleEditClick(customer) },
      { label: 'คัดลอก Link Portal', icon: DocumentCheckIcon, onClick: () => handleCopyPortalLink(customer) },
      { label: 'สัญญา', icon: DocumentTextIcon, onClick: () => { setSelectedCustomer(customer); setIsContractsModalOpen(true); setOpenDropdownId(null); } },
      { label: 'ต่อสัญญา', icon: RenewIcon, onClick: () => { setSelectedCustomer(customer); setIsContractsModalOpen(true); setOpenDropdownId(null); } },
      { label: 'ประวัติ', icon: ClipboardDocumentListIcon, onClick: () => { setSelectedCustomer(customer); setIsHistoryModalOpen(true); setOpenDropdownId(null); } },
      { label: 'ติดตาม', icon: DocumentCheckIcon, onClick: () => { setSelectedCustomer(customer); setIsFollowUpModalOpen(true); setOpenDropdownId(null); } },
      isInactive
        ? { label: 'เปิดใช้งาน', icon: RenewIcon, onClick: () => handleReactivate(customer), isPrimary: true }
        : { label: 'ปิดใช้งาน', icon: TrashIcon, onClick: () => handleDelete(customer), isDanger: true },
    ];
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1 space-y-6 max-w-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ลูกค้า</h1>
            <p className="mt-1 text-slate-600">จัดการฐานข้อมูลลูกค้าของคุณ</p>
          </div>
          <Button onClick={handleCreateClick} className="shrink-0">
            <PlusIcon className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">สร้างลูกค้า</span>
            <span className="sm:hidden">สร้าง</span>
          </Button>
        </div>

        {/* Toolbar */}
        <Card className="!p-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-[28rem] flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหารหัส, ชื่อ-นามสกุล, ชื่อเล่น, เบอร์โทรศัพท์"
                value={searchQuery || ''}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10"
                title="ค้นหาด้วย: รหัสลูกค้า, ชื่อ-นามสกุล, ชื่อเล่น, เบอร์โทรศัพท์"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="w-full sm:w-48 flex-shrink-0">
              <DropdownSelect
                value={typeFilter || ''}
                onChange={(val) => {
                  setTypeFilter(val as SupplierType);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border-slate-300 shadow-sm text-sm h-10"
                placeholder="ทุกประเภท"
                options={[
                  { value: '', label: 'ทุกประเภท' },
                  { value: SupplierType.CORPORATE, label: 'นิติบุคคล' },
                  { value: SupplierType.INDIVIDUAL, label: 'บุคคลธรรมดา' },
                ]}
              />
            </div>
            <div className="ml-auto flex items-center rounded-lg bg-slate-200 p-1 shrink-0">
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
          </div>
        </Card>

        {/* 🌟 Content Area with Loading State */}
        {loading ? (
           <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center justify-center text-slate-500">
                <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                <p className="text-base font-medium">กำลังโหลดข้อมูลลูกค้า...</p>
              </div>
           </div>
        ) : view === 'list' ? (
          <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-auto w-full flex-1 relative">
              <CustomerListView
                customers={customers}
                getActions={getActions}
                openDropdownId={openDropdownId}
                setOpenDropdownId={setOpenDropdownId}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
              />
            </div>
            {totalItems > 0 && (
            <div className="mt-auto border-t border-slate-200">
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col w-full space-y-6 flex-1">
             <div className="flex-1">
              <CustomerCardView
                customers={customers}
                getActions={getActions}
                openDropdownId={openDropdownId}
                setOpenDropdownId={setOpenDropdownId}
              />
            </div>
            {totalItems > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 mt-auto sticky bottom-0 z-20">
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
            )}
          </div>
        )}
      </div>

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
      <CustomerHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        customer={selectedCustomer}
      />
      <CustomerFollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        customer={selectedCustomer}
      />
    </div>
  );
};

export default Customers;