import type { FC } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { RoleApi, Role, Permission } from '@/src/api/role';
import {
  PERMISSION_MATRIX,
  PERMISSION_ACTIONS,
} from '@/src/constants/permission-matrix';
import { Fragment } from 'react';

interface RoleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string | null;
}

export const RoleDetailsModal: FC<RoleDetailsModalProps> = ({
  isOpen,
  onClose,
  roleId,
}) => {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && roleId) {
      fetchRoleDetails();
    } else {
      setRole(null);
    }
  }, [isOpen, roleId]);

  const fetchRoleDetails = async () => {
    if (!roleId) return;
    setLoading(true);
    try {
      const data = await RoleApi.getById(roleId);
      setRole(data);
    } catch (error) {
      console.error('Failed to fetch role details', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions = useMemo(() => {
    if (!role || !role.permissions) return {};
    const groups: Record<string, Permission[]> = {};

    // Normalize permissions to array of Permission objects
    const perms = role.permissions
      .map((p: any) => (p.id && p.name ? p : null))
      .filter(Boolean) as Permission[];

    perms.forEach((perm) => {
      const groupName = perm.group || 'Other';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(perm);
    });
    return groups;
  }, [role]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={role ? `รายละเอียดบทบาท: ${role.name}` : 'รายละเอียดบทบาท'}
      size="5xl"
      footer={
        <div className="flex justify-end w-full">
          <Button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold shadow-sm"
            variant="ghost"
          >
            ปิด
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="text-center py-8 text-slate-500">
          กำลังโหลดข้อมูล...
        </div>
      ) : role ? (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-slate-500 mb-1">
              ชื่อบทบาท
            </h4>
            <p className="text-lg font-semibold text-slate-900">{role.name}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-500 mb-1">
              รายละเอียด
            </h4>
            <p className="text-slate-700">{role.description || '-'}</p>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-md font-medium text-slate-800 mb-3">
              สิทธิ์การใช้งาน
            </h4>
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
                        <tr key={item.module} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-100">
                            {item.label}
                          </td>
                          {PERMISSION_ACTIONS.map((actionCol) => {
                            // Find permission by pattern: ACTION_MODULE
                            const permName = `${actionCol.action}_${item.module}`;
                            const perm = role?.permissions?.find(
                              (p: any) => p.name === permName
                            );

                            const isAvailable = true; // In view mode we can assume all defined in matrix are potential
                            const isChecked = !!perm;

                            return (
                              <td
                                key={actionCol.action}
                                className="px-4 py-3 text-center"
                              >
                                {isAvailable ? (
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled
                                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-default disabled:opacity-100 disabled:checked:text-primary"
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
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">ไม่พบข้อมูลบทบาท</div>
      )}
    </Modal>
  );
};
