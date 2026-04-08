import type { FC, FormEvent } from 'react';
import { Fragment } from 'react';
import { Input } from '../../common/FormControls';
import { Permission } from '@/src/api/role';
import {
  PERMISSION_MATRIX,
  PERMISSION_ACTIONS,
} from '@/src/constants/permission-matrix';

interface RoleFormProps {
  formId: string;
  roleName: string;
  roleType: string;
  description: string;
  permissions: Permission[];
  selectedPermissionIds: Set<string>;
  isLoading: boolean;
  readOnly?: boolean;
  onRoleNameChange: (value: string) => void;
  onRoleTypeChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTogglePermission: (id: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export const RoleForm: FC<RoleFormProps> = ({
  formId,
  roleName,
  roleType,
  description,
  permissions,
  selectedPermissionIds,
  isLoading,
  readOnly = false,
  onRoleNameChange,
  onRoleTypeChange,
  onDescriptionChange,
  onTogglePermission,
  onSubmit,
}) => {
  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="role-name" className="block text-sm font-medium text-slate-700 mb-1">
            ชื่อบทบาท<span className="text-red-500">*</span>
          </label>
          <Input
            id="role-name"
            type="text"
            required
            disabled={readOnly}
            value={roleName}
            onChange={(e) => onRoleNameChange(e.target.value)}
            placeholder="เช่น ผู้จัดการฝ่ายขาย"
          />
        </div>
        <div>
          <label htmlFor="role-type" className="block text-sm font-medium text-slate-700 mb-1">
            ประเภทบทบาท<span className="text-red-500">*</span>
          </label>
          <select
            id="role-type"
            required
            disabled={readOnly}
            value={roleType}
            onChange={(e) => onRoleTypeChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="">เลือกประเภท</option>
            <option value="MANAGEMENT">ผู้บริหาร/จัดการ</option>
            <option value="EXECUTIVE">ผู้บริหารระดับสูง</option>
            <option value="FIELD_LEAD">หัวหน้าทีมช่าง</option>
            <option value="FIELD_TECH">ช่างปฏิบัติงาน</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
          รายละเอียด
        </label>
        <textarea
          id="description"
          rows={3}
          disabled={readOnly}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="คำอธิบายเพิ่มเติมเกี่ยวกับบทบาท"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:bg-slate-50 disabled:text-slate-500"
        />
      </div>

      <div className="pt-2">
        <h3 className="text-md font-medium text-slate-800 mb-3">สิทธิ์การใช้งาน</h3>

        {isLoading ? (
          <div className="text-center py-4 text-slate-500">กำลังโหลดข้อมูล...</div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[60vh]">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-50 z-20 w-64 border-r border-slate-200">
                    สิทธิ์การใช้งาน
                  </th>
                  {PERMISSION_ACTIONS.map((action) => (
                    <th key={action.action} className="px-4 py-3 text-center font-medium text-slate-600 uppercase tracking-wider bg-slate-50">
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
                          const permName = `${actionCol.action}_${item.module}`;
                          const perm = permissions.find((p) => p.name === permName);
                          const isAvailable = !!perm;
                          const isChecked = perm ? selectedPermissionIds.has(perm.id) : false;

                          return (
                            <td key={actionCol.action} className="px-4 py-3 text-center">
                              {isAvailable ? (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={readOnly}
                                  onChange={() => perm && onTogglePermission(perm.id)}
                                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                />
                              ) : (
                                <span className="block w-4 h-4 mx-auto bg-slate-100 rounded-sm" />
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
  );
};
