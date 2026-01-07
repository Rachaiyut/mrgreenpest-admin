import React, { useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FieldJob, Assessment } from '../../../types';
import { StatusBadge } from '../../common/StatusBadge';
import { GoogleMapIcon } from '../../../assets/icons/Icons';
import { MOCK_WAREHOUSES, formatThaiDate } from '../../../constants';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: FieldJob | null;
  assessment: Assessment | null;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  isOpen,
  onClose,
  job,
  assessment,
}) => {
  const vehicle = useMemo(() => {
    if (!job?.vehicleId) return null;
    return MOCK_WAREHOUSES.find((w) => w.id === job.vehicleId);
  }, [job]);

  if (!isOpen || !job) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`รายละเอียดงาน: ${job.id}`}
      size="4xl"
    >
      <div className="space-y-6 text-sm">
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            ข้อมูลทั่วไป
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <dt className="font-medium text-slate-500">รหัสงาน</dt>
              <dd className="mt-1 text-slate-900 font-semibold">{job.id}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">สถานะ</dt>
              <dd className="mt-1 text-slate-900">
                <StatusBadge status={job.status} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ลูกค้า</dt>
              <dd className="mt-1 text-slate-900 font-semibold">
                {job.customerName}
              </dd>
            </div>
            {job.operationDetails && (
              <div className="md:col-span-2">
                <dt className="font-medium text-slate-500">
                  รายละเอียดการปฏิบัติงาน
                </dt>
                <dd className="mt-1 text-slate-900 bg-slate-50 p-2 rounded-md whitespace-pre-wrap">
                  {job.operationDetails}
                </dd>
              </div>
            )}
            {!assessment && (
              <div className="md:col-span-2">
                <dt className="font-medium text-slate-500">
                  พื้นที่และบริการ (ที่มอบหมาย)
                </dt>
                <dd className="mt-1 text-slate-900 space-y-1">
                  {job.workAreas.map((area) => (
                    <div key={area.id}>
                      <p className="font-semibold">
                        {area.name}:{' '}
                        <span className="font-normal">
                          {area.servicePackage}
                        </span>
                      </p>
                    </div>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <hr />
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            ข้อมูลที่อยู่และเส้นทาง
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
            <div className="md:col-span-2">
              <dt className="font-medium text-slate-500">ที่อยู่</dt>
              <dd className="mt-1 text-slate-900">{job.address}</dd>
              {job.googleMapLink && (
                <dd className="mt-2">
                  <a
                    href={job.googleMapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <GoogleMapIcon className="h-4 w-4" />
                    <span>เปิดใน Google Maps</span>
                  </a>
                </dd>
              )}
            </div>
            <div>
              <dt className="font-medium text-slate-500">
                เขต (พื้นที่บริการ)
              </dt>
              <dd className="mt-1 text-slate-900">{job.zone || '-'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Group</dt>
              <dd className="mt-1 text-slate-900">{job.group || '-'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">สายถนนที่</dt>
              <dd className="mt-1 text-slate-900">{job.roadLine || '-'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">ลำดับที่</dt>
              <dd className="mt-1 text-slate-900">{job.sequence || '-'}</dd>
            </div>
          </dl>
        </div>
        <hr />
        <div>
          <h4 className="text-base font-semibold text-slate-800 mb-3">
            กำหนดการและทีมงาน
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <dt className="font-medium text-slate-500">วันที่ปฏิบัติงาน</dt>
              <dd className="mt-1 text-slate-900">
                {formatThaiDate(job.startTime)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">เวลา</dt>
              <dd className="mt-1 text-slate-900">
                {new Date(job.startTime).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                -{' '}
                {new Date(job.endTime).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="font-medium text-slate-500">
                ช่างเทคนิคที่ได้รับมอบหมาย
              </dt>
              <dd className="mt-2">
                {job.technicians.length > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    {job.technicians.map((tech) => (
                      <div key={tech.id} className="flex items-center gap-2">
                        <img
                          src={tech.avatarUrl}
                          alt={tech.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                        <span className="font-semibold text-slate-900">
                          {tech.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic">
                    ยังไม่มอบหมายช่าง
                  </span>
                )}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="font-medium text-slate-500">รถบริการ</dt>
              <dd className="mt-1 text-slate-900">
                {vehicle ? (
                  `${vehicle.name} (${vehicle.licensePlate})`
                ) : (
                  <span className="text-slate-500 italic">ยังไม่มอบหมายรถ</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
        {assessment && (
          <>
            <hr />
            <div>
              <h4 className="text-base font-semibold text-slate-800 mb-3">
                รายละเอียดจากใบประเมิน ({assessment.id})
              </h4>
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 -mr-2">
                {assessment.workAreas.map((area) => (
                  <div
                    key={area.id}
                    className="p-4 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <h5 className="text-md font-bold text-primary">
                      {area.name}
                    </h5>
                    <dl className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <dt className="font-medium text-slate-500">
                          ประเภทสิ่งปลูกสร้าง
                        </dt>
                        <dd className="mt-1 text-slate-900">
                          {area.buildingType || '-'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-500">
                          พื้นที่ (ตร.ม.)
                        </dt>
                        <dd className="mt-1 text-slate-900">{area.areaSize}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-500">
                          ประเภทบริการ
                        </dt>
                        <dd className="mt-1 text-slate-900">
                          {area.serviceType.join(', ')}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-500">
                          ระบบที่ใช้
                        </dt>
                        <dd className="mt-1 text-slate-900">
                          {area.serviceSystem || '-'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
