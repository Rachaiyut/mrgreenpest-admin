import { useState, useEffect, useMemo, FC, ChangeEvent, FormEvent } from 'react';
import { Modal } from '../../common/Modal';
import { Button, FormField, Input, Select, Textarea } from '../../common/FormControls';
import { Assessment, User, UserRole, Warehouse, Product, Category, AssessmentWorkArea, AssessmentInstallment } from '@/src/types/entity/app.interface';
import {
  FieldJob,
  FieldJobWorkArea,
} from '@/src/types/entity/field-job.interface';
import { JobStatus, JobMainStatus } from '@/src/types/enums/job';
import { PlusIcon, RefreshIcon, LoadingIcon, UserIcon, CalendarIcon, DocumentIcon, CreditCardIcon } from '../../../assets/icons/Icons';
import { WarehouseType, CategoryType } from '@/src/types';
import { AssessmentApi, ProductApi, CategoryApi, PackageApi, JobApi, CustomerApi } from '@/src/api';
import { PaymentMethod } from '@/src/types/enums/financial';
import { AsessmentStatus } from '@/src/types/enums/assessment';
import { WorkAreaForm } from '../assessments/WorkAreaForm';
import { Package } from '@/src/types/entity/package.interface';

// A component to manage a single work area within the job form
const JobWorkAreaForm: FC<{
  area: Partial<FieldJobWorkArea>;
  index: number;
  onAreaChange: (index: number, updatedArea: Partial<FieldJobWorkArea>) => void;
  onClearArea: (index: number) => void;
  isReadOnly: boolean;
}> = ({ area, index, onAreaChange, onClearArea, isReadOnly }) => {
  const handleFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
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
  [PaymentMethod.CREDIT_CARD]: 'บัตรเครดิต',
  [PaymentMethod.CHEQUE]: 'เช็ค',
  [PaymentMethod.QR_PAYMENT]: 'QR Payment',
  [PaymentMethod.DIVIDED]: 'แบ่งจ่าย',
  [PaymentMethod.INSTALLMENT]: 'งวด',
};

export const EditJobModal: FC<EditJobModalProps> = ({
  isOpen,
  onClose,
  job,
  onUpdateJob,
  jobs,
  users,
  warehouses,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'service' | 'team'>('overview');
  const [currentJob, setCurrentJob] = useState<FieldJob | null>(job);
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
  const [workAreas, setWorkAreas] = useState<Partial<FieldJobWorkArea>[]>([]); // Note: This might be redundant if using assessment.assessment_areas
  const [originalWorkAreas, setOriginalWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [installments, setInstallments] = useState<Partial<AssessmentInstallment>[]>([]);

  const servicePackages = useMemo(
    () => products.filter((p) => (p as any)?.category?.type === CategoryType.SERVICE),
    [products]
  );

  // Use packages from API for calculation and display
  const suggestedPackageOptions = useMemo(() => {
    return packages.filter(
      (pkg) => pkg.package_price && pkg.package_price.length > 0
    );
  }, [packages]);

  const technicians = (users || []).filter((u) => {
    const roleName = typeof u.role === 'object' && u.role ? (u.role as any).name : u.role;
    return roleName === UserRole.TECH;
  });

  // Handle Assessment field changes
  const handleAssessmentChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
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
    if (!formData.vehicle_id || !workDate || !currentJob) return [];
    return jobs
      .filter(
        (j) =>
          j.id !== currentJob.id &&
          j.vehicle_id === formData.vehicle_id &&
          new Date(j.start_time).toISOString().substring(0, 10) === workDate
      )
      .map((j) => ({
        start: new Date(j.start_time).toTimeString().substring(0, 5),
        end: new Date(j.end_time).toTimeString().substring(0, 5),
        customer: j.customerName,
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [formData.vehicle_id, workDate, jobs, currentJob]);

  // Sync prop to state and fetch full details
  useEffect(() => {
    setCurrentJob(job);
    if (isOpen && job?.id) {
      JobApi.getById(job.id)
        .then((res: any) => {
          const freshJob = res.data || res;
          setCurrentJob(freshJob);
        })
        .catch((err) => console.error('Error fetching job details:', err));
    }
  }, [isOpen, job]);

  useEffect(() => {
    if (isOpen && (currentJob?.assessment_id || (currentJob as any)?.assessment?.id)) {
      const idToFetch = currentJob?.assessment_id || (currentJob as any)?.assessment?.id;
      console.log('EditJobModal: Fetching assessment', idToFetch);
      AssessmentApi.getById(idToFetch)
        .then((res: any) => {
          const rawAssessment = res.data || res || null;
          console.log('EditJobModal: Fetched assessment', rawAssessment);
          if (rawAssessment) {
            // Helper to derive base price (Logic sync with EditAssessmentModal)
            const enrichArea = (wa: any) => {
              const itemsTotal = (wa.items || []).reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0);
              const derivedBasePrice = wa.base_service_price !== undefined
                ? wa.base_service_price
                : (Number(wa.total_price) || 0) - itemsTotal;

              return {
                ...wa,
                items: wa.items || [],
                category_services: wa.category_services || [],
                base_service_price: derivedBasePrice > 0 ? derivedBasePrice : 0,
              };
            };

            const enrichedAreas = (rawAssessment.assessment_areas || []).map(enrichArea);

            // Update assessment with enriched areas so they display correctly immediately
            setAssessment({
              ...rawAssessment,
              assessment_areas: enrichedAreas
            });
            
            if (rawAssessment.installments && rawAssessment.installments.length > 0) {
               setInstallments(rawAssessment.installments.map((i: any) => ({ ...i })));
            } else {
               setInstallments([]);
            }

            // Set original areas for comparison/protection
            setOriginalWorkAreas(enrichedAreas.map(a => JSON.parse(JSON.stringify(a))));
          } else {
            setAssessment(null);
            setInstallments([]);
            setOriginalWorkAreas([]);
          }
        })
        .catch((err) => {
          console.error('Error fetching assessment:', err);
        });
    } else if (isOpen) {
      // Fallback: If job has no assessment_id, try to find it via API (sometimes the prop is stale)
       if (currentJob && !currentJob.assessment_id && (currentJob as any).assessmentId) {
          // If assessmentId exists in a different casing or property
          // This block is just a safeguard, usually job.assessment_id is correct
       } else {
         console.log('EditJobModal: No assessment_id in job object', currentJob);
         setAssessment(null);
       }
    }
  }, [isOpen, currentJob]);

  useEffect(() => {
    if (isOpen) {
      ProductApi.getProducts({ page: 1, limit: 10 })
        .then((res: any) => {
          setProducts(res.data || []);
        })
        .catch((err: any) => {
          console.error('Error fetching products:', err);
        });
      CategoryApi.getCategories({ type: CategoryType.SERVICE, page: 1, limit: 10 })
        .then((res: any) => {
          setCategories(res.data || []);
        })
        .catch((err: any) => {
          console.error('Error fetching categories:', err);
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingPackages(true);
      PackageApi.getPackages({ limit: 10 })
        .then((res) => {
          setPackages(res.data || []);
        })
        .catch((err) => console.error('Error fetching packages:', err))
        .finally(() => setIsLoadingPackages(false));
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
    if (currentJob) {
      const { work_areas, technicians, ...rest } = currentJob;
      const initialFormData: any = { ...rest };
      
      // Resolve Customer Name
      let cName = (currentJob as any).customerName || (currentJob as any).customer_name;
      
      if ((currentJob as any).customer) {
         const c = (currentJob as any).customer;
         const constructedName = c.name || `${c.first_name || ''} ${c.last_name || ''} ${c.nickname ? `(${c.nickname})` : ''}`.trim();
         if (constructedName) cName = constructedName;
      }
      
      initialFormData.customerName = cName;

      // If still no name but we have ID, fetch it
      if (!cName && currentJob.customer_id) {
           CustomerApi.getCustomerById(currentJob.customer_id).then(res => {
               const c = res as any; // The response might be the object directly or have data property
               const customerData = c.data || c; 
               if (customerData) {
                   const fetchedName = `${customerData.first_name || ''} ${customerData.last_name || ''} ${customerData.nickname ? `(${customerData.nickname})` : ''}`.trim();
                   setFormData(prev => ({ ...prev, customerName: fetchedName }));
               }
           }).catch(err => console.error("Error fetching customer for job:", err));
       }
         
      // Construct address from customer fields if job address is empty
      if (!initialFormData.address && (currentJob as any).customer) {
        const c = (currentJob as any).customer;
        const addressParts = [
          c.address_house_no,
          c.address_soi,
          c.address_road,
          c.sub_district,
          c.district,
          c.province,
          c.postal_code,
        ].filter(Boolean);
        initialFormData.address = addressParts.join(' ');
      }
      
      // If still empty and we fetch customer later, we might want to update address too?
      // For now let's keep it simple.

      // Map google_map_link from customer if empty
      if (!initialFormData.google_map_link && (currentJob as any).customer?.google_map_link) {
        initialFormData.google_map_link = (currentJob as any).customer.google_map_link;
      }

      setFormData(initialFormData);

      // Helper to derive base price (Logic sync with EditAssessmentModal)
      const enrichArea = (wa: any) => {
        // Calculate base_service_price if not present
        // In Job Edit, we assume items are already populated
        const itemsTotal = (wa.items || []).reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0);

        // If coming from DB, base_service_price might be missing, so derive it
        const derivedBasePrice = wa.base_service_price !== undefined
          ? wa.base_service_price
          : (Number(wa.total_price) || 0) - itemsTotal;

        return {
          ...wa,
          items: wa.items || [],
          category_services: wa.category_services || [],
          base_service_price: derivedBasePrice > 0 ? derivedBasePrice : 0,
        };
      };

      const enrichedAreas = (work_areas || []).map(enrichArea);
      setWorkAreas(enrichedAreas);
      // Deep copy to ensure independence for edit detection
      setOriginalWorkAreas(enrichedAreas.map(a => JSON.parse(JSON.stringify(a))));

      // Handle technicians safely from multiple possible sources
      const jobAny = currentJob as any;
      let leadId = '';
      let memberIds: string[] = [];

      if (jobAny.primary_technician) {
        leadId = jobAny.primary_technician.id;
      } else if (technicians && technicians.length > 0) {
        leadId = technicians[0].id;
      }

      if (jobAny.job_team_members && Array.isArray(jobAny.job_team_members)) {
        memberIds = jobAny.job_team_members.map((m: any) => m.id);
      } else if (technicians && technicians.length > 1) {
        memberIds = technicians.slice(1).map((t: any) => t.id);
      }

      setLeadTechnicianId(leadId);
      setSelectedTechnicianIds(memberIds);

      if (currentJob.start_time) {
        const startDate = new Date(currentJob.start_time);
        if (!isNaN(startDate.getTime())) {
          setWorkDate(startDate.toISOString().substring(0, 10));
          setStartTime(startDate.toTimeString().substring(0, 5));
        } else {
           setWorkDate('');
           setStartTime('');
        }
      }

      if (currentJob.end_time) {
         const endDate = new Date(currentJob.end_time);
         if (!isNaN(endDate.getTime())) {
            setEndTime(endDate.toTimeString().substring(0, 5));
         } else {
            setEndTime('');
         }
      }

      setTimeConflictError(null);
    }
  }, [currentJob]);

  useEffect(() => {
    if (!currentJob || !formData.vehicle_id || !workDate || !startTime || !endTime) {
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
      if (existingJob.id === currentJob.id) return false;
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
        `เวลานี้ทับซ้อนกับงานของ ${conflictingJob.customerName} (${new Date(conflictingJob.start_time).toTimeString().substring(0, 5)} - ${new Date(conflictingJob.end_time).toTimeString().substring(0, 5)})`
      );
    } else {
      setTimeConflictError(null);
    }
  }, [formData.vehicle_id, workDate, startTime, endTime, jobs, currentJob]);

  const handleInstallmentAmountChange = (index: number, amount: number) => {
    setInstallments(prev => {
      const newInst = [...prev];
      newInst[index] = { ...newInst[index], amount };
      return newInst;
    });
  };

  const handleInstallmentNoteChange = (index: number, note: string) => {
    setInstallments(prev => {
      const newInst = [...prev];
      newInst[index] = { ...newInst[index], note };
      return newInst;
    });
  };

  // Auto-calculate installments Effect
  useEffect(() => {
    if (!assessment) return;
    
    const paymentCondition = (assessment as any).payment_condition;
    const installmentCount = (assessment as any).payment_installment_count;
    const total = (assessment as any).total_price || 0;

    if (paymentCondition === PaymentMethod.INSTALLMENT && installmentCount && installmentCount > 0) {
      const currentSum = installments.reduce((s, i) => s + Number(i.amount || 0), 0);
      const isSumMismatch = Math.abs(currentSum - total) > 1; // Tolerance 1 baht
      const isCountMismatch = installments.length !== installmentCount;

      if (isSumMismatch || isCountMismatch) {
        const amountPerInst = Math.floor((total / installmentCount) * 100) / 100;
        const lastAmount = total - (amountPerInst * (installmentCount - 1));

        setInstallments(prev => {
          const newInst: Partial<AssessmentInstallment>[] = [];
          for (let i = 0; i < installmentCount; i++) {
            newInst.push({
              installment_no: i + 1,
              amount: i === installmentCount - 1 ? lastAmount : amountPerInst,
              note: prev[i]?.note || '',
            });
          }
          return newInst;
        });
      }
    } else {
      if (installments.length > 0 && paymentCondition !== PaymentMethod.INSTALLMENT) {
        setInstallments([]);
      }
    }
  }, [assessment?.total_price]);

  const handleChange = (
    e: ChangeEvent<
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

  const createJobObject = (status: JobStatus | JobMainStatus): any | null => {
    if (!currentJob || !workDate || !startTime || !endTime) return null;

    const startDateTime = new Date(`${workDate}T${startTime}`).toISOString();
    const endDateTime = new Date(`${workDate}T${endTime}`).toISOString();
    
    let apiStatus = 'PENDING';
    if (status === JobStatus.InProgress || status === JobMainStatus.IN_PROGRESS) apiStatus = 'IN_PROGRESS';
    else if (status === JobStatus.Completed || status === JobMainStatus.COMPLETE) apiStatus = 'COMPLETE';
    else if (status === JobStatus.Cancelled || status === JobMainStatus.CANCELLED) apiStatus = 'CANCELLED';
    else if (status === JobStatus.Failed || status === JobMainStatus.FAILED) apiStatus = 'FAILED';

    const primaryTechId =
      (currentJob as any)?.primary_technician?.id || leadTechnicianId || undefined;

    const teamMembers = (selectedTechnicianIds || []).map((id) => ({
      user_id: id,
      check_in: null,
      check_out: null,
    }));

    const payload: any = {
      id: currentJob.id,
      primary_tech_id: primaryTechId,
      vehicle_id: formData.vehicle_id,
      start_date: startDateTime,
      end_date: endDateTime,
      status: apiStatus,
      service_system: (assessment as any)?.service_system || 'CHEMICAL',
      remark: formData.remarks,
      team_member: teamMembers,
      assessment: (() => {
        if (!assessment) return undefined;

        let shouldBePending = false;
        const mappedAreas = ((assessment as any)?.assessment_areas || []).map(
          (area: any) => {
            // Check for price condition
            if (assessment.package_id) {
              const pkg = packages.find(p => p.id === assessment.package_id);
              if (pkg) {
                const standardBasePrice = Number(calculateAreaPrice(area, pkg));
                const itemsTotal = (area.items || []).reduce((sum: number, item: any) => sum + Number(item.total_price || 0), 0);
                const minExpectedTotal = standardBasePrice + itemsTotal;

                // Allow for small floating point differences
                if (Number(area.total_price) < minExpectedTotal - 0.01) {
                  shouldBePending = true;
                }
              }
            }

            return {
              package_price_id: area.package_price_id,
              package_price: area.package_price !== undefined && area.package_price !== null ? Number(area.package_price) : undefined, // Include package price in payload
              area_name: area.area_name,
              building_type: area.building_type,
              service_system: area.service_system,
              area_size: area.area_size,
              // base_service_price: area.base_service_price, // Removed as requested
              total_price: area.total_price,
              category_services: (area.category_services || []).map((c: any) => ({
                category_id: c.category_id
              })),
              items: (area.items || []).map((it: any) => ({
                product_id: it.product_id,
                product_name: it.product_name,
                product_price: it.product_price,
                quantity: it.quantity,
                total_price: it.total_price,
              })),
            };
          }
        );

        return {
          customer_id: currentJob.customer_id,
          package_id: (assessment as any).package_id,
          appointment_date: assessment.appointment_date
            ? new Date(assessment.appointment_date).toISOString().substring(0, 10)
            : undefined,
          address: currentJob.address,
          sub_district: (assessment as any).sub_district || (currentJob as any).sub_district,
          district: (assessment as any).district || (currentJob as any).district,
          province: (assessment as any).province || (currentJob as any).province,
          zipcode: (assessment as any).zipcode || (currentJob as any).postal_code,
          zone: (currentJob as any).zone,
          route_group: (currentJob as any).group,
          road_line: (currentJob as any).road_line,
          sequence: (currentJob as any).sequence,
          google_map_link: currentJob.google_map_link,
          // If price condition met, force PENDING, otherwise use existing status
          status: shouldBePending ? AsessmentStatus.PENDING : (assessment as any).status,
          payment_condition: (assessment as any).payment_condition,
          payment_installment_count: (assessment as any).payment_condition === PaymentMethod.INSTALLMENT ? (assessment as any).payment_installment_count : undefined,
          installments: (assessment as any).payment_condition === PaymentMethod.INSTALLMENT ? installments : [],
          total_price: (assessment as any).total_price,
          created_by: currentUser?.name,
          updated_by: currentUser?.name,
          assessment_areas: mappedAreas,
        };
      })(),
    };

    return payload;
  };

  const handleSaveAndClose = async (status: JobStatus | JobMainStatus) => {
    const updatedPayload = createJobObject(status);
    if (updatedPayload) {
      // Explicitly update assessment if present
      if (updatedPayload.assessment && assessment && assessment.id) {
        try {
          await AssessmentApi.update(assessment.id, updatedPayload.assessment);
        } catch (err) {
          console.error('Failed to update assessment:', err);
          alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลใบประเมิน');
          return;
        }
      }
      
      onUpdateJob(updatedPayload);
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (timeConflictError) return;
    await handleSaveAndClose(formData.status || JobStatus.Planned);
  };

  const handleSaveDraft = async () => {
    await handleSaveAndClose(JobStatus.Draft);
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

      // Calculate new price if area size changed and package selected
      let newArea = { ...updatedArea };
      if (selectedPackageId) {
        const pkg = packages.find(p => p.id === selectedPackageId);
        if (pkg) {
          // Use the price from the form (which allows manual edits), don't force recalculation
          const basePrice = Number(newArea.base_service_price || 0);
          const itemsTotal = (newArea.items || []).reduce((sum: number, item: any) => sum + Number(item.total_price || 0), 0);
          newArea.base_service_price = basePrice;
          newArea.total_price = basePrice + itemsTotal;
        }
      }

      areas[index] = newArea;

      const newTotal = areas.reduce((sum, a) => sum + Number(a.total_price || 0), 0);
      return { ...prev, assessment_areas: areas, total_price: newTotal } as Assessment;
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

  const calculateAreaPrice = (area: any, pkg: Package) => {
    if (!area.area_size || area.area_size <= 0 || !pkg.package_price) return area.base_service_price || 0;

    const sortedConditions = [...pkg.package_price].sort((a, b) => a.area_range - b.area_range);
    const bestFit = sortedConditions.find((c) => c.area_range >= area.area_size);

    if (bestFit) {
      // Check for termite service
      // We need categories list here. 
      const termiteCategory = categories.find((c) => c.name.includes('กำจัดปลวก'));
      const hasTermites = (area.category_services || []).some(
        (s: any) => s.category_id === termiteCategory?.id
      );
      return hasTermites ? Number(bestFit.price_with_termite) : Number(bestFit.price_without_termite);
    }
    return Number(area.base_service_price || 0);
  };

  const handlePackageSelect = (pkgId: string | null) => {
    setSelectedPackageId(pkgId);
    setAssessment((prev) => {
      if (!prev) return null;
      let newAssessment = { ...prev, package_id: pkgId || undefined };

      // Recalculate prices if package selected
      if (pkgId) {
        const pkg = packages.find(p => p.id === pkgId);
        if (pkg) {
          newAssessment.assessment_areas = (prev.assessment_areas || []).map(area => {
            const basePrice = Number(calculateAreaPrice(area, pkg));
            // Recalculate total price for area (base + items)
            const itemsTotal = (area.items || []).reduce((sum: number, item: any) => sum + Number(item.total_price || 0), 0);
            return {
              ...area,
              base_service_price: basePrice,
              package_price: basePrice, // Set package price snapshot
              total_price: basePrice + itemsTotal
            };
          }) as any;
        }
      }

      // Update total price of assessment
      newAssessment.total_price = (newAssessment.assessment_areas || []).reduce((sum, area) => sum + Number(area.total_price || 0), 0);

      return newAssessment as Assessment;
    });
  };

  if (!currentJob) return null;

  const isReadOnly = !!currentJob.assessment_id || !!currentJob.contract_id;
  const additionalTechnicians = technicians.filter(
    (tech) => tech.id !== leadTechnicianId
  );

  const primaryTechnicianDisplay = (() => {
    const pt = (currentJob as any)?.primary_technician;
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

  const tabs = [
    { id: 'overview', label: 'ข้อมูลทั่วไป', icon: <DocumentIcon className="w-4 h-4" /> },
    { id: 'service', label: 'รายละเอียดบริการ', icon: <CalendarIcon className="w-4 h-4" /> },
    { id: 'team', label: 'ทีมช่าง', icon: <UserIcon className="w-4 h-4" /> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขงาน: ${formData.customerName || (currentJob as any).customer_name || 'ลูกค้าไม่ระบุ'}`}
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
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <form id="edit-job-form" onSubmit={handleSubmit} className="space-y-6">
        
        {/* TAB: OVERVIEW */}
        <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">ข้อมูลลูกค้า</h3>
                <FormField label="ลูกค้า" htmlFor="customerName">
                  <Input
                    id="customerName"
                    name="customerName"
                    type="text"
                    value={formData.customerName || ''}
                    onChange={handleChange}
                    required
                    readOnly
                    className="bg-white"
                  />
                </FormField>


                <FormField label="ที่อยู่" htmlFor="address">
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleChange}
                    required
                    className="bg-white"
                    rows={3}
                  />
                </FormField>

                <FormField label="Link Google Map" htmlFor="googleMapLink">
                  <Input
                    name="google_map_link"
                    type="url"
                    value={formData.google_map_link || ''}
                    onChange={handleChange}
                    placeholder="https://maps.app.goo.gl/..."
                    className="bg-white"
                  />
                </FormField>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">พื้นที่บริการ (ข้อมูลอ้างอิง)</h3>
                
                <div className="mb-4">
                   <FormField label="อ้างอิงใบประเมิน (Code)" htmlFor="assessmentCode">
                      <Input 
                        value={assessment ? (assessment as any).code || '-' : '-'} 
                        readOnly 
                        className="bg-white font-medium text-primary" 
                      />
                   </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="เขต" htmlFor="zone">
                    <Input name="zone" value={formData.zone || ''} readOnly className="bg-white" />
                  </FormField>
                  <FormField label="Group" htmlFor="group">
                    <Input name="group" value={formData.group || ''} readOnly className="bg-white" />
                  </FormField>
                  <FormField label="สายถนน" htmlFor="roadLine">
                    <Input name="road_line" value={formData.road_line || ''} readOnly className="bg-white" />
                  </FormField>
                  <FormField label="ลำดับ" htmlFor="sequence">
                    <Input name="sequence" value={formData.sequence || ''} readOnly className="bg-white" />
                  </FormField>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  กำหนดการปฏิบัติงาน
                </h3>
                
                <FormField label="วันที่ปฏิบัติงาน" htmlFor="work-date">
                  <Input
                    id="work-date"
                    type="date"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    required
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
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

                <FormField label="ยานพาหนะ" htmlFor="vehicleId">
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

                {timeConflictError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <div className="text-red-500 mt-0.5">⚠️</div>
                    <p className="text-sm text-red-600">{timeConflictError}</p>
                  </div>
                )}

                {bookedSlots.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
                    <p className="font-semibold text-amber-800 mb-1">
                      ตารางงานอื่นของรถคันนี้:
                    </p>
                    <ul className="space-y-1">
                      {bookedSlots.map((slot, idx) => (
                        <li key={idx} className="text-amber-700 flex justify-between">
                          <span>{slot.start} - {slot.end}</span>
                          <span className="opacity-75 truncate max-w-[150px]">{slot.customer}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <FormField
                label="รายละเอียด/หมายเหตุการปฏิบัติงาน"
                htmlFor="operation-details-edit"
              >
                <Textarea
                  id="operation-details-edit"
                  name="operation_details"
                  value={formData.operation_details || ''}
                  onChange={handleChange}
                  placeholder="รายละเอียดเพิ่มเติมสำหรับช่าง..."
                  rows={4}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* TAB: SERVICE */}
        <div className={activeTab === 'service' ? 'block' : 'hidden'}>
          {!currentJob.assessment_id && (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
              <div className="text-slate-400 mb-2">📄</div>
              <p className="text-slate-500 font-medium">งานนี้ไม่ได้อ้างอิงใบประเมิน</p>
              <p className="text-sm text-slate-400">คุณสามารถจัดการข้อมูลพื้นที่ได้ในส่วนการแก้ไขงานทั่วไป (ถ้ามี)</p>
            </div>
          )}
          
          {currentJob.assessment_id && !assessment && (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mb-4"></div>
              <p className="text-slate-600">กำลังโหลดข้อมูลใบประเมิน...</p>
            </div>
          )}

          {assessment && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">รายการพื้นที่บริการ</h3>
                  <p className="text-sm text-slate-500">จัดการพื้นที่และสินค้าที่ใช้ในแต่ละจุด</p>
                </div>
                <div className="flex gap-2">
                   <button
                    type="button"
                    onClick={handleAddArea}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium shadow-sm transition-all"
                  >
                    <PlusIcon className="h-4 w-4" />
                    เพิ่มพื้นที่
                  </button>
                </div>
              </div>

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
                        ? (packages.find(
                          (p) => p.id === selectedPackageId
                        ) as any)!
                        : null
                    }
                    availablePackages={packages}
                    onSelectPackage={handlePackageSelect}
                    categories={categories}
                    isEditing={true}
                    originalArea={originalWorkAreas[index]}
                  />
                ))}
              </div>

              {/* Payment Condition Section moved here as it relates to the service agreement */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 mt-8 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <CreditCardIcon className="w-5 h-5 text-primary" />
                    เงื่อนไขการชำระเงิน
                </h3>
                
                <div className="flex flex-col md:flex-row gap-6">
                   <div className="flex-1 space-y-4">
                      <div className="flex gap-4">
                        <label className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${!(assessment as any).payment_condition || (assessment as any).payment_condition !== PaymentMethod.INSTALLMENT ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 hover:border-slate-300'}`}>
                          <input
                            type="radio"
                            name="payment_type_edit_job"
                            className="hidden"
                            checked={!(assessment as any).payment_condition || (assessment as any).payment_condition !== PaymentMethod.INSTALLMENT}
                            onChange={() => setAssessment((prev: any) => ({ ...prev, payment_condition: PaymentMethod.CASH }))}
                          />
                          <div className="font-semibold">ชำระเต็มจำนวน</div>
                        </label>
                        <label className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${(assessment as any).payment_condition === PaymentMethod.INSTALLMENT ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 hover:border-slate-300'}`}>
                          <input
                            type="radio"
                            name="payment_type_edit_job"
                            className="hidden"
                            checked={(assessment as any).payment_condition === PaymentMethod.INSTALLMENT}
                            onChange={() => setAssessment((prev: any) => ({ ...prev, payment_condition: PaymentMethod.INSTALLMENT }))}
                          />
                          <div className="font-semibold">แบ่งชำระ (งวด)</div>
                        </label>
                      </div>

                      {(assessment as any).payment_condition === PaymentMethod.INSTALLMENT && (
                        <div className="space-y-4 animate-fadeIn">
                          <FormField label="จำนวนงวด" htmlFor="payment_installment_count">
                            <Input
                              name="payment_installment_count"
                              type="number"
                              placeholder="ระบุจำนวนงวด"
                              value={(assessment as any).payment_installment_count || ''}
                              onChange={(e) =>
                                setAssessment((prev: any) => ({
                                  ...prev,
                                  payment_installment_count: parseInt(e.target.value, 10) || 0,
                                }))
                              }
                              className="bg-white max-w-[200px]"
                              required
                              min={2}
                            />
                          </FormField>
                          
                          {/* Installment Details */}
                          {installments.length > 0 && (
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                              <h4 className="font-medium text-slate-700 mb-3">รายละเอียดการแบ่งชำระ</h4>
                              <div className="space-y-3">
                                {installments.map((inst, idx) => (
                                  <div key={idx} className="flex gap-3 items-end">
                                    <div className="w-16 pt-2 text-sm font-medium text-slate-500">
                                      งวดที่ {inst.installment_no}
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-xs text-slate-400 mb-1">จำนวนเงิน</label>
                                      <Input
                                        type="number"
                                        value={inst.amount}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          handleInstallmentAmountChange(idx, val);
                                        }}
                                        step="0.01"
                                        className="bg-white"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-xs text-slate-400 mb-1">หมายเหตุ</label>
                                      <Input
                                        type="text"
                                        value={inst.note || ''}
                                        placeholder="เช่น มัดจำ"
                                        onChange={(e) => {
                                          handleInstallmentNoteChange(idx, e.target.value);
                                        }}
                                        className="bg-white"
                                      />
                                    </div>
                                  </div>
                                ))}
                                <div className="pt-2 flex justify-between text-sm font-semibold text-slate-700 border-t mt-2">
                                  <span>รวม</span>
                                  <span className={installments.reduce((sum, i) => sum + Number(i.amount || 0), 0) === (assessment as any).total_price ? 'text-green-600' : 'text-red-500'}>
                                    {installments.reduce((sum, i) => sum + Number(i.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {((assessment as any).total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                   </div>

                   {/* Summary for Job Edit */}
                   <div className="w-full md:w-1/3">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <h4 className="font-semibold text-slate-800 mb-2">สรุปค่าบริการ</h4>
                          <div className="space-y-2 text-sm">
                             <div className="flex justify-between text-slate-600">
                                <span>พื้นที่ทั้งหมด</span>
                                <span>{(assessment.assessment_areas || []).length} จุด</span>
                             </div>
                             <div className="flex justify-between text-slate-600">
                                <span>ประเภทราคา</span>
                                <span>{(assessment as any).package_id ? 'Package' : 'Custom'}</span>
                             </div>
                             <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg text-primary">
                                <span>รวมสุทธิ</span>
                                <span>฿{((assessment as any).total_price || 0).toLocaleString()}</span>
                             </div>
                          </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TAB: TEAM */}
        <div className={activeTab === 'team' ? 'block' : 'hidden'}>
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">หัวหน้าทีม (Leader)</h3>
              <FormField label="หัวหน้าช่าง" htmlFor="lead-technician-display">
                <Input
                  id="lead-technician-display"
                  value={primaryTechnicianDisplay}
                  readOnly
                  className="bg-slate-50 font-medium text-slate-700"
                />
                <p className="text-xs text-slate-500 mt-1">
                  * หัวหน้าช่างถูกกำหนดจากการสร้างงาน หากต้องการเปลี่ยนกรุณาติดต่อผู้ดูแลระบบ
                </p>
              </FormField>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">ลูกทีม (Members)</h3>
              <div className="space-y-2">
                <p className="text-sm text-slate-600 mb-2">เลือกช่างเทคนิคเพิ่มเติมที่เข้าร่วมงานนี้:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {additionalTechnicians.map((tech) => (
                    <label
                      key={tech.id}
                      className={`
                        flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all
                        ${selectedTechnicianIds.includes(tech.id) 
                          ? 'bg-primary/5 border-primary ring-1 ring-primary' 
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'}
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTechnicianIds.includes(tech.id)}
                        onChange={() => handleTechnicianToggle(tech.id)}
                        className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{tech.name}</span>
                        {tech.nick_name && <span className="text-xs text-slate-500">({tech.nick_name})</span>}
                      </div>
                    </label>
                  ))}
                </div>
                {additionalTechnicians.length === 0 && (
                  <p className="text-center text-slate-400 py-4 italic">ไม่พบรายชื่อช่างอื่นๆ</p>
                )}
              </div>
            </div>
          </div>
        </div>

      </form>
    </Modal>
  );
};