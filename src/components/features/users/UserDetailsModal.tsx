import React from 'react';
import { Modal } from '../../common/Modal';
import { User } from '@/src/types/entity/app.interface';
import {
  SectionTitle,
  DetailsList,
  DetailsItem,
} from '../../common/FormControls';

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
  if (!isOpen || !user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดผู้ใช้งาน: ${user.name}`}
      size="lg"
    >
      <div className="flex items-start space-x-6">
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="h-24 w-24 rounded-full object-cover flex-shrink-0"
        />
        <div className="space-y-4 text-sm flex-grow">
          <SectionTitle>ข้อมูลผู้ใช้</SectionTitle>
          <DetailsList cols={1}>
            <DetailsItem label="ชื่อ-นามสกุล" valueClassName="font-semibold">
              {user.name}
            </DetailsItem>
            <DetailsItem label="ชื่อเล่น" valueClassName="font-semibold">
              {user.nickname}
            </DetailsItem>
            <DetailsItem label="เลขบัตรประชาชน (Username)">
              {user.nationalId}
            </DetailsItem>
            <DetailsItem label="บทบาท">{user.role}</DetailsItem>
            <DetailsItem label="อีเมล">{user.email || '-'}</DetailsItem>
            <DetailsItem label="เบอร์โทรศัพท์">{user.phone}</DetailsItem>
            <DetailsItem
              label="จำกัดการเบิก (บาท)"
              valueClassName="font-semibold"
            >
              {typeof user.creditLimit === 'number'
                ? `฿${user.creditLimit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '-'}
            </DetailsItem>
          </DetailsList>
        </div>
      </div>
    </Modal>
  );
};

