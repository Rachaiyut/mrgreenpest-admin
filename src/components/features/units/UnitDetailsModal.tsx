import React from 'react';
import { Modal } from '../../common/Modal';
import {
  SectionTitle,
  DetailsList,
  DetailsItem,
} from '../../common/FormControls';
import { IUnit } from '@/src/types/entity/unit.interface';

interface UnitDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: IUnit | null;
}

export const UnitDetailsModal: React.FC<UnitDetailsModalProps> = ({
  isOpen,
  onClose,
  unit,
}) => {
  if (!isOpen || !unit) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดหน่วยนับ: ${unit.name}`}
      size="md"
    >
      <div className="space-y-4 text-sm">
        <SectionTitle>ข้อมูลหน่วยนับ</SectionTitle>
        <DetailsList cols={2}>
          <DetailsItem label="ชื่อหน่วยนับ" valueClassName="font-semibold">
            {unit.name || '-'}
          </DetailsItem>
          <DetailsItem label="ตัวย่อ" valueClassName="font-semibold">
            {unit.symbol || '-'}
          </DetailsItem>
          <DetailsItem label="สถานะ">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                unit.is_active !== false
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {unit.is_active !== false ? 'ใช้งาน' : 'ไม่ใช้งาน'}
            </span>
          </DetailsItem>
        </DetailsList>
      </div>
    </Modal>
  );
};
