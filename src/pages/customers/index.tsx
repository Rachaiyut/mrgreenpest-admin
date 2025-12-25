import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Customer, Contract, Quotation } from '../../types';
import { PlusIcon, EyeIcon, DocumentTextIcon, RenewIcon, PencilIcon, ClipboardDocumentListIcon, TrashIcon, ManageIcon, ViewColumnsIcon, ListBulletIcon, PhoneIcon, EnvelopeIcon, UserIcon } from '../../assets/icons/Icons';
import { AddCustomerModal } from '../../components/features/customers/AddCustomerModal';
import { Pagination } from '../../components/common/Pagination';
import { CustomerDetailsModal } from '../../components/features/customers/CustomerDetailsModal';
import { EditCustomerModal } from '../../components/features/customers/EditCustomerModal';
import { CustomerContractsListModal } from '../../components/features/customers/CustomerContractsListModal';
import { Input, Button } from '../../components/common/FormControls';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { formatThaiDate } from '../../constants';

const calculateDuration = (startDate: string) => {
    if (!startDate) return '-';
    const start = new Date(startDate);
    const now = new Date();

    // Calculate difference in milliseconds
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
        return `${diffDays} วัน`;
    }

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();

    if (months < 0) {
        years--;
        months += 12;
    }

    if (years > 0) {
        return `${years} ปี ${months > 0 ? `${months} เดือน` : ''}`;
    }
    return `${months} เดือน`;
};

const CustomerListView: React.FC<{
    customers: Customer[];
    handleDropdownToggle: (event: React.MouseEvent<HTMLButtonElement>, customerId: string) => void;
    currentPage: number;
    itemsPerPage: number;
}> = ({ customers, handleDropdownToggle, currentPage, itemsPerPage }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
                <tr>
                    <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap">ลำดับ</th>
                    <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap">รหัสลูกค้า</th>
                    <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap">ชื่อ-นามสกุล</th>
                    <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap">ชื่อเล่น</th>
                    <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap">เบอร์โทรศัพท์</th>
                    <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap">ประเภทลูกค้า</th>
                    <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase tracking-wide whitespace-nowrap">ระยะเวลา</th>
                    <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">จัดการ</span>
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
                {customers.map((customer, index) => (
                    <tr key={customer.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{customer.id}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">{customer.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{customer.nickname || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{customer.phone}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{customer.type}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                {calculateDuration(customer.createdAt)}
                            </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="inline-block text-left">
                                <Button
                                    data-customer-id={customer.id}
                                    onClick={(e) => handleDropdownToggle(e, customer.id)}
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
);

const CustomerCardView: React.FC<{
    customers: Customer[];
    handleDropdownToggle: (event: React.MouseEvent<HTMLButtonElement>, customerId: string) => void;
}> = ({ customers, handleDropdownToggle }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {customers.map(customer => (
            <Card key={customer.id} className="flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 leading-tight">{customer.name}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${customer.type === 'นิติบุคคล' ? 'bg-sky-100 text-sky-800' : 'bg-lime-100 text-lime-800'}`}>
                                {customer.type}
                            </span>
                        </div>
                        <div className="relative">
                            <Button
                                data-customer-id={customer.id}
                                onClick={(e) => handleDropdownToggle(e, customer.id)}
                                variant="icon"
                                className="-mr-2 -mt-1"
                                title="ตัวเลือก"
                            >
                                <span className="sr-only">Open options</span>
                                <ManageIcon className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-center">
                            <UserIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
                            <span>{customer.contactPerson}</span>
                        </div>
                        <div className="flex items-center">
                            <EnvelopeIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
                            <a href={`mailto:${customer.email}`} className="hover:text-primary truncate">{customer.email}</a>
                        </div>
                        <div className="flex items-center">
                            <PhoneIcon className="h-4 w-4 mr-2.5 text-slate-400 flex-shrink-0" />
                            <a href={`tel:${customer.phone}`} className="hover:text-primary">{customer.phone}</a>
                        </div>
                    </div>
                </div>
                {customer.contractUntil && (
                    <div className="mt-4 pt-4 border-t border-slate-200 text-xs">
                        <p className="text-slate-500">
                            <span className="font-semibold">สัญญาถึง:</span> {formatThaiDate(customer.contractUntil)}
                        </p>
                    </div>
                )}
            </Card>
        ))}
    </div>
);

interface CustomersProps {
    customers: Customer[];
    onCreateCustomer: (customerData: Omit<Customer, 'id'>) => void;
    onUpdateCustomer: (updatedCustomer: Customer) => void;
    onDeleteCustomer: (customerId: string) => void;
    contracts: Contract[];
    quotations: Quotation[];
    onCreateContract: (contractData: Omit<Contract, 'id'>) => void;
    onCreateJob?: (jobData: any) => void; // Added
}

const Customers: React.FC<CustomersProps> = ({ customers, onCreateCustomer, onUpdateCustomer, onDeleteCustomer, contracts, quotations, onCreateContract, onCreateJob }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isContractsModalOpen, setIsContractsModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'list' | 'card'>('list');
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

    const reversedCustomers = useMemo(() => [...customers].reverse(), [customers]);

    const filteredCustomers = useMemo(() => {
        if (!searchQuery) {
            return reversedCustomers;
        }
        const lowercasedQuery = searchQuery.toLowerCase();

        // Find customer IDs from contracts that match the search query
        const customerIdsFromContracts = contracts
            .filter(contract => contract.id.toLowerCase().includes(lowercasedQuery))
            .map(contract => contract.customerId);

        const customerIdSet = new Set(customerIdsFromContracts);

        return reversedCustomers.filter(customer =>
            // Match from contract ID
            customerIdSet.has(customer.id) ||
            // Match from customer fields
            customer.id.toLowerCase().includes(lowercasedQuery) ||
            customer.name.toLowerCase().includes(lowercasedQuery) ||
            (customer.nickname && customer.nickname.toLowerCase().includes(lowercasedQuery)) ||
            customer.phone.replace(/[^0-9]/g, '').includes(lowercasedQuery.replace(/[^0-9]/g, ''))
        );
    }, [reversedCustomers, searchQuery, contracts]);

    const totalItems = filteredCustomers.length;
    const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleItemsPerPageChange = (size: number) => {
        setItemsPerPage(size);
        setCurrentPage(1);
    };


    const handleViewDetails = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsDetailsModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleEdit = (customer: Customer) => {
        setCustomerToEdit(customer);
        setIsEditModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleDelete = (customer: Customer) => {
        setCustomerToDelete(customer);
        setIsDeleteModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleConfirmDelete = () => {
        if (customerToDelete) {
            onDeleteCustomer(customerToDelete.id);
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

    const handleDropdownToggle = (event: React.MouseEvent<HTMLButtonElement>, customerId: string) => {
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
            if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
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
                            <Button onClick={() => setView('list')} variant="ghost" className={`px-3 py-1 text-sm font-medium rounded-md h-auto ${view === 'list' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`} title="มุมมองรายการ">
                                <ListBulletIcon className="h-5 w-5" />
                            </Button>
                            <Button onClick={() => setView('card')} variant="ghost" className={`px-3 py-1 text-sm font-medium rounded-md h-auto ${view === 'card' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`} title="มุมมองการ์ด">
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
                        <CustomerListView customers={paginatedCustomers} handleDropdownToggle={handleDropdownToggle} currentPage={currentPage} itemsPerPage={itemsPerPage} />
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
                        <CustomerCardView customers={paginatedCustomers} handleDropdownToggle={handleDropdownToggle} />
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
                        {actions.map(action => (
                            <a
                                key={action.label}
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const customer = customers.find(c => c.id === openDropdownId);
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

            <AddCustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreateCustomer={onCreateCustomer} />
            <CustomerDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                customer={selectedCustomer}
            />
            <EditCustomerModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                customer={customerToEdit}
                onUpdateCustomer={onUpdateCustomer}
            />
            <CustomerContractsListModal
                isOpen={isContractsModalOpen}
                onClose={() => setIsContractsModalOpen(false)}
                customer={selectedCustomer}
                contracts={contracts}
                quotations={quotations}
                onCreateContract={onCreateContract}
                onCreateJob={onCreateJob}
            />
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="ยืนยันการลบ"
                message={<p>คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้า <strong>{customerToDelete?.name}</strong>? การกระทำนี้ไม่สามารถย้อนกลับได้</p>}
                confirmButtonText="ยืนยันการลบ"
                confirmButtonClass="bg-danger hover:bg-danger/90"
            />
        </>
    );
};

export default Customers;

