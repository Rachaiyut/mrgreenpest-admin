import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Select, Textarea } from '../../common/FormControls';
import {
  FieldJob,
  Status,
  UserRole,
  FieldJobWorkArea,
  User,
  Warehouse,
} from '@/src/types/entity/app.interface';
import { RefreshIcon } from '../../../assets/icons/Icons';

// A component to manage a single work area within the job form
const JobWorkAreaForm: React.FC<{
  area: Partial<FieldJobWorkArea>;
  index: number;
  onAreaChange: (index: number, updatedArea: Partial<FieldJobWorkArea>) => void;
  onClearArea: (index: number) => void;
  isReadOnly: boolean;
}> = ({ area, index, onAreaChange, onClearArea, isReadOnly }) => {
  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onAreaChange(index, { ...area, [name]: value });
  };

  return (
    <div className="border border-slate-300 p-4 rounded-lg space-y-4 bg-slate-50 relative">
      {!isReadOnly && (
        <button
          type="button"
          onClick={() => onClearArea(index)}
          className="absolute top-2 right-2 flex items-center gap-1 text-slate-500 hover:text-slate-700 py-1 px-2 rounded-md hover:bg-slate-200 text-sm"
          title="ล้างค่าในพื้นที่นี้"
        >
          <RefreshIcon className="h-4 w-4" />
          <span>ล้างค่า</span>
        </button>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label={`ชื่อพื้นที่ #${index + 1}`}
          htmlFor={`areaName-${index}`}
        >
          <Input
            name="name"
            value={area.name || ''}
            onChange={handleFieldChange}
            placeholder="เช่น ชั้น 1, โซน A"
            required
            readOnly={isReadOnly}
          />
        </FormField>
        <FormField
          label="แพ็กเกจ/ประเภทบริการ"
          htmlFor={`servicePackage-${index}`}
        >
          <Input
            name="servicePackage"
            value={area.servicePackage || ''}
            onChange={handleFieldChange}
            required
            readOnly={isReadOnly}
          />
        </FormField>
      </div>
    </div>
  );
};

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: FieldJob | null;
  onUpdateJob: (job: FieldJob) => void;
  jobs: FieldJob[];
  users: User[];
  warehouses: Warehouse[];
}

export const EditJobModal: React.FC<EditJobModalProps> = ({
  isOpen,
  onClose,
  job,
  onUpdateJob,
  jobs,
  users,
  warehouses,
}) => {
  const [formData, setFormData] = useState<Partial<FieldJob>>({});
  const [leadTechnicianId, setLeadTechnicianId] = useState('');
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>(
    []
  );
  const [workDate, setWorkDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timeConflictError, setTimeConflictError] = useState<string | null>(
    null
  );
  const [workAreas, setWorkAreas] = useState<Partial<FieldJobWorkArea>[]>([]);

  const technicians = users.filter((u) => u.role === UserRole.Technician);
  const vehicleWarehouses = useMemo(
    () => warehouses.filter((w) => w.type === 'รถ'),
    [warehouses]
  );

  const bookedSlots = useMemo(() => {
    if (!formData.vehicleId || !workDate || !job) return [];
    return jobs
      .filter(
        (j) =>
          j.id !== job.id &&
          j.vehicleId === formData.vehicleId &&
          new Date(j.startTime).toISOString().substring(0, 10) === workDate
      )
      .map((j) => ({
        start: new Date(j.startTime).toTimeString().substring(0, 5),
        end: new Date(j.endTime).toTimeString().substring(0, 5),
        customer: j.customerName,
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [formData.vehicleId, workDate, jobs, job]);

  useEffect(() => {
    if (job) {
      const { workAreas, technicians, ...rest } = job;
      setFormData(rest);
      setWorkAreas(workAreas || []);

      const lead = technicians[0];
      const additional = technicians.slice(1);
      setLeadTechnicianId(lead?.id || '');
      setSelectedTechnicianIds(additional.map((t) => t.id));

      const startDate = new Date(job.startTime);
      setWorkDate(startDate.toISOString().substring(0, 10));
      setStartTime(startDate.toTimeString().substring(0, 5));
      setEndTime(new Date(job.endTime).toTimeString().substring(0, 5));
      setTimeConflictError(null);
    }
  }, [job]);

  useEffect(() => {
    if (!job || !formData.vehicleId || !workDate || !startTime || !endTime) {
      setTimeConflictError(null);
      return;
    }

    const newJobStart = new Date(`${workDate}T${startTime}`);
    const newJobEnd = new Date(`${workDate}T${endTime}`);

    if (newJobEnd <= newJobStart) {
      setTimeConflictError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น');
      return;
    }

    const conflictingJob = jobs.find((existingJob) => {
      if (existingJob.id === job.id) return false;
      if (existingJob.vehicleId !== formData.vehicleId) return false;

      const existingJobStart = new Date(existingJob.startTime);
      const existingJobEnd = new Date(existingJob.endTime);

      if (existingJobStart.toISOString().substring(0, 10) !== workDate) {
        return false;
      }

      return newJobStart < existingJobEnd && newJobEnd > existingJobStart;
    });

    if (conflictingJob) {
      setTimeConflictError(
        `เวลานี้ทับซ้อนกับงานของ ${conflictingJob.customerName} (${new Date(conflictingJob.startTime).toTimeString().substring(0, 5)} - ${new Date(conflictingJob.endTime).toTimeString().substring(0, 5)})`
      );
    } else {
      setTimeConflictError(null);
    }
  }, [formData.vehicleId, workDate, startTime, endTime, jobs, job]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLeadTechnicianChange = (id: string) => {
    setLeadTechnicianId(id);
    if (selectedTechnicianIds.includes(id)) {
      setSelectedTechnicianIds((prev) =>
        prev.filter((techId) => techId !== id)
      );
    }
  };

  const handleTechnicianToggle = (techId: string) => {
    setSelectedTechnicianIds((prev) =>
      prev.includes(techId)
        ? prev.filter((id) => id !== techId)
        : [...prev, techId]
    );
  };

  const createJobObject = (status: Status): FieldJob | null => {
    if (!job || !workDate || !startTime || !endTime || !leadTechnicianId)
      return null;

    const startDateTime = new Date(`${workDate}T${startTime}`).toISOString();
    const endDateTime = new Date(`${workDate}T${endTime}`).toISOString();

    const allTechnicianIds = [leadTechnicianId, ...selectedTechnicianIds];
    const uniqueTechnicianIds = [...new Set(allTechnicianIds)];
    const assignedTechnicians = users.filter((u) =>
      uniqueTechnicianIds.includes(u.id)
    );

    return {
      ...job,
      ...formData,
      startTime: startDateTime,
      endTime: endDateTime,
      technicians: assignedTechnicians,
      workAreas: workAreas as FieldJobWorkArea[],
      status: status,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeConflictError) return;
    if (!leadTechnicianId) {
      alert('กรุณาเลือกหัวหน้าช่าง');
      return;
    }
    const updatedJob = createJobObject(formData.status || Status.Planned);
    if (updatedJob) {
      onUpdateJob(updatedJob);
      onClose();
    }
  };

  const handleSaveDraft = () => {
    if (timeConflictError) return;
    if (!leadTechnicianId) {
      alert('กรุณาเลือกหัวหน้าช่าง');
      return;
    }
    const updatedJob = createJobObject(Status.Draft);
    if (updatedJob) {
      onUpdateJob(updatedJob);
      onClose();
    }
  };

  const handleNumberOfAreasChange = (count: number) => {
    setWorkAreas((currentAreas) => {
      const currentCount = currentAreas.length;
      if (count > currentCount) {
        const newAreas = Array.from(
          { length: count - currentCount },
          (_, i) => ({
            id: `area-${Date.now()}-${i}`,
            name: `พื้นที่ ${currentCount + i + 1}`,
            servicePackage: '',
          })
        );
        return [...currentAreas, ...newAreas];
      } else if (count < currentCount) {
        return currentAreas.slice(0, count);
      }
      return currentAreas;
    });
  };

  const handleAreaChange = (
    index: number,
    updatedArea: Partial<FieldJobWorkArea>
  ) => {
    setWorkAreas((prev) =>
      prev.map((area, i) => (i === index ? updatedArea : area))
    );
  };

  const handleClearArea = (index: number) => {
    setWorkAreas((prev) => {
      const newAreas = [...prev];
      const areaToClear = newAreas[index];
      if (areaToClear) {
        newAreas[index] = {
          id: areaToClear.id,
          name: areaToClear.name,
          servicePackage: '',
        };
      }
      return newAreas;
    });
  };

  if (!job) return null;

  const isReadOnly = !!job.assessmentId || !!job.contractId;
  const additionalTechnicians = technicians.filter(
    (tech) => tech.id !== leadTechnicianId
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขงาน: ${job.id}`}
      size="5xl"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="py-2 px-4 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed"
            disabled={!!timeConflictError}
          >
            บันทึกเป็นฉบับร่าง
          </button>
          <button
            type="submit"
            form="edit-job-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
            disabled={!!timeConflictError}
          >
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>
      }
    >
      <form id="edit-job-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="ลูกค้า" htmlFor="customerName">
          <Input
            id="customerName"
            name="customerName"
            type="text"
            value={formData.customerName || ''}
            onChange={handleChange}
            required
            readOnly
            className="bg-slate-100"
          />
        </FormField>

        <FormField label="ที่อยู่" htmlFor="address">
          <Textarea
            id="address"
            name="address"
            value={formData.address || ''}
            onChange={handleChange}
            required
          />
        </FormField>

        <div className="pt-4 mt-4 border-t">
          <h3 className="text-base font-semibold text-slate-800 mb-2">
            กลุ่มเส้นทาง/พื้นที่บริการ (ข้อมูลอ้างอิง)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField label="เขต (พื้นที่บริการ)" htmlFor="zone">
              <Input
                name="zone"
                value={formData.zone || ''}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
            <FormField label="Group" htmlFor="group">
              <Input
                name="group"
                value={formData.group || ''}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
            <FormField label="สายถนนที่" htmlFor="roadLine">
              <Input
                name="roadLine"
                value={formData.roadLine || ''}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
            <FormField label="ลำดับที่" htmlFor="sequence">
              <Input
                name="sequence"
                value={formData.sequence || ''}
                readOnly
                className="bg-slate-100"
              />
            </FormField>
          </div>
        </div>

        <FormField label="Link Google Map" htmlFor="googleMapLink">
          <Input
            name="googleMapLink"
            type="url"
            value={formData.googleMapLink || ''}
            onChange={handleChange}
            placeholder="https://maps.app.goo.gl/..."
          />
        </FormField>

        {workAreas.length > 0 && (
          <div className="space-y-4 pt-4 mt-4 border-t">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">
              รายละเอียดพื้นที่บริการ
            </h3>
            {isReadOnly ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                ข้อมูลพื้นที่ถูกดึงมาจาก{' '}
                {job.assessmentId ? 'ใบประเมิน' : 'สัญญา'} เลขที่:{' '}
                <strong>{job.assessmentId || job.contractId}</strong>
              </div>
            ) : (
              <FormField
                label="จำนวนพื้นที่ที่ต้องการเข้าบริการ"
                htmlFor="numberOfAreas"
              >
                <Select
                  id="numberOfAreas"
                  value={workAreas.length}
                  onChange={(e) =>
                    handleNumberOfAreasChange(parseInt(e.target.value, 10))
                  }
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            {workAreas.map((area, index) => (
              <JobWorkAreaForm
                key={area.id || index}
                area={area}
                index={index}
                onAreaChange={handleAreaChange}
                onClearArea={handleClearArea}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        )}

        <FormField
          label="รายละเอียดการปฏิบัติงาน"
          htmlFor="operation-details-edit"
        >
          <Textarea
            id="operation-details-edit"
            name="operationDetails"
            value={formData.operationDetails || ''}
            onChange={handleChange}
            placeholder="รายละเอียดจากใบประเมิน/สัญญาจะแสดงที่นี่ สามารถเพิ่มหมายเหตุเพิ่มเติมได้"
            rows={8}
          />
        </FormField>

        <FormField label="เลือกรถที่ปฏิบัติงาน" htmlFor="vehicleId">
          <Select
            id="vehicleId"
            name="vehicleId"
            value={formData.vehicleId || ''}
            onChange={handleChange}
            required
          >
            <option value="">-- เลือกรถบริการ --</option>
            {vehicleWarehouses.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.licensePlate})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="วันที่ปฏิบัติงาน" htmlFor="work-date">
          <Input
            id="work-date"
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            required
          />
        </FormField>

        {bookedSlots.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
            <p className="font-semibold text-amber-800">
              ช่วงเวลาที่ไม่ว่างสำหรับรถคันนี้ในวันที่เลือก:
            </p>
            <ul className="list-disc list-inside mt-1 text-amber-700">
              {bookedSlots.map((slot) => (
                <li key={slot.start}>
                  {slot.start} - {slot.end} (งาน: {slot.customer})
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="เวลาเริ่มต้น" htmlFor="start-time">
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </FormField>
          <FormField label="เวลาสิ้นสุด" htmlFor="end-time">
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </FormField>
        </div>

        {timeConflictError && (
          <p className="text-sm text-red-600 -mt-2">{timeConflictError}</p>
        )}

        <FormField label="หัวหน้าช่าง" htmlFor="lead-technician-select">
          <Select
            id="lead-technician-select"
            name="leadTechnicianId"
            value={leadTechnicianId}
            onChange={(e) => handleLeadTechnicianChange(e.target.value)}
            required
          >
            <option value="">-- เลือกหัวหน้าช่าง --</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="ช่างเทคนิคเพิ่มเติม (ถ้ามี)">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 border rounded-md max-h-40 overflow-y-auto">
            {additionalTechnicians.map((tech) => (
              <label
                key={tech.id}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTechnicianIds.includes(tech.id)}
                  onChange={() => handleTechnicianToggle(tech.id)}
                />
                <span className="text-slate-800">{tech.name}</span>
              </label>
            ))}
          </div>
        </FormField>
      </form>
    </Modal>
  );
};

