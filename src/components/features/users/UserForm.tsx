import React, { useEffect, useState } from 'react';
import Swal from '@/src/utils/swal';
import { User } from '@/src/types/entity/app.interface';
import { Account } from '@/src/types/entity/account.interface';
import { FormField, Input } from '../../common/FormControls';
import { DropdownSelect } from '../../common';
import { PhotoIcon, EyeIcon, EyeSlashIcon } from '../../../assets/icons/Icons';
import { getRoleNameTh } from '@/src/utils/role';
import { StorageApi } from '@/src/api/storage';
import { AccountApi } from '@/src/api/account';
import { usePermissions } from '@/src/hooks/usePermissions';
import { RoleAccountApi } from '@/src/api/role-account';
import {
  validateCitizenId,
  validateEmail,
  validatePassword,
  validatePhone,
} from '@/src/utils/validation';

export type UserFormMode = 'create' | 'edit' | 'view';

export interface UserFormSubmitArgs {
  /** ค่า formData ที่ user กรอก (mapped to backend fields) */
  payload: Record<string, unknown>;
  /** ไฟล์รูปใหม่ที่เลือก (ถ้ามี) */
  file: File | null;
  /** รหัสผ่านใหม่ (เฉพาะ edit + ถ้ากรอก) */
  newPassword?: string;
  /** บัญชีที่ผูกกับ role (เฉพาะกรณี SUPERADMIN ตั้งค่า) — empty = ลบ mapping */
  accountForRole?: { role_id: string; account_id: string | null };
}

interface UserFormProps {
  formId: string;
  mode: UserFormMode;
  user?: User | null;
  roles: { id: string; name: string }[];
  isSubmitting?: boolean;
  onSubmit: (args: UserFormSubmitArgs) => void | Promise<void>;
}

const initialFormData = {
  citizen_id: '',
  first_name: '',
  last_name: '',
  nickname: '',
  role_id: '',
  phone: '',
  email: '',
  password: '',
};

type FormDataShape = typeof initialFormData;


export const UserForm: React.FC<UserFormProps> = ({
  formId,
  mode,
  user,
  roles,
  isSubmitting = false,
  onSubmit,
}) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState<FormDataShape>(initialFormData);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // Edit-only password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // section "บัญชีบันทึกรายรับรายจ่าย" — check จาก permission ของผู้ใช้ที่ login อยู่
  // (ไม่ผูกกับ role_type หรือ name ของ user ที่กำลังสร้าง/แก้ไข)
  //   - create mode → ต้องมี CREATE_USER
  //   - edit / view mode → ต้องมี UPDATE_USER
  const { hasPermission } = usePermissions();
  const canEditRoleAccount = isCreate
    ? hasPermission('CREATE_USER')
    : hasPermission('UPDATE_USER');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [originalAccountId, setOriginalAccountId] = useState<string>('');

  // Hydrate from user (edit / view) or reset (create)
  useEffect(() => {
    if (user && (isEdit || isView)) {
      const role = user.role as unknown as { id?: string } | string | undefined;
      setFormData({
        citizen_id: user.citizen_id || '',
        first_name:
          user.first_name || (user.name ? user.name.split(' ')[0] : '') || '',
        last_name:
          user.last_name
          || (user.name ? user.name.split(' ').slice(1).join(' ') : '')
          || '',
        nickname: user.nick_name || '',
        role_id: typeof role === 'object' && role ? role.id || '' : '',
        phone: user.phone || '',
        email: user.email || '',
        password: '',
      });
      setImagePreview(user.url || null);
    } else if (isCreate) {
      setFormData(initialFormData);
      setImagePreview(null);
    }
    setErrors({});
    setSelectedFile(null);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [user, mode]);

  // โหลด accounts ครั้งเดียวเมื่อ SUPERADMIN เปิดฟอร์ม
  useEffect(() => {
    if (!canEditRoleAccount) return;
    AccountApi.getAll({ limit: 200, is_active: true })
      .then((res) => setAccounts(res?.data || []))
      .catch((err) => console.error('Failed to load accounts:', err));
  }, [canEditRoleAccount]);

  // โหลด role-account mapping เมื่อ role เปลี่ยน
  useEffect(() => {
    if (!canEditRoleAccount) {
      setAccountId('');
      setOriginalAccountId('');
      return;
    }
    const rid = formData.role_id;
    if (!rid) {
      setAccountId('');
      setOriginalAccountId('');
      return;
    }
    let cancelled = false;
    RoleAccountApi.getByRoleId(rid)
      .then((mapping) => {
        if (cancelled) return;
        const aId = mapping?.account_id || '';
        setAccountId(aId);
        setOriginalAccountId(aId);
      })
      .catch(() => {
        if (cancelled) return;
        setAccountId('');
        setOriginalAccountId('');
      });
    return () => { cancelled = true; };
  }, [canEditRoleAccount, formData.role_id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isView) return;
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setSelectedFile(file);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (isView) return;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};

    if (isCreate) {
      const citizenIdError = validateCitizenId(formData.citizen_id);
      if (citizenIdError) newErrors.citizen_id = citizenIdError;

      const passwordError = validatePassword(formData.password);
      if (passwordError) newErrors.password = passwordError;
    }

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const phoneError = validatePhone(formData.phone);
    if (phoneError) newErrors.phone = phoneError;

    if (!formData.first_name) newErrors.first_name = 'กรุณากรอกชื่อจริง';
    if (!formData.last_name) newErrors.last_name = 'กรุณากรอกนามสกุล';
    if (!formData.nickname) newErrors.nickname = 'กรุณากรอกชื่อเล่น';
    if (!formData.role_id) newErrors.role_id = 'กรุณาเลือกบทบาท';

    if (isEdit && newPassword && newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'รหัสผ่านไม่ตรงกัน';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isView) return;
    if (!validateForm()) return;

    const payload: Record<string, unknown> = {
      citizen_id: formData.citizen_id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      nick_name: formData.nickname,
      email: formData.email,
      phone: formData.phone,
      role_id: formData.role_id,
    };
    if (isCreate) {
      payload.password = formData.password;
      payload.status = 'active';
    }

    const accountForRole =
      canEditRoleAccount && formData.role_id && accountId !== originalAccountId
        ? { role_id: formData.role_id, account_id: accountId || null }
        : undefined;

    try {
      await onSubmit({
        payload,
        file: selectedFile,
        newPassword: isEdit && newPassword.trim() ? newPassword : undefined,
        accountForRole,
      });
    } catch (err) {
      console.error('Failed to submit user form', err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text:
          isCreate
            ? 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน'
            : 'เกิดข้อผิดพลาดในการแก้ไขผู้ใช้งาน',
      });
    }
  };

  const inputClass = (key: string) =>
    `h-11 ${errors[key] ? 'border-red-500 focus:ring-red-500' : ''}`;

  const isFieldDisabled = isView || isSubmitting;

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="p-4 bg-slate-50 rounded-lg space-y-6"
    >
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Image upload / display */}
          <div className="w-full md:w-1/3 flex flex-col items-center">
            <label className="block text-sm font-medium text-slate-700 mb-2 w-full text-left">
              รูปโปรไฟล์
            </label>
            <div
              className={`w-full aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden group transition-colors ${
                isView ? '' : 'hover:border-primary cursor-pointer'
              }`}
            >
              {!isView && (
                <input
                  id={`${formId}-file-upload`}
                  name="file-upload"
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  accept="image/png, image/jpeg"
                  onChange={handleImageChange}
                  disabled={isFieldDisabled}
                />
              )}
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
                    {isView ? 'ไม่มีรูป' : 'อัปโหลดรูปภาพ'}
                  </span>
                  {!isView && (
                    <span className="text-xs text-slate-400 mt-1">PNG, JPG</span>
                  )}
                </div>
              )}
              {imagePreview && !isView && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                    เปลี่ยนรูปภาพ
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Form fields */}
          <div className="w-full md:w-2/3 space-y-5">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">
                ข้อมูลส่วนตัว
              </h3>

              <FormField
                label={`เลขบัตรประชาชน (Username)${isCreate ? '*' : ''}`}
                htmlFor={`${formId}-citizen_id`}
              >
                <Input
                  id={`${formId}-citizen_id`}
                  name="citizen_id"
                  type="text"
                  maxLength={13}
                  placeholder="13 หลัก"
                  className={inputClass('citizen_id')}
                  value={formData.citizen_id}
                  onChange={handleChange}
                  disabled={isFieldDisabled || isEdit}
                />
                {errors.citizen_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.citizen_id}</p>
                )}
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="ชื่อจริง*" htmlFor={`${formId}-first_name`}>
                  <Input
                    id={`${formId}-first_name`}
                    name="first_name"
                    type="text"
                    placeholder="กรอกชื่อผู้ใช้งาน"
                    className={inputClass('first_name')}
                    value={formData.first_name}
                    onChange={handleChange}
                    disabled={isFieldDisabled}
                  />
                  {errors.first_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>
                  )}
                </FormField>
                <FormField label="นามสกุล*" htmlFor={`${formId}-last_name`}>
                  <Input
                    id={`${formId}-last_name`}
                    name="last_name"
                    type="text"
                    placeholder="กรอกนามสกุล"
                    className={inputClass('last_name')}
                    value={formData.last_name}
                    onChange={handleChange}
                    disabled={isFieldDisabled}
                  />
                  {errors.last_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>
                  )}
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="ชื่อเล่น*" htmlFor={`${formId}-nickname`}>
                  <Input
                    id={`${formId}-nickname`}
                    name="nickname"
                    type="text"
                    placeholder="กรอกชื่อเล่น"
                    className={inputClass('nickname')}
                    value={formData.nickname}
                    onChange={handleChange}
                    disabled={isFieldDisabled}
                  />
                  {errors.nickname && (
                    <p className="text-red-500 text-sm mt-1">{errors.nickname}</p>
                  )}
                </FormField>
                <FormField label="เบอร์โทรศัพท์*" htmlFor={`${formId}-phone`}>
                  <Input
                    id={`${formId}-phone`}
                    name="phone"
                    type="tel"
                    placeholder="กรอกเบอร์โทรศัพท์"
                    className={inputClass('phone')}
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isFieldDisabled}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </FormField>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">
                ข้อมูลบัญชี
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="อีเมล*" htmlFor={`${formId}-email`}>
                  <Input
                    id={`${formId}-email`}
                    name="email"
                    type="email"
                    placeholder="กรอกอีเมล"
                    className={inputClass('email')}
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isFieldDisabled}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </FormField>
                <FormField label="เลือกบทบาท*" htmlFor={`${formId}-role_id`}>
                  <DropdownSelect
                    value={formData.role_id}
                    onChange={(v) =>
                      handleChange({
                        target: { name: 'role_id', value: v },
                      } as React.ChangeEvent<HTMLSelectElement>)
                    }
                    placeholder="เลือกบทบาท"
                    options={roles.map((role) => ({
                      value: role.id,
                      label: getRoleNameTh(role.name),
                    }))}
                    disabled={isFieldDisabled}
                  />
                  {errors.role_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.role_id}</p>
                  )}
                </FormField>
              </div>

              {isCreate && (
                <FormField label="รหัสผ่าน*" htmlFor={`${formId}-password`}>
                  <div className="relative">
                    <Input
                      id={`${formId}-password`}
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="กรอกรหัสผ่าน"
                      className={`h-11 pr-11 ${
                        errors.password ? 'border-red-500 focus:ring-red-500' : ''
                      }`}
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isFieldDisabled}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeIcon className="w-5 h-5" />
                      ) : (
                        <EyeSlashIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                  )}
                </FormField>
              )}

              {isEdit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="รหัสผ่านใหม่" htmlFor={`${formId}-new_password`}>
                    <div className="relative">
                      <Input
                        id={`${formId}-new_password`}
                        type={showPassword ? 'text' : 'password'}
                        className="h-11 pr-11"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (
                            confirmPassword
                            && e.target.value !== confirmPassword
                          ) {
                            setErrors((prev) => ({
                              ...prev,
                              confirmPassword: 'รหัสผ่านไม่ตรงกัน',
                            }));
                          } else {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.confirmPassword;
                              return next;
                            });
                          }
                        }}
                        placeholder="กรอกรหัสผ่าน (เว้นว่างถ้าไม่ต้องการเปลี่ยน)"
                        disabled={isFieldDisabled}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeIcon className="w-5 h-5" />
                        ) : (
                          <EyeSlashIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </FormField>
                  <FormField
                    label="ยืนยันรหัสผ่าน"
                    htmlFor={`${formId}-confirm_password`}
                  >
                    <div className="relative">
                      <Input
                        id={`${formId}-confirm_password`}
                        type={showConfirmPassword ? 'text' : 'password'}
                        className={`h-11 pr-11 ${
                          errors.confirmPassword
                            ? 'border-red-500 focus:ring-red-500'
                            : ''
                        }`}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (
                            newPassword
                            && e.target.value
                            && newPassword !== e.target.value
                          ) {
                            setErrors((prev) => ({
                              ...prev,
                              confirmPassword: 'รหัสผ่านไม่ตรงกัน',
                            }));
                          } else {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.confirmPassword;
                              return next;
                            });
                          }
                        }}
                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                        disabled={isFieldDisabled}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeIcon className="w-5 h-5" />
                        ) : (
                          <EyeSlashIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </FormField>
                </div>
              )}
            </div>

            {canEditRoleAccount && (
              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">
                  บัญชีบันทึกรายรับรายจ่าย
                </h3>
                <FormField
                  label="บัญชี"
                  htmlFor={`${formId}-account_id`}
                >
                  <DropdownSelect
                    value={accountId}
                    onChange={(v) => setAccountId(v)}
                    placeholder="ไม่ผูกบัญชี (เห็นทุกบัญชี)"
                    options={[
                      { value: '', label: 'ไม่ผูกบัญชี (เห็นทุกบัญชี)' },
                      ...accounts.map((a) => ({
                        value: a.id,
                        label: `${a.account_number} (${a.account_name})`,
                      })),
                    ]}
                    disabled={isFieldDisabled || !formData.role_id}
                  />
                </FormField>
              </div>
            )}

            {isView && typeof user?.creditLimit === 'number' && (
              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">
                  ข้อมูลการเงิน
                </h3>
                <div>
                  <span className="text-sm text-slate-400">วงเงินจำกัดการเบิก</span>
                  <p className="text-xl font-bold text-primary">
                    {user.creditLimit.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    บาท
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

/**
 * Helper used by the modal wrapper to upload an avatar after the user
 * has been created/updated. Centralised here so both flows use the same
 * StorageApi call shape.
 */
export const uploadUserAvatar = async (file: File, userId?: string) => {
  return StorageApi.upload({
    file,
    path: 'users/avatars',
    entity_type: 'user',
    ...(userId ? { entity_id: userId } : {}),
    visibility: 'public',
  });
};
