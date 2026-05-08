import React, { useState, useEffect } from 'react';
import Swal from '@/src/utils/swal';
import { Modal } from '../../common/Modal';
import { User, UserRole } from '@/src/types/entity/app.interface';
import { FormField, Input, Button } from '../../common/FormControls';
import { DropdownSelect } from '../../common';
import { PhotoIcon, EyeIcon, EyeSlashIcon } from '../../../assets/icons/Icons';
import { getRoleNameTh } from '@/src/utils/role';
import { StorageApi } from '@/src/api/storage';
import {
  validateCitizenId,
  validateEmail,
  validatePassword,
  validatePhone,
} from '@/src/utils/validation';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (data: any) => Promise<User | null>;
  onUpdateUser: (data: any) => void;
  roles: { id: string; name: string }[];
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onCreateUser,
  onUpdateUser,
  roles,
}) => {
  const initialFormData = {
    'user-national-id': '',
    'user-password': '',
    'user-first-name': '',
    'user-last-name': '',
    'user-nickname': '',
    'user-role-id': '',
    'user-phone': '',
    'user-email': '',
  };
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof initialFormData, string>>
  >({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormData(initialFormData);
      setErrors({});
      setImagePreview(null);
      setSelectedFile(null);
      setIsUploading(false);
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setSelectedFile(file);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof initialFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof typeof initialFormData, string>> = {};

    const nationalIdError = validateCitizenId(formData['user-national-id']);
    if (nationalIdError) newErrors['user-national-id'] = nationalIdError;

    const passwordError = validatePassword(formData['user-password']);
    if (passwordError) newErrors['user-password'] = passwordError;

    const emailError = validateEmail(formData['user-email']);
    if (emailError) newErrors['user-email'] = emailError;

    const phoneError = validatePhone(formData['user-phone']);
    if (phoneError) newErrors['user-phone'] = phoneError;

    if (!formData['user-first-name'])
      newErrors['user-first-name'] = 'กรุณากรอกชื่อจริง';
    if (!formData['user-last-name'])
      newErrors['user-last-name'] = 'กรุณากรอกนามสกุล';
    if (!formData['user-nickname'])
      newErrors['user-nickname'] = 'กรุณากรอกชื่อเล่น';
    if (!formData['user-role-id'])
      newErrors['user-role-id'] = 'กรุณาเลือกบทบาท';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => {
        const el = document.querySelector('.text-red-500.text-xs, .text-red-500.text-sm');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsUploading(true);
      let storageId = null;

      if (selectedFile) {
        const uploadResult = await StorageApi.upload({
          file: selectedFile,
          path: 'users/avatars',
          entity_type: 'user',
          visibility: 'public',
        });
        storageId = uploadResult.id;
      }

      const newUser = {
        citizen_id: formData['user-national-id'],
        first_name: formData['user-first-name'],
        last_name: formData['user-last-name'],
        nick_name: formData['user-nickname'],
        email: formData['user-email'],
        password: formData['user-password'],
        role_id: formData['user-role-id'],
        phone: formData['user-phone'],
        status: 'active',
        storage_id: null, // จะถูกอัปเดตหลังจากอัปโหลดรูปภาพเสร็จ
      };

      const createdUser = await onCreateUser(newUser);

      if (createdUser && selectedFile) {
        // ถ้าสร้างผู้ใช้สำเร็จ และมีไฟล์รูปภาพ ให้ทำการอัปโหลดรูปภาพ
        const uploadResult = await StorageApi.upload({
          file: selectedFile,
          path: 'users/avatars',
          entity_type: 'user',
          entity_id: createdUser.id, // ใช้ ID ของผู้ใช้ที่สร้างใหม่
          visibility: 'public',
        });

        // อัปเดตข้อมูลผู้ใช้ด้วย storage_id ใหม่
        await onUpdateUser({
          id: createdUser.id,
          storage_id: uploadResult.id,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างผู้ใช้งานใหม่"
      size="5xl"
      footer={
        <div className="flex justify-end gap-3 py-2">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            className="h-16 px-5 rounded-lg text-lg font-medium min-w-[110px]"
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            form="add-user-form"
            className="h-16 px-5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-lg font-medium shadow-sm min-w-[110px]"
            variant="primary"
          >
            บันทึก
          </Button>
        </div>
      }
    >
      <form
        id="add-user-form"
        onSubmit={handleSubmit}
        className="p-4 bg-slate-50 rounded-lg space-y-6"
      >
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Image Upload Section */}
            <div className="w-full md:w-1/3 flex flex-col items-center">
              <label className="block text-sm font-medium text-slate-700 mb-2 w-full text-left">
                รูปโปรไฟล์
              </label>

              <div className="w-full aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden group hover:border-primary transition-colors cursor-pointer">
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  accept="image/png, image/jpeg"
                  onChange={handleImageChange}
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
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                      เปลี่ยนรูปภาพ
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Form Fields Section */}
            <div className="w-full md:w-2/3 space-y-5">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">
                  ข้อมูลส่วนตัว
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    label="เลขบัตรประชาชน (Username)*"
                    htmlFor="user-national-id"
                  >
                    <Input
                      id="user-national-id"
                      name="user-national-id"
                      type="text"
                      maxLength={13}
                      placeholder="13 หลัก"
                      className="h-11"
                      value={formData['user-national-id']}
                      onChange={handleChange}
                    />
                    {errors['user-national-id'] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors['user-national-id']}
                      </p>
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="ชื่อจริง*" htmlFor="user-first-name">
                    <Input
                      id="user-first-name"
                      name="user-first-name"
                      type="text"
                      placeholder="กรอกชื่อผู้ใช้งาน"
                      className="h-11"
                      value={formData['user-first-name']}
                      onChange={handleChange}
                    />
                    {errors['user-first-name'] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors['user-first-name']}
                      </p>
                    )}
                  </FormField>
                  <FormField label="นามสกุล*" htmlFor="user-last-name">
                    <Input
                      id="user-last-name"
                      name="user-last-name"
                      type="text"
                      placeholder="กรอกนามสกุล"
                      className="h-11"
                      value={formData['user-last-name']}
                      onChange={handleChange}
                    />
                    {errors['user-last-name'] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors['user-last-name']}
                      </p>
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="ชื่อเล่น*" htmlFor="user-nickname">
                    <Input
                      id="user-nickname"
                      name="user-nickname"
                      type="text"
                      placeholder="กรอกชื่อเล่น"
                      className="h-11"
                      value={formData['user-nickname']}
                      onChange={handleChange}
                    />
                    {errors['user-nickname'] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors['user-nickname']}
                      </p>
                    )}
                  </FormField>
                  <FormField label="เบอร์โทรศัพท์*" htmlFor="user-phone">
                    <Input
                      id="user-phone"
                      name="user-phone"
                      type="tel"
                      placeholder="กรอกเบอร์โทรศัพท์"
                      className="h-11"
                      value={formData['user-phone']}
                      onChange={handleChange}
                    />
                    {errors['user-phone'] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors['user-phone']}
                      </p>
                    )}
                  </FormField>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">
                  ข้อมูลบัญชี
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="อีเมล*" htmlFor="user-email">
                    <Input
                      id="user-email"
                      name="user-email"
                      type="email"
                      placeholder="กรอกอีเมล"
                      className="h-11"
                      value={formData['user-email']}
                      onChange={handleChange}
                    />
                    {errors['user-email'] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors['user-email']}
                      </p>
                    )}
                  </FormField>
                  <FormField label="เลือกบทบาท*" htmlFor="user-role-id">
                    <DropdownSelect
                      value={formData['user-role-id']}
                      onChange={(v) => handleChange({ target: { name: 'user-role-id', value: v } } as React.ChangeEvent<HTMLSelectElement>)}
                      placeholder="เลือกบทบาท"
                      options={roles.map((role) => ({ value: role.id, label: getRoleNameTh(role.name) }))}
                    />
                    {errors['user-role-id'] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors['user-role-id']}
                      </p>
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <FormField label="รหัสผ่าน*" htmlFor="user-password">
                    <div className="relative">
                      <Input
                        id="user-password"
                        name="user-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="กรอกรหัสผ่าน"
                        className="h-11 pr-11"
                        value={formData['user-password']}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors['user-password'] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors['user-password']}
                      </p>
                    )}
                  </FormField>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
