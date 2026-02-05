import React, { useMemo, FC, ReactNode, ReactElement, cloneElement } from 'react';
import { Modal } from '../../common/Modal';
import { FieldJob } from '@/src/types/entity/field-job.interface';
import { Assessment } from '@/src/types/entity/assessment.interface';
import { Warehouse } from '@/src/types/entity/inventory.interface';
import { StatusBadge } from '../../common/StatusBadge';
import { 
  GoogleMapIcon, 
  DocumentTextIcon, 
  MapIcon, 
  UserGroupIcon,
  TechnicianIcon,
  NewWarehouseIcon,
  HomeIcon
} from '../../../assets/icons/Icons';
import { formatThaiDate } from '../../../utils/date';
import { UserRole } from '@/src/types/entity/core.interface';
import { Button } from '../../common/FormControls';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: FieldJob | null;
  assessment: Assessment | null;
  warehouses: Warehouse[];
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
      (t) => t.role === UserRole.LEAD_TECH || t.role === 'LEAD_TECH' || t.role === 'Lead Technician'
    );
    const others = job.technicians.filter(
      (t) => t.role !== UserRole.LEAD_TECH && t.role !== 'LEAD_TECH' && t.role !== 'Lead Technician'
    );
    
    return { leadTechs: leads, otherTechs: others };
  }, [job?.technicians]);

  if (!isOpen || !job) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดงาน: ${job.customerName || 'ลูกค้าไม่ระบุ'}`}
      size="5xl"
      footer={
        <div className="flex w-full items-center justify-end bg-slate-50 -m-6 p-6 border-t border-slate-200 rounded-b-xl">
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
              <DetailItem label="รหัสงาน" value={job.id} />
              <DetailItem 
                label="สถานะ" 
                value={<StatusBadge status={job.status} />} 
              />
              <DetailItem 
                label="ลูกค้า" 
                value={
                  <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4 text-slate-400" />
                    <span>{job.customerName}</span>
                  </div>
                }
                fullWidth 
              />
              <DetailItem label="วันที่ปฏิบัติงาน" value={formatThaiDate(job.start_time)} />
              <DetailItem 
                label="เวลา" 
                value={`
                  ${new Date(job.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - 
                  ${new Date(job.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                `} 
              />
            </dl>
          </div>

          {/* Address Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SectionHeader icon={<MapIcon />} title="ข้อมูลที่อยู่และเส้นทาง" />
            <dl className="grid grid-cols-2 gap-4">
              <DetailItem 
                label="ที่อยู่" 
                value={
                  <div className="flex flex-col gap-2">
                    <span className="flex items-start gap-2">
                      <HomeIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      {job.address}
                    </span>
                    {job.google_map_link && (
                      <a
                        href={job.google_map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline bg-primary/5 px-2 py-1 rounded w-fit"
                      >
                        <GoogleMapIcon className="h-3 w-3" />
                        เปิดใน Google Maps
                      </a>
                    )}
                  </div>
                }
                fullWidth
              />
              <DetailItem label="เขต (พื้นที่บริการ)" value={job.zone} />
              <DetailItem label="กลุ่มบริการ" value={job.group} />
              <DetailItem label="สายถนนที่" value={job.road_line} />
              <DetailItem label="ลำดับที่" value={job.sequence} />
            </dl>
          </div>
        </div>

        {/* Team & Vehicle Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <SectionHeader icon={<UserGroupIcon />} title="ทีมงานและพาหนะ" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Vehicle */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <NewWarehouseIcon className="w-4 h-4 text-slate-500" />
                รถบริการ
              </h5>
              {vehicle ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <NewWarehouseIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{vehicle.name}</div>
                    <div className="text-xs text-slate-500">
                      {(vehicle as any).license_plate || vehicle.vehicle?.vehicle_registration || '-'}
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">ยังไม่มอบหมายรถ</span>
              )}
            </div>

            {/* Lead Tech */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <TechnicianIcon className="w-4 h-4 text-primary" />
                หัวหน้าชุด (Lead Tech)
              </h5>
              {leadTechs.length > 0 ? (
                <div className="space-y-3">
                  {leadTechs.map((tech) => (
                    <div key={tech.id} className="flex items-center gap-3">
                      <img
                        src={tech.avatarUrl || `https://ui-avatars.com/api/?name=${tech.name || 'L'}&background=0ea5e9&color=fff`}
                        alt={tech.name}
                        className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                      <div>
                        <div className="font-medium text-slate-900">{tech.name}</div>
                        <div className="text-xs text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded w-fit">
                          หัวหน้าชุด
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">ไม่มีหัวหน้าชุด</span>
              )}
            </div>

            {/* Other Techs */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <UserGroupIcon className="w-4 h-4 text-slate-500" />
                ทีมบริการ (Technicians)
              </h5>
              {otherTechs.length > 0 ? (
                <div className="space-y-3">
                  {otherTechs.map((tech) => (
                    <div key={tech.id} className="flex items-center gap-3">
                      <img
                        src={tech.avatarUrl || `https://ui-avatars.com/api/?name=${tech.name || 'T'}&background=random`}
                        alt={tech.name}
                        className="h-9 w-9 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="font-medium text-slate-900">{tech.name}</div>
                        <div className="text-xs text-slate-500">ช่างบริการ</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">ไม่มีลูกทีม</span>
              )}
            </div>
          </div>
        </div>

        {/* Operation Details / Work Areas */}
        {((job.work_areas && job.work_areas.length > 0) || job.operation_details) && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SectionHeader icon={<DocumentTextIcon />} title="รายละเอียดการปฏิบัติงาน" />
            
            {job.operation_details && (
              <div className="mb-6">
                <h5 className="text-sm font-medium text-slate-700 mb-2">หมายเหตุ / รายละเอียดเพิ่มเติม</h5>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600 whitespace-pre-wrap">
                  {job.operation_details}
                </div>
              </div>
            )}

            {job.work_areas && job.work_areas.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-slate-700 mb-3">พื้นที่และบริการที่มอบหมาย</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {job.work_areas.map((area, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <span className="font-medium text-slate-800">{area.name}</span>
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


