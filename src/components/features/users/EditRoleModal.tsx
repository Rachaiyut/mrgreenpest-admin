import type { FC, FormEvent } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Input, Button } from '../../common/FormControls';
import { RoleApi, Role, Permission } from '@/src/api/role';
import { PermissionApi } from '@/src/api/permission';
import { PERMISSION_MATRIX, PERMISSION_ACTIONS } from '@/src/constants/permission-matrix';
import { Fragment } from 'react';

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string | null;
  onSuccess?: (role: Role) => void;
}

export const EditRoleModal: FC<EditRoleModalProps> = ({ isOpen, onClose, roleId, onSuccess }) => {
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch permissions and role details when modal opens
  useEffect(() => {
    if (isOpen && roleId) {
      fetchData();
    } else {
      setRoleName('');
      setDescription('');
      setSelectedPermissionIds(new Set());
    }
  }, [isOpen, roleId]);

  const fetchData = async () => {
    if (!roleId) return;
    setIsLoading(true);
    try {
      // Fetch all permissions and role details in parallel
      const [permRes, roleRes] = await Promise.all([
        PermissionApi.getAll({ limit: 1000 }),
        RoleApi.getById(roleId)
      ]);

      setPermissions(permRes.data || []);

      const role = roleRes;
      setRoleName(role.name);
      setDescription(role.description || '');

      // Set selected permissions
      if (role.permissions && Array.isArray(role.permissions)) {
        // Handle various potential formats of permissions (array of strings, or objects)
        const ids = role.permissions.map((p: any) =>
          typeof p === 'string' ? p : (p.id || p.permission_id)
        ).filter(Boolean);
        setSelectedPermissionIds(new Set(ids));
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
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
    if (!roleId) return;

    setIsSaving(true);
    try {
      // 1. Update Role
      const updatedRole = await RoleApi.update(roleId, {
        name: roleName,
        description: description,
      });

      // 2. Assign Permissions
      await RoleApi.assignPermissions(roleId, Array.from(selectedPermissionIds));

      if (onSuccess) {
        onSuccess(updatedRole);
      }
      onClose();
    } catch (error) {
      console.error('Failed to update role', error);
      // You might want to show an error toast here
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="แก้ไขบทบาท"
      size="5xl"
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
            form="edit-role-form"
            variant="primary"
            disabled={isSaving}
          >
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </Button>
        </div>
      }
    >
      <form id="edit-role-form" onSubmit={handleSubmit} className="space-y-6">
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
            disabled={true}
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
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 w-64">
                      สิทธิ์การใช้งาน
                    </th>
                    {PERMISSION_ACTIONS.map((action) => (
                      <th
                        key={action.action}
                        className="px-4 py-3 text-center font-medium text-slate-600 uppercase tracking-wider"
                      >
                        {action.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {PERMISSION_MATRIX.map((group) => (
                    <Fragment key={group.groupName}>
                      <tr>
                        <td
                          colSpan={PERMISSION_ACTIONS.length + 1}
                          className="px-4 py-2 bg-slate-100 font-semibold text-slate-800 sticky left-0 z-10"
                        >
                          {group.groupName}
                        </td>
                      </tr>
                      {group.items.map((item) => (
                        <tr key={item.label} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-100">
                            {item.label}
                          </td>
                          {PERMISSION_ACTIONS.map((actionCol) => {
                            // Find permission by pattern: ACTION_MODULE
                            const permName = `${actionCol.action}_${item.module}`;
                            const perm = permissions.find((p) => p.name === permName);
                            // Some actions might not apply to some modules (e.g. APPROVE only for some)
                            // Ideally we check if perm exists. If not, maybe show disabled or empty.
                            // But since we mapped modules that mostly support CRUD, we'll assume it exists if in DB.

                            const isAvailable = !!perm;
                            const isChecked = perm ? selectedPermissionIds.has(perm.id) : false;

                            return (
                              <td key={actionCol.action} className="px-4 py-3 text-center">
                                {isAvailable ? (
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => perm && handleTogglePermission(perm.id)}
                                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                  />
                                ) : (
                                  <span className="block w-4 h-4 mx-auto bg-slate-100 rounded-sm"></span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
