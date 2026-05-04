import React, { useState, useRef, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { Card } from '../../components/common/Card';
import { IUnit } from '@/src/types/entity/unit.interface';
import { Unit as UnitApi } from '@/src/api/unit';
import {
  LoadingIcon,
  PlusIcon,
  PencilIcon,
  ManageIcon,
  ArchiveBoxIcon,
} from '../../assets/icons/Icons';
import { Pagination } from '../../components/common/Pagination';
import { UnitModal } from '../../components/features/units/UnitModal';
import { Input, Button, Select } from '../../components/common/FormControls';

const Units: React.FC = () => {
  const [units, setUnits] = useState<IUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<'create' | 'edit'>('create');
  const [unitToEdit, setUnitToEdit] = useState<IUnit | null>(null);

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await UnitApi.getUnit({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
        sort_by: 'created_at',
        sort_order: 'desc',
        ...(statusFilter !== '' ? { is_active: statusFilter === 'true' } : {}),
      });
      setUnits(res.data || []);
      setTotalItems(res.meta?.total || (res.data || []).length);
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, statusFilter]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openDropdownId) return;
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
      if ((event.target as HTMLElement).closest('button[data-unit-id]')) return;
      setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const handleDropdownToggle = (unitId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (openDropdownId === unitId) {
      setOpenDropdownId(null);
      return;
    }
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    setDropdownPosition({ top: rect.bottom + 4, left: rect.right - 160 });
    setOpenDropdownId(unitId);
  };

  const handleEdit = (unit: IUnit) => {
    setUnitToEdit(unit);
    setFormModalMode('edit');
    setIsFormModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleToggleStatus = async (unit: IUnit) => {
    try {
      await UnitApi.updateUnit(unit.id, { is_active: !unit.is_active });
      fetchUnits();
    } catch (error) {
      console.error('Error toggling unit status:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเปลี่ยนสถานะได้' });
    }
    setOpenDropdownId(null);
  };

  const handleSubmitUnit = async (data: Partial<IUnit>) => {
    try {
      if (formModalMode === 'edit' && unitToEdit) {
        await UnitApi.updateUnit(unitToEdit.id, data);
        Swal.fire({ icon: 'success', title: 'แก้ไขสำเร็จ', timer: 1500, showConfirmButton: false });
      } else {
        await UnitApi.createUnit(data);
        Swal.fire({ icon: 'success', title: 'เพิ่มสำเร็จ', timer: 1500, showConfirmButton: false });
      }
      fetchUnits();
    } catch (error) {
      console.error('Failed to save unit:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกหน่วยนับได้' });
    }
  };

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1 space-y-6 max-w-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">หน่วยนับ</h1>
            <p className="mt-1 text-slate-600">จัดการหน่วยนับสินค้าและบริการ</p>
          </div>
          <Button
            onClick={() => {
              setUnitToEdit(null);
              setFormModalMode('create');
              setIsFormModalOpen(true);
            }}
          >
            <PlusIcon className="h-5 w-5" />
            เพิ่มหน่วยนับ
          </Button>
        </div>

        {/* Toolbar */}
        <Card className="!p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-80 flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหาหน่วยนับ..."
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
            <div className="w-full sm:w-44 flex-shrink-0">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border-slate-300 shadow-sm text-sm h-10"
              >
                <option value="">สถานะทั้งหมด</option>
                <option value="true">ใช้งาน</option>
                <option value="false">ไม่ใช้งาน</option>
              </Select>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden items-center justify-center">
            <div className="flex flex-col items-center justify-center text-slate-500">
              <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="text-base font-medium">กำลังโหลดข้อมูลหน่วยนับ...</p>
            </div>
          </div>
        ) : (
        <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-auto w-full flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-16">ลำดับ</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">ชื่อหน่วยนับ</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">สัญลักษณ์</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">สถานะ</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-24">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {units.length > 0 ? (
                  units.map((unit, idx) => (
                    <tr key={unit.id} className={`hover:bg-slate-50/50 transition-colors [&>td]:text-center [&>td]:align-middle ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-4 py-3 text-sm text-slate-500">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{unit.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">{unit.symbol}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            unit.is_active !== false
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {unit.is_active !== false ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button data-unit-id={unit.id} onClick={(e) => handleDropdownToggle(unit.id, e)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                          <ManageIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-0 border-b-0 h-0">
                      <div className="absolute inset-0 top-[49px] flex flex-col items-center justify-center text-slate-400">
                        <ArchiveBoxIcon className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-base font-medium text-slate-500">ไม่พบหน่วยนับ</p>
                        <p className="text-sm mt-1">ลองปรับตัวกรองหรือสร้างหน่วยนับใหม่</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalItems > 0 && (
            <div className="mt-auto border-t border-slate-200">
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          )}
        </div>
        )}
      </div>

      {openDropdownId && dropdownPosition && (
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 50 }}
          className="bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-44"
        >
          <button
            onClick={() => { const unit = units.find((u) => u.id === openDropdownId); if (unit) handleEdit(unit); }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <PencilIcon className="w-4 h-4 text-slate-400" />
            แก้ไข
          </button>
          {(() => {
            const unit = units.find((u) => u.id === openDropdownId);
            if (!unit) return null;
            return (
              <button
                onClick={() => handleToggleStatus(unit)}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                {unit.is_active !== false ? (
                  <>
                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    ปิดใช้งาน
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    เปิดใช้งาน
                  </>
                )}
              </button>
            );
          })()}
        </div>
      )}

      <UnitModal
        isOpen={isFormModalOpen}
        onClose={() => { setIsFormModalOpen(false); setUnitToEdit(null); }}
        mode={formModalMode}
        initialValues={unitToEdit}
        onSubmit={handleSubmitUnit}
      />
    </div>
  );
};

export default Units;
