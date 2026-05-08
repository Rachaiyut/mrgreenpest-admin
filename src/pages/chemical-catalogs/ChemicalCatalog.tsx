import React, { useCallback, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';

import { Card } from '../../components/common/Card';
import { Input, Button } from '../../components/common/FormControls';
import { Pagination } from '../../components/common/Pagination';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import {
  LoadingIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ManageIcon,
  EyeIcon,
  ArchiveBoxIcon,
} from '../../assets/icons/Icons';
import { ChemicalCatalogApi } from '@/src/api/chemical-catalog';
import { ChemicalCatalog } from '@/src/types/entity/chemical-catalog.interface';
import { ChemicalCatalogModal } from '@/src/components/features/chemical-catalogs/ChemicalCatalogModal';
import { formatThaiDate } from '@/src/utils/date';

const ChemicalCatalogPage: React.FC = () => {
  const [items, setItems] = useState<ChemicalCatalog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<ChemicalCatalog | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ChemicalCatalog | null>(null);

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ChemicalCatalogApi.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setItems(res.data || []);
      setTotalItems(res.meta?.total || (res.data || []).length);
    } catch (error) {
      console.error('Failed to fetch chemical catalogs:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openDropdownId) return;
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
      if ((event.target as HTMLElement).closest('button[data-cc-id]')) return;
      setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const handleDropdownToggle = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (openDropdownId === id) {
      setOpenDropdownId(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setDropdownPosition({ top: rect.bottom + 4, left: rect.right - 160 });
    setOpenDropdownId(id);
  };

  const handleEdit = (item: ChemicalCatalog) => {
    setSelectedItem(item);
    setFormMode('edit');
    setIsFormModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (item: ChemicalCatalog) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await ChemicalCatalogApi.remove(itemToDelete.id);
      Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1500, showConfirmButton: false });
      fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถลบได้' });
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const getCreatorName = (item: ChemicalCatalog): string => {
    const c = item.creator;
    if (!c) return '-';
    return [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || c.nick_name || '-';
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col flex-1 space-y-6 max-w-full">
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ตัวอย่าง Catalog สารเคมี</h1>
            <p className="mt-1 text-slate-600">รายการตัวอย่างสารเคมีพร้อมรูปภาพ</p>
          </div>
          <Button
            onClick={() => {
              setSelectedItem(null);
              setFormMode('create');
              setIsFormModalOpen(true);
            }}
          >
            <PlusIcon className="h-5 w-5" />
            เพิ่มตัวอย่างสารเคมี
          </Button>
        </div>

        <Card className="!p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-80 flex-shrink-0">
              <Input
                type="search"
                placeholder="ค้นหาชื่อสารเคมี..."
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

        {loading ? (
          <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden items-center justify-center">
            <div className="flex flex-col items-center justify-center text-slate-500">
              <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="text-base font-medium">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col rounded-lg shadow-sm border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-auto w-full flex-1 relative">
              <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-16">ลำดับ</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">ชื่อสารเคมี</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">วันที่สร้าง</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">ผู้สร้าง</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider w-24">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.length > 0 ? (
                    items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/50 transition-colors [&>td]:align-top ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                      >
                        <td className="px-4 py-3 text-sm text-slate-500 text-center">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatThaiDate(item.created_at)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{getCreatorName(item)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            data-cc-id={item.id}
                            onClick={(e) => handleDropdownToggle(item.id, e)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          >
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
                          <p className="text-base font-medium text-slate-500">ไม่พบข้อมูลตัวอย่างสารเคมี</p>
                          <p className="text-sm mt-1">ลองเพิ่มตัวอย่างสารเคมีใหม่</p>
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
            onClick={() => {
              const item = items.find((i) => i.id === openDropdownId);
              if (item) {
                setPreviewImage(item.image_url || null);
                setOpenDropdownId(null);
              }
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <EyeIcon className="w-4 h-4 text-slate-400" />
            ดูรูป
          </button>
          <button
            onClick={() => {
              const item = items.find((i) => i.id === openDropdownId);
              if (item) handleEdit(item);
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <PencilIcon className="w-4 h-4 text-slate-400" />
            แก้ไข
          </button>
          <button
            onClick={() => {
              const item = items.find((i) => i.id === openDropdownId);
              if (item) handleDelete(item);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4 text-red-400" />
            ลบ
          </button>
        </div>
      )}

      <ChemicalCatalogModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedItem(null);
        }}
        mode={formMode}
        initialValues={selectedItem}
        onSaved={fetchData}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message={
          <div className="text-slate-600">
            คุณแน่ใจหรือไม่ว่าต้องการลบ <strong>"{itemToDelete?.name}"</strong>?
          </div>
        }
      />

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} alt="preview" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default ChemicalCatalogPage;
