// ===== React =====
import Swal from 'sweetalert2';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// ===== Absolute Types =====
import {
  FieldJob,
  ServiceReport,
} from '@/src/types/entity/field-job.interface';

import { JobMainStatus, JobStatus, Quotation, WarehouseType } from '@/src/types';

// ===== Relative Types =====
import { User, UserRole } from '../../types/entity/core.interface';
import { Assessment } from '../../types/entity/assessment.interface';
import { Contract } from '../../types/entity/financial.interface';
import { Product } from '../../types/entity/product.interface';
import { Customer } from '../../types/entity/customer.interface';
import { Warehouse } from '../../types/entity/inventory.interface';
import { Role } from '../../types/enums/role';

// ===== Hooks =====
import { useCurrentUser } from '../../hooks/useCurrentUser';

// ===== Components (Features) =====
import { CancelJobModal } from '../../components/features/jobs/CancelJobModal';
import { JobDetailsModal } from '../../components/features/jobs/JobDetailsModal';
import { ServiceReportModal } from '../../components/features/jobs/ServiceReportModal';
import { JobModal } from '@/src/components/features/jobs/JobModal';

// ===== Components (Common) =====
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Select, Input, Button } from '../../components/common/FormControls';

// ===== Local Components =====
import JobCard from './JobCard';
import JobCalendar from './JobCalendar';

// ===== API =====
import {
  JobApi,
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
  ViewColumnsIcon,
  XCircleIcon,
} from '../../assets/icons/Icons';
import { QuotationStatus } from '@/src/types/enums/quotaton';
import dayjs from 'dayjs';
import { formatPhoneNumber } from '@/src/utils/format';

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
  onUpdateQuotation,
  customers: initialCustomers,
  warehouses: initialWarehouses,
}) => {
  const authUser = useCurrentUser();
  const currentUser = authUser as unknown as User;

  // Local state
  const [jobs, setJobs] = useState<FieldJob[]>(initialJobs || []);
  const [unassignedJobs, setUnassignedJobs] = useState<FieldJob[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [unassignedTotal, setUnassignedTotal] = useState(0);
  const [unassignedDateFilter, setUnassignedDateFilter] = useState('');
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(
    Array.isArray(initialWarehouses) ? initialWarehouses : []
  );
  const [isLoading, setIsLoading] = useState(false);

  // Filter States
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('all');
  const [filterDate, setFilterDate] = useState<string>(dayjs().format('YYYY-MM-DD'));


  // Fetch schedule (นัดหมาย + ตารางงาน)
  const fetchSchedule = async (targetDate = filterDate, targetTech = selectedTechnicianId) => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (targetDate) params.appointment_date = targetDate;
      if (targetTech !== 'all') params.technician_id = targetTech;

      const warehousesRes = await VehicleApi.getVehiclesWithUserJobs(params);

      let warehousesData: any[] = [];
      if (Array.isArray((warehousesRes as any).data)) {
        warehousesData = (warehousesRes as any).data;
      } else if (Array.isArray(warehousesRes)) {
        warehousesData = warehousesRes as any[];
      }

      setWarehouses(warehousesData);

      const reportsData = reports;

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
                  ? `${job.primary_technician.first_name} ${job.primary_technician.last_name || ''
                    }`.trim()
                  : job.primary_technician.name,
              });
            }

            if (
              Array.isArray(job.job_team_members) &&
              job.job_team_members.length > 0
            ) {
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

            if (
              techniciansList.length === 0 &&
              Array.isArray(job.technicians) &&
              job.technicians.length > 0
            ) {
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
              appointment_date: job.appointment_date,
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
      console.error('Error fetching schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch unassigned jobs (รอจัดคิว)
  const fetchUnassigned = async (page = unassignedPage, date = unassignedDateFilter) => {
    setIsLoading(true);
    try {
      const params: any = { limit: 10, page };
      if (date) params.appointment_date = date;
      const unassignedJobsRes = await JobApi.getAllUnassigned(params);
      const unassignedJobsData = (unassignedJobsRes.data || []);

      const mapped = unassignedJobsData
        .filter((job: any) => !job.vehicle_id)
        .map((job: any) => {
          const customer = job.customer || {};
          const customerName =
            customer.first_name || customer.last_name
              ? `${customer.first_name || ''}${customer.last_name && customer.last_name !== '-' ? ` ${customer.last_name}` : ''}`.trim()
              : customer.code || '-';
          const address = [
            customer.address_house_no, customer.address_soi, customer.address_road,
            customer.sub_district, customer.district, customer.province, customer.postal_code,
          ].filter(Boolean).join(' ') || '-';

          return {
            api_status: job.status,
            id: job.id,
            assessment_id: job.assessment_id || undefined,
            contract_id: job.contract_id || undefined,
            customer_id: job.customer_id || customer.id,
            customer,
            customerName,
            address,
            appointment_date: job.appointment_date,
            start_time: job.start_date,
            end_time: job.end_date,
            actual_start_time: job.actual_start_time,
            actual_end_time: job.actual_end_time,
            primary_technician: job.primary_technician || null,
            technicians: [],
            work_areas: [],
            status: JobStatus.Planned,
            vehicle_id: null,
            remarks: job.remark,
            invoice_id: job.invoice_id,
            invoice: job.invoice,
          } as any;
        });

      setUnassignedJobs(mapped);
      const total = unassignedJobsRes.meta?.total || mapped.length;
      setUnassignedCount(total);
      setUnassignedTotal(total);
    } catch (error) {
      console.error('Error fetching unassigned:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch reports (รายงาน)
  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const reportsRes = await ServiceReportApi.getAll({ limit: 10 });
      setReports(reportsRes.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Wrapper for backward compat — refresh current tab
  const fetchData = async (targetDate = filterDate, targetTech = selectedTechnicianId) => {
    if (activeTab === 'unassigned') {
      await fetchUnassigned();
    } else if (activeTab === 'reports') {
      await fetchReports();
    } else {
      await fetchSchedule(targetDate, targetTech);
    }
  };


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
        const status =
          newStatus === (JobStatus.Completed as any) ? 'COMPLETE' : 'PENDING';
        await JobApi.update(jobId, { status } as any);
      }
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleConfirmCancel = async (jobId: string, reason: string) => {
    try {
      await JobApi.update(jobId, { status: JobMainStatus.CANCELLED });
      fetchData();
      setIsCancelModalOpen(false);
      setJobToCancel(null);
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };

  const [activeTab, setActiveTab] = useState<'schedule' | 'work-schedule' | 'unassigned' | 'reports'>('schedule');
  const [view, setView] = useState<'list' | 'kanban' | 'calendar'>('kanban');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<any | null>(null);

  const [jobToEdit, setJobToEdit] = useState<any | null>(null);
  const [jobForReport, setJobForReport] = useState<any | null>(null);
  const [reportFinalStatus, setReportFinalStatus] = useState<JobStatus>(JobStatus.Completed);

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

  const [searchQuery, setSearchQuery] = useState('');

  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().substring(0, 10));
  const [scheduleVehicleId, setScheduleVehicleId] = useState('');
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  const technicians = useMemo(
    () =>
      users.filter((user) => {
        const roleName =
          typeof user.role === 'object' && user.role !== null
            ? (user.role as { name: string }).name
            : String(user.role || '');
        return roleName === UserRole.TECH;
      }),
    [users]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTechnicianId, filterDate, searchQuery]);

  const reversedJobs = useMemo(() => [...jobs].reverse(), [jobs]);

  const filteredJobs = useMemo(() => {
    let tempJobs = reversedJobs;
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (lowercasedQuery) {
      tempJobs = tempJobs.filter((job) => {
        const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
        const vehicle = safeWarehouses.find((w: any) => w.id === job.vehicle_id);
        const licensePlate = ((vehicle as any)?.license_plate || (vehicle as any)?.registration_no || (vehicle as any)?.name || '').toLowerCase();
        const customerName = ((job as any).customerName || '').toLowerCase();
        const appointmentDate = formatThaiDate((job as any).appointment_date || job.start_time);

        return licensePlate.includes(lowercasedQuery) ||
          customerName.includes(lowercasedQuery) ||
          appointmentDate.includes(lowercasedQuery);
      });
    }
    return tempJobs;
  }, [reversedJobs, searchQuery, warehouses]);

  const isAnyJobInProgressForCurrentUser = useMemo(() => {
    if (!currentUser || !jobs) return false;
    return jobs.some(
      (j) =>
        j.status === JobMainStatus.IN_PROGRESS &&
        j.technicians?.some((tech) => tech.id === currentUser.id)
    );
  }, [jobs, currentUser]);

  const kanbanColumns = useMemo(() => {
    const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
    const serviceVehicles = safeWarehouses.filter(
      (w) => w.type === WarehouseType.VEHICLE
    );
    const jobsForKanban = filteredJobs.filter(
      (j) =>
        j.status !== JobMainStatus.COMPLETE &&
        j.status !== JobMainStatus.CANCELLED
    );
    return serviceVehicles
      .map((vehicle) => {
        const license =
          (vehicle as any)?.license_plate ||
          (vehicle as any)?.vehicle?.vehicle_registration ||
          (vehicle as any)?.vehicle_registration;
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

  const serviceReports = useMemo(() => {
    let sorted = [...reports].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Filter ตาม searchQuery สำหรับ tab รายงาน
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      sorted = sorted.filter((r: any) => {
        const job = jobs.find((j) => j.id === r.job_id);
        const customerName = (r.customer_name || (job as any)?.customerName || '').toLowerCase();
        const reportDate = formatThaiDate(r.report_date || r.created_at || '');
        const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
        const vehicle = safeWarehouses.find((w: any) => w.id === (job as any)?.vehicle_id);
        const licensePlate = ((vehicle as any)?.license_plate || (vehicle as any)?.registration_no || (vehicle as any)?.name || '').toLowerCase();

        return customerName.includes(q) || reportDate.includes(q) || licensePlate.includes(q);
      });
    }

    return sorted;
  }, [reports, searchQuery, jobs, warehouses]);

  const scheduleJobs = useMemo(
    () =>
      filteredJobs.filter(
        (j) =>
          j.status !== JobMainStatus.COMPLETE &&
          j.status !== JobMainStatus.CANCELLED
      ),
    [filteredJobs]
  );

  const paginatedJobs = scheduleJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const paginatedReports = serviceReports.slice(
    (reportCurrentPage - 1) * reportItemsPerPage,
    reportCurrentPage * reportItemsPerPage
  );

  const scheduledJobsForTable = useMemo(() => {
    if (!scheduleVehicleId || !scheduleDate) return [];
    return jobs
      .filter(
        (job) =>
          job.vehicle_id === scheduleVehicleId &&
          new Date(job.start_time).toISOString().substring(0, 10) === scheduleDate
      )
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

  const handleEdit = (job: FieldJob) => {
    setJobToEdit(job);
    setIsEditModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleViewDetails = (job: FieldJob) => {
    const assessment = job.assessment_id
      ? (initialAssessments || []).find((a) => a.id === job.assessment_id)
      : null;
    setSelectedJob(job);
    setSelectedAssessmentForJob(assessment || null);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleViewPdf = async (reportId: string) => {
    setLoadingPdfId(reportId);
    try {
      const response = await ServiceReportApi.getServiceReportPdfById(reportId);
      const file = new Blob([await response.arrayBuffer()], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    } catch (error) {
      console.error('Error viewing PDF:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเปิด PDF ได้ในขณะนี้' });
    } finally {
      setLoadingPdfId(null);
    }
  };

  const handleWriteReport = async (job: FieldJob) => {
    setOpenDropdownId(null);

    if (job.service_report && job.service_report.id) {
      setIsLoading(true);
      try {
        const fullReport = await ServiceReportApi.getById(job.service_report.id);
        const updatedJob = { ...job, service_report: fullReport };
        setJobForReport(updatedJob);
      } catch (error) {
        console.error('Error fetching full service report details:', error);
        setJobForReport(job);
      } finally {
        setIsLoading(false);
      }
    } else {
      setJobForReport(job);
    }

    setReportFinalStatus(
      job.status === JobMainStatus.COMPLETE ? JobStatus.Completed : JobStatus.Draft
    );
    setIsReportModalOpen(true);
  };

  const handleCancel = (job: FieldJob) => {
    setJobToCancel(job);
    setIsCancelModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleReportSubmit = async (
    jobId: string,
    reportData: ServiceReport,
    finalStatus: JobStatus,
    quotationId?: string,
    files?: File[],
    paymentSlip?: File | null,
  ) => {
    try {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;

      let paymentSlipFileId: string | undefined;
      let blueprintFileId: string | undefined;

      if (paymentSlip) {
        const uploadedSlip = await StorageApi.upload({
          file: paymentSlip,
          path: `jobs/${jobId}/payment-slips`,
          provider: 'local',
          type: 'image',
          visibility: 'private',
        });
        paymentSlipFileId = uploadedSlip.id;
      }

      if (files && files.length > 0) {
        const uploadedBlueprints = await StorageApi.uploadMultiple({
          files: files,
          path: `jobs/${jobId}/blueprints`,
          provider: 'local',
          type: 'image',
          visibility: 'private',
        });
        blueprintFileId = uploadedBlueprints.map((f) => f.id).join(',');
      }

      const payload = {
        ...reportData,
        job_id: jobId,
        customer_id: job.customer_id,
        payment_slip_file_id: paymentSlipFileId,
        blueprint_file_id: blueprintFileId,
      };

      const { id, ...dataToSave } = payload;

      if (job.service_report && job.service_report.id) {
        await ServiceReportApi.update(job.service_report.id, dataToSave);
      } else {
        await ServiceReportApi.create(dataToSave as any);
      }

      if (quotationId && quotationId !== job.quotation_id) {
        await JobApi.update(jobId, { quotation_id: quotationId } as any);
      }

      if (quotationId) {
        const quote = quotations.find((q) => q.id === quotationId);
        if (quote && quote.status === QuotationStatus.DRAFT) {
          onUpdateQuotation({ ...quote });
        }
      }

      fetchData();
    } catch (error) {
      console.error('Error submitting service report:', error);
    } finally {
      setIsReportModalOpen(false);
      setJobForReport(null);
    }
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    jobId: string
  ) => {
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
        isBottom: isBottom,
      });
    }
  };

  // Initial load: fetch schedule + unassigned count
  useEffect(() => {
    fetchSchedule(filterDate, selectedTechnicianId);
    // Fetch unassigned count for badge (lightweight API)
    JobApi.getUnassignedCount().then((count) => {
      setUnassignedCount(count);
    }).catch(() => {});
  }, [filterDate, selectedTechnicianId]);

  // Fetch when tab changes
  useEffect(() => {
    if (activeTab === 'unassigned') {
      setUnassignedPage(1);
      fetchUnassigned(1, unassignedDateFilter);
    } else if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

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
    };
  }, [openDropdownId]);

  const renderActions = () => {
    if (!selectedJob) return null;
    const { status } = selectedJob;

    const actions: {
      label: string;
      icon: React.FC<any>;
      onClick: () => void;
      isDanger?: boolean;
    }[] = [
        { label: 'ดูรายละเอียด', icon: EyeIcon, onClick: () => handleViewDetails(selectedJob) },
      ];

    if (
      status === JobStatus.Planned ||
      status === JobStatus.Pending ||
      status === JobStatus.InProgress ||
      status === JobStatus.Paused
    ) {
      actions.push({ label: 'แก้ไขงาน', icon: PencilIcon, onClick: () => handleEdit(selectedJob) });
    }

    if (
      status === JobStatus.Completed ||
      status === JobStatus.Draft ||
      status === JobStatus.InProgress ||
      (status as unknown as string) === 'IN_PROGRESS'
    ) {
      actions.push({
        label: 'แก้ไขรายงานบริการ',
        icon: DocumentCheckIcon,
        onClick: () => handleWriteReport(selectedJob),
      });
    }

    if (
      status === JobStatus.Planned ||
      status === JobStatus.Pending ||
      status === JobStatus.InProgress
    ) {
      actions.push({
        label: 'ยกเลิกงาน',
        icon: XCircleIcon,
        onClick: () => handleCancel(selectedJob),
        isDanger: true,
      });
    }

    return actions.map((action) => (
      <a
        key={action.label}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          action.onClick();
        }}
        className={`flex items-center w-full text-left px-4 py-3 text-sm font-medium transition-colors ${action.isDanger
          ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
          }`}
        role="menuitem"
      >
        <action.icon
          className={`mr-3 h-5 w-5 ${action.isDanger ? 'text-red-500' : 'text-slate-400'}`}
          aria-hidden="true"
        />
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
    return {
      today: todayJobs.length,
      inProgress: inProgressJobs.length,
      pending: pendingJobs.length,
    };
  }, [jobs]);

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col space-y-6">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ภาคสนาม</h1>
            <p className="mt-1 text-slate-600">จัดการและติดตามงานภาคสนามทั้งหมด</p>
          </div>
          {authUser?.role &&
            [Role.CEO, Role.SUPERADMIN, Role.ADMIN].includes(authUser.role as Role) && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                variant="primary"
                className="shadow-md shadow-primary/20"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                สร้างนัดหมาย
              </Button>
            )}
        </div>

        <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                {activeTab === 'unassigned' && (
                  <div className="flex items-center gap-2">
                    <DatePicker
                      selected={unassignedDateFilter ? new Date(unassignedDateFilter) : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const yyyy = date.getFullYear();
                          const mm = String(date.getMonth() + 1).padStart(2, '0');
                          const dd = String(date.getDate()).padStart(2, '0');
                          const formatted = `${yyyy}-${mm}-${dd}`;
                          setUnassignedDateFilter(formatted);
                          setUnassignedPage(1);
                          fetchUnassigned(1, formatted);
                        } else {
                          setUnassignedDateFilter('');
                          setUnassignedPage(1);
                          fetchUnassigned(1, '');
                        }
                      }}
                      placeholderText="เลือกวันที่"
                      dateFormat="dd/MM/yyyy"
                      locale="th"
                      isClearable
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10 sm:min-w-[160px]"
                      wrapperClassName="w-full sm:w-auto"
                    />
                  </div>
                )}
                {activeTab === 'schedule' && (
                  <div className="flex items-center gap-2">
                    <DatePicker
                      selected={filterDate ? new Date(filterDate) : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const yyyy = date.getFullYear();
                          const mm = String(date.getMonth() + 1).padStart(2, '0');
                          const dd = String(date.getDate()).padStart(2, '0');
                          const formattedDate = `${yyyy}-${mm}-${dd}`;
                          setFilterDate(formattedDate);
                          fetchData(formattedDate, selectedTechnicianId);
                        } else {
                          setFilterDate('');
                          fetchData('', selectedTechnicianId);
                        }
                      }}
                      placeholderText="เลือกวันที่"
                      dateFormat="dd/MM/yyyy"
                      locale="th"
                      isClearable
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10 sm:min-w-[160px]"
                      wrapperClassName="w-full sm:w-auto"
                    />
                    <Select
                      id="technician-filter"
                      value={selectedTechnicianId}
                      onChange={(e) => {
                        const newTech = e.target.value;
                        setSelectedTechnicianId(newTech);
                        fetchData(filterDate, newTech);
                      }}
                      className="w-full sm:w-48 text-sm"
                    >
                      <option value="all">ช่างทั้งหมด</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                {activeTab === 'schedule' && (
                  <div className="flex items-center rounded-lg bg-slate-100 p-1 order-2 lg:order-1">
                    <Button
                      onClick={() => setView('kanban')}
                      variant="ghost"
                      className={`p-2 rounded-md h-auto ${view === 'kanban' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'
                        }`}
                      title="มุมมอง Kanban"
                    >
                      <ViewColumnsIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setView('list')}
                      variant="ghost"
                      className={`p-2 rounded-md h-auto ${view === 'list' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'
                        }`}
                      title="มุมมองรายการ"
                    >
                      <ListBulletIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setView('calendar')}
                      variant="ghost"
                      className={`p-2 rounded-md h-auto ${view === 'calendar' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'
                        }`}
                      title="มุมมองปฏิทิน"
                    >
                      <CalendarDaysIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg order-1 lg:order-2 overflow-x-auto max-w-full">
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'schedule'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    นัดหมาย
                  </button>

                  {currentUser?.role && ![UserRole.LEAD_TECH, UserRole.TECH].includes(currentUser.role as UserRole) && (
                    <button
                      onClick={() => setActiveTab('unassigned')}
                      className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'unassigned' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      รอจัดคิว
                      {unassignedCount > 0 && (
                        <span className="ml-1.5 bg-amber-100 text-amber-700 py-0.5 px-1.5 rounded-full text-xs">
                          {unassignedCount}
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'reports'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    รายงาน
                  </button>

                  <button
                    onClick={() => setActiveTab('work-schedule')}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'work-schedule'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    ตารางงาน
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex-1 min-h-0 relative">
          {isLoading && (
            <div className="absolute inset-0 z-[200] bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl">
              <LoadingIcon className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-base font-medium text-slate-500">กำลังโหลดข้อมูลภาคสนาม...</p>
            </div>
          )}

          {activeTab === 'schedule' && view === 'kanban' && (
            <div className="flex flex-col relative">
              {kanbanColumns.length > 0 && (
                <>
                  <button
                    onClick={() => scrollKanban('left')}
                    className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white hover:bg-slate-50 rounded-full shadow-lg border border-slate-200 transition-all hover:scale-105"
                  >
                    <ChevronLeftIcon className="h-5 w-5 text-slate-600" />
                  </button>
                  <button
                    onClick={() => scrollKanban('right')}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white hover:bg-slate-50 rounded-full shadow-lg border border-slate-200 transition-all hover:scale-105"
                  >
                    <ChevronRightIcon className="h-5 w-5 text-slate-600" />
                  </button>
                </>
              )}
              <div
                ref={kanbanContainerRef}
                className="flex gap-4 overflow-x-auto pb-4 px-2 scroll-smooth"
                style={{ scrollbarWidth: 'thin' }}
              >
                {kanbanColumns.length > 0 ? (
                  kanbanColumns.map((col) => (
                    <div
                      key={col.id}
                      className="bg-slate-100/80 rounded-xl p-4 border border-slate-200 shadow-sm w-80 flex-shrink-0 flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          <h3
                            className="font-bold text-slate-700 text-sm truncate"
                            title={col.title}
                          >
                            {col.title}
                          </h3>
                        </div>
                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-bold bg-white text-slate-600 shadow-sm border border-slate-200">
                          {col.jobs.length}
                        </span>
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
                              onEditJob={handleEdit}
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

          {activeTab === 'unassigned' && (
            <Card className="!p-0 w-full border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full">
                  <thead className="bg-white">
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">ลูกค้า</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">เบอร์โทรศัพท์</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">วันนัดหมาย</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">สถานะ</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {unassignedJobs.length > 0 ? (
                      unassignedJobs.map((job, idx) => (
                        <tr key={job.id} className={`hover:bg-amber-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <p className="text-sm font-semibold text-slate-800">{job.customer?.first_name || '-'} {job.customer?.last_name || '-'}</p>
                          </td>
                           <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="text-sm text-slate-700">{formatPhoneNumber(job.customer?.primary_phone || '-')}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="text-sm text-slate-700">{formatThaiDate(job.start_time)}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="px-2 py-1 bg-amber-100 text-slate-600 text-xs font-bold rounded-full">รอจัดคิว</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="primary"
                              className="text-xs py-1.5 px-3"
                              onClick={() => handleEdit(job)}
                            >
                              จัดคิวงาน
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <p className="text-lg font-medium">ไม่มีงานค้างรอจัดคิว</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {unassignedTotal > 10 && (
                <div className="border-t border-slate-200">
                  <Pagination
                    currentPage={unassignedPage}
                    itemsPerPage={10}
                    totalItems={unassignedTotal}
                    onPageChange={(page) => {
                      setUnassignedPage(page);
                      fetchUnassigned(page, unassignedDateFilter);
                    }}
                    onItemsPerPageChange={() => {}}
                  />
                </div>
              )}
            </Card>
          )}

          {activeTab === 'schedule' && view === 'list' && (
            <Card className="!p-0 w-full border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full">
                  <thead className="bg-white">
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        ลูกค้า/สถานที่
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        วัน-เวลา
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        บริการ
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        ช่าง
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedJobs.length > 0 ? (
                      paginatedJobs.map((job, idx) => (
                        <tr
                          key={job.id}
                          className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                            }`}
                        >
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-primary font-bold text-sm">
                                  {job.customerName?.charAt(0).toUpperCase() || '-'}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {job.customerName || '-'}
                                </p>
                                <p
                                  className="text-xs text-slate-500 truncate max-w-[200px]"
                                  title={job.address}
                                >
                                  {job.address || '-'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-blue-50 rounded-md">
                                <JobDateIcon className="h-4 w-4 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {formatThaiDate(job.start_time)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(job.start_time).toLocaleTimeString('th-TH', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                  {' - '}
                                  {new Date(job.end_time).toLocaleTimeString('th-TH', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="text-sm text-slate-600">
                              {(job.work_areas || []).map((wa) => wa.service_package).join(', ') || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <div className="flex items-center gap-2">
                              <TechnicianIcon className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-600 truncate max-w-[120px]">
                                {(job.technicians || []).map((t) => t.nick_name || t.name).join(', ') || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            <StatusBadge status={job.api_status || job.status} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-right">
                            <Button
                              data-job-id={job.id}
                              onClick={(e) => handleDropdownToggle(e, job.id)}
                              variant="ghost"
                              className="p-2 h-auto rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            >
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
                  <Pagination
                    currentPage={currentPage}
                    totalItems={scheduleJobs.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={handleItemsPerPageChange}
                  />
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
                <table className="min-w-[800px] w-full">
                  <thead className="sticky top-0 z-10 bg-white shadow-sm">
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        ลูกค้า/สถานที่
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        วัน-เวลา
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        บริการ
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        ช่าง
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedReports.length > 0 ? (
                      paginatedReports.map((report, idx) => {
                        const job = jobs.find((j) => j.id === report.job_id);
                        const reportDate = report.report_date || report.created_at || '';
                        const customerName = report.customer_name || job?.customerName || '-';

                        return (
                          <tr
                            key={report.id}
                            className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                              }`}
                          >
                            <td className="px-4 py-3 text-sm text-slate-700">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                  <DocumentCheckIcon className="h-5 w-5 text-green-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {customerName}
                                  </p>
                                  <p
                                    className="text-xs text-slate-500 truncate max-w-[200px]"
                                    title={job?.address}
                                  >
                                    {job?.address || '-'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 rounded-md">
                                  <JobDateIcon className="h-4 w-4 text-blue-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-800">
                                    {formatThaiDate(reportDate)}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {report.time_in && report.time_out
                                      ? `${report.time_in} - ${report.time_out}`
                                      : new Date(reportDate).toLocaleTimeString('th-TH', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              <div className="flex flex-wrap gap-1">
                                {report.service_types?.length ? (
                                  report.service_types.slice(0, 2).map((type, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
                                    >
                                      {type}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm text-slate-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              <div className="flex items-center gap-2">
                                <TechnicianIcon className="h-4 w-4 text-slate-400" />
                                <span className="text-sm text-slate-600 truncate max-w-[120px]">
                                  {job?.technicians
                                    ?.map((t) => t.nick_name || t.name)
                                    .join(', ') ||
                                    report.signatures?.technician_name ||
                                    '-'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                              <StatusBadge status={report.status || JobStatus.Draft} />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  onClick={() => handleViewPdf(report.id)}
                                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 h-auto"
                                  disabled={loadingPdfId === report.id}
                                >
                                  {loadingPdfId === report.id ? (
                                    <span className="flex items-center gap-2">
                                      <LoadingIcon className="w-3.5 h-3.5 animate-spin shrink-0 text-white" />
                                      <span>กำลังโหลด...</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-2">
                                      <EyeIcon className="w-3.5 h-3.5 shrink-0" />
                                      <span>ดู PDF</span>
                                    </span>
                                  )}
                                </Button>
                                <Button
                                  onClick={() => {
                                    if (job) handleWriteReport(job);
                                  }}
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
                          <p className="text-lg font-medium text-slate-400">
                            ไม่พบรายงานบริการ
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {paginatedReports.length > 0 && (
                <div className="border-t border-slate-100 bg-white">
                  <Pagination
                    currentPage={reportCurrentPage}
                    totalItems={serviceReports.length}
                    itemsPerPage={reportItemsPerPage}
                    onPageChange={setReportCurrentPage}
                    onItemsPerPageChange={handleReportItemsPerPageChange}
                  />
                </div>
              )}
            </Card>
          )}

          {activeTab === 'work-schedule' && (
            <Card className="!p-0 w-full border border-slate-200 shadow-sm">
              <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 shrink-0">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 max-w-xs">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <JobDateIcon className="h-4 w-4 inline-block mr-1.5 text-slate-400" />
                      วันที่
                    </label>
                    <DatePicker selected={scheduleDate ? new Date(scheduleDate) : null} onChange={(date: Date | null) => setScheduleDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="dd/mm/yyyy" isClearable className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-full" />
                  </div>
                  <div className="flex-1 max-w-sm">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <TechnicianIcon className="h-4 w-4 inline-block mr-1.5 text-slate-400" />
                      ทะเบียนรถ
                    </label>
                    <Select
                      value={scheduleVehicleId}
                      onChange={(e) => setScheduleVehicleId(e.target.value)}
                      className="bg-white border-slate-200 shadow-sm w-full"
                    >
                      <option value="">เลือกทะเบียนรถ</option>
                      {warehouses
                        .filter(
                          (w) =>
                            (w as any).type === 'รถ' ||
                            (w as any).type === 'VEHICLE'
                        )
                        .map((w) => (
                          <option key={w.id} value={w.id}>
                            {(w as any).license_plate} ({w.name})
                          </option>
                        ))}
                    </Select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {scheduleVehicleId && scheduleDate ? (
                  <table className="min-w-[800px] w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider w-20">
                          เวลา
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          ลูกค้า
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          สถานที่
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider w-28">
                          เบอร์โทร
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-24">
                          เข้าบริการ
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-24">
                          ลายเซ็น
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-24">
                          เก็บเงิน
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          หมายเหตุ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {scheduledJobsForTable.length > 0 ? (
                        scheduledJobsForTable.map((job, idx) => {
                          const customer = customerMap.get(job.customer_id);
                          const statusUpper = String(job.status || '').toUpperCase();
                          return (
                            <tr
                              key={job.id}
                              className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                                }`}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm font-semibold">
                                  {new Date(job.start_time).toLocaleTimeString('th-TH', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm font-semibold">
                                  {job.customerName || '-'}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-slate-500 truncate max-w-[200px]">
                                  {job.address || '-'}
                                </p>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {customer?.primary_phone || '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {statusUpper === 'COMPLETED' ? '✓' : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {job.service_report?.signatures?.customer ? '✓' : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">-</td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {job.remarks || '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                            ไม่มีงานในวันนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-32 text-center text-slate-400">
                    กรุณาเลือกตารางงาน
                  </div>
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
                bottom: dropdownPosition.isBottom
                  ? window.innerHeight - dropdownPosition.top + 36
                  : 'auto',
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

      <JobModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        mode="add"
        onSubmitJob={handleCreateJob}
        jobs={jobs}
        users={users}
        warehouses={warehouses}
        contracts={contracts}
        currentUserRole={currentUser.role}
      />

      <JobModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setJobToEdit(null);
        }}
        mode="edit"
        jobToEdit={jobToEdit}
        onSubmitJob={handleUpdateJob}
        jobs={jobs}
        users={users}
        warehouses={warehouses}
        contracts={contracts}
        currentUserRole={currentUser.role}
      />

      <JobDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        job={selectedJob}
        assessment={selectedAssessmentForJob}
        warehouses={warehouses}
      />

      <CancelJobModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        job={jobToCancel}
        onConfirm={handleConfirmCancel}
      />

      <ServiceReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setJobForReport(null);
        }}
        job={jobForReport}
        finalStatus={reportFinalStatus}
        onSubmit={handleReportSubmit}
        contracts={contracts}
        currentUser={currentUser}
        products={initialProducts}
        jobs={jobs}
      />
    </>
  );
};

export default Job;