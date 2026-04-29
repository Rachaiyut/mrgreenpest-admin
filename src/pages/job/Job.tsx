// ===== React =====
import Swal from 'sweetalert2';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import DatePicker from '@/src/components/common/BuddhistDatePicker';

// ===== Absolute Types =====
import {
  FieldJob,
  ServiceReport,
} from '@/src/types/entity/service-report.interface';

import { JobMainStatus, JobStatus, Quotation, WarehouseType } from '@/src/types';
import { DailyJobClosure, CloseDailyJobClosurePayload } from '@/src/types/entity/daily-closure.interface';

// ===== Relative Types =====
import { User } from '../../types/entity/core.interface';
import { Assessment } from '../../types/entity/assessment.interface';
import { Contract } from '../../types/entity/financial.interface';
import { Job as JobEntity } from '../../types/entity/job.interface';
import { Product } from '../../types/entity/product.interface';
import { Customer } from '../../types/entity/customer.interface';
import { Warehouse } from '../../types/entity/inventory.interface';
import { isFieldRole, isManagementRole, isExecutiveRole } from '../../utils/role';
import { Role } from '../../types/enums/role';

// ===== Hooks =====
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { usePermissions } from '../../hooks/usePermissions';
import { useNotificationFocus } from '../../hooks/useNotificationFocus';

// ===== Utils =====
import { renderApprovalDetails, joinName, pickName } from '../../utils/approvalSwal';

// ===== Components (Features) =====
import { CancelJobModal } from '../../components/features/jobs/CancelJobModal';
import { JobDetailsModal } from '../../components/features/jobs/JobDetailsModal';
import { ServiceReportModal } from '../../components/features/jobs/ServiceReportModal';
import { JobModal } from '@/src/components/features/jobs/JobModal';
import { DailyClosureCloseModal } from '../../components/features/daily-closures/DailyClosureCloseModal';
import { VehicleSelectModal } from '../../components/features/daily-closures/VehicleSelectModal';
import { IssueSummaryModal } from '../../components/features/inventory/issue-summary/IssueSummaryModal';

// ===== Components (Common) =====
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { JobStatusLabel } from '@/src/types/enums/job';
import { Select, Input, Button } from '../../components/common/FormControls';
import { SearchableSelect } from '../../components/common/SearchableSelect';

// ===== Local Components =====
import JobCard from './JobCard';
import JobCalendar from './JobCalendar';
import JobKanbanBoard from './JobKanbanBoard';

// ===== API =====
import {
  JobApi,
  ServiceReportApi,
  StorageApi,
  VehicleApi,
} from '@/src/api';
import { DailyClosureApi } from '@/src/api/daily-closure';
import { StockIssueSummaryApi } from '@/src/api/stock-issue-summary';

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
  CheckCircleIcon,
  TrashIcon,
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
  const { hasPermission } = usePermissions();

  // Local state
  const [jobs, setJobs] = useState<FieldJob[]>(initialJobs || []);
  const [unassignedJobs, setUnassignedJobs] = useState<FieldJob[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [unassignedItemsPerPage, setUnassignedItemsPerPage] = useState(10);
  const [unassignedTotal, setUnassignedTotal] = useState(0);
  const [unassignedDateFilter, setUnassignedDateFilter] = useState('');
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(
    Array.isArray(initialWarehouses) ? initialWarehouses : []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('all');
  const [allVehicles, setAllVehicles] = useState<any[]>([]);

  // Filter States
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('all');
  const [filterDate, setFilterDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');


  // Fetch schedule (นัดหมาย + ตารางงาน)
  const fetchSchedule = async (targetDate = filterDate, targetTech = selectedTechnicianId, search = searchQuery, vehicleId = selectedVehicleId, statusFilter = selectedStatusFilter) => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (targetDate) params.appointment_date = targetDate;
      if (search?.trim()) params.search = search.trim();
      if (vehicleId && vehicleId !== 'all') params.vehicle_id = vehicleId;
      if (targetTech !== 'all') params.technician_id = targetTech;
      if (statusFilter && statusFilter !== 'all') params.statuses = statusFilter;

      const warehousesRes = await VehicleApi.getVehiclesWithUserJobs(params);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let warehousesData: any[] = [];
      const wRes = warehousesRes as unknown as Record<string, unknown>;
      if (Array.isArray(wRes.data)) {
        warehousesData = wRes.data;
      } else if (Array.isArray(warehousesRes)) {
        warehousesData = warehousesRes as unknown[];
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
              statusUpper === 'PENDING_APPROVAL'
                ? JobStatus.PendingApproval
                : statusUpper === 'REJECTED'
                  ? JobStatus.Rejected
                  : statusUpper === 'PENDING'
                    ? JobStatus.Pending
                    : statusUpper === 'IN_PROGRESS' || statusUpper === 'INPROGRESS'
                      ? JobStatus.InProgress
                      : statusUpper === 'COMPLETED' || statusUpper === 'COMPLETE' || statusUpper === 'WAITING_CLEAR'
                        ? JobStatus.Completed
                        : statusUpper === 'CANCELLED'
                          ? JobStatus.Cancelled
                          : JobStatus.Planned;

            const techniciansList = [];
            if (job.primary_technician) {
              techniciansList.push({
                ...job.primary_technician,
                role_type: 'FIELD_LEAD',
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
                  role_type: 'FIELD_TECH',
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
              code: job.code || '',
              assessment_id: job.assessment_id || undefined,
              contract_id: job.contract_id || undefined,
              customer_id: job.customer_id || customer.id,
              customer: customer,
              customerName: customerName,
              address,
              google_map_link: customer.google_map_link || job.google_map_link || '',
              zone: customer.service_area || job.zone || '',
              group: customer.service_group || job.group || '',
              road_line: customer.road_line || job.road_line || '',
              sequence: customer.sequence_no || job.sequence || '',
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
              service_report: job.service_report || reportsData.find((r) => r.job_id === job.id),
              remarks: job.remark,
              operation_details: job.operation_details,
              rejection_reason: job.rejection_reason,
              created_by: job.created_by,
              invoice_id: job.invoice_id,
              invoice: job.invoice,
            } as unknown as FieldJob;
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
  const fetchUnassigned = async (page = unassignedPage, date = unassignedDateFilter, search = unassignedSearch) => {
    setIsLoading(true);
    try {
      const params: any = {
        limit: unassignedItemsPerPage,
        page,
        sort_by: 'appointment_date',
        sort_order: 'ASC',
      };
      if (date) params.appointment_date = date;
      if (search) params.search = search;
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
            operation_details: job.operation_details,
            rejection_reason: job.rejection_reason,
            created_by: job.created_by,
            invoice_id: job.invoice_id,
            invoice: job.invoice,
          } as unknown as FieldJob;
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

  // Fetch approval jobs — เรียก /vehicles/jobs?statuses=PENDING_APPROVAL,REJECTED แบ่งกลุ่มตามรถ
  const fetchApproval = async (targetDate = filterDate) => {
    setIsLoading(true);
    try {
      const params: any = {
        statuses: `${JobMainStatus.PENDING_APPROVAL},${JobMainStatus.REJECTED}`,
      };
      if (targetDate) params.appointment_date = targetDate;

      const res = await VehicleApi.getVehiclesWithUserJobs(params);
      const warehousesData: any[] = Array.isArray((res as any)?.data)
        ? ((res as any).data as any[])
        : Array.isArray(res)
          ? (res as any[])
          : [];

      setApprovalWarehouses(warehousesData);

      const mapped: FieldJob[] = warehousesData.flatMap((warehouse: any) =>
        (warehouse.jobs || []).map((job: any) => {
          const customer = job.customer || {};
          const customerName =
            customer.first_name || customer.last_name
              ? `${customer.first_name || ''}${customer.last_name && customer.last_name !== '-' ? ` ${customer.last_name}` : ''}`.trim()
              : customer.code || '';
          const address = [
            customer.address_house_no, customer.address_soi, customer.address_road,
            customer.sub_district, customer.district, customer.province, customer.postal_code,
          ].filter(Boolean).join(' ');
          const rawStatus = String(job.status || '');
          const statusUpper = rawStatus.toUpperCase();
          const mappedStatus =
            statusUpper === 'PENDING_APPROVAL' ? JobStatus.PendingApproval :
            statusUpper === 'REJECTED' ? JobStatus.Rejected : JobStatus.Planned;

          const techniciansList: any[] = [];
          if (job.primary_technician) {
            techniciansList.push({
              ...job.primary_technician,
              role_type: 'FIELD_LEAD',
              name: job.primary_technician.first_name
                ? `${job.primary_technician.first_name} ${job.primary_technician.last_name || ''}`.trim()
                : job.primary_technician.name,
            });
          }
          if (Array.isArray(job.job_team_members) && job.job_team_members.length > 0) {
            const teamMembers = job.job_team_members.filter(
              (t: any) => t.id !== job.primary_technician?.id,
            );
            techniciansList.push(
              ...teamMembers.map((t: any) => ({
                ...t,
                role_type: 'FIELD_TECH',
                name: t.first_name ? `${t.first_name} ${t.last_name || ''}`.trim() : t.name,
              })),
            );
          }

          return {
            api_status: rawStatus,
            id: job.id,
            code: job.code || '',
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
            technicians: techniciansList,
            work_areas: [],
            status: mappedStatus,
            vehicle_id: warehouse.id,
            remarks: job.remark,
            operation_details: job.operation_details,
            rejection_reason: job.rejection_reason,
            created_by: job.created_by,
          } as unknown as FieldJob;
        }),
      );

      setApprovalJobs(mapped);
      const pendingCount = mapped.filter(
        (j) => String((j as any).api_status || '').toUpperCase() === 'PENDING_APPROVAL',
      ).length;
      setApprovalCount(pendingCount);
    } catch (error) {
      console.error('Error fetching approval jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch reports (รายงาน)
  const fetchReports = async (page = reportCurrentPage) => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { limit: reportItemsPerPage, page };
      // Field roles see only their own reports
      if (isFieldRole(authUser?.roleType) && authUser?.id) {
        params.technician_id = authUser.id;
      }
      const reportsRes = await ServiceReportApi.getAll(params);
      setReports(reportsRes.data || []);
      setReportTotal(reportsRes.meta?.total || (reportsRes.data || []).length);
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
    } else if (activeTab === 'approval') {
      await fetchApproval();
    } else if (activeTab === 'reports') {
      await fetchReports();
    } else {
      await fetchSchedule(targetDate, targetTech);
    }
  };


  const handleCreateJob = async (newJob: Omit<FieldJob, 'id'>) => {
    try {
      await JobApi.create(newJob as unknown as Omit<JobEntity, 'id'>);
      fetchData();
      setIsAddModalOpen(false);
    } catch (error) {
      const errData = (error as { response?: { data?: { message?: unknown; code?: string } } })
        ?.response?.data;
      const errMsg = typeof errData?.message === 'object'
        ? (errData.message as { message?: string; code?: string })
        : { message: errData?.message as string | undefined, code: errData?.code };

      if (errMsg?.code === 'DUPLICATE_ASSESSMENT_JOB') {
        const result = await Swal.fire({
          icon: 'info',
          title: 'ใบประเมินนี้มีงานอยู่แล้ว',
          html:
            '<div style="line-height:1.7; font-size:0.95rem;">' +
            'ระบบพบว่าใบประเมินนี้ถูกสร้างงานไปแล้ว<br/>' +
            'กรุณาไปที่แท็บ <strong>"จัดคิว"</strong> เพื่อจัดคิวงานเดิมแทน' +
            '</div>',
          showCancelButton: true,
          confirmButtonText: 'ไปที่แท็บจัดคิว',
          cancelButtonText: 'ปิด',
          reverseButtons: true,
        });
        if (result.isConfirmed) {
          setIsAddModalOpen(false);
          setActiveTab('unassigned');
        }
        return;
      }

      console.error('Error creating job:', error);
      Swal.fire('เกิดข้อผิดพลาด', errMsg?.message || 'ไม่สามารถสร้างงานได้', 'error');
    }
  };

  const handleUpdateJob = async (updatedJob: any) => {
    try {
      if (updatedJob.id) {
        const { id, ...data } = updatedJob;
        await JobApi.update(id, data as Partial<JobEntity>);
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
        const status = 'PENDING';
        await JobApi.update(jobId, { status } as Partial<JobEntity>);
      }
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleApproveJob = async (jobId: string) => {
    try {
      await JobApi.approve(jobId);
      fetchData();
      Swal.fire({ icon: 'success', title: 'อนุมัติแล้ว', timer: 1500, showConfirmButton: false });
    } catch (error) {
      const errMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', errMsg || 'ไม่สามารถอนุมัติงานได้', 'error');
    }
  };

  const handleRejectJob = async (jobId: string, reason: string) => {
    try {
      await JobApi.reject(jobId, reason);
      fetchData();
      Swal.fire({ icon: 'success', title: 'ปฏิเสธแล้ว', timer: 1500, showConfirmButton: false });
    } catch (error) {
      const errMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', errMsg || 'ไม่สามารถปฏิเสธงานได้', 'error');
    }
  };

  // Auto-trigger approval flow when navigating from a notification click
  useNotificationFocus('approve', true, async (focusId) => {
    let target: any = jobs.find((j) => j.id === focusId);
    if (!target) {
      try {
        const res: any = await JobApi.getById(focusId);
        // API client wraps responses in { status, success, data, timestamp }
        target = res?.data && !res?.id ? res.data : res;
      } catch {
        Swal.fire('ไม่พบข้อมูลงาน', 'งานนี้อาจถูกลบหรือคุณไม่มีสิทธิ์เข้าถึง', 'error');
        return;
      }
    }
    if (!target) return;

    // Local list maps status into the legacy JobStatus enum ('PendingApproval'),
    // while the API returns 'PENDING_APPROVAL'. Use api_status when present, then
    // normalize so both shapes pass the gate.
    const rawStatus = String(target.api_status || target.status || '');
    const normalized = rawStatus.toUpperCase().replace(/_/g, '');
    if (normalized !== 'PENDINGAPPROVAL') {
      Swal.fire('งานนี้ไม่ได้อยู่ในสถานะรออนุมัติ', `สถานะปัจจุบัน: ${rawStatus}`, 'info');
      return;
    }

    const tAny: any = target;
    const customerName =
      pickName(
        joinName(tAny.customer?.first_name, tAny.customer?.last_name),
        tAny.customer?.nickname,
        tAny.customer?.code,
      ) || '-';
    const tech = tAny.primary_technician
      ? pickName(
          joinName(tAny.primary_technician.first_name, tAny.primary_technician.last_name),
          tAny.primary_technician.nick_name,
        ) || '-'
      : '-';
    const appointmentDate = tAny.appointment_date
      ? new Date(tAny.appointment_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })
      : null;
    const appointmentTime = tAny.appointment_date
      ? new Date(tAny.appointment_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      : null;
    const code = tAny.code || null;

    const rows: import('../../utils/approvalSwal').DetailRow[] = [];
    if (code) rows.push({ label: 'เลขที่งาน', value: code });
    rows.push({ label: 'ลูกค้า', value: customerName });
    rows.push({ label: 'ช่างหลัก', value: tech });
    rows.push({ label: 'นัดหมาย', value: appointmentDate });
    rows.push({ label: 'เวลานัดหมาย', value: appointmentTime });

    const r = await Swal.fire({
      icon: 'question',
      title: 'อนุมัติงานภาคสนาม?',
      width: 520,
      html: renderApprovalDetails(rows, tAny.remark),
      showCancelButton: true,
      confirmButtonText: 'อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
    });
    if (r.isConfirmed) {
      handleApproveJob(focusId);
    }
  });

  const handleViewRejectionHistory = async (jobId: string) => {
    try {
      const history = await JobApi.getRejectionHistory(jobId);
      if (!history.length) {
        Swal.fire('ไม่มีประวัติ', 'ยังไม่มีประวัติการปฏิเสธสำหรับงานนี้', 'info');
        return;
      }
      const rows = history
        .map((h) => {
          const who = h.rejected_by_user
            ? [h.rejected_by_user.first_name, h.rejected_by_user.last_name].filter(Boolean).join(' ') ||
              h.rejected_by_user.nick_name ||
              '-'
            : '-';
          const when = h.created_at ? new Date(h.created_at).toLocaleString('th-TH') : '-';
          const escaped = (h.reason || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          return `
            <div class="text-left border border-slate-200 rounded-lg p-3 mb-2 bg-slate-50">
              <div class="flex justify-between text-xs text-slate-500 mb-1">
                <span>โดย: ${who}</span>
                <span>${when}</span>
              </div>
              <div class="text-sm text-slate-800">${escaped}</div>
            </div>`;
        })
        .join('');
      Swal.fire({
        title: 'ประวัติการปฏิเสธ',
        html: `<div class="max-h-80 overflow-y-auto">${rows}</div>`,
        width: 600,
        confirmButtonText: 'ปิด',
      });
    } catch (error) {
      const errMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', errMsg || 'ไม่สามารถโหลดประวัติได้', 'error');
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

  const [activeTab, setActiveTab] = useState<'schedule' | 'work-schedule' | 'unassigned' | 'approval' | 'reports'>('schedule');
  const [approvalWarehouses, setApprovalWarehouses] = useState<any[]>([]);
  const [approvalJobs, setApprovalJobs] = useState<FieldJob[]>([]);
  const [approvalCount, setApprovalCount] = useState(0);
  const [view, setView] = useState<'list' | 'kanban' | 'calendar'>('kanban');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createModalDefaults, setCreateModalDefaults] = useState<{
    customerId?: string;
    contractRef?: string;
  }>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const handledOpenParamRef = useRef(false);
  useEffect(() => {
    if (handledOpenParamRef.current) return;
    if (searchParams.get('openCreateModal') !== '1') return;
    handledOpenParamRef.current = true;

    const customerId = searchParams.get('customerId') || undefined;
    const contractId = searchParams.get('contractId') || undefined;
    setCreateModalDefaults({
      customerId,
      contractRef: contractId ? `cnt-${contractId}` : undefined,
    });
    setIsAddModalOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete('openCreateModal');
    next.delete('customerId');
    next.delete('contractId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReportReadOnly, setIsReportReadOnly] = useState(false);
  const [openReportDropdownId, setOpenReportDropdownId] = useState<string | null>(null);
  const [workScheduleCurrentPage, setWorkScheduleCurrentPage] = useState(1);
  const [workScheduleItemsPerPage, setWorkScheduleItemsPerPage] = useState(10);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<any | null>(null);

  const [jobToEdit, setJobToEdit] = useState<any | null>(null);
  const [jobForReport, setJobForReport] = useState<any | null>(null);
  const [reportFinalStatus, setReportFinalStatus] = useState<JobStatus>(JobStatus.Completed);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [reportCurrentPage, setReportCurrentPage] = useState(1);
  const [reportItemsPerPage, setReportItemsPerPage] = useState(10);
  const [reportTotal, setReportTotal] = useState(0);

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

  // Daily Closure
  const [isDailyClosureModalOpen, setIsDailyClosureModalOpen] = useState(false);
  const [todayClosure, setTodayClosure] = useState<DailyJobClosure | null>(null);
  const [closureJobStats, setClosureJobStats] = useState({ total: 0, completed: 0, incomplete: 0 });
  const [closureHasIssueSummary, setClosureHasIssueSummary] = useState(false);
  const [isIssueSummaryModalOpen, setIsIssueSummaryModalOpen] = useState(false);
  const [closureHasPendingIssue, setClosureHasPendingIssue] = useState(false);
  const [closureIssueSummaries, setClosureIssueSummaries] = useState<{
    id: string;
    status: string;
    notes: string;
    items: { product_name: string; quantity: number; unit: string }[];
    expenses: { description: string; amount: number }[];
  }[]>([]);

  const [searchQuery, setSearchQuery] = useState('');

  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().substring(0, 10));
  const [scheduleVehicleId, setScheduleVehicleId] = useState('');
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  const technicians = useMemo(
    () =>
      users.filter((user) => {
        const rt = typeof user.role === 'object' && user.role !== null
            ? (user.role as { role_type: string }).role_type
            : (user as any).roleType;
        return rt === 'FIELD_TECH' || rt === 'FIELD_LEAD';
      }),
    [users]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTechnicianId, filterDate, searchQuery]);

  const reversedJobs = useMemo(() => [...jobs].reverse(), [jobs]);

  const filteredJobs = useMemo(() => {
    let tempJobs = reversedJobs;

    // Filter by vehicle (client-side since data is grouped by vehicle)
    if (selectedVehicleId !== 'all') {
      tempJobs = tempJobs.filter((job) => job.vehicle_id === selectedVehicleId);
    }

    return tempJobs;
  }, [reversedJobs, selectedVehicleId]);

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
        j.status !== JobMainStatus.WAITING_CLEAR &&
        j.status !== JobMainStatus.CANCELLED
    );
    const sortByStartAsc = (a: FieldJob, b: FieldJob) => {
      const aRaw = (a as any).start_date || (a as any).start_time || 0;
      const bRaw = (b as any).start_date || (b as any).start_time || 0;
      return new Date(aRaw).getTime() - new Date(bRaw).getTime();
    };
    return serviceVehicles
      .filter((vehicle) => selectedVehicleId === 'all' || vehicle.id === selectedVehicleId)
      .map((vehicle) => {
        const license =
          (vehicle as unknown as Record<string, string>)?.license_plate ||
          (vehicle as unknown as Record<string, Record<string, string>>)?.vehicle?.vehicle_registration ||
          (vehicle as unknown as Record<string, string>)?.vehicle_registration;
        return {
          title: license ? `${vehicle.name} (${license})` : vehicle.name,
          id: vehicle.id,
          jobs: jobsForKanban
            .filter((j) => j.vehicle_id === vehicle.id)
            .sort(sortByStartAsc),
        };
      })
      .filter((v) => v.id);
  }, [filteredJobs, warehouses, selectedVehicleId]);

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
        const customerName = (r.customer_name || (job as unknown as Record<string, string>)?.customerName || '').toLowerCase();
        const reportDate = formatThaiDate(r.report_date || r.created_at || '');
        const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
        const vehicle = safeWarehouses.find((w) => w.id === (job as unknown as Record<string, string>)?.vehicle_id);
        const licensePlate = ((vehicle as unknown as Record<string, string>)?.license_plate || (vehicle as unknown as Record<string, string>)?.registration_no || (vehicle as unknown as Record<string, string>)?.name || '').toLowerCase();

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
          j.status !== JobMainStatus.WAITING_CLEAR &&
          j.status !== JobMainStatus.CANCELLED
      ),
    [filteredJobs]
  );

  const paginatedJobs = scheduleJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const paginatedReports = reports;

  const scheduledJobsForTable = useMemo(() => {
    if (!scheduleVehicleId || !scheduleDate) return [];
    const isLead = authUser?.roleType === 'FIELD_LEAD';
    return jobs
      .filter(
        (job) =>
          job.vehicle_id === scheduleVehicleId &&
          new Date(job.start_time).toISOString().substring(0, 10) === scheduleDate,
      )
      .filter((job) => {
        if (!isLead) return true;
        // FIELD_LEAD: show only jobs they are leading
        const lead = (job as any).primary_technician;
        return lead && authUser?.id && lead.id === authUser.id;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [jobs, scheduleVehicleId, scheduleDate, authUser?.roleType, authUser?.id]);

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
    setIsLoading(true);

    try {
      let reportId = job.service_report?.id;

      // If service_report is not loaded on the job (e.g. schedule tab), try to find it by job_id
      if (!reportId) {
        try {
          const searchRes = await ServiceReportApi.getAll({ job_id: job.id, limit: 1 });
          const foundReports = searchRes?.data;
          if (Array.isArray(foundReports) && foundReports.length > 0) {
            reportId = foundReports[0].id;
          }
        } catch {
          // No existing report found — will open as new
        }
      }

      if (reportId) {
        const res = await ServiceReportApi.getById(reportId);
        const fullReport = (res as unknown as { data?: ServiceReport })?.data || res;
        const updatedJob = { ...job, service_report: fullReport as ServiceReport };
        setJobForReport(updatedJob);
      } else {
        setJobForReport(job);
      }
    } catch (error) {
      console.error('Error fetching service report:', error);
      setJobForReport(job);
    } finally {
      setIsLoading(false);
    }

    setReportFinalStatus(
      job.status === JobMainStatus.COMPLETE ? JobStatus.Completed : JobStatus.Draft
    );
    setIsReportModalOpen(true);
  };

  const handleViewReport = async (job: FieldJob) => {
    setIsReportReadOnly(true);
    await handleWriteReport(job);
  };

  const handleCancel = (job: FieldJob) => {
    setJobToCancel(job);
    setIsCancelModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = async (job: FieldJob) => {
    setOpenDropdownId(null);
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการลบงาน?',
      html:
        '<div style="text-align:left; line-height:1.7; font-size:0.95rem; max-width:420px; margin:0 auto;">' +
        '<p style="margin:0 0 12px; color:#dc2626; font-weight:600; text-align:center;">' +
        'การลบนี้ไม่สามารถกู้คืนได้' +
        '</p>' +
        '<div style="background:#fef3c7; border-left:4px solid #f59e0b; padding:10px 14px; border-radius:6px; color:#78350f;">' +
        '<div style="margin-bottom:6px;"><strong>ผลกระทบ</strong></div>' +
        '<ul style="margin:0; padding-left:18px;">' +
        '<li>งานและข้อมูลทีมจะถูกลบออกจากระบบ</li>' +
        '<li>ใบประเมินที่อ้างอิงจะถูกคืนสถานะเป็น <strong style="white-space:nowrap">แบบร่าง</strong> อัตโนมัติ</li>' +
        '</ul>' +
        '</div>' +
        '</div>',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await JobApi.delete(job.id);
      Swal.fire({ icon: 'success', title: 'ลบงานแล้ว', timer: 1500, showConfirmButton: false });
      fetchData();
    } catch (error) {
      const errMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', errMsg || 'ไม่สามารถลบงานได้', 'error');
    }
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
      // ใช้ jobForReport (ซึ่งเพิ่งโหลด service_report สดมาใน handleWriteReport) เป็นหลัก
      // กัน stale service_report จาก jobs state ที่ endpoint /vehicles/jobs อาจไม่ได้ populate
      let job =
        (jobForReport && (jobForReport as FieldJob).id === jobId
          ? (jobForReport as FieldJob)
          : undefined) || jobs.find((j) => j.id === jobId);
      if (!job) return;

      let paymentSlipFileId: string | undefined;

      // Compress image ก่อน upload เพื่อลดขนาด + เวลา
      const compressOptions = {
        maxSizeMB: 1.5,          // target ≤ 1.5MB
        maxWidthOrHeight: 1920,  // limit dimensions
        useWebWorker: true,
        initialQuality: 0.8,
      };
      const compressIfImage = async (file: File): Promise<File> => {
        if (!file.type.startsWith('image/')) return file;
        try {
          return await imageCompression(file, compressOptions);
        } catch {
          return file; // fallback ถ้า compress ล้ม
        }
      };

      if (paymentSlip) {
        const compressedSlip = await compressIfImage(paymentSlip);
        const uploadedSlip = await StorageApi.upload({
          file: compressedSlip,
          path: `jobs/${jobId}/payment-slips`,
          provider: 'local',
          type: 'image',
          visibility: 'private',
        });
        paymentSlipFileId = uploadedSlip.id;
      }

      const payload = {
        ...reportData,
        job_id: jobId,
        customer_id: job.customer_id,
        payment_slip_file_id: paymentSlipFileId,
      };

      const { id, ...dataToSave } = payload;

      let reportId: string | undefined;

      const existingReportId = job.service_report?.id
        || (job.service_report as unknown as Record<string, Record<string, string>>)?.data?.id;

      if (existingReportId) {
        await ServiceReportApi.update(existingReportId, dataToSave);
        reportId = existingReportId;
      } else {
        const created = await ServiceReportApi.create(dataToSave as Omit<ServiceReport, 'id'>);
        const createdObj = created as unknown as Record<string, Record<string, string>>;
        reportId = createdObj?.data?.id || (created as unknown as Record<string, string>)?.id;
      }

      // Compress รูปพร้อมกัน + ส่ง multiple upload request เดียว (ลด HTTP overhead)
      if (files && files.length > 0 && reportId) {
        try {
          const compressedFiles = await Promise.all(files.map(compressIfImage));
          await StorageApi.uploadMultiple({
            files: compressedFiles,
            path: `service-reports/${reportId}/blueprints`,
            entity_type: 'service_report_blueprint',
            entity_id: reportId,
            type: 'image',
            visibility: 'private',
          });
        } catch (err) {
          console.error('Failed to upload blueprint images:', err);
          Swal.fire({
            icon: 'warning',
            title: 'อัปโหลดรูปไม่สำเร็จ',
            text: 'บันทึกรายงานแล้ว แต่อัปโหลดรูปล้มเหลว — กรุณาแก้ไขรายงานและแนบรูปอีกครั้ง',
          });
        }
      }

      if (quotationId && quotationId !== job.quotation_id) {
        await JobApi.update(jobId, { quotation_id: quotationId } as Partial<JobEntity>);
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

  // ===== Daily Closure Handlers =====
  const [closureTargetVehicleId, setClosureTargetVehicleId] = useState('');
  const [isVehicleSelectModalOpen, setIsVehicleSelectModalOpen] = useState(false);
  const [closureVehicleOptions, setClosureVehicleOptions] = useState<{ id: string; name: string; registration: string; jobCount: number }[]>([]);

  const handleOpenDailyClosure = async () => {
    try {
      // Find vehicles that have jobs today for this tech
      const vehiclesWithJobs = (Array.isArray(warehouses) ? warehouses : [])
        .filter((w) => w.type === WarehouseType.VEHICLE)
        .filter((w) => {
          const vehicleJobs = (w as Warehouse & { jobs?: FieldJob[] }).jobs || [];
          return vehicleJobs.length > 0;
        });

      if (vehiclesWithJobs.length === 0) {
        Swal.fire('ไม่พบรถ', 'ไม่มีรถที่มีงานวันนี้', 'warning');
        return;
      }

      let targetVehicleId: string;

      if (vehiclesWithJobs.length === 1) {
        // มีรถเดียว → ใช้เลย
        targetVehicleId = vehiclesWithJobs[0].id;
      } else {
        // มีหลายรถ → เปิด modal ให้เลือก
        setClosureVehicleOptions(vehiclesWithJobs.map((v) => {
          const vJobs = (v as Warehouse & { jobs?: FieldJob[] }).jobs || [];
          return {
            id: v.id,
            name: v.name,
            registration: v.vehicle?.vehicle_registration || '',
            jobCount: vJobs.length,
          };
        }));
        setIsVehicleSelectModalOpen(true);
        return; // จะ continue ใน handleVehicleSelected
      }

      await openClosureForVehicle(targetVehicleId);
    } catch (error) {
      console.error('Error opening daily closure:', error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลจบงานรายวันได้', 'error');
    }
  };

  const handleVehicleSelected = async (vehicleId: string) => {
    setIsVehicleSelectModalOpen(false);
    try {
      await openClosureForVehicle(vehicleId);
    } catch (error) {
      console.error('Error opening daily closure:', error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลจบงานรายวันได้', 'error');
    }
  };

  const openClosureForVehicle = async (targetVehicleId: string) => {
    setClosureTargetVehicleId(targetVehicleId);

    // Check if closure exists for the selected date
      const targetDateStr = filterDate || dayjs().format('YYYY-MM-DD');
      let closure: DailyJobClosure | null = null;
      try {
        const res = await DailyClosureApi.getToday(targetVehicleId, targetDateStr);
        closure = res.data ?? null;
      } catch {
        // No closure for this date yet — that's fine
        closure = null;
      }
      setTodayClosure(closure);

      // Count job stats from current warehouses data
      const vehicleData = warehouses.find((w) => (w as Warehouse & { id: string }).id === targetVehicleId);
      const vehicleJobs: FieldJob[] = (vehicleData as Warehouse & { jobs?: FieldJob[] })?.jobs ?? [];
      const total = vehicleJobs.length;
      const completed = vehicleJobs.filter((j) => {
        const status = String(j.status || '').toUpperCase();
        return status === 'COMPLETED' || status === 'COMPLETE' || status === 'WAITING_CLEAR';
      }).length;
      const incomplete = total - completed;
      setClosureJobStats({ total, completed, incomplete });

      // Fetch stock issue summaries: by vehicle + selected date
      try {
        const issueRes = await StockIssueSummaryApi.getAll({
          warehouse_id: targetVehicleId,
          start_date: `${targetDateStr}T00:00:00`,
          end_date: `${targetDateStr}T23:59:59`,
          limit: 50,
        });

        const summaries = issueRes.data || [];
        setClosureIssueSummaries(summaries.map((s) => ({
          id: s.id,
          status: s.status || 'DRAFT',
          notes: s.notes || '',
          items: (s.items || []).map((item) => ({
            product_name: item.product_name,
            quantity: item.quantity,
            unit: item.unit,
          })),
          expenses: (s.expense_items || s.expense_item || []).map((exp) => ({
            description: exp.description || '',
            amount: Number(exp.amount) || 0,
          })),
        })));
        setClosureHasIssueSummary(summaries.length > 0);
        setClosureHasPendingIssue(summaries.some((s) => s.status === 'PENDING'));
      } catch {
        setClosureIssueSummaries([]);
        setClosureHasIssueSummary(false);
        setClosureHasPendingIssue(false);
      }

      setIsDailyClosureModalOpen(true);
  };

  const handleCloseDailyClosure = async (data: CloseDailyJobClosurePayload) => {
    try {
      const targetVehicleId = closureTargetVehicleId;

      if (!targetVehicleId) {
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่พบรถที่เลือก', 'error');
        return;
      }

      let closureId = todayClosure?.id;

      // If no closure exists, create one first
      if (!closureId) {
        const closureDate = data.closure_date || dayjs().format('YYYY-MM-DD');
        const createRes = await DailyClosureApi.create({
          closure_date: closureDate,
          vehicle_id: targetVehicleId,
          primary_tech_id: currentUser.id,
        });
        closureId = createRes.data?.id;
      }

      if (!closureId) {
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างรายการปิดงานได้', 'error');
        return;
      }

      // Close the closure
      await DailyClosureApi.close(closureId, data);

      Swal.fire({
        icon: 'success',
        title: 'จบงานรายวันเรียบร้อย',
        showConfirmButton: false,
        timer: 1500,
      });

      setIsDailyClosureModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error closing daily closure:', error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถจบงานรายวันได้', 'error');
    }
  };

  const handleCreateIssueSummary = async (data: Record<string, unknown>) => {
    try {
      await StockIssueSummaryApi.create(data as Parameters<typeof StockIssueSummaryApi.create>[0]);
      Swal.fire({
        icon: 'success',
        title: 'สร้างสรุปเบิกสำเร็จ',
        showConfirmButton: false,
        timer: 1500,
      });
      setIsIssueSummaryModalOpen(false);
    } catch (error: unknown) {
      const errMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Swal.fire('เกิดข้อผิดพลาด', errMsg || 'ไม่สามารถสร้างใบเบิกได้', 'error');
    }
  };

  const closureVehicleName = (() => {
    if (!closureTargetVehicleId) return '-';
    const vehicle = allVehicles.find((v: { id: string }) => v.id === closureTargetVehicleId);
    if (!vehicle) {
      const wh = warehouses.find((w) => w.id === closureTargetVehicleId);
      return wh?.name || '-';
    }
    return vehicle.license_plate || vehicle.vehicle_registration || vehicle.name || '-';
  })();

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

  // Fetch all vehicles for dropdown (once)
  useEffect(() => {
    VehicleApi.getVehicles({ limit: 10, sort_by: 'vehicle_registration', sort_order: 'asc' } as Record<string, unknown>).then((res) => {
      setAllVehicles((res.data || []) as Warehouse[]);
    }).catch(() => {});
  }, []);

  // Initial load: fetch schedule + unassigned count
  useEffect(() => {
    fetchSchedule(filterDate, selectedTechnicianId);
    // Fetch unassigned count for badge (lightweight API)
    JobApi.getUnassignedCount().then((count) => {
      setUnassignedCount(count);
    }).catch(() => {});

    // Fetch approval count (PENDING_APPROVAL) so badge stays fresh
    JobApi.getAll({ limit: 1, page: 1, status: JobMainStatus.PENDING_APPROVAL } as any)
      .then((res) => {
        setApprovalCount((res as any).meta?.total || ((res as any).data || []).length || 0);
      })
      .catch(() => {});
  }, [filterDate, selectedTechnicianId]);

  // Fetch when tab changes
  useEffect(() => {
    if (activeTab === 'schedule' || activeTab === 'work-schedule') {
      fetchSchedule();
    } else if (activeTab === 'unassigned') {
      setUnassignedPage(1);
      fetchUnassigned(1, unassignedDateFilter);
    } else if (activeTab === 'approval') {
      fetchApproval();
    } else if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports(1);
    }
  }, [reportItemsPerPage]);

  useEffect(() => {
    if (activeTab === 'unassigned') {
      fetchUnassigned(1, unassignedDateFilter);
    }
  }, [unassignedItemsPerPage]);

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

    const isRejectedStatus = status === JobStatus.Rejected;
    const isCreatorOfSelected =
      !!currentUser?.id && !!(selectedJob as FieldJob).created_by &&
      (selectedJob as FieldJob).created_by === currentUser.id;
    const canEditRejectedDropdown =
      isRejectedStatus && hasPermission('UPDATE_OPERATION') &&
      (isCreatorOfSelected || hasPermission('APPROVE_OPERATION'));

    if (
      status === JobStatus.Planned ||
      status === JobStatus.Pending ||
      status === JobStatus.InProgress ||
      status === JobStatus.Paused ||
      canEditRejectedDropdown
    ) {
      actions.push({
        label: isRejectedStatus ? 'แก้ไขและส่งอนุมัติใหม่' : 'แก้ไขงานและใบประเมิน',
        icon: PencilIcon,
        onClick: () => handleEdit(selectedJob),
      });
    }

    if (
      status === JobStatus.Completed ||
      status === JobStatus.Draft ||
      status === JobStatus.InProgress ||
      (status as unknown as string) === 'IN_PROGRESS'
    ) {
      actions.push({
        label: 'แก้ไขใบรายงานบริการ',
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

    if (status === JobStatus.Rejected || status === JobStatus.PendingApproval) {
      actions.push({
        label: 'ดูประวัติการปฏิเสธ',
        icon: ClipboardDocumentListIcon,
        onClick: () => handleViewRejectionHistory(selectedJob.id),
      });
    }

    if (status === JobStatus.Pending && hasPermission('DELETE_OPERATION')) {
      actions.push({
        label: 'ลบงาน',
        icon: TrashIcon,
        onClick: () => handleDelete(selectedJob),
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
    <div className="flex-1 flex flex-col">
      <div className="relative flex flex-col flex-1">
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl">
          <LoadingIcon className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-base font-medium text-slate-500">กำลังโหลดข้อมูลภาคสนาม...</p>
        </div>
      )}
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col space-y-6 flex-1">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ภาคสนาม</h1>
            <p className="mt-1 text-slate-600">จัดการและติดตามงานภาคสนามทั้งหมด</p>
          </div>
          <div className="flex items-center gap-3">
            {isFieldRole(authUser?.roleType) && (
              <>
                <Button
                  onClick={() => setIsIssueSummaryModalOpen(true)}
                  variant="primary"
                  className="!text-sm !font-medium !bg-amber-500 !text-white hover:!bg-amber-600 !border-amber-500 !shadow-md"
                >
                  <DocumentCheckIcon className="w-4 h-4 mr-1.5" />
                  สรุปเบิกสินค้า/ค่าใช้จ่าย
                </Button>
                {todayClosure?.status === 'CLOSED' ? (
                  <Button
                    variant="primary"
                    disabled
                    className="!text-sm !font-medium !bg-gray-400 !text-white !border-gray-400 !shadow-md !cursor-not-allowed !opacity-70"
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                    จบงานรายวันแล้ว
                  </Button>
                ) : (
                  <Button
                    onClick={handleOpenDailyClosure}
                    variant="primary"
                    className="!text-sm !font-medium !bg-red-600 !text-white hover:!bg-red-700 !border-red-600 !shadow-md"
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                    จบงานรายวัน
                  </Button>
                )}
              </>
            )}
            {(isManagementRole(authUser?.roleType) || isExecutiveRole(authUser?.roleType)) && (
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
        </div>

        <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <CalendarDaysIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-blue-600 font-medium whitespace-nowrap">งานวันนี้</p>
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
                <p className="text-xs sm:text-sm text-amber-600 font-medium whitespace-nowrap">กำลังดำเนินการ</p>
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
                <p className="text-xs sm:text-sm text-purple-600 font-medium whitespace-nowrap">รอดำเนินการ</p>
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
                <p className="text-xs sm:text-sm text-green-600 font-medium whitespace-nowrap">รายงานทั้งหมด</p>
                <p className="text-2xl font-bold text-green-800">{reportTotal || reports.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="!p-4 flex-shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center flex-1 min-w-0">
              <div className="relative w-full sm:w-56">
                  <Input
                    type="search"
                    placeholder="ค้นหารหัสลูกค้า, ชื่อลูกค้า"
                    value={activeTab === 'unassigned' ? unassignedSearch : searchQuery}
                    onChange={(e) => {
                      if (activeTab === 'unassigned') {
                        setUnassignedSearch(e.target.value);
                        setUnassignedPage(1);
                        fetchUnassigned(1, unassignedDateFilter, e.target.value);
                      } else {
                        setSearchQuery(e.target.value);
                        fetchSchedule(filterDate, selectedTechnicianId, e.target.value);
                      }
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
                      className="w-36 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
                      wrapperClassName="w-full sm:w-auto"
                    />
                  </div>
                )}
                {activeTab === 'schedule' && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
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
                      className="w-36 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
                      wrapperClassName="w-full sm:w-auto"
                    />
                    <div className="w-40">
                      <SearchableSelect
                        value={selectedTechnicianId}
                        onChange={(newTech) => {
                          setSelectedTechnicianId(newTech || 'all');
                          fetchData(filterDate, newTech || 'all');
                        }}
                        placeholder="ช่างทั้งหมด"
                        searchPlaceholder="ค้นหาช่าง..."
                        options={[
                          { value: 'all', label: 'ช่างทั้งหมด' },
                          ...technicians.map((tech: any) => {
                            const fullName = [tech.first_name, tech.last_name]
                              .filter((p: string | undefined) => p && p !== '-')
                              .join(' ')
                              .trim();
                            return {
                              value: tech.id,
                              label: fullName || tech.name || tech.nick_name || tech.id,
                            };
                          }),
                        ]}
                      />
                    </div>
                    <div className="w-40">
                      <SearchableSelect
                        value={selectedVehicleId || 'all'}
                        onChange={(newId) => {
                          const next = newId || 'all';
                          setSelectedVehicleId(next);
                          fetchSchedule(filterDate, selectedTechnicianId, searchQuery, next);
                        }}
                        placeholder="รถทั้งหมด"
                        searchPlaceholder="ค้นหารถ..."
                        options={[
                          { value: 'all', label: 'รถทั้งหมด' },
                          ...allVehicles.map((v: any) => ({
                            value: v.warehouse_id || v.id,
                            label:
                              v.license_plate ||
                              v.vehicle_registration ||
                              v.vehicle?.vehicle_registration ||
                              v.name ||
                              v.id,
                          })),
                        ]}
                      />
                    </div>
                    <Select
                      id="status-filter"
                      value={selectedStatusFilter}
                      onChange={(e) => {
                        setSelectedStatusFilter(e.target.value);
                        fetchSchedule(filterDate, selectedTechnicianId, searchQuery, selectedVehicleId, e.target.value);
                      }}
                      className="w-fit text-sm !pr-8"
                    >
                      <option value="all">สถานะทั้งหมด</option>
                      {Object.values(JobMainStatus).map((status) => (
                        <option key={status} value={status}>
                          {JobStatusLabel[status] || status}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                {activeTab === 'work-schedule' && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <DatePicker selected={scheduleDate ? new Date(scheduleDate) : null} onChange={(date: Date | null) => setScheduleDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="dd/mm/yyyy" isClearable className="w-36 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-full sm:w-auto" />
                    <Select
                      value={scheduleVehicleId}
                      onChange={(e) => setScheduleVehicleId(e.target.value)}
                      className="w-48 bg-white border-slate-300 shadow-sm text-sm h-10"
                    >
                      <option value="">เลือกทะเบียนรถ</option>
                      {warehouses
                        .filter(
                          (w) =>
                            (w as unknown as Record<string, string>).type === 'รถ' ||
                            (w as unknown as Record<string, string>).type === 'VEHICLE'
                        )
                        .map((w) => (
                          <option key={w.id} value={w.id}>
                            {(w as unknown as Record<string, string>).license_plate} ({w.name})
                          </option>
                        ))}
                    </Select>
                  </div>
                )}
            </div>

            {/* Tabs + View Toggle */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {(activeTab === 'schedule' || activeTab === 'approval') && (
                  <div className="flex items-center rounded-lg bg-slate-100 p-1">
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
                    {activeTab === 'schedule' && (
                      <Button
                        onClick={() => setView('calendar')}
                        variant="ghost"
                        className={`p-2 rounded-md h-auto ${view === 'calendar' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'
                          }`}
                        title="มุมมองปฏิทิน"
                      >
                        <CalendarDaysIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full scrollbar-hide">
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'schedule'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    นัดหมาย
                  </button>

                  {!isFieldRole(authUser?.roleType) && (
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

                  {!isFieldRole(authUser?.roleType) && (
                    <button
                      onClick={() => setActiveTab('approval')}
                      className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'approval' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      รออนุมัติ
                      {approvalCount > 0 && (
                        <span className="ml-1.5 bg-orange-100 text-orange-700 py-0.5 px-1.5 rounded-full text-xs">
                          {approvalCount}
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
        </Card>


        <div className="flex-1 min-h-0 relative flex flex-col">

          {activeTab === 'schedule' && view === 'kanban' && (
            hasPermission('READ_OPERATION') ? (
              <JobKanbanBoard
                columns={kanbanColumns}
                emptyBoardText="ไม่พบรถให้บริการ"
                emptyColumnText="ไม่มีงาน"
                accentColorClass="bg-primary"
                onDropdownToggle={handleDropdownToggle}
                onStatusChange={handleStatusChange}
                onViewDetails={handleViewDetails}
                onWriteReport={handleWriteReport}
                onEditJob={handleEdit}
                onApprove={handleApproveJob}
                onReject={handleRejectJob}
                currentUser={currentUser}
                isAnyJobInProgressForCurrentUser={isAnyJobInProgressForCurrentUser}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-lg shadow-sm border border-slate-200 p-12">
                <ClipboardDocumentListIcon className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-lg font-medium">คุณไม่มีสิทธิ์เข้าถึงข้อมูลงานภาคสนาม</p>
                <p className="text-sm mt-1">ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ดูภาคสนาม</p>
              </div>
            )
          )}

          {activeTab === 'unassigned' && (
            <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto flex-1 relative">
                <table className="min-w-[800px] w-full border-b border-slate-200">
                  <thead className="bg-white">
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ลำดับ</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ชื่อลูกค้า</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">เบอร์โทรศัพท์</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ที่อยู่</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">วันที่นัดหมาย</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">สถานะ</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {unassignedJobs.length > 0 ? (
                      unassignedJobs.map((job, idx) => (
                        <tr key={job.id} className={`hover:bg-amber-50/30 transition-colors [&>td]:text-center [&>td]:align-middle ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {(unassignedPage - 1) * unassignedItemsPerPage + idx + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <p className="text-sm font-semibold text-slate-800">
                              {joinName(job.customer?.first_name, job.customer?.last_name) ||
                                (job.customer as any)?.nickname ||
                                '-'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="text-sm text-slate-700">{formatPhoneNumber(job.customer?.primary_phone || '-')}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="text-sm text-slate-700 whitespace-normal break-words">{job.address || '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="text-sm text-slate-700">{formatThaiDate(job.start_time)}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="px-2 py-1 bg-amber-100 text-slate-600 text-xs font-bold rounded-full">รอจัดคิว</span>
                          </td>
                          <td className="px-4 py-3">
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
                        <td colSpan={7} className="p-0 border-b-0 h-0">
                          <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                            <ClipboardDocumentListIcon className="h-12 w-12 mb-3 opacity-50" />
                            <p className="text-lg font-medium">ไม่มีงานค้างรอจัดคิว</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {unassignedTotal > 0 && (
                <div className="mt-auto border-t border-slate-200">
                  <Pagination
                    currentPage={unassignedPage}
                    itemsPerPage={unassignedItemsPerPage}
                    totalItems={unassignedTotal}
                    onPageChange={(page) => {
                      setUnassignedPage(page);
                      fetchUnassigned(page, unassignedDateFilter);
                    }}
                    onItemsPerPageChange={(size) => {
                      setUnassignedItemsPerPage(size);
                      setUnassignedPage(1);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'approval' && view === 'kanban' && (() => {
            const approvalColumns = approvalWarehouses
              .filter((w: any) => w.type === WarehouseType.VEHICLE)
              .map((vehicle: any) => {
                const license =
                  vehicle?.license_plate ||
                  vehicle?.vehicle?.vehicle_registration ||
                  vehicle?.vehicle_registration;
                return {
                  id: vehicle.id,
                  title: license ? `${vehicle.name} (${license})` : vehicle.name,
                  jobs: approvalJobs
                    .filter((j) => j.vehicle_id === vehicle.id)
                    .sort((a, b) => {
                      const aRaw = (a as any).start_date || (a as any).start_time || 0;
                      const bRaw = (b as any).start_date || (b as any).start_time || 0;
                      return new Date(aRaw).getTime() - new Date(bRaw).getTime();
                    }),
                };
              })
              .filter((v) => v.id && v.jobs.length > 0);

            return (
              <JobKanbanBoard
                columns={approvalColumns}
                emptyBoardText="ไม่มีงานรออนุมัติ / ถูกปฏิเสธ"
                emptyColumnText="ไม่มีงาน"
                accentColorClass="bg-orange-500"
                onDropdownToggle={handleDropdownToggle}
                onStatusChange={handleStatusChange}
                onViewDetails={handleViewDetails}
                onWriteReport={handleWriteReport}
                onEditJob={handleEdit}
                onApprove={handleApproveJob}
                onReject={handleRejectJob}
                currentUser={currentUser}
                isAnyJobInProgressForCurrentUser={isAnyJobInProgressForCurrentUser}
              />
            );
          })()}

          {activeTab === 'approval' && view === 'list' && (
            <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto flex-1 relative">
                <table className="min-w-[800px] w-full border-b border-slate-200">
                  <thead className="bg-white">
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ลำดับ</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ลูกค้า</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">วันนัดหมาย</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ช่าง</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">สถานะ</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {approvalJobs.length > 0 ? (
                      approvalJobs.map((job, idx) => {
                        const statusUpper = String(job.api_status || '').toUpperCase();
                        const isPA = statusUpper === 'PENDING_APPROVAL';
                        const statusLabel = isPA ? 'รออนุมัติ' : 'ถูกปฏิเสธ';
                        const statusClass = isPA
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700';
                        return (
                          <tr
                            key={job.id}
                            className={`hover:bg-slate-50/50 transition-colors [&>td]:text-center [&>td]:align-middle ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                          >
                            <td className="px-4 py-3 text-sm text-slate-700">{idx + 1}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              <p className="text-sm font-semibold text-slate-800">
                                {job.customerName || '-'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {formatThaiDate(job.start_time)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {job.technicians?.map((t) => t.name).join(', ') || 'ยังไม่มอบหมาย'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusClass}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  className="text-xs py-1.5 px-3"
                                  onClick={() => handleViewDetails(job)}
                                >
                                  ดูรายละเอียด
                                </Button>
                                {isPA && hasPermission('APPROVE_OPERATION') && (
                                  <>
                                    <Button
                                      variant="primary"
                                      className="text-xs py-1.5 px-3 bg-green-500 hover:bg-green-600"
                                      onClick={() => handleApproveJob(job.id)}
                                    >
                                      อนุมัติ
                                    </Button>
                                    <Button
                                      variant="primary"
                                      className="text-xs py-1.5 px-3 bg-red-500 hover:bg-red-600"
                                      onClick={() =>
                                        Swal.fire({
                                          title: 'ปฏิเสธงานนี้?',
                                          input: 'textarea',
                                          inputLabel: 'เหตุผลการปฏิเสธ',
                                          inputPlaceholder: 'ระบุเหตุผล...',
                                          showCancelButton: true,
                                          confirmButtonText: 'ปฏิเสธ',
                                          cancelButtonText: 'ยกเลิก',
                                          confirmButtonColor: '#ef4444',
                                          inputValidator: (value) =>
                                            !value || !value.trim() ? 'กรุณาระบุเหตุผล' : null,
                                        }).then((r) => {
                                          if (r.isConfirmed && r.value) {
                                            handleRejectJob(job.id, r.value.trim());
                                          }
                                        })
                                      }
                                    >
                                      ปฏิเสธ
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-0 border-b-0 h-0">
                          <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                            <ClipboardDocumentListIcon className="h-12 w-12 mb-3 opacity-50" />
                            <p className="text-lg font-medium">ไม่มีงานรออนุมัติ / ถูกปฏิเสธ</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && view === 'list' && (
            <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full border-b border-slate-200">
                  <thead className="bg-white">
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        ลำดับ
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        ลูกค้า
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        สถานที่
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        วันที่นัดหมาย
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        เวลานัดหมาย
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        บริการ
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        ช่าง
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedJobs.length > 0 ? (
                      paginatedJobs.map((job, idx) => (
                        <tr
                          key={job.id}
                          className={`hover:bg-slate-50/50 transition-colors [&>td]:text-center [&>td]:align-middle ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                            }`}
                        >
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="text-sm font-semibold text-slate-800">
                              {job.customerName || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="text-sm text-slate-600 whitespace-normal break-words">
                              {job.address || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            <span className="text-sm font-medium text-slate-800">
                              {formatThaiDate(job.start_time)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            <span className="text-sm text-slate-600">
                              {new Date(job.start_time).toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {' - '}
                              {new Date(job.end_time).toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="text-sm text-slate-600 whitespace-normal break-words">
                              {(() => {
                                const packages = (job.work_areas || [])
                                  .map((wa) => wa.service_package)
                                  .filter(Boolean)
                                  .join(', ');
                                if (packages) return packages;
                                const detail = (job as unknown as Record<string, string>).operation_details;
                                return detail?.trim() || '-';
                              })()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="text-sm text-slate-600 truncate max-w-[200px] inline-block">
                              {(() => {
                                const lead: any = (job as any).primary_technician;
                                if (!lead) return '-';
                                const full = [lead.first_name, lead.last_name]
                                  .map((p) => (typeof p === 'string' ? p.trim() : ''))
                                  .filter((p) => p && p !== '-')
                                  .join(' ');
                                return full || lead.nick_name || '-';
                              })()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            {(() => {
                              const key = String(job.api_status || job.status || '').toUpperCase();
                              const label = JobStatusLabel[key] || key;
                              const colorMap: Record<string, string> = {
                                UNASSIGNED: 'bg-amber-100 text-amber-700',
                                PENDING: 'bg-yellow-100 text-yellow-700',
                                IN_PROGRESS: 'bg-blue-100 text-blue-700',
                                COMPLETE: 'bg-green-100 text-green-700',
                                WAITING_CLEAR: 'bg-orange-100 text-orange-700',
                                CANCELLED: 'bg-red-100 text-red-700',
                              };
                              const color = colorMap[key] || 'bg-slate-100 text-slate-600';
                              return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>{label}</span>;
                            })()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            <div className="flex items-center justify-center">
                              <Button
                                data-job-id={job.id}
                                onClick={(e) => handleDropdownToggle(e, job.id)}
                                variant="ghost"
                                className="p-2 h-auto rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                              >
                                <ManageIcon className="h-5 w-5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-6 py-16 text-center">
                          <p className="text-lg font-medium text-slate-400">ไม่พบข้อมูลงาน</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {paginatedJobs.length > 0 && (
                <div className="mt-auto border-t border-slate-200">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={scheduleJobs.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={handleItemsPerPageChange}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule' && view === 'calendar' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <JobCalendar jobs={filteredJobs} onJobClick={handleViewDetails} />
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto flex-1 relative">
                <table className="min-w-[800px] w-full border-b border-slate-200">
                  <thead className="sticky top-0 z-10 bg-white shadow-sm">
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ลำดับ</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">รหัสลูกค้า</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ลูกค้า</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">วัน</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">เวลา</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">บริการ</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ช่าง</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedReports.length > 0 ? (
                      paginatedReports.map((report, idx) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const rData = report as unknown as Record<string, any>;
                        const job = jobs.find((j) => j.id === report.job_id);
                        const reportJob = rData.job;
                        const reportDate = report.report_date || report.created_at || '';
                        const customerName = report.customer_name || job?.customerName || '-';

                        // Build service types from boolean flags
                        const serviceTypes: string[] = [];
                        if (rData.is_service_termite) serviceTypes.push('ปลวก');
                        if (rData.is_service_ant_roach) serviceTypes.push('มด,แมลงสาบ');
                        if (rData.is_service_rodent) serviceTypes.push('หนู');
                        if (rData.is_service_mosquito) serviceTypes.push('ยุง');
                        if (rData.service_other && String(rData.service_other).toLowerCase() !== 'other') serviceTypes.push(String(rData.service_other));

                        // Build technician name (primary only)
                        const techNames: string[] = [];
                        if (reportJob?.primary_technician) {
                          const t = reportJob.primary_technician;
                          techNames.push(`${t.first_name || ''} ${t.last_name || ''}`.trim());
                        }

                        return (
                          <tr
                            key={report.id}
                            className={`hover:bg-slate-50/50 transition-colors [&>td]:text-center [&>td]:align-middle ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                              }`}
                          >
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {(reportCurrentPage - 1) * reportItemsPerPage + idx + 1}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                              {reportJob?.customer?.code || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {customerName}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-800">
                              {formatThaiDate(reportDate)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                              {report.time_in && report.time_out
                                ? `${report.time_in} - ${report.time_out}`
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              <div className="flex flex-wrap justify-center gap-1">
                                {serviceTypes.length > 0 ? (
                                  serviceTypes.slice(0, 3).map((type, i) => {
                                    const styleByType: Record<string, string> = {
                                      'ปลวก': 'bg-amber-100 text-amber-700 border border-amber-200',
                                      'มด,แมลงสาบ': 'bg-rose-100 text-rose-700 border border-rose-200',
                                      'หนู': 'bg-stone-100 text-stone-700 border border-stone-200',
                                      'ยุง': 'bg-sky-100 text-sky-700 border border-sky-200',
                                    };
                                    const cls =
                                      styleByType[type] ||
                                      'bg-violet-100 text-violet-700 border border-violet-200';
                                    return (
                                      <span
                                        key={i}
                                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
                                      >
                                        {type}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-sm text-slate-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              <span className="text-sm text-slate-600 truncate max-w-[150px] inline-block">
                                {techNames.length > 0
                                  ? techNames.join(', ')
                                  : rData.technician_sign_name || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                              {(() => {
                                const reportJob = rData.job;
                                const buildTargetJob = () => {
                                  const techList: any[] = [];
                                  if (reportJob?.primary_technician) {
                                    techList.push({ ...reportJob.primary_technician, name: `${reportJob.primary_technician.first_name || ''} ${reportJob.primary_technician.last_name || ''}`.trim() });
                                  }
                                  if (reportJob?.job_team_members) {
                                    reportJob.job_team_members.filter((m: any) => m.id !== reportJob?.primary_technician?.id).forEach((m: any) => {
                                      techList.push({ ...m, name: `${m.first_name || ''} ${m.last_name || ''}`.trim() });
                                    });
                                  }
                                  return job || {
                                    id: report.job_id,
                                    customer_id: report.customer_id,
                                    customerName: report.customer_name || '-',
                                    service_report: report,
                                    technicians: techList,
                                    work_areas: [],
                                    status: report.status,
                                    assessment_id: reportJob?.assessment_id,
                                    contract_id: reportJob?.contract_id,
                                  } as unknown as FieldJob;
                                };
                                return (
                                  <div className="flex items-center justify-center gap-1">
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
                                    <div className="relative">
                                      <Button
                                        onClick={() => setOpenReportDropdownId((prev) => prev === report.id ? null : report.id)}
                                        variant="ghost"
                                        className="p-2 h-auto rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                        title="ตัวเลือก"
                                      >
                                        <ManageIcon className="h-5 w-5" />
                                      </Button>
                                      {openReportDropdownId === report.id && (
                                        <>
                                          <div className="fixed inset-0 z-40" onClick={() => setOpenReportDropdownId(null)} />
                                          <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl shadow-xl bg-white ring-1 ring-black/5 overflow-hidden py-2" role="menu">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setOpenReportDropdownId(null);
                                                handleViewReport(buildTargetJob());
                                              }}
                                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                                            >
                                              <EyeIcon className="w-4 h-4 text-blue-500" />
                                              <span>ดูรายละเอียด</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setOpenReportDropdownId(null);
                                                handleWriteReport(buildTargetJob());
                                              }}
                                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50"
                                            >
                                              <PencilIcon className="w-4 h-4 text-amber-500" />
                                              <span>แก้ไขรายงาน</span>
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-0 border-b-0 h-0">
                          <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                            <ClipboardDocumentListIcon className="h-12 w-12 mb-3 opacity-50" />
                            <p className="text-lg font-medium">ไม่พบรายงานบริการ</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {paginatedReports.length > 0 && (
                <div className="mt-auto border-t border-slate-200">
                  <Pagination
                    currentPage={reportCurrentPage}
                    totalItems={reportTotal}
                    itemsPerPage={reportItemsPerPage}
                    onPageChange={(page) => {
                      setReportCurrentPage(page);
                      fetchReports(page);
                    }}
                    onItemsPerPageChange={(size) => {
                      handleReportItemsPerPageChange(size);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'work-schedule' && (
            <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto flex-1 flex flex-col relative">
                {scheduleVehicleId && scheduleDate ? (
                  <table className="min-w-[1000px] w-full border-b border-slate-200">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-16">
                          ลำดับ
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-32">
                          เวลา
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          ชื่อลูกค้า
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          ที่อยู่
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-32">
                          เบอร์โทรศัพท์
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-28">
                          เข้าบริการ
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-28">
                          เก็บเงิน
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          สาเหตุ
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-32">
                          ช่าง
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {scheduledJobsForTable.length > 0 ? (
                        scheduledJobsForTable
                          .slice(
                            (workScheduleCurrentPage - 1) * workScheduleItemsPerPage,
                            workScheduleCurrentPage * workScheduleItemsPerPage,
                          )
                          .map((job, idx) => {
                          const customer = customerMap.get(job.customer_id);
                          const statusUpper = String(job.status || '').toUpperCase();
                          const isEntered =
                            statusUpper === 'COMPLETED' ||
                            statusUpper === 'COMPLETE' ||
                            statusUpper === 'WAITING_CLEAR' ||
                            statusUpper === 'IN_PROGRESS';
                          const isFailed = statusUpper === 'FAILED' || statusUpper === 'CANCELLED';
                          const invoiceTotal = (job as any).invoice?.total || (job as any).invoice?.grand_total;
                          const reason = (job as any).rejection_reason || (job as any).failure_reason;
                          const lead: any = (job as any).primary_technician;
                          const leadName = lead
                            ? joinName(lead.first_name, lead.last_name) || lead.nick_name || '-'
                            : '-';
                          const startTime = new Date(job.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                          const endTime = new Date(job.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                          return (
                            <tr
                              key={job.id}
                              className={`hover:bg-slate-50/50 transition-colors [&>td]:text-center [&>td]:align-middle ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                            >
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {(workScheduleCurrentPage - 1) * workScheduleItemsPerPage + idx + 1}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm font-semibold text-slate-800">
                                  {startTime} - {endTime}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-semibold text-slate-800">
                                  {job.customerName || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-slate-600 whitespace-normal break-words">
                                  {job.address || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                                {customer?.primary_phone ? formatPhoneNumber(customer.primary_phone) : '-'}
                              </td>
                              <td className="px-4 py-3">
                                {isEntered ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    เข้าได้
                                  </span>
                                ) : isFailed ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                    เข้าไม่ได้
                                  </span>
                                ) : (
                                  <span className="text-sm text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {invoiceTotal ? (
                                  <span className="text-sm font-semibold text-emerald-600">
                                    ฿{Number(invoiceTotal).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-sm text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                <span className="whitespace-normal break-words">
                                  {isFailed ? (reason || '-') : '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                <span className="text-sm text-slate-600">{leadName}</span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={9} className="p-0 border-b-0 h-0">
                            <div className="absolute inset-0 top-[49px] flex flex-col items-center justify-center text-slate-400">
                              <ClipboardDocumentListIcon className="h-12 w-12 mb-3 opacity-50" />
                              <p className="text-lg font-medium">ไม่มีงานในวันนี้</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <ClipboardDocumentListIcon className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-lg font-medium">กรุณาเลือกตารางงาน</p>
                  </div>
                )}
              </div>
              {scheduleVehicleId && scheduleDate && scheduledJobsForTable.length > 0 && (
                <div className="mt-auto border-t border-slate-200">
                  <Pagination
                    currentPage={workScheduleCurrentPage}
                    totalItems={scheduledJobsForTable.length}
                    itemsPerPage={workScheduleItemsPerPage}
                    onPageChange={setWorkScheduleCurrentPage}
                    onItemsPerPageChange={(size) => {
                      setWorkScheduleItemsPerPage(size);
                      setWorkScheduleCurrentPage(1);
                    }}
                  />
                </div>
              )}
            </div>
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
      </div>

      <JobModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setCreateModalDefaults({});
        }}
        mode="add"
        onSubmitJob={handleCreateJob}
        jobs={jobs}
        users={users}
        warehouses={warehouses}
        contracts={contracts}
        defaultCustomerId={createModalDefaults.customerId}
        initialContractId={createModalDefaults.contractRef}
        currentUserRole={currentUser.role as Role}
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
        currentUserRole={currentUser.role as Role}
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
          setIsReportReadOnly(false);
        }}
        job={jobForReport}
        finalStatus={reportFinalStatus}
        onSubmit={handleReportSubmit}
        contracts={contracts}
        currentUser={currentUser}
        products={initialProducts}
        jobs={jobs}
        readOnly={isReportReadOnly}
      />

      <DailyClosureCloseModal
        isOpen={isDailyClosureModalOpen}
        onClose={() => setIsDailyClosureModalOpen(false)}
        onSubmit={handleCloseDailyClosure}
        vehicleName={closureVehicleName}
        totalJobs={closureJobStats.total}
        completedJobs={closureJobStats.completed}
        incompleteJobs={closureJobStats.incomplete}
        hasStockIssueSummary={closureHasIssueSummary}
        hasPendingStockIssue={closureHasPendingIssue}
        issueSummaries={closureIssueSummaries}
      />

      <VehicleSelectModal
        isOpen={isVehicleSelectModalOpen}
        onClose={() => setIsVehicleSelectModalOpen(false)}
        onSelect={handleVehicleSelected}
        vehicles={closureVehicleOptions}
      />
      <IssueSummaryModal
        isOpen={isIssueSummaryModalOpen}
        onClose={() => setIsIssueSummaryModalOpen(false)}
        mode="create"
        onSubmit={handleCreateIssueSummary}
        warehouses={initialWarehouses}
        products={initialProducts}
        users={users}
        customers={initialCustomers}
        currentUser={currentUser}
      />
    </div>
  );
};

export default Job;