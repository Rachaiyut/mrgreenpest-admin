import React, { useState, useRef, useEffect, useCallback } from 'react';
import Swal from '@/src/utils/swal';
import { DailyJobClosure, DailyClosureOverviewItem } from '@/src/types/entity/daily-closure.interface';
import { DailyClosureApi } from '@/src/api/daily-closure';
import { JobApi } from '@/src/api/job';
import { Job } from '@/src/types/entity/job.interface';
import { JobMainStatus, JobStatusLabel } from '@/src/types/enums/job';
import {
  EyeIcon,
  CheckCircleIcon,
  ManageIcon,
  LoadingIcon,
  TruckIcon,
  DocumentCheckIcon,
  ClockIcon,
} from '../../assets/icons/Icons';
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { Input } from '../../components/common/FormControls';
import { DropdownSelect } from '../../components/common/DropdownSelect';
import { DailyClosureDetailsModal } from '../../components/features/daily-closures/DailyClosureDetailsModal';
import BuddhistDatePicker from '@/src/components/common/BuddhistDatePicker';
import { formatThaiDate } from '@/src/utils/date';

type JobStatusFilter = '' | JobMainStatus;

const StatusBadge: React.FC<{ status: DailyJobClosure['status'] }> = ({
  status,
}) => {
  const config: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: 'เปิดอยู่',
      className: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    CLOSED: {
      label: 'จบงาน',
      className: 'bg-green-100 text-green-800 border-green-200',
    },
  };
  const { label, className } = config[status] || config.PENDING;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}
    >
      {label}
    </span>
  );
};

const DailyClosure: React.FC = () => {
  const today = new Date();
  const [overviewData, setOverviewData] = useState<DailyClosureOverviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const [filterDate, setFilterDate] = useState<Date | null>(today);
  const [filterStatus, setFilterStatus] = useState<JobStatusFilter>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const [jobsData, setJobsData] = useState<Job[]>([]);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedClosure, setSelectedClosure] =
    useState<DailyJobClosure | null>(null);

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const vehicleScrollRef = useRef<HTMLDivElement>(null);

  const toLocalDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = filterDate ? toLocalDate(filterDate) : toLocalDate(today);

      // Fetch overview (for vehicle cards) and jobs (for table) in parallel
      const [overviewRes, jobsRes] = await Promise.all([
        DailyClosureApi.getOverview(dateStr),
        JobApi.getAll({
          appointment_date: dateStr,
          limit: 1000,
          ...(selectedVehicleId ? { vehicle_id: selectedVehicleId } : {}),
          ...(filterStatus ? { status: filterStatus } : {}),
          ...(searchQuery ? { search: searchQuery } : {}),
        }),
      ]);

      const allData = overviewRes.data || [];
      setOverviewData(allData);

      const jobs = jobsRes.data || [];
      setJobsData(jobs);
      setTotalItems(jobs.length);
    } catch (error) {
      console.error('Error fetching overview:', error);
    } finally {
      setLoading(false);
    }
  }, [filterDate, searchQuery, filterStatus, selectedVehicleId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const paginatedJobs = jobsData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleViewDetails = (closure: DailyJobClosure) => {
    setSelectedClosure(closure);
    setIsDetailsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleCloseRetroactive = async (closure: DailyJobClosure) => {
    setOpenDropdownId(null);
    const result = await Swal.fire({
      title: 'ยืนยันการปิดย้อนหลัง',
      text: `ต้องการปิดสรุปงานรายวัน วันที่ ${formatThaiDate(closure.closure_date)} หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#16a34a',
    });

    if (result.isConfirmed) {
      try {
        await DailyClosureApi.closeRetroactive(closure.id);
        Swal.fire({
          icon: 'success',
          title: 'ปิดย้อนหลังสำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        });
        fetchOverview();
      } catch (error) {
        console.error('Error closing retroactive:', error);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถปิดย้อนหลังได้',
        });
      }
    }
  };

  const handleDropdownToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    closureId: string
  ) => {
    event.stopPropagation();
    if (openDropdownId === closureId) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      const dropdownHeight = 120;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const showAbove = spaceBelow < dropdownHeight;

      setOpenDropdownId(closureId);
      setDropdownPosition({
        top: showAbove
          ? buttonRect.top + window.scrollY - dropdownHeight
          : buttonRect.bottom + window.scrollY,
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
      ) {
        return;
      }
      if (
        (event.target as HTMLElement).closest('button[data-closure-id]')
      ) {
        return;
      }
      setOpenDropdownId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1 space-y-6 max-w-full">
        {/* Header */}
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">สรุปงานรายวัน</h1>
            <p className="mt-1 text-slate-600">ติดตามสถานะงานและการปิดงานรายวันของทีมช่าง</p>
          </div>
        </div>

        {/* Vehicle Cards - aggregate per vehicle */}
        {overviewData.length > 0 && (() => {
          const vehicleAgg = new Map<string, DailyClosureOverviewItem>();
          for (const row of overviewData) {
            const existing = vehicleAgg.get(row.vehicle_id);
            if (existing) {
              existing.total_jobs += row.total_jobs;
              existing.completed_jobs += row.completed_jobs;
              existing.incomplete_jobs += row.incomplete_jobs;
            } else {
              vehicleAgg.set(row.vehicle_id, { ...row });
            }
          }
          const vehicleCards = Array.from(vehicleAgg.values());
          return (
          <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {vehicleCards.map((item, idx) => {
              const isSelected = selectedVehicleId === item.vehicle_id;
              const isClosed = item.closure_status === 'CLOSED';
              const completionPercent = item.total_jobs > 0 ? Math.round((item.completed_jobs / item.total_jobs) * 100) : 0;

              const colors = [
                { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', icon: 'bg-blue-500', label: 'text-blue-600', value: 'text-blue-700', barBg: 'bg-blue-200/50', bar: 'bg-blue-500' },
                { bg: 'from-amber-50 to-amber-100', border: 'border-amber-200', icon: 'bg-amber-500', label: 'text-amber-600', value: 'text-amber-700', barBg: 'bg-amber-200/50', bar: 'bg-amber-500' },
                { bg: 'from-green-50 to-green-100', border: 'border-green-200', icon: 'bg-green-500', label: 'text-green-600', value: 'text-green-700', barBg: 'bg-green-200/50', bar: 'bg-green-500' },
                { bg: 'from-purple-50 to-purple-100', border: 'border-purple-200', icon: 'bg-purple-500', label: 'text-purple-600', value: 'text-purple-700', barBg: 'bg-purple-200/50', bar: 'bg-purple-500' },
              ];
              const c = isClosed
                ? { bg: 'from-green-50 to-green-100', border: 'border-green-200', icon: 'bg-green-500', label: 'text-green-600', value: 'text-green-700', barBg: 'bg-green-200/50', bar: 'bg-green-500' }
                : colors[idx % colors.length];

              return (
                <Card
                  key={item.vehicle_id}
                  className={`!p-4 cursor-pointer transition-all duration-200 bg-gradient-to-br ${c.bg} ${c.border} ${isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}
                  onClick={() => { setSelectedVehicleId(isSelected ? null : item.vehicle_id); setCurrentPage(1); }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${c.icon}`}>
                      <TruckIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs sm:text-sm font-medium whitespace-nowrap ${c.label}`}>{item.vehicle_name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`flex-1 h-2 rounded-full overflow-hidden ${c.barBg}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
                            style={{ width: `${completionPercent}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${c.value}`}>{completionPercent}%</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          );
        })()}

        {/* Search & Filter Bar */}
        <Card className="!p-3 sm:!p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto flex-1 items-center">
              <div className="relative w-full sm:w-80 sm:shrink-0">
                <Input
                  type="search"
                  placeholder="ค้นหารถ, ชื่อช่าง..."
                  value={searchQuery || ''}
                  onChange={(e) => {
                    setSearchQuery(e.target.value || undefined);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-[120px] sm:w-48 sm:flex-none">
                <BuddhistDatePicker
                  selected={filterDate}
                  onChange={(date: Date | null) => {
                    setFilterDate(date);
                    setCurrentPage(1);
                  }}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="เลือกวันที่"
                  isClearable
                  className="w-full pr-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
                  wrapperClassName="w-full"
                />
              </div>
              <div className="flex-1 min-w-[120px] sm:w-40 sm:flex-none">
                <DropdownSelect
                  value={filterStatus}
                  onChange={(val) => {
                    setFilterStatus(val as JobStatusFilter);
                    setCurrentPage(1);
                  }}
                  placeholder="สถานะทั้งหมด"
                  options={[
                    { value: '', label: 'สถานะทั้งหมด' },
                    ...Object.entries(JobStatusLabel).map(([key, label]) => ({
                      value: key,
                      label: label,
                    })),
                  ]}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Table Card */}
        {loading ? (
          <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center justify-center text-slate-500">
              <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="text-base font-medium">
                กำลังโหลดข้อมูลสรุปงานรายวัน...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
            {paginatedJobs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                <DocumentCheckIcon className="h-12 w-12 mb-3" />
                <p className="text-base font-medium text-slate-500">ไม่พบข้อมูลงานสำหรับวันที่เลือก</p>
                <p className="text-sm mt-1">ลองเปลี่ยนวันที่หรือตัวกรองเพื่อค้นหา</p>
              </div>
            ) : (
            <>
            <div className="overflow-x-auto border-b border-slate-200 w-full flex-1 relative">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">
                      ลำดับ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      วันที่
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      รถ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ทะเบียน
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      หัวหน้าทีม
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ชื่อลูกค้า
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 border-b border-slate-200">
                  {paginatedJobs.map((job, index) => {
                      const rowNumber =
                        (currentPage - 1) * itemsPerPage + index + 1;

                      const statusColorMap: Record<string, string> = {
                        UNASSIGNED: 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 shadow-sm shadow-slate-200/50',
                        PENDING: 'bg-gradient-to-r from-amber-100 to-yellow-200 text-amber-800 shadow-sm shadow-amber-200/50',
                        IN_PROGRESS: 'bg-gradient-to-r from-blue-100 to-sky-200 text-blue-800 shadow-sm shadow-blue-200/50',
                        WAITING_CLEAR: 'bg-gradient-to-r from-orange-100 to-amber-200 text-orange-800 shadow-sm shadow-orange-200/50',
                        COMPLETE: 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 shadow-sm shadow-green-200/50',
                        CANCELLED: 'bg-gradient-to-r from-red-100 to-rose-200 text-red-800 shadow-sm shadow-red-200/50',
                        FAILED: 'bg-red-100 text-red-800 border-red-200',
                      };

                      const customerName = job.customer
                        ? `${job.customer.first_name || ''} ${job.customer.last_name || ''}`.trim()
                        : '-';

                      const techName = job.primary_technician
                        ? `${job.primary_technician.first_name || ''} ${job.primary_technician.last_name || ''}`.trim()
                        : '-';

                      const vehicle = job.vehicle as unknown as Record<string, unknown> | undefined;
                      const vehicleName = (vehicle?.name as string) || '-';
                      const nestedVehicle = vehicle?.vehicle as Record<string, string> | undefined;
                      const vehicleReg = nestedVehicle?.vehicle_registration || '-';

                      return (
                        <tr
                          key={job.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-slate-600 text-center">
                            {rowNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800 text-left">
                            {job.appointment_date ? formatThaiDate(String(job.appointment_date).substring(0, 10)) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800 text-left">
                            {vehicleName}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 text-left">
                            {vehicleReg}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800 text-left">
                            {techName}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-left">
                            {customerName}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${statusColorMap[job.status] || statusColorMap.PENDING}`}>
                              {JobStatusLabel[job.status] || job.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              data-closure-id={job.id}
                              onClick={(e) =>
                                handleDropdownToggle(e, job.id)
                              }
                              className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                              title="จัดการ"
                            >
                              <ManageIcon className="h-5 w-5 text-slate-500" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div className="mt-auto border-t border-slate-200">
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
            </>
            )}
          </div>
        )}
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
          className="origin-top-right mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-30"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {(() => {
              const job = jobsData.find((j) => j.id === openDropdownId);
              if (!job) return null;

              // Find the closure for this job's vehicle
              const closureItem = overviewData.find((v) => v.vehicle_id === job.vehicle_id);

              return (
                <>
                  {closureItem?.closure_id && (
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await DailyClosureApi.getById(closureItem.closure_id!);
                          if (res.data) handleViewDetails(res.data);
                        } catch { /* ignore */ }
                      }}
                      className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                      role="menuitem"
                    >
                      <EyeIcon className="mr-3 h-5 w-5" aria-hidden="true" />
                      <span>ดูรายละเอียดสรุปงาน</span>
                    </a>
                  )}
                  {closureItem?.closure_id && closureItem.closure_status === 'PENDING' && (
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await DailyClosureApi.getById(closureItem.closure_id!);
                          if (res.data) handleCloseRetroactive(res.data);
                        } catch { /* ignore */ }
                      }}
                      className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                      role="menuitem"
                    >
                      <CheckCircleIcon className="mr-3 h-5 w-5" aria-hidden="true" />
                      <span>ปิดย้อนหลัง</span>
                    </a>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Details Modal */}
      <DailyClosureDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        closure={selectedClosure}
      />
    </div>
  );
};

export default DailyClosure;
