import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Enum
import { AsessmentStatus } from '@/src/types/enums/assessment';
import {
  Assessment,
  Product,
  Customer,
  Package,
  Category,
} from '@/src/types/entity/app.interface';

// Component
import AssessmentCard from './AssessmentCard';
import { Button, Input } from '@/src/components/common/FormControls';
import {
  PlusIcon,
  ViewColumnsIcon,
  ListBulletIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ManageIcon,
  CalendarDaysIcon,
  PlayIcon,
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  JobDateIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  LoadingIcon,
} from '@/src/assets/icons/Icons';
import { Pagination } from '@/src/components/common/Pagination';
import { formatThaiDate } from '@/src/utils/date';
import { AssessmentDetailsModal } from '@/src/components/features/assessments/AssessmentDetailsModal';
import { AssessmentModal } from '@/src/components/features/assessments/AssessmentModal'; // 🔴 นำเข้า AssessmentModal ที่รวมแล้ว
import { StatusBadge } from '@/src/components/common/StatusBadge';
import { Card } from '@/src/components/common/Card';
import { ConfirmationModal } from '@/src/components/common';
import {
  AssessmentApi,
  CustomerApi,
  PackageApi,
  ProductApi,
  CategoryApi,
} from '@/src/api';
import { CategoryType, Role } from '@/src/types';
import { useCurrentUser } from '@/src/hooks';

const Assessments: React.FC = () => {
  const location = useLocation();
  const currentUser = useCurrentUser()
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [view, setView] = useState<'list' | 'kanban'>('kanban');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assessmentToEdit, setAssessmentToEdit] = useState<Assessment | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    isBottom?: boolean;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedAssessment, setSelectedAssessment] =
    useState<Assessment | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] =
    useState<Assessment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchParams = new URLSearchParams(location.search);
      const statusParam = searchParams.get('status');

      const filter: any = { limit: 10 };
      if (statusParam) {
        filter.status = statusParam;
        // If filtering by status, ensure we get enough items
        filter.limit = 100;
        // Also ensure current page is reset if needed, but here we just fetch
      }

      const [
        assessmentsRes,
        customersRes,
        productsRes,
        packagesRes,
        categoriesRes,
      ] = await Promise.all([
        AssessmentApi.getAll(filter),
        CustomerApi.getCustomers({ limit: 10 }),
        ProductApi.getProducts({ limit: 10 }),
        PackageApi.getPackages({ limit: 10 }),
        CategoryApi.getCategories({ type: CategoryType.SERVICE }),
      ]);
      setAssessments(assessmentsRes.data);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
      setPackages(packagesRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [location.search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const customerMap = useMemo(() => {
    return new Map(
      customers.map((c) => [c.id, `${c.first_name} ${c.last_name}`])
    );
  }, [customers]);

  const getCustomerName = useCallback(
    (assessment: Assessment) => {
      if (assessment.customer) {
        const { first_name, last_name } = assessment.customer;
        return [first_name, last_name]
          .filter((t) => t && t !== '-')
          .join(' ')
          .trim();
      }
      return customerMap.get(assessment.customer_id) || '';
    },
    [customerMap]
  );

  // Stats Calculations
  const stats = useMemo(() => {
    const total = assessments.length;

    const draft = assessments.filter(
      (a) => a.status === AsessmentStatus.DRAFT
    ).length;

    const pending = assessments.filter(
      (a) =>
        a.status === AsessmentStatus.PENDING ||
        a.status === AsessmentStatus.APPOINTMENT
    ).length;

    const completed = assessments.filter(
      (a) => a.status === AsessmentStatus.COMPLETE
    ).length;

    return {
      total,
      draft,
      pending,
      completed,
    };
  }, [assessments]);

  const reversedAssessments = useMemo(
    () => [...assessments].reverse(),
    [assessments]
  );

  const filteredAssessments = useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (!lowercasedQuery) {
      return reversedAssessments;
    }

    return reversedAssessments.filter((assessment) => {
      const customerName = getCustomerName(assessment);

      const matchesCustomer =
        assessment.customer_id.toLowerCase().includes(lowercasedQuery) ||
        customerName.toLowerCase().includes(lowercasedQuery);

      const matchesWorkArea = assessment.assessment_areas.some(
        (area) =>
          (area.building_type &&
            area.building_type.toLowerCase().includes(lowercasedQuery)) ||
          (area.category_services || []).some((service) =>
            service.name.toLowerCase().includes(lowercasedQuery)
          )
      );

      const matchesDate = formatThaiDate(
        new Date(assessment.appointment_date).toDateString()
      ).includes(lowercasedQuery);

      return matchesCustomer || matchesWorkArea || matchesDate;
    });
  }, [reversedAssessments, searchQuery, getCustomerName]);

  const kanbanColumns: {
    title: AsessmentStatus;
    assessments: Assessment[];
  }[] = [
    {
      title: AsessmentStatus.DRAFT,
      assessments: filteredAssessments.filter(
        (a) => a.status === AsessmentStatus.DRAFT
      ),
    },
    {
      title: AsessmentStatus.APPOINTMENT,
      assessments: filteredAssessments.filter(
        (a) => a.status === AsessmentStatus.APPOINTMENT
      ),
    },
    {
      title: AsessmentStatus.PENDING,
      assessments: filteredAssessments.filter(
        (a) => a.status === AsessmentStatus.PENDING
      ),
    },
    {
      title: AsessmentStatus.COMPLETE,
      assessments: filteredAssessments.filter(
        (a) => a.status === AsessmentStatus.COMPLETE
      ),
    },
  ];

  const totalItems = filteredAssessments.length;
  const paginatedAssessments = filteredAssessments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleSaveAssessment = async (assessmentData: any) => {
    try {
      const id = assessmentToEdit?.id || assessmentData.id;
      const currentStatus = String(assessmentToEdit?.status || assessmentData.status).toUpperCase();

      if (id) {
        await AssessmentApi.update(id, assessmentData);

        if (currentStatus === 'PENDING') {
          if (['SUPERADMIN', 'ADMIN'].includes(currentUser.role)) {
            console.log('กำลังยิง verifyById...');
            await AssessmentApi.verifyById(id, { status: 'VERIFIED' } as any); 
          } 
          else if (currentUser.role === 'COO') {
            console.log('กำลังยิง approveById...');
            await AssessmentApi.approveById(id, { status: 'APPROVED' } as any);
          }
        }
      } else {
        // โหมดสร้างใหม่
        await AssessmentApi.create(assessmentData);
      }
      
      fetchData();
      setIsModalOpen(false);
      setAssessmentToEdit(null);
    } catch (error) {
      console.error('Error saving assessment:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกหรือตรวจสอบใบประเมิน');
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    try {
      await AssessmentApi.delete(assessmentId);
      fetchData();
    } catch (error) {
      console.error('Error deleting assessment:', error);
    }
  };

  const handleViewDetails = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleEdit = (assessment: Assessment) => {
    setAssessmentToEdit(assessment);
    setIsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (assessment: Assessment) => {
    setAssessmentToDelete(assessment);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (assessmentToDelete) {
      await handleDeleteAssessment(assessmentToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setAssessmentToDelete(null);
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    assessmentId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === assessmentId) {
      setOpenDropdownId(null);
      setSelectedAssessment(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setSelectedAssessment(
        assessments.find((a) => a.id === assessmentId) || null
      );
      setOpenDropdownId(assessmentId);
      
      // 🌟 เพิ่ม 2 บรรทัดนี้
      const isBottom = buttonRect.bottom > window.innerHeight - 220;
      
      setDropdownPosition({
        top: buttonRect.bottom, 
        left: buttonRect.right,
        isBottom: isBottom, // 🌟 ส่งค่า isBottom ไปด้วย
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
      if ((event.target as HTMLElement).closest('button[data-assessment-id]'))
        return;
      setOpenDropdownId(null);
      setSelectedAssessment(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const renderActions = () => {
    if (!selectedAssessment) return null;

    const actions: {
      label: string;
      icon: React.FC<any>;
      onClick: () => void;
      isDanger?: boolean;
    }[] = [
      {
        label: 'ดูรายละเอียด',
        icon: EyeIcon,
        onClick: () => handleViewDetails(selectedAssessment),
      },
      {
        label: 'แก้ไข',
        icon: PencilIcon,
        onClick: () => handleEdit(selectedAssessment),
      },
    ];

    actions.push({
      label: 'ลบ',
      icon: TrashIcon,
      onClick: () => handleDelete(selectedAssessment),
      isDanger: true,
    });

    return actions.map((action) => (
      <a
        key={action.label}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          action.onClick();
          setOpenDropdownId(null);
        }}
        className={`flex items-center w-full text-left px-4 py-2 text-sm ${action.isDanger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}
        role="menuitem"
      >
        <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
        <span>{action.label}</span>
      </a>
    ));
  };

  return (
    <div className="relative min-h-screen">
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl">
           <LoadingIcon className="h-10 w-10 animate-spin text-primary" />
           <p className="mt-4 text-base font-medium text-slate-500">กำลังโหลดใบประเมิน...</p>
        </div>
      )}
      
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ใบประเมิน</h1>
            <p className="mt-1 text-slate-600">
              จัดการและติดตามใบประเมินทั้งหมด
            </p>
          </div>
          <Button
            onClick={() => {
              setAssessmentToEdit(null);
              setIsModalOpen(true);
            }}
            variant="primary"
            className="shadow-md shadow-primary/20"
          >
            <PlusIcon className="h-5 w-5" />
            สร้างใบประเมิน
          </Button>
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
          <Card className="!p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-500 rounded-lg">
                <PencilIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">แบบร่าง</p>
                <p className="text-2xl font-bold text-slate-800">
                  {stats.draft}
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
                <p className="text-sm text-green-600 font-medium">เสร็จสิ้น</p>
                <p className="text-2xl font-bold text-green-800">
                  {stats.completed}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <Card className="!p-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto flex-1">
              <div className="relative flex-1 sm:max-w-xs">
                <Input
                  type="search"
                  placeholder="ค้นหา (ลูกค้า, ประเภท, บริการ, วันที่)..."
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
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg bg-slate-100 p-1">
                <Button
                  onClick={() => setView('kanban')}
                  variant="ghost"
                  className={`p-2 rounded-md h-auto ${view === 'kanban' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
                  title="มุมมอง Kanban"
                >
                  <ViewColumnsIcon className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setView('list')}
                  variant="ghost"
                  className={`p-2 rounded-md h-auto ${view === 'list' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
                  title="มุมมองรายการ"
                >
                  <ListBulletIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex-grow min-h-0">
          {view === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
              {kanbanColumns.map((col) => (
                <div
                  key={col.title}
                  className="bg-slate-100/80 rounded-xl p-4 flex flex-col min-h-[500px]"
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          col.title === AsessmentStatus.DRAFT
                            ? 'bg-slate-400'
                            : col.title === AsessmentStatus.APPOINTMENT
                              ? 'bg-blue-500'
                              : col.title === AsessmentStatus.PENDING
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                        }`}
                      />
                      <h3 className="font-bold text-slate-700 text-sm truncate">
                        {col.title === AsessmentStatus.DRAFT
                          ? 'แบบร่าง'
                          : col.title === AsessmentStatus.APPOINTMENT
                            ? 'นัดหมายแล้ว'
                            : col.title === AsessmentStatus.PENDING
                              ? 'รอดำเนินการ'
                              : col.title === AsessmentStatus.COMPLETE
                                ? 'เสร็จสิ้น'
                                : col.title}
                      </h3>
                    </div>
                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-bold bg-white text-slate-600 shadow-sm border border-slate-200">
                      {col.assessments.length}
                    </span>
                  </div>
                  <div className="space-y-3 flex-grow">
                    {col.assessments.map((assessment) => (
                      <AssessmentCard
                        key={assessment.id}
                        assessment={assessment}
                        customerName={getCustomerName(assessment)}
                        onDropdownToggle={handleDropdownToggle}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                    {col.assessments.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400 h-full">
                        <ClipboardDocumentListIcon className="h-10 w-10 mb-2 opacity-50" />
                        <p className="text-sm">ไม่มีใบประเมิน</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        ลำดับ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        รหัสใบประเมิน
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        ลูกค้า
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        วันที่นัดหมาย
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        ประเภท
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        ค่าใช้จ่าย
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedAssessments.map((assessment, index) => {
                      const allServiceTypes = [
                        ...new Set(
                          assessment.assessment_areas.flatMap(
                            (area) => area.category_services || []
                          )
                        ),
                      ];
                      const allBuildingTypes = [
                        ...new Set(
                          assessment.assessment_areas
                            .map((area) => area.building_type)
                            .filter(Boolean)
                        ),
                      ];
                      return (
                        <tr
                          key={assessment.id}
                          className={`hover:bg-slate-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-primary">
                              {assessment.code || assessment.id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-primary font-bold text-xs">
                                  {(getCustomerName(assessment) || '?')
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {getCustomerName(assessment) || '-'}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                  {assessment.customer?.code ||
                                    assessment.customer?.primary_phone ||
                                    '-'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-blue-50 rounded">
                                <JobDateIcon className="h-3.5 w-3.5 text-blue-500" />
                              </div>
                              <span className="text-sm text-slate-700">
                                {formatThaiDate(
                                  new Date(
                                    assessment.appointment_date
                                  ).toDateString()
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-slate-700">
                                {allBuildingTypes.join(', ') || '-'}
                              </span>
                              <span className="text-xs text-slate-500">
                                {allServiceTypes.join(', ') || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={assessment.status as any} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900">
                            ฿
                            {assessment.total_price.toLocaleString('th-TH', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                onClick={async () => {
                                  try {
                                    if (assessment.id) {
                                      setLoadingPdfId(assessment.id);
                                      const blob =
                                        await AssessmentApi.exportPdf(
                                          assessment.id
                                        );
                                      const url =
                                        window.URL.createObjectURL(blob);
                                      window.open(url, '_blank');
                                      setTimeout(
                                        () => window.URL.revokeObjectURL(url),
                                        100
                                      );
                                    }
                                  } catch (error) {
                                    console.error('Error fetching PDF:', error);
                                    alert('ไม่สามารถดาวน์โหลด PDF ได้');
                                  } finally {
                                    setLoadingPdfId(null);
                                  }
                                }}
                                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 h-auto shadow-sm"
                                title="ดู PDF"
                                disabled={loadingPdfId === assessment.id}
                              >
                                {loadingPdfId === assessment.id ? (
                                  <LoadingIcon className="h-4 w-4 animate-spin" />
                                ) : (
                                  <span className="flex items-center gap-1.5">
                                    <EyeIcon className="h-4 w-4" />
                                    ดู PDF
                                  </span>
                                )}
                              </Button>
                              <Button
                                data-assessment-id={assessment.id}
                                onClick={(e) =>
                                  handleDropdownToggle(e, assessment.id)
                                }
                                variant="ghost"
                                className="p-2 h-auto rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                              >
                                <ManageIcon className="h-5 w-5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {paginatedAssessments.length > 0 && (
                <div className="border-t border-slate-100">
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
      </div>

      {openDropdownId && dropdownPosition && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed', // 🌟 เปลี่ยนตรงนี้เป็น fixed
            top: dropdownPosition.isBottom ? 'auto' : `${dropdownPosition.top + 4}px`, // 🌟 อัปเดตตรงนี้
            bottom: dropdownPosition.isBottom ? `${window.innerHeight - dropdownPosition.top + 36}px` : 'auto', // 🌟 อัปเดตตรงนี้
            left: `${dropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="z-[100] w-56 rounded-xl shadow-xl bg-white ring-1 ring-black/5 focus:outline-none border border-slate-100 overflow-hidden" // 🌟 ลบ origin-top-right ออก และแก้ z เป็น 100
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-2" role="none">
            {renderActions()}
          </div>
        </div>
      )}
     
      <AssessmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setAssessmentToEdit(null);
        }}
        currentUserRole={currentUser.role as Role}
        assessment={assessmentToEdit}
        onSubmit={handleSaveAssessment}
      />

      {isDetailsModalOpen && (
        <AssessmentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          assessment={selectedAssessment}
          products={products}
          customers={customers}
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <div className="text-slate-600">
            คุณแน่ใจหรือไม่ว่าต้องการลบใบประเมินนี้?
            <br />
            {assessmentToDelete && (
              <span className="font-semibold text-slate-800 mt-2 block">
                รหัส: {assessmentToDelete.code || assessmentToDelete.id}
              </span>
            )}
            <br />
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </div>
        }
        confirmButtonText="ยืนยันการลบ"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default Assessments;