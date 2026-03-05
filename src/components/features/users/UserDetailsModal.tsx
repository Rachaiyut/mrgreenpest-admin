import React from 'react';
import { Modal } from '../../common/Modal';
import { User } from '@/src/types/entity/app.interface';
import { Button } from '../../common/FormControls';

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
      title=""
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
      <div className="relative">
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-primary to-primary-dark rounded-t-lg -mx-6 -mt-6"></div>

        {/* Avatar & Key Info */}
        <div className="relative px-2">
          <div className="flex flex-row items-end -mt-12 mb-6 gap-4">
            <div className="relative p-1 bg-white rounded-full shadow-lg">
              <img
                src={user.url}
                alt={user.name}
                className="h-24 w-24 rounded-full object-cover"
              />
            </div>
            <div className="mb-3">
              <h3 className="text-xl font-bold text-slate-800">{user.name}</h3>
              <p className="text-slate-500 text-sm">
                {(() => {
                  let roleNameRaw = '-';
                  const role = user.role;
                  if (typeof role === 'string') roleNameRaw = role;
                  else if (typeof role === 'object' && role) {
                    const r = role as any;
                    roleNameRaw =
                      typeof r.name === 'string'
                        ? r.name
                        : JSON.stringify(r.name);
                  }

                  const mapping: Record<string, string> = {
                    admin: 'ผู้ดูแลระบบ',
                    lead_tech: 'หัวหน้าช่าง',
                    cfo: 'ประธานเจ้าหน้าที่ฝ่ายการเงิน',
                    coo: 'ประธานเจ้าหน้าที่ฝ่ายปฏิบัติการ',
                    ceo: 'ประธานเจ้าหน้าที่บริหาร',
                    superadmin: 'ผู้ดูแลระบบสูงสุด',
                    sales: 'ฝ่ายขาย',
                    accounting: 'ฝ่ายบัญชี',
                    warehouse: 'คลังสินค้า',
                    dispatcher: 'ผู้จัดส่ง',
                    tech: 'ช่างเทคนิค',
                  };
                  return (
                    mapping[String(roleNameRaw).toLowerCase()] || roleNameRaw
                  );
                })()}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Personal Info Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 text-primary"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                    clipRule="evenodd"
                  />
                </svg>
                <h4 className="text-md font-bold text-primary">
                  ข้อมูลส่วนตัว
                </h4>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    ชื่อเล่น
                  </label>
                  <div className="text-slate-800 font-medium text-lg">
                    {user.nick_name || '-'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">
                      เลขบัตรประชาชน (Username)
                    </label>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-center justify-between">
                      <span className="font-mono text-slate-700">
                        {user.citizen_id || '-'}
                      </span>
                      {user.citizen_id && <CopyButton text={user.citizen_id} />}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">
                      เบอร์โทรศัพท์
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-800 font-medium">
                        {user.phone || '-'}
                      </span>
                      {user.phone && <CopyButton text={user.phone} />}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    อีเมล
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800">{user.email || '-'}</span>
                    {user.email && <CopyButton text={user.email} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Section */}
            {typeof user.creditLimit === 'number' && (
              <div className="pt-4 border-t border-slate-100">
                <div className="bg-white rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                      วงเงินจำกัดการเบิก
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      ฿
                      {user.creditLimit.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
