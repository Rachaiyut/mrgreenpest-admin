import React from 'react';
import { Modal } from '../../common/Modal';
import {
  SectionTitle,
  DetailsList,
  DetailsItem,
} from '../../common/FormControls';
import { Category } from '@/src/types/entity/category.interface';
import { CategoryType } from '@/src/types/enums/category';

interface CategoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
}

export const CategoryDetailsModal: React.FC<CategoryDetailsModalProps> = ({
  isOpen,
  onClose,
  category,
}) => {
  if (!isOpen || !category) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดหมวดหมู่: ${category.name}`}
      size="lg"
    >
      <div className="space-y-4 text-sm">
        <SectionTitle>ข้อมูลหมวดหมู่</SectionTitle>
        <DetailsList cols={2}>
          <DetailsItem label="อักษรย่อหมวดหมู่" valueClassName="font-semibold">
            {category.code || '-'}
          </DetailsItem>
          <DetailsItem label="ชื่อหมวดหมู่" valueClassName="font-semibold">
            {category.name || '-'}
          </DetailsItem>
          <DetailsItem label="ประเภทหมวดหมู่">
            {category.type === CategoryType.PRODUCT
              ? 'สินค้า'
              : category.type === CategoryType.SERVICE
                ? 'บริการ'
                : '-'}
          </DetailsItem>
          <DetailsItem label="สถานะ">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                category.is_active !== false
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {category.is_active !== false ? 'ใช้งาน' : 'ไม่ใช้งาน'}
            </span>
          </DetailsItem>
        </DetailsList>

        <SectionTitle>รายละเอียดเพิ่มเติม</SectionTitle>
        <DetailsList cols={1}>
          <DetailsItem label="รายละเอียด">
            {category.description || '-'}
          </DetailsItem>
        </DetailsList>
      </div>
    </Modal>
  );
};
