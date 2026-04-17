// ===== React =====
import Swal from 'sweetalert2';
import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import DatePicker from '@/src/components/common/BuddhistDatePicker';

// ===== Types / Enums =====
import { CategoryType, Quotation } from '../../../types';
import { Customer } from '../../../types/entity/customer.interface';
import { InstallmentPlan } from '../../../types/entity/financial.interface';
import InstallmentSection from '../../common/InstallmentSection';
import { ContractStatus } from '../../../types/enums/contract';
import { QuotationStatus } from '@/src/types/enums/quotaton';

// ===== Context =====
import { useData } from '../../../contexts/DataContext';

// ===== Components =====
import {
  FormField,
  Input,
  Select,
  Button,
  Textarea,
} from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';

// ===== API =====
import { CategoryApi } from '../../../api/category';
import { CustomerApi } from '../../../api/customer';
import { QuotationApi } from '../../../api/quotation';
import { ContractApi } from '../../../api/contract';
import { PackageApi } from '../../../api/package';

// ===== WorkAreaForm =====
import WorkAreasSection from '../../common/WorkAreasSection';
import { ServiceScheduleApi } from '../../../api/service-schedule';
import type { ServiceSchedule } from '../../../api/service-schedule';
import { Package } from '../../../types/entity/package.interface';
import { ContractDuration, ContractDurationLabel, calcContractEndDate } from '@/src/types/enums/package';

// ===== Assets =====
import {
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  HomeIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  LoadingIcon,
} from '../../../assets/icons/Icons';

// Interface
import { Contract } from '@/src/types/entity/contract.interface';


export interface ContractArea {
  id?: string;
  package_price_id?: string;
  sequence?: number;
  area_name: string;
  building_type?: string;
  building_type_other?: string;
  service_system?: string;
  service_system_other?: string;
  category_other?: string;
  service_count?: string;
  area_size: number;
  measurement_unit?: string;
  total_price: number;
  package_price?: number | null;
  package_type?: string;
  site_image_id?: string;

  category_service?: ContractAreaCategory[];
}

export interface ContractAreaCategory {
  id?: string;
  contract_area_id: string;
  category_id: string;
}

export interface ContractFormProps {
  mode: 'create' | 'edit' | 'detail' | 'renew';
  initialValues?: Partial<Contract>;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export const ContractForm: FC<ContractFormProps> = ({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  isSaving = false,
}) => {
  const { customers, products } = useData();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(mode !== 'create');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local state for fetched data
  const [fetchedCategories, setFetchedCategories] = useState<any[]>([]);
  const [fetchedPackages, setFetchedPackages] = useState<Package[]>([]);
  const [initDataReady, setInitDataReady] = useState(false);
  const [workAreaAreas, setWorkAreaAreas] = useState<any[]>([]);

  // Contract info
  const [contractCode, setContractCode] = useState(initialValues?.code || '');
  const [status, setStatus] = useState<ContractStatus>(
    (mode === 'renew' ? ContractStatus.DRAFT : initialValues?.status) || ContractStatus.DRAFT
  );
  const [startDate, setStartDate] = useState(
    initialValues?.start_date
      ? new Date(initialValues.start_date).toISOString().substring(0, 10)
      : ''
  );
  const [endDate, setEndDate] = useState( 
    initialValues?.end_date
      ? new Date(initialValues.end_date).toISOString().substring(0, 10)
      : ''
  );
  const [contractDuration, setContractDuration] = useState(
    initialValues?.contract_duration || '1 ปี'
  );

  // References
  const [selectedQuotationId, setSelectedQuotationId] = useState(
    initialValues?.quotation_id || ''
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialValues?.customer_id || ''
  );
  const [fullQuotation, setFullQuotation] = useState<any>(null);

  const [isSeparateContract, setIsSeparateContract] = useState<boolean | null>(
    initialValues?.is_separate_contract != null ? initialValues.is_separate_contract : null
  );

  // Service info
  const [serviceLocation, setServiceLocation] = useState(
    initialValues?.service_location || ''
  );

  // Convert comma-separated string back to array if needed, or default to empty array
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>(
    initialValues?.service_type
      ? initialValues.service_type
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      : []
  );
  const [serviceType, setServiceType] = useState(
    initialValues?.service_type || ''
  );
  const [buildingType, setBuildingType] = useState(
    initialValues?.building_type || ''
  );

  // Sync serviceType string when selectedServiceTypes changes
  useEffect(() => {
    setServiceType(selectedServiceTypes.join(', '));
  }, [selectedServiceTypes]);

  const [systemUsed, setSystemUsed] = useState(
    initialValues?.system_used || ''
  );
  const [serviceCount, setServiceCount] = useState(
    initialValues?.service_count || 7
  );
  const [notes, setNotes] = useState(initialValues?.notes || '');

  // Schedule attachment
  const [scheduleId, setScheduleId] = useState(initialValues?.service_schedule_id || '');
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);

  // Pricing & VAT (เพิ่ม State สำหรับคำนวณ VAT)
  const [totalAmount, setTotalAmount] = useState(
    Number(initialValues?.total_amount) || 0
  );
  const [includeVat, setIncludeVat] = useState<boolean>(
    initialValues?.vat_amount !== undefined ? Number(initialValues.vat_amount) > 0 : true
  );

  // ถอด VAT จากยอดรวม (ถ้ายอดรวมคือ 1070 จะได้ VAT = 70)
  const vatAmount = useMemo(() => {
    return includeVat ? Number(((totalAmount * 7) / 107).toFixed(2)) : 0;
  }, [totalAmount, includeVat]);

  // Auto-recalculate totalAmount from workAreaAreas
  useEffect(() => {
    if (workAreaAreas.length === 0) return;
    const areaTotal = workAreaAreas.reduce((sum, a) => {
      return sum + (Number(a.total_price) || Number(a.package_price) || 0);
    }, 0);
    if (areaTotal > 0) {
      const newTotal = includeVat ? Number((areaTotal * 1.07).toFixed(2)) : areaTotal;
      setTotalAmount(newTotal);
    }
  }, [workAreaAreas, includeVat]);

  // Fetch schedules
  useEffect(() => {
    ServiceScheduleApi.getAll().then(setSchedules).catch(console.error);
  }, []);

  // Installment Plan
  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
  const [contractPaymentMethod, setContractPaymentMethod] = useState<'TRANSFER' | 'INSTALLMENT'>('TRANSFER');

  const selectedPackage = useMemo(() => {
    for (const area of workAreaAreas) {
      const durationFromRelation = area?.packagePriceRelation?.package;
      if (durationFromRelation?.contract_duration) return durationFromRelation as Package;
      const pkgId = area?.packagePriceRelation?.package?.id || area?.packagePriceRelation?.package_id;
      if (pkgId) {
        const fullPkg = fetchedPackages.find((p) => p.id === pkgId);
        if (fullPkg) return fullPkg;
      }
      if (area?.package_price_id) {
        const pkg = fetchedPackages.find((p: any) => (p.package_prices || []).some((pp: any) => pp.id === area.package_price_id));
        if (pkg) return pkg;
      }
    }
    return null;
  }, [workAreaAreas, fetchedPackages]);

  const isOneTimePackage = selectedPackage?.contract_duration === ContractDuration.ONE_TIME;

  useEffect(() => {
    if (!selectedPackage?.contract_duration || !startDate) return;
    const end = calcContractEndDate(startDate, selectedPackage.contract_duration);
    const endStr = end.toISOString().substring(0, 10);
    if (endStr !== endDate) {
      setEndDate(endStr);
    }
    const newLabel = ContractDurationLabel[selectedPackage.contract_duration];
    if (newLabel !== contractDuration) {
      setContractDuration(newLabel);
    }
  }, [selectedPackage?.contract_duration, startDate]);

  useEffect(() => {
    if (!isOneTimePackage) return;
    if (contractPaymentMethod !== 'INSTALLMENT') return;

    if (installments.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'แพ็กเกจแบบครั้งเดียว',
        text: 'แพ็กเกจนี้เป็นแบบ "ครั้งเดียว" ไม่สามารถแบ่งงวดได้ ต้องการล้างงวดและสลับเป็นชำระเต็มจำนวนใช่หรือไม่?',
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
      }).then((result) => {
        if (result.isConfirmed) {
          setContractPaymentMethod('TRANSFER');
          setInstallments([]);
        }
      });
    } else {
      setContractPaymentMethod('TRANSFER');
    }
  }, [isOneTimePackage]);

  // Customer Search
  const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
  const [fetchedSingleCustomer, setFetchedSingleCustomer] =
    useState<Customer | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isInitialMount = useRef(true);

  // Fetch specific customer if not found in lists
  useEffect(() => {
    if (!selectedCustomerId) return;

    const foundInContext = customers.find((c) => c.id === selectedCustomerId);
    const foundInSearch = searchedCustomers.find(
      (c) => c.id === selectedCustomerId
    );

    if (!foundInContext && !foundInSearch) {
      CustomerApi.getCustomerById(selectedCustomerId)
        .then((res) => {
          const cust = ((res as unknown as Record<string, unknown>).data || res) as Customer;
          if (cust) setFetchedSingleCustomer(cust);
        })
        .catch((err) => console.error('Error fetching customer:', err));
    }
  }, [selectedCustomerId, customers, searchedCustomers]);

  // Selected customer
  const selectedCustomer = useMemo(() => {
    return (
      customers.find((c) => c.id === selectedCustomerId) ||
      searchedCustomers.find((c) => c.id === selectedCustomerId) ||
      fetchedSingleCustomer
    );
  }, [customers, searchedCustomers, selectedCustomerId, fetchedSingleCustomer]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await CategoryApi.getCategories({
          type: CategoryType.SERVICE,
        });
        if (res && res.data) {
          setFetchedCategories(res.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();

    const fetchQuotations = async () => {
      try {
        const res = await QuotationApi.getAll({
          customer_id: selectedCustomerId,
          status: QuotationStatus.SIGNED,
          limit: 10,
        });
        if (res && res.data) {
          setQuotations(res.data);
        }
      } catch (error) {
        console.error('Error fetching quotations:', error);
      }
    };
    fetchQuotations();

    if (mode === 'create' && !initialValues) {
      const now = new Date();
      const code = `CT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      setContractCode(code);
      setStartDate(now.toISOString().substring(0, 10));
      const end = new Date(now);
      end.setFullYear(end.getFullYear() + 1);
      setEndDate(end.toISOString().substring(0, 10));

      setInstallments([
        {
          id: crypto.randomUUID(),
          term: 1,
          description: 'งวดที่ 1 - ชำระเมื่อเซ็นสัญญา',
          percentage: 30,
          amount: 0,
          due_date: '',
          status: 'PENDING' as InstallmentPlan['status'],
        },
        {
          id: crypto.randomUUID(),
          term: 2,
          description: 'งวดที่ 2 - ชำระหลังบริการครั้งที่ 3',
          percentage: 35,
          amount: 0,
          due_date: '',
          status: 'PENDING' as InstallmentPlan['status'],
        },
        {
          id: crypto.randomUUID(),
          term: 3,
          description: 'งวดที่ 3 - ชำระหลังบริการครั้งสุดท้าย',
          percentage: 35,
          amount: 0,
          due_date: '',
          status: 'PENDING' as InstallmentPlan['status'],
        },
      ]);
    } else if (mode === 'renew' && initialValues) {
      // 🌟 เพิ่ม LOGIC สำหรับ RENEW โดยเฉพาะ
      const now = new Date();

      // คำนวณวันเริ่มต้นใหม่ (อิงจากวันสิ้นสุดสัญญาเดิม + 1 วัน)
      const oldEnd = new Date(initialValues.end_date || now);
      const newStart = new Date(oldEnd);
      newStart.setDate(newStart.getDate() + 1);
      
      // วันสิ้นสุดบวก 1 ปี
      const newEnd = new Date(newStart);
      newEnd.setFullYear(newEnd.getFullYear() + 1);

      const startStr = newStart.toISOString().substring(0, 10);
      setStartDate(startStr);
      setEndDate(newEnd.toISOString().substring(0, 10));
      setStatus(ContractStatus.DRAFT);

      // จัดการงวดงาน: รีเซ็ต ID, ล้าง Due Date (ยกเว้นงวดแรก), เปลี่ยนสถานะเป็น PENDING
      if (initialValues.installments) {
        const sortedInstallments = [...initialValues.installments].sort((a: any, b: any) => {
          return (a.term || a.installment_no || 0) - (b.term || b.installment_no || 0);
        });

        setInstallments(
          sortedInstallments.map((inst: any, idx: number) => ({
            id: crypto.randomUUID(), // ล้าง ID เดิมทิ้ง!
            term: inst.term || inst.installment_no,
            description: inst.description,
            percentage: Number(inst.percentage),
            amount: Number(inst.amount),
            due_date: idx === 0 ? startStr : '', 
            status: 'PENDING' as InstallmentPlan['status'],
          }))
        );
      }
    } else if (initialValues?.installments && initialValues.installments.length > 0) {
      const sortedInstallments = [...initialValues.installments].sort((a: any, b: any) => {
        const termA = a.term || a.installment_no || 0;
        const termB = b.term || b.installment_no || 0;
        return termA - termB;
      });

      setInstallments(
        sortedInstallments.map((inst: any) => ({
          id: inst.id || crypto.randomUUID(),
          term: inst.term || inst.installment_no,
          description: inst.description,
          percentage: Number(inst.percentage),
          amount: Number(inst.amount),
          due_date: inst.due_date
            ? new Date(inst.due_date).toISOString().substring(0, 10)
            : '',
          status: inst.status as InstallmentPlan['status'],
        }))
      );
      setContractPaymentMethod('INSTALLMENT');
    } else {
      setContractPaymentMethod('TRANSFER');
    }
  }, [mode, initialValues]);

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [catRes, pkgRes] = await Promise.all([
          CategoryApi.getCategories({ type: CategoryType.SERVICE }),
          PackageApi.getPackages({ limit: 50 }),
        ]);
        if (catRes?.data) setFetchedCategories(catRes.data);
        if (pkgRes?.data) setFetchedPackages(pkgRes.data);
      } catch (error) {
        console.error('Error fetching init data:', error);
      } finally {
        setInitDataReady(true);
      }
    };
    fetchInitData();
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) {
      setQuotations([]);
      return; 
    }

    const fetchQuotations = async () => {
      try {
        const res = await QuotationApi.getAll({
          customer_id: selectedCustomerId,
          status: QuotationStatus.SIGNED,
        });
        if (res && res.data) {
          setQuotations(res.data);
        } else {
          setQuotations([]);
        }
      } catch (error) {
        console.error('Error fetching quotations:', error);
        setQuotations([]);
      }
    };
    
    fetchQuotations();

  }, [selectedCustomerId]);

  // Initialize searched customers
  useEffect(() => {
    if (customers.length > 0 && searchedCustomers.length === 0) {
      setSearchedCustomers(customers);
    }
  }, [customers, searchedCustomers.length]);

  const handleCustomerSearch = useCallback(
    (query: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(async () => {
        if (!query.trim()) {
          setSearchedCustomers(customers);
          return;
        }
        try {
          const res = await CustomerApi.getCustomers({
            search: query,
            limit: 50,
          });
          if (res && res.data) {
            setSearchedCustomers(res.data);
          }
        } catch (error) {
          console.error('Error searching customers:', error);
        }
      }, 500);
    },
    [customers]
  );

  // Service Type Options derived from categories
  const serviceTypeOptions = useMemo(() => {
    const sourceCategories = fetchedCategories;
    const options = sourceCategories
      .filter((c: any) => c.type === 'SERVICE')
      .map((c: any) => ({
        value: c.name, // Use name as value to match backend expectation of string
        label: c.name,
        id: c.id, // Keep ID for reference if needed
      }));

    // Add "Other" option if not present
    const hasOther = options.some(
      (o) => o.value === 'อื่นๆ' || o.value === 'Other'
    );
    if (!hasOther) {
      options.push({
        value: 'อื่นๆ',
        label: 'อื่นๆ',
        id: 'other-option',
      });
    }

    return options;
  }, [fetchedCategories]);

  // Quotation options
  const quotationOptions = useMemo(() => {
    const options = quotations.map((q) => ({
      value: q.id,
      label: `${q.code || `QT-${q.id.slice(0, 8)}`} - ${q.customer_name}`,
      description: `฿${Number(q.total).toLocaleString('th-TH')}`,
    }));

    // Add currently selected fullQuotation if not in the list
    if (fullQuotation && fullQuotation.id === selectedQuotationId) {
      const exists = options.some((o) => o.value === fullQuotation.id);
      if (!exists) {
        options.unshift({
          value: fullQuotation.id,
          label: `${fullQuotation.code || `QT-${fullQuotation.id.slice(0, 8)}`} - ${fullQuotation.customer_name}`,
          description: `฿${Number(fullQuotation.total).toLocaleString('th-TH')}`,
        });
      }
    }

    return options;
  }, [quotations, fullQuotation, selectedQuotationId]);

  // Fetch Quotation Details when selected
  useEffect(() => {
    if (!selectedQuotationId) return;

    const fetchQuotationDetails = async () => {
      try {
        const response = await QuotationApi.getById(selectedQuotationId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fullQuotationData = ((response as unknown as Record<string, unknown>).data || response) as Record<string, any>;

        setFullQuotation(fullQuotationData);

        if (fullQuotationData) {
          const shouldOverwriteForm = mode === 'create' || selectedQuotationId !== initialValues?.quotation_id;

          if (shouldOverwriteForm) {
            // Auto-copy schedule from quotation
            if (fullQuotationData.service_schedule_id) {
              setScheduleId(fullQuotationData.service_schedule_id);
            }

            // 1. Customer & Basic Info
            if (mode === 'create' || !selectedCustomerId) {
              setSelectedCustomerId(fullQuotationData.customer_id);
            }
            if (fullQuotationData.service_location) setServiceLocation(fullQuotationData.service_location);
            if (fullQuotationData.building_type) setBuildingType(fullQuotationData.building_type);
            if (fullQuotationData.contract_duration) setContractDuration(fullQuotationData.contract_duration);
            if (fullQuotationData.notes) setNotes(fullQuotationData.notes);

            // 2. Service Types
            const extractedServiceTypes = new Set<string>();
            if (fullQuotationData.service_type) {
              fullQuotationData.service_type.split(',').forEach((s: string) => extractedServiceTypes.add(s.trim()));
            }
            if (fullQuotationData.quotation_areas) {
              fullQuotationData.quotation_areas.forEach((area: any) => {
                if (area.category_services) {
                  area.category_services.forEach((cs: any) => {
                    if (cs.category?.name) extractedServiceTypes.add(cs.category.name);
                  });
                }
              });
            }
            const serviceTypeList = Array.from(extractedServiceTypes);
            if (serviceTypeList.length > 0) {
              setSelectedServiceTypes(serviceTypeList);
              setServiceType(serviceTypeList.join(', '));
            }

            // 3. Service Count
            let targetServiceCount = 0;
            if (fullQuotationData.quotation_areas) {
              const visits = fullQuotationData.quotation_areas
                .map((a: any) => a.packagePriceRelation?.package?.visit_limit)
                .filter((v: any) => v && !isNaN(Number(v)));
              if (visits.length > 0) {
                targetServiceCount = Math.max(...visits.map((v: any) => Number(v)));
              }
            }
            if (targetServiceCount > 0) {
              setServiceCount(targetServiceCount);
            } else if (fullQuotationData.service_count) {
              setServiceCount(Number(fullQuotationData.service_count));
            } else {
              setServiceCount(7);
            }

            // Init WorkAreaForm areas from quotation_areas
            const areasSource = fullQuotationData.quotation_areas || fullQuotationData.assessment?.assessment_areas || [];
            if (areasSource.length > 0) {
              setWorkAreaAreas(areasSource.map((a: any) => ({
                id: a.id || crypto.randomUUID(),
                area_name: a.area_name || '',
                building_type: a.building_type || '',
                building_type_other: a.building_type_other || '',
                service_system: a.service_system || '',
                service_system_other: a.service_system_other || '',
                category_other: a.category_other || '',
                service_count: a.service_count || '',
                measurement_unit: a.measurement_unit || 'sqm',
                area_size: Number(a.area_size) || undefined,
                package_price: Number(a.package_price) || Number(a.total_price) || undefined,
                total_price: Number(a.total_price) || 0,
                package_price_id: a.package_price_id || null,
                package_type: a.package_type || (a.service_system === 'PREY' ? 'WITH_TERMITE' : undefined),
                packagePriceRelation: a.packagePriceRelation || null,
                site_image_id: a.site_image_id || null,
                site_image_url: a.site_image_url || null,
                category_services: (a.category_services || []).map((cs: any) => ({
                  category_id: cs.category_id || cs.category?.id,
                  name: cs.category?.name || cs.name || '',
                })),
                items: (a.items || []).map((item: any) => ({
                  ...item,
                  product_name: item.product_name || item.description || '',
                  product_price: Number(item.product_price || item.unit_price || 0),
                  total_price: Number(item.total_price || item.amount || 0),
                  quantity: Number(item.quantity) || 1,
                })),
              })));

            }

            // 4. ดึงยอดรวม (Total) และ VAT จากใบเสนอราคาโดยตรง (ไม่ต้อง Loop บวกใหม่)
            const isQuotationIncludeVat = fullQuotationData.include_vat !== false;
            setIncludeVat(isQuotationIncludeVat);

            // ใช้ property 'total' ของ Quotation เป็นยอดสุทธิตั้งต้นเลย
            const netTotal = Number(fullQuotationData.total) || 0;
            setTotalAmount(netTotal);

            // 5. Installments (กระจายยอดเงินลงงวด)
            if (fullQuotationData.installments && fullQuotationData.installments.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const backendInstallments = fullQuotationData.installments as Record<string, any>[];
              const durationMatch = (fullQuotationData.contract_duration || '').match(/(\d+)\s*ปี/);
              const years = durationMatch ? parseInt(durationMatch[1]) : 1;
              const totalMonths = years * 12;
              let currentMonthOffset = 0;
              const monthStep = Math.floor(totalMonths / backendInstallments.length) || 1;

              // หาผลรวมยอดเดิมเพื่อใช้เทียบสัดส่วน (Scale)
              const oldTotalInstallment = backendInstallments.reduce((sum, i) => sum + Number(i.amount || 0), 0);

              let accumulatedAmount = 0;

              const newInstallments = backendInstallments.map((inst, idx) => {
                let dueDate = '';
                if (startDate) {
                  const d = new Date(startDate);
                  d.setMonth(d.getMonth() + currentMonthOffset);
                  dueDate = d.toISOString().split('T')[0];
                  currentMonthOffset += monthStep;
                }

                // คำนวณ Amount ใหม่ โดยเทียบบัญญัติไตรยางศ์จากยอด netTotal
                let newAmount = 0;
                if (idx === backendInstallments.length - 1) {
                  // งวดสุดท้าย เอายอดสุทธิหักลบด้วยยอดที่สะสมมา (เพื่อป้องกันเศษสตางค์ตกหล่น)
                  newAmount = Number((netTotal - accumulatedAmount).toFixed(2));
                } else {
                  // งวดอื่นๆ คิดตามสัดส่วน
                  const scale = oldTotalInstallment > 0 ? Number(inst.amount) / oldTotalInstallment : (1 / backendInstallments.length);
                  newAmount = Number((netTotal * scale).toFixed(2));
                  accumulatedAmount += newAmount;
                }

                // คำนวณเปอร์เซ็นต์กลับ
                const calculatedPercentage = netTotal > 0 ? Number(((newAmount / netTotal) * 100).toFixed(2)) : 0;

                return {
                  id: crypto.randomUUID(),
                  term: inst.installment_no || idx + 1,
                  description: inst.description || `งวดที่ ${inst.installment_no || idx + 1}`,
                  percentage: calculatedPercentage,
                  amount: newAmount,
                  due_date: dueDate,
                  status: 'PENDING' as InstallmentPlan['status'],
                };
              });

              // ตรวจสอบเช็คเปอเซ็นต์รวมให้ได้ 100% พอดี (ปรับทศนิยมงวดสุดท้ายถ้าจำเป็น)
              const totalPct = newInstallments.reduce((sum, inst) => sum + inst.percentage, 0);
              if (newInstallments.length > 0 && Math.abs(totalPct - 100) > 0.01) {
                const diff = Number((100 - (totalPct - newInstallments[newInstallments.length - 1].percentage)).toFixed(2));
                newInstallments[newInstallments.length - 1].percentage = diff;
              }

              setInstallments(newInstallments);
              setContractPaymentMethod('INSTALLMENT');
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch quotation details:', error);
      }
    };

    fetchQuotationDetails();

  }, [selectedQuotationId, mode, startDate, initialValues?.quotation_id]);

  // Auto-fill address
  useEffect(() => {
    if (selectedCustomer && !serviceLocation) {
      const address = [
        selectedCustomer.address_house_no,
        selectedCustomer.road_line,
        selectedCustomer.sub_district,
        selectedCustomer.district,
        selectedCustomer.province,
        selectedCustomer.postal_code,
      ]
        .filter(Boolean)
        .join(' ');
      setServiceLocation(address);
    }
  }, [selectedCustomer]);

  // Fetch full contract data (with areas) for Edit/Renew/Detail mode
  useEffect(() => {
    if (mode === 'create' || !initialValues?.id || !initDataReady) return;

    const fetchFullContract = async () => {
      setIsLoading(true);
      try {
        const res = await ContractApi.getById(initialValues.id!);
        const fullData = ((res as unknown as Record<string, unknown>).data || res) as Record<string, any>;
        const existingAreas = fullData?.contract_areas || fullData?.areas || fullData?.area || [];
        console.log('[ContractForm] existingAreas from API:', JSON.stringify(existingAreas.map((a: any) => ({ building_type: a.building_type, building_type_other: a.building_type_other, service_system: a.service_system, service_system_other: a.service_system_other }))));

        if (existingAreas.length > 0) {
          // Init customAreas (legacy)
          setCustomAreas(existingAreas.map((a: any, index: number) => {
            const servicesArray = a.category_services || a.category_service || [];
            return {
              id: a.id || crypto.randomUUID(),
              title: a.area_name || `พื้นที่ ${index + 1}`,
              buildingType: a.building_type || '',
              contractDuration: fullData.contract_duration || '1 ปี',
              systemUsed: a.service_system || '',
              serviceCount: a.service_count || fullData.service_count || 7,
              selectedServiceTypes: servicesArray.map((cs: any) => cs.category?.name || cs.name || '').filter(Boolean),
            };
          }));

          // Init WorkAreaForm areas
          setWorkAreaAreas(existingAreas.map((a: any) => ({
            id: a.id || crypto.randomUUID(),
            area_name: a.area_name || '',
            building_type: a.building_type || '',
            building_type_other: a.building_type_other || '',
            service_system: a.service_system || '',
            service_system_other: a.service_system_other || '',
            category_other: a.category_other || '',
            service_count: a.service_count || '',
            area_size: Number(a.area_size) || undefined,
            measurement_unit: a.measurement_unit || 'sqm',
            package_price: Number(a.package_price) || Number(a.total_price) || undefined,
            total_price: Number(a.total_price) || 0,
            package_price_id: a.package_price_id || null,
            package_type: a.package_type || (a.service_system === 'PREY' ? 'WITH_TERMITE' : undefined),
            packagePriceRelation: a.packagePriceRelation || null,
            site_image_id: a.site_image_id || null,
            site_image_url: a.site_image_url || null,
            category_services: (a.category_services || a.category_service || []).map((cs: any) => ({
              category_id: cs.category_id || cs.category?.id,
              name: cs.category?.name || cs.name || '',
            })),
            items: (a.items || []).map((item: any) => ({
              ...item,
              product_name: item.product_name || item.description || '',
              product_price: Number(item.product_price || item.unit_price || 0),
              total_price: Number(item.total_price || item.amount || 0),
              quantity: Number(item.quantity) || 1,
            })),
          })));
        }
      } catch (error) {
        console.error('Failed to fetch full contract:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFullContract();
  }, [mode, initialValues?.id, initDataReady]);

  // Recalculate Installments when Total Amount changes
  useEffect(() => {
    setInstallments((prev) => {
      const newInstallments = prev.map((inst) => ({
        ...inst,
        amount: Number((totalAmount * (inst.percentage / 100)).toFixed(2)),
      }));

      const hasChanged = prev.some(
        (inst, idx) => inst.amount !== newInstallments[idx].amount
      );

      return hasChanged ? newInstallments : prev;
    });
  }, [totalAmount]);

  const handleInstallmentChange = (
    id: string,
    field: keyof InstallmentPlan,
    value: any
  ) => {
    setInstallments((prev) => {
      const currentIndex = prev.findIndex((inst) => inst.id === id);
      if (currentIndex === -1) return prev;

      const updatedList = [...prev];
      const currentInst = { ...updatedList[currentIndex] };

      if (field === 'percentage') {
        currentInst.percentage = Number(value) || 0;
        currentInst.amount = Number((totalAmount * (currentInst.percentage / 100)).toFixed(2));
      } else if (field === 'amount') {
        currentInst.amount = Number(value) || 0;
        currentInst.percentage = totalAmount > 0 ? (currentInst.amount / totalAmount) * 100 : 0;
      } else {
        updatedList[currentIndex] = { ...currentInst, [field]: value };
        return updatedList;
      }

      updatedList[currentIndex] = currentInst;

      const remainingInsts = updatedList.slice(currentIndex + 1);

      if (remainingInsts.length > 0) {
        const percentUsedBefore = updatedList
          .slice(0, currentIndex + 1)
          .reduce((sum, inst) => sum + inst.percentage, 0);

        const percentLeftToDistribute = 100 - percentUsedBefore;
        const avgPercent = percentLeftToDistribute / remainingInsts.length;

        let currentTotalPercent = percentUsedBefore;

        for (let i = currentIndex + 1; i < updatedList.length; i++) {
          let p = Math.floor(avgPercent * 100) / 100;

          if (i === updatedList.length - 1) {
            p = Number((100 - currentTotalPercent).toFixed(2));
          } else {
            currentTotalPercent += p;
          }

          updatedList[i] = {
            ...updatedList[i],
            percentage: p,
            amount: Number((totalAmount * (p / 100)).toFixed(2)),
          };
        }
      }

      return updatedList;
    });
  };

  const addInstallment = () => {
    const newTerm = installments.length + 1;

    let nextDueDate = '';
    if (installments.length > 0) {
      const lastInst = installments[installments.length - 1];
      if (lastInst.due_date) {
        const d = new Date(lastInst.due_date);
        d.setMonth(d.getMonth() + 1);
        nextDueDate = d.toISOString().split('T')[0];
      }
    } else if (startDate) {
      nextDueDate = startDate;
    }

    setInstallments([
      ...installments,
      {
        id: crypto.randomUUID(),
        term: newTerm,
        description: `งวดที่ ${newTerm}`,
        percentage: 0,
        amount: 0,
        due_date: nextDueDate,
        status: 'PENDING' as InstallmentPlan['status'],
      },
    ]);
  };

  const distributeInstallments = () => {
    if (installments.length === 0) return;

    const count = installments.length;
    const rawPercent = 100 / count;
    const basePercent = Math.floor(rawPercent * 100) / 100;

    let currentTotalPercent = 0;

    setInstallments((prev) =>
      prev.map((inst, index) => {
        let percentage = basePercent;

        if (index === count - 1) {
          percentage = Number((100 - currentTotalPercent).toFixed(2));
        } else {
          currentTotalPercent += percentage;
        }

        const amount = Number((totalAmount * (percentage / 100)).toFixed(2));

        return {
          ...inst,
          percentage,
          amount,
        };
      })
    );
  };

  const removeInstallment = (id: string) => {
    if (installments.length <= 1) return;
    setInstallments((prev) => {
      const filtered = prev.filter((inst) => inst.id !== id);
      return filtered.map((inst, index) => ({
        ...inst,
        term: index + 1,
      }));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาเลือกลูกค้า' });
      return;
    }

    if (isSeparateContract === null) {
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาเลือกรูปแบบการออกสัญญา (รวม 1 สัญญา หรือ แยกตามพื้นที่)' });
      return;
    }

    if (contractPaymentMethod === 'INSTALLMENT') {
      const totalPercentage = installments.reduce(
        (sum, inst) => sum + Number(inst.percentage),
        0
      );
      if (Math.abs(totalPercentage - 100) > 0.5) {
        Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: `สัดส่วนการแบ่งงวดรวมกันต้องเท่ากับ 100% (ปัจจุบัน: ${totalPercentage}%)` });
        return;
      }
    }

    let selectedCustomerObj =
      customers.find((c) => c.id === selectedCustomerId) ||
      searchedCustomers.find((c) => c.id === selectedCustomerId) ||
      fetchedSingleCustomer;

    if (!selectedCustomerObj && selectedCustomerId) {
      try {
        const res = await CustomerApi.getCustomerById(selectedCustomerId);
        selectedCustomerObj = ((res as unknown as Record<string, unknown>).data || res) as Customer;
      } catch (error) {
        console.error('Error fetching customer before submit:', error);
      }
    }

    // 🟢 สร้างตัวแปร finalAreas เพื่อรวมข้อมูลพื้นที่ให้พร้อมส่งเสมอ
    let finalAreas: any[] = [];

    if (workAreaAreas.length > 0) {
      // ใช้ workAreaAreas ทั้งกรณีมีและไม่มี quotation (user อาจปรับราคาแล้ว)
      finalAreas = workAreaAreas.map((area: any, idx: number) => {
        const categoryServices = (area.category_services || []).map((cs: any) => ({
          category_id: cs.category_id || cs.category?.id,
        })).filter((cs: any) => cs.category_id);

        return {
          sequence: idx + 1,
          area_name: area.area_name || '',
          building_type: area.building_type || undefined,
          building_type_other: area.building_type === 'OTHER' ? (area.building_type_other || null) : null,
          service_system: area.service_system || undefined,
          service_system_other: area.service_system === 'OTHER' ? (area.service_system_other || null) : null,
          category_other: area.category_other || undefined,
          service_count: String(area.service_count || serviceCount || '7 ครั้ง'),
          area_size: Number(area.area_size) || 0,
          measurement_unit: area.measurement_unit || 'sqm',
          total_price: Number(area.total_price) || Number(area.package_price) || 0,
          package_price: Number(area.package_price) || Number(area.total_price) || 0,
          package_price_id: area.package_price_id || undefined,
          package_type: area.package_type || undefined,
          site_image_id: area.site_image_id || undefined,
          category_services: categoryServices,
          items: (area.items || []).filter((item: any) => item.product_id).map((item: any) => ({
            product_id: item.product_id,
            product_name: item.product_name || '',
            quantity: Number(item.quantity) || 1,
            unit: item.unit || 'Unit',
            product_price: Number(item.product_price) || 0,
            total_price: Number(item.total_price) || 0,
          })),
        };
      });
    } else {
      // 2. กรณีไม่อ้างอิงใบเสนอราคา ให้ดึงข้อมูลจาก workAreaAreas (WorkAreaForm)
      finalAreas = workAreaAreas.map((area: any, idx: number) => {
        const categoryServices = (area.category_services || []).map((cs: any) => ({
          category_id: cs.category_id || cs.category?.id,
        })).filter((cs: any) => cs.category_id);

        return {
          sequence: idx + 1,
          area_name: area.area_name || '',
          building_type: area.building_type || undefined,
          building_type_other: area.building_type === 'OTHER' ? (area.building_type_other || null) : null,
          service_system: area.service_system || undefined,
          service_system_other: area.service_system === 'OTHER' ? (area.service_system_other || null) : null,
          service_count: String(area.service_count || '7 ครั้ง'),
          area_size: Number(area.area_size) || 0,
          measurement_unit: area.measurement_unit || 'sqm',
          total_price: Number(area.total_price) || Number(area.package_price) || 0,
          package_price: Number(area.package_price) || Number(area.total_price) || 0,
          package_price_id: area.package_price_id || undefined,
          package_type: area.package_type || undefined,
          site_image_id: area.site_image_id || undefined,
          category_services: categoryServices,
        };
      });
    }

    const payload = {
      ...initialValues,
      id: mode === 'renew' ? undefined : initialValues?.id,
      code: contractCode,
      quotation_id: selectedQuotationId || undefined,
      service_schedule_id: scheduleId || undefined,
      customer_id: selectedCustomerId,
      customer_name: selectedCustomerObj
        ? `${selectedCustomerObj.first_name} ${selectedCustomerObj.last_name || ''}`.trim()
        : initialValues?.customer_name &&
          initialValues.customer_name !== 'Unknown'
          ? initialValues.customer_name
          : 'Unknown',
      service_location: serviceLocation,
      building_type: buildingType,
      service_type: serviceType,
      system_used: systemUsed,
      contract_duration: contractDuration,
      service_count: serviceCount,
      total_amount: totalAmount,
      vat_amount: vatAmount,
      status: status,
      start_date: startDate,
      end_date: endDate,
      notes: notes,
      signature: status === ContractStatus.ACTIVE
        ? (fullQuotation?.signature || initialValues?.signature || undefined)
        : undefined,

      is_separate_contract: isSeparateContract === true,

      areas: finalAreas,

      installments: contractPaymentMethod === 'INSTALLMENT'
        ? installments.map((inst) => ({
            id: inst.id.length < 36 ? undefined : inst.id,
            installment_no: inst.term,
            description: inst.description,
            percentage: inst.percentage,
            amount: inst.amount,
            due_date: inst.due_date ? inst.due_date : undefined,
            status: inst.status,
          }))
        : [],
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const SectionHeader = ({
    icon: Icon,
    title,
  }: {
    icon: any;
    title: string;
  }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
      <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
    </div>
  );

  const totalPercentage = installments.reduce(
    (sum, inst) => sum + Number(inst.percentage),
    0
  );

  // 1. สร้าง State แบบ Array เพื่อรองรับหลายพื้นที่
  const [customAreas, setCustomAreas] = useState([
    {
      id: crypto.randomUUID(),
      title: 'พื้นที่ 1',
      buildingType: initialValues?.building_type || '',
      contractDuration: initialValues?.contract_duration || '1 ปี',
      systemUsed: initialValues?.system_used || '',
      serviceCount: initialValues?.service_count || 7,
      selectedServiceTypes: initialValues?.service_type
        ? initialValues.service_type.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    }
  ]);

  // 2. ฟังก์ชันเพิ่มพื้นที่ใหม่
  const handleAddArea = () => {
    setCustomAreas((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: `พื้นที่ ${prev.length + 1}`,
        buildingType: '',
        contractDuration: '1 ปี',
        systemUsed: '',
        serviceCount: 7,
        selectedServiceTypes: [],
      },
    ]);
  };

  // 3. ฟังก์ชันลบพื้นที่ (และรันเลขพื้นที่ใหม่)
  const handleRemoveArea = (id: string) => {
    setCustomAreas((prev) => {
      const filtered = prev.filter((area) => area.id !== id);
      return filtered.map((area, index) => ({
        ...area,
        title: `พื้นที่ ${index + 1}`,
      }));
    });
  };

  // 4. ฟังก์ชันจัดการการเปลี่ยนแปลงข้อมูลในแต่ละพื้นที่
  const handleAreaChange = (id: string, field: string, value: any) => {
    setCustomAreas((prev) =>
      prev.map((area) =>
        area.id === id ? { ...area, [field]: value } : area
      )
    );
  };

  return (
    <div className="flex flex-col relative">
      {(isLoading || isSubmitting) && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl">
          <LoadingIcon className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'กำลังดึงข้อมูลสัญญา...'}
          </p>
        </div>
      )}
    <form id="contract-form" onSubmit={handleSubmit} className="space-y-6">
      {mode === 'renew' && initialValues && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-700 mt-1">
              <DocumentTextIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-base text-blue-900 font-bold">โหมดต่ออายุสัญญา (อ้างอิงรหัสเดิม: {initialValues.code})</p>
              <p className="text-sm text-blue-700 mt-1">
                วันที่, ข้อมูลพื้นที่ และงวดงานถูกคัดลอกมาให้แล้ว คุณสามารถปรับแก้ข้อมูลและกดบันทึกเพื่อสร้างสัญญาฉบับใหม่ได้ทันที
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: General Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <SectionHeader
            icon={DocumentTextIcon}
            title="ข้อมูลทั่วไป"
          />

          <div className="space-y-4">
            {mode !== 'create' && (
              <div>
                <FormField label="เลขที่สัญญา" htmlFor="code">
                  <Input
                    id="code"
                    value={contractCode}
                    onChange={(e) => setContractCode(e.target.value)}
                    readOnly
                    className="bg-gray-50 font-mono"
                  />
                </FormField>
              </div>
            )}

            {/* ลายเซ็นจากใบเสนอราคา — แสดงเมื่อสถานะเป็น ACTIVE */}
            {status === ContractStatus.ACTIVE && (
              <div className="col-span-2 border border-slate-200 rounded-lg p-4 bg-slate-50">
                <label className="block text-sm font-medium text-slate-700 mb-2">ลายเซ็นลูกค้า (จากใบเสนอราคา)</label>
                {fullQuotation?.signature ? (
                  <div className="flex items-center gap-4">
                    <div className="border-2 border-slate-200 rounded-lg bg-white p-2">
                      <img src={fullQuotation.signature} alt="ลายเซ็นลูกค้า" className="max-h-24 object-contain" />
                    </div>
                    <div className="text-sm text-green-600 font-medium">ลายเซ็นจากใบเสนอราคา {fullQuotation.code}</div>
                  </div>
                ) : initialValues?.signature ? (
                  <div className="flex items-center gap-4">
                    <div className="border-2 border-slate-200 rounded-lg bg-white p-2">
                      <img src={initialValues.signature as string} alt="ลายเซ็นลูกค้า" className="max-h-24 object-contain" />
                    </div>
                    <div className="text-sm text-green-600 font-medium">ลายเซ็นที่บันทึกไว้</div>
                  </div>
                ) : (
                  <p className="text-sm text-amber-600">ไม่พบลายเซ็นจากใบเสนอราคา กรุณาเลือกใบเสนอราคาที่เซ็นแล้ว</p>
                )}
              </div>
            )}

            <FormField label="ลูกค้า" htmlFor="customer">
              <SearchableSelect
                options={(() => {
                  const allCustomers = [...customers, ...searchedCustomers];
                  if (fetchedSingleCustomer && !allCustomers.some(c => c.id === fetchedSingleCustomer.id)) {
                    allCustomers.push(fetchedSingleCustomer);
                  }
                  const unique = allCustomers.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
                  return unique.map((c) => ({
                    value: c.id,
                    label: `${c.code} - ${c.first_name} ${c.last_name}`,
                    description: c.primary_phone,
                  }));
                })()}
                value={selectedCustomerId}
                onChange={setSelectedCustomerId}
                onSearchChange={handleCustomerSearch}
                placeholder="ค้นหาลูกค้า..."
              />
            </FormField>

            <FormField label="อ้างอิงใบเสนอราคา (ถ้ามี)" htmlFor="quotation">
              <SearchableSelect
                options={quotationOptions}
                value={selectedQuotationId}
                onChange={setSelectedQuotationId}
                placeholder="เลือกใบเสนอราคา..."
              />
            </FormField>


            <div className="grid grid-cols-2 gap-4">
              <FormField label="วันที่เริ่มสัญญา" htmlFor="startDate">
                <DatePicker selected={startDate ? new Date(startDate) : null} onChange={(date: Date | null) => setStartDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="dd/mm/yyyy" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-full" />
              </FormField>
              <FormField label="วันที่สิ้นสุดสัญญา" htmlFor="endDate">
                <DatePicker selected={endDate ? new Date(endDate) : null} onChange={(date: Date | null) => setEndDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="dd/mm/yyyy" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-full" />
              </FormField>
            </div>
          </div>
        </div>

        {/* Right Column: Address Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <SectionHeader
            icon={HomeIcon}
            title="ข้อมูลที่อยู่"
          />

          <div className="space-y-4">
            <FormField label="สถานที่ให้บริการ" htmlFor="location">
              <Textarea
                id="location"
                value={serviceLocation}
                onChange={(e) => setServiceLocation(e.target.value)}
                rows={4}
                placeholder="ที่อยู่สำหรับเข้าให้บริการ..."
              />
            </FormField>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                Google Map
              </h4>
              {selectedCustomer?.google_map_link ? (
                <a
                  href={selectedCustomer.google_map_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                >
                  <MapPinIcon className="w-4 h-4" /> เปิดแผนที่ลูกค้า
                </a>
              ) : (
                <span className="text-sm text-slate-500">
                  ไม่พบลิงก์แผนที่ในข้อมูลลูกค้า
                </span>
              )}
            </div>
          </div>
        </div>

        <WorkAreasSection
          areas={workAreaAreas}
          onAreasChange={setWorkAreaAreas}
          products={products}
          categories={fetchedCategories}
          packages={fetchedPackages}
          getSelectedPackage={(area) => {
            const pkgId = area.packagePriceRelation?.package?.id || area.packagePriceRelation?.package_id;
            if (pkgId) {
              const fullPkg = fetchedPackages.find((p) => p.id === pkgId);
              if (fullPkg) return fullPkg;
            }
            if (area.package_price_id) {
              const pkg = fetchedPackages.find((p: any) =>
                (p.package_prices || []).some((pp: any) => pp.id === area.package_price_id)
              );
              if (pkg) return pkg;
            }
            return null;
          }}
          isEditing={mode === 'edit'}
          disabled={!!selectedQuotationId && (mode === 'create' || mode === 'edit')}
          isReadOnly={!!selectedQuotationId && (mode === 'create' || mode === 'edit')}
          notice={selectedQuotationId && (mode === 'create' || mode === 'edit') ? 'อ้างอิงจากใบเสนอราคา — ไม่สามารถแก้ไขได้' : undefined}
        />

        {/* Payment & Installments - Full Width */}
        <InstallmentSection
          disableInstallmentOption={isOneTimePackage}
          disabledReason="แพ็กเกจแบบครั้งเดียวต้องชำระเต็มจำนวน"
          installments={installments.map(i => ({
            id: i.id,
            no: i.term,
            description: i.description,
            percentage: i.percentage,
            amount: i.amount,
            due_date: i.due_date,
            status: i.status as string,
          }))}
          onChange={(items) => {
            setInstallments(items.map(i => ({
              id: i.id,
              term: i.no,
              description: i.description,
              percentage: i.percentage,
              amount: i.amount,
              due_date: i.due_date,
              status: (i.status || 'PENDING') as InstallmentPlan['status'],
            })));
          }}
          totalAmount={totalAmount}
          isReadOnly={false}
          showPaymentMethodToggle
          paymentMethod={contractPaymentMethod}
          onPaymentMethodChange={(m) => {
            setContractPaymentMethod(m);
            if (m === 'INSTALLMENT' && installments.length === 0) {
              setInstallments([
                { id: crypto.randomUUID(), term: 1, description: 'งวดที่ 1', percentage: 50, amount: Number((totalAmount / 2).toFixed(2)), due_date: startDate || '', status: 'PENDING' as InstallmentPlan['status'] },
                { id: crypto.randomUUID(), term: 2, description: 'งวดที่ 2', percentage: 50, amount: Number((totalAmount / 2).toFixed(2)), due_date: '', status: 'PENDING' as InstallmentPlan['status'] },
              ]);
            } else if (m === 'TRANSFER') {
              setInstallments([]);
            }
          }}
          showDueDate
          showStatus
          showTotalAmountInput
          onTotalAmountChange={setTotalAmount}
          includeVat={includeVat}
          onIncludeVatChange={setIncludeVat}
          vatAmount={vatAmount}
          contractInfo={{
            duration: contractDuration,
            startDate: startDate,
            endDate: endDate,
          }}
        />

        {/* Notes + Price Summary */}
        {/* เอกสารแนบ */}
        {mode !== 'detail' && (
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-4">เอกสารแนบท้ายสัญญา</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ตารางเข้าปฏิบัติงาน">
                <SearchableSelect
                  options={[{ value: '', label: 'ไม่แนบ' }, ...schedules.map((s) => ({ value: s.id, label: s.name }))]}
                  value={scheduleId}
                  onChange={(val) => setScheduleId(val)}
                  placeholder="เลือกตารางปฏิบัติงาน..."
                />
              </FormField>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-stretch gap-6 w-full lg:col-span-2">
          <div className="w-full lg:flex-1 min-w-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">หมายเหตุ</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="หมายเหตุเพิ่มเติม..." className="!w-full !max-w-none resize-none flex-1" />
          </div>
          <div className="w-full lg:w-96 shrink-0 space-y-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between text-sm"><span className="text-slate-600">รวมเป็นเงิน (Subtotal)</span><span className="font-medium text-slate-900">{(includeVat ? totalAmount - vatAmount : totalAmount).toLocaleString()} บาท</span></div>
            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600"><input type="checkbox" checked={includeVat} onChange={(e) => setIncludeVat(e.target.checked)} className="rounded border-slate-300 text-green-600 h-4 w-4" />ภาษีมูลค่ารวม 7% (VAT)</label>
              <span className="font-medium text-slate-900">{vatAmount.toLocaleString()} บาท</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between items-center"><span className="text-base font-bold text-slate-800">จำนวนเงินรวมทั้งสิ้น</span><span className="text-xl font-bold text-green-600">{totalAmount.toLocaleString()} บาท</span></div>
          </div>
        </div>

        {/* รูปแบบการออกสัญญา */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">รูปแบบการออกสัญญา <span className="text-red-500">*</span></h3>
              <p className="text-sm text-slate-500 mt-0.5">กรุณาเลือกรูปแบบการออกสัญญาก่อนบันทึก</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all ${isSeparateContract === false ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
              <input
                type="radio"
                name="contract_type"
                checked={isSeparateContract === false}
                onChange={() => setIsSeparateContract(false)}
                className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <div className="ml-3">
                <span className="block text-base font-bold text-slate-800">รวมเป็น 1 สัญญา</span>
                <span className="block text-xs text-slate-500">รวมทุกพื้นที่ไว้ในสัญญาเดียว</span>
              </div>
            </label>
            <label className={`relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all ${isSeparateContract === true ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
              <input
                type="radio"
                name="contract_type"
                checked={isSeparateContract === true}
                onChange={() => setIsSeparateContract(true)}
                className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <div className="ml-3">
                <span className="block text-base font-bold text-slate-800">แยกสัญญาตามพื้นที่</span>
                <span className="block text-xs text-slate-500">สร้าง 1 สัญญาต่อ 1 พื้นที่</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </form>
    </div>
  );
};