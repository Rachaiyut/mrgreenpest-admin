import React from 'react';
import { Modal } from '../../common/Modal';
import { User } from '@/src/types/entity/app.interface';
import { Button } from '../../common/FormControls';
import { getRoleNameTh } from '@/src/utils/role';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const CopyButton = ({ text }: { text: string }) => (
    <button
      onClick={() => handleCopy(text)}
      className="ml-2 text-slate-400 hover:text-primary transition-colors hover:scale-110 active:scale-95"
      title="คัดลอก"
      type="button"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-4 h-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
        />
      </svg>
    </button>
  );
  if (!isOpen || !user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="รายละเอียดผู้ใช้งาน"
      size="lg"
      footer={
        <Button
          onClick={onClose}
          className="w-full bg-primary hover:bg-primary-dark text-white rounded-xl py-3 text-lg font-medium shadow-sm transition-all"
        >
          ปิด
        </Button>
      }
    >
      <div className="space-y-5">
        {/* ข้อมูลทั่วไป */}
        <div>
          <h4 className="text-sm font-bold text-primary border-b border-slate-200 pb-2 mb-3">ข้อมูลทั่วไป</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-slate-400">ชื่อ-นามสกุล</span>
              <p className="font-semibold text-slate-800">{user.name || '-'}</p>
            </div>
            <div>
              <span className="text-slate-400">ชื่อเล่น</span>
              <p className="font-semibold text-slate-800">{user.nick_name || '-'}</p>
            </div>
            <div>
              <span className="text-slate-400">บทบาท</span>
              <p className="font-semibold text-primary">
                {(() => {
                  const role = user.role;
                  const roleName = typeof role === 'object' && role
                    ? (role as Record<string, string>).name
                    : String(role || '-');
                  return getRoleNameTh(roleName);
                })()}
              </p>
            </div>
            <div>
              <span className="text-slate-400">เลขบัตรประชาชน</span>
              <div className="flex items-center gap-1">
                <p className="font-mono font-semibold text-slate-800">{user.citizen_id || '-'}</p>
                {user.citizen_id && <CopyButton text={user.citizen_id} />}
              </div>
            </div>
          </div>
        </div>

        {/* ข้อมูลการติดต่อ */}
        <div>
          <h4 className="text-sm font-bold text-primary border-b border-slate-200 pb-2 mb-3">ข้อมูลการติดต่อ</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-slate-400">เบอร์โทรศัพท์</span>
              <div className="flex items-center gap-1">
                <p className="font-semibold text-slate-800">{user.phone || '-'}</p>
                {user.phone && <CopyButton text={user.phone} />}
              </div>
            </div>
            <div>
              <span className="text-slate-400">อีเมล</span>
              <div className="flex items-center gap-1">
                <p className="font-semibold text-slate-800">{user.email || '-'}</p>
                {user.email && <CopyButton text={user.email} />}
              </div>
            </div>
          </div>
        </div>

        {/* วงเงิน */}
        {typeof user.creditLimit === 'number' && (
          <div>
            <h4 className="text-sm font-bold text-primary border-b border-slate-200 pb-2 mb-3">ข้อมูลการเงิน</h4>
            <div className="text-sm">
              <span className="text-slate-400">วงเงินจำกัดการเบิก</span>
              <p className="text-xl font-bold text-primary">
                {user.creditLimit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
