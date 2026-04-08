import { isFieldRole } from '@/src/utils/role';
// ===== React / External =====
import Swal from 'sweetalert2';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ===== Types =====
import {
  StockIssueSummary as StockIssueSummaryType,
  Warehouse as WarehouseEntity,
} from '@/src/types/entity/inventory.interface';
import { UserExpense } from '@/src/types/entity/user-expense.interface';
import { WarehouseType } from '@/src/types/enums/inventory';

// ===== Context =====
import { useData } from '../../../contexts/DataContext';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

// ===== Components =====
import { IssueSummaryModal } from '../../../components/features/inventory/issue-summary/IssueSummaryModal';
import { StockIssueSummaryDetailsModal } from '../../../components/features/inventory/issue-summary/StockIssueSummaryDetailsModal';
import { Card } from '../../../components/common/Card';
import { Input, Select, Button } from '../../../components/common/FormControls';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { Pagination } from '../../../components/common/Pagination';

// ===== Utils =====
import { formatThaiDate } from '../../../utils/date';
import { StockIssueSummaryApi } from '../../../api/stock-issue-summary';

// ===== Assets =====
import {
  CalendarDaysIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ManageIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  TruckIcon,
  UserIcon,
  DocumentCheckIcon,
  LoadingIcon,
  CheckCircleIcon,
} from '../../../assets/icons/Icons';

// Helper function สำหรับแสดงสถานะเป็นภาษาไทยและสี
const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'DRAFT':
      return { text: 'ฉบับร่าง', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'PENDING':
      return { text: 'รออนุมัติ', className: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'CANCELLED':
      return { text: 'ยกเลิก', className: 'bg-red-100 text-red-700 border-red-200' };
    case 'APPROVED':
      return { text: 'อนุมัติแล้ว', className: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'COMPLETED':
      return { text: 'เสร็จสิ้น', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    default:
      return { text: status || '-', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

const IssueSummaryPage: React.FC = () => {
  const currentUser = useCurrentUser();
  const isTechRole = isFieldRole(currentUser?.roleType);

  const {
    stockIssueSummaries,
    users,
    warehouses,
    products,
    jobs,
    handlers,
    fetchData,
  } = useData();

  // --- State สำหรับ Loading ---
  const [isLoading, setIsLoading] = useState(true);

  // Fetch stock issue summaries on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchData(['stockIssueSummaries', 'warehouses', 'users']);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const onCreateStockIssueSummary = async (data: Omit<StockIssueSummaryType, 'id'>) => {
    try {
      await handlers.stockIssueSummaries.create(data);
    } catch (error: any) {
      console.error('Failed to create stock issue summary', error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.response.data.message });
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถสร้างใบเบิกได้' });
      }
    }
  };

  const onUpdateStockIssueSummary = async (updatedItem: StockIssueSummaryType) => {
    try {
      await handlers.stockIssueSummaries.update(updatedItem);
    } catch (error) {
      console.error('Failed to update stock issue summary', error);
    }
  };

  const onUpdateStatus = async (summaryId: string, newStatus: string) => {
    try {
      const summary = stockIssueSummaries.find((s) => s.id === summaryId);
      if (!summary) return;
      await handlers.stockIssueSummaries.update({ ...summary, status: newStatus } as StockIssueSummaryType);
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const handleStatusClick = (summary: StockIssueSummaryType) => {
    setSelectedSummary(summary);
    setTargetStatus(summary.status || 'DRAFT');
    setIsStatusModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleStatusConfirm = async () => {
    if (!selectedSummary) return;
    try {
      await StockIssueSummaryApi.updateStatus(selectedSummary.id, targetStatus);
      // Refresh list
      fetchData(['stockIssueSummaries']);
    } catch (error) {
      console.error('Failed to update status', error);
    }
    setIsStatusModalOpen(false);
  };

  const onDeleteStockIssueSummary = async (id: string) => {
    try {
      await handlers.stockIssueSummaries.delete(id);
    } catch (error) {
      console.error('Failed to delete stock issue summary', error);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedSummary, setSelectedSummary] =
    useState<StockIssueSummaryType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'stock' | 'expense'>('all');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');

  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w])),
    [warehouses]
  );

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const userMap = useMemo(
    () =>
      new Map(
        users.map((u) => {
          let name = u.name;
          if (typeof name !== 'string' || name === '[object Object]') {
            name =
              `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
              u.nick_name ||
              'Unknown';
          }
          return [u.id, name];
        })
      ),
    [users]
  );

  const uniqueCreators = useMemo(
    () => [...new Set(stockIssueSummaries.map((s) => s.created_by).filter(Boolean))],
    [stockIssueSummaries]
  );

  const filteredSummaries = useMemo(() => {
    let filtered = [...stockIssueSummaries].sort((a, b) => {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    // LEAD_TECH / TECH เห็นเฉพาะที่ตัวเองสร้าง
    if (isTechRole && currentUser?.id) {
      filtered = filtered.filter((s) =>
        s.requester_id === currentUser.id || s.created_by === currentUser.id
      );
    }

    // Filter by tab
    if (activeTab === 'stock') {
      filtered = filtered.filter((s) => s.items && s.items.length > 0);
    } else if (activeTab === 'expense') {
      filtered = filtered.filter((s) => s.expense_items && s.expense_items.length > 0);
    }

    // Filter by creator
    if (creatorFilter !== 'all') {
      filtered = filtered.filter((s) => s.created_by === creatorFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    // Filter by search query
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (lowercasedQuery) {
      filtered = filtered.filter((summary) => {
        const totalGoodsAmount =
          summary.items?.reduce((sum, item) => {
            const product = productMap.get(item.product_id);
            return sum + (product ? product.price * item.quantity : 0);
          }, 0) || 0;
        
        const totalExpenseAmount = 
          summary.expense_items?.reduce((sum: number, exp: UserExpense) => sum + Number(exp.amount || 0), 0) || 0;
        
        const totalAmount = totalGoodsAmount + totalExpenseAmount;

        const productNames = (summary.items || [])
          .map((item) => item.product_name || productMap.get(item.product_id)?.name || '')
          .join(' ')
          .toLowerCase();

        return (
          (summary.id || '').toLowerCase().includes(lowercasedQuery) ||
          productNames.includes(lowercasedQuery) ||
          totalAmount.toString().includes(lowercasedQuery) ||
          (summary.created_at &&
            formatThaiDate(summary.created_at).includes(lowercasedQuery)) ||
          (summary.notes || '').toLowerCase().includes(lowercasedQuery)
        );
      });
    }

    return filtered;
  }, [stockIssueSummaries, searchQuery, creatorFilter, statusFilter, activeTab, productMap, isTechRole, currentUser?.id]);

  const totalItems = filteredSummaries.length;
  const paginatedSummaries = filteredSummaries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (summary: StockIssueSummaryType) => {
    setSelectedSummary(summary);
    setIsDetailsModalOpen(true);
  };

  const handleEditSummary = (summary: StockIssueSummaryType) => {
    setSelectedSummary(summary);
    setModalMode('edit'); setIsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    summaryId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === summaryId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setOpenDropdownId(summaryId);
      setDropdownPosition({
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.right + window.scrollX,
      });
    }
  };

  const handleDelete = (summaryId: string) => {
    if (confirm('ยืนยันการลบใบเบิก?')) {
      onDeleteStockIssueSummary(summaryId);
    }
    setOpenDropdownId(null);
  };

  // Effect to close dropdown when modal opens
  useEffect(() => {
    if (isDetailsModalOpen) {
      setOpenDropdownId(null);
    }
  }, [isDetailsModalOpen]);

  // Effect to handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        if (
          !(event.target as HTMLElement).closest('button[data-summary-id]')
        ) {
          setOpenDropdownId(null);
        }
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  const getActionItems = (summary: StockIssueSummaryType) => {
    const actions = [
      {
        label: 'ดูรายละเอียด',
        icon: EyeIcon,
        color: 'text-slate-700',
        hoverBg: 'hover:bg-slate-50',
        onClick: () => handleViewDetails(summary),
      },
      {
        label: 'แก้ไข',
        icon: PencilIcon,
        color: 'text-blue-600',
        hoverBg: 'hover:bg-blue-50',
        onClick: () => handleEditSummary(summary),
      },
      ...(summary.status !== 'COMPLETED' ? [{
        label: 'เปลี่ยนสถานะ',
        icon: CheckCircleIcon,
        color: 'text-slate-700',
        hoverBg: 'hover:bg-slate-50',
        onClick: () => handleStatusClick(summary),
      }] : []),
      {
        label: 'ลบ',
        icon: TrashIcon,
        color: 'text-red-600',
        hoverBg: 'hover:bg-red-50',
        onClick: () => handleDelete(summary.id),
      },
    ];

    return actions;
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col min-h-[calc(100vh-64px)] space-y-4 max-w-full">
        {/* --- Header: Title + Create Button --- */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              สรุปการเบิกสินค้า/อุปกรณ์
            </h1>
            <p className="mt-1 text-slate-600">
              ติดตามและจัดการการเบิกสินค้าและอุปกรณ์
            </p>
          </div>
          <Button onClick={() => { setModalMode('create'); setIsModalOpen(true); }}>
            <PlusIcon className="h-5 w-5" />
            สร้างใบเบิก
          </Button>
        </div>

        {/* --- Filter Bar + Tabs (เหมือนหน้าภาคสนาม) --- */}
        <Card className="!p-4 flex-shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center flex-1 min-w-0">
              <div className="relative w-full sm:w-56">
                <Input
                  type="search"
                  placeholder="ค้นหา (เลขที่, สินค้า, จำนวนเงิน)..."
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <Select
                value={creatorFilter}
                onChange={(e) => {
                  setCreatorFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-fit text-sm !pr-8"
              >
                <option value="all">ผู้เบิกทั้งหมด</option>
                {uniqueCreators.map((creator) => (
                  <option key={creator} value={creator}>
                    {userMap.get(creator) || creator}
                  </option>
                ))}
              </Select>
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-fit text-sm !pr-8"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="DRAFT">ฉบับร่าง</option>
                <option value="PENDING">รออนุมัติ</option>
                <option value="APPROVED">อนุมัติแล้ว</option>
                <option value="COMPLETED">เสร็จสิ้น</option>
                <option value="CANCELLED">ยกเลิก</option>
              </Select>
            </div>

            {/* Tabs (ขวาสุด — pill style เหมือนหน้า Job) */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg flex-shrink-0">
              {([
                { key: 'all', label: 'ทั้งหมด' },
                { key: 'stock', label: 'สินค้า/สารเคมี' },
                { key: 'expense', label: 'ค่าใช้จ่าย' },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* --- Desktop View: Table --- */}
        <Card className="!p-0 w-full flex flex-col overflow-hidden border border-slate-200 flex-1 shadow-sm relative">
          <div className="overflow-auto w-full flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-16">ลำดับ</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">วันที่เบิก</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    {activeTab === 'expense' ? 'รายการค่าใช้จ่าย' : activeTab === 'stock' ? 'รายการสินค้า' : 'จำนวนรายการ'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                    {activeTab === 'expense' ? 'ยอดค่าใช้จ่าย' : activeTab === 'stock' ? 'มูลค่าสินค้า' : 'จำนวนเงินที่เบิก'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">คลัง</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">ผู้เบิก</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">สถานะ</th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-20">จัดการ</th>
                </tr>
              </thead>
              
              {!isLoading && paginatedSummaries.length > 0 && (
                <tbody className="bg-white divide-y divide-slate-200">
                  {paginatedSummaries.map((summary, index) => {
                    const warehouse = warehouseMap.get(summary.warehouse_id);
                    
                    const stockCount = summary.items?.length || 0;
                    const expenseCount = summary.expense_items?.length || 0;

                    // --- คำนวณมูลค่าสินค้ารวม ---
                    const totalGoodsAmount =
                      summary.items?.reduce((sum, item) => {
                        const product = productMap.get(item.product_id);
                        return (
                          sum + (product ? product.price * item.quantity : 0)
                        );
                      }, 0) || 0;

                    // --- คำนวณมูลค่าค่าใช้จ่ายรวม ---
                    const totalExpenseAmount =
                      summary.expense_items?.reduce((sum: number, exp: UserExpense) => sum + Number(exp.amount || 0), 0) || 0;

                    // --- แสดงตาม tab ---
                    const displayCount = activeTab === 'stock' ? stockCount : activeTab === 'expense' ? expenseCount : stockCount + expenseCount;
                    const displayAmount = activeTab === 'stock' ? totalGoodsAmount : activeTab === 'expense' ? totalExpenseAmount : totalGoodsAmount + totalExpenseAmount;

                    const requesterName = summary.requester_id
                      ? userMap.get(summary.requester_id) || '-'
                      : '-';
                    
                    const statusBadge = getStatusBadge(summary.status);

                    return (
                      <tr key={summary.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                          {summary.issue_date
                            ? formatThaiDate(summary.issue_date)
                            : summary.created_at
                              ? formatThaiDate(summary.created_at)
                              : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                          {displayCount}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                          ฿{displayAmount.toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                          {warehouse?.name || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-center">
                          {requesterName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${statusBadge.className}`}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                          <div className="inline-block text-left">
                            <Button
                              variant="icon"
                              data-summary-id={summary.id}
                              onClick={(e) =>
                                handleDropdownToggle(e, summary.id)
                              }
                            >
                              <span className="sr-only">จัดการ</span>
                              <ManageIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>

            {/* --- Loading State ย้ายออกมาเพื่อจัดกึ่งกลาง --- */}
            {isLoading && (
              <div className="flex-grow flex flex-col items-center justify-center text-slate-500 min-h-[40vh]">
                <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                <p className="text-base font-medium">กำลังโหลดข้อมูลสรุปการเบิก...</p>
              </div>
            )}

            {/* --- Empty State ย้ายออกมาเพื่อจัดกึ่งกลาง --- */}
            {!isLoading && paginatedSummaries.length === 0 && (
              <div className="flex-grow flex flex-col items-center justify-center text-slate-400 min-h-[40vh]">
                <DocumentCheckIcon className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-lg font-medium">ไม่พบข้อมูลสรุปการเบิก</p>
                <p className="text-sm mt-1">ลองปรับตัวกรองหรือสร้างใบเบิกใหม่</p>
              </div>
            )}
          </div>

          {!isLoading && totalItems > 0 && (
            <div className="border-t border-slate-200 bg-white mt-auto sticky bottom-0 z-20 w-full">
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          )}
        </Card>
      </div>

      {openDropdownId &&
        dropdownPosition &&
        createPortal(
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
              {(() => {
                const summary = stockIssueSummaries.find(
                  (s) => s.id === openDropdownId
                );
                if (!summary) return null;

                return getActionItems(summary).map((action, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.preventDefault();
                      action.onClick();
                    }}
                    className={`flex items-center w-full text-left px-4 py-2 text-sm transition-colors ${action.color} ${action.hoverBg}`}
                    role="menuitem"
                  >
                    <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                    <span>{action.label}</span>
                  </button>
                ));
              })()}
            </div>
          </div>,
          document.body
        )}

      {/* Create / Edit Modal */}
      <IssueSummaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        onSubmit={modalMode === 'edit' ? onUpdateStockIssueSummary : onCreateStockIssueSummary}
        summary={modalMode === 'edit' ? selectedSummary : null}
        warehouses={warehouses}
        products={products}
        users={users}
      />

      {/* Details Modal */}
      <StockIssueSummaryDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        summary={selectedSummary}
        warehouses={warehouses}
        products={products}
        users={users}
      />

      {/* Status Change Modal */}
      <ConfirmationModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleStatusConfirm}
        title="อัปเดตสถานะ"
        message={
          <div className="space-y-4 text-left">
            <p className="text-sm text-slate-600">
              กรุณาเลือกสถานะใหม่
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">สถานะ</label>
              <Select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
              >
                <option value="DRAFT">ฉบับร่าง</option>
                <option value="PENDING">รออนุมัติ</option>
                <option value="APPROVED">อนุมัติแล้ว</option>
                <option value="COMPLETED">เสร็จสิ้น</option>
                <option value="CANCELLED">ยกเลิก</option>
              </Select>
            </div>
          </div>
        }
      />
    </>
  );
};

export default IssueSummaryPage;