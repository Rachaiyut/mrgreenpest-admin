import type { FC, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { RoleApi, Role, Permission } from '@/src/api/role';
import { PermissionApi } from '@/src/api/permission';
import { RoleForm } from './RoleForm';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  roleId?: string;
  onSuccess?: (role: Role) => void;
}

export const RoleModal: FC<RoleModalProps> = ({
  isOpen,
  onClose,
  mode,
  roleId,
  onSuccess,
}) => {
  const [roleName, setRoleName] = useState('');
  const [roleType, setRoleType] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; roleType?: string }>({});

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && roleId) {
        fetchEditData();
      } else {
        fetchPermissions();
        resetForm();
      }
    }
  }, [isOpen, mode, roleId]);

  const resetForm = () => {
    setRoleName('');
    setRoleType('');
    setDescription('');
    setSelectedPermissionIds(new Set());
    setErrors({});
  };

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const res = await PermissionApi.getAll();
      setPermissions(res.data || []);
    } catch (error) {
      console.error('Failed to fetch permissions', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEditData = async () => {
    if (!roleId) return;
    setIsLoading(true);
    try {
      const [permRes, roleRes] = await Promise.all([
        PermissionApi.getAll(),
        RoleApi.getById(roleId),
      ]);

      setPermissions(permRes.data || []);
      setRoleName(roleRes.name);
      setRoleType((roleRes as Record<string, string>).role_type || '');
      setDescription(roleRes.description || '');

      if (roleRes.permissions && Array.isArray(roleRes.permissions)) {
        const ids = roleRes.permissions
          .map((p: Permission | string) => (typeof p === 'string' ? p : p.id))
          .filter(Boolean);
        setSelectedPermissionIds(new Set(ids));
      }
    } catch (error) {
      console.error('Failed to fetch role data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePermission = (id: string) => {
    setSelectedPermissionIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const nextErrors: { name?: string; roleType?: string } = {};
    if (!roleName.trim()) nextErrors.name = 'กรุณากรอกชื่อบทบาท';
    if (!roleType) nextErrors.roleType = 'กรุณาเลือกประเภทบทบาท';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      let savedRole: Role;

      if (mode === 'create') {
        savedRole = await RoleApi.create({
          name: roleName.trim(),
          role_type: roleType,
          description,
          status: true,
        } as Record<string, unknown>);
      } else {
        savedRole = await RoleApi.update(roleId!, {
          name: roleName.trim(),
          role_type: roleType,
          description,
        } as Record<string, unknown>);
      }

      if (selectedPermissionIds.size > 0) {
        await RoleApi.assignPermissions(savedRole.id, Array.from(selectedPermissionIds));
      }

      onSuccess?.(savedRole);
      onClose();
    } catch (error) {
      const errData = (error as { response?: { data?: { message?: string; code?: string } } })
        ?.response?.data;
      if (errData?.code === 'DUPLICATE_ROLE_NAME') {
        setErrors({ name: errData.message || 'ชื่อบทบาทนี้ถูกใช้งานแล้ว' });
      } else {
        console.error(`Failed to ${mode} role`, error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const formId = 'role-form';
  const title = mode === 'create' ? 'สร้างบทบาทใหม่' : 'แก้ไขบทบาท';
  const submitLabel = mode === 'create' ? 'บันทึก' : 'บันทึกการเปลี่ยนแปลง';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="5xl"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
          >
            ยกเลิก
          </Button>
          <Button type="submit" form={formId} variant="primary" disabled={isSaving}>
            {isSaving ? 'กำลังบันทึก...' : submitLabel}
          </Button>
        </div>
      }
    >
      <RoleForm
        formId={formId}
        roleName={roleName}
        roleType={roleType}
        description={description}
        permissions={permissions}
        selectedPermissionIds={selectedPermissionIds}
        isLoading={isLoading}
        errors={errors}
        onRoleNameChange={(v) => {
          setRoleName(v);
          if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
        }}
        onRoleTypeChange={(v) => {
          setRoleType(v);
          if (errors.roleType) setErrors((prev) => ({ ...prev, roleType: undefined }));
        }}
        onDescriptionChange={setDescription}
        onTogglePermission={handleTogglePermission}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
};
