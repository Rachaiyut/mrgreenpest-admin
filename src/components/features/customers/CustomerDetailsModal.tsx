import React from 'react';
import { Modal } from '../../common/Modal';
import { Customer } from '../../../types';
import { formatThaiDate } from '../../../constants';
import { SectionTitle, DetailsList, DetailsItem } from '../../common/FormControls';

interface CustomerDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({ isOpen, onClose, customer }) => {
    if (!isOpen || !customer) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`รายละเอียดลูกค้า: ${customer.name}`}
            size="3xl"
        >
            <div className="space-y-6 text-sm">
                <div>
                    <SectionTitle>ข้อมูลทั่วไป</SectionTitle>
                    <DetailsList cols={2}>
                        <DetailsItem label="รหัสลูกค้า" valueClassName="font-semibold">{customer.id}</DetailsItem>
                        <DetailsItem label="ชื่อลูกค้า" valueClassName="font-semibold">{customer.name} {customer.nickname && `(${customer.nickname})`}</DetailsItem>
                        <DetailsItem label="ประเภท">{customer.type}</DetailsItem>
                        {customer.taxId && (<DetailsItem label="เลขประจำตัวผู้เสียภาษี">{customer.taxId}</DetailsItem>)}
                        <DetailsItem label="วันที่สร้าง">{formatThaiDate(customer.createdAt)}</DetailsItem>
                        {customer.contractUntil && (<DetailsItem label="สัญญาบริการถึงวันที่" valueClassName="font-bold text-primary">{formatThaiDate(customer.contractUntil)}</DetailsItem>)}
                    </DetailsList>
                </div>
                <hr />
                <div>
                    <SectionTitle>ข้อมูลการติดต่อ</SectionTitle>
                    <DetailsList cols={2}>
                        <DetailsItem label="ผู้ติดต่อ">{customer.contactPerson}</DetailsItem>
                        <DetailsItem label="เบอร์โทรศัพท์ (หลัก)">{customer.phone}</DetailsItem>
                        {customer.mobilePhone && (<DetailsItem label="เบอร์มือถือ">{customer.mobilePhone}</DetailsItem>)}
                        {customer.additionalPhones?.map((phone, index) => (
                            <DetailsItem key={index} label={`เบอร์โทรศัพท์ ${index + 3} (เพิ่มเติม)`}>{phone}</DetailsItem>
                        ))}
                        <DetailsItem label="อีเมล">{customer.email}</DetailsItem>
                    </DetailsList>
                </div>
                <hr />
                <div>
                    <SectionTitle>ข้อมูลที่อยู่</SectionTitle>
                    <DetailsList cols={3}>
                        <DetailsItem label="บ้านเลขที่">{customer.address.street || '-'}</DetailsItem>
                        <DetailsItem label="ซอย">{customer.address.soi || '-'}</DetailsItem>
                        <DetailsItem label="ถนน">{customer.address.road || '-'}</DetailsItem>
                        <DetailsItem label="แขวง/ตำบล">{customer.address.subdistrict || '-'}</DetailsItem>
                        <DetailsItem label="เขต/อำเภอ">{customer.address.district || '-'}</DetailsItem>
                        <DetailsItem label="จังหวัด">{customer.address.province || '-'}</DetailsItem>
                        <DetailsItem label="รหัสไปรษณีย์">{customer.address.postalcode || '-'}</DetailsItem>
                    </DetailsList>
                </div>
                <div>
                    <SectionTitle className="mt-4 border-t pt-4">กลุ่มเส้นทาง/พื้นที่บริการ</SectionTitle>
                    <DetailsList cols={4}>
                        <DetailsItem label="เขต (พื้นที่บริการ)">{customer.address.zone || '-'}</DetailsItem>
                        <DetailsItem label="Group">{customer.address.group || '-'}</DetailsItem>
                        <DetailsItem label="สายถนนที่">{customer.address.roadLine || '-'}</DetailsItem>
                        <DetailsItem label="ลำดับที่">{customer.address.sequence || '-'}</DetailsItem>
                    </DetailsList>
                </div>
                {customer.googleMapLink && (
                    <div className="pt-4 border-t">
                        <SectionTitle>ตำแหน่ง</SectionTitle>
                        <DetailsList>
                            <DetailsItem label="Link Google Map">
                                <a href={customer.googleMapLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">
                                    {customer.googleMapLink}
                                </a>
                            </DetailsItem>
                        </DetailsList>
                    </div>
                )}
            </div>
        </Modal>
    );
};
