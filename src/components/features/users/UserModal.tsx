import React, { useState } from 'react';
import Swal from '@/src/utils/swal';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { User } from '@/src/types/entity/app.interface';
import { RoleAccountApi } from '@/src/api/role-account';
import { UserForm, UserFormMode, uploadUserAvatar } from './UserForm';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: UserFormMode;
  user?: User | null;
  roles: { id: string; name: string }[];
  onCreateUser?: (data: any) => Promise<User | null>;
  onUpdateUser?: (data: any) => Promise<unknown> | unknown;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  mode,
  user,
  roles,
  onCreateUser,
  onUpdateUser,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formId = `user-form-${mode}`;

  const title =
    mode === 'create'
      ? 'สร้างผู้ใช้งานใหม่'
      : mode === 'edit'
        ? `แก้ไขผู้ใช้งาน: ${user?.name || ''}`
        : 'รายละเอียดผู้ใช้งาน';

  const handleSubmit = async ({
    payload,
    file,
    newPassword,
    accountForRole,
  }: {
    payload: Record<string, unknown>;
    file: File | null;
    newPassword?: string;
    accountForRole?: { role_id: string; account_id: string | null };
  }) => {
    if (mode === 'view') return;
    setIsSubmitting(true);
    try {
      if (mode === 'create' && onCreateUser) {
        const created = await onCreateUser({
          ...payload,
          storage_id: null,
        });

        if (created && file && onUpdateUser) {
          const uploaded = await uploadUserAvatar(file, created.id);
          await onUpdateUser({
            id: created.id,
            storage_id: uploaded.id,
          });
        }
      } else if (mode === 'edit' && user && onUpdateUser) {
        let storageId: string | null = null;
        if (file) {
          const uploaded = await uploadUserAvatar(file, user.id);
          storageId = uploaded.id;
        }
        const updatePayload: Record<string, unknown> = {
          id: user.id,
          ...payload,
        };
        if (newPassword) updatePayload.password = newPassword;
        if (storageId) updatePayload.storage_id = storageId;

        await onUpdateUser(updatePayload);
      }

      // SUPERADMIN — sync role-account mapping (1 role = 1 account)
      if (accountForRole?.role_id) {
        try {
          if (accountForRole.account_id) {
            await RoleAccountApi.upsert(accountForRole.role_id, accountForRole.account_id);
          } else {
            await RoleAccountApi.remove(accountForRole.role_id);
          }
        } catch (mappingErr) {
          console.error('Failed to sync role-account mapping', mappingErr);
          Swal.fire({
            icon: 'warning',
            title: 'บันทึกผู้ใช้สำเร็จ แต่ผูกบัญชีไม่สำเร็จ',
            text: 'กรุณาลองตั้งค่าบัญชีของบทบาทอีกครั้ง',
          });
        }
      }

      if (mode === 'create' || mode === 'edit') onClose();
    } catch (err) {
      console.error('User modal submit failed', err);
      const apiMessage =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        || (err as Error)?.message;
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text:
          apiMessage
          || (mode === 'create'
            ? 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน'
            : 'เกิดข้อผิดพลาดในการแก้ไขผู้ใช้งาน'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="5xl"
      footer={
        mode === 'view' ? (
          <div className="flex justify-end py-2">
            <Button
              type="button"
              onClick={onClose}
              variant="primary"
              className="h-12 px-6 rounded-lg text-base font-medium min-w-[110px]"
            >
              ปิด
            </Button>
          </div>
        ) : (
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
              form={formId}
              variant="primary"
              disabled={isSubmitting}
              className="h-16 px-5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-lg font-medium shadow-sm min-w-[110px]"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        )
      }
    >
      <UserForm
        formId={formId}
        mode={mode}
        user={user}
        roles={roles}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
};
