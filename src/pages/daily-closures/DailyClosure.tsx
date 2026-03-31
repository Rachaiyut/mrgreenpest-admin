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
  ClockIcon,
  DocumentCheckIcon,
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
      label: 'ปิดแล้ว',
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

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = filterDate
        ? filterDate.toISOString().split('T')[0]
        : today.toISOString().split('T')[0];
      const res = await DailyClosureApi.getOverview(dateStr);
      let data = res.data || [];

      // Client-side filters
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        data = data.filter(
          (item) =>
            item.vehicle_name.toLowerCase().includes(q) ||
            item.primary_tech_name.toLowerCase().includes(q) ||
            item.vehicle_registration.toLowerCase().includes(q)
        );
      }
      if (filterStatus) {
        data = data.filter((item) => item.closure_status === filterStatus);
      }

      setOverviewData(data);
      setTotalItems(data.length);
      setSelectedVehicleId(null);
    } catch (error) {
      console.error('Error fetching overview:', error);
    } finally {
      setLoading(false);
    }
  }, [filterDate, searchQuery, filterStatus]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const filteredByVehicle = selectedVehicleId
    ? overviewData.filter((item) => item.vehicle_id === selectedVehicleId)
    : overviewData;

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
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
          <div className="shrink-0">
            <h1 className="text-3xl font-bold text-slate-800">
              สรุปงานรายวัน
            </h1>
            <p className="mt-1 text-slate-600">
              ติดตามสถานะงานและการปิดงานรายวันของทีมช่าง
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full xl:w-auto xl:flex-nowrap">
            <div className="w-full sm:flex-1 xl:w-80">
              <Input
                type="search"
                placeholder="ค้นหารถ, ชื่อช่าง..."
                value={searchQuery || ''}
                onChange={(e) => {
                  setSearchQuery(e.target.value || undefined);
                  setCurrentPage(1);
                }}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-48 shrink-0">
              <BuddhistDatePicker
                selected={filterDate}
                onChange={(date: Date | null) => {
                  setFilterDate(date);
                  setCurrentPage(1);
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="เลือกวันที่"
                isClearable
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="w-full sm:w-48 shrink-0">
              <Select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as ClosureStatus);
                  setCurrentPage(1);
                }}
                className="w-full"
              >
                <option value="">สถานะทั้งหมด</option>
                <option value="NOT_STARTED">ยังไม่เริ่ม</option>
                <option value="OPEN">เปิดอยู่</option>
                <option value="CLOSED">ปิดแล้ว</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="!p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <TruckIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">รถทั้งหมด</p>
                <p className="text-2xl font-bold text-blue-800">{overviewData.length}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">ปิดงานแล้ว</p>
                <p className="text-2xl font-bold text-green-800">{overviewData.filter(v => v.closure_status === 'CLOSED').length}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">กำลังดำเนินการ</p>
                <p className="text-2xl font-bold text-amber-800">{overviewData.filter(v => v.closure_status === 'OPEN' || v.closure_status === 'NOT_STARTED').length}</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <DocumentCheckIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">งานทั้งหมด</p>
                <p className="text-2xl font-bold text-purple-800">{overviewData.reduce((s, v) => s + v.total_jobs, 0)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Vehicle Overview Cards */}
        {overviewData.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {overviewData.map((item) => {
              const isSelected = selectedVehicleId === item.vehicle_id;
              const isClosed = item.closure_status === 'CLOSED';
              const isOpen = item.closure_status === 'OPEN';

              return (
                <button
                  key={item.vehicle_id}
                  onClick={() => { setSelectedVehicleId(isSelected ? null : item.vehicle_id); setCurrentPage(1); }}
                  className={`flex-shrink-0 rounded-2xl border p-5 min-w-[220px] text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-white shadow-lg ring-1 ring-primary/20'
                      : 'border-slate-200 bg-white hover:shadow-md hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isClosed ? 'bg-green-100' : isOpen ? 'bg-amber-100' : 'bg-slate-100'}`}>
                        <TruckIcon className={`h-4 w-4 ${isClosed ? 'text-green-600' : isOpen ? 'text-amber-600' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.vehicle_name}</p>
                        {item.vehicle_registration && (
                          <p className="text-[11px] text-slate-400">{item.vehicle_registration}</p>
                        )}
                      </div>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full ${isClosed ? 'bg-green-500' : isOpen ? 'bg-amber-500' : 'bg-slate-300'}`} />
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-black text-slate-800">{item.total_jobs}</span>
                    <span className="text-xs text-slate-400 font-medium">งาน</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-600 font-semibold">{item.completed_jobs} เสร็จ</span>
                    {item.incomplete_jobs > 0 && (
                      <span className="text-red-500 font-semibold">{item.incomplete_jobs} ค้าง</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">
                      ลำดับ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      วันที่
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      รถ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      หัวหน้าทีม
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      งานทั้งหมด
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      เสร็จ
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ค้าง
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
                        colSpan={9}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        ไม่พบข้อมูลงานสำหรับวันที่เลือก
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, index) => {
                      const rowNumber =
                        (currentPage - 1) * itemsPerPage + index + 1;
                      const statusConfig: Record<string, { label: string; className: string }> = {
                        CLOSED: { label: 'ปิดแล้ว', className: 'bg-green-100 text-green-800 border-green-200' },
                        OPEN: { label: 'เปิดอยู่', className: 'bg-amber-100 text-amber-800 border-amber-200' },
                        NOT_STARTED: { label: 'ยังไม่เริ่ม', className: 'bg-red-50 text-red-700 border-red-200' },
                      };
                      const badge = statusConfig[item.closure_status] || statusConfig.NOT_STARTED;

                      return (
                        <tr
                          key={item.vehicle_id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {rowNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800">
                            {filterDate ? formatThaiDate(filterDate.toISOString().split('T')[0]) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800">
                            <div>
                              <p className="font-medium">{item.vehicle_name}</p>
                              {item.vehicle_registration && (
                                <p className="text-xs text-slate-400">{item.vehicle_registration}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800">
                            {item.primary_tech_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-800 text-center font-medium">
                            {item.total_jobs}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-600 font-medium text-center">
                            {item.completed_jobs}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm font-medium text-center ${
                              item.incomplete_jobs > 0
                                ? 'text-red-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {item.incomplete_jobs}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              data-closure-id={item.vehicle_id}
                              onClick={(e) =>
                                handleDropdownToggle(e, item.vehicle_id)
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
              const item = overviewData.find((v) => v.vehicle_id === openDropdownId);
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
                          if (res.data) handleViewDetails(res.data);
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
