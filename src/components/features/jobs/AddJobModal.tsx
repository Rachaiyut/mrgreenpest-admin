import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import {
  FormField,
  Input,
  Select,
  Textarea,
  Button,
} from '../../common/FormControls';
import {
  Assessment,
  Status,
  FieldJob,
  Customer,
  Contract,
  FieldJobWorkArea,
  User,
  Product,
  UserRole,
} from '@/src/libs/common/interface/entity/app.interface';
import {
  MOCK_WAREHOUSES,
  MOCK_CUSTOMERS,
  MOCK_PRODUCTS,
} from '../../../constants';
import { StatusBadge } from '../../common/StatusBadge';
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

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessments: Assessment[];
  contracts: Contract[];
  onCreateJob: (jobData: Omit<FieldJob, 'id'>, assessmentId?: string) => void;
  jobs: FieldJob[];
  users: User[];
  products: Product[];
  initialContractId?: string;
  initialWorkDateIso?: string;
}

export const AddJobModal: React.FC<AddJobModalProps> = ({
  isOpen,
  onClose,
  assessments,
  contracts,
  onCreateJob,
  jobs,
  users,
  products,
  initialContractId,
  initialWorkDateIso,
}) => {
  const [selectedReference, setSelectedReference] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [leadTechnicianId, setLeadTechnicianId] = useState('');
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>(
    []
  );
  const [workDate, setWorkDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [timeConflictError, setTimeConflictError] = useState<string | null>(
    null
  );
  const [workAreas, setWorkAreas] = useState<Partial<FieldJobWorkArea>[]>([]);
  const [operationDetails, setOperationDetails] = useState('');

  const technicians = users.filter((u) => u.role === UserRole.Technician);
  const vehicleWarehouses = useMemo(
    () => MOCK_WAREHOUSES.filter((w) => w.type === 'รถ'),
    []
  );
  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const availableAssessments = useMemo(() => {
    const baseAssessments = assessments.filter(
      (a) => a.status === Status.Draft || a.status === Status.Completed
    );
    if (selectedCustomerId) {
      return baseAssessments.filter((a) => a.customerId === selectedCustomerId);
    }
    return [];
  }, [assessments, selectedCustomerId]);

  const availableContracts = useMemo(() => {
    if (!selectedCustomerId) return [];
    return contracts.filter(
      (c) =>
        c.customerId === selectedCustomerId && c.status === Status.InProgress
    );
  }, [contracts, selectedCustomerId]);

  const isAssessment = selectedReference.startsWith('asm-');
  const isContract = selectedReference.startsWith('con-');

  const selectedAssessment = isAssessment
    ? assessments.find((a) => a.id === selectedReference.replace('asm-', ''))
    : null;
  const selectedContract = isContract
    ? contracts.find((c) => c.id === selectedReference.replace('con-', ''))
    : null;
  const selectedCustomer = MOCK_CUSTOMERS.find(
    (c) => c.id === selectedCustomerId
  );

  useEffect(() => {
    if (selectedAssessment) {
      setSelectedCustomerId(selectedAssessment.customerId);
    } else if (selectedContract) {
      setSelectedCustomerId(selectedContract.customerId);
    }
  }, [selectedAssessment, selectedContract]);

  // Effect to manage workAreas based on selections
  useEffect(() => {
    if (selectedAssessment) {
      const newWorkAreas = selectedAssessment.workAreas.map((asmArea) => {
        let serviceDesc = asmArea.serviceType.join(', ');
        if (asmArea.packageId) {
          const pkg = productMap.get(asmArea.packageId);
          if (pkg) serviceDesc = `${pkg.name} (${serviceDesc})`;
        }
        return {
          id: asmArea.id,
          name: asmArea.name,
          servicePackage: serviceDesc,
        };
      });
      setWorkAreas(newWorkAreas);
    } else if (selectedContract) {
      setWorkAreas([
        {
          id: `area-${Date.now()}`,
          name: 'พื้นที่ตามสัญญา',
          servicePackage: selectedContract.servicePackage,
        },
      ]);
    } else if (selectedCustomerId) {
      // Customer selected, but no reference
      if (workAreas.length === 0) {
        setWorkAreas([
          { id: `area-${Date.now()}`, name: 'พื้นที่ 1', servicePackage: '' },
        ]);
      }
    } else {
      // Nothing selected
      setWorkAreas([]);
    }
  }, [selectedAssessment, selectedContract, selectedCustomerId, productMap]);

  useEffect(() => {
    let details = '';
    if (selectedAssessment) {
      details += '**สรุปจากใบประเมิน:**\n\n';
      selectedAssessment.workAreas.forEach((area, index) => {
        details += `**พื้นที่ #${index + 1}: ${area.name}**\n`;
        details += `- ประเภทบริการ: ${area.serviceType.join(', ')}\n`;
        if (area.buildingType)
          details += `- ประเภทสิ่งปลูกสร้าง: ${area.buildingType}\n`;
        if (area.areaSize) details += `- ขนาดพื้นที่: ${area.areaSize} ตร.ม.\n`;
        if (area.serviceSystem)
          details += `- ระบบที่ใช้: ${area.serviceSystem}\n`;
        if (area.packageId) {
          const pkg = productMap.get(area.packageId);
          if (pkg) details += `- แพ็กเกจ: ${pkg.name}\n`;
        }
        if (area.items && area.items.length > 0) {
          details += `- สินค้า/บริการเพิ่มเติม:\n`;
          area.items.forEach((item) => {
            const product = productMap.get(item.productId!);
            details += `  - ${product?.name || 'N/A'} (จำนวน: ${item.quantity})\n`;
          });
        }
        details += '\n';
      });
      if (selectedAssessment.paymentConditions) {
        details += `**เงื่อนไขการชำระเงิน:**\n- ${selectedAssessment.paymentConditions}\n\n`;
      }
    } else if (selectedContract) {
      details += '**สรุปจากสัญญา:**\n\n';
      details += `- แพ็กเกจบริการ: ${selectedContract.servicePackage}\n\n`;
    }

    if (details) {
      details += '--- \n**หมายเหตุเพิ่มเติม:**\n';
    }
    setOperationDetails(details);
  }, [selectedAssessment, selectedContract, productMap]);

  const bookedSlots = useMemo(() => {
    if (!selectedVehicleId || !workDate) return [];
    return jobs
      .filter(
        (job) =>
          job.vehicleId === selectedVehicleId &&
          new Date(job.startTime).toISOString().substring(0, 10) === workDate
      )
      .map((job) => ({
        start: new Date(job.startTime).toTimeString().substring(0, 5),
        end: new Date(job.endTime).toTimeString().substring(0, 5),
        customer: job.customerName,
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [selectedVehicleId, workDate, jobs]);

  useEffect(() => {
    if (!selectedVehicleId || !workDate || !startTime || !endTime) {
      setTimeConflictError(null);
      return;
    }

    const newJobStart = new Date(`${workDate}T${startTime}`);
    const newJobEnd = new Date(`${workDate}T${endTime}`);

    if (newJobEnd <= newJobStart) {
      setTimeConflictError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น');
      return;
    }

    const conflictingJob = jobs.find((job) => {
      if (job.vehicleId !== selectedVehicleId) return false;

      const existingJobStart = new Date(job.startTime);
      const existingJobEnd = new Date(job.endTime);

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
  }, [selectedVehicleId, workDate, startTime, endTime, jobs]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedReference('');
      setSelectedCustomerId('');
      setLeadTechnicianId('');
      setSelectedTechnicianIds([]);
      setWorkDate('');
      setStartTime('');
      setEndTime('');
      setSelectedVehicleId('');
      setTimeConflictError(null);
      setWorkAreas([]);
      setOperationDetails('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && initialContractId) {
      setSelectedReference(`con-${initialContractId}`);
    }
  }, [isOpen, initialContractId]);

  useEffect(() => {
    if (isOpen && initialWorkDateIso) {
      const d = new Date(initialWorkDateIso);
      const ymd = d.toISOString().substring(0, 10);
      setWorkDate(ymd);
      const hhmm = d.toTimeString().substring(0, 5);
      if (hhmm !== '00:00') {
        setStartTime(hhmm);
        const end = new Date(d.getTime() + 2 * 60 * 60 * 1000);
        setEndTime(end.toTimeString().substring(0, 5));
      } else {
        setStartTime('09:00');
        setEndTime('11:00');
      }
    }
  }, [isOpen, initialWorkDateIso]);

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSelectedReference('');
    setWorkAreas([]); // Reset work areas when customer changes
  };

  const handleReferenceChange = (reference: string) => {
    setSelectedReference(reference);
  };

  const createJobObject = (status: Status): Omit<FieldJob, 'id'> | null => {
    if (
      !selectedCustomer ||
      !workDate ||
      !startTime ||
      !endTime ||
      workAreas.length === 0 ||
      !leadTechnicianId
    )
      return null;

    // Default to customer's address details
    let address = selectedCustomer.address
      ? `${selectedCustomer.address.street}, ${selectedCustomer.address.subdistrict}, ${selectedCustomer.address.district}, ${selectedCustomer.address.province} ${selectedCustomer.address.postalcode}`
      : '';
    let googleMapLink = selectedCustomer.googleMapLink;
    let zone = selectedCustomer.address.zone;
    let group = selectedCustomer.address.group;
    let roadLine = selectedCustomer.address.roadLine;
    let sequence = selectedCustomer.address.sequence;

    // Override with more specific info if available
    if (selectedAssessment) {
      address = `${selectedAssessment.address}, ${selectedAssessment.subdistrict}, ${selectedAssessment.district}, ${selectedAssessment.province} ${selectedAssessment.postalCode}`;
      googleMapLink = selectedAssessment.googleMapLink || googleMapLink;
      zone = selectedAssessment.zone || zone;
      group = selectedAssessment.group || group;
      roadLine = selectedAssessment.roadLine || roadLine;
      sequence = selectedAssessment.sequence || sequence;
    } else if (selectedContract) {
      address = selectedContract.address;
    }

    const startDateTime = new Date(`${workDate}T${startTime}`).toISOString();
    const endDateTime = new Date(`${workDate}T${endTime}`).toISOString();

    const allTechnicianIds = [leadTechnicianId, ...selectedTechnicianIds];
    const uniqueTechnicianIds = [...new Set(allTechnicianIds)];
    const assignedTechnicians = users.filter((u) =>
      uniqueTechnicianIds.includes(u.id)
    );

    return {
      assessmentId: selectedAssessment?.id,
      contractId: selectedContract?.id,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      address: address,
      googleMapLink: googleMapLink,
      zone,
      group,
      roadLine,
      sequence,
      startTime: startDateTime,
      endTime: endDateTime,
      technicians: assignedTechnicians,
      workAreas: workAreas as FieldJobWorkArea[],
      status: status,
      vehicleId: selectedVehicleId,
      operationDetails: operationDetails,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeConflictError) return;
    if (!leadTechnicianId) {
      alert('กรุณาเลือกหัวหน้าช่าง');
      return;
    }
    const jobData = createJobObject(Status.Planned);
    if (jobData) {
      onCreateJob(jobData, isAssessment ? jobData.assessmentId : undefined);
      onClose();
    }
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

  const additionalTechnicians = technicians.filter(
    (tech) => tech.id !== leadTechnicianId
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างงานภาคสนามใหม่"
      size="5xl"
      footer={
        <div className="flex gap-2">
          <Button type="button" onClick={onClose} variant="secondary">
            ยกเลิก
          </Button>
          <Button
            type="submit"
            form="add-job-form"
            variant="primary"
            disabled={!!timeConflictError}
          >
            บันทึก
          </Button>
        </div>
      }
    >
      <form id="add-job-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4 mb-4">
          <FormField label="วันที่ปฏิบัติงาน" htmlFor="work-date">
            <Input
              id="work-date"
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              required
            />
          </FormField>
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

        {bookedSlots.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm mb-4">
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
          <FormField label="เลือกลูกค้า" htmlFor="customer-select">
            <Select
              id="customer-select"
              value={selectedCustomerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              required
            >
              <option value="">-- เลือกลูกค้า --</option>
              {MOCK_CUSTOMERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="หรือ อ้างอิง (ใบประเมิน/สัญญา)"
            htmlFor="reference-select"
          >
            <Select
              id="reference-select"
              value={selectedReference}
              onChange={(e) => handleReferenceChange(e.target.value)}
              disabled={!selectedCustomerId}
            >
              <option value="">-- ไม่เลือกรายการอ้างอิง --</option>
              {availableAssessments.length > 0 && (
                <optgroup label="ใบประเมิน">
                  {availableAssessments.map((a) => (
                    <option key={`asm-${a.id}`} value={`asm-${a.id}`}>
                      {a.id} -{' '}
                      {a.workAreas[0]
                        ? a.workAreas[0].serviceType.join(', ')
                        : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {availableContracts.length > 0 && (
                <optgroup label="สัญญา">
                  {availableContracts.map((c) => (
                    <option key={`con-${c.id}`} value={`con-${c.id}`}>
                      {c.id} - {c.servicePackage}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          </FormField>
        </div>

        {workAreas.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">
              รายละเอียดพื้นที่บริการ
            </h3>
            {selectedReference ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                ข้อมูลพื้นที่ถูกดึงมาจาก {isAssessment ? 'ใบประเมิน' : 'สัญญา'}{' '}
                เลขที่:{' '}
                <strong>
                  {selectedAssessment?.id || selectedContract?.id}
                </strong>
              </div>
            ) : (
              selectedCustomerId && (
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
              )
            )}
            {workAreas.map((area, index) => (
              <JobWorkAreaForm
                key={area.id || index}
                area={area}
                index={index}
                onAreaChange={handleAreaChange}
                onClearArea={handleClearArea}
                isReadOnly={!!selectedReference}
              />
            ))}
          </div>
        )}

        <FormField label="รายละเอียดการปฏิบัติงาน" htmlFor="operation-details">
          <Textarea
            id="operation-details"
            name="operationDetails"
            value={operationDetails}
            onChange={(e) => setOperationDetails(e.target.value)}
            placeholder="รายละเอียดจากใบประเมิน/สัญญาจะแสดงที่นี่ สามารถเพิ่มหมายเหตุเพิ่มเติมได้"
            rows={8}
          />
        </FormField>

        <FormField label="เลือกรถที่ปฏิบัติงาน" htmlFor="vehicle-select">
          <Select
            id="vehicle-select"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
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

        {timeConflictError && (
          <p className="text-sm text-red-600 -mt-2">{timeConflictError}</p>
        )}

        <FormField label="หัวหน้าช่าง" htmlFor="lead-technician-select">
          <Select
            id="lead-technician-select"
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
