import React from 'react';
import { Modal } from '../../common/Modal';
import {
  SectionTitle,
  DetailsList,
  DetailsItem,
} from '../../common/FormControls';

// Interface
import { Supplier } from '@/src/types/entity/supplier.interface';

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
            {supplier.code || '-'}
          </DetailsItem>
          <DetailsItem label="ชื่อผู้จัดจำหน่าย" valueClassName="font-semibold">
            {supplier.name || '-'}
          </DetailsItem>
          <DetailsItem label="ประเภทผู้จัดจำหน่าย">
            {supplier.type === 'CORPORATE' ? 'นิติบุคคล' : supplier.type === 'INDIVIDUAL' ? 'บุคคลธรรมดา' : supplier.type || '-'}
          </DetailsItem>
          <DetailsItem label="เลขประจำตัวผู้เสียภาษี">
            {supplier.tax_id || '-'}
          </DetailsItem>
        </DetailsList>

        <SectionTitle>ข้อมูลการติดต่อ</SectionTitle>
        <DetailsList cols={2}>
          <DetailsItem label="ผู้ติดต่อ">{supplier.contact_name || '-'}</DetailsItem>
          <DetailsItem label="เบอร์โทรศัพท์">{supplier.phone || '-'}</DetailsItem>
          <DetailsItem label="อีเมล">{supplier.email || '-'}</DetailsItem>
        </DetailsList>
      </div>
    </Modal>
  );
};
