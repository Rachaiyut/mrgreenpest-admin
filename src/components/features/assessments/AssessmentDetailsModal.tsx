import { FC, ReactNode, ReactElement, cloneElement, useEffect, useState } from 'react';
import { Modal } from '../../common/Modal';
import {
  Assessment,
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
import { PaymentMethod, Category } from '@/src/types';
import { AssessmentApi } from '@/src/api';
import { useData } from '@/src/contexts/DataContext';
import { WorkAreaForm } from './WorkAreaForm';

interface AssessmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
  products: Product[];
  customers?: Customer[];
  packages?: Package[];
  categories?: Category[];
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

export const AssessmentDetailsModal: FC<AssessmentDetailsModalProps> = ({
  isOpen,
  onClose,
  assessment,
  products,
  customers = [],
  packages = [],
  categories = [],
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

  const dataAny = data as unknown as Record<string, any>;
  const assessmentAny = assessment as unknown as Record<string, any>;
  const creator = dataAny.creator || assessmentAny.creator;
  const createdByUser = creator || users.find((u: any) => u.id === data.created_by);
  const createdByName = createdByUser
    ? `${createdByUser.first_name || ''} ${createdByUser.last_name || ''}`.trim() || '-'
    : '-';

  const PAYMENT_LABEL_MAP: Record<string, string> = {
    [PaymentMethod.TRANSFER]: 'ชำระเต็มจำนวน',
    [PaymentMethod.INSTALLMENT]: 'แบ่งชำระ (งวดงาน)',
    [PaymentMethod.CASH]: 'เงินสด',
    [PaymentMethod.CREDIT_CARD]: 'บัตรเครดิต',
    [PaymentMethod.CHEQUE]: 'เช็ค',
    [PaymentMethod.QR_PAYMENT]: 'QR Payment',
  };
  const resolvedPayment =
    data.payment_condition ||
    (data.installments && data.installments.length > 0 ? PaymentMethod.INSTALLMENT : PaymentMethod.TRANSFER);
  const paymentLabel = PAYMENT_LABEL_MAP[resolvedPayment] || 'ชำระเต็มจำนวน';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบประเมิน: ${data.code || data.id}`}
      size="5xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-slate-500 font-medium text-sm">ยอดรวมทั้งหมดสุทธิ</span>
          <p className="text-2xl font-bold text-primary">
            {Number(data.total_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
          </p>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Top Section: Info & Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* General Info */}
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<DocumentTextIcon />} title="ข้อมูลทั่วไป" />
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
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
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
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
                  className="flex items-center gap-2 text-sm text-primary bg-primary/5 p-2.5 rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <GoogleMapIcon className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium underline truncate">{data.google_map_link}</span>
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
        {resolvedPayment === PaymentMethod.INSTALLMENT &&
          data.installments &&
          data.installments.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-4">
              <SectionHeader icon={<CreditCardIcon />} title="รายละเอียดงวดชำระ" />
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="px-4 py-2.5 text-left text-xs font-medium w-16">งวดที่</th>
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
              data.assessment_areas.map((area, index) => {
                const areaPackage = packages.find((p) =>
                  p.package_prices?.some((pp) => pp.id === area.package_price_id)
                ) || null;
                return (
                  <WorkAreaForm
                    key={area.id || index}
                    area={area}
                    index={index}
                    onAreaChange={() => {}}
                    onClearArea={() => {}}
                    products={products}
                    selectedPackage={areaPackage}
                    availablePackages={packages}
                    categories={categories}
                    readOnly
                  />
                );
              })
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
