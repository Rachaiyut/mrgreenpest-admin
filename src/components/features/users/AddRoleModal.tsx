import type { FC, FormEvent } from 'react';
import { useState, useMemo, useEffect, Fragment } from 'react';
import { Modal } from '../../common/Modal';
import { Input } from '../../common/FormControls';

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PERMISSION_ACTIONS = ['ดู', 'สร้าง', 'แก้ไข', 'ลบ', 'อนุมัติ'];

const PERMISSION_GROUPS = [
  {
    groupName: 'ภาพรวมและลูกค้า',
    items: ['Dashboard', 'ลูกค้า', 'สัญญา', 'การต่ออายุสัญญา'],
  },
  {
    groupName: 'ภาคสนาม',
    items: ['ใบประเมิน', 'ภาคสนาม', 'รายงานบริการ'],
  },
  {
    groupName: 'กลุ่มเอกสารการจัดซื้อและบัญชี',
    items: ['ใบเสนอราคา', 'ใบแจ้งหนี้/ใบวางบิล', 'ใบกำกับภาษี/ใบเสร็จรับเงิน'],
  },
  {
    groupName: 'กลุ่ม คลังสินค้า',
    items: [
      'แพ็กเกจ',
      'สินค้า/บริการ',
      'คลังสินค้า',
      'ผู้จัดจำหน่าย',
      'รับเข้า',
      'เบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย',
      'โอนย้าย',
      'ปรับปรุง Stock',
      'คืนสินค้า',
      'จำกัดการเบิก',
    ],
  },
  {
    groupName: 'ตั้งค่าระบบ',
    items: ['ผู้ใช้งาน', 'จัดการบทบาท', 'รายงาน', 'กำหนดวงเงินเบิก'],
  },
];

const allPermissionItems = PERMISSION_GROUPS.flatMap((g) => g.items);

const VIEW_ONLY_ITEMS = ['Dashboard', 'รายงาน'];
const APPROVABLE_ITEMS = [
  'ใบประเมิน',
  'ใบเสนอราคา',
  'รับเข้า',
  'เบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย',
];

const isActionDisabled = (item: string, action: string): boolean => {
  if (VIEW_ONLY_ITEMS.includes(item) && action !== 'ดู') {
    return true;
  }
  if (item === 'กำหนดวงเงินเบิก' && !['ดู', 'แก้ไข'].includes(action)) {
    return true;
  }
  if (item === 'จำกัดการเบิก' && action === 'อนุมัติ') {
    return true;
  }
  if (action === 'อนุมัติ' && !APPROVABLE_ITEMS.includes(item)) {
    return true;
  }
  return false;
};

export const AddRoleModal: FC<AddRoleModalProps> = ({ isOpen, onClose }) => {
  const initialPermissions = useMemo(() => {
    return allPermissionItems.reduce(
      (acc, item) => {
        acc[item] = PERMISSION_ACTIONS.reduce(
          (itemAcc, action) => {
            itemAcc[action] = false;
            return itemAcc;
          },
          {} as Record<string, boolean>
        );
        return acc;
      },
      {} as Record<string, Record<string, boolean>>
    );
  }, []);

  const [permissions, setPermissions] = useState(initialPermissions);

  useEffect(() => {
    if (isOpen) {
      setPermissions(initialPermissions);
    }
  }, [isOpen, initialPermissions]);

  const handlePermissionChange = (
    item: string,
    action: string,
    checked: boolean
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [item]: {
        ...prev[item],
        [action]: checked,
      },
    }));
  };

  const handleSelectAllForRow = (item: string, checked: boolean) => {
    setPermissions((prev) => {
      const newPermissionsForItem = { ...prev[item] };
      PERMISSION_ACTIONS.forEach((action) => {
        if (!isActionDisabled(item, action)) {
          newPermissionsForItem[action] = checked;
        }
      });
      return { ...prev, [item]: newPermissionsForItem };
    });
  };

  const handleSelectAllForColumn = (action: string, checked: boolean) => {
    setPermissions((prev) => {
      const newPermissions = { ...prev };
      allPermissionItems.forEach((item) => {
        if (!isActionDisabled(item, action)) {
          newPermissions[item] = {
            ...newPermissions[item],
            [action]: checked,
          };
        }
      });
      return newPermissions;
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log('Saving role with permissions:', permissions);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="จัดการบทบาท"
      size="5xl"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="add-role-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
          >
            บันทึก
          </button>
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
            placeholder="เช่น ผู้จัดการฝ่ายขาย"
          />
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 bg-slate-50 z-10 px-4 py-3 text-left font-medium text-slate-600 uppercase tracking-wider"
                >
                  สิทธิ์การใช้งาน
                </th>
                {PERMISSION_ACTIONS.map((action) => {
                  const enabledItemsForAction = allPermissionItems.filter(
                    (item) => !isActionDisabled(item, action)
                  );
                  const areAllChecked =
                    enabledItemsForAction.length > 0 &&
                    enabledItemsForAction.every(
                      (item) => permissions[item]?.[action]
                    );
                  return (
                    <th
                      key={action}
                      scope="col"
                      className="px-4 py-3 text-center font-medium text-slate-600 uppercase tracking-wider"
                    >
                      <label className="flex flex-col items-center justify-center gap-1">
                        <span>{action}</span>
                        <input
                          type="checkbox"
                          checked={areAllChecked}
                          onChange={(e) =>
                            handleSelectAllForColumn(action, e.target.checked)
                          }
                        />
                      </label>
                    </th>
                  );
                })}
                <th
                  scope="col"
                  className="px-4 py-3 text-center font-medium text-slate-600 uppercase tracking-wider"
                >
                  <label className="flex flex-col items-center justify-center gap-1">
                    <span>ทั้งหมด</span>
                  </label>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {PERMISSION_GROUPS.map((group) => (
                <Fragment key={group.groupName}>
                  <tr>
                    <td
                      colSpan={PERMISSION_ACTIONS.length + 2}
                      className="px-4 py-2 bg-slate-100 font-semibold text-slate-800"
                    >
                      {group.groupName}
                    </td>
                  </tr>
                  {group.items.map((item) => {
                    const enabledActionsForRow = PERMISSION_ACTIONS.filter(
                      (action) => !isActionDisabled(item, action)
                    );
                    const areAllForRowChecked =
                      enabledActionsForRow.length > 0 &&
                      enabledActionsForRow.every(
                        (action) => permissions[item]?.[action]
                      );

                    return (
                      <tr key={item} className="hover:bg-slate-50">
                        <td className="sticky left-0 bg-white px-4 py-3 font-medium text-slate-800">
                          {item}
                        </td>
                        {PERMISSION_ACTIONS.map((action) => {
                          const isDisabled = isActionDisabled(item, action);
                          return (
                            <td key={action} className="px-4 py-3 text-center">
                              {!isDisabled ? (
                                <input
                                  type="checkbox"
                                  checked={permissions[item]?.[action] ?? false}
                                  onChange={(e) =>
                                    handlePermissionChange(
                                      item,
                                      action,
                                      e.target.checked
                                    )
                                  }
                                />
                              ) : null}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={areAllForRowChecked}
                            onChange={(e) =>
                              handleSelectAllForRow(item, e.target.checked)
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </form>
    </Modal>
  );
};
