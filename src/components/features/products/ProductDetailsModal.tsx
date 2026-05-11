import React from 'react';
import { Modal } from '../../common/Modal';
import {
  SectionTitle,
  DetailsList,
  DetailsItem,
} from '../../common/FormControls';
import { Product } from '@/src/types/entity/product.interface';
import { CategoryType } from '@/src/types/enums/category';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  if (!isOpen || !product) return null;

  const isService = product.category?.type === CategoryType.SERVICE
    || (product as unknown as Record<string, string>)?._type === 'SERVICE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียด${isService ? 'บริการ' : 'สินค้า'}: ${product.name}`}
      size="2xl"
    >
      <div className="space-y-4 text-sm">
        {product.image_url && (
          <div className="flex justify-center">
            <img
              src={product.image_url}
              alt={product.name}
              className="h-32 w-32 object-cover rounded-lg border border-slate-200"
            />
          </div>
        )}

        <SectionTitle>ข้อมูลทั่วไป</SectionTitle>
        <DetailsList cols={2}>
          <DetailsItem label={isService ? 'รหัสบริการ' : 'รหัสสินค้า'} valueClassName="font-semibold">
            {product.code || '-'}
          </DetailsItem>
          {!isService && (
            <DetailsItem label="รหัสบาร์โค้ด">
              {product.barcode || '-'}
            </DetailsItem>
          )}
          <DetailsItem label={isService ? 'ชื่อบริการ' : 'ชื่อสินค้า'} valueClassName="font-semibold">
            {product.name || '-'}
          </DetailsItem>
          <DetailsItem label="หมวดหมู่">
            {product.category?.name || '-'}
          </DetailsItem>
          <DetailsItem label="ประเภท">
            {isService ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">บริการ</span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">สินค้า</span>
            )}
          </DetailsItem>
          <DetailsItem label="สถานะ">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                product.is_active !== false
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {product.is_active !== false ? 'ใช้งาน' : 'ไม่ใช้งาน'}
            </span>
          </DetailsItem>
        </DetailsList>

        <SectionTitle>ราคาและสต็อก</SectionTitle>
        <DetailsList cols={2}>
          <DetailsItem label="ราคา/หน่วย">
            {Number(product.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
          </DetailsItem>
          {!isService && (
            <>
              <DetailsItem label="ราคาต้นทุน">
                {Number(product.cost_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </DetailsItem>
              <DetailsItem label="จำนวนคงเหลือ">
                {Math.trunc(Number((product as unknown as Record<string, number>).stock_quantity ?? 0)).toLocaleString('th-TH')}
              </DetailsItem>
              <DetailsItem label="สต็อกขั้นต่ำ">
                {product.min_stock ?? '-'}
              </DetailsItem>
            </>
          )}
          {product.unit && (
            <DetailsItem label="หน่วยนับ">
              {product.unit.name}{product.unit.symbol ? ` (${product.unit.symbol})` : ''}
            </DetailsItem>
          )}
          {!isService && product.fda_number && (
            <DetailsItem label="เลขที่ อย.">
              {product.fda_number}
            </DetailsItem>
          )}
        </DetailsList>
      </div>
    </Modal>
  );
};
