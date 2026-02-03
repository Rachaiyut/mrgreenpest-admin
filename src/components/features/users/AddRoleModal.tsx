import type { FC, FormEvent } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Input, Button } from '../../common/FormControls';
import { RoleApi, Role, Permission } from '@/src/api/role';
import { PermissionApi } from '@/src/api/permission';

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (role: Role) => void;
}

export const AddRoleModal: FC<AddRoleModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch permissions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
      setRoleName('');
      setDescription('');
      setSelectedPermissionIds(new Set());
    }
  }, [isOpen]);

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const res = await PermissionApi.getAll({ limit: 1000 }); // Fetch all
      setPermissions(res.data || []);
    } catch (error) {
      console.error('Failed to fetch permissions', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group permissions by 'group' property
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      const groupName = perm.group || 'Other';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(perm);
    });
    return groups;
  }, [permissions]);

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

  const handleSelectGroup = (groupName: string, checked: boolean) => {
    const groupPerms = groupedPermissions[groupName] || [];
    setSelectedPermissionIds((prev) => {
      const newSet = new Set(prev);
      groupPerms.forEach((perm) => {
        if (checked) {
          newSet.add(perm.id);
        } else {
          newSet.delete(perm.id);
        }
      });
      return newSet;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Create Role
      const createdRole = await RoleApi.create({
        name: roleName,
        description: description,
        status: true
      });

      // 2. Assign Permissions
      if (selectedPermissionIds.size > 0) {
        await RoleApi.assignPermissions(createdRole.id, Array.from(selectedPermissionIds));
      }

      if (onSuccess) {
        onSuccess(createdRole);
      }
      onClose();
    } catch (error) {
      console.error('Failed to create role', error);
      // You might want to show an error toast here
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างบทบาทใหม่"
      size="2xl"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button
            type="button"
            onClick={onClose}
            className="bg-slate-100 text-slate-700 hover:bg-slate-200"
            variant="ghost"
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            form="add-role-form"
            variant="primary"
            disabled={isSaving}
          >
            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      }
    >
      <form id="add-role-form" onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="role-name"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            ชื่อบทบาท<span className="text-red-500">*</span>
          </label>
          <Input
            id="role-name"
            type="text"
            required
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="เช่น ผู้จัดการฝ่ายขาย"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            รายละเอียด
          </label>
          <Input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="คำอธิบายเพิ่มเติมเกี่ยวกับบทบาท"
          />
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-md font-medium text-slate-800 mb-3">สิทธิ์การใช้งาน</h3>

          {isLoading ? (
            <div className="text-center py-4 text-slate-500">กำลังโหลดข้อมูล...</div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto p-1">
              {Object.entries(groupedPermissions).map(([groupName, groupPerms]) => {
                const allChecked = groupPerms.every(p => selectedPermissionIds.has(p.id));
                const someChecked = groupPerms.some(p => selectedPermissionIds.has(p.id));

                return (
                  <div key={groupName} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-slate-700">{groupName}</div>
                      <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer hover:text-primary">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={input => { if (input) input.indeterminate = someChecked && !allChecked }}
                          onChange={(e) => handleSelectGroup(groupName, e.target.checked)}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        เลือกทั้งหมด
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {groupPerms.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-center gap-2 text-sm p-2 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissionIds.has(perm.id)}
                            onChange={() => handleTogglePermission(perm.id)}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span>{perm.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
