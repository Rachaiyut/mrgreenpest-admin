import { FC, ReactNode, ReactElement, cloneElement, useState } from 'react';
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
import {
  GoogleMapIcon,
  DocumentTextIcon,
  HomeIcon,
  MapIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  EyeIcon,
  LoadingIcon,
  CreditCardIcon,
} from '../../../assets/icons/Icons';
import { PaymentMethod, ServiceSystem } from '@/src/types';
import { AssessmentApi } from '@/src/api';

interface AssessmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
  products: Product[];
  customers?: Customer[];
  packages?: Package[];
}

const DetailItem: FC<{ label: string; value: ReactNode; fullWidth?: boolean }> = ({
  label,
  value,
  fullWidth = false,
}) => (
  <div className={`${fullWidth ? 'col-span-full' : ''}`}>
    <dt className="text-xs font-medium text-slate-500 mb-1">{label}</dt>
    <dd className="text-sm font-medium text-slate-900 break-words">{value || '-'}</dd>
  </div>
);

const SectionHeader: FC<{ icon: ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
    <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
      {cloneElement(icon as ReactElement<any>, { className: 'w-4 h-4' })}
    </div>
    <h4 className="font-semibold text-slate-800">{title}</h4>
  </div>
);

const WorkAreaDetails: FC<{
  area: AssessmentWorkArea;
  products: Product[];
}> = ({ area }) => {
  // Calculate Base Price (Total - Items)
  const itemsTotal = area.items?.reduce((sum, item) => {
     const qty = Number(item.quantity) || 0;
     const price = Number(item.product_price) || 0;
     const total = Number(item.total_price) || (qty * price);
     return sum + total;
  }, 0) || 0;

  const basePrice = (Number(area.total_price) || 0) - itemsTotal;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
        <h5 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-2 h-6 bg-primary rounded-full"></span>
          {area.area_name}
        </h5>
        <span className="text-sm font-semibold text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
          ฿{(area.total_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="p-4 space-y-4">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DetailItem label="ประเภทสิ่งปลูกสร้าง" value={area.building_type} />
          <DetailItem label="พื้นที่ (ตร.ม.)" value={area.area_size} />
          <DetailItem 
            label="ระบบที่ใช้" 
            value={
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                area.service_system === ServiceSystem.CHEMICAL 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {area.service_system === ServiceSystem.CHEMICAL ? 'สารเคมี' : 'เหยื่อ'}
              </span>
            } 
          />
          <DetailItem 
            label="ราคาบริการหลัก" 
            value={`฿${(basePrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`} 
          />
        </dl>

        {area.items && area.items.length > 0 && (
          <div className="mt-4">
            <h6 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              สินค้า/บริการเพิ่มเติม
            </h6>
            <div className="overflow-hidden border border-slate-200 rounded-lg">
              <table className="min-w-full text-sm divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">รายการ</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-600">จำนวน</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">ราคา/หน่วย</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {area.items.map((item, index) => {
                    const quantity = item.quantity || 0;
                    const price = item.product_price || 0;
                    const total = quantity * price;

                    return (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-800">{item.product_name || 'N/A'}</td>
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
  const [loadingPdf, setLoadingPdf] = useState(false);

  if (!isOpen || !assessment) return null;

  const customer = customers.find((c) => c.id === assessment.customer_id);
  const customerName = customer
    ? `${customer.first_name} ${customer.last_name}`
    : assessment.customer_id;

  const handleViewPdf = async () => {
    try {
      if (assessment?.id) {
        setLoadingPdf(true);
        const blob = await AssessmentApi.exportPdf(assessment.id);
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      }
    } catch (error) {
      console.error('Error fetching PDF:', error);
      alert('ไม่สามารถดาวน์โหลด PDF ได้');
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดใบประเมิน: ${assessment.code || assessment.id}`}
      size="5xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col text-left">
            <span className="text-sm text-slate-500">ยอดรวมทั้งหมดสุทธิ</span>
            <span className="text-2xl font-bold text-primary">
              ฿{assessment.total_price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <Button onClick={onClose} variant="primary" className="px-8">
            ปิด
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Section: Info & Address */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SectionHeader icon={<DocumentTextIcon />} title="ข้อมูลทั่วไป" />
            <dl className="grid grid-cols-2 gap-4">
              <DetailItem label="รหัสใบประเมิน" value={assessment.code || assessment.id} />
              <DetailItem 
                label="สถานะ" 
                value={<StatusBadge status={assessment.status} />} 
              />
              <DetailItem 
                label="ลูกค้า" 
                value={
                  <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4 text-slate-400" />
                    <span>{customerName}</span>
                  </div>
                }
                fullWidth 
              />
              <DetailItem label="วันที่สร้าง" value={formatThaiDate(assessment.created_at?.toString())} />
              <DetailItem label="วันที่นัดหมาย" value={formatThaiDate(assessment.appointment_date?.toString())} />
              <DetailItem 
                label="เงื่อนไขการชำระเงิน" 
                value={
                  assessment.payment_condition === PaymentMethod.INSTALLMENT 
                    ? 'แบ่งชำระ (งวดงาน)' 
                    : assessment.payment_condition === PaymentMethod.TRANSFER 
                      ? 'โอนเงิน (เต็มจำนวน)' 
                      : assessment.payment_condition === PaymentMethod.CASH 
                        ? 'เงินสด' 
                        : assessment.payment_condition || '-'
                } 
              />
              <DetailItem label="ผู้สร้าง" value={assessment.created_by} />
            </dl>
          </div>

          {/* Address Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SectionHeader icon={<HomeIcon />} title="ข้อมูลที่อยู่" />
            <dl className="grid grid-cols-2 gap-4">
              <DetailItem label="ที่อยู่" value={assessment.address} fullWidth />
              <DetailItem label="แขวง/ตำบล" value={assessment.sub_district} />
              <DetailItem label="เขต/อำเภอ" value={assessment.district} />
              <DetailItem label="จังหวัด" value={assessment.province} />
              <DetailItem label="รหัสไปรษณีย์" value={assessment.zipcode} />
              
              {assessment.google_map_link && (
                <div className="col-span-full mt-2 pt-2 border-t border-slate-100">
                  <dt className="text-xs font-medium text-slate-500 mb-1">Google Map</dt>
                  <dd>
                    <a
                      href={assessment.google_map_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:text-primary-dark hover:underline bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 transition-colors w-full justify-center sm:justify-start"
                    >
                      <GoogleMapIcon className="h-4 w-4" />
                      <span className="truncate text-sm font-medium">เปิดแผนที่นำทาง</span>
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Route Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <SectionHeader icon={<MapIcon />} title="กลุ่มเส้นทาง/พื้นที่บริการ" />
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <DetailItem label="เขต (พื้นที่บริการ)" value={assessment.zone} />
            <DetailItem label="Group" value={assessment.route_group} />
            <DetailItem label="สายถนนที่" value={assessment.road_line} />
            <DetailItem label="ลำดับที่" value={assessment.sequence} />
          </dl>
        </div>

        {/* Installment Info */}
        {assessment.payment_condition === PaymentMethod.INSTALLMENT && assessment.installments && assessment.installments.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SectionHeader icon={<CreditCardIcon />} title="รายละเอียดงวดชำระ (Installments)" />
            <div className="overflow-hidden border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase w-16">งวดที่</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">รายละเอียด</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase w-32">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {assessment.installments.map((inst, idx) => (
                    <tr key={inst.id || idx}>
                      <td className="px-4 py-2 text-center text-sm font-medium text-slate-700">
                        {inst.installment_no}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-700">
                        {inst.note || '-'}
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-mono text-slate-700">
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
        <div>
          <SectionHeader icon={<ClipboardDocumentListIcon />} title="รายละเอียดพื้นที่ประเมิน" />
          <div className="grid grid-cols-1 gap-4">
            {assessment.assessment_areas && assessment.assessment_areas.length > 0 ? (
              assessment.assessment_areas.map((area, index) => (
                <WorkAreaDetails key={index} area={area} products={products} />
              ))
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <ClipboardDocumentListIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">ไม่พบข้อมูลพื้นที่ประเมิน</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
