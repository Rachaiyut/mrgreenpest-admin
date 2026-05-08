import React, { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { Modal } from '../../common/Modal';
import { FormField, Input, Textarea, Button } from '../../common/FormControls';
import { ChemicalCatalog } from '@/src/types/entity/chemical-catalog.interface';
import { ChemicalCatalogApi } from '@/src/api/chemical-catalog';
import { StorageApi } from '@/src/api/storage';
import { PhotoIcon, XIcon } from '@/src/assets/icons/Icons';

interface ChemicalCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialValues?: ChemicalCatalog | null;
  onSaved?: () => void;
}

export const ChemicalCatalogModal: React.FC<ChemicalCatalogModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageId, setExistingImageId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialValues) {
      setName(initialValues.name || '');
      setDescription(initialValues.description || '');
      setImagePreview(initialValues.image_url || null);
      setExistingImageId(initialValues.image_id || null);
    } else {
      setName('');
      setDescription('');
      setImagePreview(null);
      setExistingImageId(null);
    }
    setImageFile(null);
    setFormErrors({});
  }, [isOpen, mode, initialValues]);

  const handleFile = (file: File | null) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormErrors({ name: 'กรุณากรอกชื่อสารเคมี' });
      setTimeout(() => document.querySelector('.text-red-500.text-xs')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      return;
    }
    setFormErrors({});
    setIsSubmitting(true);
    try {
      let savedId: string;
      if (mode === 'edit' && initialValues) {
        await ChemicalCatalogApi.update(initialValues.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        savedId = initialValues.id;
      } else {
        const created = await ChemicalCatalogApi.create({
          name: name.trim(),
          description: description.trim() || undefined,
        });
        savedId = (created as any)?.data?.id || (created as any)?.id;
      }

      if (imageFile && savedId) {
        if (existingImageId) {
          await StorageApi.remove(existingImageId).catch(() => {});
        }
        const uploadRes = await StorageApi.upload({
          file: imageFile,
          path: `chemical-catalogs/${savedId}`,
          entity_type: 'CHEMICAL_CATALOG',
          entity_id: savedId,
          type: 'image',
          visibility: 'private',
        });
        const storageId =
          (uploadRes as any)?.data?.id || (uploadRes as any)?.id;
        if (storageId) {
          await ChemicalCatalogApi.update(savedId, { image_id: storageId });
        }
      } else if (mode === 'edit' && existingImageId && !imagePreview) {
        await StorageApi.remove(existingImageId).catch(() => {});
        await ChemicalCatalogApi.update(savedId, { image_id: null as any });
      }

      Swal.fire({
        icon: 'success',
        title: mode === 'create' ? 'เพิ่มสำเร็จ' : 'บันทึกสำเร็จ',
        timer: 1500,
        showConfirmButton: false,
      });
      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Failed to save chemical catalog', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกข้อมูลได้',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = name.trim().length > 0;

  const getTitle = () => {
    if (mode === 'create') return 'เพิ่มตัวอย่างสารเคมีใหม่';
    return `แก้ไขตัวอย่างสารเคมี: ${initialValues?.name || ''}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      size="4xl"
      footer={
        <div className="flex gap-3 w-full justify-end">
          <Button variant="secondary" onClick={onClose} type="button">
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="chemical-catalog-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      }
    >
      <form
        id="chemical-catalog-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <FormField label="รูปสารเคมี">
              <div className="w-full aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden group hover:border-primary transition-colors cursor-pointer">
                <input
                  id="cc-image"
                  ref={fileInputRef}
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  accept="image/png, image/jpeg"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />

                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <div className="p-4 bg-white rounded-full shadow-sm mb-2">
                      <PhotoIcon className="h-8 w-8 text-slate-300" />
                    </div>
                    <span className="text-sm font-medium text-slate-500">
                      อัปโหลดรูปภาพ
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      PNG, JPG
                    </span>
                  </div>
                )}

                {imagePreview && (
                  <>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                        เปลี่ยนรูปภาพ
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage();
                      }}
                      className="absolute top-2 right-2 z-20 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 shadow"
                      aria-label="ลบรูป"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </FormField>
          </div>

          <div className="md:col-span-2 space-y-4">
            <FormField label="ชื่อสารเคมี *" htmlFor="cc-name">
              <Input
                id="cc-name"
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formErrors.name) setFormErrors({});
                }}
                placeholder="เช่น น้ำยากำจัดปลวก X100"
                maxLength={255}
              />
              {formErrors.name && (
                <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
              )}
            </FormField>

            <FormField label="รายละเอียด" htmlFor="cc-description">
              <Textarea
                id="cc-description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม..."
                rows={8}
              />
            </FormField>
          </div>
        </div>
      </form>
    </Modal>
  );
};
