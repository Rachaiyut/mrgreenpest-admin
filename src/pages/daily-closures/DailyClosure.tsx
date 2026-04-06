import React, { useState, useRef, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { DailyJobClosure, DailyClosureOverviewItem } from '@/src/types/entity/daily-closure.interface';
import { DailyClosureApi } from '@/src/api/daily-closure';
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

type ClosureStatus = '' | 'OPEN' | 'CLOSED' | 'NOT_STARTED';

const StatusBadge: React.FC<{ status: DailyJobClosure['status'] }> = ({
  status,
}) => {
  const config = {
    OPEN: {
      label: 'เปิดอยู่',
      className: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    CLOSED: {
      label: 'จบงาน',
      className: 'bg-green-100 text-green-800 border-green-200',
    },
  };
  const { label, className } = config[status];
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
  const [filterStatus, setFilterStatus] = useState<ClosureStatus>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

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

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const toLocalDate = (d: Date) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      const dateStr = filterDate ? toLocalDate(filterDate) : toLocalDate(today);
      const res = await DailyClosureApi.getOverview(dateStr);
      const allData = res.data || [];
      setOverviewData(allData);

      // Filter for table
      let tableData = [...allData];

      if (selectedVehicleId) {
        tableData = tableData.filter((item) => item.vehicle_id === selectedVehicleId);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        tableData = tableData.filter(
          (item) =>
            item.vehicle_name.toLowerCase().includes(q) ||
            item.primary_tech_name.toLowerCase().includes(q) ||
            item.vehicle_registration.toLowerCase().includes(q)
        );
      }
      if (filterStatus) {
        tableData = tableData.filter((item) => item.closure_status === filterStatus);
      }

      setTotalItems(tableData.length);
    } catch (error) {
      console.error('Error fetching overview:', error);
    } finally {
      setLoading(false);
    }
  }, [filterDate, searchQuery, filterStatus, selectedVehicleId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const filteredByVehicle = (() => {
    let data = selectedVehicleId
      ? overviewData.filter((item) => item.vehicle_id === selectedVehicleId)
      : overviewData;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((item) =>
        item.vehicle_name.toLowerCase().includes(q) ||
        item.primary_tech_name.toLowerCase().includes(q) ||
        item.vehicle_registration.toLowerCase().includes(q)
      );
    }
    if (filterStatus) {
      data = data.filter((item) => item.closure_status === filterStatus);
    }
    return data;
  })();

  const paginatedData = filteredByVehicle.slice(
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
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col min-h-[calc(100vh-64px)] space-y-6 max-w-full">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
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
                const isOpen = item.closure_status === 'OPEN';
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
                setFilterStatus(e.target.value as ClosureStatus);
                setCurrentPage(1);
              }}
              className="w-auto"
            >
              <option value="">สถานะทั้งหมด</option>
              <option value="OPEN">กำลังดำเนินการ</option>
              <option value="CLOSED">จบงาน</option>
            </Select>
          </div>
        </Card>

        {/* Table Card */}
        {loading ? (
          <Card className="!p-0 w-full flex flex-col overflow-hidden border border-slate-200 flex-1 shadow-sm items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center justify-center text-slate-500">
              <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="text-base font-medium">
                กำลังโหลดข้อมูลสรุปงานรายวัน...
              </p>
            </div>
          </Card>
        ) : (
          <Card className="!p-0 w-full flex flex-col overflow-hidden border border-slate-200 flex-1 shadow-sm">
            <div className="overflow-auto w-full flex-1 relative">
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
                <tbody className="bg-white divide-y divide-slate-200">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        ไม่พบข้อมูลงานสำหรับวันที่เลือก
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, index) => {
                      const rowNumber =
                        (currentPage - 1) * itemsPerPage + index + 1;
                      const allComplete = item.total_jobs > 0 && item.incomplete_jobs === 0;
                      const hasInProgress = (item.in_progress_jobs || 0) > 0;
                      const allCancelled = item.total_jobs > 0 && (item.cancelled_jobs || 0) >= item.total_jobs;
                      const derivedStatus = item.closure_status === 'CLOSED'
                        ? 'CLOSED'
                        : allCancelled
                          ? 'CANCELLED'
                          : allComplete && !item.has_issue_summary
                            ? 'WAITING_CLEAR'
                            : allComplete
                              ? 'COMPLETED'
                              : hasInProgress
                                ? 'IN_PROGRESS'
                                : 'PENDING';
                      const statusConfig: Record<string, { label: string; className: string }> = {
                        CLOSED: { label: 'จบงาน', className: 'bg-slate-100 text-slate-800 border-slate-200' },
                        COMPLETED: { label: 'แล้วเสร็จ', className: 'bg-green-100 text-green-800 border-green-200' },
                        WAITING_CLEAR: { label: 'รอเคลียค่าใช้จ่ายและสารเคมี', className: 'bg-orange-100 text-orange-800 border-orange-200' },
                        IN_PROGRESS: { label: 'ระหว่างดำเนินการ', className: 'bg-blue-100 text-blue-800 border-blue-200' },
                        PENDING: { label: 'รอเข้าดำเนินการ', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
                        CANCELLED: { label: 'ยกเลิก', className: 'bg-red-100 text-red-800 border-red-200' },
                      };
                      const badge = statusConfig[derivedStatus] || statusConfig.OPEN;

                      return (
                        <tr
                          key={`${item.vehicle_id}::${item.primary_tech_name}`}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-slate-600 text-center">
                            {rowNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800 text-center">
                            {filterDate ? formatThaiDate(`${filterDate.getFullYear()}-${String(filterDate.getMonth() + 1).padStart(2, '0')}-${String(filterDate.getDate()).padStart(2, '0')}`) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800 text-center">
                            {item.vehicle_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 text-center">
                            {item.vehicle_registration || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800 text-center">
                            {item.primary_tech_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-center">
                            {item.customer_names?.length > 0 ? item.customer_names.join(', ') : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${badge.className}`}>
                                {badge.label}
                              </span>
                              {derivedStatus === 'COMPLETED' && item.closure_id && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const res = await DailyClosureApi.getById(item.closure_id!);
                                      if (res.data) handleCloseRetroactive(res.data);
                                    } catch { /* ignore */ }
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
                                >
                                  จบงาน
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              data-closure-id={`${item.vehicle_id}::${item.primary_tech_name}`}
                              onClick={(e) =>
                                handleDropdownToggle(e, `${item.vehicle_id}::${item.primary_tech_name}`)
                              }
                              className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                              title="จัดการ"
                            >
                              <ManageIcon className="h-5 w-5 text-slate-500" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-200 bg-white mt-auto sticky bottom-0 z-20 w-full pb-safe">
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          </Card>
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
              const item = overviewData.find((v) => `${v.vehicle_id}::${v.primary_tech_name}` === openDropdownId);
              if (!item) return null;
              return (
                <>
                  {item.closure_id && (
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await DailyClosureApi.getById(item.closure_id!);
                          if (res.data) {
                            // Override with per-tech data
                            const techClosure = {
                              ...res.data,
                              primary_technician: { id: '', first_name: item.primary_tech_name.split(' ')[0], last_name: item.primary_tech_name.split(' ').slice(1).join(' ') },
                              total_jobs: item.total_jobs,
                              completed_jobs: item.completed_jobs,
                              incomplete_jobs: item.incomplete_jobs,
                            };
                            handleViewDetails(techClosure);
                          }
                        } catch { /* ignore */ }
                      }}
                      className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                      role="menuitem"
                    >
                      <EyeIcon className="mr-3 h-5 w-5" aria-hidden="true" />
                      <span>ดูรายละเอียด</span>
                    </a>
                  )}
                  {item.closure_id && item.closure_status === 'OPEN' && (
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await DailyClosureApi.getById(item.closure_id!);
                          if (res.data) handleCloseRetroactive(res.data);
                        } catch { /* ignore */ }
                      }}
                className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                role="menuitem"
              >
                <CheckCircleIcon
                  className="mr-3 h-5 w-5"
                  aria-hidden="true"
                />
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
    </>
  );
};

export default DailyClosure;
