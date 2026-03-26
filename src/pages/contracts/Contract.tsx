import React, { useState, useMemo, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { TruncateText } from '../../components/common/TruncateText';
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
import { CustomerApi } from '../../api/customer';
import { ContractModal } from '@/src/components/features/contracts/ContractModal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const statusLabels: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'ร่าง',
  [ContractStatus.PENDING]: 'รอดำเนินการ',
  [ContractStatus.ACTIVE]: 'ดำเนินการ',
  [ContractStatus.REVISED]: 'ปรับปรุง',
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
  const [totalFromServer, setTotalFromServer] = useState(0);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
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

  const fetchContractsData = async (page = currentPage, limit = itemsPerPage) => {
    setIsLoading(true);
    try {
      const query: any = {
        page,
        limit,
        sort_by: 'created_at',
        sort_order: 'DESC',
      };
      if (searchQuery.trim()) query.search = searchQuery.trim();
      if (statusFilter !== 'ทั้งหมด') query.status = statusFilter;
      if (startDate) query.start_date = startDate;
      if (endDate) query.end_date = endDate;

      const response = await ContractApi.getAll(query);
      if (response && response.data) {
        setContracts(response.data);
        setTotalFromServer(response.meta?.total || response.data.length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContractsData(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, searchQuery, statusFilter, startDate, endDate]);

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
    () => new Map((customers || []).map((c) => [c.id, c.primary_phone || ''])),
    [customers]
  );

  // Filtered contracts
  // Server-side pagination: contracts already filtered/sorted by API
  const totalItems = totalFromServer;
  const paginatedContracts = contracts;

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

  const handleRenewClick = (contract: Contract) => {
    setSelectedContract(contract);
    setIsRenewModalOpen(true);
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

  const handleSubmitContract = async (data: any) => {
    try {
      if (isRenewModalOpen && selectedContract) {
        await ContractApi.renew(selectedContract.id, data);
      } else if (isEditModalOpen && selectedContract) {
        if (onUpdateContract) {
          await onUpdateContract({ ...selectedContract, ...data });
        } else {
          await ContractApi.update(selectedContract.id, data);
        }
      } else {
        // Mode: Create
        await ContractApi.create(data);
      }
      
      // ปิด Modal เคลียร์ข้อมูล และดึงข้อมูลตารางใหม่
      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setIsRenewModalOpen(false);
      setSelectedContract(null);
      fetchContractsData();
    } catch (error) {
      console.error('Failed to save contract:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col h-full min-h-[calc(100vh-64px)]">
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

      {/* Toolbar & Table Area */}
      <Card
        className="!p-0 flex flex-col flex-grow min-h-0"
        actions={
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-1">
            <div className="w-full sm:w-64 relative">
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
              <DatePicker selected={startDate ? new Date(startDate) : null} onChange={(date: Date | null) => setStartDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="เริ่มต้น" isClearable className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-full sm:w-40" />
              <span className="text-slate-400">-</span>
              <DatePicker selected={endDate ? new Date(endDate) : null} onChange={(date: Date | null) => setEndDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="สิ้นสุด" isClearable className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-full sm:w-40" />
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
        <div className="bg-white flex flex-col flex-grow min-h-0 rounded-b-xl overflow-hidden border-t border-slate-100">
          <div className="overflow-x-auto flex flex-col flex-grow relative">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">ลำดับ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">เลขที่สัญญา</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">ลูกค้า</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">ประเภทบริการ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">ระยะเวลา</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">วันเริ่มต้น</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">วันสิ้นสุด</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">สถานะ</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">มูลค่า</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">ผู้สร้าง</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              
              {!isLoading && paginatedContracts.length > 0 && (
                <tbody className="divide-y divide-slate-100">
                  {paginatedContracts.map((c, index) => {
                    const customerName = c.customer
                      ? `${c.customer.first_name} ${c.customer.last_name || ''}`.trim()
                      : c.customer_name;

                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-slate-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                      >
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <span
                            className="text-sm font-semibold text-primary hover:text-primary-dark cursor-pointer transition-colors"
                            onClick={() => handleViewDetails(c)}
                            title={c.id}
                          >
                            {c.code || `CT-${c.id.slice(0, 8).toUpperCase()}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <TruncateText text={customerName || '-'} maxWidth={160} className="font-semibold text-slate-800" />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {'-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {'-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatThaiDate(c.start_date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatThaiDate(c.end_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <StatusBadge
                            status={c.status}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-800 text-right font-semibold">
                          ฿
                          {(Number(c.total_amount) || 0).toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <TruncateText text={(c as any).creator ? `${(c as any).creator.first_name} ${(c as any).creator.last_name || ''}`.trim() : '-'} maxWidth={140} />
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
                                    Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเปิด PDF ได้' });
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
                  })}
                </tbody>
              )}
            </table>

            {/* Loading State Area (Outside the Table) */}
            {isLoading && (
              <div className="flex flex-col flex-grow items-center justify-center text-slate-500 py-16 min-h-[40vh]">
                <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                <p className="text-base font-medium">กำลังโหลดข้อมูลสัญญา...</p>
              </div>
            )}

            {/* Empty State Area (Outside the Table) */}
            {!isLoading && paginatedContracts.length === 0 && (
              <div className="flex flex-col flex-grow items-center justify-center text-slate-400 py-16 min-h-[40vh]">
                <DocumentTextIcon className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-lg font-medium">ไม่พบข้อมูลใบสัญญา</p>
                <p className="text-sm mt-1">ลองปรับตัวกรองหรือสร้างใบสัญญาใหม่</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="border-t border-slate-100 mt-auto bg-white">
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
              onClick={() => handleRenewClick(selectedContract)}
              className="w-full px-4 py-2.5 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-3 transition-colors"
            >
              <ClockIcon className="w-4 h-4 text-amber-500" />
              ต่ออายุสัญญา
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
            <button
              onClick={async () => {
                if (!selectedContract?.customer_id) return;
                try {
                  const response = await CustomerApi.generatePortalToken(selectedContract.customer_id);
                  const portalUrl = `${window.location.origin}/portal?token=${response.data.token}`;
                  await navigator.clipboard.writeText(portalUrl);
                  Swal.fire({ title: 'คัดลอกสำเร็จ!', text: 'คัดลอกลิงก์ Portal สำหรับลูกค้าเรียบร้อยแล้ว', icon: 'success', timer: 2000, timerProgressBar: true, confirmButtonColor: '#3085d6' });
                } catch {
                  Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถสร้างลิงก์ Portal ได้', icon: 'error', confirmButtonColor: '#d33' });
                }
                setOpenDropdownId(null);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-3 transition-colors"
            >
              <DocumentTextIcon className="w-4 h-4 text-green-500" />
              ส่ง Link Portal ลูกค้า
            </button>
            {selectedContract?.status === ContractStatus.PENDING && (
              <button
                onClick={async () => {
                  if (!selectedContract?.customer_id) return;
                  try {
                    const response = await ContractApi.generateSigningLink(selectedContract.customer_id, selectedContract.id);
                    const signingUrl = `${window.location.origin}/portal/sign?token=${response.data.token}`;
                    await navigator.clipboard.writeText(signingUrl);
                    Swal.fire({ title: 'คัดลอกสำเร็จ!', text: 'คัดลอกลิงก์เซ็นสัญญาสำหรับลูกค้าเรียบร้อยแล้ว', icon: 'success', timer: 2000, timerProgressBar: true, confirmButtonColor: '#3085d6' });
                  } catch {
                    Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถสร้างลิงก์เซ็นได้', icon: 'error', confirmButtonColor: '#d33' });
                  }
                  setOpenDropdownId(null);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors"
              >
                <PencilIcon className="w-4 h-4 text-emerald-500" />
                ส่ง Link เซ็นสัญญา
              </button>
            )}
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

      <ContractModal
        isOpen={isCreateModalOpen || isEditModalOpen || isRenewModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setIsRenewModalOpen(false)
          setSelectedContract(null);
        }}
        mode={isRenewModalOpen ? 'renew' : isEditModalOpen ? 'edit' : 'create'}
        initialValues={selectedContract} 
        onSubmit={handleSubmitContract}
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
