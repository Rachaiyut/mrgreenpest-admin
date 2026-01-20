import React from 'react';
import { Modal } from '../../common/Modal';
import { Supplier } from '@/src/libs/common/interface/entity/app.interface';
import {
  SectionTitle,
  DetailsList,
  DetailsItem,
} from '../../common/FormControls';

interface SupplierDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export const SupplierDetailsModal: React.FC<SupplierDetailsModalProps> = ({
  isOpen,
  onClose,
  supplier,
}) => {
  if (!isOpen || !supplier) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดผู้จัดจำหน่าย: ${supplier.name}`}
      size="2xl"
    >
      <div className="space-y-4 text-sm">
        <SectionTitle>รายละเอียดผู้จัดจำหน่าย</SectionTitle>
        <DetailsList cols={2}>
          <DetailsItem label="รหัสผู้จัดจำหน่าย" valueClassName="font-semibold">
            {supplier.id}
          </DetailsItem>
          <DetailsItem label="ชื่อผู้จัดจำหน่าย" valueClassName="font-semibold">
            {supplier.name}
          </DetailsItem>
          <DetailsItem label="ประเภท">{supplier.type}</DetailsItem>
          {supplier.taxId && (
            <DetailsItem label="เลขประจำตัวผู้เสียภาษี">
              {supplier.taxId}
            </DetailsItem>
          )}
          {supplier.contactPerson && (
            <DetailsItem label="ผู้ติดต่อ">
              {supplier.contactPerson}
            </DetailsItem>
          )}
          <DetailsItem label="เบอร์โทรศัพท์">
            <ul className="space-y-1">
              {supplier.phones.map((phone, index) => (
                <li key={index}>
                  {phone}
                  {index === 0 && ' (หลัก)'}
                </li>
              ))}
            </ul>
          </DetailsItem>
          <DetailsItem label="อีเมล">{supplier.email}</DetailsItem>
        </DetailsList>
      </div>
    </Modal>
  );
};
