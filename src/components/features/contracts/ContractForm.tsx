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

// ===== Assets =====
import {
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  HomeIcon,
  MapIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
} from '../../../assets/icons/Icons';

// ===== Interfaces =====
export interface Contract {
  id: string;
  code?: string;
  quotation_id?: string;
  customer_id: string;
  customer_name: string;
  service_location?: string;
  building_type?: string;
  service_type?: string;
  system_used?: string;
  contract_duration?: string;
  service_count?: number;
  total_amount: number;
  vat_amount: number;
  status: ContractStatus | any;
  start_date: string;
  end_date: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  customerId?: string;
  quotationId?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
  address?: string;
  servicePackage?: string;

  customer?: Customer;
  jobs?: any[];
  area?: ContractArea[];
  installments?: InstallmentPlan[];
}

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
  mode: 'create' | 'edit' | 'detail';
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
  const { customers } = useData();
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  // Local state for fetched data
  const [fetchedCategories, setFetchedCategories] = useState<any[]>([]);

  // Contract info
  const [contractCode, setContractCode] = useState(initialValues?.code || '');
  const [status, setStatus] = useState<ContractStatus>((initialValues?.status) || ContractStatus.DRAFT);
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

  // Initialize Custom Areas for Edit Mode
  useEffect(() => {
    if (mode === 'edit' && initialValues?.area && initialValues.area.length > 0) {
      const mappedAreas = initialValues.area.map((a: any, index: number) => {
        // ดึง Service Types เดิมออกมาเป็น Array ของชื่อ (String) เพื่อให้ตรงกับ State
        const mappedServices = a.category_service?.map((cs: any) => {
          // รองรับทั้งกรณีที่ populate category มา หรือมีแค่ id
          return cs.category?.name || cs.category_id;
        }).filter(Boolean) || [];

        return {
          id: a.id || crypto.randomUUID(),
          title: a.area_name || `พื้นที่ ${index + 1}`,
          buildingType: a.building_type || '',
          contractDuration: initialValues.contract_duration || '1 ปี',
          systemUsed: a.service_system || '',
          serviceCount: initialValues.service_count || 7,
          selectedServiceTypes: mappedServices,
        };
      });
      setCustomAreas(mappedAreas);
    }
  }, [mode, initialValues]);

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

    if (selectedQuotationId && fullQuotation?.quotation_areas?.length > 0) {
      // 1. กรณีอ้างอิงใบเสนอราคา ให้ดึงข้อมูล Area จากใบเสนอราคามาส่ง
      finalAreas = fullQuotation.quotation_areas.map((area: any) => {
        const categoryServices = area.category_services?.map((cs: any) => ({
          category_id: cs.category_id || cs.category?.id,
        })) || [];

        return {
          id: mode !== 'create' && area.id ? area.id : undefined,
          area_name: area.area_name || '',
          building_type: area.building_type || '',
          service_system: area.service_system || '',
          // ถ้าในใบเสนอราคาไม่มี service_count (อาจจะมาเป็น null) ให้ดึงค่าจาก State หลักไปใส่แทน
          service_count: area.service_count ? String(area.service_count) : String(serviceCount),
          area_size: Number(area.area_size) || 0,
          total_price: Number(area.total_price) || 0,
          category_services: categoryServices,
        };
      });
    } else {
      // 2. กรณีไม่อ้างอิงใบเสนอราคา ให้ดึงข้อมูลจาก customAreas ที่ผู้ใช้สร้างเองในฟอร์ม
      finalAreas = customAreas.map((area) => {
        const categoryServices = area.selectedServiceTypes.map((typeName) => {
          const foundCat = fetchedCategories.find((c: any) => c.name === typeName);
          return {
            category_id: foundCat ? foundCat.id : typeName,
          };
        });

        return {
          id: area.id && mode !== 'create' ? area.id : undefined,
          area_name: area.title,
          building_type: area.buildingType,
          service_system: area.systemUsed,
          service_count: String(area.serviceCount),
          area_size: 0,
          total_price: 0,
          category_services: categoryServices,
        };
      });
    }

    const payload = {
      ...initialValues,
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

    await onSubmit(payload);
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
    <form id="contract-form" onSubmit={handleSubmit} className="space-y-6">
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
          const areasToDisplay =
            fullQuotation?.quotation_areas?.length > 0
              ? fullQuotation.quotation_areas
              : fullQuotation?.assessment?.assessment_areas;

          if (!areasToDisplay || areasToDisplay.length === 0) return null;

          return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
              <SectionHeader
                icon={ClipboardDocumentListIcon}
                title="รายละเอียดพื้นที่ (Area Breakdown)"
              />

              <div className="space-y-4">
                {areasToDisplay.map((area: any, index: number) => {
                  const itemsTotal =
                    area.items?.reduce(
                      (sum: number, item: any) =>
                        sum + (Number(item.total_price || item.amount) || 0),
                      0
                    ) || 0;
                  const basePrice =
                    (Number(area.total_price) || 0) - itemsTotal;
                  return (
                    <div
                      key={index}
                      className="border border-slate-200 rounded-lg overflow-hidden"
                    >
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                          <h4 className="font-semibold text-slate-800">
                            {area.area_name}
                          </h4>
                        </div>
                        <div className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full text-sm">
                          ฿{Number(area.total_price || 0).toLocaleString()}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-xs text-slate-500 mb-1">
                              ประเภทสิ่งปลูกสร้าง
                            </div>
                            <div className="font-medium text-slate-800">
                              {area.building_type || '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">
                              พื้นที่ (ตร.ม.)
                            </div>
                            <div className="font-medium text-slate-800">
                              {Number(area.area_size || 0).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">
                              ระบบที่ใช้
                            </div>
                            {/* 🟢 แก้ไข: เปลี่ยนกลับมาเป็น Badge แสดงข้อความธรรมดา */}
                            <div className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              {area.service_system === 'PREY'
                                ? 'เหยื่อ'
                                : area.service_system === 'CHEMICAL'
                                  ? 'สารเคมี'
                                  : area.service_system === 'OTHER'
                                    ? 'อื่นๆ'
                                    : area.service_system || '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">
                              ราคาบริการหลัก
                            </div>
                            <div className="font-medium text-slate-800">
                              ฿{Number(basePrice).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Package Information */}
                        {area.packagePriceRelation && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <div className="text-sm font-semibold text-blue-900">
                                แพ็กเกจที่เลือก
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div>
                                <div className="text-xs text-blue-600 mb-1">
                                  ชื่อแพ็กเกจ
                                </div>
                                <div className="font-medium text-blue-900">
                                  {area.packagePriceRelation.package?.name ||
                                    area.packagePriceRelation.name ||
                                    '-'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-blue-600 mb-1">
                                  จำนวนครั้งบริการ
                                </div>
                                <div className="font-medium text-blue-900">
                                  {area.packagePriceRelation.package
                                    ?.visit_limit || '-'}{' '}
                                  ครั้ง
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mb-4">
                          <label className="block text-xs text-slate-500 mb-2">
                            ประเภทบริการ
                          </label>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {serviceTypeOptions.map((option) => {
                                const isChecked = area.category_services?.some(
                                  (cat: any) => {
                                    try {
                                      // Safety checks & Normalization
                                      const normalize = (str: any) =>
                                        String(str || '')
                                          .trim()
                                          .toLowerCase();

                                      const catId =
                                        cat.category_id ||
                                        cat.category?.id ||
                                        cat.id;
                                      const optionId = option.id;

                                      // Compare IDs
                                      if (
                                        catId &&
                                        optionId &&
                                        String(catId) === String(optionId)
                                      )
                                        return true;

                                      // Compare Names
                                      const catName = normalize(
                                        cat.name || cat.category?.name
                                      );
                                      const optionName = normalize(
                                        option.value || option.label
                                      );

                                      if (
                                        catName &&
                                        optionName &&
                                        catName === optionName
                                      )
                                        return true;

                                      return false;
                                    } catch (e) {
                                      return false;
                                    }
                                  }
                                );

                                return (
                                  <label
                                    key={option.id}
                                    className="flex items-center gap-2 cursor-default"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={true}
                                      className="rounded border-slate-300 text-green-600 focus:ring-green-500 disabled:opacity-100 bg-white"
                                      readOnly
                                    />
                                    <span
                                      className={`text-sm ${isChecked ? 'text-slate-800 font-medium' : 'text-slate-500'}`}
                                    >
                                      {option.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {area.items && area.items.length > 0 && (
                          <div className="mt-4 border rounded-lg overflow-hidden">
                            <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 border-b">
                              สินค้า/บริการเพิ่มเติม
                            </div>
                            <table className="w-full text-sm text-left">
                              <thead className="text-xs text-slate-500 bg-white border-b">
                                <tr>
                                  <th className="px-4 py-2 font-medium">
                                    รายการ
                                  </th>
                                  <th className="px-4 py-2 font-medium text-center w-20">
                                    จำนวน
                                  </th>
                                  <th className="px-4 py-2 font-medium text-right w-32">
                                    ราคา/หน่วย
                                  </th>
                                  <th className="px-4 py-2 font-medium text-right w-32">
                                    รวม
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {area.items.map((item: any, i: number) => (
                                  <tr key={i} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 text-slate-800">
                                      {item.product_name || item.description}
                                    </td>
                                    <td className="px-4 py-2 text-center text-slate-600">
                                      {item.quantity}
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-600">
                                      {Number(
                                        item.product_price || item.unit_price
                                      ).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium text-slate-800">
                                      {Number(
                                        item.total_price || item.amount
                                      ).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {fullQuotation.items && fullQuotation.items.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2 mt-4">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                      <div className="p-1.5 bg-orange-50 rounded-lg text-orange-600">
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
                            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                          />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-slate-800 text-lg">
                        รายการอื่นๆ เพิ่มเติม (Additional Items)
                      </h3>
                    </div>

                    <div className="overflow-x-auto border rounded-lg border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">
                              รายการ
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-24">
                              จำนวน
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase w-32">
                              ราคา/หน่วย
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase w-32">
                              รวม
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {fullQuotation.items.map(
                            (item: any, index: number) => (
                              <tr key={index} className="hover:bg-slate-50">
                                <td className="px-4 py-2 text-slate-800 text-sm">
                                  {item.description || item.product_name || '-'}
                                </td>
                                <td className="px-4 py-2 text-center text-slate-600 text-sm">
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="px-4 py-2 text-right text-slate-600 text-sm">
                                  {Number(item.unit_price).toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-right font-medium text-slate-800 text-sm">
                                  {Number(item.amount).toLocaleString()}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Service Details - Dynamic Areas */}
        {!selectedQuotationId && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">

            {/* Header + ปุ่มเพิ่มพื้นที่ */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
                  <ClipboardDocumentListIcon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-800 text-lg">
                  รายละเอียดการบริการ
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddArea}
                className="text-sm py-1.5 px-3 flex items-center gap-1 text-green-600 border-green-200 hover:bg-green-50 transition-colors"
              >
                <PlusIcon className="w-4 h-4" /> เพิ่มพื้นที่
              </Button>
            </div>

            {/* วนลูปแสดงผลการ์ดแต่ละพื้นที่ */}
            <div className="space-y-6">
              {customAreas.map((area) => (
                <div key={area.id} className="border border-slate-200 rounded-lg overflow-hidden relative">

                  {/* Card Header ของแต่ละพื้นที่ */}
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                      <h4 className="font-semibold text-slate-800">
                        {area.title}
                      </h4>
                    </div>
                    {/* ซ่อนปุ่มลบหากเหลือแค่ 1 พื้นที่ */}
                    {customAreas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveArea(area.id)}
                        className="text-slate-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" /> ลบพื้นที่
                      </button>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">
                          ประเภทสิ่งปลูกสร้าง
                        </div>
                        <Select
                          value={area.buildingType}
                          onChange={(e) => handleAreaChange(area.id, 'buildingType', e.target.value)}
                          className="w-full text-sm"
                        >
                          <option value="">เลือกประเภท...</option>
                          <option value="HOUSE">บ้าน</option>
                          <option value="OFFICE">ออฟฟิศ</option>
                        </Select>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">
                          ระยะเวลาสัญญา
                        </div>
                        <Select
                          value={area.contractDuration}
                          onChange={(e) => handleAreaChange(area.id, 'contractDuration', e.target.value)}
                          className="w-full text-sm"
                        >
                          <option value="1 ปี">1 ปี</option>
                          <option value="6 เดือน">6 เดือน</option>
                          <option value="3 เดือน">3 เดือน</option>
                          <option value="ครั้งเดียว">ครั้งเดียว</option>
                        </Select>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">
                          ระบบที่ใช้
                        </div>
                        {/* 🟢 เปลี่ยนจาก Input เป็น Select เพื่อให้ตรงกับ Enum */}
                        <Select
                          value={area.systemUsed}
                          onChange={(e) => handleAreaChange(area.id, 'systemUsed', e.target.value)}
                          className="w-full text-sm"
                        >
                          <option value="">เลือกระบบ...</option>
                          <option value="PREY">เหยื่อ (Prey)</option>
                          <option value="CHEMICAL">สารเคมี (Chemical)</option>
                          <option value="OTHER">อื่นๆ (Other)</option>
                        </Select>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">
                          จำนวนครั้งบริการ
                        </div>
                        <Input
                          type="number"
                          value={area.serviceCount}
                          onChange={(e) => handleAreaChange(area.id, 'serviceCount', Number(e.target.value))}
                          className="w-full text-sm"
                        />
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="block text-xs text-slate-500 mb-2">
                        ประเภทบริการ<span className="text-red-500">*</span>
                      </label>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {serviceTypeOptions.map((option) => {
                            const isChecked = area.selectedServiceTypes.includes(option.value);
                            return (
                              <label
                                key={option.id}
                                className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 -m-1.5 rounded transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    let newTypes = [...area.selectedServiceTypes];
                                    if (e.target.checked) {
                                      newTypes.push(option.value);
                                    } else {
                                      newTypes = newTypes.filter((t) => t !== option.value);
                                    }
                                    handleAreaChange(area.id, 'selectedServiceTypes', newTypes);
                                  }}
                                  className="rounded border-slate-300 text-green-600 focus:ring-green-500 bg-white"
                                />
                                <span
                                  className={`text-sm ${isChecked ? 'text-slate-800 font-medium' : 'text-slate-500'}`}
                                >
                                  {option.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      {area.selectedServiceTypes.length === 0 && (
                        <p className="text-xs text-red-500 mt-2">
                          กรุณาเลือกอย่างน้อย 1 รายการ
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
  );
};