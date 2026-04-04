import { FC, ReactNode, ReactElement, cloneElement, useEffect, useState } from 'react';
import { Modal } from '../../common/Modal';
import {
  Assessment,
  AssessmentWorkArea,
  Customer,
  Package,
  Product,
} from '@/src/types/entity/app.interface';
import { StatusBadge } from '../../common/StatusBadge';
import { formatThaiDate } from '../../../utils/date';
import {
  GoogleMapIcon,
  DocumentTextIcon,
  HomeIcon,
  MapPinIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  PhotoIcon,
} from '../../../assets/icons/Icons';
import { PaymentMethod, ServiceSystem } from '@/src/types';
import { AssessmentApi } from '@/src/api';
import { useData } from '@/src/contexts/DataContext';

interface AssessmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
  products: Product[];
  customers?: Customer[];
  packages?: Package[];
}

const InfoLabel: FC<{ children: ReactNode }> = ({ children }) => (
  <dt className="text-xs text-slate-400 uppercase tracking-wide">{children}</dt>
);

const InfoValue: FC<{ children: ReactNode }> = ({ children }) => (
  <dd className="text-sm font-medium text-slate-800 mt-0.5">{children || '-'}</dd>
);

const DetailItem: FC<{
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
}> = ({ label, value, fullWidth = false }) => (
  <div className={fullWidth ? 'col-span-full' : ''}>
    <InfoLabel>{label}</InfoLabel>
    <InfoValue>{value}</InfoValue>
  </div>
);

const SectionHeader: FC<{ icon: ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-slate-100">
    <div className="p-1.5 bg-primary/10 rounded-lg text-primary shrink-0">
      {cloneElement(icon as ReactElement<any>, { className: 'w-4 h-4' })}
    </div>
    <h4 className="font-semibold text-slate-800 text-sm">{title}</h4>
  </div>
);

const BUILDING_TYPE_MAP: Record<string, string> = {
  OFFICE: 'สำนักงาน',
  HOUSE: 'บ้านพักอาศัย',
  FACTORY: 'โรงงาน',
  CONDO: 'คอนโดมิเนียม',
  TOWNHOUSE: 'ทาวน์เฮ้าส์',
  SHOPHOUSE: 'อาคารพาณิชย์',
  OTHER: 'อื่นๆ',
};

const SERVICE_SYSTEM_MAP: Record<string, string> = {
  CHEMICAL: 'สารเคมี',
  PREY: 'เหยื่อ',
  OTHER: 'อื่นๆ',
};

const WorkAreaDetails: FC<{
  area: AssessmentWorkArea;
  products: Product[];
}> = ({ area }) => {
  const itemsTotal =
    area.items?.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.product_price) || 0;
      const total = Number(item.total_price) || qty * price;
      return sum + total;
    }, 0) || 0;

  const basePrice = (Number(area.total_price) || 0) - itemsTotal;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex justify-between items-center">
        <h5 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <span className="w-1.5 h-5 bg-primary rounded-full shrink-0"></span>
          {area.area_name}
        </h5>
        <span className="text-sm font-bold text-primary">
          ฿{Number(area.total_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
        </span>
      </div>

      <div className="p-4">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <DetailItem
            label="ประเภทสิ่งปลูกสร้าง"
            value={
              area.building_type === 'OTHER' && area.building_type_other
                ? area.building_type_other
                : BUILDING_TYPE_MAP[area.building_type] || area.building_type
            }
          />
          <DetailItem
            label={`พื้นที่ (${(area as unknown as Record<string, string>).measurement_unit === 'meter' ? 'เมตร' : 'ตร.ม.'})`}
            value={area.area_size}
          />
          <DetailItem
            label="ระบบที่ใช้"
            value={
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  area.service_system === ServiceSystem.CHEMICAL
                    ? 'bg-orange-100 text-orange-700'
                    : area.service_system === ServiceSystem.OTHER
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-green-100 text-green-700'
                }`}
              >
                {area.service_system === 'OTHER' && area.service_system_other
                  ? area.service_system_other
                  : SERVICE_SYSTEM_MAP[area.service_system || ''] || area.service_system}
              </span>
            }
          />
          <DetailItem
            label="ราคาบริการหลัก"
            value={`฿${basePrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
          />
        </dl>

        {area.items && area.items.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              สินค้า/บริการเพิ่มเติม
            </p>
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-3 py-2 text-left text-xs font-medium">รายการ</th>
                    <th className="px-3 py-2 text-center text-xs font-medium">จำนวน</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">ราคา/หน่วย</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {area.items.map((item, index) => {
                    const quantity = item.quantity || 0;
                    const price = item.product_price || 0;
                    const total = quantity * price;
                    return (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-700">{item.product_name || 'N/A'}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">
                          {total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const AssessmentDetailsModal: FC<AssessmentDetailsModalProps> = ({
  isOpen,
  onClose,
  assessment,
  products,
  customers = [],
}) => {
  const { users = [] } = useData();
  const [fullAssessment, setFullAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    if (isOpen && assessment?.id) {
      AssessmentApi.getById(assessment.id).then((data: any) => {
        setFullAssessment(data.data || data);
      }).catch(() => {});
    } else {
      setFullAssessment(null);
    }
  }, [isOpen, assessment?.id]);

  if (!isOpen || !assessment) return null;

  const data = fullAssessment || assessment;

  const customer =
    data.customer ||
    customers.find((c) => c.id === data.customer_id);
  const customerName = customer
    ? [customer.first_name, customer.last_name].filter((t) => t && t !== '-').join(' ') || customer.code
    : '-';
  const customerCode = customer?.code || '-';

  const createdByUser = users.find((u: any) => u.id === data.created_by);
  const createdByName = createdByUser
    ? `${createdByUser.first_name || ''} ${createdByUser.last_name || ''}`.trim()
    : data.created_by || '-';

  const paymentLabel =
    data.payment_condition === PaymentMethod.INSTALLMENT
      ? 'แบ่งชำระ (งวดงาน)'
      : 'ชำระเต็มจำนวน';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบประเมิน: ${data.code || data.id}`}
      size="5xl"
      footer={
        <div className="flex w-full justify-end">
          <div className="text-right">
            <span className="text-slate-500 font-medium text-sm">ยอดรวมทั้งหมดสุทธิ</span>
            <p className="text-2xl font-bold text-primary">
              ฿{Number(data.total_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Top Section: Info & Address */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* General Info */}
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<DocumentTextIcon />} title="ข้อมูลทั่วไป" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <DetailItem label="รหัสใบประเมิน" value={<span className="text-primary font-bold">{data.code || data.id}</span>} />
              <DetailItem label="สถานะ" value={<StatusBadge status={data.status} />} />
              <DetailItem label="ลูกค้า" value={customerName} />
              <DetailItem label="รหัสลูกค้า" value={<span className="text-green-600 font-bold">{customerCode}</span>} />
              <DetailItem label="วันที่สร้าง" value={formatThaiDate(data.created_at?.toString())} />
              <DetailItem label="วันที่นัดหมาย" value={formatThaiDate(data.appointment_date?.toString())} />
              <DetailItem label="การชำระเงิน" value={paymentLabel} />
              <DetailItem label="ผู้สร้าง" value={createdByName} />
              {data.package && (
                <DetailItem label="แพ็คเกจ" value={<span className="text-primary font-medium">{(data.package as unknown as Record<string, string>)?.name || '-'}</span>} fullWidth />
              )}
            </dl>
          </div>

          {/* Address Info */}
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<HomeIcon />} title="ข้อมูลที่อยู่" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <DetailItem label="ที่อยู่" value={data.address} fullWidth />
              <DetailItem label="แขวง/ตำบล" value={data.sub_district} />
              <DetailItem label="เขต/อำเภอ" value={data.district} />
              <DetailItem label="จังหวัด" value={data.province} />
              <DetailItem label="รหัสไปรษณีย์" value={data.zipcode} />
            </dl>
            {data.google_map_link && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <a
                  href={data.google_map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                >
                  <GoogleMapIcon className="h-4 w-4 shrink-0" />
                  เปิดแผนที่นำทาง
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Route Info */}
        <div className="rounded-xl border border-slate-200 p-5">
          <SectionHeader icon={<MapPinIcon />} title="กลุ่มเส้นทาง/พื้นที่บริการ" />
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <DetailItem label="เขต (พื้นที่บริการ)" value={data.zone} />
            <DetailItem label="Group" value={data.route_group} />
            <DetailItem label="สายถนนที่" value={data.road_line} />
            <DetailItem label="ลำดับที่" value={data.sequence} />
          </dl>
        </div>

        {/* Installments */}
        {data.payment_condition === PaymentMethod.INSTALLMENT &&
          data.installments &&
          data.installments.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-4">
              <SectionHeader icon={<CreditCardIcon />} title="รายละเอียดงวดชำระ" />
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="px-4 py-2.5 text-center text-xs font-medium w-16">งวดที่</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium">รายละเอียด</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium w-32">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.installments.map((inst, idx) => (
                      <tr key={inst.id || idx}>
                        <td className="px-4 py-2 text-center font-medium text-slate-700">{inst.installment_no}</td>
                        <td className="px-4 py-2 text-slate-600">{inst.note || '-'}</td>
                        <td className="px-4 py-2 text-right font-medium text-slate-800">
                          {Number(inst.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {/* Work Areas */}
        <div className="rounded-xl border border-slate-200 p-5">
          <SectionHeader icon={<ClipboardDocumentListIcon />} title="รายละเอียดพื้นที่ประเมิน" />
          <div className="space-y-3">
            {data.assessment_areas && data.assessment_areas.length > 0 ? (
              data.assessment_areas.map((area, index) => (
                <WorkAreaDetails key={index} area={area} products={products} />
              ))
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <ClipboardDocumentListIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">ไม่พบข้อมูลพื้นที่ประเมิน</p>
              </div>
            )}
          </div>
        </div>

        {/* Site Image */}
        {data.site_image_url && (
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<PhotoIcon />} title="รูปภาพพื้นที่บริการ" />
            <div className="flex justify-center">
              <img
                src={data.site_image_url}
                alt="พื้นที่บริการ"
                className="max-h-80 rounded-lg border border-slate-200 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(data.site_image_url!, '_blank')}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
