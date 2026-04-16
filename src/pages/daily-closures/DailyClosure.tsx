import React, { useState, useRef, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
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
import { Input, Select } from '../../components/common/FormControls';
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
          <div className="max-h-[280px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {vehicleCards.map((item) => {
                const isSelected = selectedVehicleId === item.vehicle_id;
                const isClosed = item.closure_status === 'CLOSED';
                const isOpen = item.closure_status === 'PENDING';
                const progress = item.total_jobs > 0 ? Math.round((item.completed_jobs / item.total_jobs) * 100) : 0;

                const statusConfig = isClosed
                  ? { bg: 'bg-green-500', iconBg: 'bg-green-50', iconColor: 'text-green-600', label: 'จบงาน' }
                  : { bg: 'bg-amber-400', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', label: 'กำลังดำเนินการ' };

                const completionPercent = item.total_jobs > 0 ? Math.round((item.completed_jobs / item.total_jobs) * 100) : 0;

                return (
                  <button
                    key={item.vehicle_id}
                    onClick={() => { setSelectedVehicleId(isSelected ? null : item.vehicle_id); setCurrentPage(1); }}
                    className={`group relative rounded-2xl text-left overflow-hidden border-2 ${
                      isSelected
                        ? 'shadow-lg bg-white border-green-500'
                        : 'bg-white hover:shadow-md shadow-sm border-slate-200'
                    }`}
                  >

                    <div className="p-4">
                      {/* Vehicle header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`relative p-2.5 rounded-xl ${isClosed ? 'bg-gradient-to-br from-green-50 to-emerald-100' : 'bg-gradient-to-br from-blue-50 to-primary/10'}`}>
                          <TruckIcon className={`h-5 w-5 ${isClosed ? 'text-green-600' : 'text-primary'}`} />
                          {isClosed && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-800 text-sm truncate">{item.vehicle_name}</h3>
                          {item.vehicle_registration && (
                            <p className="text-xs text-slate-400 truncate">{item.vehicle_registration}</p>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">ความคืบหน้า</span>
                          <span className="text-xs font-bold text-slate-600">{completionPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${completionPercent === 100 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-primary to-blue-500'}`}
                            style={{ width: `${completionPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 text-center py-2 rounded-xl bg-slate-50">
                          <p className="text-lg font-black text-slate-800">{item.total_jobs}</p>
                          <p className="text-[9px] font-semibold text-slate-400 uppercase">งาน</p>
                        </div>
                        <div className={`flex-1 text-center py-2 rounded-xl ${item.completed_jobs > 0 ? 'bg-green-50' : 'bg-slate-50'}`}>
                          <p className={`text-lg font-black ${item.completed_jobs > 0 ? 'text-green-600' : 'text-slate-300'}`}>{item.completed_jobs}</p>
                          <p className="text-[9px] font-semibold text-green-500 uppercase">เสร็จ</p>
                        </div>
                        <div className={`flex-1 text-center py-2 rounded-xl ${item.incomplete_jobs > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                          <p className={`text-lg font-black ${item.incomplete_jobs > 0 ? 'text-red-500' : 'text-slate-300'}`}>{item.incomplete_jobs}</p>
                          <p className={`text-[9px] font-semibold uppercase ${item.incomplete_jobs > 0 ? 'text-red-400' : 'text-slate-300'}`}>ค้าง</p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          );
        })()}

        {/* Search & Filter Bar */}
        <Card className="!p-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-sm">
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
            <BuddhistDatePicker
              selected={filterDate}
              onChange={(date: Date | null) => {
                setFilterDate(date);
                setCurrentPage(1);
              }}
              dateFormat="dd/MM/yyyy"
              placeholderText="เลือกวันที่"
              isClearable
              className="w-36 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary h-10"
            />
            <Select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as JobStatusFilter);
                setCurrentPage(1);
              }}
              className="w-auto"
            >
              <option value="">สถานะทั้งหมด</option>
              {Object.entries(JobStatusLabel).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
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
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      วันที่
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      รถ
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ทะเบียน
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      หัวหน้าทีม
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ลูกค้า
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
                        UNASSIGNED: 'bg-slate-100 text-slate-800 border-slate-200',
                        PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                        IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
                        WAITING_CLEAR: 'bg-orange-100 text-orange-800 border-orange-200',
                        COMPLETE: 'bg-green-100 text-green-800 border-green-200',
                        CANCELLED: 'bg-red-100 text-red-800 border-red-200',
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
                          <td className="px-4 py-3 text-sm text-slate-800 text-center">
                            {job.appointment_date ? formatThaiDate(String(job.appointment_date).substring(0, 10)) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800 text-center">
                            {vehicleName}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 text-center">
                            {vehicleReg}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800 text-center">
                            {techName}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-center">
                            {customerName}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${statusColorMap[job.status] || statusColorMap.PENDING}`}>
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
