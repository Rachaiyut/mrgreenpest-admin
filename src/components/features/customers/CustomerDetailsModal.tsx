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
import { CustomerLineSection } from './CustomerLineSection';

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

  const fullName = `${customer.first_name} ${customer.last_name || ''}`.trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดลูกค้า`}
      size="3xl"
    >
      <div className="space-y-4 text-sm">
        {/* ข้อมูลทั่วไป */}
        <div className="bg-slate-50 rounded-lg p-4">
          <SectionTitle>ข้อมูลทั่วไป</SectionTitle>
          <DetailsList cols={2}>
            <DetailsItem label="รหัสลูกค้า" valueClassName="font-semibold">
              {customer.code}
            </DetailsItem>
            <DetailsItem label="ชื่อลูกค้า" valueClassName="font-semibold">
              {fullName}
            </DetailsItem>
            <DetailsItem label="ประเภท">
              {customer.type === CustomerType.CORPORATE ? 'นิติบุคคล' : 'บุคคลธรรมดา'}
            </DetailsItem>
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

        {/* ข้อมูลการติดต่อ */}
        <div className="bg-slate-50 rounded-lg p-4">
          <SectionTitle>ข้อมูลการติดต่อ</SectionTitle>
          <DetailsList cols={3}>
            <DetailsItem label="เบอร์โทรศัพท์ (หลัก)">
              {customer.primary_phone || '-'}
            </DetailsItem>
            <DetailsItem label="เบอร์มือถือ">
              {customer.mobile_phone || '-'}
            </DetailsItem>
            <DetailsItem label="อีเมล">
              {customer.email || '-'}
            </DetailsItem>
            {customer.phone_3 && (
              <DetailsItem label="เบอร์โทร 3">{customer.phone_3}</DetailsItem>
            )}
            {customer.phone_4 && (
              <DetailsItem label="เบอร์โทร 4">{customer.phone_4}</DetailsItem>
            )}
            {customer.phone_5 && (
              <DetailsItem label="เบอร์โทร 5">{customer.phone_5}</DetailsItem>
            )}
          </DetailsList>
        </div>

        {/* ข้อมูลที่อยู่ */}
        <div className="bg-slate-50 rounded-lg p-4">
          <SectionTitle>ข้อมูลที่อยู่</SectionTitle>
          <DetailsList cols={3}>
            <DetailsItem label="บ้านเลขที่">
              {customer.address_house_no || '-'}
            </DetailsItem>
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
          {customer.google_map_link && (
            <div className="mt-3">
              <DetailsItem label="Google Map">
                <a
                  href={customer.google_map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate block text-sm"
                >
                  {customer.google_map_link}
                </a>
              </DetailsItem>
            </div>
          )}
        </div>

        {/* กลุ่มเส้นทาง/พื้นที่บริการ */}
        <div className="bg-slate-50 rounded-lg p-4">
          <SectionTitle>กลุ่มเส้นทาง/พื้นที่บริการ</SectionTitle>
          <DetailsList cols={3}>
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

        {/* LINE OA */}
        <div className="bg-slate-50 rounded-lg p-4">
          <SectionTitle>LINE OA</SectionTitle>
          <CustomerLineSection
            customerId={customer.id}
            lineUserId={customer.line_user_id}
            customerName={fullName}
          />
        </div>
      </div>
    </Modal>
  );
};
