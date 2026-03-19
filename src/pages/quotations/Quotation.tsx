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
import { QuotationStatus } from '../../types/enums/quotaton';
import SignatureCanvas from 'react-signature-canvas';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { StorageApi } from '../../api/storage';
import { CustomerApi } from '../../api/customer';

const statusLabels: Record<QuotationStatus, string> = {
  [QuotationStatus.DRAFT]: 'จัดทำ',
  [QuotationStatus.PENDING_APPROVAL]: 'รออนุมัติ',
  [QuotationStatus.APPROVED]: 'อนุมัติ',
  [QuotationStatus.PENDING_SIGNATURE]: 'ยังไม่เซ็นต์',
  [QuotationStatus.SIGNED]: 'เซ็นต์',
  [QuotationStatus.FOLLOW_UP]: 'ติดตามครั้งที่',
  [QuotationStatus.REVISED]: 'ปรับปรุง',
  [QuotationStatus.CANCELLED]: 'ยกเลิก',
  [QuotationStatus.EXPIRED]: 'หมดอายุ',
};

// Helper: get display label for status (includes follow_up_count)
const getStatusLabel = (q: Quotation): string => {
  if (q.status === QuotationStatus.FOLLOW_UP) {
    return `ติดตามครั้งที่ ${q.follow_up_count || 1}`;
  }
  return statusLabels[q.status] || q.status;
};

import { QuotationModal } from '../../components/features/quotations/QuotationModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Modal } from '../../components/common/Modal';
import { Input, Select, Button } from '../../components/common/FormControls';
import { useData } from '../../contexts/DataContext';
import { QuotationApi } from '../../api/quotation';
import { PrintApi } from '@/src/api/print';
import Swal from 'sweetalert2';
import { Quotation } from '@/src/types/entity/quotation.interface';

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
  const [totalFromServer, setTotalFromServer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // These are declared below but needed in fetchQuotations
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ทั้งหมด' | QuotationStatus>(
    'ทั้งหมด'
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchQuotations = async (page = currentPage, limit = itemsPerPage) => {
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

      const res = await QuotationApi.getAll(query);
      setQuotations(res.data || []);
      setTotalFromServer(res.meta?.total || res.data?.length || 0);
    } catch (error) {
      console.error('Failed to fetch quotations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, searchQuery, statusFilter, startDate, endDate]);

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

  // Cancellation reason state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  // Signature modal state
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);

  // Stats calculations
  const stats = useMemo(() => {
    const total = quotations.length;
    const draft = quotations.filter(
      (q) => q.status === QuotationStatus.DRAFT
    ).length;
    const pending = quotations.filter(
      (q) =>
        q.status === QuotationStatus.PENDING_SIGNATURE ||
        q.status === QuotationStatus.PENDING_APPROVAL ||
        q.status === QuotationStatus.APPROVED
    ).length;
    const approved = quotations.filter(
      (q) =>
        q.status === QuotationStatus.SIGNED
    ).length;
    const totalValue = quotations.reduce(
      (sum, q) => sum + (Number(q.total) || 0),
      0
    );

    return { total, draft, pending, approved, totalValue };
  }, [quotations]);

  // Customer phone map
  const custPhoneMap = useMemo(
    () => new Map((customers || []).map((c) => [c.id, c.primary_phone || ''])),
    [customers]
  );

  // Server-side pagination: quotations already filtered/sorted by API
  const totalItems = totalFromServer;
  const paginatedQuotations = quotations;

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
      } else if (modalMode === 'revise' && selectedQuotation) {
        await QuotationApi.revise(selectedQuotation.id, data);
      }
      setIsModalOpen(false);
      fetchQuotations();
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
      setTargetStatus(selectedQuotation.status);
      setIsStatusModalOpen(true);
    }
    setOpenDropdownId(null);
  };

  const handleStatusConfirm = async () => {
    if (!selectedQuotation) return;

    // If target is CANCELLED, open cancellation reason modal instead
    if (targetStatus === QuotationStatus.CANCELLED) {
      setIsStatusModalOpen(false);
      setCancellationReason('');
      setIsCancelModalOpen(true);
      return;
    }

    // If target is SIGNED, open signature modal instead
    if (targetStatus === QuotationStatus.SIGNED) {
      setIsStatusModalOpen(false);
      setIsSignatureModalOpen(true);
      return;
    }

    try {
      const updatePayload: any = { status: targetStatus };

      if (onUpdateQuotation) {
        await onUpdateQuotation({
          ...selectedQuotation,
          ...updatePayload,
        });
      } else {
        await QuotationApi.update(selectedQuotation.id, updatePayload);
      }
      fetchQuotations();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
    setIsStatusModalOpen(false);
  };

  // Handle cancellation with reason
  const handleCancelConfirm = async () => {
    if (!selectedQuotation) return;

    if (!cancellationReason.trim()) {
      Swal.fire({
        title: 'กรุณากรอกเหตุผล',
        text: 'กรุณาระบุเหตุผลที่ลูกค้าไม่เซ็นรับใบเสนอราคา',
        icon: 'warning',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    try {
      const updatePayload = {
        status: QuotationStatus.CANCELLED,
        cancellation_reason: cancellationReason.trim(),
      };

      if (onUpdateQuotation) {
        await onUpdateQuotation({
          ...selectedQuotation,
          ...updatePayload,
        });
      } else {
        await QuotationApi.update(selectedQuotation.id, updatePayload);
      }
      fetchQuotations();
    } catch (error) {
      console.error('Failed to cancel quotation:', error);
    }
    setIsCancelModalOpen(false);
    setCancellationReason('');
  };

  // Handle signature submit (support both draw + upload image)
  const handleSignatureConfirm = async () => {
    if (!selectedQuotation) return;

    const hasDrawnSignature = signatureRef.current && !signatureRef.current.isEmpty();
    const hasUploadedFile = !!signatureFile;

    if (!hasDrawnSignature && !hasUploadedFile) {
      Swal.fire({
        title: 'กรุณาเซ็นลายเซ็นหรืออัปโหลดรูปภาพ',
        text: 'กรุณาเซ็นลายเซ็นในกรอบ หรืออัปโหลดรูปภาพลายเซ็น',
        icon: 'warning',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    setIsUploadingSignature(true);
    try {
      const updatePayload: any = {
        status: QuotationStatus.SIGNED,
      };

      // If uploaded file, upload to storage first (priority over drawn)
      if (hasUploadedFile) {
        const uploaded = await StorageApi.upload({
          file: signatureFile!,
          path: `quotations/${selectedQuotation.id}/signature`,
          provider: 'local',
          type: 'image',
          visibility: 'private',
          entity_type: 'quotation',
          entity_id: selectedQuotation.id,
        });
        updatePayload.signature_file_id = uploaded.id;

        // ใช้รูปที่ upload เป็น signature base64 สำหรับแสดงใน PDF
        if (signaturePreview) {
          updatePayload.signature = signaturePreview;
        }
      } else if (hasDrawnSignature) {
        // Fallback: ใช้ลายเซ็นจาก canvas ถ้าไม่ได้ upload รูป
        updatePayload.signature = signatureRef.current!.toDataURL('image/png');
      }

      if (onUpdateQuotation) {
        await onUpdateQuotation({ ...selectedQuotation, ...updatePayload });
      } else {
        await QuotationApi.update(selectedQuotation.id, updatePayload);
      }

      Swal.fire({
        title: 'บันทึกสำเร็จ!',
        text: 'ลูกค้าเซ็นรับใบเสนอราคาเรียบร้อยแล้ว',
        icon: 'success',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#3085d6',
        timer: 2000,
        timerProgressBar: true,
      });

      fetchQuotations();
    } catch (error) {
      console.error('Failed to save signature:', error);
    } finally {
      setIsUploadingSignature(false);
    }
    setSignatureFile(null);
    setSignaturePreview(null);
    setIsSignatureModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (selectedQuotation) {
      if (onDeleteQuotation) await onDeleteQuotation(selectedQuotation.id);
      else await QuotationApi.delete(selectedQuotation.id);
      fetchQuotations();
    }
    setIsDeleteModalOpen(false);
    setSelectedQuotation(null);
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col h-full min-h-[calc(100vh-64px)]">
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
          className="!p-0 flex flex-col flex-grow min-h-0"
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
                <DatePicker selected={startDate ? new Date(startDate) : null} onChange={(date) => setStartDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="เริ่มต้น" isClearable className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-40" />
                <span className="text-slate-400">-</span>
                <DatePicker selected={endDate ? new Date(endDate) : null} onChange={(date) => setEndDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="สิ้นสุด" isClearable className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-40" />
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
          <div className="overflow-x-auto flex-grow relative">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    ลำดับ
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    เลขที่ใบเสนอราคา
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    ลูกค้า
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    เบอร์โทร
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    อ้างอิงใบประเมิน
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    วันที่สร้าง
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    หมดอายุ
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    ผู้สร้าง
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    ยอดรวม
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="p-0 border-b-0">
                      <div className="flex flex-col items-center justify-center w-full h-full min-h-[40vh] py-16">
                        <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-base font-medium text-slate-500">กำลังดึงข้อมูลใบเสนอราคา...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-0 border-b-0 text-slate-500">
                      <div className="flex flex-col items-center justify-center w-full h-full min-h-[40vh] py-16">
                        <DocumentTextIcon className="h-12 w-12 text-slate-300 mb-3" />
                        <p className="text-lg font-medium">ไม่พบข้อมูลใบเสนอราคา</p>
                        <p className="text-sm mt-1">ลองปรับตัวกรองหรือสร้างใบเสนอราคาใหม่</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedQuotations.map((q, index) => {
                    const customer = customers?.find(
                      (c) => c.id === q.customer_id
                    );
                    const phoneNumber =
                      q.contact_phone || q.customer?.primary_phone || customer?.primary_phone;
                    return (
                      <tr
                        key={q.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-slate-700">
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
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">
                          {q.customer_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatPhoneNumber(phoneNumber)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {q['assessment']?.code || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatThaiDate(q.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatThaiDate(q.expires_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {(q as any).creator ? `${(q as any).creator.first_name} ${(q as any).creator.last_name || ''}`.trim() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <StatusBadge
                            status={getStatusLabel(q)}
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
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${loadingPdfId === q.id
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
                                    const blob = await PrintApi.getById(q.id);
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
          className="origin-top-right mt-2 w-48 rounded-xl shadow-xl bg-white ring-1 ring-black/5 focus:outline-none z-50 border border-slate-100 overflow-hidden"
        >
          <div className="py-1">
            <button
              onClick={handleViewDetails}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <EyeIcon className="w-4 h-4 text-slate-400" />
              ดูรายละเอียด
            </button>
            <button
              onClick={handleEdit}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <PencilIcon className="w-4 h-4 text-slate-400" />
              แก้ไข
            </button>
            <button
              onClick={handleRevise}
              className="w-full px-4 py-2.5 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-3 transition-colors"
            >
              <DocumentTextIcon className="w-4 h-4 text-amber-500" />
              สร้างฉบับใหม่
            </button>
            <button
              onClick={handleStatusClick}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <CheckCircleIcon className="w-4 h-4 text-slate-400" />
              เปลี่ยนสถานะ
            </button>
            <button
              onClick={async () => {
                if (!selectedQuotation?.customer_id) return;
                try {
                  const response = await CustomerApi.generatePortalToken(selectedQuotation.customer_id);
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
            {(selectedQuotation?.status === QuotationStatus.DRAFT || selectedQuotation?.status === QuotationStatus.APPROVED || selectedQuotation?.status === QuotationStatus.PENDING_SIGNATURE) && (
              <button
                onClick={async () => {
                  if (!selectedQuotation?.customer_id) return;
                  try {
                    const response = await QuotationApi.generateSigningLink(selectedQuotation.customer_id, selectedQuotation.id);
                    const signingUrl = `${window.location.origin}/portal/sign?token=${response.data.token}`;
                    await navigator.clipboard.writeText(signingUrl);
                    Swal.fire({ title: 'คัดลอกสำเร็จ!', text: 'คัดลอกลิงก์เซ็นเอกสารสำหรับลูกค้าเรียบร้อยแล้ว', icon: 'success', timer: 2000, timerProgressBar: true, confirmButtonColor: '#3085d6' });
                  } catch {
                    Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถสร้างลิงก์เซ็นได้', icon: 'error', confirmButtonColor: '#d33' });
                  }
                  setOpenDropdownId(null);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors"
              >
                <PencilIcon className="w-4 h-4 text-emerald-500" />
                ส่ง Link เซ็นเอกสาร
              </button>
            )}
            <hr className="my-1 border-slate-100" />
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
            >
              <TrashIcon className="w-4 h-4 text-red-500" />
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

      {/* Status Change Modal */}
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
            {/* Show existing signature if already signed */}
            {selectedQuotation?.signature && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ลายเซ็นลูกค้า
                </label>
                <img
                  src={selectedQuotation.signature}
                  alt="ลายเซ็นลูกค้า"
                  className="border rounded-lg bg-white max-h-24"
                />
              </div>
            )}
            {/* Show cancellation reason if cancelled */}
            {selectedQuotation?.cancellation_reason && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <label className="block text-sm font-medium text-red-700 mb-1">
                  เหตุผลที่ยกเลิก
                </label>
                <p className="text-sm text-red-600">
                  {selectedQuotation.cancellation_reason}
                </p>
              </div>
            )}
          </div>
        }
        confirmButtonText="บันทึก"
        confirmButtonClass="bg-primary hover:bg-primary/90"
      />

      {/* Cancellation Reason Modal */}
      <ConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancellationReason('');
        }}
        onConfirm={handleCancelConfirm}
        title="ยกเลิกใบเสนอราคา"
        message={
          <div className="space-y-4 text-left">
            <p>
              ยืนยันการยกเลิกใบเสนอราคา{' '}
              <strong>{selectedQuotation?.code}</strong>
            </p>
            <div className="mt-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                เหตุผลที่ลูกค้าไม่เซ็นรับใบเสนอราคา <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="กรุณาระบุเหตุผล เช่น ลูกค้าเปรียบเทียบราคา, ราคาสูงเกินไป, เลือกบริษัทอื่น..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                rows={4}
              />
            </div>
          </div>
        }
        confirmButtonText="ยืนยันยกเลิก"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      {/* Signature Modal */}
      <Modal
        isOpen={isSignatureModalOpen}
        onClose={() => { setIsSignatureModalOpen(false); setSignatureFile(null); setSignaturePreview(null); }}
        title={`เซ็นรับใบเสนอราคา - ${selectedQuotation?.code || ''}`}
        size="lg"
        footer={
          <div className="flex gap-3 w-full justify-end">
            <Button
              variant="secondary"
              onClick={() => { signatureRef.current?.clear(); setSignatureFile(null); setSignaturePreview(null); }}
              type="button"
            >
              ล้างทั้งหมด
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setIsSignatureModalOpen(false); setSignatureFile(null); setSignaturePreview(null); }}
              type="button"
            >
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              onClick={handleSignatureConfirm}
              type="button"
              disabled={isUploadingSignature}
            >
              {isUploadingSignature ? 'กำลังบันทึก...' : 'บันทึกและเปลี่ยนสถานะเป็นเซ็น'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Option 1: Upload image */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">อัปโหลดรูปภาพลายเซ็น</p>
            {signaturePreview ? (
              <div className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-lg">
                <img src={signaturePreview} alt="ลายเซ็น" className="max-h-20 rounded border" />
                <div className="flex-1">
                  <p className="text-sm text-slate-700 font-medium truncate">{signatureFile?.name}</p>
                  <p className="text-xs text-slate-400">{signatureFile ? (signatureFile.size / 1024).toFixed(1) + ' KB' : ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSignatureFile(null); setSignaturePreview(null); }}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-slate-200 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-blue-50/30 hover:border-blue-400 transition-all group">
                <div className="flex flex-col items-center gap-1 text-slate-500 group-hover:text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-sm font-medium">คลิกเพื่ออัปโหลดรูปภาพลายเซ็น</span>
                  <span className="text-xs text-slate-400">JPG, PNG ขนาดไม่เกิน 5MB</span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSignatureFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => setSignaturePreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="text-xs text-slate-400">หรือ</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          {/* Option 2: Draw signature */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">เซ็นลายเซ็นด้วยตัวเอง</p>
            <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  width: 560,
                  height: 200,
                  className: 'w-full rounded-lg',
                }}
                penColor="black"
              />
            </div>
            <p className="text-xs text-slate-400 text-center mt-1">
              ใช้เมาส์หรือนิ้วสัมผัสเพื่อเซ็นลายเซ็น
            </p>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <p>
            คุณแน่ใจหรือไม่ว่าต้องการลบใบเสนอราคา{' '}
            <strong>{selectedQuotation?.code}</strong>?
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
