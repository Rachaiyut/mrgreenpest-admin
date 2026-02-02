import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { User, UserRole } from '@/src/types/entity/app.interface';
import { FormField, Input, Select, Button } from '../../common/FormControls';
import { PhotoIcon } from '../../../assets/icons/Icons';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (data: any) => void;
  roles: { id: string; name: string }[];
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onCreateUser,
  roles,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setImagePreview(null);
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (
      !data['user-national-id'] ||
      !data['user-password'] ||
      !data['user-first-name'] ||
      !data['user-last-name'] ||
      !data['user-nickname'] ||
      !data['user-role-id'] ||
      !data['user-phone']
    ) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    // Map to Backend DTO (CreateUserDto)
    const newUser = {
      citizen_id: data['user-national-id'] as string,
      first_name: data['user-first-name'] as string,
      last_name: data['user-last-name'] as string,
      nick_name: data['user-nickname'] as string,
      email: data['user-email'] as string,
      password: data['user-password'] as string,
      role_id: data['user-role-id'] as string,
      phone: data['user-phone'] as string,
      status: 'active',
      // storage_id? 
      // avatar? backend DTO doesn't have it yet, maybe need to upload separately or base64? 
      // For now we omit avatarUrl as API doesn't seem to support it in CreateUserDto
    };

    onCreateUser(newUser);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างผู้ใช้งานใหม่"
      size="3xl"
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
            variant="outline"
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            form="add-user-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            variant="primary"
          >
            บันทึก
          </Button>
        </div>
      }
    >
      <form id="add-user-form" onSubmit={handleSubmit}>
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
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none"
                    >
                      <span>อัปโหลดรูปภาพ</span>
                      <input
                        id="file-upload"
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
              <FormField
                label="เลขบัตรประชาชน (Username)*"
                htmlFor="user-national-id"
              >
                <Input
                  id="user-national-id"
                  name="user-national-id"
                  type="text"
                  maxLength={13}
                  required
                  placeholder="13 หลัก"
                />
              </FormField>
              <FormField label="รหัสผ่าน*" htmlFor="user-password">
                <Input
                  id="user-password"
                  name="user-password"
                  type="password"
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ชื่อจริง*" htmlFor="user-first-name">
                <Input
                  id="user-first-name"
                  name="user-first-name"
                  type="text"
                  required
                />
              </FormField>
              <FormField label="นามสกุล*" htmlFor="user-last-name">
                <Input
                  id="user-last-name"
                  name="user-last-name"
                  type="text"
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ชื่อเล่น*" htmlFor="user-nickname">
                <Input
                  id="user-nickname"
                  name="user-nickname"
                  type="text"
                  required
                />
              </FormField>
              <FormField label="เบอร์โทรศัพท์*" htmlFor="user-phone">
                <Input id="user-phone" name="user-phone" type="tel" required />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="อีเมล*" htmlFor="user-email">
                <Input
                  id="user-email"
                  name="user-email"
                  type="email"
                  placeholder="example@email.com"
                  required
                />
              </FormField>
              <FormField label="เลือกบทบาท*" htmlFor="user-role-id">
                <Select id="user-role-id" name="user-role-id" required>
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

