import type { FC, FormEvent } from 'react';
import { useState, useEffect, useMemo, Fragment } from 'react';
import { Modal } from '../../common/Modal';
import { Input, Button } from '../../common/FormControls';
import { RoleApi, Role, Permission } from '@/src/api/role';
import { PermissionApi } from '@/src/api/permission';
import {
  PERMISSION_MATRIX,
  PERMISSION_ACTIONS,
} from '@/src/constants/permission-matrix';

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (role: Role) => void;
}

export const AddRoleModal: FC<AddRoleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<
    Set<string>
  >(new Set());
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
      const res = await PermissionApi.getAll();
      setPermissions(res.data || []);
    } catch (error) {
      console.error('Failed to fetch permissions', error);
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
    setIsSaving(true);
    try {
      // 1. Create Role
      const createdRole = await RoleApi.create({
        name: roleName,
        description: description,
        status: true,
      });

      // 2. Assign Permissions
      if (selectedPermissionIds.size > 0) {
        await RoleApi.assignPermissions(
          createdRole.id,
          Array.from(selectedPermissionIds)
        );
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <div className="pt-2">
          <h3 className="text-md font-medium text-slate-800 mb-3">
            สิทธิ์การใช้งาน
          </h3>

          {isLoading ? (
            <div className="text-center py-4 text-slate-500">
              กำลังโหลดข้อมูล...
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[60vh]">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50 z-20 w-64 border-r border-slate-200">
                      สิทธิ์การใช้งาน
                    </th>
                    {PERMISSION_ACTIONS.map((action) => (
                      <th
                        key={action.action}
                        className="px-4 py-3 text-center font-medium text-slate-600 uppercase tracking-wider bg-slate-50"
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
                          className="px-4 py-2 bg-slate-100 font-semibold text-slate-800 sticky left-0 z-10 border-r border-slate-200"
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
                            const perm = permissions.find(
                              (p) => p.name === permName
                            );

                            const isAvailable = !!perm;
                            const isChecked = perm
                              ? selectedPermissionIds.has(perm.id)
                              : false;

                            return (
                              <td
                                key={actionCol.action}
                                className="px-4 py-3 text-center"
                              >
                                {isAvailable ? (
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      perm && handleTogglePermission(perm.id)
                                    }
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
