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
import { Customer } from '../../types/entity/customer.interface';
import { Warehouse } from '../../types/entity/inventory.interface';
import { Category } from '@/src/types/entity/category.interface';
import { JobStatus, WarehouseType } from '@/src/types';

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
} from '../../assets/icons/Icons';
import { AddJobModal } from '../../components/features/jobs/AddJobModal';
import { Pagination } from '../../components/common/Pagination';
import { JobDetailsModal } from '../../components/features/jobs/JobDetailsModal';
import { EditJobModal } from '../../components/features/jobs/EditJobModal';
import { formatThaiDate, formatThaiDateTime } from '@/src/utils/date';
import { ServiceReportModal } from '../../components/features/jobs/ServiceReportModal';
import { Select, Input, Button } from '../../components/common/FormControls';
import { EditAssessmentModal } from '../../components/features/assessments/EditAssessmentModal';
import { CancelJobModal } from '../../components/features/jobs/CancelJobModal';
import { FormField } from '../../components/common/FormControls';

const JobCard: React.FC<{
  job: FieldJob;
  onDropdownToggle: (
    event: React.MouseEvent<HTMLButtonElement>,
    jobId: string
  ) => void;
  onStatusChange: (jobId: string, newStatus: JobStatus) => void;
  onViewDetails: (job: FieldJob) => void;
  currentUser: User;
  isAnyJobInProgressForCurrentUser: boolean;
}> = ({
  job,
  onDropdownToggle,
  onStatusChange,
  onViewDetails,
  currentUser,
  isAnyJobInProgressForCurrentUser,
}) => {
  const currentUserId = (currentUser as any)?.id as string | undefined;

  const isAssignedToCurrentUser = useMemo(
    () =>
      !!currentUserId &&
      job.technicians.some((tech) => tech && tech.id === currentUserId),
    [job.technicians, currentUserId]
  );

  const showCheckInButton =
    isAssignedToCurrentUser && job.status === JobStatus.Planned;
  const showCheckOutButton =
    isAssignedToCurrentUser && job.status === JobStatus.InProgress;

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

  const hasActions = job.status !== JobStatus.Cancelled;

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between min-h-[220px]">
      <div>
        <div className="flex justify-between items-start">
          <div className="pr-2">
            <p className="text-base font-bold text-slate-800 leading-tight">
              {job.customer_name}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {job.work_areas.map((wa) => wa.service_package).join(', ')}
            </p>
          </div>
          <div className="relative flex-shrink-0">
            <Button
              data-job-id={job.id}
              onClick={(e) => onDropdownToggle(e, job.id)}
              variant="icon"
              className="-mr-1 -mt-1"
              title="ตัวเลือก"
            >
              <ManageIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <StatusBadge status={job.status} />
          </div>
          <div className="flex items-start text-sm text-slate-600">
            <MapPinIcon className="h-5 w-5 mr-3 mt-0.5 text-accent flex-shrink-0" />
            <span>{job.address}</span>
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <JobDateIcon className="h-5 w-5 mr-3 text-accent flex-shrink-0" />
            <span>{jobDate}</span>
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <JobTimeIcon className="h-5 w-5 mr-3 text-accent flex-shrink-0" />
            <span>{`${jobStartTime} - ${jobEndTime} น.`}</span>
          </div>
          <div className="flex items-center text-sm text-slate-600 overflow-hidden">
            <TechnicianIcon className="h-5 w-5 mr-3 text-accent flex-shrink-0" />
            <span
              className="truncate"
              title={job.technicians.map((t) => t.name).join(', ')}
            >
              {job.technicians.length > 0
                ? job.technicians.map((t) => t.name).join(', ')
                : 'ยังไม่มอบหมาย'}
            </span>
          </div>
        </div>
      </div>

      {hasActions && <div className="mt-4 pt-4 border-t border-slate-200" />}

      {hasActions && (
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => onViewDetails(job)}
            title="ดูรายละเอียดงาน"
            variant="outline"
            className="w-full py-2.5 font-bold"
          >
            <EyeIcon className="h-5 w-5" />
            <span>ดูรายละเอียด</span>
          </Button>

          {showCheckInButton && (
            <Button
              onClick={() => onStatusChange(job.id, JobStatus.InProgress)}
              disabled={isAnyJobInProgressForCurrentUser}
              title={checkInTooltip}
              variant="primary"
              className="w-full py-2.5 font-bold"
            >
              <PlayIcon className="h-5 w-5" />
              <span>เช็คอิน</span>
            </Button>
          )}
          {showCheckOutButton && (
            <Button
              onClick={() => onStatusChange(job.id, JobStatus.Completed)}
              title="เช็คเอาท์เพื่อจบงาน"
              variant="accent"
              className="w-full py-2.5 font-bold"
            >
              <DocumentCheckIcon className="h-5 w-5" />
              <span>เช็คเอาท์</span>
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

  const daysOfWeek = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

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

  const jobStatusColors: Record<string, string> = {
    [JobStatus.Planned]: 'bg-sky-100 text-sky-800 border-sky-300',
    [JobStatus.InProgress]: 'bg-amber-100 text-amber-800 border-amber-300',
    [JobStatus.Completed]: 'bg-green-100 text-green-800 border-green-300',
    [JobStatus.Cancelled]: 'bg-red-100 text-red-800 border-red-300',
    [JobStatus.Draft]: 'bg-slate-100 text-slate-600 border-slate-300',
    [JobStatus.Scheduled]: 'bg-blue-100 text-blue-800 border-blue-300',
    [JobStatus.Paused]: 'bg-gray-100 text-gray-700 border-gray-300',
    [JobStatus.Failed]: 'bg-red-100 text-red-700 border-red-300',
    [JobStatus.Pending]: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">{monthYearString}</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrevMonth}
            variant="ghost"
            className="p-2 rounded-md hover:bg-slate-100 text-slate-600 h-auto"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleGoToToday}
            variant="outline"
            className="text-sm font-semibold text-slate-700 px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 h-auto"
          >
            วันนี้
          </Button>
          <Button
            onClick={handleNextMonth}
            variant="ghost"
            className="p-2 rounded-md hover:bg-slate-100 text-slate-600 h-auto"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center py-2 bg-slate-50 text-xs font-medium text-slate-500 uppercase"
          >
            {day}
          </div>
        ))}

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

          return (
            <div
              key={index}
              className={`relative p-2 h-40 flex flex-col ${day.isCurrentMonth ? 'bg-white' : 'bg-slate-50'} overflow-hidden`}
            >
              <time
                dateTime={day.date.toISOString().substring(0, 10)}
                className={`text-sm font-semibold ${day.isToday ? 'bg-primary text-white rounded-full h-7 w-7 flex items-center justify-center' : day.isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}
              >
                {day.date.getDate()}
              </time>
              <div className="mt-1 flex-grow overflow-y-auto space-y-1">
                {jobsOnDay.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onJobClick(job)}
                    className={`p-1.5 rounded-md text-xs border cursor-pointer hover:ring-2 hover:ring-primary/50 ${jobStatusColors[job.status] || 'bg-slate-100'}`}
                  >
                    <p className="font-semibold truncate">
                      {new Date(job.start_time).toTimeString().substring(0, 5)}{' '}
                      {job.customer_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
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
  WarehouseApi,
  JobApi,
  CategoryApi,
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
  const currentUser = users[0];

  // Local state to manage data fetched from API
  const [jobs, setJobs] = useState<FieldJob[]>(initialJobs || []);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(
    initialWarehouses || []
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [warehousesRes, categoriesRes] =
        await Promise.all([
          WarehouseApi.getWarehouses({ type: WarehouseType.VEHICLE }),
          CategoryApi.getCategories({}),
        ]);

      const warehousesData = (warehousesRes as any).data || [];
      const categoriesData = (categoriesRes as any).data || [];
      setWarehouses(warehousesData);
      setCategories(categoriesData);

      const jobsFromWarehouses: FieldJob[] = warehousesData.flatMap(
        (warehouse: any) =>
          (warehouse.jobs || []).map((job: any) => {
            const customer = job.customer || {};
            const customerName =
              customer.first_name || customer.last_name
                ? `${customer.first_name || ''}${
                    customer.last_name && customer.last_name !== '-'
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

            return {
              id: job.id,
              assessment_id: job.assessment_id || undefined,
              contract_id: job.contract_id || undefined,
              customer_id: job.customer_id,
              customer_name: customerName,
              address,
              google_map_link: customer.google_map_link || undefined,
              start_time: job.start_date,
              end_time: job.end_date,
              primary_technician: job.primary_technician || null,
              technicians: [],
              work_areas: [],
              status: JobStatus.Planned,
              vehicle_id: warehouse.id,
              service_report: undefined,
              remarks: job.remark,
              quotation_id: undefined,
              operation_details: undefined,
              zone: undefined,
              group: undefined,
              road_line: undefined,
              sequence: undefined,
            } as FieldJob;
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
      const status =
        newStatus === JobStatus.InProgress
          ? 'IN_PROGRESS'
          : newStatus === JobStatus.Completed
          ? 'COMPLETE'
          : 'PENDING';
      await JobApi.update(jobId, { status } as any);
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
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<any | null>(null);

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

  const technicians = useMemo(
    () => users.filter((user) => user.role === UserRole.Technician),
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
        const vehicle = warehouses.find((w) => w.id === job.vehicle_id);
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
        j.status === JobStatus.InProgress &&
        j.technicians.some((tech) => tech.id === currentUser.id)
    );
  }, [jobs, currentUser]);

  const kanbanColumns = useMemo(() => {
    // Assuming 'type' exists on Warehouse but maybe not 'license_plate' directly typed or enum mismatch
    // Let's filter first
    const serviceVehicles = warehouses.filter(
      (w) => (w as any).type === 'รถ' || (w as any).type === 'VEHICLE'
    );

    const jobsForKanban = filteredJobs.filter(
      (j) => j.status === JobStatus.Planned || j.status === JobStatus.InProgress
    );

    const vehicleColumns = serviceVehicles.map((vehicle) => ({
      title: (vehicle as any).license_plate
        ? `${vehicle.name} (${(vehicle as any).license_plate})`
        : vehicle.name,
      id: vehicle.id,
      jobs: jobsForKanban.filter((j) => j.vehicle_id === vehicle.id),
    }));

    return vehicleColumns;
  }, [filteredJobs, warehouses]);

  const customerMap = useMemo(() => {
    return new Map((initialCustomers || []).map((c) => [c.id, c]));
  }, [initialCustomers]);

  const serviceReports = useMemo(
    () => reversedJobs.filter((j) => j.service_report),
    [reversedJobs]
  );

  const scheduleJobs = useMemo(
    () =>
      filteredJobs.filter(
        (j) =>
          j.status !== JobStatus.Completed &&
          j.status !== JobStatus.Cancelled &&
          j.status !== JobStatus.Draft
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

  const getAccessStatus = (status: JobStatus) => {
    switch (status) {
      case JobStatus.InProgress:
      case JobStatus.Completed:
        return <span className="font-semibold text-green-600">เข้าได้</span>;
      case JobStatus.Cancelled:
      case JobStatus.Failed:
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
      job.status === JobStatus.Completed ? JobStatus.Completed : JobStatus.Draft
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

  const handleReportSubmit = (
    jobId: string,
    reportData: ServiceReport,
    finalStatus: JobStatus,
    quotationId?: string
  ) => {
    const jobToUpdate = jobs.find((j) => j.id === jobId);
    if (jobToUpdate) {
      const updatedJob = {
        ...jobToUpdate,
        service_report: reportData,
        status: finalStatus,
        quotation_id: quotationId,
        actual_end_time:
          finalStatus === JobStatus.Completed
            ? new Date().toISOString()
            : jobToUpdate.actual_end_time,
      };
      onUpdateJob(updatedJob);
      if (quotationId) {
        const quote = quotations.find((q) => q.id === quotationId);
        if (quote && quote.status === Status.Draft) {
          // Assuming Quote Status is still core.Status
          onUpdateQuotation({ ...quote, status: Status.Sent });
        }
      }
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
      status === JobStatus.InProgress ||
      status === JobStatus.Paused
    ) {
      actions.push({
        label: 'แก้ไขงาน',
        icon: PencilIcon,
        onClick: () => handleEdit(selectedJob),
      });
    }

    if (status === JobStatus.Completed || status === JobStatus.Draft) {
      actions.push({
        label: 'เขียน/แก้ไขรายงาน',
        icon: DocumentCheckIcon,
        onClick: () => handleWriteReport(selectedJob),
      });
    }

    if (status === JobStatus.Planned || status === JobStatus.InProgress) {
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
        className={`flex items-center w-full text-left px-4 py-2 text-sm ${action.isDanger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}
        role="menuitem"
      >
        <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
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

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ภาคสนาม</h1>
            <p className="mt-1 text-slate-600">
              จัดการและติดตามงานภาคสนามทั้งหมด
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-full sm:w-auto">
              <Input
                type="search"
                placeholder="ค้นหาทะเบียนรถ, วันที่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64"
              />
            </div>
            <div className="flex items-center rounded-lg bg-slate-200 p-1">
              <Button
                onClick={() => setView('list')}
                variant="ghost"
                className={`px-3 py-1 text-sm font-medium rounded-md h-auto ${view === 'list' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`}
                title="มุมมองรายการ"
              >
                <ListBulletIcon className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => setView('kanban')}
                variant="ghost"
                className={`px-3 py-1 text-sm font-medium rounded-md h-auto ${view === 'kanban' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`}
                title="มุมมอง Kanban"
              >
                <ViewColumnsIcon className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => setView('calendar')}
                variant="ghost"
                className={`px-3 py-1 text-sm font-medium rounded-md h-auto ${view === 'calendar' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`}
                title="มุมมองปฏิทิน"
              >
                <CalendarDaysIcon className="h-5 w-5" />
              </Button>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)} variant="primary">
              <PlusIcon className="h-5 w-5" />
              สร้างนัดหมาย
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex border-b border-slate-200">
            <Button
              onClick={() => setActiveTab('schedule')}
              variant="ghost"
              className={`py-2 px-4 text-sm font-medium rounded-none h-auto ${activeTab === 'schedule' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              นัดหมาย
            </Button>
            <Button
              onClick={() => setActiveTab('reports')}
              variant="ghost"
              className={`py-2 px-4 text-sm font-medium rounded-none h-auto ${activeTab === 'reports' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              รายงานบริการ
            </Button>
            <Button
              onClick={() => setActiveTab('work-schedule')}
              variant="ghost"
              className={`py-2 px-4 text-sm font-medium rounded-none h-auto ${activeTab === 'work-schedule' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ตารางงาน
            </Button>
          </div>
        </div>

        {activeTab === 'schedule' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
            <label
              htmlFor="technician-filter"
              className="text-sm font-medium text-slate-700 flex-shrink-0"
            >
              กรองโดยช่าง:
            </label>
            <div className="w-full sm:w-auto sm:max-w-xs">
              <Select
                id="technician-filter"
                value={selectedTechnicianId}
                onChange={(e) => setSelectedTechnicianId(e.target.value)}
                className="w-full"
              >
                <option value="all">ทั้งหมด</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        <div className="flex-grow min-h-0">
          {activeTab === 'schedule' && view === 'kanban' && (
            <div className="relative">
              <Button
                onClick={() => scrollKanban('left')}
                variant="ghost"
                className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-md border border-slate-200 h-auto"
              >
                <ChevronLeftIcon className="h-5 w-5 text-slate-600" />
              </Button>
              <div
                ref={kanbanContainerRef}
                className="flex space-x-4 overflow-x-auto pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
              >
                {kanbanColumns.map((col) => (
                  <div
                    key={col.id}
                    className="bg-slate-100 rounded-lg p-4 w-80 flex-shrink-0"
                  >
                    <h2 className="font-semibold text-slate-700 mb-4 flex items-center justify-between">
                      <span className="truncate">{col.title}</span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-sky-100 text-sky-800">
                        {col.jobs.length}
                      </span>
                    </h2>
                    <div className="space-y-3">
                      {col.jobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          onDropdownToggle={handleDropdownToggle}
                          onStatusChange={handleStatusChange}
                          onViewDetails={handleViewDetails}
                          currentUser={currentUser}
                          isAnyJobInProgressForCurrentUser={
                            isAnyJobInProgressForCurrentUser
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'schedule' && view === 'list' && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        ลูกค้า/สถานที่
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        วัน-เวลา
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        บริการ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        ช่าง
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {paginatedJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">
                            {job.customer_name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {job.address}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {formatThaiDate(job.start_time)}
                          </div>
                          <div className="text-sm text-slate-500">
                            {new Date(job.start_time).toLocaleTimeString(
                              'th-TH',
                              { hour: '2-digit', minute: '2-digit' }
                            )}{' '}
                            -{' '}
                            {new Date(job.end_time).toLocaleTimeString(
                              'th-TH',
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {job.work_areas
                            .map((wa) => wa.service_package)
                            .join(', ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {job.technicians.map((t) => t.name).join(', ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            data-job-id={job.id}
                            onClick={(e) => handleDropdownToggle(e, job.id)}
                            variant="icon"
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <ManageIcon className="h-5 w-5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalItems={scheduleJobs.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          )}

          {activeTab === 'schedule' && view === 'calendar' && (
            <CalendarView jobs={filteredJobs} onJobClick={handleViewDetails} />
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          วันที่
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          ลูกค้า
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          บริการ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          สถานะรายงาน
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          จัดการ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {paginatedReports.length > 0 ? (
                        paginatedReports.map((job) => (
                          <tr key={job.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {formatThaiDateTime(
                                job.service_report?.created_at || ''
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900">
                                {job.customer_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {job.service_report?.service_types.join(', ')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge
                                status={
                                  job.service_report?.status || JobStatus.Draft
                                }
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button
                                onClick={() => handleWriteReport(job)}
                                variant="ghost"
                                className="text-primary hover:text-primary-dark"
                              >
                                ดู/แก้ไข
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-10 text-center text-slate-500"
                          >
                            ไม่พบรายงานบริการ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={reportCurrentPage}
                  totalItems={serviceReports.length}
                  itemsPerPage={reportItemsPerPage}
                  onPageChange={setReportCurrentPage}
                  onItemsPerPageChange={handleReportItemsPerPageChange}
                />
              </div>
            </div>
          )}

          {activeTab === 'work-schedule' && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
                <FormField label="วันที่">
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </FormField>
                <FormField label="ทะเบียนรถ">
                  <Select
                    value={scheduleVehicleId}
                    onChange={(e) => setScheduleVehicleId(e.target.value)}
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
                </FormField>
              </div>

              {scheduleVehicleId && scheduleDate ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-24">
                          เวลา
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          ลูกค้า
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          สถานที่
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          เบอร์โทร
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          เข้าบริการ
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          ลายเซ็น
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          เก็บเงิน
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          หมายเหตุ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {scheduledJobsForTable.length > 0 ? (
                        scheduledJobsForTable.map((job) => {
                          const customer = customerMap.get(job.customer_id);
                          return (
                            <tr key={job.id}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                                {new Date(job.start_time).toLocaleTimeString(
                                  'th-TH',
                                  { hour: '2-digit', minute: '2-digit' }
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                                {job.customer_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">
                                {job.address}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                                {customer?.phone || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {getAccessStatus(job.status)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                                {job.service_report?.signatures?.customer
                                  ? 'เซ็นแล้ว'
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                                {/* TODO: Check Invoice Status */}-
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">
                                {job.remarks || '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-6 py-10 text-center text-slate-500"
                          >
                            ไม่มีงานในช่วงเวลานี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  กรุณาเลือกวันที่และทะเบียนรถเพื่อดูตารางงาน
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
              className="absolute z-50 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none transform -translate-x-full"
            >
              <div className="py-1" role="menu" aria-orientation="vertical">
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
        customers={initialCustomers}
        categories={[]}
      />
    </>
  );
};

export default FieldOperations;
