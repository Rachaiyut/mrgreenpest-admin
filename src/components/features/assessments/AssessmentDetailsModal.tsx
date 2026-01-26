import React from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/FormControls';
import {
  Assessment,
  AssessmentWorkArea,
  Customer,
  Package,
  Product,
} from '@/src/types/entity/app.interface';
import { StatusBadge } from '../../common/StatusBadge';
import { formatThaiDate } from '../../../utils/date';
import { GoogleMapIcon } from '../../../assets/icons/Icons';
import { PaymentMethod, ServiceReport, ServiceSystem } from '@/src/types';

interface AssessmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
  products: Product[];
  customers?: Customer[];
  packages?: Package[];
}

const WorkAreaDetails: React.FC<{
  area: AssessmentWorkArea;
  products: Product[];
}> = ({ area, products }) => {
  const productMap = new Map(products.map((p) => [p.id, p]));

  return (
    <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
      <h5 className="text-md font-bold text-primary">{area.area_name}</h5>
      <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
        <div>
          <dt className="font-medium text-slate-500">ประเภทสิ่งปลูกสร้าง</dt>
          <dd className="mt-1 text-slate-900">{area.building_type || '-'}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">พื้นที่ (ตร.ม.)</dt>
          <dd className="mt-1 text-slate-900">{area.area_size}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">ประเภทบริการ</dt>
          <dd className="mt-1 text-slate-900">
            {/* {(area.service_type || []).join(', ')} */}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">ระบบที่ใช้</dt>
          <dd className="mt-1 text-slate-900">{area.service_system === ServiceSystem.CHEMICAL ? 'สารเคมี' : 'เหยื่อ' }</dd>
        </div>
      </dl>

      <div className="pt-4 border-t">
        <h6 className="font-semibold text-slate-700 mb-2">
          ราคาบริการหลัก: ฿{(area.base_service_price || 0).toLocaleString()}
        </h6>

        {area.products && area.products.length > 0 && (
          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left font-medium text-slate-600">
                    สินค้า/บริการเพิ่มเติม
                  </th>
                  <th className="p-2 text-center font-medium text-slate-600">
                    จำนวน
                  </th>
                  <th className="p-2 text-right font-medium text-slate-600">
                    ราคาต่อหน่วย
                  </th>
                  <th className="p-2 text-right font-medium text-slate-600">
                    รวม
                  </th>
                </tr>
              </thead>
              <tbody>
                {area.products.map((item, index) => {
                  const product = productMap.get(item.product_id);
                  const quantity = item.quantity || 0;
                  const price = item.price || 0;
                  const total = quantity * price;

                  return (
                    <tr
                      key={index}
                      className="border-b border-slate-200 last:border-b-0"
                    >
                      <td className="p-2 font-medium text-slate-800">
                        {product?.name || 'N/A'}
                      </td>
                      <td className="p-2 text-center">{quantity}</td>
                      <td className="p-2 text-right">
                        {price.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-2 text-right">
                        {total.toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="text-right font-semibold text-slate-800 pt-2 border-t">
        ยอดรวมพื้นที่นี้: ฿
        {(area.total_price || 0).toLocaleString('th-TH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  );
};

export const AssessmentDetailsModal: React.FC<AssessmentDetailsModalProps> = ({
  isOpen,
  onClose,
  assessment,
  products,
  customers = [],
  packages = [],
}) => {
  if (!isOpen || !assessment) return null;

  const customerName = customers.find((c) => c.id === assessment.customer_id)
    ? `${customers.find((c) => c.id === assessment.customer_id)?.first_name} ${customers.find((c) => c.id === assessment.customer_id)?.last_name}`
    : assessment.customer_id;

  const selectedPackage = packages.find((p) => p.id === assessment.package_id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบประเมิน: ${assessment.code || assessment.id}`}
      size="5xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <p className="text-lg font-semibold text-slate-800">
            ยอดรวมทั้งหมด:{' '}
            <span className="text-primary">
              ฿
              {assessment.total_price.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </p>
          <Button type="button" onClick={onClose} variant="primary">
            ปิด
          </Button>
        </div>
      }
    >
      <div className="space-y-6 text-sm">
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            ข้อมูลทั่วไป
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
            <div>
              <dt className="font-medium text-slate-500">รหัสใบประเมิน</dt>
              <dd className="mt-1 text-slate-900 font-semibold">
                {assessment.code || assessment.id}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ลูกค้า</dt>
              <dd className="mt-1 text-slate-900 font-semibold">
                {customerName}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">สถานะ</dt>
              <dd className="mt-1">
                <StatusBadge status={assessment.status} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">วันที่สร้าง</dt>
              <dd className="mt-1 text-slate-900">
                {formatThaiDate(assessment.created_at)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">วันที่นัดหมาย</dt>
              <dd className="mt-1 text-slate-900">
                {2569}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">
                เงื่อนไขการชำระเงิน
              </dt>
              <dd className="mt-1 text-slate-900">
                {assessment.payment_condition === PaymentMethod.CASH ? 'เงินสด' : 'โอน'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ผู้สร้าง</dt>
              <dd className="mt-1 text-slate-900">{assessment.created_by}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ผู้แก้ไขล่าสุด</dt>
              <dd className="mt-1 text-slate-900">{assessment.updated_by}</dd>
            </div>
          </dl>
        </div>
        <hr />
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            ข้อมูลที่อยู่
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
            <div className="md:col-span-3">
              <dt className="font-medium text-slate-500">ที่อยู่</dt>
              <dd className="mt-1 text-slate-900">
                {assessment.address || '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">แขวง/ตำบล</dt>
              <dd className="mt-1 text-slate-900">
                {assessment.sub_district || '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">เขต/อำเภอ</dt>
              <dd className="mt-1 text-slate-900">
                {assessment.district || '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">จังหวัด</dt>
              <dd className="mt-1 text-slate-900">
                {assessment.province || '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">รหัสไปรษณีย์</dt>
              <dd className="mt-1 text-slate-900">
                {assessment.zipcode || '-'}
              </dd>
            </div>
          </dl>
          {assessment.google_map_link && (
            <dl className="mt-4">
              <div>
                <dt className="font-medium text-slate-500">Link Google Map</dt>
                <dd className="mt-1 text-slate-900">
                  <a
                    href={assessment.google_map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline truncate"
                  >
                    <GoogleMapIcon className="h-4 w-4" />
                    <span>{assessment.google_map_link}</span>
                  </a>
                </dd>
              </div>
            </dl>
          )}
        </div>
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3 mt-4 pt-4 border-t">
            กลุ่มเส้นทาง/พื้นที่บริการ
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-4">
            <div>
              <dt className="font-medium text-slate-500">
                เขต (พื้นที่บริการ)
              </dt>
              <dd className="mt-1 text-slate-900">{assessment.zone || '-'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Group</dt>
              <dd className="mt-1 text-slate-900">
                {assessment.route_group || '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">สายถนนที่</dt>
              <dd className="mt-1 text-slate-900">
                {assessment.road_line || '-'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ลำดับที่</dt>
              <dd className="mt-1 text-slate-900">
                {assessment.sequence || '-'}
              </dd>
            </div>
          </dl>
        </div>
        <hr />
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            รายละเอียดพื้นที่ประเมิน
          </h4>
          <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 -mr-2">
            {assessment.assessment_areas.map((area, index) => (
              <WorkAreaDetails
                key={index}
                area={area}
                products={products}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
