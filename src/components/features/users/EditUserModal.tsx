import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { User, UserRole } from '@/src/types/entity/app.interface';
import { FormField, Input, Select, Button } from '../../common/FormControls';
import { PhotoIcon } from '../../../assets/icons/Icons';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdateUser: (data: any) => void;
  roles: { id: string; name: string }[];
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  roles,
}) => {
  const [formData, setFormData] = useState<any>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // Map user entity to form data
      setFormData({
        ...user,
        first_name: (user as any).first_name || user.name.split(' ')[0] || '',
        last_name: (user as any).last_name || user.name.split(' ').slice(1).join(' ') || '',
        role_id: typeof user.role === 'object' ? (user.role as any).id : '',
        citizen_id: user.citizen_id,
      });
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
      setFormData((prev: any) => ({ ...prev, avatarUrl: newUrl }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      if (
        !formData.first_name ||
        !formData.last_name ||
        !formData.phone ||
        !formData.role_id ||
        !formData.nickname
      ) {
        alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
        return;
      }

      // Map to Backend DTO (UpdateUserDto)
      const updatePayload = {
        id: user.id, // Keep UUID for API call url
        citizen_id: formData.citizen_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        nick_name: formData.nickname,
        email: formData.email,
        phone: formData.phone,
        role_id: formData.role_id,
        // password: only if changed? (Usually handled in separate change password flow or optional)
      };

      onUpdateUser(updatePayload);
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
              <FormField label="เลขบัตรประชาชน (Username)" htmlFor="citizen_id">
                <Input
                  id="citizen_id"
                  name="citizen_id"
                  type="text"
                  value={formData.citizen_id || ''}
                  readOnly
                  className="bg-slate-100"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ชื่อจริง" htmlFor="first_name">
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name || ''}
                  onChange={handleChange}
                  required
                />
              </FormField>
              <FormField label="นามสกุล" htmlFor="last_name">
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name || ''}
                  onChange={handleChange}
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ชื่อเล่น" htmlFor="nickname">
                <Input
                  id="nickname"
                  name="nickname"
                  type="text"
                  value={formData.nickname || ''} // Using 'nickname' property from formData which we mapped to 'nick_name' in payload? No state uses 'nickname'
                  // Wait, TS map above: setFormData({ ..., nick_name: user.nickname, ... }) -> I should use nick_name consistently or map back
                  // Current formData init: ...user (user has nickname)
                  // So formData.nickname exists.
                  onChange={handleChange}
                  required
                />
              </FormField>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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

              <FormField label="เลือกบทบาท" htmlFor="role_id">
                <Select
                  id="role_id"
                  name="role_id"
                  value={formData.role_id || ''}
                  onChange={handleChange}
                  required
                >
                  <option value="">เลือกบทบาท</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

