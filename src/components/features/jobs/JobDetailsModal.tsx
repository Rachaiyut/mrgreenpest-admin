import React, {
  useMemo,
  FC,
  ReactNode,
  ReactElement,
  cloneElement,
} from 'react';
import { Modal } from '../../common/Modal';
import { FieldJob } from '@/src/types/entity/service-report.interface';
import { Assessment } from '@/src/types/entity/assessment.interface';
import { Warehouse } from '@/src/types/entity/inventory.interface';
import { StatusBadge } from '../../common/StatusBadge';
import {
  GoogleMapIcon,
  DocumentTextIcon,
  MapPinIcon,
  UserGroupIcon,
  TechnicianIcon,
  HomeIcon,
  TruckIcon,
} from '../../../assets/icons/Icons';
import { formatThaiDate } from '../../../utils/date';
import { UserRole } from '@/src/types/entity/core.interface';

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

export const JobDetailsModal: FC<JobDetailsModalProps> = ({
  isOpen,
  onClose,
  job,
  assessment,
  warehouses,
}) => {
  const vehicle = useMemo(() => {
    if (!job?.vehicle_id) return null;
    return warehouses.find((w) => w.id === job.vehicle_id);
  }, [job, warehouses]);

  const { leadTechs, otherTechs } = useMemo(() => {
    if (!job?.technicians) return { leadTechs: [], otherTechs: [] };

    const leads = job.technicians.filter(
      (t) =>
        t.role === UserRole.LEAD_TECH ||
        t.role === 'LEAD_TECH' ||
        t.role === 'Lead Technician'
    );
    const others = job.technicians.filter(
      (t) =>
        t.role !== UserRole.LEAD_TECH &&
        t.role !== 'LEAD_TECH' &&
        t.role !== 'Lead Technician'
    );

    return { leadTechs: leads, otherTechs: others };
  }, [job?.technicians]);

  if (!isOpen || !job) return null;

  const jobCode = job.code || job.id?.substring(0, 8) || '-';
  const customerName = job.customerName || '-';
  const customerCode = job.customer?.code || (job as any).customer_code || '-';

  const timeRange = (() => {
    try {
      const start = new Date(job.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const end = new Date(job.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      return `${start} - ${end}`;
    } catch {
      return '-';
    }
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดงาน: ${customerName}`}
      size="5xl"
    >
      <div className="space-y-5">
        {/* Top Section: Info & Address */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* General Info */}
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<DocumentTextIcon />} title="ข้อมูลทั่วไป" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <DetailItem label="รหัสงาน" value={<span className="text-primary font-bold">{jobCode}</span>} />
              <DetailItem label="สถานะ" value={<StatusBadge status={job.status} />} />
              <DetailItem label="ลูกค้า" value={customerName} />
              <DetailItem label="รหัสลูกค้า" value={<span className="text-green-600 font-bold">{customerCode}</span>} />
              <DetailItem label="วันที่ปฏิบัติงาน" value={formatThaiDate(job.start_time)} />
              <DetailItem label="เวลา" value={timeRange} />
              {(job as any).reference_code && (
                <DetailItem label="อ้างอิง" value={(job as any).reference_code} fullWidth />
              )}
            </dl>
          </div>

          {/* Address Info */}
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<HomeIcon />} title="ข้อมูลที่อยู่" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <DetailItem label="ที่อยู่" value={job.address} fullWidth />
              <DetailItem label="เขต (พื้นที่บริการ)" value={job.zone} />
              <DetailItem label="กลุ่มบริการ" value={job.group} />
              <DetailItem label="สายถนนที่" value={job.road_line} />
              <DetailItem label="ลำดับที่" value={job.sequence} />
            </dl>
            {job.google_map_link && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <a
                  href={job.google_map_link}
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
                      {(vehicle as any).license_plate || vehicle.vehicle?.vehicle_registration || '-'}
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

        {/* Operation Details / Work Areas */}
        {((job.work_areas && job.work_areas.length > 0) || job.operation_details) && (
          <div className="rounded-xl border border-slate-200 p-5">
            <SectionHeader icon={<MapPinIcon />} title="หมายเหตุ หรือข้อควรระวัง" />

            {job.operation_details && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">หมายเหตุ</p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600 whitespace-pre-wrap">
                  {job.operation_details}
                </div>
              </div>
            )}

            {job.work_areas && job.work_areas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">พื้นที่และบริการ</p>
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
          </div>
        )}
      </div>
    </Modal>
  );
};
