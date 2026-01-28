import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import {
  FormField,
  Input,
  Select,
  Textarea,
  Button,
} from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { User } from '@/src/types/entity/core.interface';
import {
  Job,
  TeamMember,
  ServiceSystem,
} from '@/src/types/entity/job.interface';
import { Assessment } from '@/src/types/entity/assessment.interface';
import { Contract } from '@/src/types/entity/financial.interface';
import { Customer } from '@/src/types/entity/customer.interface';
import { Warehouse } from '@/src/types/entity/inventory.interface';
import { JobMainStatus } from '@/src/types/enums/job';
import { RefreshIcon } from '../../../assets/icons/Icons';
import { JobApi, WarehouseApi, UserApi, CustomerApi } from '@/src/api';
import { AsessmentStatus, Role, WarehouseType } from '@/src/types';
import { UserRole } from '@/src/types/entity/core.interface';

// A component to manage a single work area within the job form
const JobWorkAreaForm: React.FC<{
  area: any;
  index: number;
  onAreaChange: (index: number, updatedArea: Partial<Job>) => void;
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
  onCreateJob: (jobData: Omit<Job, 'id'> | any, assessmentId?: string) => void | Promise<void>;
  warehouses: Warehouse[];
  initialContractId?: string;
  initialWorkDateIso?: string;
  contracts: Contract[];
  jobs: any[];
  users: User[];
}

export const AddJobModal: React.FC<AddJobModalProps> = ({
  isOpen,
  onClose,
  contracts,
  onCreateJob,
  jobs,
  users,
  warehouses: initialWarehouses,
  initialContractId,
  initialWorkDateIso,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedReference, setSelectedReference] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null);
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
  const [workAreas, setWorkAreas] = useState<Partial<any>[]>([]);
  const [operationDetails, setOperationDetails] = useState('');
  const [serviceSystem, setServiceSystem] = useState<string>('');

  const [customerSearch, setCustomerSearch] = useState('');
  const [referenceSearch, setReferenceSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleOptions, setVehicleOptions] =
    useState<Warehouse[]>(initialWarehouses);

  const [leadTechSearch, setLeadTechSearch] = useState('');
  const [leadTechnicianOptions, setLeadTechnicianOptions] = useState<User[]>(
    users.filter((u) => u.role === UserRole.Technician)
  );

  const [additionalTechSearch, setAdditionalTechSearch] = useState('');
  const [additionalTechnicianOptions, setAdditionalTechnicianOptions] =
    useState<User[]>(users.filter((u) => u.role === UserRole.Technician));

  const fetchCustomers = async (search: string) => {
    try {
      const response = await CustomerApi.getCustomersService({
        limit: 10,
        search: search,
      });
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isOpen) {
        fetchCustomers(customerSearch);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [customerSearch, isOpen]);

  const fetchVehicles = async (search: string) => {
    try {
      const response = await WarehouseApi.getWarehouses({
        limit: 10,
        search: search,
        type: WarehouseType.VEHICLE,
      });
      const vehicles = response.data.filter((w) => w.type === 'VEHICLE');
      setVehicleOptions(vehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchLeadTechnicians = async (search: string) => {
    try {
      const response = await UserApi.getAll({
        limit: 10,
        search: search,
        role: Role.LEAD_TECH,
      });
      setLeadTechnicianOptions(response.data);
    } catch (error) {
      console.error('Error fetching lead technicians:', error);
    }
  };

  const fetchAdditionalTechnicians = async (search: string) => {
    try {
      const response = await UserApi.getAll({
        limit: 10,
        search: search,
        role: Role.TECH,
      });
      setAdditionalTechnicianOptions(response.data);
    } catch (error) {
      console.error('Error fetching additional technicians:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isOpen) {
        fetchVehicles(vehicleSearch);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [vehicleSearch, isOpen]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isOpen) {
        fetchLeadTechnicians(leadTechSearch);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [leadTechSearch, isOpen]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isOpen) {
        fetchAdditionalTechnicians(additionalTechSearch);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [additionalTechSearch, isOpen]);

  // Use vehicleOptions for display instead of just initialWarehouses filtering
  const vehicleWarehouses = useMemo(() => vehicleOptions, [vehicleOptions]);

  const filteredCustomers = useMemo(() => {
    if (
      selectedCustomerData &&
      !customers.find((c) => c.id === selectedCustomerData.id)
    ) {
      return [selectedCustomerData, ...customers];
    }
    return customers;
  }, [customers, selectedCustomerData]);

  const filteredVehicles = useMemo(() => {
    return vehicleWarehouses.map((v) => ({
      value: v.id,
      label: `${v.name} (${(v as any).license_plate || '-'})`,
    }));
  }, [vehicleWarehouses]);

  const isAssessment = selectedReference.startsWith('asm-');

  const availableAssessments = useMemo(() => {
    if (selectedCustomerId) {
      const customer =
        customers.find((c) => c.id === selectedCustomerId) ||
        (selectedCustomerData?.id === selectedCustomerId
          ? selectedCustomerData
          : undefined);
      if (customer?.assessments) {
        return customer.assessments.filter(
          (a) => a.status === AsessmentStatus.DRAFT || a.status === AsessmentStatus.COMPLETE
        );
      } 
    }
    return [];
  }, [customers, selectedCustomerId, selectedCustomerData]);

  const availableContracts = useMemo(() => {
    if (selectedCustomerId) {
      const customer =
        customers.find((c) => c.id === selectedCustomerId) ||
        (selectedCustomerData?.id === selectedCustomerId
          ? selectedCustomerData
          : undefined);
      if (customer?.contracts) {
        return customer.contracts.filter(
          (a) =>
            a.status === AsessmentStatus.DRAFT ||
            a.status === AsessmentStatus.COMPLETE
        );
      }
    }
    return [];
  }, [customers, selectedCustomerId, selectedCustomerData]);

  const filteredReferences = useMemo(() => {
    const refs = [
      ...availableAssessments.map((a) => ({
        value: `asm-${a.id}`,
        label: `ใบประเมิน: ${a.code}`,
      })),
      ...availableContracts.map((c) => ({
        value: `cnt-${c.id}`,
        label: `สัญญา: ${c.code}`,
      })),
    ];

    if (!referenceSearch) return refs;
    const lower = referenceSearch.toLowerCase();
    return refs.filter((r) => r.label.toLowerCase().includes(lower));
  }, [availableAssessments, availableContracts, referenceSearch]);


  const bookedSlots = useMemo(() => {
    if (!selectedVehicleId || !workDate) return [];
    return jobs
      .filter(
        (job) =>
          job.vehicle_id === selectedVehicleId &&
          new Date(job.start_time).toISOString().substring(0, 10) === workDate
      )
      .map((job) => ({
        start: new Date(job.start_time).toTimeString().substring(0, 5),
        end: new Date(job.end_time).toTimeString().substring(0, 5),
        customer: job.customer_name,
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [selectedVehicleId, workDate, jobs]);

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
      setWorkAreas([]);
      setOperationDetails('');
      setServiceSystem('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && initialContractId) {
      setSelectedReference(initialContractId);
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

  const handleCustomerChange = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomerData(customer);
    }
    setSelectedReference('');
    setWorkAreas([]); 

    if (customerId) {
      try {
        const fullCustomer = await CustomerApi.getCustomerById(customerId);
        setSelectedCustomerData(fullCustomer);
      } catch (error) {
        console.error('Error fetching full customer details:', error);
      }
    } else {
      setSelectedCustomerData(null);
    }
  };

  const handleReferenceChange = (reference: string) => {
    setSelectedReference(reference);
  };

  const createJobObject = (status: JobMainStatus): any => {
    const startDateTime = new Date(`${workDate}T${startTime}`).toISOString();
    const endDateTime = new Date(`${workDate}T${endTime}`).toISOString();

    const allTechnicianIds = [leadTechnicianId, ...selectedTechnicianIds];
    const uniqueTechnicianIds = [...new Set(allTechnicianIds)];

    let assessmentId = '';
    let contractId = '';

    if (selectedReference.startsWith('asm-')) {
      assessmentId = selectedReference.replace('asm-', '');
    } else if (selectedReference.startsWith('cnt-')) {
      contractId = selectedReference.replace('cnt-', '');
    }

    return {
      assessment_id: assessmentId || undefined,
      contract_id: contractId || undefined,
      customer_id: selectedCustomerId,
      primary_tech_id: leadTechnicianId,
      start_date: new Date(startDateTime),
      end_date: new Date(endDateTime),
      service_system: serviceSystem,
      remark: operationDetails,
      vehicle_id: selectedVehicleId,
      status,
      team_member: uniqueTechnicianIds.map((uid) => ({
        user_id: uid,
        check_in: null as any,
        check_out: null as any,
      })),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeConflictError) return;
    if (!leadTechnicianId) {
      alert('กรุณาเลือกหัวหน้าช่าง');
      return;
    }
    const jobData = createJobObject(JobMainStatus.PENDING);
    if (jobData) {
      try {
        await onCreateJob(jobData, jobData.assessment_id);
        onClose();
      } catch (error) {
        console.error('Error creating job:', error);
      }
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
    updatedArea: Partial<Job>
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

  const getTechnicianName = (tech: User | any) => {
    if (tech.name) return tech.name;
    if (tech.first_name)
      return `${tech.first_name} ${tech.last_name || ''}`.trim();
    return tech.username || tech.email || tech.phone || 'Unknown';
  };

  const additionalTechnicians = useMemo(
    () =>
      additionalTechnicianOptions.filter(
        (tech) => tech.id !== leadTechnicianId
      ),
    [additionalTechnicianOptions, leadTechnicianId]
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
          <div className="mb-4">
            <SearchableSelect
              label="เลือกลูกค้า"
              options={filteredCustomers.map((c) => ({
                value: c.id,
                label: `${c.first_name} ${c.last_name} ${c.nickname ? `(${c.nickname})` : ''}`,
                description: c.phone || '',
              }))}
              value={selectedCustomerId}
              onChange={handleCustomerChange}
              onSearchChange={setCustomerSearch}
              placeholder="ค้นหาลูกค้า..."
              required
            />
          </div>
          <div className="mb-4">
            <SearchableSelect
              label="หรือ อ้างอิง (ใบประเมิน/สัญญา)"
              options={filteredReferences}
              value={selectedReference}
              onChange={handleReferenceChange}
              onSearchChange={setReferenceSearch}
              placeholder={
                selectedCustomerId
                  ? 'เลือกรายการอ้างอิง...'
                  : 'กรุณาเลือกลูกค้าก่อน'
              }
              className={
                !selectedCustomerId ? 'opacity-50 pointer-events-none' : ''
              }
            />
          </div>
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
                  {selectedReference}
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

        <FormField label="ระบบบริการ" htmlFor="service-system">
          <Select
            id="service-system"
            value={serviceSystem}
            onChange={(e) => setServiceSystem(e.target.value)}
          >
            <option value="" disabled>
              -- เลือกระบบบริการ --
            </option>
            {Object.values(ServiceSystem).map((sys) => (
              <option key={sys} value={sys}>
                {sys === ServiceSystem.CHEMICAL ? 'สารเคมีขีวภาพ' : 'เหยื่อ'}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="mb-4">
          <SearchableSelect
            label="เลือกรถที่ปฏิบัติงาน"
            options={filteredVehicles}
            value={selectedVehicleId}
            onChange={setSelectedVehicleId}
            onSearchChange={setVehicleSearch}
            placeholder="ค้นหารถบริการ..."
            required
          />
        </div>

        {timeConflictError && (
          <p className="text-sm text-red-600 -mt-2">{timeConflictError}</p>
        )}

        <div className="mb-4">
          <SearchableSelect
            label="หัวหน้าช่าง *"
            name="primary_tech_id"
            options={leadTechnicianOptions.map((tech) => ({
              value: tech.id,
              label: `${getTechnicianName(tech)}`,
              description: tech.phone || '',
            }))}
            value={leadTechnicianId}
            onChange={handleLeadTechnicianChange}
            onSearchChange={setLeadTechSearch}
            placeholder="ค้นหาหัวหน้าช่าง..."
            required
          />
        </div>

        <FormField label="ช่างเทคนิคเพิ่มเติม (ถ้ามี)">
          <div className="mb-2">
            <Input
              placeholder="ค้นหาช่างเพิ่มเติม..."
              value={additionalTechSearch}
              onChange={(e) => setAdditionalTechSearch(e.target.value)}
            />
          </div>
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
                <span className="text-slate-800">
                  {getTechnicianName(tech)}
                </span>
              </label>
            ))}
          </div>
        </FormField>
      </form>
    </Modal>
  );
};
