// ===== React =====
import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// ===== Types / Enums =====
import { CategoryType, Quotation } from '../../../types';
import { Customer } from '../../../types/entity/customer.interface';
import { InstallmentPlan } from '../../../types/entity/financial.interface';
import { ContractStatus } from '../../../types/enums/financial';
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
import { WorkAreaForm } from '../assessments/WorkAreaForm';
import { Package } from '../../../types/entity/package.interface';

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
  area_name: string;
  building_type?: string;
  building_type_other?: string;
  service_system?: string;
  service_system_other?: string;
  area_size: number;
  total_price: number;
  package_price?: number | null;

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

  const [isSeparateContract, setIsSeparateContract] = useState<boolean>(false);

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

  // Installment Plan
  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);

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
          const cust = (res as any).data || res;
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
          status: 'PENDING' as any,
        },
        {
          id: crypto.randomUUID(),
          term: 2,
          description: 'งวดที่ 2 - ชำระหลังบริการครั้งที่ 3',
          percentage: 35,
          amount: 0,
          due_date: '',
          status: 'PENDING' as any,
        },
        {
          id: crypto.randomUUID(),
          term: 3,
          description: 'งวดที่ 3 - ชำระหลังบริการครั้งสุดท้าย',
          percentage: 35,
          amount: 0,
          due_date: '',
          status: 'PENDING' as any,
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
            status: 'PENDING' as any,
          }))
        );
      }
    } else if (initialValues?.installments) {
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
          status: inst.status as any,
        }))
      );
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
        const fullQuotationData = (response as any).data || response;

        setFullQuotation(fullQuotationData);

        if (fullQuotationData) {
          const shouldOverwriteForm = mode === 'create' || selectedQuotationId !== initialValues?.quotation_id;

          if (shouldOverwriteForm) {
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
                service_system: a.service_system || '',
                area_size: Number(a.area_size) || undefined,
                package_price: Number(a.package_price) || Number(a.total_price) || undefined,
                total_price: Number(a.total_price) || 0,
                package_price_id: a.package_price_id || null,
                package_type: a.package_type || (a.service_system === 'PREY' ? 'WITH_TERMITE' : undefined),
                packagePriceRelation: a.packagePriceRelation || null,
                category_services: (a.category_services || []).map((cs: any) => ({
                  category_id: cs.category_id || cs.category?.id,
                  name: cs.category?.name || cs.name || '',
                })),
                items: a.items || [],
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
              const backendInstallments = fullQuotationData.installments as any[];
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
                  status: 'PENDING' as any,
                };
              });

              // ตรวจสอบเช็คเปอเซ็นต์รวมให้ได้ 100% พอดี (ปรับทศนิยมงวดสุดท้ายถ้าจำเป็น)
              const totalPct = newInstallments.reduce((sum, inst) => sum + inst.percentage, 0);
              if (newInstallments.length > 0 && Math.abs(totalPct - 100) > 0.01) {
                const diff = Number((100 - (totalPct - newInstallments[newInstallments.length - 1].percentage)).toFixed(2));
                newInstallments[newInstallments.length - 1].percentage = diff;
              }

              setInstallments(newInstallments);
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
        const fullData = (res as any).data || res;
        const existingAreas = fullData?.contract_areas || fullData?.areas || fullData?.area || [];

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
            service_system: a.service_system || '',
            area_size: Number(a.area_size) || undefined,
            package_price: Number(a.package_price) || Number(a.total_price) || undefined,
            total_price: Number(a.total_price) || 0,
            package_price_id: a.package_price_id || null,
            package_type: a.package_type || (a.service_system === 'PREY' ? 'WITH_TERMITE' : undefined),
            packagePriceRelation: a.packagePriceRelation || null,
            category_services: (a.category_services || a.category_service || []).map((cs: any) => ({
              category_id: cs.category_id || cs.category?.id,
              name: cs.category?.name || cs.name || '',
            })),
            items: a.items || [],
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
        amount: Math.round(totalAmount * (inst.percentage / 100)),
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
        currentInst.amount = Math.round(totalAmount * (currentInst.percentage / 100));
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
            amount: Math.round(totalAmount * (p / 100)),
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
        status: 'PENDING' as any,
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

        const amount = Math.round(totalAmount * (percentage / 100));

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
      alert('กรุณาเลือกลูกค้า');
      return;
    }

    const totalPercentage = installments.reduce(
      (sum, inst) => sum + Number(inst.percentage),
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.5) {
      alert(
        `สัดส่วนการแบ่งงวดรวมกันต้องเท่ากับ 100% (ปัจจุบัน: ${totalPercentage}%)`
      );
      return;
    }

    let selectedCustomerObj =
      customers.find((c) => c.id === selectedCustomerId) ||
      searchedCustomers.find((c) => c.id === selectedCustomerId) ||
      fetchedSingleCustomer;

    if (!selectedCustomerObj && selectedCustomerId) {
      try {
        const res = await CustomerApi.getCustomerById(selectedCustomerId);
        selectedCustomerObj = (res as any).data || res;
      } catch (error) {
        console.error('Error fetching customer before submit:', error);
      }
    }

    // 🟢 สร้างตัวแปร finalAreas เพื่อรวมข้อมูลพื้นที่ให้พร้อมส่งเสมอ
    let finalAreas: any[] = [];

    if (workAreaAreas.length > 0) {
      // ใช้ workAreaAreas ทั้งกรณีมีและไม่มี quotation (user อาจปรับราคาแล้ว)
      finalAreas = workAreaAreas.map((area: any) => {
        const categoryServices = (area.category_services || []).map((cs: any) => ({
          category_id: cs.category_id || cs.category?.id,
        })).filter((cs: any) => cs.category_id);

        return {
          area_name: area.area_name || '',
          building_type: area.building_type || undefined,
          service_system: area.service_system || undefined,
          service_count: String(area.service_count || serviceCount || '7 ครั้ง'),
          area_size: Number(area.area_size) || 0,
          total_price: Number(area.total_price) || Number(area.package_price) || 0,
          package_price: Number(area.package_price) || Number(area.total_price) || 0,
          package_price_id: area.package_price_id || undefined,
          package_type: area.package_type || undefined,
          category_services: categoryServices,
        };
      });
    } else {
      // 2. กรณีไม่อ้างอิงใบเสนอราคา ให้ดึงข้อมูลจาก workAreaAreas (WorkAreaForm)
      finalAreas = workAreaAreas.map((area: any) => {
        const categoryServices = (area.category_services || []).map((cs: any) => ({
          category_id: cs.category_id || cs.category?.id,
        })).filter((cs: any) => cs.category_id);

        return {
          area_name: area.area_name || '',
          building_type: area.building_type || undefined,
          service_system: area.service_system || undefined,
          service_count: String(area.service_count || '7 ครั้ง'),
          area_size: Number(area.area_size) || 0,
          total_price: Number(area.total_price) || Number(area.package_price) || 0,
          package_price: Number(area.package_price) || Number(area.total_price) || 0,
          package_price_id: area.package_price_id || undefined,
          package_type: area.package_type || undefined,
          category_services: categoryServices,
        };
      });
    }

    const payload = {
      ...initialValues,
      id: mode === 'renew' ? undefined : initialValues?.id,
      code: contractCode,
      quotation_id: selectedQuotationId || undefined,
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

      is_separate_contract: isSeparateContract,

      areas: finalAreas,

      installments: installments.map((inst) => ({
        id: inst.id.length < 36 ? undefined : inst.id,
        installment_no: inst.term,
        description: inst.description,
        percentage: inst.percentage,
        amount: inst.amount,
        due_date: inst.due_date ? inst.due_date : undefined,
        status: inst.status,
      })),
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: General Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <SectionHeader
            icon={DocumentTextIcon}
            title="ข้อมูลทั่วไป (General Information)"
          />

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="เลขที่สัญญา" htmlFor="code">
                <Input
                  id="code"
                  value={contractCode}
                  onChange={(e) => setContractCode(e.target.value)}
                  readOnly={mode === 'create'}
                  className={
                    mode === 'create' ? 'bg-gray-50 font-mono' : 'font-mono'
                  }
                />
              </FormField>
              <FormField label="สถานะ" htmlFor="status">
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ContractStatus)}
                >
                  <option value={ContractStatus.DRAFT}>ร่าง</option>
                  <option value={ContractStatus.PENDING}>รอดำเนินการ</option>
                  <option value={ContractStatus.ACTIVE}>ดำเนินการ</option>
                  <option value={ContractStatus.COMPLETED}>เสร็จสิ้น</option>
                  <option value={ContractStatus.CANCELLED}>ยกเลิก</option>
                  <option value={ContractStatus.EXPIRED}>หมดอายุ</option>
                </Select>
              </FormField>
            </div>

            <FormField label="ลูกค้า" htmlFor="customer">
              <SearchableSelect
                options={searchedCustomers.map((c) => ({
                  value: c.id,
                  label: `${c.code} - ${c.first_name} ${c.last_name}`,
                  description: c.primary_phone,
                }))}
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

            {/* 🟢 UI สำหรับเลือกประเภทการออกสัญญา (แสดงเมื่อมีหลายพื้นที่) */}
            {/* 🟢 UI สำหรับเลือกประเภทการออกสัญญา (แสดงเมื่อมีหลายพื้นที่ ทั้งแบบมีและไม่มีใบเสนอราคา) */}
            {((selectedQuotationId && fullQuotation?.quotation_areas?.length > 1) ||
              (!selectedQuotationId && customAreas.length > 1)) && (
                <div className="col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-100 flex flex-col gap-2 mt-2">
                  <div>
                    <h4 className="text-sm font-semibold text-blue-800">รูปแบบการออกสัญญา</h4>
                    <p className="text-xs text-blue-600 mt-1">
                      {selectedQuotationId ? 'ใบเสนอราคานี้' : 'การสร้างสัญญานี้'}มี{' '}
                      {selectedQuotationId ? fullQuotation.quotation_areas.length : customAreas.length}{' '}
                      พื้นที่ ต้องการออกสัญญาแบบใด?
                    </p>
                  </div>
                  <div className="flex items-center gap-6 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                      <input
                        type="radio"
                        name="contract_type"
                        checked={!isSeparateContract}
                        onChange={() => setIsSeparateContract(false)}
                        className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      รวมเป็น 1 สัญญา
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                      <input
                        type="radio"
                        name="contract_type"
                        checked={isSeparateContract}
                        onChange={() => setIsSeparateContract(true)}
                        className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      แยกสัญญาตามพื้นที่
                    </label>
                  </div>
                </div>
              )}

            <div className="grid grid-cols-2 gap-4">
              <FormField label="วันที่เริ่มสัญญา" htmlFor="startDate">
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </FormField>
              <FormField label="วันที่สิ้นสุดสัญญา" htmlFor="endDate">
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Right Column: Address Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <SectionHeader
            icon={HomeIcon}
            title="ข้อมูลที่อยู่ (Address Information)"
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

        {(() => {

          return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
              <SectionHeader
                icon={ClipboardDocumentListIcon}
                title="รายละเอียดพื้นที่ (Area Breakdown)"
              />
              <div className="space-y-4">
                {workAreaAreas.map((area, index) => (
                  <WorkAreaForm
                    key={area.id || index}
                    area={area}
                    index={index}
                    // @ts-ignore
                    errors={{}}
                    onAreaChange={(i, updated) => setWorkAreaAreas(prev => prev.map((a, idx) => idx === i ? updated : a))}
                    onClearArea={(i) => setWorkAreaAreas(prev => prev.map((a, idx) => idx === i ? { ...a, building_type: '', area_size: undefined, category_services: [], service_system: undefined, total_price: 0, package_price: undefined } : a))}
                    onRemoveArea={workAreaAreas.length > 1 ? (i) => setWorkAreaAreas(prev => prev.filter((_, idx) => idx !== i)) : undefined}
                    products={products}
                    categories={fetchedCategories}
                    selectedPackage={(() => {
                      // Find package from fetchedPackages (has package_prices)
                      const pkgId = area.packagePriceRelation?.package?.id || area.packagePriceRelation?.package_id;
                      if (pkgId) {
                        const fullPkg = fetchedPackages.find((p) => p.id === pkgId);
                        if (fullPkg) return fullPkg;
                      }
                      // Fallback: find by package_price_id matching
                      if (area.package_price_id) {
                        const pkg = fetchedPackages.find((p: any) =>
                          (p.package_prices || []).some((pp: any) => pp.id === area.package_price_id)
                        );
                        if (pkg) return pkg;
                      }
                      return null;
                    })()}
                    availablePackages={fetchedPackages}
                    onSelectPackage={() => {}}
                    isEditing={mode === 'edit'}
                  />
                ))}
                <div className="flex justify-center mt-6">
                  <button
                    type="button"
                    onClick={() => setWorkAreaAreas(prev => [...prev, {
                      id: crypto.randomUUID(),
                      area_name: `พื้นที่ ${prev.length + 1}`,
                      building_type: '',
                      service_system: '',
                      area_size: undefined,
                      package_price: undefined,
                      total_price: 0,
                      category_services: [],
                      items: [],
                    }])}
                    className="flex items-center gap-2 px-6 py-2.5 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 hover:shadow-sm transition-all font-medium"
                  >
                    <PlusIcon className="h-5 w-5" />เพิ่มพื้นที่ให้บริการ
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Payment & Installments - Full Width */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <SectionHeader
            icon={CurrencyDollarIcon}
            title="การชำระเงินและงวดงาน (Payment & Installments)"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            {/* กล่องแสดงผลราคาและ VAT */}
            <div className="space-y-3">
              <FormField label="มูลค่าสัญญารวมสุทธิ (บาท)" htmlFor="totalAmount">
                <Input
                  id="totalAmount"
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  className="text-right font-bold text-lg text-primary"
                />
              </FormField>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeVat}
                    onChange={(e) => setIncludeVat(e.target.checked)}
                    className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  รวมภาษีมูลค่าเพิ่ม 7% (VAT)
                </label>
                {includeVat && (
                  <div className="text-sm text-slate-600 text-right">
                    VAT: <span className="font-medium text-slate-800">{vatAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <div
                className={`flex-1 p-4 rounded-lg border ${Math.abs(totalPercentage - 100) < 0.5 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">
                    สัดส่วนการแบ่งงวดรวม
                  </span>
                  <span
                    className={`text-xl font-bold ${Math.abs(totalPercentage - 100) < 0.5 ? 'text-green-700' : 'text-red-700'}`}
                  >
                    {totalPercentage.toFixed(0)}%
                  </span>
                </div>
                {Math.abs(totalPercentage - 100) >= 0.5 && (
                  <p className="text-xs text-red-600 mt-1 text-right">
                    ต้องเท่ากับ 100%
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contract Duration Summary for Payment Context */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                ระยะเวลาสัญญา:
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-medium">
                {contractDuration}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-semibold text-slate-700">ช่วงเวลา:</span>
              <span>
                {startDate
                  ? new Date(startDate).toLocaleDateString('th-TH', {
                    dateStyle: 'medium',
                  })
                  : '-'}
                <span className="mx-2 text-slate-400">ถึง</span>
                {endDate
                  ? new Date(endDate).toLocaleDateString('th-TH', {
                    dateStyle: 'medium',
                  })
                  : '-'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-lg border-slate-200 mb-6">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-16">
                    งวด
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">
                    รายละเอียด (Description)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-24">
                    %
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase w-32">
                    จำนวนเงิน
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-36">
                    วันที่ครบกำหนด
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-32">
                    สถานะ
                  </th>
                  <th className="px-2 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {installments.map((inst, index) => (
                  <tr key={inst.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-center text-sm font-medium text-slate-500 bg-slate-50/50">
                      {inst.term}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={inst.description}
                        onChange={(e) =>
                          handleInstallmentChange(
                            inst.id,
                            'description',
                            e.target.value
                          )
                        }
                        className="!py-1 h-9"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        value={inst.percentage}
                        onChange={(e) =>
                          handleInstallmentChange(
                            inst.id,
                            'percentage',
                            e.target.value
                          )
                        }
                        className="!py-1 text-center h-9"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        value={inst.amount}
                        onChange={(e) =>
                          handleInstallmentChange(
                            inst.id,
                            'amount',
                            e.target.value
                          )
                        }
                        className="!py-1 text-right h-9 font-mono"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="date"
                        value={
                          inst.due_date
                            ? new Date(inst.due_date)
                              .toISOString()
                              .substring(0, 10)
                            : ''
                        }
                        onChange={(e) =>
                          handleInstallmentChange(
                            inst.id,
                            'due_date',
                            e.target.value
                          )
                        }
                        className="!py-1 h-9 text-xs text-center"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        value={inst.status as any}
                        onChange={(e) =>
                          handleInstallmentChange(
                            inst.id,
                            'status',
                            e.target.value
                          )
                        }
                        className="!py-1 h-9 text-xs"
                      >
                        <option value="PENDING">รอชำระ</option>
                        <option value="PAID">ชำระแล้ว</option>
                        <option value="OVERDUE">เกินกำหนด</option>
                      </Select>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeInstallment(inst.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        disabled={installments.length <= 1}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mb-6">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={addInstallment}
                className="w-auto border-dashed border-2 border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 py-2 px-6 flex items-center gap-2 transition-all font-medium"
              >
                <PlusIcon className="w-5 h-5" />
                เพิ่มงวดชำระ (Add Installment)
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={distributeInstallments}
                className="w-auto border border-slate-200 text-slate-600 hover:border-green-500 hover:text-green-600 hover:bg-green-50 py-2 px-4 flex items-center gap-2 transition-all"
                title="เฉลี่ย % และยอดเงินให้เท่ากันทุกงวด"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
                  />
                </svg>
                เฉลี่ยยอด (Distribute)
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!startDate) {
                  alert('กรุณาระบุวันที่เริ่มสัญญา');
                  return;
                }

                let durationMonths = 12; // Default 1 year
                if (contractDuration.includes('ปี')) {
                  durationMonths = parseFloat(contractDuration) * 12;
                } else if (contractDuration.includes('เดือน')) {
                  durationMonths = parseFloat(contractDuration);
                }

                const interval = durationMonths / installments.length;
                const start = new Date(startDate);

                setInstallments((prev) =>
                  prev.map((inst, index) => {
                    const monthsToAdd = Math.floor(index * interval);
                    const newDate = new Date(start);
                    newDate.setMonth(newDate.getMonth() + monthsToAdd);

                    return {
                      ...inst,
                      due_date: newDate.toISOString(),
                    };
                  })
                );
              }}
              className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
            >
              <ClipboardDocumentListIcon className="w-4 h-4 mr-2" />
              คำนวณวันครบกำหนดอัตโนมัติ
            </Button>
          </div>

          <div className="border-t pt-4 mt-4">
            <FormField label="หมายเหตุ" htmlFor="notes">
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="หมายเหตุเพิ่มเติม..."
              />
            </FormField>
          </div>
        </div>
      </div>
    </form>
    </div>
  );
};