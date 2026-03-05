import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatThaiDate } from '../../utils/date';
import { formatPhoneNumber } from '../../utils/format';
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
import { Quotation } from '../../types';

// Quotation Status from API
enum QuotationStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PENDING = 'PENDING',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONVERTED = 'CONVERTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

const statusLabels: Record<QuotationStatus, string> = {
  [QuotationStatus.DRAFT]: 'จัดทำ',
  [QuotationStatus.SENT]: 'ส่งแล้ว',
  [QuotationStatus.PENDING]: 'รอดำเนินการ',
  [QuotationStatus.PENDING_APPROVAL]: 'รออนุมัติ',
  [QuotationStatus.APPROVED]: 'อนุมัติ',
  [QuotationStatus.REJECTED]: 'ปฏิเสธ',
  [QuotationStatus.CONVERTED]: 'แปลงแล้ว',
  [QuotationStatus.CANCELLED]: 'ยกเลิก',
  [QuotationStatus.EXPIRED]: 'หมดอายุ',
};
import { QuotationModal } from '../../components/features/quotations/QuotationModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Input, Select, Button } from '../../components/common/FormControls';
import { useData } from '../../contexts/DataContext';
import { QuotationApi } from '../../api/quotation';

interface QuotationsPageProps {
  onCreateQuotation?: (
    data: Omit<Quotation, 'id'>,
    assessmentId?: string
  ) => void;
  onUpdateQuotation?: (updated: Quotation) => void;
  onDeleteQuotation?: (id: string) => void;
  onReviseQuotation?: (id: string) => void;
}

const QuotationsPage: React.FC<QuotationsPageProps> = ({
  onCreateQuotation,
  onUpdateQuotation,
  onDeleteQuotation,
  onReviseQuotation,
}) => {
  const { customers } = useData();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const res = await QuotationApi.getAll({ limit: 10 });
      setQuotations(res.data || []);
    } catch (error) {
      console.error('Failed to fetch quotations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  // const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<QuotationStatus>(
    QuotationStatus.DRAFT
  );
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<
    'create' | 'edit' | 'revise' | 'detail'
  >('create');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<
    string | null
  >(null);
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
  const [statusFilter, setStatusFilter] = useState<'ทั้งหมด' | QuotationStatus>(
    'ทั้งหมด'
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Stats calculations
  const stats = useMemo(() => {
    const total = quotations.length;
    const draft = quotations.filter(
      (q) => q.status === QuotationStatus.DRAFT
    ).length;
    const pending = quotations.filter(
      (q) =>
        q.status === QuotationStatus.PENDING ||
        q.status === QuotationStatus.PENDING_APPROVAL ||
        q.status === QuotationStatus.SENT
    ).length;
    const approved = quotations.filter(
      (q) =>
        q.status === QuotationStatus.APPROVED ||
        q.status === QuotationStatus.CONVERTED
    ).length;
    const totalValue = quotations.reduce(
      (sum, q) => sum + (Number(q.total) || 0),
      0
    );

    return { total, draft, pending, approved, totalValue };
  }, [quotations]);

  // Customer phone map
  const custPhoneMap = useMemo(
    () => new Map((customers || []).map((c) => [c.id, c.phone || ''])),
    [customers]
  );

  // Filtered quotations
  const filteredQuotations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    let result = quotations;

    // Search filter
    if (q) {
      result = result.filter((item) => {
        const phone =
          item.contact_phone ||
          item.customer?.phone ||
          custPhoneMap.get(item.customer_id) ||
          '';
        return (
          item.id.toLowerCase().includes(q) ||
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
        const d = new Date(item.created_at);
        return (!start || d >= start) && (!end || d <= end);
      });
    }

    // Get latest revision only
    const latestMap = new Map<string, Quotation>();
    for (const item of result) {
      const baseId = item.id.split('-')[0];
      const existing = latestMap.get(baseId);
      if (!existing || item.revision > existing.revision) {
        latestMap.set(baseId, item);
      }
    }

    return Array.from(latestMap.values()).reverse();
  }, [quotations, searchQuery, statusFilter, startDate, endDate, custPhoneMap]);

  const totalItems = filteredQuotations.length;
  const paginatedQuotations = useMemo(
    () =>
      filteredQuotations.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [filteredQuotations, currentPage, itemsPerPage]
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    quotationId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === quotationId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setSelectedQuotation(
        quotations?.find((q) => q.id === quotationId) || null
      );
      setOpenDropdownId(quotationId);
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
      if ((event.target as HTMLElement).closest('button[data-quotation-id]'))
        return;
      setOpenDropdownId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const handleCreate = () => {
    setModalMode('create');
    setSelectedQuotation(null);
    setSelectedAssessmentId(null);
    setIsModalOpen(true);
  };

  const handleViewDetails = () => {
    if (selectedQuotation) {
      setModalMode('detail');
      setIsModalOpen(true);
    }
    setOpenDropdownId(null);
  };

  const handleEdit = () => {
    if (selectedQuotation) {
      setModalMode('edit');
      setIsModalOpen(true);
    }
    setOpenDropdownId(null);
  };

  const handleRevise = () => {
    if (selectedQuotation) {
      setModalMode('revise');
      setIsModalOpen(true);
    }
    setOpenDropdownId(null);
  };

  const handleModalSubmit = async (data: any) => {
    try {
      if (modalMode === 'create') {
        if (onCreateQuotation)
          await onCreateQuotation(data, selectedAssessmentId || undefined);
        else await QuotationApi.create(data);
      } else if (modalMode === 'edit' && selectedQuotation) {
        if (onUpdateQuotation)
          await onUpdateQuotation({ ...selectedQuotation, ...data });
        else await QuotationApi.update(selectedQuotation.id, data);
      } else if (modalMode === 'revise') {
        if (onCreateQuotation) await onCreateQuotation(data);
        else await QuotationApi.create(data); // Revise is technically creating a new one
      }
      setIsModalOpen(false);
      fetchQuotations(); // Refresh data after mutation
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleStatusClick = () => {
    if (selectedQuotation) {
      setTargetStatus(selectedQuotation.status as QuotationStatus);
      setIsStatusModalOpen(true);
    }
    setOpenDropdownId(null);
  };

  const handleStatusConfirm = async () => {
    if (selectedQuotation) {
      try {
        if (onUpdateQuotation) {
          await onUpdateQuotation({
            ...selectedQuotation,
            status: targetStatus,
          });
        } else {
          await QuotationApi.update(selectedQuotation.id, {
            status: targetStatus,
          });
        }
        fetchQuotations();
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    }
    setIsStatusModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (selectedQuotation) {
      if (onDeleteQuotation) await onDeleteQuotation(selectedQuotation.id);
      else await QuotationApi.delete(selectedQuotation.id);
      fetchQuotations(); // Refresh data after delete
    }
    setIsDeleteModalOpen(false);
    setSelectedQuotation(null);
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ใบเสนอราคา</h1>
            <p className="mt-1 text-slate-600">
              จัดการและติดตามใบเสนอราคาทั้งหมด
            </p>
          </div>
          {onCreateQuotation && (
            <Button onClick={handleCreate}>
              <PlusIcon className="h-5 w-5" />
              สร้างใบเสนอราคา
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <DocumentTextIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">ทั้งหมด</p>
                <p className="text-2xl font-bold text-blue-800">
                  {stats.total}
                </p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-amber-600 font-medium">
                  รอดำเนินการ
                </p>
                <p className="text-2xl font-bold text-amber-800">
                  {stats.pending}
                </p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">
                  อนุมัติแล้ว
                </p>
                <p className="text-2xl font-bold text-green-800">
                  {stats.approved}
                </p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">มูลค่ารวม</p>
                <p className="text-xl font-bold text-purple-800">
                  ฿
                  {stats.totalValue.toLocaleString('th-TH', {
                    minimumFractionDigits: 0,
                  })}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters & Table */}
        <Card
          className="!p-0"
          actions={
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <div className="w-full sm:w-64">
                <Input
                  type="search"
                  placeholder="ค้นหา (เลขที่, ชื่อลูกค้า, เบอร์โทร)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
                <span className="text-slate-400">-</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(
                      e.target.value as 'ทั้งหมด' | QuotationStatus
                    );
                    setCurrentPage(1);
                  }}
                >
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  {Object.values(QuotationStatus).map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    ลำดับ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    เลขที่ใบเสนอราคา
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    ลูกค้า
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    เบอร์โทร
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    อ้างอิงใบประเมิน
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    วันที่สร้าง
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    หมดอายุ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    ยอดรวม
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-base font-medium">กำลังโหลดข้อมูลใบเสนอราคา...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedQuotations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      <DocumentTextIcon className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                      <p className="text-lg font-medium">
                        ไม่พบข้อมูลใบเสนอราคา
                      </p>
                      <p className="text-sm">
                        ลองปรับตัวกรองหรือสร้างใบเสนอราคาใหม่
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedQuotations.map((q, index) => {
                    const customer = customers?.find(
                      (c) => c.id === q.customer_id
                    );
                    const phoneNumber =
                      q.contact_phone || q.customer?.phone || customer?.phone;
                    return (
                      <tr
                        key={q.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td
                          className="px-6 py-4 text-sm font-medium text-primary hover:underline cursor-pointer"
                          onClick={() => {
                            setSelectedQuotation(q);
                            setModalMode('detail');
                            setIsModalOpen(true);
                          }}
                          title={q.id}
                        >
                          {q.code}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                          {q.customer_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatPhoneNumber(phoneNumber)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {q['assessment']?.code || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatThaiDate(q.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatThaiDate(q.expires_at)}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge
                            status={
                              statusLabels[q.status as QuotationStatus] ||
                              q.status
                            }
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 text-right font-semibold">
                          ฿
                          {(Number(q.total) || 0).toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                loadingPdfId === q.id
                                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                              disabled={loadingPdfId === q.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (loadingPdfId === q.id) return;

                                setSelectedQuotation(q);
                                setLoadingPdfId(q.id);
                                (async () => {
                                  try {
                                    const blob = await QuotationApi.getPDF(
                                      q.id
                                    );
                                    const url =
                                      window.URL.createObjectURL(blob);
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
                              {loadingPdfId === q.id ? (
                                <LoadingIcon className="w-4 h-4 animate-spin" />
                              ) : (
                                <EyeIcon className="w-4 h-4" />
                              )}
                              {loadingPdfId === q.id
                                ? 'กำลังโหลด...'
                                : 'ดู PDF'}
                            </Button>
                            <Button
                              data-quotation-id={q.id}
                              onClick={(e) => handleDropdownToggle(e, q.id)}
                              variant="icon"
                              title="ตัวเลือก"
                            >
                              <ManageIcon className="h-5 w-5" />
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
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </Card>
      </div>

      {/* Dropdown Menu */}
      {openDropdownId && dropdownPosition && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-52 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 overflow-hidden"
        >
          <div className="py-1">
            <button
              onClick={handleViewDetails}
              className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <EyeIcon className="mr-3 h-5 w-5 text-slate-400" />
              ดูรายละเอียด
            </button>
            <button
              onClick={handleEdit}
              className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <PencilIcon className="mr-3 h-5 w-5 text-slate-400" />
              แก้ไข
            </button>
            <button
              onClick={handleRevise}
              className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <DocumentTextIcon className="mr-3 h-5 w-5 text-slate-400" />
              Revise (สร้างฉบับใหม่)
            </button>
            <button
              onClick={handleStatusClick}
              className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <CheckCircleIcon className="mr-3 h-5 w-5 text-slate-400" />
              เปลี่ยนสถานะ
            </button>
            <div className="border-t border-slate-100 my-1"></div>
            <button
              onClick={handleDelete}
              className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <TrashIcon className="mr-3 h-5 w-5" />
              ลบ
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <QuotationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        initialValues={selectedQuotation}
        assessmentId={selectedAssessmentId}
        onSubmit={handleModalSubmit}
      />
 
      <ConfirmationModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleStatusConfirm}
        title="อัปเดตสถานะ"
        message={
          <div className="space-y-4 text-left">
            <p>
              กรุณาเลือกสถานะใหม่สำหรับใบเสนอราคา{' '}
              <strong>{selectedQuotation?.code}</strong>
            </p>
            <div className="mt-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                สถานะ
              </label>
              <Select
                value={targetStatus}
                onChange={(e) =>
                  setTargetStatus(e.target.value as QuotationStatus)
                }
                className="w-full"
              >
                {Object.values(QuotationStatus).map((status) => (
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

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบใบเสนอราคา{' '}
            <strong>{selectedQuotation?.id}</strong>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-danger hover:bg-danger/90"
      />
    </>
  );
};

export default QuotationsPage;
