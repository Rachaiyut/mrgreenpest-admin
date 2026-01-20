import React from 'react';
import { Modal } from '../../common/Modal';
import { Customer } from '../../../types';
import { formatThaiDate } from '../../../constants';
import {
  SectionTitle,
  DetailsList,
  DetailsItem,
} from '../../common/FormControls';

import { ICustomer } from '@/src/libs/common/interface/entity/customer.interface';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: ICustomer | null;
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
              {customer.id}
            </DetailsItem>
            <DetailsItem label="ชื่อลูกค้า" valueClassName="font-semibold">
              {customer.first_name} {customer.nickname && `(${customer.nickname})`}
            </DetailsItem>
            <DetailsItem label="ประเภท">{customer.customer_type}</DetailsItem>
            {customer.tax_id && (
              <DetailsItem label="เลขประจำตัวผู้เสียภาษี">
                {customer.tax_id}
              </DetailsItem>
            )}
            <DetailsItem label="วันที่สร้าง">
              {formatThaiDate(customer.created_at)}
            </DetailsItem>
            {/* {customer.contractUntil && (
              <DetailsItem
                label="สัญญาบริการถึงวันที่"
                valueClassName="font-bold text-primary"
              >
                {formatThaiDate(customer.contractUntil)}
              </DetailsItem>
            )} */}
          </DetailsList>
        </div>
        <hr />
        <div>
          <SectionTitle>ข้อมูลการติดต่อ</SectionTitle>
          <DetailsList cols={2}>
            <DetailsItem label="ผู้ติดต่อ">
              {customer.phone}
            </DetailsItem>
            <DetailsItem label="เบอร์โทรศัพท์ (หลัก)">
              {customer.phone}
            </DetailsItem>
            {customer.phone && (
              <DetailsItem label="เบอร์มือถือ">
                {customer.phone}
              </DetailsItem>
            )}
            {customer.additionalPhones?.map((phone, index) => (
              <DetailsItem
                key={index}
                label={`เบอร์โทรศัพท์ ${index + 3} (เพิ่มเติม)`}
              >
                {phone}
              </DetailsItem>
            ))}
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
            <DetailsItem label="ซอย">{customer.address_house_no || '-'}</DetailsItem>
            <DetailsItem label="ถนน">
              {customer.country || '-'}
            </DetailsItem>
            <DetailsItem label="แขวง/ตำบล">
              {customer.address.subdistrict || '-'}
            </DetailsItem>
            <DetailsItem label="เขต/อำเภอ">
              {customer.address.district || '-'}
            </DetailsItem>
            <DetailsItem label="จังหวัด">
              {customer.address.province || '-'}
            </DetailsItem>
            <DetailsItem label="รหัสไปรษณีย์">
              {customer.address.postalcode || '-'}
            </DetailsItem>
          </DetailsList>
        </div>
        <div>
          <SectionTitle className="mt-4 border-t pt-4">
            กลุ่มเส้นทาง/พื้นที่บริการ
          </SectionTitle>
          <DetailsList cols={4}>
            <DetailsItem label="เขต (พื้นที่บริการ)">
              {customer.address.zone || '-'}
            </DetailsItem>
            <DetailsItem label="Group">
              {customer.address.group || '-'}
            </DetailsItem>
            <DetailsItem label="สายถนนที่">
              {customer.address.roadLine || '-'}
            </DetailsItem>
            <DetailsItem label="ลำดับที่">
              {customer.address.sequence || '-'}
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
