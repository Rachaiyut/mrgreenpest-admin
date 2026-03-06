// ===== React =====
import React, { useEffect, useMemo, useRef, useState } from 'react';

// ===== Absolute Types =====
import {
  FieldJob,
  ServiceReport,
} from '@/src/types/entity/field-job.interface';

import { Category } from '@/src/types/entity/category.interface';
import { JobMainStatus, JobStatus, WarehouseType } from '@/src/types';

// ===== Relative Types =====
import { Status, User, UserRole } from '../../types/entity/core.interface';
import { Assessment } from '../../types/entity/assessment.interface';
import { Contract, Quotation } from '../../types/entity/financial.interface';
import { Product } from '../../types/entity/product.interface';
import { Package } from '../../types/entity/package.interface';
import { Customer } from '../../types/entity/customer.interface';
import { Warehouse } from '../../types/entity/inventory.interface';
import { Role } from '../../types/enums/role';

// ===== Hooks =====
import { useCurrentUser } from '../../hooks/useCurrentUser';

// ===== Components (Features) =====
import { AddJobModal } from '../../components/features/jobs/AddJobModal';
import { CancelJobModal } from '../../components/features/jobs/CancelJobModal';
import { EditJobModal } from '../../components/features/jobs/EditJobModal';
import { JobDetailsModal } from '../../components/features/jobs/JobDetailsModal';
import { ServiceReportModal } from '../../components/features/jobs/ServiceReportModal';
import { EditAssessmentModal } from '../../components/features/assessments/EditAssessmentModal';

// ===== Components (Common) =====
import { Card } from '../../components/common/Card';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Pagination } from '../../components/common/Pagination';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Select, Input, Button } from '../../components/common/FormControls';

// ===== Local Components =====
import JobCard from './JobCard';
import JobCalendar from './JobCalendar';

// ===== API =====
import {
  AssessmentApi,
  CategoryApi,
  JobApi,
  PackageApi,
  ProductApi,
  ServiceReportApi,
  StorageApi,
  VehicleApi,
} from '@/src/api';

// ===== Utils =====
import { formatThaiDate } from '@/src/utils/date';

// ===== Assets =====
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  EyeIcon,
  JobDateIcon,
  ListBulletIcon,
  LoadingIcon,
  ManageIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  TechnicianIcon,
  TrashIcon,
  ViewColumnsIcon,
  XCircleIcon,
} from '../../assets/icons/Icons';

interface JobProps {
  users: User[];
  jobs: FieldJob[];
  assessments: Assessment[];
  contracts: Contract[];
  quotations: Quotation[];
  products: Product[];
  onUpdateAssessment: (assessment: Assessment) => void;
  onUpdateQuotation: (quotation: Quotation) => void;
  customers: Customer[];
  warehouses: Warehouse[];
  onCreateQuotation: (
    quotationData: Omit<Quotation, 'id'>,
    assessmentId?: string
  ) => void;
}

const Job: React.FC<JobProps> = ({
  users,
  jobs: initialJobs,
  assessments: initialAssessments,
  contracts,
  quotations,
  products: initialProducts,
  onUpdateAssessment,
  onUpdateQuotation,
  customers: initialCustomers,
  warehouses: initialWarehouses,
}) => {
  const authUser = useCurrentUser();
  const currentUser = authUser as unknown as User;

  // Local state
  const [jobs, setJobs] = useState<FieldJob[]>(initialJobs || []);
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(
    Array.isArray(initialWarehouses) ? initialWarehouses : []
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [
        warehousesRes,
        categoriesRes,
        reportsRes,
        productsRes,
        packagesRes,
      ] = await Promise.all([
        VehicleApi.getVehiclesWithUserJobs(),
        CategoryApi.getCategories({}),
        ServiceReportApi.getAll({ limit: 10 }),
        ProductApi.getProducts({ limit: 10 }),
        PackageApi.getPackages({ limit: 10 }),
      ]);

      let warehousesData: any[] = [];
      if (Array.isArray((warehousesRes as any).data)) {
        warehousesData = (warehousesRes as any).data;
      } else if (Array.isArray(warehousesRes)) {
        warehousesData = warehousesRes as any[];
      }

      const categoriesData = (categoriesRes as any).data || [];
      const reportsData = (reportsRes as any).data || [];
      const productsData = (productsRes as any).data || [];
      const packagesData = (packagesRes as any).data || [];

      setWarehouses(warehousesData);
      setCategories(categoriesData);
      setReports(reportsData);
      setProducts(productsData);
      setPackages(packagesData);

      const jobsFromWarehouses: FieldJob[] = warehousesData.flatMap(
        (warehouse: any) =>
          (warehouse.jobs || []).map((job: any) => {
            const customer = job.customer || {};
            const customerName =
              customer.first_name || customer.last_name
                ? `${customer.first_name || ''}${customer.last_name && customer.last_name !== '-'
                    ? ` ${customer.last_name}`
                    : ''
                  }`.trim()
                : customer.code || '';

            const addressParts = [
              customer.address_house_no,
              customer.address_soi,
              customer.address_road,
              customer.sub_district,
              customer.district,
              customer.province,
              customer.postal_code,
            ].filter(Boolean);

            const address = addressParts.join(' ');

            const rawStatus = String(job.status || '');
            const statusUpper = rawStatus.toUpperCase();
            const mappedStatus =
              statusUpper === 'PENDING'
                ? JobStatus.Pending
                : statusUpper === 'IN_PROGRESS' || statusUpper === 'INPROGRESS'
                  ? JobStatus.InProgress
                  : statusUpper === 'COMPLETED' || statusUpper === 'COMPLETE'
                    ? JobStatus.Completed
                    : statusUpper === 'CANCELLED'
                      ? JobStatus.Cancelled
                      : JobStatus.Planned;

            const techniciansList = [];
            if (job.primary_technician) {
              techniciansList.push({
                ...job.primary_technician,
                role: 'LEAD_TECH',
                name: job.primary_technician.first_name
                  ? `${job.primary_technician.first_name} ${job.primary_technician.last_name || ''}`.trim()
                  : job.primary_technician.name,
              });
            }

            if (Array.isArray(job.job_team_members) && job.job_team_members.length > 0) {
              const teamMembers = job.job_team_members.filter(
                (t: any) => t.id !== job.primary_technician?.id
              );
              techniciansList.push(
                ...teamMembers.map((t: any) => ({
                  ...t,
                  role: 'TECH',
                  name: t.first_name
                    ? `${t.first_name} ${t.last_name || ''}`.trim()
                    : t.name,
                }))
              );
            }

            if (techniciansList.length === 0 && Array.isArray(job.technicians) && job.technicians.length > 0) {
              techniciansList.push(...job.technicians);
            }

            return {
              api_status: rawStatus,
              id: job.id,
              assessment_id: job.assessment_id || undefined,
              contract_id: job.contract_id || undefined,
              customer_id: job.customer_id || customer.id,
              customerName: customerName,
              address,
              start_time: job.start_date,
              end_time: job.end_date,
              actual_start_time: job.actual_start_time,
              actual_end_time: job.actual_end_time,
              primary_technician: job.primary_technician || null,
              technicians: techniciansList,
              work_areas: [],
              status: mappedStatus,
              vehicle_id: warehouse.id,
              service_report: reportsData.find((r: any) => r.job_id === job.id),
              remarks: job.remark,
              invoice_id: job.invoice_id,
              invoice: job.invoice,
            } as any;
          })
      );
      setJobs(jobsFromWarehouses);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateJob = async (newJob: Omit<FieldJob, 'id'>) => {
    try {
      await JobApi.create(newJob as any);
      fetchData();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const handleUpdateJob = async (updatedJob: any) => {
    try {
      if (updatedJob.id) {
        const { id, ...data } = updatedJob;
        await JobApi.update(id, data as any);
        fetchData();
        setIsEditModalOpen(false);
        setJobToEdit(null);
      }
    } catch (error) {
      console.error('Error updating job:', error);
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    try {
      if (newStatus === JobStatus.InProgress) {
        await JobApi.checkIn(jobId);
      } else if (newStatus === JobStatus.Completed) {
        await JobApi.checkOut(jobId);
      } else {
        const status = newStatus === (JobStatus.Completed as any) ? 'COMPLETE' : 'PENDING';
        await JobApi.update(jobId, { status } as any);
      }
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleConfirmCancel = async (jobId: string, reason: string) => {
    try {
      await JobApi.update(jobId, { status: JobStatus.Cancelled } as any);
      fetchData();
      setIsCancelModalOpen(false);
      setJobToCancel(null);
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (jobToDelete) {
      try {
        await JobApi.delete(jobToDelete.id);
        fetchData();
        setIsDeleteModalOpen(false);
        setJobToDelete(null);
      } catch (error) {
        console.error('Error deleting job:', error);
      }
    }
  };

  const onCreateJob = handleCreateJob;
  const onUpdateJob = handleUpdateJob;

  const [activeTab, setActiveTab] = useState<'schedule' | 'work-schedule' | 'reports'>('schedule');
  const [view, setView] = useState<'list' | 'kanban' | 'calendar'>('kanban');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isEditAssessmentModalOpen, setIsEditAssessmentModalOpen] = useState(false);
  const [isTechAssessmentModalOpen, setIsTechAssessmentModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<any | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<any | null>(null);

  const [jobToEdit, setJobToEdit] = useState<any | null>(null);
  const [jobForReport, setJobForReport] = useState<any | null>(null);
  const [reportFinalStatus, setReportFinalStatus] = useState<JobStatus>(JobStatus.Completed);
  const [assessmentForCheckout, setAssessmentForCheckout] = useState<Assessment | null>(null);
  const [jobBeingCheckedOut, setJobBeingCheckedOut] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [reportCurrentPage, setReportCurrentPage] = useState(1);
  const [reportItemsPerPage, setReportItemsPerPage] = useState(10);

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    isBottom: boolean;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const kanbanContainerRef = useRef<HTMLDivElement>(null);

  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [selectedAssessmentForJob, setSelectedAssessmentForJob] = useState<Assessment | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [selectedTechnicianId, setSelectedTechnicianId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().substring(0, 10));
  const [scheduleVehicleId, setScheduleVehicleId] = useState('');
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  const technicians = useMemo(
    () =>
      users.filter((user) => {
        const roleName = typeof user.role === 'object' && user.role !== null ? (user.role as { name: string }).name : String(user.role || '');
        return roleName === UserRole.TECH;
      }),
    [users]
  );

  const createAutomaticReport = (job: any): ServiceReport => {
    const serviceTypesFromJob = [
      ...new Set(job.work_areas.flatMap((wa: any) => wa.service_package.split(',').map((s: any) => s.trim()))),
    ] as string[];

    return {
      created_at: new Date().toISOString(),
      check_in_time: job.actual_start_time
        ? new Date(job.actual_start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        : '',
      check_out_time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      service_actions: [],
      service_types: serviceTypesFromJob,
      termite: { status: 'absent' },
      ant: { applyGel: false },
      cockroach: { applyGel: false },
      rat: { glueTraps: false, mechanicalTraps: false, baitStations: false, refillBait: false },
      lizard: { placeTraps: false },
      next_appointment: { notes: '', reasons: [] },
      notes: 'รายงานสร้างโดยอัตโนมัติเมื่อเช็คเอาท์',
      status: JobStatus.Draft,
    };
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTechnicianId, searchQuery]);

  const reversedJobs = useMemo(() => [...jobs].reverse(), [jobs]);

  const filteredJobs = useMemo(() => {
    let tempJobs = reversedJobs;
    if (selectedTechnicianId !== 'all') {
      tempJobs = tempJobs.filter((job) => job.technicians.some((tech) => tech.id === selectedTechnicianId));
    }
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (lowercasedQuery) {
      tempJobs = tempJobs.filter((job) => {
        const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
        const vehicle = safeWarehouses.find((w) => w.id === job.vehicle_id);
        const licensePlateMatch = (vehicle as any)?.license_plate?.toLowerCase().includes(lowercasedQuery);
        const dateMatch = formatThaiDate(job.start_time).includes(lowercasedQuery);
        return licensePlateMatch || dateMatch;
      });
    }
    return tempJobs;
  }, [reversedJobs, selectedTechnicianId, searchQuery, warehouses]);

  const isAnyJobInProgressForCurrentUser = useMemo(() => {
    if (!currentUser || !jobs) return false;
    return jobs.some(
      (j) => j.status === JobMainStatus.IN_PROGRESS && j.technicians?.some((tech) => tech.id === currentUser.id)
    );
  }, [jobs, currentUser]);

  const kanbanColumns = useMemo(() => {
    const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
    const serviceVehicles = safeWarehouses.filter((w) => w.type === WarehouseType.VEHICLE);
    const jobsForKanban = filteredJobs.filter((j) => j.status !== JobMainStatus.COMPLETE && j.status !== JobMainStatus.CANCELLED);
    return serviceVehicles
      .map((vehicle) => {
        const license = (vehicle as any)?.license_plate || (vehicle as any)?.vehicle?.vehicle_registration || (vehicle as any)?.vehicle_registration;
        return {
          title: license ? `${vehicle.name} (${license})` : vehicle.name,
          id: vehicle.id,
          jobs: jobsForKanban.filter((j) => j.vehicle_id === vehicle.id),
        };
      })
      .filter((v) => v.id);
  }, [filteredJobs, warehouses]);

  const customerMap = useMemo(() => {
    return new Map((initialCustomers || []).map((c) => [c.id, c]));
  }, [initialCustomers]);

  const serviceReports = useMemo(
    () => [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [reports]
  );

  const scheduleJobs = useMemo(
    () => filteredJobs.filter((j) => j.status !== JobMainStatus.COMPLETE && j.status !== JobMainStatus.CANCELLED),
    [filteredJobs]
  );

  const paginatedJobs = scheduleJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedReports = serviceReports.slice((reportCurrentPage - 1) * reportItemsPerPage, reportItemsPerPage * reportItemsPerPage);

  const scheduledJobsForTable = useMemo(() => {
    if (!scheduleVehicleId || !scheduleDate) return [];
    return jobs
      .filter((job) => job.vehicle_id === scheduleVehicleId && new Date(job.start_time).toISOString().substring(0, 10) === scheduleDate)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [jobs, scheduleVehicleId, scheduleDate]);

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };
  const handleReportItemsPerPageChange = (size: number) => {
    setReportItemsPerPage(size);
    setReportCurrentPage(1);
  };

  const handleAssessmentUpdateOnCheckout = (updatedAssessment: Assessment) => {
    onUpdateAssessment(updatedAssessment);
    setIsEditAssessmentModalOpen(false);
    if (jobBeingCheckedOut) {
      const newReport = createAutomaticReport(jobBeingCheckedOut);
      onUpdateJob({
        ...jobBeingCheckedOut,
        status: JobStatus.Completed,
        actual_end_time: new Date().toISOString(),
        service_report: newReport,
      });
    }
    setAssessmentForCheckout(null);
    setJobBeingCheckedOut(null);
  };

  const handleEdit = (job: FieldJob) => {
    setJobToEdit(job);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleViewDetails = (job: FieldJob) => {
    const assessment = job.assessment_id ? (initialAssessments || []).find((a) => a.id === job.assessment_id) : null;
    setSelectedJob(job);
    setSelectedAssessmentForJob(assessment || null);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleWriteReport = (job: FieldJob) => {
    setJobForReport(job);
    setReportFinalStatus(job.status === JobMainStatus.COMPLETE ? JobStatus.Completed : JobStatus.Draft);
    setIsReportModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleCancel = (job: FieldJob) => {
    setJobToCancel(job);
    setIsCancelModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (job: FieldJob) => {
    setJobToDelete(job);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleReportSubmit = async (
    jobId: string,
    reportData: ServiceReport,
    finalStatus: JobStatus,
    quotationId?: string,
    files?: File[]
  ) => {
    try {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;

      const payload = { ...reportData, job_id: jobId, customer_id: job.customer_id };
      const { id, ...dataToSave } = payload;
      let reportId: string | undefined;

      if (job.service_report && job.service_report.id) {
        reportId = job.service_report.id;
        await ServiceReportApi.update(job.service_report.id, dataToSave);
      } else {
        const newReport = await ServiceReportApi.create(dataToSave);
        reportId = newReport.id;
      }

      if (files && files.length > 0 && reportId) {
        await StorageApi.uploadMultiple({
          files: files,
          path: `service-reports/${reportId}/blueprints`,
          entity_type: 'service_report',
          entity_id: reportId,
          provider: 'local',
          type: 'image',
          visibility: 'private',
        });
      }

      if (quotationId && quotationId !== job.quotation_id) {
        await JobApi.update(jobId, { quotation_id: quotationId } as any);
      }

      if (quotationId) {
        const quote = quotations.find((q) => q.id === quotationId);
        if (quote && quote.status === Status.Draft) {
          onUpdateQuotation({ ...quote, status: Status.Sent });
        }
      }

      fetchData();
    } catch (error) {
      console.error('Error submitting service report:', error);
    }
    setIsReportModalOpen(false);
    setJobForReport(null);
  };

  const handleDropdownToggle = (event: React.MouseEvent<HTMLButtonElement>, jobId: string) => {
    event.stopPropagation();
    if (openDropdownId === jobId) {
      setOpenDropdownId(null);
      setSelectedJob(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setSelectedJob(jobs.find((j) => j.id === jobId) || null);
      setOpenDropdownId(jobId);

      const threshold = 220; 
      const isBottom = buttonRect.bottom > window.innerHeight - threshold;

      setDropdownPosition({
        top: buttonRect.bottom,
        left: buttonRect.right,
        isBottom: isBottom
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openDropdownId) return;
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
      if ((event.target as HTMLElement).closest('button[data-job-id]')) return;
      setOpenDropdownId(null);
      setSelectedJob(null);
    };

    const handleScroll = () => {
      if (openDropdownId) {
        setOpenDropdownId(null);
        setSelectedJob(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    }
  }, [openDropdownId]);

  const renderActions = () => {
    if (!selectedJob) return null;
    const { status } = selectedJob;

    const actions: { label: string; icon: React.FC<any>; onClick: () => void; isDanger?: boolean }[] = [
      { label: 'ดูรายละเอียด', icon: EyeIcon, onClick: () => handleViewDetails(selectedJob) },
    ];

    if (status === JobStatus.Planned || status === JobStatus.Pending || status === JobStatus.InProgress || status === JobStatus.Paused) {
      actions.push({ label: 'แก้ไขงาน', icon: PencilIcon, onClick: () => handleEdit(selectedJob) });
    }

    if (status === JobStatus.Completed || status === JobStatus.Draft || status === JobStatus.InProgress || (status as unknown as string) === 'IN_PROGRESS') {
      actions.push({ label: 'แก้ไขรายงานบริการ', icon: DocumentCheckIcon, onClick: () => handleWriteReport(selectedJob) });
    }

    if (status === JobStatus.Planned || status === JobStatus.Pending || status === JobStatus.InProgress) {
      actions.push({ label: 'ยกเลิกงาน', icon: XCircleIcon, onClick: () => handleCancel(selectedJob), isDanger: true });
    }

    if (authUser?.role && [Role.CEO, Role.SUPERADMIN, Role.ADMIN].includes(authUser.role as Role)) {
      actions.push({ label: 'ลบงาน', icon: TrashIcon, onClick: () => handleDelete(selectedJob), isDanger: true });
    }

    return actions.map((action, index) => (
      <a
        key={action.label}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          action.onClick();
        }}
        className={`flex items-center w-full text-left px-4 py-3 text-sm font-medium transition-colors ${action.isDanger ? 'text-red-600 hover:bg-red-50 hover:text-red-700' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
          }`}
        role="menuitem"
      >
        <action.icon className={`mr-3 h-5 w-5 ${action.isDanger ? 'text-red-500' : 'text-slate-400'}`} aria-hidden="true" />
        <span>{action.label}</span>
      </a>
    ));
  };

  const scrollKanban = (direction: 'left' | 'right') => {
    if (kanbanContainerRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      kanbanContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const jobStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayJobs = jobs.filter((j) => {
      const jobDate = new Date(j.start_time);
      jobDate.setHours(0, 0, 0, 0);
      return jobDate.getTime() === today.getTime();
    });
    const inProgressJobs = jobs.filter((j) => {
      const status = String(j.status || j.api_status || '').toUpperCase();
      return status === 'IN_PROGRESS' || status === 'INPROGRESS';
    });
    const pendingJobs = jobs.filter((j) => {
      const status = String(j.status || j.api_status || '').toUpperCase();
      return status === 'PENDING' || status === 'PLANNED';
    });
    return { today: todayJobs.length, inProgress: inProgressJobs.length, pending: pendingJobs.length };
  }, [jobs]);

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
          <div className="flex flex-col items-center bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            <LoadingIcon className="h-12 w-12 text-primary animate-spin mb-3" />
            <p className="text-slate-600 font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 lg:p-8 flex flex-col space-y-6">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ภาคสนาม</h1>
            <p className="mt-1 text-slate-600">จัดการและติดตามงานภาคสนามทั้งหมด</p>
          </div>
          {authUser?.role && [Role.CEO, Role.SUPERADMIN, Role.ADMIN].includes(authUser.role as Role) && (
            <Button onClick={() => setIsAddModalOpen(true)} variant="primary" className="shadow-md shadow-primary/20">
              <PlusIcon className="h-5 w-5 mr-2" />
              สร้างนัดหมาย
            </Button>
          )}
        </div>

        <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <CalendarDaysIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">งานวันนี้</p>
                <p className="text-2xl font-bold text-blue-800">{jobStats.today}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <PlayIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-amber-600 font-medium">กำลังดำเนินการ</p>
                <p className="text-2xl font-bold text-amber-800">{jobStats.inProgress}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <ClipboardDocumentListIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">รอดำเนินการ</p>
                <p className="text-2xl font-bold text-amber-800">{jobStats.pending}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <DocumentCheckIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">รายงานทั้งหมด</p>
                <p className="text-2xl font-bold text-green-800">{serviceReports.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="!p-4 flex-shrink-0">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:min-w-[240px]">
                  <Input
                    type="search"
                    placeholder="ค้นหาทะเบียนรถ, วันที่..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {activeTab === 'schedule' && (
                  <div className="flex items-center gap-2">
                    <TechnicianIcon className="h-4 w-4 text-slate-400 hidden sm:block" />
                    <Select id="technician-filter" value={selectedTechnicianId} onChange={(e) => setSelectedTechnicianId(e.target.value)} className="w-full sm:w-48 text-sm">
                      <option value="all">ช่างทั้งหมด</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>{tech.name}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                {activeTab === 'schedule' && (
                  <div className="flex items-center rounded-lg bg-slate-100 p-1 order-2 lg:order-1">
                    <Button onClick={() => setView('kanban')} variant="ghost" className={`p-2 rounded-md h-auto ${view === 'kanban' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`} title="มุมมอง Kanban">
                      <ViewColumnsIcon className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setView('list')} variant="ghost" className={`p-2 rounded-md h-auto ${view === 'list' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`} title="มุมมองรายการ">
                      <ListBulletIcon className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setView('calendar')} variant="ghost" className={`p-2 rounded-md h-auto ${view === 'calendar' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`} title="มุมมองปฏิทิน">
                      <CalendarDaysIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg order-1 lg:order-2 overflow-x-auto max-w-full">
                  <button onClick={() => setActiveTab('schedule')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'schedule' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>นัดหมาย</button>
                  <button onClick={() => setActiveTab('reports')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'reports' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>รายงาน</button>
                  <button onClick={() => setActiveTab('work-schedule')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'work-schedule' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>ตารางงาน</button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex-1 min-h-0 relative">
          {activeTab === 'schedule' && view === 'kanban' && (
            <div className="flex flex-col relative">
              {kanbanColumns.length > 0 && (
                <>
                  <button onClick={() => scrollKanban('left')} className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white hover:bg-slate-50 rounded-full shadow-lg border border-slate-200 transition-all hover:scale-105">
                    <ChevronLeftIcon className="h-5 w-5 text-slate-600" />
                  </button>
                  <button onClick={() => scrollKanban('right')} className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white hover:bg-slate-50 rounded-full shadow-lg border border-slate-200 transition-all hover:scale-105">
                    <ChevronRightIcon className="h-5 w-5 text-slate-600" />
                  </button>
                </>
              )}
              <div ref={kanbanContainerRef} className="flex gap-4 overflow-x-auto pb-4 px-2 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
                {kanbanColumns.length > 0 ? (
                  kanbanColumns.map((col) => (
                    <div key={col.id} className="bg-slate-100/80 rounded-xl p-4 border border-slate-200 shadow-sm w-80 flex-shrink-0 flex flex-col">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          <h3 className="font-bold text-slate-700 text-sm truncate" title={col.title}>{col.title}</h3>
                        </div>
                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-bold bg-white text-slate-600 shadow-sm border border-slate-200">{col.jobs.length}</span>
                      </div>
                      <div className="space-y-3">
                        {col.jobs.length > 0 ? (
                          col.jobs.map((job) => (
                            <JobCard
                              key={job.id}
                              job={job}
                              onDropdownToggle={handleDropdownToggle}
                              onStatusChange={handleStatusChange}
                              onViewDetails={handleViewDetails}
                              onWriteReport={handleWriteReport}
                              currentUser={currentUser}
                              isAnyJobInProgressForCurrentUser={isAnyJobInProgressForCurrentUser}
                            />
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <p className="text-sm">ไม่มีงาน</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 w-full">
                    <p className="text-lg font-medium">ไม่พบรถให้บริการ</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'schedule' && view === 'list' && (
            <Card className="!p-0 w-full border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-white">
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">ลูกค้า/สถานที่</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">วัน-เวลา</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">บริการ</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">ช่าง</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">สถานะ</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedJobs.length > 0 ? (
                      paginatedJobs.map((job, idx) => (
                        <tr key={job.id} className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-primary font-bold text-sm">{job.customerName?.charAt(0).toUpperCase() || '-'}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{job.customerName || '-'}</p>
                                <p className="text-xs text-slate-500 truncate max-w-[200px]" title={job.address}>{job.address || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-blue-50 rounded-md">
                                <JobDateIcon className="h-4 w-4 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{formatThaiDate(job.start_time)}</p>
                                <p className="text-xs text-slate-500">
                                  {new Date(job.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                  {' - '}
                                  {new Date(job.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600">{job.work_areas.map((wa) => wa.service_package).join(', ') || '-'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <TechnicianIcon className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-600 truncate max-w-[120px]">{job.technicians.map((t) => t.nick_name || t.name).join(', ') || '-'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={job.api_status || job.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Button data-job-id={job.id} onClick={(e) => handleDropdownToggle(e, job.id)} variant="ghost" className="p-2 h-auto rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                              <ManageIcon className="h-5 w-5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <p className="text-lg font-medium text-slate-400">ไม่พบข้อมูลงาน</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {paginatedJobs.length > 0 && (
                <div className="border-t border-slate-100 bg-white">
                  <Pagination currentPage={currentPage} totalItems={scheduleJobs.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={handleItemsPerPageChange} />
                </div>
              )}
            </Card>
          )}

          {activeTab === 'schedule' && view === 'calendar' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <JobCalendar jobs={filteredJobs} onJobClick={handleViewDetails} />
            </div>
          )}

          {activeTab === 'reports' && (
            <Card className="!p-0 w-full border border-slate-200 shadow-sm overflow-visible">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10 bg-white shadow-sm">
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">ลูกค้า/สถานที่</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">วัน-เวลา</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">บริการ</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">ช่าง</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">สถานะ</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedReports.length > 0 ? (
                      paginatedReports.map((report, idx) => {
                        const job = jobs.find((j) => j.id === report.job_id);
                        const reportDate = report.report_date || report.created_at || '';
                        const customerName = report.customer_name || job?.customerName || '-';

                        return (
                          <tr key={report.id} className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                  <DocumentCheckIcon className="h-5 w-5 text-green-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{customerName}</p>
                                  <p className="text-xs text-slate-500 truncate max-w-[200px]" title={job?.address}>{job?.address || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 rounded-md">
                                  <JobDateIcon className="h-4 w-4 text-blue-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{formatThaiDate(reportDate)}</p>
                                  <p className="text-xs text-slate-500">
                                    {report.time_in && report.time_out ? `${report.time_in} - ${report.time_out}` : new Date(reportDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {report.service_types?.length ? (
                                  report.service_types.slice(0, 2).map((type, i) => (
                                    <span key={i} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{type}</span>
                                  ))
                                ) : (
                                  <span className="text-sm text-slate-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <TechnicianIcon className="h-4 w-4 text-slate-400" />
                                <span className="text-sm text-slate-600 truncate max-w-[120px]">
                                  {job?.technicians?.map((t) => t.nick_name || t.name).join(', ') || report.signatures?.technician_name || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={report.status || JobStatus.Draft} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  onClick={async () => { }}
                                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 h-auto"
                                  disabled={loadingPdfId === report.id}
                                >
                                  {loadingPdfId === report.id ? <LoadingIcon className="h-4 w-4 animate-spin" /> : <span className="flex items-center gap-1.5"><EyeIcon className="h-4 w-4" /> ดู PDF</span>}
                                </Button>
                                <Button
                                  onClick={() => { if (job) handleWriteReport(job); }}
                                  variant="ghost"
                                  className="p-2 h-auto rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                >
                                  <ManageIcon className="h-5 w-5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <p className="text-lg font-medium text-slate-400">ไม่พบรายงานบริการ</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {paginatedReports.length > 0 && (
                <div className="border-t border-slate-100 bg-white">
                  <Pagination currentPage={reportCurrentPage} totalItems={serviceReports.length} itemsPerPage={reportItemsPerPage} onPageChange={setReportCurrentPage} onItemsPerPageChange={handleReportItemsPerPageChange} />
                </div>
              )}
            </Card>
          )}

          {activeTab === 'work-schedule' && (
            <Card className="!p-0 w-full border border-slate-200 shadow-sm">
              <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 shrink-0">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 max-w-xs">
                    <label className="block text-sm font-semibold text-slate-700 mb-2"><JobDateIcon className="h-4 w-4 inline-block mr-1.5 text-slate-400" />วันที่</label>
                    <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="bg-white border-slate-200 shadow-sm w-full" />
                  </div>
                  <div className="flex-1 max-w-sm">
                    <label className="block text-sm font-semibold text-slate-700 mb-2"><TechnicianIcon className="h-4 w-4 inline-block mr-1.5 text-slate-400" />ทะเบียนรถ</label>
                    <Select value={scheduleVehicleId} onChange={(e) => setScheduleVehicleId(e.target.value)} className="bg-white border-slate-200 shadow-sm w-full">
                      <option value="">เลือกทะเบียนรถ</option>
                      {warehouses.filter((w) => (w as any).type === 'รถ' || (w as any).type === 'VEHICLE').map((w) => (
                        <option key={w.id} value={w.id}>{(w as any).license_plate} ({w.name})</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {scheduleVehicleId && scheduleDate ? (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider w-20">เวลา</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">ลูกค้า</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">สถานที่</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider w-28">เบอร์โทร</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider w-24">เข้าบริการ</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider w-24">ลายเซ็น</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider w-24">เก็บเงิน</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {scheduledJobsForTable.length > 0 ? (
                        scheduledJobsForTable.map((job, idx) => {
                          const customer = customerMap.get(job.customer_id);
                          const statusUpper = String(job.status || '').toUpperCase();
                          return (
                            <tr key={job.id} className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                              <td className="px-4 py-3 whitespace-nowrap"><span className="text-sm font-semibold">{new Date(job.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span></td>
                              <td className="px-4 py-3"><p className="text-sm font-semibold">{job.customerName || '-'}</p></td>
                              <td className="px-4 py-3"><p className="text-sm text-slate-500 truncate max-w-[200px]">{job.address || '-'}</p></td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">{customer?.primary_phone || '-'}</td>
                              <td className="px-4 py-3 text-center">{statusUpper === 'COMPLETED' ? '✓' : '-'}</td>
                              <td className="px-4 py-3 text-center">{job.service_report?.signatures?.customer ? '✓' : '-'}</td>
                              <td className="px-4 py-3 text-center">-</td>
                              <td className="px-4 py-3 text-sm text-slate-500">{job.remarks || '-'}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400">ไม่มีงานในวันนี้</td></tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-32 text-center text-slate-400">กรุณาเลือกตารางงาน</div>
                )}
              </div>
            </Card>
          )}

          {selectedJob && openDropdownId && dropdownPosition && (
            <div
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: dropdownPosition.isBottom ? 'auto' : dropdownPosition.top + 4,
                bottom: dropdownPosition.isBottom ? window.innerHeight - dropdownPosition.top + 36 : 'auto',
                left: dropdownPosition.left,
              }}
              className="z-[100] w-48 sm:w-52 rounded-2xl shadow-xl bg-white ring-1 ring-black/5 transform -translate-x-full overflow-hidden"
            >
              <div className="py-2" role="menu">
                {renderActions()}
              </div>
            </div>
          )}
        </div>
      </div>

      <AddJobModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} contracts={contracts} onCreateJob={onCreateJob} jobs={jobs} users={users} warehouses={warehouses} />
      <JobDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} job={selectedJob} assessment={selectedAssessmentForJob} warehouses={warehouses} />
      <EditJobModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setJobToEdit(null); }} job={jobToEdit} onUpdateJob={onUpdateJob} jobs={jobs} users={users} warehouses={warehouses} currentUser={currentUser} />
      <CancelJobModal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} job={jobToCancel} onConfirm={handleConfirmCancel} />
      <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} title="ยืนยันการลบงาน" message={jobToDelete ? `ลบงาน ${jobToDelete.customer_name}?` : 'ยืนยันการลบ?'} confirmButtonText="ลบงาน" confirmButtonClass="bg-red-600" />
      <ServiceReportModal isOpen={isReportModalOpen} onClose={() => { setIsReportModalOpen(false); setJobForReport(null); }} job={jobForReport} finalStatus={reportFinalStatus} onSubmit={handleReportSubmit} contracts={contracts} currentUser={currentUser} products={initialProducts} jobs={jobs} />
      <EditAssessmentModal isOpen={isEditAssessmentModalOpen} onClose={() => setIsEditAssessmentModalOpen(false)} assessment={assessmentForCheckout} onUpdateAssessment={handleAssessmentUpdateOnCheckout} products={initialProducts} packages={packages} customers={initialCustomers} categories={categories} />
    </>
  );
};

export default Job;