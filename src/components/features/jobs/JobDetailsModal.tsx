import React, {
  useMemo,
  useEffect,
  useState,
  FC,
  ReactNode,
  ReactElement,
  cloneElement,
} from 'react';
import { Modal } from '../../common/Modal';
import { FieldJob } from '@/src/types/entity/service-report.interface';
import { Assessment, AssessmentWorkArea } from '@/src/types/entity/assessment.interface';
import { Warehouse } from '@/src/types/entity/inventory.interface';
import { JobStatusLabel } from '@/src/types/enums/job';
import { InvoiceStatusLabel, InvoiceStatusColor } from '@/src/types/enums/invoice';
import { PaymentMethod, ServiceSystem } from '@/src/types';
import {
  GoogleMapIcon,
  DocumentTextIcon,
  MapPinIcon,
  UserGroupIcon,
  TechnicianIcon,
  HomeIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
} from '../../../assets/icons/Icons';
import { formatThaiDate } from '../../../utils/date';
import { AssessmentApi } from '@/src/api';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: FieldJob | null;
  assessment: Assessment | null;
  warehouses: Warehouse[];
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

const SectionHeader: FC<{ icon: ReactNode; title: string }> = ({
  icon,
  title,
}) => (
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

const WorkAreaDetails: FC<{ area: AssessmentWorkArea }> = ({ area }) => {
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
                : BUILDING_TYPE_MAP[area.building_type] || area.building_type || '-'
            }
          />
          <DetailItem
            label={`พื้นที่ (${(area as unknown as Record<string, string>).measurement_unit === 'meter' ? 'เมตร' : 'ตร.ม.'})`}
            value={area.area_size || '-'}
          />
          <DetailItem
            label="ระบบที่ใช้"
            value={
              area.service_system ? (
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
              ) : '-'
            }
          />
          <DetailItem
            label="ราคาบริการหลัก"
            value={`฿${basePrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
          />
        </dl>

        {area.category_services && area.category_services.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">ประเภทบริการ</p>
            <div className="flex flex-wrap gap-1.5">
              {area.category_services.map((cat, idx) => (
                <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  {cat.category?.name || cat.name || cat.category_id}
                </span>
              ))}
            </div>
          </div>
        )}

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
                    const total = Number(item.total_price) || quantity * price;
                    return (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-700">{item.product_name || '-'}</td>
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

export const JobDetailsModal: FC<JobDetailsModalProps> = ({
  isOpen,
  onClose,
  job,
  assessment,
  warehouses,
}) => {
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

  const assessmentData = fullAssessment || assessment;

  const vehicle = useMemo(() => {
    if (!job?.vehicle_id) return null;
    return warehouses.find((w) => w.id === job.vehicle_id);
  }, [job, warehouses]);

  const { leadTechs, otherTechs } = useMemo(() => {
    if (!job?.technicians) return { leadTechs: [], otherTechs: [] };

    const leads = job.technicians.filter(
      (t) => t.role_type === 'FIELD_LEAD'
    );
    const others = job.technicians.filter(
      (t) => t.role_type !== 'FIELD_LEAD'
    );

    return { leadTechs: leads, otherTechs: others };
  }, [job?.technicians]);

  if (!isOpen || !job) return null;

  const jobCode = job.code || job.id?.substring(0, 8) || '-';
  const customerName = job.customerName || '-';
  const customerCode = job.customer?.code || (job as unknown as Record<string, string>).customer_code || '-';

  const timeRange = (() => {
    try {
      const start = new Date(job.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const end = new Date(job.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      return `${start} - ${end}`;
    } catch {
      return '-';
    }
  })();

  const paymentLabel = assessmentData?.payment_condition === PaymentMethod.INSTALLMENT
    ? 'แบ่งชำระ (งวดงาน)'
    : 'ชำระเต็มจำนวน';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดงาน: ${customerName}`}
      size="5xl"
    >
      <div className="space-y-5">
        {/* Top Section: Info & Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* General Info */}
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<DocumentTextIcon />} title="ข้อมูลทั่วไป" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <DetailItem label="รหัสงาน" value={<span className="text-primary font-bold">{jobCode}</span>} />
              <DetailItem label="สถานะ" value={(() => {
                const key = String(job.api_status || job.status || '').toUpperCase();
                const label = JobStatusLabel[key] || job.status || '-';
                const colorMap: Record<string, string> = {
                  UNASSIGNED: 'bg-amber-100 text-amber-700',
                  PENDING: 'bg-yellow-100 text-yellow-700',
                  IN_PROGRESS: 'bg-blue-100 text-blue-700',
                  COMPLETE: 'bg-green-100 text-green-700',
                  CANCELLED: 'bg-red-100 text-red-700',
                };
                return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[key] || 'bg-slate-100 text-slate-600'}`}>{label}</span>;
              })()} />
              <DetailItem label="ลูกค้า" value={customerName} />
              <DetailItem label="เบอร์โทรศัพท์" value={job.customer?.primary_phone || '-'} />
              <DetailItem label="รหัสลูกค้า" value={<span className="text-green-600 font-bold">{customerCode}</span>} />
              <DetailItem label="วันที่ปฏิบัติงาน" value={formatThaiDate(job.start_time)} />
              <DetailItem label="เวลา" value={timeRange} />
              {assessmentData && (
                <>
                  <DetailItem label="วันที่นัดหมาย (ประเมิน)" value={formatThaiDate(assessmentData.appointment_date?.toString())} />
                  <DetailItem label="การชำระเงิน" value={paymentLabel} />
                </>
              )}
              <DetailItem label="สถานะการชำระเงิน" value={(() => {
                if (job.invoice) {
                  const status = job.invoice.status;
                  const label = InvoiceStatusLabel[status] || status || '-';
                  const color = InvoiceStatusColor[status] || 'bg-slate-100 text-slate-600';
                  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>;
                }
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">ค้างชำระ</span>;
              })()} />
              {(job as unknown as Record<string, string>).reference_code && (
                <DetailItem label="อ้างอิง" value={(job as unknown as Record<string, string>).reference_code} fullWidth />
              )}
            </dl>
          </div>

          {/* Address Info */}
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<HomeIcon />} title="ข้อมูลที่อยู่" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <DetailItem label="ที่อยู่" value={job.address || assessmentData?.address} fullWidth />
              <DetailItem label="แขวง/ตำบล" value={assessmentData?.sub_district || job.customer?.sub_district || '-'} />
              <DetailItem label="เขต/อำเภอ" value={assessmentData?.district || job.customer?.district || '-'} />
              <DetailItem label="จังหวัด" value={assessmentData?.province || job.customer?.province || '-'} />
              <DetailItem label="รหัสไปรษณีย์" value={assessmentData?.zipcode || job.customer?.postal_code || '-'} />
            </dl>
            {(job.google_map_link || assessmentData?.google_map_link) && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <a
                  href={job.google_map_link || assessmentData?.google_map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary bg-primary/5 p-2.5 rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <GoogleMapIcon className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium underline truncate">{job.google_map_link || assessmentData?.google_map_link}</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Route/Zone Info (from assessment or job) */}
        <div className="rounded-xl border border-slate-200 p-5">
          <SectionHeader icon={<MapPinIcon />} title="กลุ่มเส้นทาง/พื้นที่บริการ" />
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <DetailItem label="เขต (พื้นที่บริการ)" value={assessmentData?.zone || job.zone || job.customer?.service_area || '-'} />
            <DetailItem label="กลุ่มบริการ" value={assessmentData?.route_group || job.group || job.customer?.service_group || '-'} />
            <DetailItem label="สายถนนที่" value={assessmentData?.road_line || job.road_line || job.customer?.road_line || '-'} />
            <DetailItem label="ลำดับที่" value={assessmentData?.sequence || job.sequence || job.customer?.sequence_no || '-'} />
          </dl>
        </div>

        {/* Team & Vehicle Section */}
        <div className="rounded-xl border border-slate-200 p-5">
          <SectionHeader icon={<TruckIcon />} title="ทีมงานและพาหนะ" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vehicle */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <TruckIcon className="w-4 h-4 text-slate-400" />
                รถบริการ
              </h5>
              {vehicle ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <TruckIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{vehicle.name}</div>
                    <div className="text-xs text-slate-500">
                      {(vehicle as unknown as Record<string, string>).license_plate || vehicle.vehicle?.vehicle_registration || '-'}
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-slate-400">ยังไม่มอบหมายรถ</span>
              )}
            </div>

            {/* Lead Tech */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <TechnicianIcon className="w-4 h-4 text-primary" />
                หัวหน้าชุด
              </h5>
              {leadTechs.length > 0 ? (
                <div className="space-y-3">
                  {leadTechs.map((tech) => (
                    <div key={tech.id} className="flex items-center gap-3">
                      <img
                        src={tech.url || `https://ui-avatars.com/api/?name=${tech.name || 'L'}&background=0ea5e9&color=fff`}
                        alt={tech.name}
                        className="h-9 w-9 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-800">{tech.name}</div>
                        <div className="text-xs text-primary font-medium">หัวหน้าชุด</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-slate-400">ไม่มีหัวหน้าชุด</span>
              )}
            </div>

            {/* Other Techs */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <TechnicianIcon className="w-4 h-4 text-slate-400" />
                ทีมบริการ
              </h5>
              {otherTechs.length > 0 ? (
                <div className="space-y-3">
                  {otherTechs.map((tech) => (
                    <div key={tech.id} className="flex items-center gap-3">
                      <img
                        src={tech.url || `https://ui-avatars.com/api/?name=${tech.name || 'T'}&background=random`}
                        alt={tech.name}
                        className="h-9 w-9 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-800">{tech.name}</div>
                        <div className="text-xs text-slate-500">ช่างบริการ</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-slate-400">ไม่มีลูกทีม</span>
              )}
            </div>
          </div>
        </div>

        {/* รายละเอียดงาน + หมายเหตุ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<DocumentTextIcon />} title="รายละเอียดงาน" />
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-slate-700 whitespace-pre-wrap">
              {job.operation_details || '-'}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<ClipboardDocumentListIcon />} title="หมายเหตุ หรือข้อควรระวัง" />
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-sm text-slate-700 whitespace-pre-wrap">
              {job.remarks || '-'}
            </div>
          </div>
        </div>

        {/* Assessment Work Areas (detailed) */}
        {assessmentData?.assessment_areas && assessmentData.assessment_areas.length > 0 && (
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<ClipboardDocumentListIcon />} title="รายละเอียดพื้นที่ประเมิน" />
            <div className="space-y-3">
              {assessmentData.assessment_areas.map((area, index) => (
                <WorkAreaDetails key={index} area={area} />
              ))}
            </div>
          </div>
        )}

        {/* Fallback: basic work_areas from job (when no assessment) */}
        {!assessmentData?.assessment_areas?.length && job.work_areas && job.work_areas.length > 0 && (
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<ClipboardDocumentListIcon />} title="พื้นที่และบริการ" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {job.work_areas.map((area, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50"
                >
                  <span className="text-sm font-medium text-slate-800">{area.name}</span>
                  <span className="text-xs font-medium px-2 py-1 bg-white border border-slate-200 rounded text-slate-600">
                    {area.service_package}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Installments (from assessment) */}
        {assessmentData?.payment_condition === PaymentMethod.INSTALLMENT &&
          assessmentData.installments &&
          assessmentData.installments.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-5">
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
                    {assessmentData.installments.map((inst, idx) => (
                      <tr key={inst.id || idx}>
                        <td className="px-4 py-2 text-center font-medium text-slate-700">{inst.installment_no}</td>
                        <td className="px-4 py-2 text-slate-600">{inst.note || '-'}</td>
                        <td className="px-4 py-2 text-right font-medium text-slate-800">
                          {Number(inst.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-right text-xs font-bold text-slate-600">รวม</td>
                      <td className="px-4 py-2 text-right text-sm font-bold text-primary">
                        ฿{Number(assessmentData.total_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

        {/* Total price summary (from assessment) */}
        {assessmentData && assessmentData.total_price > 0 && assessmentData.payment_condition !== PaymentMethod.INSTALLMENT && (
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<CreditCardIcon />} title="สรุปค่าบริการ" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">ยอดรวมทั้งหมดสุทธิ</span>
              <span className="text-xl font-bold text-primary">
                ฿{Number(assessmentData.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </span>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
