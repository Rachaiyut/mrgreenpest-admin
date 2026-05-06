// ===== React =====
import React, { useEffect, useMemo, useState, useRef } from 'react';
import Swal from '@/src/utils/swal';

// ===== External Libraries =====
import DatePicker from '@/src/components/common/BuddhistDatePicker';

// ===== Types / Enums =====
import { AsessmentStatus, CategoryType, ServiceSystem, WarehouseType } from '@/src/types';
import { isFieldRole } from '@/src/utils/role';
import { RoleType } from '@/src/types/enums/role';
import { useCurrentUser } from '@/src/hooks/useCurrentUser';
import { JobMainStatus } from '@/src/types/enums/job';
import { User, UserRole } from '@/src/types/entity/core.interface';
import { Job } from '@/src/types/entity/job.interface';
import { Contract, Invoice } from '@/src/types/entity/financial.interface';
import { Customer } from '@/src/types/entity/customer.interface';
import { Warehouse } from '@/src/types/entity/inventory.interface';
import { Assessment, AssessmentWorkArea } from '@/src/types/entity/app.interface';
import { Category } from '@/src/types/entity/category.interface';
import { Product } from '@/src/types/entity/product.interface';
import { Package } from '@/src/types/entity/package.interface';
import { PackageType } from '@/src/types/enums/package';

// ===== Components =====
import { FormField, Input, Textarea, Button } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { WorkAreaForm } from '../assessments/WorkAreaForm';

// ===== API =====
import {
  AssessmentApi,
  ContractApi,
  CustomerApi,
  InvoiceApi,
  UserApi,
  WarehouseApi,
  CategoryApi,
  ProductApi,
  PackageApi
} from '@/src/api';
import { StorageApi } from '@/src/api/storage';

// ===== Assets =====
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  DocumentIcon,
  MapPinIcon,
  PhoneIcon,
  TruckIcon,
  UserIcon,
  LoadingIcon,
  CreditCardIcon as CurrencyDollarIcon,
  PlusIcon,
  PhotoIcon,
  TrashIcon,
  GoogleMapIcon,
} from '../../../assets/icons/Icons';

export interface JobFormProps {
  mode: 'add' | 'edit';
  jobToEdit?: any | null;
  onSubmitJob: (jobData: Omit<Job, 'id'> | any, assessmentId?: string) => void | Promise<void>;
  onCancel: () => void;
  warehouses: Warehouse[];
  initialContractId?: string;
  initialWorkDateIso?: string;
  defaultCustomerId?: string;
  contracts?: Contract[];
  jobs: any[];
  users: User[];
  currentUserRole: RoleType
}

// 🌟 ตัวช่วยดึง ID อัจฉริยะ ป้องกัน API ส่งค่ามาผิดรูปแบบ
const getSafeId = (val: any) => {
  if (!val) return null;
  if (typeof val === 'object' && val.id) return String(val.id);
  return String(val);
};

export const JobForm: React.FC<JobFormProps> = ({
  mode,
  jobToEdit,
  onSubmitJob,
  onCancel,
  jobs,
  users,
  warehouses: initialWarehouses,
  initialContractId,
  initialWorkDateIso,
  defaultCustomerId,
  currentUserRole
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([0]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedReference, setSelectedReference] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null);

  const [fetchedAssessments, setFetchedAssessments] = useState<Assessment[]>([]);
  const [fetchedContracts, setFetchedContracts] = useState<Contract[]>([]);
  const [fetchedInvoices, setFetchedInvoices] = useState<Invoice[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  // Per-area site images are handled inside WorkAreaForm + upload on save
  const [packages, setPackages] = useState<Package[]>([]);

  const [leadTechnicianId, setLeadTechnicianId] = useState('');
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [workDate, setWorkDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [timeConflictError, setTimeConflictError] = useState<string | null>(null);

  const [workAreas, setWorkAreas] = useState<Partial<any>[]>([]);
  const [operationDetails, setOperationDetails] = useState('');
  const [operationDetailsText, setOperationDetailsText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [serviceSystem, setServiceSystem] = useState<string>('');

  const [customerSearch, setCustomerSearch] = useState('');
  const [referenceSearch, setReferenceSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleOptions, setVehicleOptions] = useState<Warehouse[]>(initialWarehouses);

  const [leadTechSearch, setLeadTechSearch] = useState('');
  const [leadTechnicianOptions, setLeadTechnicianOptions] = useState<User[]>(
    users.filter((u) => {
      const rt = typeof u.role === 'object' && u.role ? (u.role as unknown as Record<string, string>).role_type : u.role_type;
      return rt === 'FIELD_TECH';
    })
  );

  const [additionalTechSearch, setAdditionalTechSearch] = useState('');
  const [additionalTechnicianOptions, setAdditionalTechnicianOptions] = useState<User[]>(
    users.filter((u) => {
      const rt = typeof u.role === 'object' && u.role ? (u.role as unknown as Record<string, string>).role_type : u.role_type;
      return rt === 'FIELD_TECH';
    })
  );

  const hasInitializedRef = useRef<string | null>(null);


  const authUser = useCurrentUser();
  const isTechRole = isFieldRole(authUser?.roleType);
  const isDisableTeamEdit = mode === 'edit' && isTechRole;

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [catRes, prodRes, pkgRes] = await Promise.all([
          CategoryApi.getCategories({ type: CategoryType.SERVICE }),
          ProductApi.getProducts({ limit: 100, is_active: true }),
          PackageApi.getPackages({ limit: 100, is_active: true }),
        ]);
        setCategories(catRes.data || []);
        setProducts(prodRes.data || []);
        setPackages(pkgRes.data || []);
      } catch (error) {
        console.error('Error fetching master data:', error);
      }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    const loadEditData = async () => {
      if (mode === 'edit' && jobToEdit && packages.length > 0) {
        if (hasInitializedRef.current === jobToEdit.id) return;
        hasInitializedRef.current = jobToEdit.id;
        setIsLoadingData(true);

        if (jobToEdit.customer_id) {
          setSelectedCustomerId(jobToEdit.customer_id);
          handleCustomerChange(jobToEdit.customer_id, true);
        }

        const actualAssessmentId = getSafeId(jobToEdit.assessment_id) || getSafeId(jobToEdit.assessmentId) || getSafeId(jobToEdit.assessment);
        const actualContractId = getSafeId(jobToEdit.contract_id) || getSafeId(jobToEdit.contractId) || getSafeId(jobToEdit.contract);
        const actualInvoiceId = getSafeId(jobToEdit.invoice_id) || getSafeId(jobToEdit.invoiceId) || getSafeId(jobToEdit.invoice);

        if (actualAssessmentId) {
          setSelectedReference(`asm-${actualAssessmentId}`);
        } else if (actualContractId) {
          setSelectedReference(`cnt-${actualContractId}`);
        }

        if (actualInvoiceId) {
          setSelectedInvoiceId(String(actualInvoiceId));
        }

        if (jobToEdit.start_time || jobToEdit.start_date) {
          const startObj = new Date(jobToEdit.start_time || jobToEdit.start_date);
          if (!isNaN(startObj.getTime())) {
            const yyyy = startObj.getFullYear();
            const mm = String(startObj.getMonth() + 1).padStart(2, '0');
            const dd = String(startObj.getDate()).padStart(2, '0');
            setWorkDate(`${yyyy}-${mm}-${dd}`);
            setStartTime(startObj.toTimeString().substring(0, 5));
          }
        }
        if (jobToEdit.end_time || jobToEdit.end_date) {
          const endObj = new Date(jobToEdit.end_time || jobToEdit.end_date);
          if (!isNaN(endObj.getTime())) {
            setEndTime(endObj.toTimeString().substring(0, 5));
          }
        }

        setSelectedVehicleId(getSafeId(jobToEdit.vehicle_id) || getSafeId(jobToEdit.vehicle) || '');
        setOperationDetails(jobToEdit.remarks || jobToEdit.remark || '');
        setOperationDetailsText(jobToEdit.operation_details || '');
        setServiceSystem(jobToEdit.service_system || '');

        let leadId = '';
        let memberIds: string[] = [];
        if (jobToEdit.primary_tech_id) leadId = jobToEdit.primary_tech_id;
        else if (jobToEdit.primary_technician?.id) leadId = jobToEdit.primary_technician.id;

        if (jobToEdit.team_member && Array.isArray(jobToEdit.team_member)) {
          memberIds = jobToEdit.team_member.map((m: any) => m.user_id || m.id);
        } else if (jobToEdit.technicians && Array.isArray(jobToEdit.technicians)) {
          memberIds = jobToEdit.technicians.map((t: any) => t.id);
        }
        memberIds = memberIds.filter(id => id !== leadId);
        setLeadTechnicianId(leadId);
        setSelectedTechnicianIds(memberIds);

        const targetAssessmentId = actualAssessmentId;
        // 🌟 ดึงข้อมูลพื้นที่ ครอบคลุมทุกการใช้ชื่อ Key ของ Backend
        let rawAreas = jobToEdit.work_areas || jobToEdit.areas || jobToEdit.job_areas || jobToEdit.jobAreas || [];
        let globalPackageId = jobToEdit.package_id || jobToEdit.assessment?.package_id;

        if (targetAssessmentId) {
          try {
            const res: any = await AssessmentApi.getById(targetAssessmentId);
            const realAssessment = res.data || res;
            if (realAssessment) {
               // นำพื้นที่จากใบประเมินมาใช้ ถ้างานนี้ยังไม่มีการเซฟพื้นที่แยกต่างหาก
               if (realAssessment.assessment_areas && realAssessment.assessment_areas.length > 0 && rawAreas.length === 0) {
                 rawAreas = realAssessment.assessment_areas;
               }
               if (realAssessment.package_id) {
                 globalPackageId = realAssessment.package_id;
               }
               // site_image is now per-area, handled in WorkAreaForm
            }
          } catch (err) {
            console.error('Error fetching full assessment data:', err);
          }
        }

        const enrichArea = (wa: any, index: number) => {
          const itemsTotal = (wa.items || []).reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0);
          const derivedBasePrice = wa.base_service_price !== undefined ? Number(wa.base_service_price) : (Number(wa.total_price) || 0) - itemsTotal;
          const pkgPrice = wa.package_price !== undefined && wa.package_price !== null ? Number(wa.package_price) : (derivedBasePrice > 0 ? derivedBasePrice : 0);

          let recoveredPkg;

          if (wa.package_price_id) {
             recoveredPkg = packages.find(p => p.package_prices && p.package_prices.some(price => String(price.id) === String(wa.package_price_id)));
          }
          if (!recoveredPkg) {
            recoveredPkg = packages.find(p => String(p.id) === String(wa.package_id) || String(p.id) === String(globalPackageId));
          }
          if (!recoveredPkg && wa.service_package) {
             recoveredPkg = packages.find(p => p.name === wa.service_package);
          }

          let recoveredPriceId = wa.package_price_id;
          let recoveredType = wa.package_type;
          
          if (recoveredPkg && wa.area_size) {
            const conditions = [...(recoveredPkg.package_prices || [])].sort((a, b) => a.area_range - b.area_range);
            const fit = conditions.find(c => c.area_range >= Number(wa.area_size));
            
            if (fit) {
              recoveredPriceId = wa.package_price_id || fit.id;
              
              const typeStr = String(recoveredType || '').toUpperCase();
              if (typeStr === 'WITH_TERMITE' || (typeStr.includes('WITH_TERMITE') && !typeStr.includes('WITHOUT'))) {
                 recoveredType = 'WITH_TERMITE';
              } else if (typeStr === 'WITHOUT_TERMITE' || typeStr.includes('WITHOUT')) {
                 recoveredType = 'WITHOUT_TERMITE';
              } else {
                 recoveredType = pkgPrice === Number(fit.price_without_termite) ? 'WITHOUT_TERMITE' : 'WITH_TERMITE';
              }
            }
          }

          return {
            ...wa, 
            id: wa.id || `area-${Date.now()}-${index}`,
            area_name: wa.area_name || wa.name || '',
            area_size: wa.area_size ? Number(wa.area_size) : undefined,
            building_type: wa.building_type || '',
            service_system: wa.service_system || '',
            items: Array.isArray(wa.items) ? wa.items : [],
            category_services: Array.isArray(wa.category_services) ? wa.category_services : Array.isArray(wa.categories) ? wa.categories.map((c: any) => ({ category_id: c.id || c.category_id })) : [],
            base_service_price: derivedBasePrice > 0 ? derivedBasePrice : 0,
            package_price: pkgPrice,
            total_price: wa.total_price ? Number(wa.total_price) : (derivedBasePrice + itemsTotal),
            
            package_id: recoveredPkg?.id || undefined,
            package_price_id: recoveredPriceId,
            package_type: recoveredType as PackageType,
            service_package: recoveredPkg?.name || wa.service_package || '',
            site_image_id: wa.site_image_id || null,
            site_image_url: wa.site_image_url || null,
          };
        };

        if (Array.isArray(rawAreas) && rawAreas.length > 0) {
          const enrichedAreas = rawAreas.map((area: any, idx: number) => enrichArea(area, idx));
          setWorkAreas(enrichedAreas);

          // Populate site_image_url for areas that have site_image_id but no URL
          const areasNeedingUrl = enrichedAreas
            .map((area: Record<string, unknown>, idx: number) => ({ area, idx }))
            .filter(({ area }) => area.site_image_id && !area.site_image_url);

          if (areasNeedingUrl.length > 0) {
            Promise.all(
              areasNeedingUrl.map(async ({ area, idx }) => {
                try {
                  const result = await StorageApi.getSignedUrl(area.site_image_id as string);
                  const url = (result as Record<string, unknown>)?.url || (result as Record<string, unknown>)?.data && ((result as Record<string, unknown>).data as Record<string, unknown>)?.url;
                  return { idx, url: url as string };
                } catch {
                  return { idx, url: null };
                }
              })
            ).then((results) => {
              setWorkAreas((prev) => {
                const updated = [...prev];
                for (const { idx, url } of results) {
                  if (url && updated[idx]) {
                    updated[idx] = { ...updated[idx], site_image_url: url };
                  }
                }
                return updated;
              });
            });
          }
        } else {
          setWorkAreas([]);
        }

        setVisitedSteps([0, 1, 2]);
        setIsLoadingData(false);
      }
    };

    loadEditData();
  }, [mode, jobToEdit, packages]);

  const fetchCustomers = async (search: string) => {
    try {
      const response = await CustomerApi.getCustomersService({ limit: 10, search: search });
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => { fetchCustomers(customerSearch); }, 300);
    return () => clearTimeout(timeoutId);
  }, [customerSearch]);

  const fetchVehicles = async (search: string) => {
    try {
      const response = await WarehouseApi.getWarehouses({ limit: 10, search: search, type: WarehouseType.VEHICLE });
      const vehicles = response.data.filter((w) => w.type === 'VEHICLE');
      setVehicleOptions(vehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchLeadTechnicians = async (search: string) => {
    try {
      const response = await UserApi.getAll({ limit: 10, search: search, role_type: 'FIELD_LEAD' });
      setLeadTechnicianOptions(response.data);
    } catch (error) {
      console.error('Error fetching lead technicians:', error);
    }
  };

  const fetchAdditionalTechnicians = async (search: string) => {
    try {
      const response = await UserApi.getAll({ limit: 10, search: search, role_type: 'FIELD_TECH' });
      setAdditionalTechnicianOptions(response.data);
    } catch (error) {
      console.error('Error fetching additional technicians:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => { fetchVehicles(vehicleSearch); }, 300);
    return () => clearTimeout(timeoutId);
  }, [vehicleSearch]);

  useEffect(() => {
    const timeoutId = setTimeout(() => { fetchLeadTechnicians(leadTechSearch); }, 300);
    return () => clearTimeout(timeoutId);
  }, [leadTechSearch]);

  useEffect(() => {
    const timeoutId = setTimeout(() => { fetchAdditionalTechnicians(additionalTechSearch); }, 300);
    return () => clearTimeout(timeoutId);
  }, [additionalTechSearch]);

  const vehicleWarehouses = useMemo(() => vehicleOptions, [vehicleOptions]);

  const selectedInvoiceData = useMemo(() => {
    return fetchedInvoices.find((inv) => String(inv.id) === selectedInvoiceId);
  }, [fetchedInvoices, selectedInvoiceId]);

  const filteredCustomers = useMemo(() => {
    if (selectedCustomerData && !customers.find((c) => c.id === selectedCustomerData.id)) {
      return [selectedCustomerData, ...customers];
    }
    return customers;
  }, [customers, selectedCustomerData]);

  const filteredVehicles = useMemo(() => {
    return vehicleWarehouses.map((v) => ({
      value: v.id,
      label: `${v.name} (${v.vehicle?.vehicle_registration || '-'})`,
    }));
  }, [vehicleWarehouses]);

  const isAssessment = selectedReference.startsWith('asm-');

  const availableAssessments = useMemo(() => {
    if (fetchedAssessments.length > 0) {
      return fetchedAssessments.filter((a) => a.status === AsessmentStatus.DRAFT || a.status === AsessmentStatus.COMPLETE || a.status === AsessmentStatus.APPOINTMENT);
    }
    if (selectedCustomerId) {
      const customer = (selectedCustomerData?.id === selectedCustomerId ? selectedCustomerData : undefined) || customers.find((c) => c.id === selectedCustomerId);
      if (customer?.assessments) {
        return customer.assessments.filter((a) => a.status === AsessmentStatus.DRAFT || a.status === AsessmentStatus.COMPLETE || a.status === AsessmentStatus.APPOINTMENT);
      }
    }
    return [];
  }, [customers, selectedCustomerId, selectedCustomerData, fetchedAssessments]);

  const availableContracts = useMemo(() => {
    if (fetchedContracts.length > 0) {
      return fetchedContracts.filter((a) => (a.status as string) === AsessmentStatus.DRAFT || (a.status as string) === AsessmentStatus.COMPLETE || (a.status as string) === 'ACTIVE');
    }
    if (selectedCustomerId) {
      const customer = (selectedCustomerData?.id === selectedCustomerId ? selectedCustomerData : undefined) || customers.find((c) => c.id === selectedCustomerId);
      if (customer?.contracts) {
        return customer.contracts.filter((a) => (a.status as string) === AsessmentStatus.DRAFT || (a.status as string) === AsessmentStatus.COMPLETE || (a.status as string) === 'ACTIVE');
      }
    }
    return [];
  }, [customers, selectedCustomerId, selectedCustomerData, fetchedContracts]);

  const availableInvoices = useMemo(() => {
    if (fetchedInvoices.length === 0) return [];
    const usedInvoiceIds = new Set(
      jobs
        .filter((job: any) => {
          if (mode === 'edit' && jobToEdit && job.id === jobToEdit.id) return false;
          return !!job.invoice_id;
        })
        .map((job: any) => String(job.invoice_id))
    );
    return fetchedInvoices.filter((inv) => !usedInvoiceIds.has(String(inv.id)));
  }, [fetchedInvoices, jobs, mode, jobToEdit]);

  const filteredInvoices = useMemo(() => {
    const refs = availableInvoices.map((inv) => ({ value: String(inv.id), label: `ใบแจ้งหนี้: ${inv.code}` }));
    
    if (mode === 'edit' && jobToEdit) {
      const actualInvoiceId = getSafeId(jobToEdit.invoice_id) || getSafeId(jobToEdit.invoiceId) || getSafeId(jobToEdit.invoice);
      if (actualInvoiceId) {
        const idStr = String(actualInvoiceId);
        if (!refs.find((r) => String(r.value) === idStr)) {
          let code = 'อ้างอิงข้อมูลเดิม';
          if (typeof jobToEdit.invoice === 'object' && jobToEdit.invoice.code) code = jobToEdit.invoice.code;
          else if (jobToEdit.invoice_code) code = jobToEdit.invoice_code;
          else if (jobToEdit.invoiceCode) code = jobToEdit.invoiceCode;
          
          refs.unshift({ value: idStr, label: `ใบแจ้งหนี้: ${code}` });
        }
      }
    }

    if (!invoiceSearch) return refs;
    const lower = invoiceSearch.toLowerCase();
    return refs.filter((r) => r.label.toLowerCase().includes(lower));
  }, [availableInvoices, invoiceSearch, mode, jobToEdit]);

  const filteredReferences = useMemo(() => {
    const refs = [
      ...availableAssessments.map((a) => ({ value: `asm-${a.id}`, label: `ใบประเมิน: ${a.code}` })),
      ...availableContracts.map((c) => ({ value: `cnt-${c.id}`, label: `สัญญา: ${c.code}` })),
    ];

    if (mode === 'edit' && jobToEdit) {
      const actualAssessmentId = getSafeId(jobToEdit.assessment_id) || getSafeId(jobToEdit.assessmentId) || getSafeId(jobToEdit.assessment);
      const actualContractId = getSafeId(jobToEdit.contract_id) || getSafeId(jobToEdit.contractId) || getSafeId(jobToEdit.contract);

      if (actualAssessmentId) {
        const val = `asm-${actualAssessmentId}`;
        if (!refs.find((r) => String(r.value) === val)) {
          let code = 'อ้างอิงข้อมูลเดิม';
          if (typeof jobToEdit.assessment === 'object' && jobToEdit.assessment.code) code = jobToEdit.assessment.code;
          else if (jobToEdit.assessment_code) code = jobToEdit.assessment_code;
          else if (jobToEdit.assessmentCode) code = jobToEdit.assessmentCode;
          
          refs.unshift({ value: val, label: `ใบประเมิน: ${code}` });
        }
      }
      if (actualContractId) {
        const val = `cnt-${actualContractId}`;
        if (!refs.find((r) => String(r.value) === val)) {
          let code = 'อ้างอิงข้อมูลเดิม';
          if (typeof jobToEdit.contract === 'object' && jobToEdit.contract.code) code = jobToEdit.contract.code;
          else if (jobToEdit.contract_code) code = jobToEdit.contract_code;
          else if (jobToEdit.contractCode) code = jobToEdit.contractCode;
          
          refs.unshift({ value: val, label: `สัญญา: ${code}` });
        }
      }
    }

    if (!referenceSearch) return refs;
    const lower = referenceSearch.toLowerCase();
    return refs.filter((r) => r.label.toLowerCase().includes(lower));
  }, [availableAssessments, availableContracts, referenceSearch, mode, jobToEdit]);

  const bookedSlots = useMemo(() => {
    if (!selectedVehicleId || !workDate) return [];
    return jobs
      .filter(
        (job) =>
          job.id !== jobToEdit?.id &&
          job.vehicle_id === selectedVehicleId &&
          new Date(job.start_time).toISOString().substring(0, 10) === workDate
      )
      .map((job) => {
        const tech = job.primary_technician;
        const techName = tech
          ? `${tech.first_name || ''} ${tech.last_name || ''}`.trim() || '-'
          : '-';
        return {
          start: new Date(job.start_time).toTimeString().substring(0, 5),
          end: new Date(job.end_time).toTimeString().substring(0, 5),
          customer: techName,
        };
      })
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [selectedVehicleId, workDate, jobs, jobToEdit]);

  const hasPrefilledRefRef = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== 'add' || !initialContractId) return;
    if (packages.length === 0) return;
    if (hasPrefilledRefRef.current === initialContractId) return;
    hasPrefilledRefRef.current = initialContractId;
    handleReferenceChange(initialContractId);
  }, [mode, initialContractId, packages.length]);

  const hasPrefilledCustomerRef = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== 'add' || !defaultCustomerId) return;
    if (hasPrefilledCustomerRef.current === defaultCustomerId) return;
    hasPrefilledCustomerRef.current = defaultCustomerId;
    handleCustomerChange(defaultCustomerId, true);
  }, [mode, defaultCustomerId]);

  useEffect(() => {
    if (mode === 'add' && initialWorkDateIso) {
      const d = new Date(initialWorkDateIso);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  }, [mode, initialWorkDateIso]);

  const handleCustomerChange = async (customerId: string, skipReset = false) => {
    if (customerId === selectedCustomerId) return;
    
    setSelectedCustomerId(customerId);
    const customer = customers.find((c) => c.id === customerId);
    if (customer) setSelectedCustomerData(customer);

    if (!skipReset) {
      setSelectedReference('');
      setWorkAreas([]);
    }

    setFetchedAssessments([]);
    setFetchedContracts([]);
    setFetchedInvoices([]);

    if (customerId) {
      try {
        const fullCustomer = await CustomerApi.getCustomerById(customerId);
        if (fullCustomer) {
          const customerData = ((fullCustomer as unknown as Record<string, unknown>).data || fullCustomer) as Customer;
          setSelectedCustomerData(customerData);
        }

        Promise.all([
          AssessmentApi.getAll({ customer_id: customerId }),
          ContractApi.getAll({ customer_id: customerId }),
          InvoiceApi.getAll({ customer_id: customerId }),
        ])
          .then(([assessmentRes, contractRes, invoiceRes]) => {
            setFetchedAssessments(assessmentRes.data || []);
            setFetchedContracts(contractRes.data || []);
            setFetchedInvoices(invoiceRes.data || []);
          })
          .catch((err) => console.error('Error fetching customer documents:', err));
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let assessment = availableAssessments.find((a) => String(a.id) === String(assessmentId)) as Record<string, any> | undefined;

      // Fetch full assessment to get site_image_url per area
      try {
        const fullRes: any = await AssessmentApi.getById(assessmentId);
        const fullAssessment = fullRes.data || fullRes;
        if (fullAssessment?.assessment_areas) {
          // Override assessment areas with full data (includes site_image_url)
          assessment = { ...assessment, assessment_areas: fullAssessment.assessment_areas };
        }
      } catch (err) {
        console.error('Error fetching full assessment:', err);
      }

      if (assessment && assessment.assessment_areas && assessment.assessment_areas.length > 0) {
        const system = assessment.assessment_areas[0].service_system;
        if (system) setServiceSystem(system);

        const areas = assessment.assessment_areas.map((area, index) => {
          let exactPackageId = assessment.package_id;
          if (area.package_price_id) {
             const matchedPkg = packages.find(p => p.package_prices?.some(price => String(price.id) === String(area.package_price_id)));
             if (matchedPkg) exactPackageId = matchedPkg.id;
          }

          return {
            id: `area-${Date.now()}-${index}`,
            area_name: area.area_name,
            area_size: area.area_size ? Number(area.area_size) : undefined,
            building_type: area.building_type,
            building_type_other: area.building_type_other || '',
            service_system: area.service_system,
            service_system_other: area.service_system_other || '',
            category_other: area.category_other || '',
            package_price: area.package_price ? Number(area.package_price) : undefined,
            total_price: area.total_price ? Number(area.total_price) : undefined,
            items: area.items || [],
            category_services: area.category_services || [],
            package_id: exactPackageId,
            package_price_id: area.package_price_id,
            package_type: area.package_type as PackageType,
            site_image_id: area.site_image_id || null,
            site_image_url: area.site_image_url || null,
          };
        });
        setWorkAreas(areas);

        // Populate site_image_url for areas that have site_image_id but no URL
        const needUrl = areas.filter((a: Record<string, unknown>) => a.site_image_id && !a.site_image_url);
        if (needUrl.length > 0) {
          Promise.all(
            needUrl.map(async (a: Record<string, unknown>) => {
              try {
                const result = await StorageApi.getSignedUrl(a.site_image_id as string);
                const url = (result as Record<string, unknown>)?.url || ((result as Record<string, unknown>)?.data as Record<string, unknown>)?.url;
                return { id: a.id, url };
              } catch {
                return { id: a.id, url: null };
              }
            })
          ).then((results) => {
            setWorkAreas((prev) => prev.map((p) => {
              const match = results.find((r) => r.id === p.id);
              return match?.url ? { ...p, site_image_url: match.url as string } : p;
            }));
          });
        }
      }
    } else if (reference.startsWith('cnt-')) {
      const contractId = reference.replace('cnt-', '');
      try {
        const contractRes = await ContractApi.getById(contractId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contract = ((contractRes as unknown as Record<string, unknown>).data || contractRes) as Record<string, any>;
        const contractAreas = contract?.contract_areas || contract?.areas || [];

        if (contractAreas.length > 0) {
          const system = contractAreas[0].service_system;
          if (system) setServiceSystem(system);

          const areas = contractAreas.map((area: any, index: number) => {
            // ดึง package_id จาก packagePriceRelation.package หรือ match จาก packages list
            let exactPackageId = area.packagePriceRelation?.package?.id || contract.package_id;
            if (!exactPackageId && area.package_price_id) {
              const matchedPkg = packages.find(p => p.package_prices?.some((price: any) => String(price.id) === String(area.package_price_id)));
              if (matchedPkg) exactPackageId = matchedPkg.id;
            }

            // ดึง package_type จาก area หรือ detect จาก packagePriceRelation
            let pkgType = area.package_type;
            if (!pkgType && area.packagePriceRelation) {
              const rel = area.packagePriceRelation;
              const price = Number(area.package_price) || 0;
              if (price === Number(rel.price_with_termite)) pkgType = 'WITH_TERMITE';
              else if (price === Number(rel.price_without_termite)) pkgType = 'WITHOUT_TERMITE';
            }

            return {
              id: `area-${Date.now()}-${index}`,
              area_name: area.area_name,
              area_size: area.area_size ? Number(area.area_size) : undefined,
              building_type: area.building_type,
              building_type_other: area.building_type_other || '',
              service_system: area.service_system,
              service_system_other: area.service_system_other || '',
            category_other: area.category_other || '',
              package_price: area.package_price ? Number(area.package_price) : undefined,
              total_price: area.total_price ? Number(area.total_price) : undefined,
              items: area.items || [],
              category_services: area.category_services || [],
              package_id: exactPackageId,
              package_price_id: area.package_price_id,
              package_type: pkgType as PackageType,
              service_count: area.service_count,
            };
          });
          setWorkAreas(areas);

          // ดึง package จาก contract areas → เพิ่มเข้า packages state ถ้ายังไม่มี
          const newPackages: Package[] = [];
          for (const area of contractAreas) {
            const pkg = area.packagePriceRelation?.package;
            if (pkg && !packages.find(p => String(p.id) === String(pkg.id)) && !newPackages.find(p => String(p.id) === String(pkg.id))) {
              newPackages.push({ ...pkg, package_prices: [area.packagePriceRelation] });
            }
          }
          if (newPackages.length > 0) {
            setPackages(prev => [...prev, ...newPackages]);
          }
        }
      } catch (error) {
        console.error('Error fetching contract details:', error);
      }
    }
  };

  const handleInvoiceChange = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);

    if (!selectedReference && invoiceId) {
      try {
        const invoice = await InvoiceApi.getById(invoiceId);
        if (invoice && invoice.items && invoice.items.length > 0) {
          const areas = invoice.items.map((item: any, index: number) => ({
            id: `area-${Date.now()}-${index}`,
            area_name: item.description,
            service_package: item.product?.name || '',
          }));
          setWorkAreas(areas);
        }
      } catch (error) { console.error('Error fetching invoice details:', error); }
    }
  };

  const createJobObject = (status: JobMainStatus) => {
    const startDateTime = new Date(`${workDate}T${startTime}`).toISOString();
    const endDateTime = new Date(`${workDate}T${endTime}`).toISOString();
    const finalStatus = status;

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
      ...(jobToEdit ? { id: jobToEdit.id } : {}),
      assessment_id: assessmentId || undefined,
      contract_id: contractId || undefined,
      invoice_id: selectedInvoiceId || undefined,
      customer_id: selectedCustomerId,
      primary_tech_id: leadTechnicianId,
      appointment_date: new Date(workDate),
      start_date: new Date(startDateTime),
      end_date: new Date(endDateTime),
      service_system: serviceSystem,
      remark: operationDetails,
      operation_details: operationDetailsText,
      vehicle_id: selectedVehicleId,
      status: finalStatus,
      work_areas: workAreas,
      team_member: uniqueTechnicianIds.map((uid) => ({
        user_id: uid,
        check_in: null!,
        check_out: null!,
      })),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeConflictError) return;
    if (!leadTechnicianId) {
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาเลือกหัวหน้าช่าง' });
      setCurrentStep(2);
      return;
    }
    
    const currentStatus = jobToEdit?.api_status || jobToEdit?.status || JobMainStatus.PENDING;
    const jobData = createJobObject(currentStatus as JobMainStatus);
    
    if (jobData) {
      setIsSubmitting(true);
      try {
        if (jobData.assessment_id) {
          const assessmentPayload = {
            assessment_areas: workAreas.map((area: any, idx: number) => ({
              id: String(area.id).startsWith('area-') ? undefined : area.id,
              assessment_id: jobData.assessment_id,
              sequence: idx + 1,

              area_name: area.area_name,
              building_type: area.building_type,
              building_type_other: area.building_type_other || undefined,
              service_system: area.service_system,
              service_system_other: area.service_system_other || undefined,
              category_other: area.category_other || undefined,
              area_size: area.area_size,

              package_price_id: area.package_price_id,
              package_price: area.package_price,
              package_type: area.package_type,
              base_service_price: area.base_service_price || area.package_price,
              total_price: area.total_price,
              site_image_id: area.site_image_id || undefined,

              category_services: area.category_services,

              items: (area.items || []).map((it: any) => ({
                product_id: it.product_id,
                product_name: it.product_name,
                product_price: it.product_price,
                quantity: it.quantity,
                unit_id: it.unit_id || undefined,
                total_price: it.total_price,
              })),
            })) as Record<string, unknown>[],
            
            total_price: workAreas.reduce((sum, a) => sum + (Number(a.total_price) || 0), 0)
          };

          await AssessmentApi.update(jobData.assessment_id, assessmentPayload as unknown as Partial<Assessment>);
        }

        await onSubmitJob(jobData, jobData.assessment_id);

        // Upload/remove per-area site images
        if (jobData.assessment_id) {
          try {
            const savedRes = await AssessmentApi.getById(jobData.assessment_id) as unknown as Record<string, unknown>;
            const savedAssessment = (savedRes?.data || savedRes) as Record<string, unknown>;
            const savedAreas = (savedAssessment?.assessment_areas || []) as Array<Record<string, unknown>>;

            for (let i = 0; i < workAreas.length; i++) {
              const area = workAreas[i] as unknown as Record<string, unknown>;
              const savedArea = savedAreas[i];
              if (!savedArea) continue;
              const areaId = savedArea.id as string;

              if (area.siteImageFile) {
                // Delete old image if exists
                if (savedArea.site_image_id) {
                  await StorageApi.remove(savedArea.site_image_id as string).catch(() => {});
                }
                const uploadResult = await StorageApi.upload({
                  file: area.siteImageFile as File,
                  path: `assessments/${jobData.assessment_id}/areas/${areaId}`,
                  entity_type: 'assessment_area',
                  entity_id: areaId,
                  type: 'site_image',
                  visibility: 'private',
                });
                const resultData = uploadResult as unknown as Record<string, unknown>;
                const storageId = (resultData?.data as Record<string, unknown>)?.id || resultData?.id;
                if (storageId) {
                  await AssessmentApi.updateArea(areaId, { site_image_id: storageId }).catch(() => {});
                }
              } else if (!area.siteImagePreview && !area.site_image_url && savedArea.site_image_id) {
                // User removed image
                await StorageApi.remove(savedArea.site_image_id as string).catch(() => {});
                await AssessmentApi.updateArea(areaId, { site_image_id: null }).catch(() => {});
              }
            }
          } catch (uploadErr) {
            console.error('Area image upload failed:', uploadErr);
          }
        }

        onCancel();

      } catch (error) {
        console.error('Error handling job submission:', error);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleLeadTechnicianChange = (id: string) => {
    setLeadTechnicianId(id);
    if (selectedTechnicianIds.includes(id)) {
      setSelectedTechnicianIds((prev) => prev.filter((techId) => techId !== id));
    }
  };

  const handleTechnicianToggle = (techId: string) => {
    setSelectedTechnicianIds((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );
  };


  const handleAreaChange = (index: number, updatedArea: Partial<any>) => {
    setWorkAreas((prev) => {
      const newAreas = [...prev];
      let newArea = { ...newAreas[index], ...updatedArea };
      
      if (newArea.package_price !== undefined) {
        newArea.base_service_price = newArea.package_price;
      }
      
      newAreas[index] = newArea;
      return newAreas;
    });
  };

  const handleClearArea = (index: number) => {
    setWorkAreas((prev) => {
      const newAreas = [...prev];
      const areaToClear = newAreas[index];
      if (areaToClear) {
        newAreas[index] = { id: areaToClear.id, area_name: areaToClear.area_name };
      }
      return newAreas;
    });
  };

  const handleAddArea = () => {
    setWorkAreas((prev) => [...prev, {
      id: `area-${Date.now()}`,
      area_name: `พื้นที่ ${prev.length + 1}`,
      area_size: undefined,
      items: [],
      category_services: [],
      total_price: 0,
    }]);
  };

  const handleRemoveArea = (index: number) => {
    setWorkAreas(prev => prev.filter((_, i) => i !== index));
  };

  const getTechnicianName = (tech: User | any) => {
    if (tech.name) return tech.name;
    if (tech.first_name) return `${tech.first_name} ${tech.last_name || ''}`.trim();
    return tech.username || tech.email || tech.phone || 'Unknown';
  };

  const additionalTechnicians = useMemo(
    () => additionalTechnicianOptions.filter((tech) => tech.id !== leadTechnicianId),
    [additionalTechnicianOptions, leadTechnicianId]
  );

  const steps = [
    { id: 0, label: 'ข้อมูลลูกค้า & กำหนดการ', icon: <UserIcon className="w-5 h-5" />, isValid: !!selectedCustomerId && !!workDate && !!startTime && !!endTime && (!startTime || !endTime || endTime > startTime) },
    { id: 1, label: 'รายละเอียดบริการ', icon: <DocumentIcon className="w-5 h-5" />, isValid: true },
    { id: 2, label: 'ทีมช่าง & ยานพาหนะ', icon: <TruckIcon className="w-5 h-5" />, isValid: !!leadTechnicianId && !!selectedVehicleId && !timeConflictError },
  ];

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (steps[currentStep].isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      setVisitedSteps((prev) => [...new Set([...prev, currentStep + 1])]);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Steps Header */}
      <div className="mb-8">
        <div className="relative after:absolute after:inset-x-0 after:top-1/2 after:block after:h-0.5 after:-translate-y-1/2 after:rounded-lg after:bg-slate-100">
          <ol className="relative z-10 flex justify-between text-sm font-medium text-slate-500">
            {steps.map((step, index) => {
              const isCompleted = visitedSteps.includes(index) && step.isValid;
              const isCurrent = currentStep === index;
              return (
                <li key={step.id} className="flex items-center gap-2 bg-white p-2">
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${isCurrent ? 'border-primary bg-primary text-white' : isCompleted ? 'border-green-500 bg-green-500 text-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                    {isCompleted && !isCurrent ? <CheckCircleIcon className="w-5 h-5" /> : <span className="text-sm font-bold">{index + 1}</span>}
                  </span>
                  <span className={`${isCurrent ? 'text-primary font-bold' : isCompleted ? 'text-green-600' : 'text-slate-500'}`}>{step.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {isLoadingData && (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-[40vh] py-16">
          <LoadingIcon className="w-10 h-10 animate-spin mb-4 text-primary" />
          <p className="text-base font-medium text-slate-500">กำลังดึงข้อมูล...</p>
        </div>
      )}

      <form id="job-form" onSubmit={handleSubmit} noValidate className={`space-y-6 flex-1 ${isLoadingData ? 'hidden' : ''}`}>
        {/* STEP 0: Customer & Schedule */}
        <div className={currentStep === 0 ? 'block animate-fadeIn' : 'hidden'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
              <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary"><UserIcon className="w-5 h-5" /></div>ข้อมูลลูกค้า
              </h3>
              <div className="space-y-6 flex-1 flex flex-col">
                <SearchableSelect label="ค้นหาลูกค้า" options={filteredCustomers.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name} ${c.nickname ? `(${c.nickname})` : ''}`, description: c.primary_phone || '' }))} value={selectedCustomerId} onChange={handleCustomerChange} onSearchChange={setCustomerSearch} placeholder="เลือกลูกค้า" searchPlaceholder="ค้นหาชื่อลูกค้า, เบอร์โทรศัพท์" required disabled={mode === 'edit'} />
                {selectedCustomerData ? (
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-700 shadow-sm">{selectedCustomerData.first_name?.[0]}</div>
                        <div>
                          <h4 className="text-base font-bold text-slate-800">{selectedCustomerData.first_name} {selectedCustomerData.last_name}</h4>
                          {selectedCustomerData.nickname && <span className="text-xs text-slate-500 font-medium bg-white px-2 py-0.5 rounded-full border border-slate-200 inline-block mt-1">ชื่อเล่น: {selectedCustomerData.nickname}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 space-y-3">
                      {selectedCustomerData.primary_phone && (
                        <div className="flex items-center gap-3 text-sm text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm"><PhoneIcon className="w-4 h-4 text-slate-400" /><span className="font-medium">{selectedCustomerData.primary_phone}</span></div>
                      )}
                      <div className="flex items-start gap-3 text-sm text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                        <MapPinIcon className="w-4 h-4 text-slate-400 mt-0.5" />
                        <span className="leading-relaxed">{[selectedCustomerData.address_house_no, selectedCustomerData.sub_district, selectedCustomerData.district, selectedCustomerData.province, selectedCustomerData.postal_code].filter(Boolean).join(' ') || '-'}</span>
                      </div>
                      {selectedCustomerData.google_map_link && (
                        <a
                          href={selectedCustomerData.google_map_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-sm text-primary bg-primary/5 p-2.5 rounded-lg border border-primary/20 shadow-sm hover:bg-primary/10 transition-colors"
                        >
                          <MapPinIcon className="w-4 h-4 text-primary" />
                          <span className="font-medium underline truncate">{selectedCustomerData.google_map_link}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center flex-1">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3"><UserIcon className="w-6 h-6 text-slate-300" /></div>
                    <p className="text-slate-500 font-medium">กรุณาเลือกลูกค้า</p>
                    <p className="text-xs text-slate-400 mt-1">เพื่อดำเนินการต่อในขั้นตอนถัดไป</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
              <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><CalendarIcon className="w-5 h-5" /></div>กำหนดการปฏิบัติงาน
              </h3>
              <div className="space-y-6">
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                  <FormField label="วันที่ปฏิบัติงาน *" htmlFor="work-date" className="mb-0">
                    <DatePicker
                      id="work-date"
                      selected={workDate ? new Date(workDate) : null}
                      onChange={(date: Date | null) => { if (date) { const yyyy = date.getFullYear(); const mm = String(date.getMonth() + 1).padStart(2, '0'); const dd = String(date.getDate()).padStart(2, '0'); setWorkDate(`${yyyy}-${mm}-${dd}`); } else { setWorkDate(''); } }}
                      minDate={mode === 'add' ? new Date() : undefined}
                      disabled={mode === 'edit'}
                      required
                      wrapperClassName="w-full"
                      placeholderText="dd/mm/yyyy"
                      dateFormat="dd/MM/yyyy"
                      locale="th"
                      className={`w-full h-12 pr-10 rounded-md border-slate-300 focus:border-primary focus:ring-primary text-slate-700 shadow-sm ${mode === 'edit' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                    <FormField label="เวลาเริ่มต้น *" htmlFor="start-time" className="mb-0">
                      <div className="relative">
                        <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="pl-3 h-12 text-left font-medium [&::-webkit-datetime-edit-ampm-field]:hidden" />
                      </div>
                    </FormField>
                  </div>
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                    <FormField label="เวลาสิ้นสุด *" htmlFor="end-time" className="mb-0">
                      <div className="relative">
                        <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className={`pl-3 h-12 text-left font-medium [&::-webkit-datetime-edit-ampm-field]:hidden ${startTime && endTime && endTime <= startTime ? 'border-red-500 focus:ring-red-500' : ''}`} />
                      </div>
                      {startTime && endTime && endTime <= startTime && (
                        <p className="text-xs text-red-500 mt-1">เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น</p>
                      )}
                    </FormField>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1: Service Details */}
        <div className={currentStep === 1 ? 'block animate-fadeIn' : 'hidden'}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SearchableSelect label="อ้างอิง (ใบประเมิน/สัญญา)" options={filteredReferences} value={selectedReference} onChange={handleReferenceChange} onSearchChange={setReferenceSearch} placeholder={selectedCustomerId ? 'เลือกรายการอ้างอิง...' : 'กรุณาเลือกลูกค้าก่อน'} className={!selectedCustomerId ? 'opacity-50 pointer-events-none' : ''} />
              <SearchableSelect label="อ้างอิงใบแจ้งหนี้ (ถ้ามี)" options={filteredInvoices} value={selectedInvoiceId} onChange={handleInvoiceChange} onSearchChange={setInvoiceSearch} placeholder={selectedCustomerId ? 'เลือกใบแจ้งหนี้...' : 'กรุณาเลือกลูกค้าก่อน'} className={!selectedCustomerId ? 'opacity-50 pointer-events-none' : ''} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="รายละเอียดการปฏิบัติงาน" htmlFor="operation-details">
                <Textarea id="operation-details" name="operationDetails" value={operationDetailsText} onChange={(e) => setOperationDetailsText(e.target.value)} placeholder="รายละเอียดขั้นตอนการปฏิบัติงาน เช่น วิธีการดำเนินงาน สารเคมีที่ใช้ ฯลฯ" rows={3} className="bg-slate-50 focus:bg-white transition-colors" />
              </FormField>
              <FormField label="หมายเหตุ หรือข้อควรระวัง" htmlFor="remark">
                <Textarea id="remark" name="remark" value={operationDetails} onChange={(e) => setOperationDetails(e.target.value)} placeholder="หมายเหตุเพิ่มเติม หรือข้อควรระวัง" rows={3} className="bg-slate-50 focus:bg-white transition-colors" />
              </FormField>
            </div>

            {/* Invoice Summary — แสดงเมื่อเลือก contract (card layout เหมือน WorkAreaForm) */}
            {selectedReference.startsWith('cnt-') && (() => {
              const contractId = selectedReference.replace('cnt-', '');
              const contractInvoices = fetchedInvoices.filter((inv: any) => inv.contract_id === contractId);
              const contractRef = availableContracts.find((c: any) => String(c.id) === contractId);
              const cRef = contractRef as unknown as Record<string, unknown>;
              const installments = [...((cRef?.installments || cRef?.contract_installments || []) as Record<string, unknown>[])]
                .sort((a: any, b: any) => (a.installment_no || a.term || 0) - (b.installment_no || b.term || 0));

              if (installments.length === 0 && contractInvoices.length === 0) return null;

              const totalOutstanding = contractInvoices
                .filter((inv: any) => ['PENDING', 'PARTIAL', 'OVERDUE', 'SENT'].includes(String(inv.status).toUpperCase()))
                .reduce((sum: number, inv: Invoice) => sum + (Number(inv.total) - Number((inv as unknown as Record<string, number>).paid_amount || 0)), 0);

              const getStatusConfig = (status: string) => {
                switch (status) {
                  case 'PAID': return { label: 'จ่ายแล้ว', color: 'bg-green-100 text-green-700 border-green-200', border: 'border-l-green-500' };
                  case 'PARTIAL': return { label: 'จ่ายบางส่วน', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', border: 'border-l-yellow-500' };
                  case 'OVERDUE': return { label: 'เกินกำหนด', color: 'bg-red-100 text-red-700 border-red-200', border: 'border-l-red-500' };
                  case 'PENDING': case 'SENT': return { label: 'ค้างชำระ', color: 'bg-orange-100 text-orange-700 border-orange-200', border: 'border-l-orange-500' };
                  case 'CARRIED_OVER': return { label: 'ทบยอดแล้ว', color: 'bg-slate-100 text-slate-600 border-slate-200', border: 'border-l-slate-400' };
                  case 'CANCELLED': return { label: 'ยกเลิก', color: 'bg-slate-100 text-slate-400 border-slate-200', border: 'border-l-slate-300' };
                  default: return { label: 'ยังไม่ออกบิล', color: 'bg-blue-50 text-blue-600 border-blue-200', border: 'border-l-blue-400' };
                }
              };

              // สร้าง list: ใช้ installments ถ้ามี ไม่งั้นใช้ invoices
              const items = installments.length > 0
                ? installments.map((inst: any, idx: number) => {
                    const term = inst.installment_no || inst.term || idx + 1;
                    const invoice = contractInvoices.find((inv: any) => inv.term === term);
                    const status = invoice ? String(invoice.status).toUpperCase() : 'NOT_ISSUED';
                    return { term, invoice, status, amount: Number(inst.amount || invoice?.total || 0) };
                  })
                : [...contractInvoices]
                    .sort((a: any, b: any) => (a.term || 0) - (b.term || 0))
                    .map((inv: any) => ({
                      term: inv.term || 0, invoice: inv, status: String(inv.status).toUpperCase(), amount: Number(inv.total || 0),
                    }));

              return (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-4">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                      สถานะการชำระเงิน
                    </h3>
                    <div className="text-xs text-slate-500">{items.length} งวด</div>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-slate-100/80 text-xs text-slate-500 uppercase tracking-wider">
                          <th className="px-4 py-2.5 text-left font-semibold">งวด</th>
                          <th className="px-4 py-2.5 text-left font-semibold">เลขที่ใบแจ้งหนี้</th>
                          <th className="px-4 py-2.5 text-right font-semibold">ยอดเงิน</th>
                          <th className="px-4 py-2.5 text-right font-semibold">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {items.map((item: any, idx: number) => {
                          const cfg = getStatusConfig(item.status);
                          const isSelected = selectedInvoiceId && item.invoice?.id === selectedInvoiceId;

                          return (
                            <tr key={idx} className={`transition-colors ${isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : 'hover:bg-slate-50/50'}`}>
                              <td className="px-4 py-3 text-sm font-medium text-slate-800">
                                {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2"></span>}
                                งวดที่ {item.term}
                              </td>
                              <td className={`px-4 py-3 text-sm font-semibold ${isSelected ? 'text-primary' : 'text-primary/70'}`}>{item.invoice?.code || <span className="text-slate-300">—</span>}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-slate-800">{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</td>
                              <td className="px-4 py-3 text-right"><span className={`text-xs font-medium px-2.5 py-1 rounded-full border inline-block ${cfg.color}`}>{cfg.label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><MapPinIcon className="w-5 h-5 text-slate-400" />รายละเอียดพื้นที่บริการ</h3>
                {selectedReference && (
                  <div className="text-xs font-medium px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                    อ้างอิง: {isAssessment ? 'ใบประเมิน ' : 'สัญญา '}
                    {isAssessment ? availableAssessments.find(a => String(a.id) === selectedReference.replace('asm-', ''))?.code : availableContracts.find(c => String(c.id) === selectedReference.replace('cnt-', ''))?.code}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {selectedCustomerId ? (
                  <>
                    {!selectedReference || mode === 'edit' ? (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500">จำนวนพื้นที่: <strong className="text-slate-800">{workAreas.length}</strong> พื้นที่</span>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4">
                      {workAreas.map((area, index) => (
                        <div key={area.id || index} className="relative">
                          {!!selectedReference && mode !== 'edit' && (
                            <div className="absolute inset-0 z-10 bg-slate-50/30 rounded-lg cursor-not-allowed" title="ข้อมูลจากเอกสารอ้างอิง ไม่สามารถแก้ไขได้"></div>
                          )}
                          <WorkAreaForm
                            area={area}
                            index={index}
                            onAreaChange={handleAreaChange}
                            onClearArea={handleClearArea}
                            onRemoveArea={(!selectedReference || mode === 'edit') ? handleRemoveArea : undefined}
                            products={products}
                            categories={categories}
                            availablePackages={packages}
                            selectedPackage={packages.find((p) => String(p.id) === String(area.package_id)) || null}
                            onSelectPackage={(pkgId) => {
                              handleAreaChange(index, { package_id: pkgId });
                            }}
                            isEditing={mode === 'edit' && String(jobToEdit?.api_status || '').toUpperCase() !== 'UNASSIGNED'}
                          />
                        </div>
                      ))}

                      {workAreas.length === 0 && !selectedReference && (
                        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200 text-slate-400">ยังไม่มีพื้นที่ให้บริการ กด "เพิ่มพื้นที่" เพื่อเริ่มต้น</div>
                      )}

                      {selectedReference && workAreas.length === 0 && (
                        <div className="text-center p-4 text-slate-500">กำลังดึงข้อมูลพื้นที่จากเอกสารอ้างอิง... หรือเอกสารนี้ไม่มีพื้นที่ระบุไว้</div>
                      )}
                    </div>

                    <div className="flex justify-center mt-4">
                      <button type="button" onClick={handleAddArea} className="flex items-center gap-2 px-6 py-2.5 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 hover:shadow-sm transition-all font-medium">
                        <PlusIcon className="h-5 w-5" />เพิ่มพื้นที่ให้บริการ
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8 text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                    กรุณาเลือกลูกค้าก่อนกำหนดพื้นที่
                  </div>
                )}
              </div>
            </div>

            {/* รูปภาพอยู่ใน WorkAreaForm แต่ละ area แล้ว */}
          </div>
        </div>

        {/* STEP 2: Team & Vehicle */}
        <div className={currentStep === 2 ? 'block animate-fadeIn' : 'hidden'}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2"><div className="p-2 bg-slate-100 rounded-lg text-slate-600"><TruckIcon className="w-5 h-5" /></div>ยานพาหนะ</h3>
                <div className="space-y-4">
                  <SearchableSelect 
                    label="เลือกรถที่ปฏิบัติงาน"
                    options={filteredVehicles} 
                    value={selectedVehicleId} 
                    onChange={setSelectedVehicleId} 
                    onSearchChange={setVehicleSearch} 
                    placeholder="ค้นหารถบริการ..."
                    disabled={isDisableTeamEdit}
                    required 
                  />
                  {timeConflictError && (<div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-start gap-2"><span className="text-lg">⚠️</span><p>{timeConflictError}</p></div>)}
                  {bookedSlots.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
                      <p className="font-semibold text-amber-800 mb-1">ช่วงเวลาที่ไม่ว่างสำหรับรถคันนี้:</p>
                      <ul className="list-disc list-inside mt-1 text-amber-700 space-y-1">{bookedSlots.map((slot) => (<li key={slot.start}>{slot.start} - {slot.end} ({slot.customer})</li>))}</ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2"><div className="p-2 bg-primary/10 rounded-lg text-primary"><UserIcon className="w-5 h-5" /></div>หัวหน้าทีม (Leader)</h3>
                <div className="mb-4">
                  <SearchableSelect 
                  label="หัวหน้าช่าง"
                  name="primary_tech_id" 
                  options={leadTechnicianOptions.map((tech) => ({ value: tech.id, label: `${getTechnicianName(tech)} ${tech.nick_name ? `(${tech.nick_name})` : ''}`, description: tech.phone || '' }))} 
                  value={leadTechnicianId} 
                  onChange={handleLeadTechnicianChange} 
                  onSearchChange={setLeadTechSearch} 
                  placeholder="ค้นหาหัวหน้าช่าง..." 
                  disabled={isDisableTeamEdit}
                  required 
                />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2"><div className="p-2 bg-slate-100 rounded-lg text-slate-600"><UserIcon className="w-5 h-5" /></div>ลูกทีม (Members)</h3>
              <div className="mb-6">
                <Input 
                  placeholder="ค้นหาช่างเพิ่มเติม..." 
                  value={additionalTechSearch} 
                  onChange={(e) => setAdditionalTechSearch(e.target.value)} 
                  className={`transition-all ${isDisableTeamEdit ? '' : 'bg-slate-50 border-slate-200 focus:bg-white'}`}
                  disabled={isDisableTeamEdit}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {additionalTechnicians.map((tech) => (
                  <label key={tech.id} className={`relative flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 group ${isDisableTeamEdit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${selectedTechnicianIds.includes(tech.id) ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20' : `bg-white border-slate-200 ${isDisableTeamEdit ? '' : 'hover:border-slate-300 hover:shadow-md'}`}`}>
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedTechnicianIds.includes(tech.id)}
                        onChange={() => handleTechnicianToggle(tech.id)}
                        className={`w-5 h-5 rounded transition-colors ${isDisableTeamEdit ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'text-primary border-slate-300 focus:ring-primary cursor-pointer'}`}
                        disabled={isDisableTeamEdit}
                      />
                    </div>
                    <div className="flex flex-col"><span className={`font-semibold transition-colors ${selectedTechnicianIds.includes(tech.id) ? 'text-primary' : 'text-slate-700'}`}>{getTechnicianName(tech)}</span>{tech.nick_name && (<span className="text-xs text-slate-500 font-medium">({tech.nick_name})</span>)}{tech.phone && (<span className="text-xs text-slate-400 mt-1">{tech.phone}</span>)}</div>
                  </label>
                ))}
              </div>
              {additionalTechnicians.length === 0 && (<div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200"><p className="text-slate-400">ไม่พบรายชื่อช่างอื่นๆ</p></div>)}
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex justify-between items-center w-full pt-6 mt-6 border-t border-slate-200">
          <div className="text-slate-500 font-medium">ขั้นตอนที่ {currentStep + 1} จาก {steps.length}</div>
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button type="button" onClick={handlePrevStep} variant="outline" className="px-6 !h-10 border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 text-base font-bold rounded-lg">
                <ArrowLeftIcon className="w-4 h-4" />ย้อนกลับ
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={handleNextStep} variant="primary" disabled={!steps[currentStep].isValid} className="px-8 !h-10 bg-green-600 hover:bg-green-700 text-white border-transparent flex items-center justify-center gap-2 shadow-md text-lg font-bold rounded-xl">
                ถัดไป<ArrowRightIcon className="w-4 h-4 stroke-[2] mt-0.5" />
              </Button>
            ) : (
              <Button type="submit" variant="primary" disabled={!steps[currentStep].isValid || !!timeConflictError || isSubmitting} className="px-8 !h-10 bg-green-600 hover:bg-green-700 text-white border-transparent flex items-center justify-center gap-2 shadow-md text-lg font-bold rounded-xl">
                {isSubmitting ? 'กำลังบันทึก...' : mode === 'edit' ? 'บันทึกการแก้ไข' : 'สร้างนัดหมาย'}
                {!isSubmitting && <CheckCircleIcon className="w-4 h-4 stroke-[2] mt-0.5" />}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};