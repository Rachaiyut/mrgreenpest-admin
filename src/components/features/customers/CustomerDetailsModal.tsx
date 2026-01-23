import React from 'react';
import { Modal } from '../../common/Modal';
import { formatThaiDate } from '../../../utils/date';
import {
  SectionTitle,
  DetailsList,
  DetailsItem,
} from '../../common/FormControls';

import { Customer } from '@/src/types/entity/customer.interface';
import { CustomerType } from '@/src/types';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  if (!isOpen || !customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดลูกค้า: ${customer.first_name} ${customer.last_name}`}
      size="3xl"
    >
      <div className="space-y-6 text-sm">
        <div>
          <SectionTitle>ข้อมูลทั่วไป</SectionTitle>
          <DetailsList cols={2}>
            <DetailsItem label="รหัสลูกค้า" valueClassName="font-semibold">
              {customer.code}
            </DetailsItem>
            <DetailsItem label="ชื่อลูกค้า" valueClassName="font-semibold">
              {customer.first_name} {customer.last_name}{' '}
              {customer.nickname && `(${customer.nickname})`}
            </DetailsItem>
            <DetailsItem label="ประเภท">{customer.type === CustomerType.CORPORATE ? 'นิติบุคคล' : 'บุคคลธรรมดา' }</DetailsItem>
            {customer.tax_id && (
              <DetailsItem label="เลขประจำตัวผู้เสียภาษี">
                {customer.tax_id}
              </DetailsItem>
            )}
            <DetailsItem label="วันที่สร้าง">
              {formatThaiDate(customer.created_at)}
            </DetailsItem>
          </DetailsList>
        </div>
        <hr />
        <div>
          <SectionTitle>ข้อมูลการติดต่อ</SectionTitle>
          <DetailsList cols={2}>
            {/* Contact Person field not available in ICustomer */}
            {/* <DetailsItem label="ผู้ติดต่อ">
              {customer.contactPerson || '-'}
            </DetailsItem> */}
            <DetailsItem label="เบอร์โทรศัพท์ (หลัก)">
              {customer.phone}
            </DetailsItem>
            {/* Mobile phone field not available in ICustomer */}
            {/* {customer.phone && (
              <DetailsItem label="เบอร์มือถือ">
                {customer.phone}
              </DetailsItem>
            )} */}
            <DetailsItem label="อีเมล">{customer.email}</DetailsItem>
          </DetailsList>
        </div>
        <hr />
        <div>
          <SectionTitle>ข้อมูลที่อยู่</SectionTitle>
          <DetailsList cols={3}>
            <DetailsItem label="บ้านเลขที่">
              {customer.address_house_no || '-'}
            </DetailsItem>
            {/* Soi/Road not in ICustomer */}
            {/* <DetailsItem label="ซอย">{customer.address_house_no || '-'}</DetailsItem>
            <DetailsItem label="ถนน">
              {customer.country || '-'}
            </DetailsItem> */}
            <DetailsItem label="แขวง/ตำบล">
              {customer.sub_district || '-'}
            </DetailsItem>
            <DetailsItem label="เขต/อำเภอ">
              {customer.district || '-'}
            </DetailsItem>
            <DetailsItem label="จังหวัด">
              {customer.province || '-'}
            </DetailsItem>
            <DetailsItem label="รหัสไปรษณีย์">
              {customer.postal_code || '-'}
            </DetailsItem>
          </DetailsList>
        </div>
        {/* Zone/Group fields not in ICustomer */}
        <div>
          <SectionTitle className="mt-4 border-t pt-4">
            กลุ่มเส้นทาง/พื้นที่บริการ
          </SectionTitle>
          <DetailsList cols={4}>
            <DetailsItem label="เขต (พื้นที่บริการ)">
              {customer.service_area || '-'}
            </DetailsItem>
            <DetailsItem label="Group">
              {customer.service_group || '-'}
            </DetailsItem>
            <DetailsItem label="สายถนนที่">
              {customer.road_line || '-'}
            </DetailsItem>
          </DetailsList>
        </div>
        {customer.google_map_link && (
          <div className="pt-4 border-t">
            <SectionTitle>ตำแหน่ง</SectionTitle>
            <DetailsList>
              <DetailsItem label="Link Google Map">
                <a
                  href={customer.google_map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate block"
                >
                  {customer.google_map_link}
                </a>
              </DetailsItem>
            </DetailsList>
          </div>
        )}
      </div>
    </Modal>
  );
};


