import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { User, UserRole } from '@/src/types/entity/app.interface';
import { FormField, Input, Select, Button } from '../../common/FormControls';
import { PhotoIcon } from '../../../assets/icons/Icons';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdateUser: (user: User) => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
}) => {
  const [formData, setFormData] = useState<Partial<User>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData(user);
      setImagePreview(user.avatarUrl);
    }
    if (!isOpen) {
      setImagePreview(null);
    }
  }, [user, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newUrl = URL.createObjectURL(file);
      setImagePreview(newUrl);
      setFormData((prev) => ({ ...prev, avatarUrl: newUrl }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      if (
        !formData.name ||
        !formData.phone ||
        !formData.role ||
        !formData.nickname
      ) {
        alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
        return;
      }
      const updatedUser: User = {
        ...user,
        ...formData,
        name: formData.name || user.name,
        nickname: formData.nickname || user.nickname,
        email: formData.email,
        phone: formData.phone || user.phone,
        role: formData.role || user.role,
        avatarUrl: formData.avatarUrl || user.avatarUrl,
        creditLimit: formData.creditLimit
          ? parseFloat(String(formData.creditLimit))
          : undefined,
      };
      onUpdateUser(updatedUser);
    }
    onClose();
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขผู้ใช้งาน: ${user.name}`}
      size="3xl"
      footer={
        <div className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
          >
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="edit-user-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
          >
            บันทึกการเปลี่ยนแปลง
          </Button>
        </div>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Image Upload */}
          <div className="md:col-span-1">
            <FormField label="รูปโปรไฟล์">
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mx-auto h-32 w-32 object-cover rounded-full"
                    />
                  ) : (
                    <div className="mx-auto h-32 w-32 flex items-center justify-center bg-slate-100 rounded-full">
                      <PhotoIcon className="h-12 w-12 text-slate-400" />
                    </div>
                  )}
                  <div className="flex text-sm text-slate-600 justify-center pt-2">
                    <label
                      htmlFor="file-upload-edit"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none"
                    >
                      <span>เปลี่ยนรูปภาพ</span>
                      <input
                        id="file-upload-edit"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/png, image/jpeg"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">PNG, JPG</p>
                </div>
              </div>
            </FormField>
          </div>

          {/* Form Fields */}
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="เลขบัตรประชาชน (Username)" htmlFor="nationalId">
                <Input
                  id="nationalId"
                  name="nationalId"
                  type="text"
                  value={formData.nationalId || ''}
                  readOnly
                  className="bg-slate-100"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ชื่อ-นามสกุล" htmlFor="name">
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name || ''}
                  onChange={handleChange}
                  required
                />
              </FormField>
              <FormField label="ชื่อเล่น" htmlFor="nickname">
                <Input
                  id="nickname"
                  name="nickname"
                  type="text"
                  value={formData.nickname || ''}
                  onChange={handleChange}
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="เบอร์โทรศัพท์" htmlFor="phone">
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  required
                />
              </FormField>
              <FormField label="อีเมล" htmlFor="email">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  placeholder="example@email.com"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="เลือกบทบาท" htmlFor="role">
                <Select
                  id="role"
                  name="role"
                  value={formData.role || ''}
                  onChange={handleChange}
                  required
                >
                  {Object.values(UserRole).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="จำกัดการเบิก (บาท)" htmlFor="creditLimit">
                <Input
                  id="creditLimit"
                  name="creditLimit"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={formData.creditLimit ?? ''}
                  onChange={handleChange}
                />
              </FormField>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

