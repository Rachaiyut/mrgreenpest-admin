import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { User, UserRole } from '../../../types';
import { FormField, Input, Select, Button } from '../../common/FormControls';
import { PhotoIcon } from '../../../assets/icons/Icons';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (user: Omit<User, 'id'>) => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onCreateUser,
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
      !data['user-full-name'] ||
      !data['user-nickname'] ||
      !data['user-role'] ||
      !data['user-phone'] ||
      !imagePreview
    ) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    const newUser: Omit<User, 'id' | 'status'> = {
      nationalId: data['user-national-id'] as string,
      name: data['user-full-name'] as string,
      nickname: data['user-nickname'] as string,
      email: data['user-email'] as string | undefined,
      role: data['user-role'] as UserRole,
      phone: data['user-phone'] as string,
      avatarUrl: imagePreview,
      creditLimit: data['user-credit-limit']
        ? parseFloat(data['user-credit-limit'] as string)
        : undefined,
    };

    onCreateUser(newUser as Omit<User, 'id'>);
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
            <FormField label="รูปโปรไฟล์*">
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
                        required={!imagePreview}
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
                label="เลขบัตรประชาชน (Username)"
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
              <FormField label="รหัสผ่าน" htmlFor="user-password">
                <Input
                  id="user-password"
                  name="user-password"
                  type="password"
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ชื่อ-นามสกุล" htmlFor="user-full-name">
                <Input
                  id="user-full-name"
                  name="user-full-name"
                  type="text"
                  required
                />
              </FormField>
              <FormField label="ชื่อเล่น" htmlFor="user-nickname">
                <Input
                  id="user-nickname"
                  name="user-nickname"
                  type="text"
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="เบอร์โทรศัพท์" htmlFor="user-phone">
                <Input id="user-phone" name="user-phone" type="tel" required />
              </FormField>
              <FormField label="อีเมล" htmlFor="user-email">
                <Input
                  id="user-email"
                  name="user-email"
                  type="email"
                  placeholder="example@email.com"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="เลือกบทบาท" htmlFor="user-role">
                <Select id="user-role" name="user-role" required>
                  <option value="">เลือกบทบาท</option>
                  {Object.values(UserRole).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="จำกัดการเบิก (บาท)" htmlFor="user-credit-limit">
                <Input
                  id="user-credit-limit"
                  name="user-credit-limit"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                />
              </FormField>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
