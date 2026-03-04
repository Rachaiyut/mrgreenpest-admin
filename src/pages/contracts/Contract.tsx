import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatThaiDate } from '../../utils/date';
import {
  PlusIcon,
  ManageIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  LoadingIcon,
} from '../../assets/icons/Icons';
import { Pagination } from '../../components/common/Pagination';
import { Contract, ContractStatus } from '../../types';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Input, Select, Button } from '../../components/common/FormControls';
import { useData } from '../../contexts/DataContext';
import { ContractApi } from '../../api';
import { ContractDetailsModal } from '../../components/features/contracts/ContractDetailsModal';
import { CreateContractModal } from '../../components/features/contracts/CreateContractModal';
import { EditContractModal } from '../../components/features/contracts/EditContractModal';

const statusLabels: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'ร่าง',
  [ContractStatus.PENDING]: 'รอดำเนินการ',
  [ContractStatus.ACTIVE]: 'ดำเนินการ',
  [ContractStatus.COMPLETED]: 'เสร็จสิ้น',
  [ContractStatus.CANCELLED]: 'ยกเลิก',
  [ContractStatus.EXPIRED]: 'หมดอายุ',
};

interface ContractsPageProps {
  onUpdateContract?: (updated: Contract) => void;
  onDeleteContract?: (id: string) => void;
}

const ContractsPage: React.FC<ContractsPageProps> = ({
  onUpdateContract,
  onDeleteContract,
}) => {
  const { customers, quotations } = useData();
  const navigate = useNavigate();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<ContractStatus>(ContractStatus.DRAFT);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ทั้งหมด' | ContractStatus>(
    'ทั้งหมด'
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchContractsData = async () => {
    setIsLoading(true); // เริ่มหมุน
    try {
      const response = await ContractApi.getAll();
      if (response && response.data) {
        setContracts(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    } finally {
      setIsLoading(false); // หยุดหมุน
    }
  };

  useEffect(() => {
    fetchContractsData();
  }, []);

  // Stats calculations
  const stats = useMemo(() => {
    const total = contracts.length;
    const draft = contracts.filter(
      (c) => c.status === ContractStatus.DRAFT
    ).length;
    const active = contracts.filter(
      (c) => c.status === ContractStatus.ACTIVE
    ).length;
    const completed = contracts.filter(
      (c) => c.status === ContractStatus.COMPLETED
    ).length;
    const totalValue = contracts.reduce(
      (sum, c) => sum + (Number(c.total_amount) || 0),
      0
    );

    return { total, draft, active, completed, totalValue };
  }, [contracts]);

  // Customer phone map
  const custPhoneMap = useMemo(
    () => new Map((customers || []).map((c) => [c.id, c.phone || ''])),
    [customers]
  );

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    let result = contracts;

    // Search filter
    if (q) {
      result = result.filter((item) => {
        const phone = custPhoneMap.get(item.customer_id) || '';
        return (
          item.id.toLowerCase().includes(q) ||
          (item.code || '').toLowerCase().includes(q) ||
          item.customer_name.toLowerCase().includes(q) ||
          phone.includes(q)
        );
      });
    }

    // Status filter
    if (statusFilter !== 'ทั้งหมด') {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Date filter
    if (start || end) {
      result = result.filter((item) => {
        const d = new Date(item.created_at || item.start_date);
        return (!start || d >= start) && (!end || d <= end);
      });
    }

    return result.slice().reverse();
  }, [contracts, searchQuery, statusFilter, startDate, endDate, custPhoneMap]);

  const totalItems = filteredContracts.length;
  const paginatedContracts = useMemo(
    () =>
      filteredContracts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [filteredContracts, currentPage, itemsPerPage]
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    contractId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === contractId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setSelectedContract(contracts?.find((c) => c.id === contractId) || null);
      setOpenDropdownId(contractId);
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
      if ((event.target as HTMLElement).closest('button[data-contract-id]'))
        return;
      setOpenDropdownId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const handleViewDetails = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleEdit = (contract: Contract) => {
    setSelectedContract(contract);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDeleteClick = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (selectedContract) {
      try {
        if (onDeleteContract) {
          await onDeleteContract(selectedContract.id);
        } else {
          // ถ้าไม่มี Props ส่งมา ให้เรียก API ลบโดยตรง
          await ContractApi.delete(selectedContract.id); // *ตรวจสอบให้แน่ใจว่าใน API คุณชื่อฟังก์ชัน delete() หรือ remove()*
        }
        // ลบสำเร็จ ให้ดึงข้อมูลมาแสดงใหม่
        fetchContractsData();
      } catch (error) {
        console.error('Failed to delete contract:', error);
      }
    }
    setIsDeleteModalOpen(false);
    setSelectedContract(null);
  };

  const handleCreateInvoice = (contract: Contract) => {
    navigate(`/billing/new?contractId=${contract.id}`);
    setOpenDropdownId(null);
  };

  const handleStatusClick = (contract: Contract) => {
    setSelectedContract(contract);
    setTargetStatus(
      (contract.status as ContractStatus) || ContractStatus.DRAFT
    );
    setIsStatusModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleStatusConfirm = async () => {
    if (selectedContract) {
      try {
        if (onUpdateContract) {
          await onUpdateContract({ ...selectedContract, status: targetStatus });
        } else {
          // ถ้าไม่มี Props ส่งมา ให้เรียก API อัปเดตโดยตรง
          await ContractApi.update(selectedContract.id, { ...selectedContract, status: targetStatus });
        }
        // อัปเดตสำเร็จ ให้ดึงข้อมูลมาแสดงใหม่
        fetchContractsData();
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    }
    setIsStatusModalOpen(false);
    setSelectedContract(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">ใบสัญญา</h1>
          <p className="mt-1 text-slate-600">
            จัดการและติดตามใบสัญญาทั้งหมด พร้อมระบบแบ่งงวดชำระ
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="shadow-md shadow-primary/20"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          สร้างใบสัญญา
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <DocumentTextIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">สัญญาทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-500 rounded-lg">
              <ClockIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">ร่าง</p>
              <p className="text-2xl font-bold text-slate-800">{stats.draft}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <ClockIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-amber-600 font-medium">
                กำลังดำเนินการ
              </p>
              <p className="text-2xl font-bold text-amber-800">
                {stats.active}
              </p>
            </div>
          </div>
        </Card>
        <Card className="!p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">เสร็จสิ้น</p>
              <p className="text-2xl font-bold text-green-800">
                {stats.completed}
              </p>
            </div>
          </div>
        </Card>
        <Card className="!p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 col-span-2 md:col-span-4 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <CurrencyDollarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">มูลค่ารวม</p>
              <p
                className="text-xl font-bold text-purple-800 truncate"
                title={`฿${stats.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
              >
                ฿
                {stats.totalValue.toLocaleString('th-TH', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card
        className="!p-0"
        actions={
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-1">
            <div className="w-full sm:w-64">
              <Input
                type="search"
                placeholder="ค้นหา (เลขที่, ชื่อลูกค้า, เบอร์โทร)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-40"
              />
              <span className="text-slate-400">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>

            <div className="w-full lg:w-48">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'ทั้งหมด' | ContractStatus);
                  setCurrentPage(1);
                }}
                className="w-full"
              >
                <option value="ทั้งหมด">สถานะทั้งหมด</option>
                {Object.values(ContractStatus).map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
      >
        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    ลำดับ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    เลขที่สัญญา
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    ลูกค้า
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    ประเภทบริการ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    ระยะเวลา
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    วันเริ่มต้น
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    วันสิ้นสุด
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                    มูลค่า
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-base font-medium">กำลังโหลดข้อมูลสัญญา...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedContracts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center text-slate-400">
                        <DocumentTextIcon className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-lg font-medium">ไม่พบข้อมูลใบสัญญา</p>
                        <p className="text-sm mt-1">
                          ลองปรับตัวกรองหรือสร้างใบสัญญาใหม่
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedContracts.map((c, index) => {
                    const customerName = c.customer
                      ? `${c.customer.first_name} ${c.customer.last_name || ''}`.trim()
                      : c.customer_name;

                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-slate-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                      >
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="text-sm font-semibold text-primary hover:text-primary-dark cursor-pointer transition-colors"
                            onClick={() => handleViewDetails(c)}
                            title={c.id}
                          >
                            {c.code || `CT-${c.id.slice(0, 8).toUpperCase()}`}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-primary font-bold text-xs">
                                {(customerName || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {customerName || '-'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {c.service_type || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {c.contract_duration || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatThaiDate(c.start_date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatThaiDate(c.end_date)}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge
                            status={
                              statusLabels[c.status as ContractStatus] || c.status
                            }
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-800 text-right font-semibold">
                          ฿
                          {(Number(c.total_amount) || 0).toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              className="px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm border-none flex items-center gap-2 hover:shadow-md transition-shadow bg-emerald-500 text-white hover:bg-emerald-600"
                              disabled={loadingPdfId === c.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (loadingPdfId === c.id) return;

                                setLoadingPdfId(c.id);
                                (async () => {
                                  try {
                                    const blob = await ContractApi.getPdf(c.id);
                                    const url = window.URL.createObjectURL(blob);
                                    window.open(url, '_blank');
                                  } catch (error) {
                                    console.error('Error viewing PDF:', error);
                                    alert('ไม่สามารถเปิด PDF ได้');
                                  } finally {
                                    setLoadingPdfId(null);
                                  }
                                })();
                              }}
                            >
                              {loadingPdfId === c.id ? (
                                <LoadingIcon className="w-3 h-3 animate-spin" />
                              ) : (
                                <EyeIcon className="w-3 h-3" />
                              )}
                              {loadingPdfId === c.id ? 'กำลังโหลด...' : 'ดู PDF'}
                            </Button>
                            <Button
                              data-contract-id={c.id}
                              onClick={(e) => handleDropdownToggle(e, c.id)}
                              variant="ghost"
                              className="p-2 h-auto rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            >
                              <ManageIcon className="w-5 h-5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="border-t border-slate-100">
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Dropdown Menu (Portal) */}
      {openDropdownId && dropdownPosition && selectedContract && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-48 rounded-xl shadow-xl bg-white ring-1 ring-black/5 focus:outline-none z-50 border border-slate-100 overflow-hidden"
        >
          <div className="py-1">
            <button
              onClick={() => handleViewDetails(selectedContract)}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <EyeIcon className="w-4 h-4 text-slate-400" />
              ดูรายละเอียด
            </button>
            <button
              onClick={() => handleEdit(selectedContract)}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <PencilIcon className="w-4 h-4 text-slate-400" />
              แก้ไข
            </button>
            <button
              onClick={() => handleCreateInvoice(selectedContract)}
              className="w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <CurrencyDollarIcon className="w-4 h-4" />
              สร้างใบแจ้งหนี้
            </button>
            <button
              onClick={() => handleStatusClick(selectedContract)}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <CheckCircleIcon className="w-4 h-4 text-slate-400" />
              เปลี่ยนสถานะ
            </button>
            <hr className="my-1 border-slate-100" />
            <button
              onClick={() => handleDeleteClick(selectedContract)}
              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
            >
              <TrashIcon className="w-4 h-4 text-red-500" />
              ลบ
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {isDetailsModalOpen && selectedContract && (
        <ContractDetailsModal
          contract={selectedContract}
          customers={customers}
          quotations={quotations}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedContract(null);
          }}
        />
      )}

      <CreateContractModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchContractsData}
      />

      <EditContractModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
        onSuccess={fetchContractsData}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ลบใบสัญญา"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบใบสัญญา ${selectedContract?.code || selectedContract?.id}?`}
        confirmButtonText="ลบ"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      {/* Status Update Modal */}
      <ConfirmationModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleStatusConfirm}
        title="อัปเดตสถานะ"
        message={
          <div className="space-y-4 text-left">
            <p>
              กรุณาเลือกสถานะใหม่สำหรับใบสัญญา{' '}
              <strong>{selectedContract?.code || selectedContract?.id}</strong>
            </p>
            <div className="mt-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                สถานะ
              </label>
              <Select
                value={targetStatus}
                onChange={(e) =>
                  setTargetStatus(e.target.value as ContractStatus)
                }
                className="w-full"
              >
                {Object.values(ContractStatus).map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
        confirmButtonText="บันทึก"
        confirmButtonClass="bg-primary hover:bg-primary/90"
      />
    </div>
  );
};

export default ContractsPage;
