import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { User, UserRole } from '@/src/types/entity/app.interface';
import { FormField, Input, Select, Button } from '../../common/FormControls';
import { PhotoIcon } from '../../../assets/icons/Icons';
import { getRoleNameTh } from '@/src/utils/role';

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
      size="5xl"
      footer={
        <div className="flex justify-end py-2">
          <Button
            type="submit"
            form="edit-user-form"
            className="h-16 px-5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-lg font-medium shadow-sm min-w-[110px]"
            variant="primary"
          >
            บันทึก
          </Button>
        </div>
      }
    >
      <form id="add-user-form" onSubmit={handleSubmit} className="p-4 bg-slate-50 rounded-lg space-y-6">
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
                    <span className="text-sm font-medium text-slate-500">อัปโหลดรูปภาพ</span>
                    <span className="text-xs text-slate-400 mt-1">PNG, JPG</span>
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
                      required
                      placeholder="13 หลัก"
                      className="h-11"
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
                      className="h-11"
                    />
                  </FormField>
                  <FormField label="นามสกุล*" htmlFor="user-last-name">
                    <Input
                      id="user-last-name"
                      name="user-last-name"
                      type="text"
                      required
                      className="h-11"
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
                      className="h-11"
                    />
                  </FormField>
                  <FormField label="เบอร์โทรศัพท์*" htmlFor="user-phone">
                    <Input
                      id="user-phone"
                      name="user-phone"
                      type="tel"
                      required
                      className="h-11"
                    />
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
                      required
                      className="h-11"
                    />
                  </FormField>
                  <FormField label="เลือกบทบาท*" htmlFor="user-role-id">
                    <Select
                      id="user-role-id"
                      name="user-role-id"
                      required
                      className="h-11"
                    >
                      <option value="">เลือกบทบาท</option>
                      {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {getRoleNameTh(role.name)}
                          </option>
                        ))}
                    </Select>
                  </FormField>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <FormField label="รหัสผ่าน*" htmlFor="user-password">
                    <Input
                      id="user-password"
                      name="user-password"
                      type="password"
                      required
                      className="h-11"
                    />
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

