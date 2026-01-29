import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Button, FormField, Input, Select, Textarea } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { Assessment, User, UserRole, Warehouse, Product, Category } from '@/src/types/entity/app.interface';
import {
  FieldJob,
  FieldJobWorkArea,
} from '@/src/types/entity/field-job.interface';
import { JobStatus } from '@/src/types/enums/job';
import { PlusIcon, RefreshIcon } from '../../../assets/icons/Icons';
import { WarehouseType, CategoryType } from '@/src/types';
import { AssessmentApi, ProductApi, CategoryApi } from '@/src/api';
import { PaymentMethod } from '@/src/types/enums/financial';
import { WorkAreaForm } from '../assessments/WorkAreaForm';

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
            name="service_package"
            value={area.service_package || ''}
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
  onUpdateJob: (payload: any) => void;
  jobs: FieldJob[];
  users: User[];
  warehouses: Warehouse[];
  currentUser?: User;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'เงินสด',
  [PaymentMethod.TRANSFER]: 'โอนเงิน',
};

export const EditJobModal: React.FC<EditJobModalProps> = ({
  isOpen,
  onClose,
  job,
  onUpdateJob,
  jobs,
  users,
  warehouses,
  currentUser,
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
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const servicePackages = useMemo(
    () => products.filter((p) => (p as any)?.category?.type === CategoryType.SERVICE),
    [products]
  );

  const technicians = (users || []).filter((u) => u.role === UserRole.Technician);

  // Handle Assessment field changes
  const handleAssessmentChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!assessment) return;
    const { name, value } = e.target;
    setAssessment((prev) => (prev ? { ...prev, [name]: value } : null));
  };
  const vehicleWarehouses = useMemo(
    () => warehouses.filter((w) => w.type === WarehouseType.VEHICLE),
    [warehouses]
  );


  const bookedSlots = useMemo(() => {
    if (!formData.vehicle_id || !workDate || !job) return [];
    return jobs
      .filter(
        (j) =>
          j.id !== job.id &&
          j.vehicle_id === formData.vehicle_id &&
          new Date(j.start_time).toISOString().substring(0, 10) === workDate
      )
      .map((j) => ({
        start: new Date(j.start_time).toTimeString().substring(0, 5),
        end: new Date(j.end_time).toTimeString().substring(0, 5),
        customer: j.customer_name,
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [formData.vehicle_id, workDate, jobs, job]);

  useEffect(() => {
    if (isOpen && job?.assessment_id) {
      AssessmentApi.getById(job.assessment_id)
        .then((res) => {
          setAssessment(res.data || null);
          console.log('Fetched assessment:', res.data || null);
        })
        .catch((err) => {
          console.error('Error fetching assessment:', err);
        });
    }
  }, [isOpen, job?.assessment_id]);

  useEffect(() => {
    if (isOpen) {
      ProductApi.getProducts({ page: 1, limit: 100 })
        .then((res: any) => {
          setProducts(res.data || []);
        })
        .catch((err: any) => {
          console.error('Error fetching products:', err);
        });
      CategoryApi.getCategories({ type: CategoryType.SERVICE, page: 1, limit: 100 })
        .then((res: any) => {
          setCategories(res.data || []);
        })
        .catch((err: any) => {
          console.error('Error fetching categories:', err);
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (assessment) {
      setSelectedPackageId((assessment as any).package_id || null);
    } else {
      setSelectedPackageId(null);
    }
  }, [assessment]);

  useEffect(() => {
    if (job) {
      const { work_areas, technicians, ...rest } = job;
      setFormData(rest);
      setWorkAreas(work_areas || []);

      const lead = technicians[0];
      const additional = technicians.slice(1);
      setLeadTechnicianId(lead?.id || '');
      setSelectedTechnicianIds(additional.map((t) => t.id));

      const startDate = new Date(job.start_time);
      setWorkDate(startDate.toISOString().substring(0, 10));
      setStartTime(startDate.toTimeString().substring(0, 5));
      setEndTime(new Date(job.end_time).toTimeString().substring(0, 5));
      setTimeConflictError(null);
    }
  }, [job]);

  useEffect(() => {
    if (!job || !formData.vehicle_id || !workDate || !startTime || !endTime) {
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
      if (existingJob.vehicle_id !== formData.vehicle_id) return false;

      const existingJobStart = new Date(existingJob.start_time);
      const existingJobEnd = new Date(existingJob.end_time);

      if (existingJobStart.toISOString().substring(0, 10) !== workDate) {
        return false;
      }

      return newJobStart < existingJobEnd && newJobEnd > existingJobStart;
    });

    if (conflictingJob) {
      setTimeConflictError(
        `เวลานี้ทับซ้อนกับงานของ ${conflictingJob.customer_name} (${new Date(conflictingJob.start_time).toTimeString().substring(0, 5)} - ${new Date(conflictingJob.end_time).toTimeString().substring(0, 5)})`
      );
    } else {
      setTimeConflictError(null);
    }
  }, [formData.vehicle_id, workDate, startTime, endTime, jobs, job]);

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

  const createJobObject = (status: JobStatus): any | null => {
    if (!job || !workDate || !startTime || !endTime) return null;

    const startDateTime = new Date(`${workDate}T${startTime}`).toISOString();
    const endDateTime = new Date(`${workDate}T${endTime}`).toISOString();
    const apiStatus =
      status === JobStatus.InProgress
        ? 'IN_PROGRESS'
        : status === JobStatus.Completed
        ? 'COMPLETE'
        : 'PENDING';

    const primaryTechId =
      (job as any)?.primary_technician?.id || leadTechnicianId || undefined;

    const teamMembers = (selectedTechnicianIds || []).map((id) => ({
      user_id: id,
      check_in: null,
      check_out: null,
    }));

    const payload: any = {
      id: job.id,
      primary_tech_id: primaryTechId,
      vehicle_id: formData.vehicle_id,
      start_date: startDateTime,
      end_date: endDateTime,
      status: apiStatus,
      service_system: (assessment as any)?.service_system || 'CHEMICAL',
      remark: formData.remarks,
      team_member: teamMembers,
      assessment: assessment
        ? {
            customer_id: job.customer_id,
            package_id: (assessment as any).package_id,
            appointment_date: assessment.appointment_date
              ? new Date(assessment.appointment_date).toISOString().substring(0, 10)
              : undefined,
            address: job.address,
            sub_district: (assessment as any).sub_district || (job as any).sub_district,
            district: (assessment as any).district || (job as any).district,
            province: (assessment as any).province || (job as any).province,
            zipcode: (assessment as any).zipcode || (job as any).postal_code,
            zone: (job as any).zone,
            route_group: (job as any).group,
            road_line: (job as any).road_line,
            sequence: (job as any).sequence,
            google_map_link: job.google_map_link,
            status: (assessment as any).status,
            payment_condition: (assessment as any).payment_condition,
            total_price: (assessment as any).total_price,
            created_by: currentUser?.name,
            updated_by: currentUser?.name,
            assessment_areas: ((assessment as any)?.assessment_areas || []).map(
              (area: any) => ({
                package_price_id: area.package_price_id,
                area_name: area.area_name,
                building_type: area.building_type,
                service_system: area.service_system,
                area_size: area.area_size,
                total_price: area.total_price,
                category_services: area.category_services || [],
                items: (area.items || []).map((it: any) => ({
                  product_id: it.product_id,
                  quantity: it.quantity,
                  total_price: it.total_price,
                })),
              })
            ),
          }
        : undefined,
    };

    return payload;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeConflictError) return;
   
    const updatedPayload = createJobObject(formData.status || JobStatus.Planned);
    if (updatedPayload) {
      onUpdateJob(updatedPayload);
      onClose();
    }
  };

  const handleSaveDraft = () => {
   
    const updatedJob = createJobObject(JobStatus.Draft);
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
            service_package: '',
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
          service_package: '',
        };
      }
      return newAreas;
    });
  };

  const handleAssessmentAreaChange = (
    index: number,
    updatedArea: any
  ) => {
    setAssessment((prev) => {
      if (!prev) return prev;
      const areas = [...(prev.assessment_areas || [])];
      areas[index] = updatedArea;
      return { ...prev, assessment_areas: areas } as Assessment;
    });
  };

  const handleAssessmentAreaClear = (index: number) => {
    setAssessment((prev) => {
      if (!prev) return prev;
      const areas = [...(prev.assessment_areas || [])];
      const areaToClear = areas[index] as any;
      if (areaToClear) {
        areas[index] = {
          id: areaToClear.id,
          area_name: areaToClear.area_name,
          building_type: '',
          area_size: undefined,
          category_services: [],
          service_system: undefined,
          base_service_price: 0,
          total_price: 0,
          items: [],
        };
      }
      return { ...prev, assessment_areas: areas } as Assessment;
    });
  };

  const handleAssessmentAreaRemove = (index: number) => {
    setAssessment((prev) => {
      if (!prev) return prev;
      const areas = [...(prev.assessment_areas || [])];
      if (areas.length > 1) {
        const newAreas = areas.filter((_, i) => i !== index);
        return { ...prev, assessment_areas: newAreas } as Assessment;
      } else {
        alert('ต้องมีอย่างน้อย 1 พื้นที่ในใบประเมิน');
        return prev;
      }
    });
  };

  if (!job) return null;

  const isReadOnly = !!job.assessment_id || !!job.contract_id;
  const additionalTechnicians = technicians.filter(
    (tech) => tech.id !== leadTechnicianId
  );

  const primaryTechnicianDisplay = (() => {
    const pt = (job as any)?.primary_technician;
    const parts = [
      pt?.first_name || '',
      pt?.last_name || '',
      pt?.nick_name || pt?.nickname || '',
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    if (leadTechnicianId) {
      const tech: any = (users || []).find((u) => u.id === leadTechnicianId);
      const name = tech?.name || '';
      const fallbackParts = name
        ? [name]
        : [
            tech?.first_name || '',
            tech?.last_name || '',
            tech?.nick_name || tech?.nickname || '',
          ].filter(Boolean);
      return fallbackParts.join(' ');
    }
    return '';
  })();

  const handleAddArea = () => {
    setAssessment((prev) => {
      if (!prev) return prev;
      const nextIndex = (prev.assessment_areas || []).length + 1;
      const newArea: any = {
        id: `area-${Date.now()}`,
        area_name: `พื้นที่ ${nextIndex}`,
        building_type: '',
        area_size: undefined,
        category_services: [],
        service_system: undefined,
        base_service_price: 0,
        total_price: 0,
        items: [],
      };
      return {
        ...prev,
        assessment_areas: [...(prev.assessment_areas || []), newArea],
      } as Assessment;
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขงาน-: ${job.customer_name}`}
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
          {/* <button
            type="button"
            onClick={handleSaveDraft}
            className="py-2 px-4 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed"
            disabled={!!timeConflictError}
          >
            บันทึกเป็นฉบับร่าง
          </button> */}
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
            name="customer_name"
            type="text"
            value={formData.customer_name || ''}
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
                name="road_line"
                value={formData.road_line || ''}
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
            name="google_map_link"
            type="url"
            value={formData.google_map_link || ''}
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
                {job.assessment_id ? 'ใบประเมิน' : 'สัญญา'} เลขที่:{' '}
                <strong>{job.assessment_id || job.contract_id}</strong>
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
            name="operation_details"
            value={formData.operation_details || ''}
            onChange={handleChange}
            placeholder="รายละเอียดจากใบประเมิน/สัญญาจะแสดงที่นี่ สามารถเพิ่มหมายเหตุเพิ่มเติมได้"
            rows={8}
          />
        </FormField>

        <FormField label="เลือกรถที่ปฏิบัติงาน" htmlFor="vehicleId">
          <Select
            id="vehicleId"
            name="vehicle_id"
            value={formData.vehicle_id || ''}
            onChange={handleChange}
            required
          >
            <option value="">-- เลือกรถบริการ --</option>
            {vehicleWarehouses.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.vehicle?.vehicle_registration || '-'})
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

        <FormField label="หัวหน้าช่าง" htmlFor="lead-technician-display">
          <Input
            id="lead-technician-display"
            value={primaryTechnicianDisplay}
            readOnly
            className="bg-slate-100"
          />
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
       
        {assessment && (
          <div className="border border-slate-200 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">ข้อมูลภาพรวม</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="วันที่นัดหมาย" htmlFor="appointment_date">
                <Input
                  name="appointment_date"
                  type="date"
                  value={
                    assessment.appointment_date
                      ? new Date(assessment.appointment_date)
                          .toISOString()
                          .substring(0, 10)
                      : ''
                  }
                  onChange={handleAssessmentChange}
                  className="bg-white"
                />
              </FormField>
              <FormField label="เงื่อนไขการชำระเงิน" htmlFor="payment_condition">
                <SearchableSelect
                  name="payment_condition"
                  options={Object.values(PaymentMethod).map((method) => ({
                    value: method,
                    label: PAYMENT_LABELS[method],
                  }))}
                  value={assessment.payment_condition || ''}
                  onChange={(val: string) =>
                    setAssessment((prev) =>
                      prev ? { ...prev, payment_condition: val as PaymentMethod } : null
                    )
                  }
                  required
                />
              </FormField>
            </div>
               {/* Work Areas */}
                <div className="space-y-4">
                 {(assessment.assessment_areas || []).map((area, index) => (
                  <WorkAreaForm
                          key={area.id || index}
                          area={area}
                          index={index}
                          onAreaChange={handleAssessmentAreaChange}
                          onRemoveArea={handleAssessmentAreaRemove}
                          onClearArea={handleAssessmentAreaClear}
                          products={products}
                          selectedPackage={
                            selectedPackageId
                              ? (servicePackages.find(
                                  (p) => p.id === selectedPackageId
                                ) as any)!
                              : null
                          }
                          categories={categories}
                        />
                      ))}
             </div>
               <div className="flex justify-center">
                       <Button type="button" onClick={handleAddArea} variant="primary">
                         <PlusIcon className="h-5 w-5" />
                         เพิ่มพื้นที่ใหม่
                       </Button>
                     </div>
          </div>
        )}
       
      </form>
    </Modal>
  );
};
