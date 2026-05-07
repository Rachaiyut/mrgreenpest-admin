import { useState, useEffect, useCallback, useRef, useMemo, FC } from 'react';
import Swal from '@/src/utils/swal';
import { Card } from '../../components/common/Card';
import { Pagination } from '../../components/common/Pagination';
import { Button, Input } from '../../components/common/FormControls';
import { Modal } from '../../components/common/Modal';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  DocumentTextIcon,
  ManageIcon,
  LoadingIcon,
} from '../../assets/icons/Icons';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { isManagementRole, isExecutiveRole } from '../../utils/role';
import { PackageApi } from '../../api/package';
import { Package } from '../../types/entity/package.interface';
import {
  ServiceScheduleApi,
  ServiceSchedule,
  ServiceScheduleDetailItem,
} from '../../api/service-schedule';
import { formatThaiDate } from '../../utils/date';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

interface ScheduleFormRow {
  visit_no: number;
  month: string;
  work_task: string;
  service_details: string;
}

type ModalMode = 'create' | 'edit' | 'detail';

const ServiceSchedulePage: FC = () => {
  const currentUser = useCurrentUser();
  const canEdit = isManagementRole(currentUser?.roleType) || isExecutiveRole(currentUser?.roleType);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [scheduleName, setScheduleName] = useState('');
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [rows, setRows] = useState<ScheduleFormRow[]>([
    { visit_no: 1, month: '', work_task: '', service_details: '' },
  ]);

  // Data from API
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSchedules = useMemo(() => {
    if (!searchQuery.trim()) return schedules;
    const q = searchQuery.toLowerCase();
    return schedules.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.package?.name?.toLowerCase().includes(q) ||
        s.package?.code?.toLowerCase().includes(q)
    );
  }, [schedules, searchQuery]);

  const totalItems = filteredSchedules.length;
  const paginatedSchedules = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSchedules.slice(start, start + itemsPerPage);
  }, [filteredSchedules, currentPage, itemsPerPage]);

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ServiceSchedule | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load packages
  useEffect(() => {
    const loadPackages = async () => {
      try {
        const res = await PackageApi.getPackages({ page: 1, limit: 10, is_active: true });
        setPackages(res?.data || []);
      } catch (err) {
        console.error('Failed to load packages:', err);
      }
    };
    loadPackages();
  }, []);

  // Load schedules from API
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ServiceScheduleApi.getAll();
      setSchedules(data);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Dropdown handlers
  const handleDropdownToggle = (event: React.MouseEvent<HTMLButtonElement>, schedule: ServiceSchedule) => {
    event.stopPropagation();
    if (openDropdownId === schedule.id) {
      setOpenDropdownId(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setSelectedSchedule(schedule);
      setOpenDropdownId(schedule.id);
      const dropdownHeight = 200;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const showAbove = spaceBelow < dropdownHeight;
      setDropdownPosition({
        top: showAbove ? buttonRect.top - dropdownHeight : buttonRect.bottom,
        left: buttonRect.right,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openDropdownId) return;
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
      if ((event.target as HTMLElement).closest('button[data-schedule-id]')) return;
      setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  // Open modals
  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setScheduleName('');
    setSelectedPackageId('');
    setRows([{ visit_no: 1, month: '', work_task: '', service_details: '' }]);
    setIsModalOpen(true);
  };

  const openEditModal = (schedule: ServiceSchedule) => {
    setModalMode('edit');
    setEditingId(schedule.id);
    setScheduleName(schedule.name);
    setSelectedPackageId(schedule.package_id || '');
    setRows(
      (schedule.details || []).map((d, i) => ({
        visit_no: d.visit_no || i + 1,
        month: d.month || '',
        work_task: d.work_task || '',
        service_details: d.service_details || '',
      })),
    );
    setIsModalOpen(true);
  };

  const openDetailModal = (schedule: ServiceSchedule) => {
    setModalMode('detail');
    setEditingId(schedule.id);
    setScheduleName(schedule.name);
    setSelectedPackageId(schedule.package_id || '');
    setRows(
      (schedule.details || []).map((d, i) => ({
        visit_no: d.visit_no || i + 1,
        month: d.month || '',
        work_task: d.work_task || '',
        service_details: d.service_details || '',
      })),
    );
    setIsModalOpen(true);
  };

  // Row operations
  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { visit_no: prev.length + 1, month: '', work_task: '', service_details: '' },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((row, i) => ({ ...row, visit_no: i + 1 }));
    });
  };

  const updateRow = (index: number, field: keyof ScheduleFormRow, value: string) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!scheduleName.trim()) {
      Swal.fire('กรุณากรอกข้อมูลให้ครบ', 'ชื่อตาราง จำเป็นต้องกรอก', 'warning');
      return;
    }

    const hasEmpty = rows.some((r) => !r.work_task);
    if (hasEmpty) {
      Swal.fire('กรุณากรอกข้อมูลให้ครบ', 'งานที่ปฏิบัติ จำเป็นต้องกรอก', 'warning');
      return;
    }

    const details: ServiceScheduleDetailItem[] = rows.map((r, i) => ({
      visit_no: r.visit_no,
      month: r.month,
      work_task: r.work_task,
      service_details: r.service_details,
      sequence: i + 1,
    }));

    const payload = {
      name: scheduleName.trim(),
      package_id: selectedPackageId || undefined,
      details,
    };

    try {
      if (modalMode === 'edit' && editingId) {
        await ServiceScheduleApi.update(editingId, payload);
      } else {
        await ServiceScheduleApi.create(payload);
      }

      Swal.fire('สำเร็จ', 'บันทึกตารางปฏิบัติงานเรียบร้อย', 'success');
      setIsModalOpen(false);
      fetchSchedules();
    } catch (err) {
      console.error('Failed to save:', err);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: 'ต้องการลบตารางปฏิบัติงานนี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
    });
    if (!confirm.isConfirmed) return;

    try {
      await ServiceScheduleApi.remove(id);
      Swal.fire('สำเร็จ', 'ลบตารางปฏิบัติงานเรียบร้อย', 'success');
      fetchSchedules();
    } catch (err) {
      console.error('Failed to delete:', err);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
    }
  };

  // Modal helpers
  const getModalTitle = () => {
    if (modalMode === 'create') return 'สร้างตารางปฏิบัติงาน';
    if (modalMode === 'edit') return 'แก้ไขตารางปฏิบัติงาน';
    return 'รายละเอียดตารางปฏิบัติงาน';
  };

  const isReadOnly = modalMode === 'detail';

  const modalFooter = (
    <div className="flex gap-3 w-full justify-end">
      <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
        {isReadOnly ? 'ปิด' : 'ยกเลิก'}
      </Button>
      {!isReadOnly && (
        <Button variant="primary" onClick={handleSave} type="button">
          บันทึก
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex flex-col flex-1">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">ตารางปฏิบัติงาน</h1>
          <p className="mt-1 text-slate-600">
            จัดการตารางการเข้าปฏิบัติงานสำหรับใบเสนอราคาและสัญญา
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreateModal} className="shadow-md shadow-primary/20">
            <PlusIcon className="w-5 h-5 mr-2" />
            สร้างตารางปฏิบัติงาน
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <Card className="!p-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:w-80 flex-shrink-0">
            <Input
              type="search"
              placeholder="ค้นหาชื่อ, แพ็กเกจ..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto flex-1 relative">
            <table className="min-w-full border-b border-slate-200">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-16">ลำดับ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider w-1/4">ชื่อ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider w-1/4">แพ็กเกจ</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-28">จำนวนครั้ง</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider w-40">วันที่สร้าง</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider w-40">ผู้สร้าง</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-32">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-500">
                        <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="text-base font-medium">กำลังโหลดข้อมูล...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[41px] flex flex-col items-center justify-center text-slate-400">
                        <DocumentTextIcon className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-lg font-medium">ไม่พบข้อมูลตารางปฏิบัติงาน</p>
                        {canEdit && (
                          <p className="text-sm mt-1">กดปุ่ม "สร้างตารางปฏิบัติงาน" เพื่อเริ่มต้น</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedSchedules.map((schedule, index) => (
                    <tr key={schedule.id} className={`hover:bg-slate-50/50 transition-colors [&>td]:align-top ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-4 py-3 text-sm text-slate-700 text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="px-4 py-3 text-sm text-slate-800 font-medium text-left">{schedule.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-left">
                        {schedule.package ? `${schedule.package.code} - ${schedule.package.name}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {schedule.details?.length || 0} ครั้ง
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left text-sm text-slate-500">
                        {formatThaiDate(schedule.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-left">
                        {schedule.creator ? `${schedule.creator.first_name} ${schedule.creator.last_name || ''}`.trim() : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            onClick={async () => {
                              if (loadingPdfId) return;
                              setLoadingPdfId(schedule.id);
                              try {
                                const blob = await ServiceScheduleApi.getPdf(schedule.id);
                                window.open(window.URL.createObjectURL(blob), '_blank');
                              } catch (err) {
                                console.error('Error viewing PDF:', err);
                                Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเปิด PDF ได้' });
                              } finally {
                                setLoadingPdfId(null);
                              }
                            }}
                            className="!px-3 !py-1.5 !text-xs !text-white !bg-green-600 !border-green-600 hover:!bg-green-700"
                          >
                            {loadingPdfId === schedule.id ? (
                              <LoadingIcon className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <EyeIcon className="w-4 h-4 mr-1" />
                            )}
                            {loadingPdfId === schedule.id ? 'กำลังโหลด...' : 'ดู PDF'}
                          </Button>
                          <Button
                            data-schedule-id={schedule.id}
                            onClick={(e) => handleDropdownToggle(e, schedule)}
                            variant="icon"
                            title="จัดการ"
                          >
                            <ManageIcon className="h-5 w-5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
      </div>

      {/* Dropdown Menu */}
      {openDropdownId && dropdownPosition && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            transform: 'translateX(-100%)',
          }}
          className="origin-top-right mt-2 w-48 rounded-xl shadow-xl bg-white ring-1 ring-black/5 focus:outline-none z-30 border border-slate-100 overflow-hidden"
        >
          <div className="py-1">
            <button
              onClick={() => {
                if (selectedSchedule) openDetailModal(selectedSchedule);
                setOpenDropdownId(null);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <EyeIcon className="w-4 h-4 text-slate-400" />
              ดูรายละเอียด
            </button>
            {canEdit && (
              <>
                <button
                  onClick={() => {
                    if (selectedSchedule) openEditModal(selectedSchedule);
                    setOpenDropdownId(null);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                >
                  <PencilIcon className="w-4 h-4 text-slate-400" />
                  แก้ไข
                </button>
                <button
                  onClick={() => {
                    if (selectedSchedule) handleDelete(selectedSchedule.id);
                    setOpenDropdownId(null);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                >
                  <TrashIcon className="w-4 h-4 text-red-400" />
                  ลบ
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Role warning */}
      {!canEdit && (
        <Card className="!bg-amber-50 !border-amber-200">
          <div className="p-4 text-sm text-amber-700">
            เฉพาะผู้ใช้ระดับ Management หรือ Executive เท่านั้นที่สามารถสร้าง/แก้ไขตารางปฏิบัติงานได้
          </div>
        </Card>
      )}

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={getModalTitle()}
          size="6xl"
          footer={modalFooter}
        >
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{isReadOnly ? 'ชื่อตาราง' : <>ชื่อตาราง <span className="text-red-500">*</span></>}</label>
              {isReadOnly ? (
                <p className="text-sm text-slate-800 font-medium truncate">{scheduleName}</p>
              ) : (
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="เช่น ตารางปฏิบัติงาน Package 7 ครั้ง"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                />
              )}
            </div>

            {/* Package Selection */}
            {!isReadOnly && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">แพ็กเกจ</label>
                  <SearchableSelect
                    options={packages.map((p) => ({
                      value: p.id,
                      label: `${p.code} - ${p.name}`,
                    }))}
                    value={selectedPackageId}
                    onChange={(val) => {
                      setSelectedPackageId(val);
                      const pkg = packages.find((p) => p.id === val);
                      if (pkg && pkg.visit_limit > 0) {
                        setRows(
                          Array.from({ length: pkg.visit_limit }, (_, i) => ({
                            visit_no: i + 1,
                            month: '',
                            work_task: '',
                            service_details: '',
                          })),
                        );
                      }
                    }}
                    placeholder="ค้นหาแพ็กเกจ..."
                  />
                </div>
                {selectedPackageId && (
                  <div>
                    <button
                      onClick={() => {
                        setSelectedPackageId('');
                        setRows([{ visit_no: 1, month: '', work_task: '', service_details: '' }]);
                      }}
                      className="px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      ล้างแพ็กเกจ (กรอกอิสระ)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Schedule Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-slate-800">ตารางการเข้าปฏิบัติงาน</h3>
                <span className="text-sm text-slate-500">เข้า {rows.length} ครั้ง</span>
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b-2 border-green-500/30">
                      <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider w-16">ครั้งที่</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider w-28">เดือน</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider w-48">งานที่ปฏิบัติ</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">รายละเอียดการทำบริการ</th>
                      {!isReadOnly && (
                        <th className="px-2 py-3 w-12"></th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, index) => (
                      <tr key={index} className={`transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${!isReadOnly ? 'hover:bg-green-50/30' : ''}`}>
                        <td className="px-4 py-3 text-center align-top">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-xs">{row.visit_no}</span>
                        </td>
                        <td className="px-4 py-3 text-left align-top">
                          {isReadOnly ? (
                            <span className="text-slate-700 font-medium">{row.month || '-'}</span>
                          ) : (
                            <select
                              className="w-full bg-transparent text-sm focus:ring-0 focus:outline-none cursor-pointer border-0 px-0 py-0"
                              value={row.month}
                              onChange={(e) => updateRow(index, 'month', e.target.value)}
                            >
                              <option value="">เลือก</option>
                              {THAI_MONTHS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {isReadOnly ? (
                            <span className="text-slate-800 whitespace-pre-line break-words">{row.work_task || '-'}</span>
                          ) : (
                            <textarea
                              className="w-full bg-transparent text-sm focus:ring-0 focus:outline-none min-h-[50px] resize-none border-0 px-0 py-0"
                              placeholder="เช่น สำรวจและติดตั้งกล่อง"
                              value={row.work_task}
                              onChange={(e) => updateRow(index, 'work_task', e.target.value)}
                              rows={2}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {isReadOnly ? (
                            <div className="whitespace-pre-line text-sm text-slate-700 leading-relaxed break-words">{row.service_details || '-'}</div>
                          ) : (
                            <textarea
                              className="w-full bg-transparent text-sm focus:ring-0 focus:outline-none min-h-[50px] resize-none border-0 px-0 py-0"
                              placeholder={"1. สำรวจปลวกภายในอาคาร\n2. หากพบปลวกจะติดตั้งสถานี (AG)"}
                              value={row.service_details}
                              onChange={(e) => updateRow(index, 'service_details', e.target.value)}
                              rows={2}
                            />
                          )}
                        </td>
                        {!isReadOnly && (
                          <td className="px-2 py-3 text-center align-top">
                            {rows.length > 1 && (
                              <button
                                onClick={() => removeRow(index)}
                                className="text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                title="ลบแถว"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Card layout */}
              <div className="md:hidden space-y-3">
                {rows.map((row, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-3 bg-white space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">ครั้งที่ {row.visit_no}</span>
                      {!isReadOnly && rows.length > 1 && (
                        <button onClick={() => removeRow(index)} className="text-red-400 hover:text-red-600 p-1">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">เดือน</label>
                      {isReadOnly ? (
                        <span className="text-sm">{row.month || '-'}</span>
                      ) : (
                        <select
                          className="w-full border border-slate-200 rounded-md px-2.5 py-2 text-sm bg-white focus:ring-1 focus:ring-green-500"
                          value={row.month}
                          onChange={(e) => updateRow(index, 'month', e.target.value)}
                        >
                          <option value="">เลือกเดือน</option>
                          {THAI_MONTHS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">งานที่ปฏิบัติ</label>
                      {isReadOnly ? (
                        <span className="text-sm">{row.work_task || '-'}</span>
                      ) : (
                        <input
                          type="text"
                          className="w-full border border-slate-200 rounded-md px-2.5 py-2 text-sm focus:ring-1 focus:ring-green-500"
                          placeholder="เช่น สำรวจและติดตั้งกล่อง"
                          value={row.work_task}
                          onChange={(e) => updateRow(index, 'work_task', e.target.value)}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">รายละเอียดการทำบริการ</label>
                      {isReadOnly ? (
                        <span className="text-sm whitespace-pre-line">{row.service_details || '-'}</span>
                      ) : (
                        <textarea
                          className="w-full border border-slate-200 rounded-md px-2.5 py-2 text-sm focus:ring-1 focus:ring-green-500 min-h-[70px] resize-y"
                          placeholder={"1. สำรวจปลวกภายในอาคาร\n2. หากพบปลวกจะติดตั้งสถานี (AG)"}
                          value={row.service_details}
                          onChange={(e) => updateRow(index, 'service_details', e.target.value)}
                          rows={3}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add row */}
              {!isReadOnly && (
                <button
                  onClick={addRow}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 hover:border-green-400 hover:text-green-600 text-sm font-medium transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  เพิ่มครั้งที่ {rows.length + 1}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
};

export default ServiceSchedulePage;
