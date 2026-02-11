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
  ServiceSystem,
} from '@/src/types/entity/job.interface';
import { Contract } from '@/src/types/entity/financial.interface';
import { Customer } from '@/src/types/entity/customer.interface';
import { Warehouse } from '@/src/types/entity/inventory.interface';
import { JobMainStatus } from '@/src/types/enums/job';
import { RefreshIcon, UserIcon, CalendarIcon, TruckIcon, DocumentIcon, CheckCircleIcon, PhoneIcon, MapPinIcon, ClockIcon, ArrowLeftIcon, ArrowRightIcon } from '../../../assets/icons/Icons';
import { AssessmentApi, ContractApi, CustomerApi, WarehouseApi, UserApi, InvoiceApi } from '@/src/api';
import { AsessmentStatus, Role, WarehouseType } from '@/src/types';
import { UserRole } from '@/src/types/entity/core.interface';
import { Assessment } from '@/src/types/entity/app.interface';
import { Invoice } from '@/src/types/entity/financial.interface';

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
    <div className="border border-slate-200 p-4 rounded-lg space-y-4 bg-white shadow-sm relative transition-all hover:shadow-md">
      <div className="absolute -top-3 left-3 bg-slate-100 px-2 text-xs font-semibold text-slate-500 rounded-full border border-slate-200">
        พื้นที่ #{index + 1}
      </div>
      {!isReadOnly && (
        <button
          type="button"
          onClick={() => onClearArea(index)}
          className="absolute top-2 right-2 flex items-center gap-1 text-slate-400 hover:text-red-500 py-1 px-2 rounded-md hover:bg-red-50 text-xs transition-colors"
          title="ล้างค่าในพื้นที่นี้"
        >
          <RefreshIcon className="h-3 w-3" />
          <span>ล้างค่า</span>
        </button>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <FormField
          label="ชื่อพื้นที่"
          htmlFor={`areaName-${index}`}
          className="mb-0"
        >
          <Input
            name="name"
            value={area.name || ''}
            onChange={handleFieldChange}
            placeholder="เช่น ชั้น 1, โซน A"
            required
            readOnly={isReadOnly}
            className="bg-slate-50 focus:bg-white"
          />
        </FormField>
        <FormField
          label="แพ็กเกจ/ประเภทบริการ"
          htmlFor={`servicePackage-${index}`}
          className="mb-0"
        >
          <Input
            name="service_package"
            value={area.service_package || ''}
            onChange={handleFieldChange}
            placeholder="ระบุประเภทบริการ"
            readOnly={isReadOnly}
            className="bg-slate-50 focus:bg-white"
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
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([0]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedReference, setSelectedReference] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null);
  
  // Explicitly fetch assessments and contracts
  const [fetchedAssessments, setFetchedAssessments] = useState<Assessment[]>([]);
  const [fetchedContracts, setFetchedContracts] = useState<Contract[]>([]);
  const [fetchedInvoices, setFetchedInvoices] = useState<Invoice[]>([]);

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
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleOptions, setVehicleOptions] =
    useState<Warehouse[]>(initialWarehouses);

  const [leadTechSearch, setLeadTechSearch] = useState('');
  const [leadTechnicianOptions, setLeadTechnicianOptions] = useState<User[]>(
    users.filter((u) => {
      const roleName = typeof u.role === 'object' && u.role ? (u.role as any).name : u.role;
      return roleName === UserRole.TECH;
    })
  );

  const [additionalTechSearch, setAdditionalTechSearch] = useState('');
  const [additionalTechnicianOptions, setAdditionalTechnicianOptions] =
    useState<User[]>(users.filter((u) => {
      const roleName = typeof u.role === 'object' && u.role ? (u.role as any).name : u.role;
      return roleName === UserRole.TECH;
    }));

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
    // Prefer fetched assessments if available
    if (fetchedAssessments.length > 0) {
      return fetchedAssessments.filter(
        (a) => a.status === AsessmentStatus.DRAFT || a.status === AsessmentStatus.COMPLETE || a.status === AsessmentStatus.APPOINTMENT
      );
    }

    if (selectedCustomerId) {
      const customer =
        (selectedCustomerData?.id === selectedCustomerId
          ? selectedCustomerData
          : undefined) ||
        customers.find((c) => c.id === selectedCustomerId);

      if (customer?.assessments) {
        return customer.assessments.filter(
          (a) => a.status === AsessmentStatus.DRAFT || a.status === AsessmentStatus.COMPLETE || a.status === AsessmentStatus.APPOINTMENT
        );
      }
    }
    return [];
  }, [customers, selectedCustomerId, selectedCustomerData, fetchedAssessments]);

  const availableContracts = useMemo(() => {
    // Prefer fetched contracts if available
    if (fetchedContracts.length > 0) {
      return fetchedContracts.filter(
        (a) =>
          (a.status as any) === AsessmentStatus.DRAFT ||
          (a.status as any) === AsessmentStatus.COMPLETE ||
          (a.status as any) === 'ACTIVE'
      );
    }

    if (selectedCustomerId) {
      const customer =
        (selectedCustomerData?.id === selectedCustomerId
          ? selectedCustomerData
          : undefined) ||
        customers.find((c) => c.id === selectedCustomerId);

      if (customer?.contracts) {
        return customer.contracts.filter(
          (a) =>
            (a.status as any) === AsessmentStatus.DRAFT ||
            (a.status as any) === AsessmentStatus.COMPLETE ||
            (a.status as any) === 'ACTIVE'
        );
      }
    }
    return [];
  }, [customers, selectedCustomerId, selectedCustomerData, fetchedContracts]);

  const availableInvoices = useMemo(() => {
    if (fetchedInvoices.length > 0) {
      return fetchedInvoices;
    }
    return [];
  }, [fetchedInvoices]);

  const filteredInvoices = useMemo(() => {
    const refs = availableInvoices.map((inv) => ({
      value: inv.id,
      label: `ใบแจ้งหนี้: ${inv.code}`,
    }));

    if (!invoiceSearch) return refs;
    const lower = invoiceSearch.toLowerCase();
    return refs.filter((r) => r.label.toLowerCase().includes(lower));
  }, [availableInvoices, invoiceSearch]);

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
      setSelectedInvoiceId('');
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
      setCurrentStep(0);
      setVisitedSteps([0]);
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
    
    // Clear previous fetched data
    setFetchedAssessments([]);
    setFetchedContracts([]);

    if (customerId) {
      try {
        // Fetch full customer details
        const fullCustomer = await CustomerApi.getCustomerById(customerId);
        if (fullCustomer) {
             // Handle potential API response wrapper
             const customerData = (fullCustomer as any).data || fullCustomer;
             setSelectedCustomerData(customerData);
        }
        
        // Parallel fetch for assessments and contracts
        Promise.all([
          AssessmentApi.getAll({ customer_id: customerId }),
          ContractApi.getAll({ customer_id: customerId }),
          InvoiceApi.getAll({ customer_id: customerId })
        ]).then(([assessmentRes, contractRes, invoiceRes]) => {
          setFetchedAssessments(assessmentRes.data || []);
          setFetchedContracts(contractRes.data || []);
          setFetchedInvoices(invoiceRes.data || []);
        }).catch(err => {
          console.error('Error fetching customer documents:', err);
        });

      } catch (error) {
        console.error('Error fetching full customer details:', error);
      }
    } else {
      setSelectedCustomerData(null);
    }
  };

  const handleReferenceChange = async (reference: string) => {
    setSelectedReference(reference);

    if (reference.startsWith('asm-')) {
      const assessmentId = reference.replace('asm-', '');
      const assessment = availableAssessments.find((a) => a.id === assessmentId);
      if (assessment && assessment.assessment_areas && assessment.assessment_areas.length > 0) {
        // Auto-populate service system from the first area of the assessment
        const system = assessment.assessment_areas[0].service_system;
        if (system) {
          setServiceSystem(system);
        }
        
        // Populate work areas
        const areas = assessment.assessment_areas.map((area, index) => ({
           id: `area-${Date.now()}-${index}`,
           name: area.area_name,
           service_package: area.service_system || ''
        }));
        setWorkAreas(areas);
      }
    }
  };

  const handleInvoiceChange = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);

    // If no reference is selected, try to populate areas from invoice
    if (!selectedReference && invoiceId) {
      try {
        const invoice = await InvoiceApi.getById(invoiceId);
        if (invoice && invoice.items && invoice.items.length > 0) {
           // Populate work areas from invoice items
           const areas = invoice.items.map((item: any, index: number) => ({
             id: `area-${Date.now()}-${index}`,
             name: item.description,
             service_package: item.product?.name || ''
           }));
           setWorkAreas(areas);
        }
      } catch (error) {
        console.error('Error fetching invoice details:', error);
      }
    }
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
      invoice_id: selectedInvoiceId || undefined,
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
      setCurrentStep(2);
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

  const steps = [
    {
      id: 0,
      label: 'ข้อมูลลูกค้า & กำหนดการ',
      icon: <UserIcon className="w-5 h-5" />,
      isValid: !!selectedCustomerId && !!workDate && !!startTime && !!endTime
    },
    {
      id: 1,
      label: 'รายละเอียดบริการ',
      icon: <DocumentIcon className="w-5 h-5" />,
      isValid: !!serviceSystem
    },
    {
      id: 2,
      label: 'ทีมช่าง & ยานพาหนะ',
      icon: <TruckIcon className="w-5 h-5" />,
      isValid: !!leadTechnicianId && !!selectedVehicleId && !timeConflictError
    },
  ];

  const handleNextStep = () => {
    if (steps[currentStep].isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      setVisitedSteps((prev) => [...new Set([...prev, currentStep + 1])]);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างงานภาคสนามใหม่"
      size="5xl"
      footer={
        <div className="flex justify-between items-center w-full px-2">
          {/* Left: Step Indicator */}
          <div className="text-slate-500 font-medium">
             ขั้นตอนที่ {currentStep + 1} จาก {steps.length}
          </div>

          {/* Right: Navigation Buttons */}
          <div className="flex gap-3">
             {currentStep > 0 && (
              <Button
                type="button"
                onClick={handlePrevStep}
                variant="outline"
                className="px-6 !h-10 border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 text-base font-bold rounded-lg"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                ย้อนกลับ
              </Button>
            )}

            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                variant="primary"
                disabled={!steps[currentStep].isValid}
                className="px-8 !h-10 bg-green-600 hover:bg-green-700 text-white border-transparent flex items-center justify-center gap-2 shadow-md text-lg font-bold rounded-xl"
              >
                ถัดไป
                <ArrowRightIcon className="w-4 h-4 stroke-[2] mt-0.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                form="add-job-form"
                variant="primary"
                disabled={!steps[currentStep].isValid || !!timeConflictError}
                className="px-8 !h-10 bg-green-600 hover:bg-green-700 text-white border-transparent flex items-center justify-center gap-2 shadow-md text-lg font-bold rounded-xl"
              >
                บันทึกงาน
                <CheckCircleIcon className="w-4 h-4 stroke-[2] mt-0.5" />
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="mb-8">
        <div className="relative after:absolute after:inset-x-0 after:top-1/2 after:block after:h-0.5 after:-translate-y-1/2 after:rounded-lg after:bg-slate-100">
          <ol className="relative z-10 flex justify-between text-sm font-medium text-slate-500">
            {steps.map((step, index) => {
              const isCompleted = visitedSteps.includes(index) && step.isValid;
              const isCurrent = currentStep === index;
              
              return (
                <li key={step.id} className="flex items-center gap-2 bg-white p-2">
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCurrent
                        ? 'border-primary bg-primary text-white'
                        : isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    {isCompleted && !isCurrent ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-bold">{index + 1}</span>
                    )}
                  </span>
                  <span className={`${isCurrent ? 'text-primary font-bold' : isCompleted ? 'text-green-600' : 'text-slate-500'}`}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <form id="add-job-form" onSubmit={handleSubmit} className="space-y-6">
        
        {/* STEP 0: Customer & Schedule */}
        <div className={currentStep === 0 ? 'block animate-fadeIn' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Customer Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  ข้อมูลลูกค้า
                </h3>
                
                <div className="space-y-6 flex-1 flex flex-col">
                  <SearchableSelect
                    label="ค้นหาลูกค้า"
                    options={filteredCustomers.map((c) => ({
                      value: c.id,
                      label: `${c.first_name} ${c.last_name} ${c.nickname ? `(${c.nickname})` : ''}`,
                      description: c.phone || '',
                    }))}
                    value={selectedCustomerId}
                    onChange={handleCustomerChange}
                    onSearchChange={setCustomerSearch}
                    placeholder="พิมพ์ชื่อ, เบอร์โทร หรือที่อยู่..."
                    required
                  />

                  {selectedCustomerData ? (
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-700 shadow-sm">
                              {selectedCustomerData.first_name?.[0]}
                           </div>
                           <div>
                              <h4 className="text-base font-bold text-slate-800">
                                {selectedCustomerData.first_name} {selectedCustomerData.last_name}
                              </h4>
                              {selectedCustomerData.nickname && (
                                <span className="text-xs text-slate-500 font-medium bg-white px-2 py-0.5 rounded-full border border-slate-200 inline-block mt-1">
                                  ชื่อเล่น: {selectedCustomerData.nickname}
                                </span>
                              )}
                           </div>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        {selectedCustomerData.phone && (
                          <div className="flex items-center gap-3 text-sm text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                            <PhoneIcon className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">{selectedCustomerData.phone}</span>
                          </div>
                        )}
                        
                        <div className="flex items-start gap-3 text-sm text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                           <MapPinIcon className="w-4 h-4 text-slate-400 mt-0.5" />
                           <span className="leading-relaxed">
                              {[
                                selectedCustomerData.address_house_no,
                                selectedCustomerData.sub_district,
                                selectedCustomerData.district,
                                selectedCustomerData.province,
                                selectedCustomerData.postal_code
                              ].filter(Boolean).join(' ') || '-'}
                           </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center flex-1">
                       <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                          <UserIcon className="w-6 h-6 text-slate-300" />
                       </div>
                       <p className="text-slate-500 font-medium">กรุณาเลือกลูกค้า</p>
                       <p className="text-xs text-slate-400 mt-1">เพื่อดำเนินการต่อในขั้นตอนถัดไป</p>
                    </div>
                  )}
                </div>
            </div>

            {/* Schedule Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  กำหนดการปฏิบัติงาน
                </h3>
                
                <div className="space-y-6">
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                     <FormField label="วันที่ปฏิบัติงาน" htmlFor="work-date" className="mb-0">
                        <div className="relative">
                          <Input
                            id="work-date"
                            type="date"
                            value={workDate}
                            onChange={(e) => setWorkDate(e.target.value)}
                            required
                            className="pl-10 h-12"
                          />
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                     </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                        <FormField label="เวลาเริ่มต้น" htmlFor="start-time" className="mb-0">
                           <div className="relative">
                              <Input
                                id="start-time"
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                                className="pl-10 h-12 text-center font-medium"
                              />
                              <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                           </div>
                        </FormField>
                    </div>
                    
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                        <FormField label="เวลาสิ้นสุด" htmlFor="end-time" className="mb-0">
                           <div className="relative">
                              <Input
                                id="end-time"
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                required
                                className="pl-10 h-12 text-center font-medium"
                              />
                              <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                           </div>
                        </FormField>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>

        {/* STEP 1: Service Details */}
        <div className={currentStep === 1 ? 'block animate-fadeIn' : 'hidden'}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <SearchableSelect
                     label="อ้างอิง (ใบประเมิน/สัญญา)"
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
                   
                   <FormField label="ระบบที่ใช้บริการ" htmlFor="service-system">
                    <Select
                      id="service-system"
                      value={serviceSystem}
                      onChange={(e) => setServiceSystem(e.target.value)}
                      required
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

                  <SearchableSelect
                     label="อ้างอิงใบแจ้งหนี้ (ถ้ามี)"
                     options={filteredInvoices}
                     value={selectedInvoiceId}
                     onChange={handleInvoiceChange}
                     onSearchChange={setInvoiceSearch}
                     placeholder={
                       selectedCustomerId
                         ? 'เลือกใบแจ้งหนี้...'
                         : 'กรุณาเลือกลูกค้าก่อน'
                     }
                     className={
                       !selectedCustomerId ? 'opacity-50 pointer-events-none' : ''
                     }
                   />
               </div>

                <FormField label="รายละเอียดการปฏิบัติงาน" htmlFor="operation-details">
                  <Textarea
                    id="operation-details"
                    name="operationDetails"
                    value={operationDetails}
                    onChange={(e) => setOperationDetails(e.target.value)}
                    placeholder="รายละเอียดจากใบประเมิน/สัญญาจะแสดงที่นี่ สามารถเพิ่มหมายเหตุเพิ่มเติมได้"
                    rows={4}
                    className="bg-slate-50 focus:bg-white transition-colors h-full"
                  />
                </FormField>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-semibold text-slate-800">
                  รายละเอียดพื้นที่บริการ
                </h3>
                {(selectedReference || selectedInvoiceId) && (
                  <div className="flex flex-col gap-2 items-end">
                    {selectedReference && (
                      <div className="text-sm text-blue-600 font-medium px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                         อ้างอิง: {
                           isAssessment ? (availableAssessments.find(a => a.id === selectedReference.replace('asm-', ''))?.code || selectedReference) : 
                           (availableContracts.find(c => c.id === selectedReference.replace('cnt-', ''))?.code || selectedReference)
                         }
                      </div>
                    )}
                    {selectedInvoiceId && (
                      <div className="text-sm text-green-600 font-medium px-3 py-1 bg-green-50 rounded-full border border-green-100">
                         ใบแจ้งหนี้: {availableInvoices.find(inv => inv.id === selectedInvoiceId)?.code || selectedInvoiceId}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {(selectedReference || selectedInvoiceId) ? (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <DocumentIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">
                          ข้อมูลอ้างอิง
                        </p>
                        <div className="text-sm text-slate-500 flex flex-col">
                          {selectedReference && (
                            <span>
                              {isAssessment ? 'ใบประเมิน: ' : 'สัญญา: '}
                              {isAssessment ? (availableAssessments.find(a => a.id === selectedReference.replace('asm-', ''))?.code || selectedReference) : (availableContracts.find(c => c.id === selectedReference.replace('cnt-', ''))?.code || selectedReference)}
                            </span>
                          )}
                          {selectedInvoiceId && (
                            <span>
                              ใบแจ้งหนี้: {availableInvoices.find(inv => inv.id === selectedInvoiceId)?.code || selectedInvoiceId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isAssessment && availableAssessments.length > 0 && (
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {(() => {
                          const asmId = selectedReference.replace('asm-', '');
                          const asm = availableAssessments.find(a => a.id === asmId);
                          if (!asm) return null;

                          return (
                            <>
                              <div className="space-y-3 text-sm">
                                <h5 className="font-semibold text-slate-700 border-b pb-1 mb-2">ข้อมูลทั่วไป</h5>
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                  <span className="text-slate-500">ที่อยู่:</span>
                                  <span className="text-slate-800">
                                    {[asm.address, asm.sub_district, asm.district, asm.province, asm.zipcode].filter(Boolean).join(' ')}
                                  </span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                  <span className="text-slate-500">โซน/สาย:</span>
                                  <span className="text-slate-800">
                                    {asm.zone} / {asm.road_line} (Seq: {asm.sequence})
                                  </span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                  <span className="text-slate-500">วันนัดหมาย:</span>
                                  <span className="text-slate-800">
                                    {asm.appointment_date ? new Date(asm.appointment_date).toLocaleDateString('th-TH') : '-'}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-3 text-sm">
                                <h5 className="font-semibold text-slate-700 border-b pb-1 mb-2">เงื่อนไขการเงิน</h5>
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                  <span className="text-slate-500">การชำระเงิน:</span>
                                  <span className="text-slate-800">
                                    {asm.payment_condition === 'CASH' ? 'ชำระเต็มจำนวน' : 
                                     asm.payment_condition === 'INSTALLMENT' ? `แบ่งชำระ (${asm.payment_installment_count || '-'} งวด)` : 
                                     asm.payment_condition}
                                  </span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                  <span className="text-slate-500">ราคารวม:</span>
                                  <span className="font-bold text-primary">
                                    ฿{(asm.total_price || 0).toLocaleString()}
                                  </span>
                                </div>
                                {asm.google_map_link && (
                                  <div className="grid grid-cols-[100px_1fr] gap-2">
                                    <span className="text-slate-500">Google Map:</span>
                                    <a href={asm.google_map_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                                      เปิดแผนที่
                                    </a>
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <h4 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider flex items-center justify-between">
                        <span>พื้นที่บริการในเอกสาร</span>
                        <span className="text-xs font-normal normal-case bg-slate-100 px-2 py-1 rounded text-slate-500">
                          {(() => {
                             const asmId = selectedReference.replace('asm-', '');
                             const asm = availableAssessments.find(a => a.id === asmId);
                             return asm?.assessment_areas?.length || 0;
                          })()} พื้นที่
                        </span>
                      </h4>
                      <div className="space-y-4">
                        {(() => {
                          const asmId = selectedReference.replace('asm-', '');
                          const asm = availableAssessments.find(a => a.id === asmId);
                          if (!asm || !asm.assessment_areas) return <p className="text-slate-400 italic">ไม่พบข้อมูลพื้นที่</p>;
                          
                          return asm.assessment_areas.map((area, idx) => (
                            <div key={idx} className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                              <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="bg-white border border-slate-300 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-slate-600">
                                    {idx + 1}
                                  </span>
                                  <h5 className="font-semibold text-slate-800">{area.area_name}</h5>
                                </div>
                                <span className="text-xs font-medium px-2 py-1 bg-white border border-slate-200 rounded text-slate-600">
                                  {area.building_type}
                                </span>
                              </div>
                              
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                <div className="space-y-2">
                                  <div className="flex justify-between border-b border-slate-200 pb-1 mb-2">
                                    <span className="font-semibold text-slate-600">ข้อมูลพื้นที่</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">ขนาด:</span>
                                    <span className="font-medium">{area.area_size || '-'} ตร.ม.</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">ระบบ:</span>
                                    <span className="font-medium">
                                      {area.service_system === ServiceSystem.CHEMICAL ? 'สารเคมี' : 'เหยื่อ'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">ราคาบริการ:</span>
                                    <span className="font-medium">฿{(area.base_service_price || 0).toLocaleString()}</span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between border-b border-slate-200 pb-1 mb-2">
                                    <span className="font-semibold text-slate-600">รายละเอียดเพิ่มเติม</span>
                                  </div>
                                  
                                  {/* Products/Items used */}
                                  <div className="mb-2">
                                    <span className="text-slate-500 block mb-1 text-xs">สินค้า/อุปกรณ์ที่ใช้:</span>
                                    {area.items && area.items.length > 0 ? (
                                      <ul className="list-disc list-inside space-y-0.5">
                                        {area.items.map((item, i) => (
                                          <li key={i} className="text-slate-700 text-xs">
                                            {item.product_name} x {item.quantity}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <span className="text-slate-400 text-xs">- ไม่ระบุ -</span>
                                    )}
                                  </div>

                                  {/* Problems/Pests found */}
                                  <div>
                                    <span className="text-slate-500 block mb-1 text-xs">ปัญหาที่พบ:</span>
                                    {area.category_services && area.category_services.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {area.category_services.map((cat, i) => (
                                          <span key={i} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px]">
                                            {cat.name || 'Unknown'}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-xs">- ไม่ระบุ -</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Fallback info box */}
                  <div className="p-4 bg-blue-50 text-blue-800 text-sm border-t border-blue-100 flex items-start gap-2">
                    <span className="text-lg">ℹ️</span>
                    <p>
                      ข้อมูลพื้นที่และสินค้าจะถูกบันทึกโดยอัตโนมัติตามเอกสารอ้างอิงที่เลือก
                      คุณไม่จำเป็นต้องกรอกข้อมูลซ้ำในส่วนนี้
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedCustomerId ? (
                    <div className="flex items-end gap-4">
                      <FormField
                        label="จำนวนพื้นที่ที่ต้องการเข้าบริการ"
                        htmlFor="numberOfAreas"
                        className="mb-0 flex-1"
                      >
                        <Select
                          id="numberOfAreas"
                          value={workAreas.length}
                          onChange={(e) =>
                            handleNumberOfAreasChange(parseInt(e.target.value, 10))
                          }
                        >
                          <option value="0">ยังไม่ระบุพื้นที่</option>
                          {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                            <option key={num} value={num}>
                              {num} พื้นที่
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>
                  ) : (
                    <div className="text-center p-8 text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                      กรุณาเลือกลูกค้าก่อนกำหนดพื้นที่
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-4">
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
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 2: Team & Vehicle */}
        <div className={currentStep === 2 ? 'block animate-fadeIn' : 'hidden'}>
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vehicle Selection */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <TruckIcon className="w-5 h-5" />
                  </div>
                  ยานพาหนะ
                </h3>
                
                <div className="space-y-4">
                  <SearchableSelect
                      label="เลือกรถที่ปฏิบัติงาน"
                      options={filteredVehicles}
                      value={selectedVehicleId}
                      onChange={setSelectedVehicleId}
                      onSearchChange={setVehicleSearch}
                      placeholder="ค้นหารถบริการ..."
                      required
                    />

                    {timeConflictError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-start gap-2">
                        <span className="text-lg">⚠️</span>
                        <p>{timeConflictError}</p>
                      </div>
                    )}

                    {bookedSlots.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
                        <p className="font-semibold text-amber-800 mb-1">
                          ช่วงเวลาที่ไม่ว่างสำหรับรถคันนี้:
                        </p>
                        <ul className="list-disc list-inside mt-1 text-amber-700 space-y-1">
                          {bookedSlots.map((slot) => (
                            <li key={slot.start}>
                              {slot.start} - {slot.end} ({slot.customer})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </div>

              {/* Leader Selection */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  หัวหน้าทีม (Leader)
                </h3>
                <div className="mb-4">
                  <SearchableSelect
                    label="หัวหน้าช่าง *"
                    name="primary_tech_id"
                    options={leadTechnicianOptions.map((tech) => ({
                      value: tech.id,
                      label: `${getTechnicianName(tech)} ${tech.nick_name ? `(${tech.nick_name})` : ''}`,
                      description: tech.phone || '',
                    }))}
                    value={leadTechnicianId}
                    onChange={handleLeadTechnicianChange}
                    onSearchChange={setLeadTechSearch}
                    placeholder="ค้นหาหัวหน้าช่าง..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* Member Selection */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                  <UserIcon className="w-5 h-5" />
                </div>
                ลูกทีม (Members)
              </h3>
              
              <div className="mb-6">
                 <Input
                    placeholder="ค้นหาช่างเพิ่มเติม..."
                    value={additionalTechSearch}
                    onChange={(e) => setAdditionalTechSearch(e.target.value)}
                    className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {additionalTechnicians.map((tech) => (
                  <label
                    key={tech.id}
                    className={`
                      relative flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 group
                      ${selectedTechnicianIds.includes(tech.id) 
                        ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20' 
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'}
                    `}
                  >
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedTechnicianIds.includes(tech.id)}
                        onChange={() => handleTechnicianToggle(tech.id)}
                        className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary transition-colors cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-semibold transition-colors ${selectedTechnicianIds.includes(tech.id) ? 'text-primary' : 'text-slate-700'}`}>
                        {getTechnicianName(tech)}
                      </span>
                      {tech.nick_name && <span className="text-xs text-slate-500 font-medium">({tech.nick_name})</span>}
                      {tech.phone && <span className="text-xs text-slate-400 mt-1">{tech.phone}</span>}
                    </div>
                  </label>
                ))}
              </div>
              {additionalTechnicians.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-400">ไม่พบรายชื่อช่างอื่นๆ</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </form>
    </Modal>
  );
};
