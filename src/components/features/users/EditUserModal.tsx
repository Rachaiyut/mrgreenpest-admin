import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Modal } from '../../common/Modal';
import { User } from '@/src/types/entity/app.interface';
import { FormField, Input, Select, Button } from '../../common/FormControls';
import { PhotoIcon, EyeIcon, EyeSlashIcon } from '../../../assets/icons/Icons';
import { getRoleNameTh } from '@/src/utils/role';
import { StorageApi } from '@/src/api/storage';
import { validateEmail, validatePhone } from '@/src/utils/validation';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        ...user,
        first_name: user.first_name || user.name.split(' ')[0] || '',
        last_name:
          user.last_name ||
          user.name.split(' ').slice(1).join(' ') ||
          '',
        nickname: user.nick_name || '',
        role_id: typeof user.role === 'object' ? (user.role as unknown as Record<string, string>).id : '',
        citizen_id: user.citizen_id,
      });
    
      setImagePreview(user.url || null);
      
      console.log("User Data in Modal:", user); 
    }
    if (!isOpen) {
      setImagePreview(null);
      setSelectedFile(null);
      setIsUploading(false);
      setErrors({});
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [user, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newUrl = URL.createObjectURL(file);
      setImagePreview(newUrl);
      setSelectedFile(file);
      setFormData((prev: any) => ({ ...prev, avatarUrl: newUrl }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const phoneError = validatePhone(formData.phone);
    if (phoneError) newErrors.phone = phoneError;

    if (!formData.first_name) newErrors.first_name = 'กรุณากรอกชื่อจริง';
    if (!formData.last_name) newErrors.last_name = 'กรุณากรอกนามสกุล';
    if (!formData.nickname) newErrors.nickname = 'กรุณากรอกชื่อเล่น';
    if (!formData.role_id) newErrors.role_id = 'กรุณาเลือกบทบาท';
    if (newPassword && newPassword !== confirmPassword) newErrors.confirmPassword = 'รหัสผ่านไม่ตรงกัน';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
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
            entity_id: user.id,
            visibility: 'public',
          });
          storageId = uploadResult.id;
        }

        // Map to Backend DTO (UpdateUserDto)
        const updatePayload: any = {
          id: user.id, // Keep UUID for API call url
          citizen_id: formData.citizen_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          nick_name: formData.nickname,
          email: formData.email,
          phone: formData.phone,
          role_id: formData.role_id,
        };

        if (newPassword.trim()) {
          updatePayload.password = newPassword;
        }

        if (storageId) {
          updatePayload.storage_id = storageId;
        }

        onUpdateUser(updatePayload);
        onClose();
      } catch (error) {
        console.error('Error updating user:', error);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการแก้ไขผู้ใช้งาน' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขผู้ใช้งาน: ${user.name}`}
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
            form="edit-user-form"
            className="h-16 px-5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-lg font-medium shadow-sm min-w-[110px]"
            variant="primary"
            disabled={isUploading}
          >
            {isUploading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      }
    >
      <form
        id="edit-user-form"
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
                  id="file-upload-edit"
                  name="file-upload"
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  accept="image/png, image/jpeg"
                  onChange={handleImageChange}
                  disabled={isUploading}
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
                    label="เลขบัตรประชาชน (Username)"
                    htmlFor="citizen_id"
                  >
                    <Input
                      id="citizen_id"
                      name="citizen_id"
                      type="text"
                      value={formData.citizen_id || ''}
                      onChange={handleChange}
                      maxLength={13}
                      className="h-11"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="ชื่อจริง*" htmlFor="first_name">
                    <Input
                      id="first_name"
                      name="first_name"
                      type="text"
                      placeholder="กรอกชื่อผู้ใช้งาน"
                      value={formData.first_name || ''}
                      onChange={handleChange}
                      className={`h-11 ${errors.first_name ? 'border-red-500 focus:ring-red-500' : ''}`}
                      disabled={isUploading}
                    />
                    {errors.first_name && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.first_name}
                      </p>
                    )}
                  </FormField>
                  <FormField label="นามสกุล*" htmlFor="last_name">
                    <Input
                      id="last_name"
                      name="last_name"
                      type="text"
                      placeholder="กรอกนามสกุล"
                      value={formData.last_name || ''}
                      onChange={handleChange}
                      className={`h-11 ${errors.last_name ? 'border-red-500 focus:ring-red-500' : ''}`}
                      disabled={isUploading}
                    />
                    {errors.last_name && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.last_name}
                      </p>
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="ชื่อเล่น*" htmlFor="nickname">
                    <Input
                      id="nickname"
                      name="nickname"
                      type="text"
                      placeholder="กรอกชื่อเล่น"
                      value={formData.nickname || ''}
                      onChange={handleChange}
                      className={`h-11 ${errors.nickname ? 'border-red-500 focus:ring-red-500' : ''}`}
                      disabled={isUploading}
                    />
                    {errors.nickname && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.nickname}
                      </p>
                    )}
                  </FormField>
                  <FormField label="เบอร์โทรศัพท์*" htmlFor="phone">
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="กรอกเบอร์โทรศัพท์"
                      value={formData.phone || ''}
                      onChange={handleChange}
                      className={`h-11 ${errors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
                      disabled={isUploading}
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.phone}
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
                  <FormField label="อีเมล*" htmlFor="email">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="กรอกอีเมล"
                      value={formData.email || ''}
                      onChange={handleChange}
                      className={`h-11 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                      disabled={isUploading}
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.email}
                      </p>
                    )}
                  </FormField>
                  <FormField label="เลือกบทบาท*" htmlFor="role_id">
                    <Select
                      id="role_id"
                      name="role_id"
                      value={formData.role_id || ''}
                      onChange={handleChange}
                      className="h-11"
                      disabled={isUploading}
                    >
                      <option value="">เลือกบทบาท</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {getRoleNameTh(role.name)}
                        </option>
                      ))}
                    </Select>
                    {errors.role_id && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.role_id}
                      </p>
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="รหัสผ่านใหม่" htmlFor="edit-password">
                    <div className="relative">
                      <Input
                        id="edit-password"
                        type={showPassword ? 'text' : 'password'}
                        className="h-11 pr-11"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (confirmPassword && e.target.value !== confirmPassword) {
                            setErrors(prev => ({ ...prev, confirmPassword: 'รหัสผ่านไม่ตรงกัน' }));
                          } else {
                            setErrors(prev => { const { confirmPassword: _, ...rest } = prev; return rest; });
                          }
                        }}
                        placeholder="กรอกรหัสผ่าน (เว้นว่างถ้าไม่ต้องการเปลี่ยน)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                      </button>
                    </div>
                  </FormField>
                  <FormField label="ยืนยันรหัสผ่าน" htmlFor="edit-confirm-password">
                    <div className="relative">
                      <Input
                        id="edit-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        className={`h-11 pr-11 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (newPassword && e.target.value && newPassword !== e.target.value) {
                            setErrors(prev => ({ ...prev, confirmPassword: 'รหัสผ่านไม่ตรงกัน' }));
                          } else {
                            setErrors(prev => { const { confirmPassword: _, ...rest } = prev; return rest; });
                          }
                        }}
                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
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
