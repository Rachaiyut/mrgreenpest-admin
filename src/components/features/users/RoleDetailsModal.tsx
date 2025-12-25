import React from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import { UserRole } from '../../../types';

interface RoleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole | null;
}

// Mock permissions for demonstration
const MOCK_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    [UserRole.Admin]: ['ดู', 'สร้าง', 'แก้ไข', 'ลบ', 'อนุมัติ'],
    [UserRole.Sales]: ['ดู', 'สร้าง', 'แก้ไข'],
    [UserRole.Accounting]: ['ดู', 'สร้าง', 'อนุมัติ'],
    [UserRole.Warehouse]: ['ดู', 'สร้าง', 'แก้ไข'],
    [UserRole.Dispatcher]: ['ดู', 'สร้าง', 'แก้ไข'],
    [UserRole.Technician]: ['ดู'],
};

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
    items: ['แพ็กเกจ', 'สินค้า/บริการ', 'คลังสินค้า', 'ผู้จัดจำหน่าย', 'รับเข้า', 'เบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย', 'โอนย้าย', 'ปรับปรุง Stock', 'คืนสินค้า', 'จำกัดการเบิก'],
  },
  {
    groupName: 'ตั้งค่าระบบ',
    items: ['ผู้ใช้งาน', 'จัดการบทบาท', 'รายงาน'],
  },
];

const VIEW_ONLY_ITEMS = ['Dashboard', 'รายงาน'];
const APPROVABLE_ITEMS = ['ใบประเมิน', 'ใบเสนอราคา', 'รับเข้า', 'เบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย'];

const isActionNotApplicable = (item: string, action: string): boolean => {
    if (VIEW_ONLY_ITEMS.includes(item) && action !== 'ดู') {
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

export const RoleDetailsModal: React.FC<RoleDetailsModalProps> = ({ isOpen, onClose, role }) => {
  if (!isOpen || !role) return null;

  const rolePermissions = MOCK_ROLE_PERMISSIONS[role] || [];

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={`รายละเอียดบทบาท: ${role}`} 
        size="4xl"
        footer={
            <Button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm" variant="primary">
                ปิด
            </Button>
        }
    >
      <div className="space-y-4">
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                    <tr>
                        <th scope="col" className="sticky left-0 bg-slate-50 z-10 px-4 py-3 text-left font-medium text-slate-600 uppercase tracking-wider">สิทธิ์การใช้งาน</th>
                        {PERMISSION_ACTIONS.map(action => (
                            <th key={action} scope="col" className="px-4 py-3 text-center font-medium text-slate-600 uppercase tracking-wider">
                                {action}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {PERMISSION_GROUPS.map(group => (
                        <React.Fragment key={group.groupName}>
                            <tr>
                                <td colSpan={PERMISSION_ACTIONS.length + 1} className="px-4 py-2 bg-slate-100 font-semibold text-slate-800">
                                    {group.groupName}
                                </td>
                            </tr>
                            {group.items.map(item => (
                                <tr key={item} className="hover:bg-slate-50">
                                    <td className="sticky left-0 bg-white px-4 py-3 font-medium text-slate-800">{item}</td>
                                    {PERMISSION_ACTIONS.map(action => {
                                        const isNotApplicable = isActionNotApplicable(item, action);
                                        return (
                                            <td key={action} className="px-4 py-3 text-center">
                                                {!isNotApplicable ? (
                                                    rolePermissions.includes(action) ? (
                                                        <svg className="mx-auto h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="mx-auto h-5 w-5 text-slate-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    )
                                                ) : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </Modal>
  );
};