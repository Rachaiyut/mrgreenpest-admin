import React, { useState, useRef, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { Card } from '../../components/common/Card';
import { IUnit } from '@/src/types/entity/unit.interface';
import { Unit as UnitApi } from '@/src/api/unit';
import {
  LoadingIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ManageIcon,
} from '../../assets/icons/Icons';
import { Pagination } from '../../components/common/Pagination';
import { UnitModal } from '../../components/features/units/UnitModal';
import { Input, Button } from '../../components/common/FormControls';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { formatThaiDate } from '@/src/utils/date';

const Units: React.FC = () => {
  const [units, setUnits] = useState<IUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<'create' | 'edit'>('create');
  const [unitToEdit, setUnitToEdit] = useState<IUnit | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<IUnit | null>(null);

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
      });
      setUnits(res.data || []);
      setTotalItems(res.meta?.total || (res.data || []).length);
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery]);

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

  const handleDelete = (unit: IUnit) => {
    setUnitToDelete(unit);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (!unitToDelete) return;
    try {
      await UnitApi.deleteUnit(unitToDelete.id);
      Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1500, showConfirmButton: false });
      fetchUnits();
    } catch (error) {
      console.error('Failed to delete unit:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถลบหน่วยนับได้' });
    } finally {
      setIsDeleteModalOpen(false);
      setUnitToDelete(null);
    }
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
    <>
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col min-h-[calc(100vh-64px)] space-y-6 max-w-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">หน่วยนับ</h1>
            <p className="mt-1 text-slate-600">จัดการหน่วยนับสินค้าและบริการ</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-80">
              <Input
                type="search"
                placeholder="ค้นหาหน่วยนับ..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
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
        </div>

        {loading ? (
          <Card className="!p-0 w-full flex flex-col overflow-hidden border border-slate-200 flex-1 shadow-sm items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center justify-center text-slate-500">
              <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="text-base font-medium">กำลังโหลดข้อมูลหน่วยนับ...</p>
            </div>
          </Card>
        ) : (
        <Card className="!p-0 w-full flex flex-col overflow-hidden border border-slate-200 flex-1 shadow-sm">
          <div className="overflow-auto w-full flex-1 relative">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider w-16">ลำดับ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">ชื่อหน่วยนับ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">สัญลักษณ์</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">วันที่สร้าง</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase tracking-wider w-24">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {units.length > 0 ? (
                  units.map((unit, idx) => (
                    <tr key={unit.id} className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-4 py-3 text-sm text-slate-500">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{unit.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">{unit.symbol}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatThaiDate(unit.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button data-unit-id={unit.id} onClick={(e) => handleDropdownToggle(unit.id, e)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                          <ManageIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">ไม่พบหน่วยนับ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalItems > 0 && (
            <div className="border-t border-slate-200 bg-white mt-auto sticky bottom-0 z-20 w-full">
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          )}
        </Card>
        )}
      </div>

      {openDropdownId && dropdownPosition && (
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 50 }}
          className="bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-40"
        >
          <button
            onClick={() => { const unit = units.find((u) => u.id === openDropdownId); if (unit) handleEdit(unit); }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <PencilIcon className="w-4 h-4 text-slate-400" />
            แก้ไข
          </button>
          <button
            onClick={() => { const unit = units.find((u) => u.id === openDropdownId); if (unit) handleDelete(unit); }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4 text-red-400" />
            ลบ
          </button>
        </div>
      )}

      <UnitModal
        isOpen={isFormModalOpen}
        onClose={() => { setIsFormModalOpen(false); setUnitToEdit(null); }}
        mode={formModalMode}
        initialValues={unitToEdit}
        onSubmit={handleSubmitUnit}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setUnitToDelete(null); }}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <div className="text-slate-600">
            คุณแน่ใจหรือไม่ว่าต้องการลบหน่วยนับ <strong>"{unitToDelete?.name}"</strong> การกระทำนี้ไม่สามารถย้อนกลับได้
          </div>
        }
      />
    </>
  );
};

export default Units;
