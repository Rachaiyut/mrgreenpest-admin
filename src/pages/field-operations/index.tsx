import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Status, User, UserRole } from '../../types/entity/core.interface';
import {
  FieldJob,
  ServiceReport,
} from '@/src/types/entity/field-job.interface';
import { Assessment } from '../../types/entity/assessment.interface';
import { Contract, Quotation } from '../../types/entity/financial.interface';
import { Product } from '../../types/entity/product.interface';
import { Package } from '../../types/entity/package.interface';
import { Customer } from '../../types/entity/customer.interface';
import { Warehouse } from '../../types/entity/inventory.interface';
import { Category } from '@/src/types/entity/category.interface';
import { JobMainStatus, JobStatus, WarehouseType } from '@/src/types';

import {
  PlusIcon,
  ListBulletIcon,
  ViewColumnsIcon,
  ManageIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XCircleIcon,
  MapPinIcon,
  PlayIcon,
  DocumentCheckIcon,
  TechnicianIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  JobDateIcon,
  JobTimeIcon,
  LoadingIcon,
  ClipboardDocumentListIcon,
} from '../../assets/icons/Icons';
import { AddJobModal } from '../../components/features/jobs/AddJobModal';
import { Pagination } from '../../components/common/Pagination';
import { JobDetailsModal } from '../../components/features/jobs/JobDetailsModal';
import { EditJobModal } from '../../components/features/jobs/EditJobModal';
import { formatThaiDate, formatThaiDateTime } from '@/src/utils/date';
import { ServiceReportModal } from '../../components/features/jobs/ServiceReportModal';
import { Select, Input, Button } from '../../components/common/FormControls';
import { EditAssessmentModal } from '../../components/features/assessments/EditAssessmentModal';
import { TechAssessmentEditModal } from '../../components/features/assessments/TechAssessmentEditModal';
import { CancelJobModal } from '../../components/features/jobs/CancelJobModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { FormField } from '../../components/common/FormControls';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Role } from '../../types/enums/role';

const JobCard: React.FC<{
  job: FieldJob;
  onDropdownToggle: (
    event: React.MouseEvent<HTMLButtonElement>,
    jobId: string
  ) => void;
  onStatusChange: (jobId: string, newStatus: JobStatus) => void;
  onViewDetails: (job: FieldJob) => void;
  onWriteReport: (job: FieldJob) => void;
  currentUser: User;
  isAnyJobInProgressForCurrentUser: boolean;
}> = ({
  job,
  onDropdownToggle,
  onStatusChange,
  onViewDetails,
  onWriteReport,
  currentUser,
  isAnyJobInProgressForCurrentUser,
}) => {
    const currentUserId = (currentUser as any)?.id as string | undefined;

    const isAssignedToCurrentUser = useMemo(
      () =>
        !!currentUserId &&
        (job.technicians || []).some((tech) => tech && tech.id === currentUserId),
      [job.technicians, currentUserId]
    );

    const showCheckInButton =
      isAssignedToCurrentUser &&
      ((job.status as unknown as JobStatus) === JobStatus.Planned || (job.status as unknown as string).toUpperCase() === 'PENDING');

    const showCheckOutButton =
      isAssignedToCurrentUser &&
      ((job.status as unknown as JobStatus) === JobStatus.InProgress || (job.status as unknown as string).toUpperCase() === 'IN_PROGRESS' || (job.status as unknown as string).toUpperCase() === 'INPROGRESS');

    const showReportButton = showCheckOutButton && !job.service_report;

    let checkInTooltip = '';
    if (isAssignedToCurrentUser) {
      if (isAnyJobInProgressForCurrentUser) {
        checkInTooltip = 'คุณกำลังเช็คอินในงานอื่นอยู่';
      } else {
        checkInTooltip = 'เช็คอินเพื่อเริ่มงาน';
      }
    }

    const jobDate = formatThaiDate(job.start_time);
    const jobStartTime = new Date(job.start_time).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const jobEndTime = new Date(job.end_time).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const hasActions = (job.status as unknown as JobStatus) !== JobStatus.Completed;

    // Get status color for left border
    const getStatusColor = () => {
      const statusUpper = String(job.status || job.api_status || '').toUpperCase();
      if (statusUpper === 'IN_PROGRESS' || statusUpper === 'INPROGRESS') return 'border-l-amber-500';
      if (statusUpper === 'COMPLETED' || statusUpper === 'COMPLETE') return 'border-l-green-500';
      if (statusUpper === 'CANCELLED') return 'border-l-red-500';
      return 'border-l-primary';
    };

    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all duration-200 border-l-4 ${getStatusColor()}`}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 text-base leading-tight truncate">
                {job.customerName}
              </h4>
              {job.work_areas.length > 0 && (
                <p className="text-xs text-slate-500 mt-1 truncate">
                  {job.work_areas.map((wa) => wa.service_package).join(', ')}
                </p>
              )}
            </div>
            <Button
              data-job-id={job.id}
              onClick={(e) => onDropdownToggle(e, job.id)}
              variant="ghost"
              className="p-1.5 h-auto rounded-lg hover:bg-slate-100 -mr-1 -mt-1 flex-shrink-0"
              title="ตัวเลือก"
            >
              <ManageIcon className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
          <div className="mt-2">
            <StatusBadge status={job.api_status} />
          </div>
        </div>

        {/* Info */}
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-start gap-2.5 text-sm">
            <MapPinIcon className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <span className="text-slate-600 line-clamp-2 leading-snug">{job.address || '-'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <JobDateIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-600">{jobDate}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <JobTimeIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-700 font-medium">{jobStartTime} - {jobEndTime}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <TechnicianIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span
              className="text-slate-600 truncate"
              title={job.technicians.map((t) => t.name).join(', ')}
            >
              {job.technicians.length > 0
                ? job.technicians.map((t) => t.name).join(', ')
                : <span className="text-slate-400 italic">ยังไม่มอบหมาย</span>}
            </span>
          </div>
        </div>

        {/* Actions */}
        {hasActions && (
          <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 space-y-2">
            <Button
              onClick={() => onViewDetails(job)}
              title="ดูรายละเอียดงาน"
              variant="ghost"
              className="w-full py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-800 rounded-lg border border-slate-200 h-auto"
            >
              <EyeIcon className="h-4 w-4 mr-1.5" />
              ดูรายละเอียด
            </Button>

            {showCheckInButton && (
              <Button
                onClick={() => onStatusChange(job.id, JobStatus.InProgress)}
                disabled={isAnyJobInProgressForCurrentUser}
                title={checkInTooltip}
                variant="primary"
                className="w-full py-2 text-sm font-semibold rounded-lg h-auto shadow-sm"
              >
                <PlayIcon className="h-4 w-4 mr-1.5" />
                เช็คอิน
              </Button>
            )}
            {showReportButton && (
              <Button
                onClick={() => onWriteReport(job)}
                title="บันทึกรายงานบริการ"
                className="w-full py-2 text-sm font-semibold rounded-lg h-auto bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <DocumentCheckIcon className="h-4 w-4 mr-1.5" />
                บันทึกรายงาน
              </Button>
            )}
            {showCheckOutButton && (
              <Button
                onClick={() => onStatusChange(job.id, JobStatus.Completed)}
                title="เช็คเอาท์เพื่อจบงาน"
                variant="accent"
                className="w-full py-2 text-sm font-semibold rounded-lg h-auto shadow-sm"
              >
                <DocumentCheckIcon className="h-4 w-4 mr-1.5" />
                เช็คเอาท์
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

const CalendarView: React.FC<{
  jobs: FieldJob[];
  onJobClick: (job: FieldJob) => void;
}> = ({ jobs, onJobClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };
  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };
  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const monthYearString = currentDate.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });

  const daysOfWeek = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสฯ', 'ศุกร์', 'เสาร์'];

  const calendarGrid = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = [];

    // Days from previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    for (let i = 0; i < firstDayOfMonth; i++) {
      const date = new Date(
        year,
        month - 1,
        daysInPrevMonth - firstDayOfMonth + 1 + i
      );
      grid.push({ date, isCurrentMonth: false, isToday: false });
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isToday = date.getTime() === today.getTime();
      grid.push({ date, isCurrentMonth: true, isToday });
    }

    // Days from next month
    const gridEndIndex = grid.length;
    const remainingCells = 7 - (gridEndIndex % 7);
    if (remainingCells < 7) {
      for (let i = 1; i <= remainingCells; i++) {
        const date = new Date(year, month + 1, i);
        grid.push({ date, isCurrentMonth: false, isToday: false });
      }
    }

    return grid;
  }, [currentDate]);

  const getJobStatusStyle = (status: string) => {
    const statusUpper = String(status || '').toUpperCase();
    if (statusUpper === 'IN_PROGRESS' || statusUpper === 'INPROGRESS') return 'bg-amber-50 text-amber-700 border-l-amber-500';
    if (statusUpper === 'COMPLETED' || statusUpper === 'COMPLETE') return 'bg-green-50 text-green-700 border-l-green-500';
    if (statusUpper === 'CANCELLED') return 'bg-red-50 text-red-600 border-l-red-500';
    if (statusUpper === 'PENDING' || statusUpper === 'PLANNED') return 'bg-blue-50 text-blue-700 border-l-blue-500';
    return 'bg-primary/5 text-primary border-l-primary';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">{monthYearString}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrevMonth}
            variant="ghost"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 h-auto"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleGoToToday}
            className="text-sm font-semibold text-slate-600 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm h-auto"
          >
            วันนี้
          </Button>
          <Button
            onClick={handleNextMonth}
            variant="ghost"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 h-auto"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden">
          {/* Day Headers */}
          {daysOfWeek.map((day, i) => (
            <div
              key={day}
              className={`text-center py-3 text-xs font-semibold uppercase tracking-wider ${i === 0 ? 'bg-red-50/50 text-red-400' : i === 6 ? 'bg-blue-50/50 text-blue-400' : 'bg-slate-50 text-slate-500'}`}
            >
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarGrid.map((day, index) => {
            const jobsOnDay = jobs
              .filter((job) => {
                const jobDate = new Date(job.start_time);
                return (
                  jobDate.getFullYear() === day.date.getFullYear() &&
                  jobDate.getMonth() === day.date.getMonth() &&
                  jobDate.getDate() === day.date.getDate()
                );
              })
              .sort(
                (a, b) =>
                  new Date(a.start_time).getTime() -
                  new Date(b.start_time).getTime()
              );

            const dayOfWeek = day.date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <div
                key={index}
                className={`relative min-h-[120px] p-2 flex flex-col ${day.isCurrentMonth
                  ? isWeekend ? 'bg-slate-50/50' : 'bg-white'
                  : 'bg-slate-100/50'
                  } ${day.isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
              >
                <time
                  dateTime={day.date.toISOString().substring(0, 10)}
                  className={`text-sm font-semibold mb-1 ${day.isToday
                    ? 'bg-primary text-white rounded-full h-7 w-7 flex items-center justify-center mx-auto'
                    : day.isCurrentMonth
                      ? dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'text-slate-700'
                      : 'text-slate-300'
                    }`}
                >
                  {day.date.getDate()}
                </time>
                <div className="flex-grow overflow-y-auto space-y-1 scrollbar-thin">
                  {jobsOnDay.slice(0, 3).map((job) => (
                    <div
                      key={job.id}
                      onClick={() => onJobClick(job)}
                      className={`px-2 py-1 rounded text-xs cursor-pointer hover:shadow-sm transition-shadow border-l-2 ${getJobStatusStyle(job.api_status || job.status)}`}
                    >
                      <p className="font-semibold truncate">
                        <span className="text-[10px] opacity-70 mr-1">
                          {new Date(job.start_time).toTimeString().substring(0, 5)}
                        </span>
                        {job.customerName}
                      </p>
                    </div>
                  ))}
                  {jobsOnDay.length > 3 && (
                    <div className="text-xs text-center text-slate-400 font-medium pt-1">
                      +{jobsOnDay.length - 3} งาน
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface FieldOperationsProps {
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

import {
  AssessmentApi,
  CustomerApi,
  ProductApi,
  VehicleApi,
  JobApi,
  CategoryApi,
  ServiceReportApi,
  PackageApi,
} from '@/src/api';

const FieldOperations: React.FC<FieldOperationsProps> = ({
  users,
  jobs: initialJobs, // Rename prop to avoid conflict if we use state
  assessments: initialAssessments,
  contracts,
  quotations,
  // We will override these prop handlers with internal API calls
  products: initialProducts,
  onUpdateAssessment,
  onUpdateQuotation,
  customers: initialCustomers,
  warehouses: initialWarehouses,
}) => {
  const authUser = useCurrentUser();
  const currentUser = authUser as unknown as User;

  // Local state to manage data fetched from API
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
      const [warehousesRes, categoriesRes, reportsRes, productsRes, packagesRes] =
        await Promise.all([
          VehicleApi.getVehiclesWithUserJobs(),
          CategoryApi.getCategories({}),
          ServiceReportApi.getAll({ limit: 10 }),
          ProductApi.getProducts({ limit: 10 }),
          PackageApi.getPackages({ limit: 10 }),
        ]);

      // Ensure warehousesData is an array
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

      const debugItems: any[] = [];
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
            console.log('Status mapping', {
              id: job.id,
              api_status: rawStatus,
              mapped_status: mappedStatus,
            });

            debugItems.push({
              id: job.id,
              api_status: rawStatus,
              mapped_status: mappedStatus,
              start_date: job.start_date,
              end_date: job.end_date,
              customerName: customerName,
              vehicle_id: warehouse.id,
              primary_tech_id: job.primary_technician?.id || null,
            });

            const techniciansList = [];
            
            if (job.primary_technician) {
              techniciansList.push({ 
                ...job.primary_technician, 
                role: 'LEAD_TECH',
                name: job.primary_technician.first_name ? `${job.primary_technician.first_name} ${job.primary_technician.last_name || ''}`.trim() : job.primary_technician.name 
              });
            }

            if (Array.isArray(job.job_team_members) && job.job_team_members.length > 0) {
               const teamMembers = job.job_team_members.filter((t: any) => t.id !== job.primary_technician?.id);
               techniciansList.push(...teamMembers.map((t: any) => ({
                 ...t,
                 role: 'TECH',
                 name: t.first_name ? `${t.first_name} ${t.last_name || ''}`.trim() : t.name
               })));
            }
            
            // Fallback to existing technicians if API structure changes or different endpoint
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
              google_map_link: customer.google_map_link || undefined,
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
              quotation_id: undefined,
              operation_details: undefined,
              zone: undefined,
              group: undefined,
              road_line: undefined,
              sequence: undefined,
            } as any;
          })
      );

      console.groupCollapsed('FieldOperations: Jobs mapped from warehouses');
      console.table(debugItems);
      console.log('Total jobs:', jobsFromWarehouses.length);
      console.groupEnd();
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
        const status =
          newStatus === JobStatus.Completed
            ? 'COMPLETE'
            : 'PENDING';
        await JobApi.update(jobId, { status } as any);
      }
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleCancelJob = async (jobId: string, remark: string) => {
    try {
      // Assuming 'note' field exists or similar for cancellation remark,
      // if not we might need to adjust the type or field name.
      // Based on FieldJob interface, let's check if 'note' is appropriate.
      // If not, we might just update status.
      await JobApi.update(jobId, { status: JobStatus.Cancelled } as any);
      fetchData();
      setIsCancelModalOpen(false);
      setJobToCancel(null);
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };

  // Use these handlers instead of the ones passed from props or placeholder logic
  const onCreateJob = handleCreateJob;
  const onUpdateJob = handleUpdateJob;
  const onDeleteJob = async (jobId: string) => {
    try {
      await JobApi.delete(jobId);
      fetchData();
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const [activeTab, setActiveTab] = useState<
    'schedule' | 'work-schedule' | 'reports'
  >('schedule');
  const [view, setView] = useState<'list' | 'kanban' | 'calendar'>('kanban');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isEditAssessmentModalOpen, setIsEditAssessmentModalOpen] =
    useState(false);
  const [isTechAssessmentModalOpen, setIsTechAssessmentModalOpen] =
    useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<any | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<any | null>(null);

  const [jobToEdit, setJobToEdit] = useState<any | null>(null);
  const [jobForReport, setJobForReport] = useState<any | null>(null);
  const [reportFinalStatus, setReportFinalStatus] = useState<JobStatus>(
    JobStatus.Completed
  );
  const [assessmentForCheckout, setAssessmentForCheckout] =
    useState<Assessment | null>(null);
  const [jobBeingCheckedOut, setJobBeingCheckedOut] = useState<any | null>(
    null
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [reportCurrentPage, setReportCurrentPage] = useState(1);
  const [reportItemsPerPage, setReportItemsPerPage] = useState(10);

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const kanbanContainerRef = useRef<HTMLDivElement>(null);

  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [selectedAssessmentForJob, setSelectedAssessmentForJob] =
    useState<Assessment | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [selectedTechnicianId, setSelectedTechnicianId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // State for the new "ตารางงาน" tab
  const [scheduleDate, setScheduleDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [scheduleVehicleId, setScheduleVehicleId] = useState('');
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  const technicians = useMemo(
    () => users.filter((user) => {
      const roleName = typeof user.role === 'object' && user.role !== null
        ? (user.role as { name: string }).name
        : String(user.role || '');
      return roleName === UserRole.TECH;
    }),
    [users]
  );

  const createAutomaticReport = (job: any): ServiceReport => {
    const serviceTypesFromJob = [
      ...new Set(
        job.work_areas.flatMap((wa: any) =>
          wa.service_package.split(',').map((s: any) => s.trim())
        )
      ),
    ] as string[];

    return {
      created_at: new Date().toISOString(),
      check_in_time: job.actual_start_time
        ? new Date(job.actual_start_time).toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
        })
        : '',
      check_out_time: new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      service_actions: [],
      service_types: serviceTypesFromJob,
      termite: { status: 'absent' },
      ant: { applyGel: false },
      cockroach: { applyGel: false },
      rat: {
        glueTraps: false,
        mechanicalTraps: false,
        baitStations: false,
        refillBait: false,
      },
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

    // Filter by technician
    if (selectedTechnicianId !== 'all') {
      tempJobs = tempJobs.filter((job) =>
        job.technicians.some((tech) => tech.id === selectedTechnicianId)
      );
    }

    // Filter by search query
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (lowercasedQuery) {
      tempJobs = tempJobs.filter((job) => {
        const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
        const vehicle = safeWarehouses.find((w) => w.id === job.vehicle_id);
        const licensePlateMatch = (vehicle as any)?.license_plate
          ?.toLowerCase()
          .includes(lowercasedQuery);
        const dateMatch = formatThaiDate(job.start_time).includes(
          lowercasedQuery
        );
        return licensePlateMatch || dateMatch;
      });
    }

    return tempJobs;
  }, [reversedJobs, selectedTechnicianId, searchQuery]);

  // Check for any job in progress by the current user
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

    const vehicleColumns = serviceVehicles.map((vehicle) => {
      const license =
        (vehicle as any)?.license_plate ||
        (vehicle as any)?.vehicle?.vehicle_registration ||
        (vehicle as any)?.vehicle_registration;

      return {
        title: license ? `${vehicle.name} (${license})` : vehicle.name,
        id: vehicle.id,
        jobs: jobsForKanban.filter((j) => j.vehicle_id === vehicle.id),
      };
    }).filter(v => v.id);


    return vehicleColumns;
  }, [filteredJobs, warehouses]);

  const customerMap = useMemo(() => {
    return new Map((initialCustomers || []).map((c) => [c.id, c]));
  }, [initialCustomers]);

  const serviceReports = useMemo(
    () => [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [reports]
  );

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
    reportItemsPerPage * reportItemsPerPage
  );

  const scheduledJobsForTable = useMemo(() => {
    if (!scheduleVehicleId || !scheduleDate) return [];
    return jobs
      .filter(
        (job) =>
          job.vehicle_id === scheduleVehicleId &&
          new Date(job.start_time).toISOString().substring(0, 10) ===
          scheduleDate
      )
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
  }, [jobs, scheduleVehicleId, scheduleDate]);

  const getAccessStatus = (status: JobMainStatus) => {
    switch (status) {
      case JobMainStatus.IN_PROGRESS:
      case JobMainStatus.COMPLETE:
        return <span className="font-semibold text-green-600">เข้าได้</span>;
      case JobMainStatus.CANCELLED:
      case JobMainStatus.FAILED:
        return <span className="font-semibold text-red-600">ไม่ได้</span>;
      default:
        return <span className="text-slate-500">-</span>;
    }
  };

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
    const assessment = job.assessment_id
      ? (initialAssessments || []).find((a) => a.id === job.assessment_id)
      : null;

    setSelectedJob(job);
    setSelectedAssessmentForJob(assessment || null);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleWriteReport = (job: FieldJob) => {
    setJobForReport(job);
    setReportFinalStatus(
      job.status === JobMainStatus.COMPLETE ? JobStatus.Completed : JobStatus.Draft
    );
    setIsReportModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleCancel = (job: FieldJob) => {
    setJobToCancel(job);
    setIsCancelModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmCancel = (jobId: string, reason: string) => {
    const jobToUpdate = jobs.find((j) => j.id === jobId);
    if (jobToUpdate) {
      onUpdateJob({
        ...jobToUpdate,
        status: JobStatus.Cancelled,
        remarks: reason,
      });
    }
    setIsCancelModalOpen(false);
    setJobToCancel(null);
  };

  const handleDelete = (job: FieldJob) => {
    setJobToDelete(job);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
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

  const handleReportSubmit = async (
    jobId: string,
    reportData: ServiceReport,
    finalStatus: JobStatus,
    quotationId?: string
  ) => {
    try {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;

      // Prepare payload (ensure job_id and customer_id are set)
      const payload = {
        ...reportData,
        job_id: jobId,
        customer_id: job.customer_id,
      };

      // Remove id from payload if it exists to avoid issues with create/update if strict
      const { id, ...dataToSave } = payload;

      if (job.service_report && job.service_report.id) {
        await ServiceReportApi.update(job.service_report.id, dataToSave);
      } else {
        await ServiceReportApi.create(dataToSave);
      }

      // Update Job Status if needed
      // Note: Backend might handle status update when report is created/completed, 
      // but we ensure consistency here.
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
      if ((event.target as HTMLElement).closest('button[data-job-id]')) return;
      setOpenDropdownId(null);
      setSelectedJob(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const handleEditAssessment = async (job: FieldJob) => {
    if (!job.assessment_id) return;
    try {
      const assessment = await AssessmentApi.getById(job.assessment_id);
      setSelectedAssessmentForJob(assessment);
      setIsTechAssessmentModalOpen(true);
      setOpenDropdownId(null);
    } catch (error) {
      console.error('Error fetching assessment:', error);
    }
  };

  const handleTechUpdateAssessment = async (updatedAssessment: Assessment) => {
    try {
      await AssessmentApi.update(updatedAssessment.id, updatedAssessment);
      fetchData();
      setIsTechAssessmentModalOpen(false);
    } catch (error) {
      console.error('Error updating assessment:', error);
    }
  };

  const renderActions = () => {
    if (!selectedJob) return null;
    const { status } = selectedJob;

    const actions: {
      label: string;
      icon: React.FC<any>;
      onClick: () => void;
      isDanger?: boolean;
    }[] = [
        {
          label: 'ดูรายละเอียด',
          icon: EyeIcon,
          onClick: () => handleViewDetails(selectedJob),
        },
      ];

    if (
      status === JobStatus.Planned ||
      status === JobStatus.Pending ||
      status === JobStatus.InProgress ||
      status === JobStatus.Paused
    ) {
      actions.push({
        label: 'แก้ไขงาน',
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
        label: 'เขียน/แก้ไขรายงาน',
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

    if (
      authUser?.role &&
      [Role.CEO, Role.SUPERADMIN, Role.ADMIN].includes(authUser.role as Role)
    ) {
      actions.push({
        label: 'ลบงาน',
        icon: TrashIcon,
        onClick: () => handleDelete(selectedJob),
        isDanger: true,
      });
    }

    return actions.map((action, index) => (
      <a
        key={action.label}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          action.onClick();
        }}
        className={`flex items-center w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${action.isDanger
          ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
          } ${index === 0 ? '' : ''}`}
        role="menuitem"
      >
        <action.icon className={`mr-3 h-4 w-4 ${action.isDanger ? 'text-red-500' : 'text-slate-400'}`} aria-hidden="true" />
        <span>{action.label}</span>
      </a>
    ));
  };

  const scrollKanban = (direction: 'left' | 'right') => {
    if (kanbanContainerRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      kanbanContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Stats calculations
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

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-screen bg-slate-50/30">
        <div className="flex flex-col items-center gap-4">
          <LoadingIcon className="h-10 w-10 text-primary animate-spin" />
          <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ภาคสนาม</h1>
            <p className="mt-1 text-slate-600">จัดการและติดตามงานภาคสนามทั้งหมด</p>
          </div>
          {authUser?.role &&
            [Role.CEO, Role.SUPERADMIN, Role.ADMIN].includes(
              authUser.role as Role
            ) && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                variant="primary"
                className="shadow-md shadow-primary/20"
              >
                <PlusIcon className="h-5 w-5" />
                สร้างนัดหมาย
              </Button>
            )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <p className="text-2xl font-bold text-purple-800">{jobStats.pending}</p>
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

        {/* Toolbar */}
        <Card className="!p-4">
          <div className="flex flex-col gap-4">
            {/* Top Row: Search & Filters (Left) - Tabs (Right) */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              {/* Search & Filters Area */}
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
                    <Select
                      id="technician-filter"
                      value={selectedTechnicianId}
                      onChange={(e) => setSelectedTechnicianId(e.target.value)}
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

              {/* Tabs & View Toggles */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                 {/* View Toggles (Only for Schedule Tab) */}
                 {activeTab === 'schedule' && (
                  <div className="flex items-center rounded-lg bg-slate-100 p-1 order-2 lg:order-1">
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
                    <Button
                      onClick={() => setView('calendar')}
                      variant="ghost"
                      className={`p-2 rounded-md h-auto ${view === 'calendar' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
                      title="มุมมองปฏิทิน"
                    >
                      <CalendarDaysIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Tab Switcher */}
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

        <div className="flex-grow min-h-0">
          {activeTab === 'schedule' && view === 'kanban' && (
            <div className="relative">
              {/* Scroll Buttons */}
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

              {/* Kanban Board */}
              <div
                ref={kanbanContainerRef}
                className="flex gap-4 overflow-x-auto pb-4 px-2 scroll-smooth"
                style={{ scrollbarWidth: 'thin' }}
              >
                {kanbanColumns.length > 0 ? (
                  kanbanColumns.map((col) => (
                    <div
                      key={col.id}
                      className="bg-slate-100/80 rounded-xl p-4 w-80 flex-shrink-0 min-h-[400px]"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          <h3 className="font-bold text-slate-700 text-sm truncate" title={col.title}>
                            {col.title}
                          </h3>
                        </div>
                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-bold bg-white text-slate-600 shadow-sm border border-slate-200">
                          {col.jobs.length}
                        </span>
                      </div>

                      {/* Column Jobs */}
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
                              isAnyJobInProgressForCurrentUser={
                                isAnyJobInProgressForCurrentUser
                              }
                            />
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <CalendarDaysIcon className="h-10 w-10 mb-2 opacity-50" />
                            <p className="text-sm">ไม่มีงาน</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    <ViewColumnsIcon className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-lg font-medium">ไม่พบรถให้บริการ</p>
                    <p className="text-sm mt-1">กรุณาเพิ่มรถในระบบก่อน</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'schedule' && view === 'list' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        ลูกค้า/สถานที่
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        วัน-เวลา
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        บริการ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        ช่าง
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedJobs.length > 0 ? (
                      paginatedJobs.map((job, idx) => (
                        <tr
                          key={job.id}
                          className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                        >
                          <td className="px-6 py-4">
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
                                <p className="text-xs text-slate-500 truncate max-w-[200px]" title={job.address}>
                                  {job.address || '-'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-blue-50 rounded-md">
                                <JobDateIcon className="h-4 w-4 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {formatThaiDate(job.start_time)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(job.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                  {' - '}
                                  {new Date(job.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600">
                              {job.work_areas.map((wa) => wa.service_package).join(', ') || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <TechnicianIcon className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-600 truncate max-w-[120px]">
                                {job.technicians.map((t) => t.nick_name || t.name).join(', ') || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={job.api_status || job.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
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
                          <div className="flex flex-col items-center text-slate-400">
                            <ListBulletIcon className="h-12 w-12 mb-3 opacity-50" />
                            <p className="text-lg font-medium">ไม่พบข้อมูลงาน</p>
                            <p className="text-sm mt-1">ลองเปลี่ยนตัวกรองหรือสร้างนัดหมายใหม่</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {paginatedJobs.length > 0 && (
                <div className="border-t border-slate-100">
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
            <CalendarView jobs={filteredJobs} onJobClick={handleViewDetails} />
          )}

          {activeTab === 'reports' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        ลูกค้า/สถานที่
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        วัน-เวลา
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        บริการ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        ช่าง
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedReports.length > 0 ? (
                      paginatedReports.map((report, idx) => {
                        const job = jobs.find((j) => j.id === report.job_id);
                        const reportDate = report.report_date || report.created_at || '';
                        const customerName = report.customer_name || job?.customerName || '-';

                        return (
                          <tr
                            key={report.id}
                            className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                  <DocumentCheckIcon className="h-5 w-5 text-green-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {customerName}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate max-w-[200px]" title={job?.address}>
                                    {job?.address || '-'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
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
                                      : new Date(reportDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                                    }
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {report.service_types?.length ? (
                                  report.service_types.slice(0, 2).map((type, i) => (
                                    <span key={i} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                      {type}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm text-slate-400">-</span>
                                )}
                                {(report.service_types?.length || 0) > 2 && (
                                  <span className="text-xs text-slate-400">+{(report.service_types?.length || 0) - 2}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <TechnicianIcon className="h-4 w-4 text-slate-400" />
                                <span className="text-sm text-slate-600 truncate max-w-[120px]">
                                  {job?.technicians?.map(t => t.nick_name || t.name).join(', ') ||
                                    report.signatures?.technician_name ||
                                    '-'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={report.status || JobStatus.Draft} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  onClick={async () => {
                                    try {
                                      if (report.id) {
                                        setLoadingPdfId(report.id);
                                        const blob = await ServiceReportApi.getServiceReportPdfById(report.id);
                                        const url = window.URL.createObjectURL(blob);
                                        window.open(url, '_blank');
                                        setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                      } else {
                                        alert('ไม่พบ ID ของรายงาน');
                                      }
                                    } catch (error) {
                                      console.error('Error fetching PDF:', error);
                                      alert('ไม่สามารถดาวน์โหลด PDF ได้');
                                    } finally {
                                      setLoadingPdfId(null);
                                    }
                                  }}
                                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 h-auto"
                                  title="ดู PDF"
                                  disabled={loadingPdfId === report.id}
                                >
                                  {loadingPdfId === report.id ? (
                                    <LoadingIcon className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <span className="flex items-center gap-1.5">
                                      <EyeIcon className="h-4 w-4" />
                                      ดู PDF
                                    </span>
                                  )}
                                </Button>
                                <Button
                                  onClick={() => {
                                    if (job) {
                                      handleWriteReport(job);
                                    } else {
                                      alert('ไม่พบข้อมูลงานสำหรับรายงานนี้');
                                    }
                                  }}
                                  variant="ghost"
                                  className="p-2 h-auto rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                  title="แก้ไขรายงาน"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center text-slate-400">
                            <DocumentCheckIcon className="h-12 w-12 mb-3 opacity-50" />
                            <p className="text-lg font-medium">ไม่พบรายงานบริการ</p>
                            <p className="text-sm mt-1">รายงานจะแสดงเมื่อช่างทำรายงานบริการเสร็จสิ้น</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {paginatedReports.length > 0 && (
                <div className="border-t border-slate-100">
                  <Pagination
                    currentPage={reportCurrentPage}
                    totalItems={serviceReports.length}
                    itemsPerPage={reportItemsPerPage}
                    onPageChange={setReportCurrentPage}
                    onItemsPerPageChange={handleReportItemsPerPageChange}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'work-schedule' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Filters */}
              <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 max-w-xs">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <JobDateIcon className="h-4 w-4 inline-block mr-1.5 text-slate-400" />
                      วันที่
                    </label>
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="bg-white border-slate-200 shadow-sm"
                    />
                  </div>
                  <div className="flex-1 max-w-sm">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <TechnicianIcon className="h-4 w-4 inline-block mr-1.5 text-slate-400" />
                      ทะเบียนรถ
                    </label>
                    <Select
                      value={scheduleVehicleId}
                      onChange={(e) => setScheduleVehicleId(e.target.value)}
                      className="bg-white border-slate-200 shadow-sm"
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
                  {scheduleVehicleId && scheduleDate && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                      <span className="text-sm font-semibold text-primary">
                        {scheduledJobsForTable.length} งาน
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {scheduleVehicleId && scheduleDate ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider w-20">
                          เวลา
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                          ลูกค้า
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                          สถานที่
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider w-28">
                          เบอร์โทร
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider w-24">
                          เข้าบริการ
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider w-24">
                          ลายเซ็น
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider w-24">
                          เก็บเงิน
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                          หมายเหตุ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scheduledJobsForTable.length > 0 ? (
                        scheduledJobsForTable.map((job, idx) => {
                          const customer = customerMap.get(job.customer_id);
                          const statusUpper = String(job.status || '').toUpperCase();
                          const isCompleted = statusUpper === 'COMPLETED' || statusUpper === 'COMPLETE';
                          const isInProgress = statusUpper === 'IN_PROGRESS' || statusUpper === 'INPROGRESS';

                          return (
                            <tr
                              key={job.id}
                              className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold">
                                  {new Date(job.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm font-semibold text-slate-800">{job.customerName || '-'} </p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-slate-500 max-w-[200px] truncate" title={job.address}>
                                  {job.address || '-'}
                                </p>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-slate-600">{customer?.phone || '-'}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                {isCompleted || isInProgress ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                    ✓ เข้าได้
                                  </span>
                                ) : statusUpper === 'CANCELLED' ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                                    ✕ ไม่ได้
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                {job.service_report?.signatures?.customer ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                    ✓ เซ็นแล้ว
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className="text-slate-400">-</span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-slate-500 max-w-[150px] truncate" title={job.remarks}>
                                  {job.remarks || '-'}
                                </p>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center text-slate-400">
                              <CalendarDaysIcon className="h-12 w-12 mb-3 opacity-50" />
                              <p className="text-lg font-medium">ไม่มีงานในวันนี้</p>
                              <p className="text-sm mt-1">ไม่พบงานสำหรับรถคันนี้ในวันที่เลือก</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <CalendarDaysIcon className="h-10 w-10 text-slate-300" />
                  </div>
                  <p className="text-lg font-medium text-slate-500">เลือกตารางงาน</p>
                  <p className="text-sm mt-1">กรุณาเลือกวันที่และทะเบียนรถเพื่อดูตารางงาน</p>
                </div>
              )}
            </div>
          )}

          {selectedJob && openDropdownId && dropdownPosition && (
            <div
              ref={dropdownRef}
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
              }}
              className="absolute z-50 mt-2 w-52 rounded-xl shadow-xl bg-white ring-1 ring-black/5 focus:outline-none transform -translate-x-full border border-slate-100 overflow-hidden"
            >
              <div className="py-2" role="menu" aria-orientation="vertical">
                {renderActions()}
              </div>
            </div>
          )}
        </div>
      </div>
      <AddJobModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        contracts={contracts}
        onCreateJob={onCreateJob}
        jobs={jobs}
        users={users}
        warehouses={warehouses}
      />
      <JobDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        job={selectedJob}
        assessment={selectedAssessmentForJob}
        warehouses={warehouses}
      />
      <EditJobModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setJobToEdit(null);
        }}
        job={jobToEdit}
        onUpdateJob={onUpdateJob}
        jobs={jobs}
        users={users}
        warehouses={warehouses}
        currentUser={currentUser}
      />
      <CancelJobModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        job={jobToCancel}
        onConfirm={handleConfirmCancel}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบงาน"
        message={
          jobToDelete ? (
            <div className="text-slate-600">
              คุณแน่ใจหรือไม่ที่จะลบงาน{' '}
              <span className="font-semibold text-slate-800">
                {jobToDelete.customer_name}
              </span>{' '}
              ? การกระทำนี้ไม่สามารถย้อนกลับได้
            </div>
          ) : (
            'คุณแน่ใจหรือไม่ที่จะลบงานนี้?'
          )
        }
        confirmButtonText="ลบงาน"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
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
        quotations={quotations}
        currentUser={currentUser}
        products={initialProducts}
        jobs={jobs}
      />
      <EditAssessmentModal
        isOpen={isEditAssessmentModalOpen}
        onClose={() => setIsEditAssessmentModalOpen(false)}
        assessment={assessmentForCheckout}
        onUpdateAssessment={handleAssessmentUpdateOnCheckout}
        products={initialProducts}
        packages={packages}
        customers={initialCustomers}
        categories={categories}
      />

    </>
  );
};

export default FieldOperations;
