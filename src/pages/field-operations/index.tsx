import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
// FIX: Add 'Customer' to the import list to resolve missing type.
import { Status, FieldJob, Assessment, Contract, Product, User, UserRole, ServiceReport, Quotation, Customer } from '../../types';
import { PlusIcon, ListBulletIcon, ViewColumnsIcon, ManageIcon, EyeIcon, PencilIcon, TrashIcon, XCircleIcon, MapPinIcon, PlayIcon, DocumentCheckIcon, TechnicianIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, JobDateIcon, JobTimeIcon } from '../../assets/icons/Icons';
import { AddJobModal } from '../../components/features/jobs/AddJobModal';
import { Pagination } from '../../components/common/Pagination';
import { JobDetailsModal } from '../../components/features/jobs/JobDetailsModal';
import { EditJobModal } from '../../components/features/jobs/EditJobModal';
import { MOCK_WAREHOUSES, formatThaiDate, formatThaiDateTime } from '../../constants';
import { ServiceReportModal } from '../../components/features/jobs/ServiceReportModal';
import { Select, Input, Button } from '../../components/common/FormControls';
import { EditAssessmentModal } from '../../components/features/assessments/EditAssessmentModal';
import { CancelJobModal } from '../../components/features/jobs/CancelJobModal';
import { FormField } from '../../components/common/FormControls';




const JobCard: React.FC<{
    job: FieldJob;
    onDropdownToggle: (event: React.MouseEvent<HTMLButtonElement>, jobId: string) => void;
    onStatusChange: (jobId: string, newStatus: Status) => void;
    onViewDetails: (job: FieldJob) => void;
    currentUser: User;
    isAnyJobInProgressForCurrentUser: boolean;
}> = ({ job, onDropdownToggle, onStatusChange, onViewDetails, currentUser, isAnyJobInProgressForCurrentUser }) => {

    const isAssignedToCurrentUser = useMemo(() =>
        job.technicians.some(tech => tech.id === currentUser.id),
        [job.technicians, currentUser.id]);

    const showCheckInButton = isAssignedToCurrentUser && job.status === Status.Planned;
    const showCheckOutButton = isAssignedToCurrentUser && job.status === Status.InProgress;

    let checkInTooltip = "";
    if (isAssignedToCurrentUser) {
        if (isAnyJobInProgressForCurrentUser) {
            checkInTooltip = "คุณกำลังเช็คอินในงานอื่นอยู่";
        } else {
            checkInTooltip = "เช็คอินเพื่อเริ่มงาน";
        }
    }

    const jobDate = formatThaiDate(job.startTime);
    const jobStartTime = new Date(job.startTime).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    });
    const jobEndTime = new Date(job.endTime).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const hasActions = job.status !== Status.Cancelled;

    return (
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between min-h-[220px]">
            <div>
                <div className="flex justify-between items-start">
                    <div className="pr-2">
                        <p className="text-base font-bold text-slate-800 leading-tight">{job.customerName}</p>
                        <p className="text-sm text-slate-500 mt-1">{job.workAreas.map(wa => wa.servicePackage).join(', ')}</p>
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
                        <span className="truncate" title={job.technicians.map(t => t.name).join(', ')}>
                            {job.technicians.length > 0 ? job.technicians.map(t => t.name).join(', ') : 'ยังไม่มอบหมาย'}
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
                            onClick={() => onStatusChange(job.id, Status.InProgress)}
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
                            onClick={() => onStatusChange(job.id, Status.Completed)}
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

const CalendarView: React.FC<{ jobs: FieldJob[]; onJobClick: (job: FieldJob) => void; }> = ({ jobs, onJobClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };
    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };
    const handleGoToToday = () => {
        setCurrentDate(new Date());
    };

    const monthYearString = currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

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
            const date = new Date(year, month - 1, daysInPrevMonth - firstDayOfMonth + 1 + i);
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

    const jobStatusColors: Record<Status, string> = {
        [Status.Planned]: 'bg-sky-100 text-sky-800 border-sky-300',
        [Status.InProgress]: 'bg-amber-100 text-amber-800 border-amber-300',
        [Status.Completed]: 'bg-green-100 text-green-800 border-green-300',
        [Status.Cancelled]: 'bg-red-100 text-red-800 border-red-300',
        [Status.Draft]: 'bg-slate-100 text-slate-600 border-slate-300',
        [Status.Scheduled]: 'bg-blue-100 text-blue-800 border-blue-300',
        [Status.Paused]: 'bg-gray-100 text-gray-700 border-gray-300',
        [Status.Converted]: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        [Status.Failed]: 'bg-red-100 text-red-700 border-red-300',
        [Status.Pending]: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        [Status.PendingApproval]: 'bg-orange-100 text-orange-700 border-orange-300',
        [Status.Approved]: 'bg-green-100 text-green-700 border-green-300',
        [Status.Rejected]: 'bg-red-100 text-red-700 border-red-300',
        [Status.Paid]: 'bg-green-100 text-green-700 border-green-300',
        [Status.Overdue]: 'bg-rose-100 text-rose-700 border-rose-300',
        [Status.Sent]: 'bg-indigo-100 text-indigo-700 border-indigo-300',
        [Status.UnderReview]: 'bg-purple-100 text-purple-700 border-purple-300',
        [Status.Revise]: 'bg-pink-100 text-pink-700 border-pink-300',
        [Status.Closed]: 'bg-slate-300 text-slate-800 border-slate-400',
    };

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">{monthYearString}</h2>
                <div className="flex items-center gap-2">
                    <Button onClick={handlePrevMonth} variant="ghost" className="p-2 rounded-md hover:bg-slate-100 text-slate-600 h-auto"><ChevronLeftIcon className="h-5 w-5" /></Button>
                    <Button onClick={handleGoToToday} variant="outline" className="text-sm font-semibold text-slate-700 px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 h-auto">วันนี้</Button>
                    <Button onClick={handleNextMonth} variant="ghost" className="p-2 rounded-md hover:bg-slate-100 text-slate-600 h-auto"><ChevronRightIcon className="h-5 w-5" /></Button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {daysOfWeek.map(day => (
                    <div key={day} className="text-center py-2 bg-slate-50 text-xs font-medium text-slate-500 uppercase">{day}</div>
                ))}

                {calendarGrid.map((day, index) => {
                    const jobsOnDay = jobs.filter(job => {
                        const jobDate = new Date(job.startTime);
                        return jobDate.getFullYear() === day.date.getFullYear() &&
                            jobDate.getMonth() === day.date.getMonth() &&
                            jobDate.getDate() === day.date.getDate();
                    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

                    return (
                        <div key={index} className={`relative p-2 h-40 flex flex-col ${day.isCurrentMonth ? 'bg-white' : 'bg-slate-50'} overflow-hidden`}>
                            <time
                                dateTime={day.date.toISOString().substring(0, 10)}
                                className={`text-sm font-semibold ${day.isToday ? 'bg-primary text-white rounded-full h-7 w-7 flex items-center justify-center' : day.isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}
                            >
                                {day.date.getDate()}
                            </time>
                            <div className="mt-1 flex-grow overflow-y-auto space-y-1">
                                {jobsOnDay.map(job => (
                                    <div
                                        key={job.id}
                                        onClick={() => onJobClick(job)}
                                        className={`p-1.5 rounded-md text-xs border cursor-pointer hover:ring-2 hover:ring-primary/50 ${jobStatusColors[job.status] || 'bg-slate-100'}`}
                                    >
                                        <p className="font-semibold truncate">{new Date(job.startTime).toTimeString().substring(0, 5)} {job.customerName}</p>
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


// FIX: Add missing 'customers' and 'onCreateQuotation' props to match what is passed from App.tsx, resolving the type error in App.tsx.
interface FieldOperationsProps {
    users: User[];
    jobs: FieldJob[];
    assessments: Assessment[];
    contracts: Contract[];
    quotations: Quotation[];
    onCreateJob: (jobData: Omit<FieldJob, 'id'>) => void;
    onUpdateJob: (job: FieldJob) => void;
    onDeleteJob: (jobId: string) => void;
    products: Product[];
    onUpdateAssessment: (assessment: Assessment) => void;
    onUpdateQuotation: (quotation: Quotation) => void;
    customers: Customer[];
    onCreateQuotation: (quotationData: Omit<Quotation, 'id'>, assessmentId?: string) => void;
}

const FieldOperations: React.FC<FieldOperationsProps> = ({ users, jobs, assessments, contracts, quotations, onCreateJob, onUpdateJob, onDeleteJob, products, onUpdateAssessment, onUpdateQuotation, customers }) => {
    const currentUser = users[0];

    const [activeTab, setActiveTab] = useState<'schedule' | 'work-schedule' | 'reports'>('schedule');
    const [view, setView] = useState<'list' | 'kanban' | 'calendar'>('kanban');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isEditAssessmentModalOpen, setIsEditAssessmentModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [jobToCancel, setJobToCancel] = useState<FieldJob | null>(null);

    const [jobToEdit, setJobToEdit] = useState<FieldJob | null>(null);
    const [jobForReport, setJobForReport] = useState<FieldJob | null>(null);
    const [reportFinalStatus, setReportFinalStatus] = useState<Status>(Status.Completed);
    const [assessmentForCheckout, setAssessmentForCheckout] = useState<Assessment | null>(null);
    const [jobBeingCheckedOut, setJobBeingCheckedOut] = useState<FieldJob | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [reportCurrentPage, setReportCurrentPage] = useState(1);
    const [reportItemsPerPage, setReportItemsPerPage] = useState(10);

    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const kanbanContainerRef = useRef<HTMLDivElement>(null);

    const [selectedJob, setSelectedJob] = useState<FieldJob | null>(null);
    const [selectedAssessmentForJob, setSelectedAssessmentForJob] = useState<Assessment | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const [selectedTechnicianId, setSelectedTechnicianId] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // State for the new "ตารางงาน" tab
    const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().substring(0, 10));
    const [scheduleVehicleId, setScheduleVehicleId] = useState('');

    const technicians = useMemo(() => users.filter(user => user.role === UserRole.Technician), [users]);

    const createAutomaticReport = (job: FieldJob): ServiceReport => {
        const serviceTypesFromJob = [
            ...new Set(job.workAreas.flatMap(wa => wa.servicePackage.split(',').map(s => s.trim())))
        ];

        return {
            createdAt: new Date().toISOString(),
            checkInTime: job.actualStartTime
                ? new Date(job.actualStartTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                : '',
            checkOutTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            serviceTypes: serviceTypesFromJob,
            serviceActions: [],
            termite: { status: 'absent' },
            ant: { applyGel: false },
            cockroach: { applyGel: false },
            rat: { glueTraps: false, mechanicalTraps: false, baitStations: false, refillBait: false },
            lizard: { placeTraps: false },
            nextAppointment: { notes: '', reasons: [] },
            notes: 'รายงานสร้างโดยอัตโนมัติเมื่อเช็คเอาท์',
            status: Status.Draft,
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
            tempJobs = tempJobs.filter(job =>
                job.technicians.some(tech => tech.id === selectedTechnicianId)
            );
        }

        // Filter by search query
        const lowercasedQuery = searchQuery.toLowerCase().trim();
        if (lowercasedQuery) {
            tempJobs = tempJobs.filter(job => {
                const vehicle = MOCK_WAREHOUSES.find(w => w.id === job.vehicleId);
                const licensePlateMatch = vehicle?.licensePlate?.toLowerCase().includes(lowercasedQuery);
                const dateMatch = formatThaiDate(job.startTime).includes(lowercasedQuery);
                return licensePlateMatch || dateMatch;
            });
        }

        return tempJobs;
    }, [reversedJobs, selectedTechnicianId, searchQuery]);

    const isAnyJobInProgressForCurrentUser = useMemo(() =>
        jobs.some(j =>
            j.status === Status.InProgress &&
            j.technicians.some(tech => tech.id === currentUser.id)
        ),
        [jobs, currentUser.id]);


    const kanbanColumns = useMemo(() => {
        const serviceVehicles = MOCK_WAREHOUSES.filter(w => w.type === 'รถ');
        const jobsForKanban = filteredJobs.filter(j => j.status === Status.Planned || j.status === Status.InProgress);

        const vehicleColumns = serviceVehicles.map(vehicle => ({
            title: vehicle.licensePlate ? `${vehicle.name} (${vehicle.licensePlate})` : vehicle.name,
            id: vehicle.id,
            jobs: jobsForKanban.filter(j => j.vehicleId === vehicle.id),
        }));

        return vehicleColumns;
    }, [filteredJobs]);

    const serviceReports = useMemo(() =>
        reversedJobs.filter(j => j.serviceReport),
        [reversedJobs]);

    const scheduleJobs = useMemo(() =>
        filteredJobs.filter(j => j.status !== Status.Completed && j.status !== Status.Cancelled && j.status !== Status.Draft),
        [filteredJobs]);

    const paginatedJobs = scheduleJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const paginatedReports = serviceReports.slice((reportCurrentPage - 1) * reportItemsPerPage, reportItemsPerPage * reportItemsPerPage);

    const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

    const scheduledJobsForTable = useMemo(() => {
        if (!scheduleVehicleId || !scheduleDate) return [];
        return jobs
            .filter(job =>
                job.vehicleId === scheduleVehicleId &&
                new Date(job.startTime).toISOString().substring(0, 10) === scheduleDate
            )
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }, [jobs, scheduleVehicleId, scheduleDate]);

    const getAccessStatus = (status: Status) => {
        switch (status) {
            case Status.InProgress:
            case Status.Completed:
                return <span className="font-semibold text-green-600">เข้าได้</span>;
            case Status.Cancelled:
            case Status.Failed:
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

    const handleStatusChange = (jobId: string, newStatus: Status) => {
        const jobToUpdate = jobs.find(j => j.id === jobId);
        if (!jobToUpdate) return;

        if (newStatus === Status.InProgress) { // Check-in
            onUpdateJob({ ...jobToUpdate, status: newStatus, actualStartTime: new Date().toISOString() });
        } else if (newStatus === Status.Completed) { // Check-out flow: open Service Report modal
            setJobForReport(jobToUpdate);
            setReportFinalStatus(Status.Completed);
            setIsReportModalOpen(true);

        } else {
            onUpdateJob({ ...jobToUpdate, status: newStatus });
        }
    };

    const handleAssessmentUpdateOnCheckout = (updatedAssessment: Assessment) => {
        onUpdateAssessment(updatedAssessment);
        setIsEditAssessmentModalOpen(false);
        if (jobBeingCheckedOut) {
            const newReport = createAutomaticReport(jobBeingCheckedOut);
            onUpdateJob({
                ...jobBeingCheckedOut,
                status: Status.Completed,
                actualEndTime: new Date().toISOString(),
                serviceReport: newReport,
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
        const assessment = job.assessmentId ? assessments.find(a => a.id === job.assessmentId) : null;
        setSelectedJob(job);
        setSelectedAssessmentForJob(assessment || null);
        setIsDetailsModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleWriteReport = (job: FieldJob) => {
        setJobForReport(job);
        setReportFinalStatus(job.status === Status.Completed ? Status.Completed : Status.Draft);
        setIsReportModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleCancel = (job: FieldJob) => {
        setJobToCancel(job);
        setIsCancelModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleConfirmCancel = (jobId: string, reason: string) => {
        const jobToUpdate = jobs.find(j => j.id === jobId);
        if (jobToUpdate) {
            onUpdateJob({ ...jobToUpdate, status: Status.Cancelled, remarks: reason });
        }
        setIsCancelModalOpen(false);
        setJobToCancel(null);
    };

    const handleReportSubmit = (jobId: string, reportData: ServiceReport, finalStatus: Status, quotationId?: string) => {
        const jobToUpdate = jobs.find(j => j.id === jobId);
        if (jobToUpdate) {
            const updatedJob = {
                ...jobToUpdate,
                serviceReport: reportData,
                status: finalStatus,
                quotationId,
                actualEndTime: finalStatus === Status.Completed ? new Date().toISOString() : jobToUpdate.actualEndTime,
            };
            onUpdateJob(updatedJob);
            if (quotationId) {
                const quote = quotations.find(q => q.id === quotationId);
                if (quote && quote.status === Status.Draft) {
                    onUpdateQuotation({ ...quote, status: Status.Sent });
                }
            }
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
            setSelectedJob(jobs.find(j => j.id === jobId) || null);
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
            if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
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

        const actions: { label: string; icon: React.FC<any>; onClick: () => void; isDanger?: boolean }[] = [
            { label: 'ดูรายละเอียด', icon: EyeIcon, onClick: () => handleViewDetails(selectedJob) },
        ];

        if (status === Status.Planned || status === Status.InProgress || status === Status.Paused) {
            actions.push({ label: 'แก้ไขงาน', icon: PencilIcon, onClick: () => handleEdit(selectedJob) });
        }

        if (status === Status.Completed || status === Status.Draft) {
            actions.push({ label: 'เขียน/แก้ไขรายงาน', icon: DocumentCheckIcon, onClick: () => handleWriteReport(selectedJob) });
        }

        if (status === Status.Planned || status === Status.InProgress) {
            actions.push({ label: 'ยกเลิกงาน', icon: XCircleIcon, onClick: () => handleCancel(selectedJob), isDanger: true });
        }

        return actions.map(action => (
            <a key={action.label} href="#" onClick={(e) => { e.preventDefault(); action.onClick(); }} className={`flex items-center w-full text-left px-4 py-2 text-sm ${action.isDanger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`} role="menuitem">
                <action.icon className="mr-3 h-5 w-5" aria-hidden="true" />
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


    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
                <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">ภาคสนาม</h1>
                        <p className="mt-1 text-slate-600">จัดการและติดตามงานภาคสนามทั้งหมด</p>
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
                            <Button onClick={() => setView('list')} variant="ghost" className={`px-3 py-1 text-sm font-medium rounded-md h-auto ${view === 'list' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`} title="มุมมองรายการ"><ListBulletIcon className="h-5 w-5" /></Button>
                            <Button onClick={() => setView('kanban')} variant="ghost" className={`px-3 py-1 text-sm font-medium rounded-md h-auto ${view === 'kanban' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`} title="มุมมอง Kanban"><ViewColumnsIcon className="h-5 w-5" /></Button>
                            <Button onClick={() => setView('calendar')} variant="ghost" className={`px-3 py-1 text-sm font-medium rounded-md h-auto ${view === 'calendar' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'}`} title="มุมมองปฏิทิน"><CalendarDaysIcon className="h-5 w-5" /></Button>
                        </div>
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            variant="primary">
                            <PlusIcon className="h-5 w-5" />
                            สร้างนัดหมาย
                        </Button>
                    </div>
                </div>

                <div className="mb-4">
                    <div className="flex border-b border-slate-200">
                        <Button onClick={() => setActiveTab('schedule')} variant="ghost" className={`py-2 px-4 text-sm font-medium rounded-none h-auto ${activeTab === 'schedule' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}>นัดหมาย</Button>
                        <Button onClick={() => setActiveTab('reports')} variant="ghost" className={`py-2 px-4 text-sm font-medium rounded-none h-auto ${activeTab === 'reports' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}>รายงานบริการ</Button>
                        <Button onClick={() => setActiveTab('work-schedule')} variant="ghost" className={`py-2 px-4 text-sm font-medium rounded-none h-auto ${activeTab === 'work-schedule' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}>ตารางงาน</Button>
                    </div>
                </div>

                {activeTab === 'schedule' && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                        <label htmlFor="technician-filter" className="text-sm font-medium text-slate-700 flex-shrink-0">กรองโดยช่าง:</label>
                        <div className="w-full sm:w-auto sm:max-w-xs">
                            <Select id="technician-filter" value={selectedTechnicianId} onChange={e => setSelectedTechnicianId(e.target.value)} className="w-full">
                                <option value="all">ทั้งหมด</option>
                                {technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                            </Select>
                        </div>
                    </div>
                )}

                <div className="flex-grow min-h-0">
                    {activeTab === 'schedule' && view === 'kanban' && (
                        <div className="relative">
                            <Button onClick={() => scrollKanban('left')} variant="ghost" className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-md border border-slate-200 h-auto"><ChevronLeftIcon className="h-5 w-5 text-slate-600" /></Button>
                            <div ref={kanbanContainerRef} className="flex space-x-4 overflow-x-auto pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
                                {kanbanColumns.map(col => (
                                    <div key={col.id} className="bg-slate-100 rounded-lg p-4 w-80 flex-shrink-0">
                                        <h2 className="font-semibold text-slate-700 mb-4 flex items-center justify-between">
                                            <span className="truncate">{col.title}</span>
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-sky-100 text-sky-800">
                                                {col.jobs.length}
                                            </span>
                                        </h2>
                                        <div className="space-y-3">
                                            {col.jobs.map(job => <JobCard key={job.id} job={job} onDropdownToggle={handleDropdownToggle} onStatusChange={handleStatusChange} onViewDetails={handleViewDetails} currentUser={currentUser} isAnyJobInProgressForCurrentUser={isAnyJobInProgressForCurrentUser} />)}
                                            {col.jobs.length === 0 && (
                                                <div className="flex items-center justify-center h-24 text-sm text-slate-500 rounded-lg border-2 border-dashed border-slate-300">
                                                    ไม่มีงาน
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={() => scrollKanban('right')} variant="ghost" className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-md border border-slate-200 h-auto"><ChevronRightIcon className="h-5 w-5 text-slate-600" /></Button>
                        </div>
                    )}

                    {activeTab === 'schedule' && view === 'list' && (
                        <Card className="!p-0 flex-grow min-h-0 flex flex-col">
                            <div className="overflow-auto flex-grow">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50 sticky top-0 z-10">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">ลำดับ</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">รหัสลูกค้า</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">ชื่องาน</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">ที่อยู่</th>
                                            <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">ทะเบียนรถ</th>
                                            <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">ช่างเทคนิค</th>
                                            <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">วันที่ปฏิบัติงาน</th>
                                            <th scope="col" className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">สถานะ</th>
                                            <th scope="col" className="relative px-4 py-2.5">
                                                <span className="sr-only">จัดการ</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {paginatedJobs.map((job, index) => {
                                            const vehicle = MOCK_WAREHOUSES.find(w => w.id === job.vehicleId);
                                            return (
                                                <tr key={job.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{job.customerId}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{job.customerName}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-xs">{job.address}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{vehicle?.licensePlate || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-xs">{job.technicians.map(t => t.name).join(', ')}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                                                        {job.startTime ? `${formatThaiDate(job.startTime)}, ${new Date(job.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${job.endTime ? new Date(job.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''} น.` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={job.status} /></td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                        <Button data-job-id={job.id} onClick={(e) => handleDropdownToggle(e, job.id)} variant="icon" title="ตัวเลือก">
                                                            <ManageIcon className="h-5 w-5" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex-shrink-0">
                                <Pagination currentPage={currentPage} itemsPerPage={itemsPerPage} totalItems={scheduleJobs.length} onPageChange={setCurrentPage} onItemsPerPageChange={handleItemsPerPageChange} />
                            </div>
                        </Card>
                    )}

                    {activeTab === 'schedule' && view === 'calendar' && <CalendarView jobs={filteredJobs} onJobClick={handleViewDetails} />}

                    {activeTab === 'work-schedule' && (
                        <Card>
                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                <div className="flex-1 min-w-[200px]">
                                    <FormField label="เลือกรถบริการ">
                                        <Select value={scheduleVehicleId} onChange={e => setScheduleVehicleId(e.target.value)} required>
                                            <option value="">-- เลือกรถ --</option>
                                            {MOCK_WAREHOUSES.filter(w => w.type === 'รถ').map(v => (
                                                <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>
                                            ))}
                                        </Select>
                                    </FormField>
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <FormField label="เลือกวันที่">
                                        <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} required />
                                    </FormField>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600 whitespace-nowrap">ลำดับ</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600 whitespace-nowrap">เวลา</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600 whitespace-nowrap">รายชื่อลูกค้า</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600 whitespace-nowrap">ที่อยู่</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600 whitespace-nowrap">หมายเลขโทรศัพท์</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600 whitespace-nowrap">การดำเนินงาน</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600 whitespace-nowrap">เข้าได้/ไม่ได้</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600 whitespace-nowrap">ชื่อผู้ปฏิบัติงาน</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600 whitespace-nowrap">สาเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {scheduledJobsForTable.length > 0 ? scheduledJobsForTable.map((job, index) => {
                                            const customer = customerMap.get(job.customerId);
                                            const startTime = new Date(job.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                                            const endTime = new Date(job.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

                                            return (
                                                <tr key={job.id}>
                                                    <td className="px-4 py-2 text-slate-500">{index + 1}</td>
                                                    <td className="px-4 py-2 text-slate-700 whitespace-nowrap">{startTime} - {endTime}</td>
                                                    <td className="px-4 py-2 font-medium text-slate-800">{job.customerName}</td>
                                                    <td className="px-4 py-2 text-slate-600 max-w-xs truncate" title={job.address}>{job.address}</td>
                                                    <td className="px-4 py-2 text-slate-600">{customer?.phone || '-'}</td>
                                                    <td className="px-4 py-2 text-slate-600 max-w-sm truncate" title={job.operationDetails || job.workAreas.map(wa => wa.servicePackage).join(', ')}>
                                                        {job.operationDetails || job.workAreas.map(wa => wa.servicePackage).join(', ')}
                                                    </td>
                                                    <td className="px-4 py-2">{getAccessStatus(job.status)}</td>
                                                    <td className="px-4 py-2 text-slate-600 max-w-xs truncate">{job.technicians.map(t => t.name).join(', ')}</td>
                                                    <td className="px-4 py-2 text-slate-600">{job.remarks || '-'}</td>
                                                </tr>
                                            )
                                        }) : (
                                            <tr>
                                                <td colSpan={9} className="text-center py-10 text-slate-500">
                                                    {scheduleVehicleId && scheduleDate ? 'ไม่พบข้อมูลตารางงานสำหรับรถและวันที่เลือก' : 'กรุณาเลือกรถบริการและวันที่'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'reports' && (
                        <Card className="!p-0">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">ลำดับ</th>
                                            <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">รหัสงาน</th>
                                            <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">ลูกค้า</th>
                                            <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">วันที่เข้าบริการ</th>
                                            <th className="px-4 py-2.5 text-left text-sm font-medium text-slate-600 uppercase whitespace-nowrap">สถานะ</th>
                                            <th className="relative px-4 py-2.5"><span className="sr-only">จัดการ</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {paginatedReports.map((job, index) => (
                                            <tr key={job.id}>
                                                <td className="px-4 py-3 text-sm text-slate-500">{(reportCurrentPage - 1) * reportItemsPerPage + index + 1}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{job.id}</td>
                                                <td className="px-4 py-3 text-sm text-slate-500">{job.customerName}</td>
                                                <td className="px-4 py-3 text-sm text-slate-500">{formatThaiDateTime(job.serviceReport?.createdAt)}</td>
                                                <td className="px-4 py-3"><StatusBadge status={job.serviceReport?.status || Status.Draft} /></td>
                                                <td className="px-4 py-3 text-right text-sm">
                                                    <Button onClick={() => handleWriteReport(job)} variant="ghost" className="text-primary hover:underline p-0 h-auto font-normal">ดู/แก้ไขรายงาน</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination currentPage={reportCurrentPage} itemsPerPage={reportItemsPerPage} totalItems={serviceReports.length} onPageChange={setReportCurrentPage} onItemsPerPageChange={handleReportItemsPerPageChange} />
                        </Card>
                    )}
                </div>
            </div>

            {openDropdownId && dropdownPosition && (
                <div ref={dropdownRef} style={{ position: 'absolute', top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px`, transform: 'translateX(-100%)' }} className="origin-top-right mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">{renderActions()}</div>
                </div>
            )}

            <AddJobModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} assessments={assessments} contracts={contracts} onCreateJob={onCreateJob} jobs={jobs} users={users} products={products} />
            <EditJobModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} job={jobToEdit} onUpdateJob={onUpdateJob} jobs={jobs} users={users} />
            <JobDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} job={selectedJob} assessment={selectedAssessmentForJob} />
            <ServiceReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} job={jobForReport} onSubmit={handleReportSubmit} finalStatus={reportFinalStatus} quotations={quotations} currentUser={currentUser} contracts={contracts} products={products} jobs={jobs} />
            <EditAssessmentModal isOpen={isEditAssessmentModalOpen} onClose={() => setIsEditAssessmentModalOpen(false)} assessment={assessmentForCheckout} onUpdateAssessment={handleAssessmentUpdateOnCheckout} products={products} />
            <CancelJobModal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} job={jobToCancel} onConfirm={handleConfirmCancel} />
        </>
    );
};

export default FieldOperations;
