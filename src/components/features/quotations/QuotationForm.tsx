import {
  useState,
  useEffect,
  useMemo,
  useRef,
  ChangeEvent,
  FormEvent,
  FC,
  useCallback,
} from 'react';
import { Card } from '../../common/Card';
import {
  FormField,
  Input,
  Select,
  Button,
  Textarea,
} from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { PaymentMethod } from '@/src/types/enums/financial';
import {
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  HomeIcon,
  MapIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  MapPinIcon,
  NewFieldOpsIcon,
  CreditCardIcon,
  LoadingIcon,
} from '../../../assets/icons/Icons';
import { useData } from '../../../contexts/DataContext';
import { Status } from '../../../types/entity/core.interface';
import { Assessment } from '../../../types/entity/assessment.interface';
import { AssessmentApi } from '../../../api/assessment';
import { CategoryApi } from '../../../api/category';
import { CustomerApi } from '../../../api/customer';
import { Customer } from '../../../types/entity/customer.interface';
import { CategoryType, Quotation } from '@/src/types';

import { PackageApi } from '../../../api/package';
import { Package } from '../../../types/entity/package.interface';
import { QuotationStatus } from '@/src/types/enums/quotaton';
import { QuotationApi } from '@/src/api';

interface QuotationItem {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export interface QuotationFormProps {
  mode: 'create' | 'edit' | 'revise' | 'detail';
  initialValues?: Partial<Quotation>;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  assessmentId?: string | null;
}

export const QuotationForm: FC<QuotationFormProps> = ({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  assessmentId,
}) => {
  const { products } = useData();

  const isReadOnly = mode === 'detail';

  // Loading state
  const [isLoading, setIsLoading] = useState(mode !== 'create');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local state for fetched data
  const [fetchedCustomers, setFetchedCustomers] = useState<Customer[]>([]);
  const [fetchedAssessments, setFetchedAssessments] = useState<Assessment[]>([]);
  const [fetchedCategories, setFetchedCategories] = useState<any[]>([]);
  const [fetchedPackages, setFetchedPackages] = useState<Package[]>([]);
  const [fetchedQuotation, setFetchedQuotation] = useState<Partial<Quotation> | null>(null);

  // 🌟 1. Initial data fetching (แก้ไขไม่ให้เขียนทับข้อมูลเดิมที่โหลดมาแล้ว)
  useEffect(() => {
    const initData = async () => {
      try {
        const [custRes, assessRes, catRes, pkgRes] = await Promise.all([
          CustomerApi.getCustomers({ limit: 10 }), // ดึงมาเผื่อไว้ 50 คนเลยครับ
          AssessmentApi.getAll({ limit: 10 }),
          CategoryApi.getCategories({ type: CategoryType.SERVICE, limit: 50 }),
          PackageApi.getPackages({ limit: 10 }),
        ]);

        // 🟢 ใช้เทคนิค Merge ข้อมูล ป้องกันการเตะลูกค้าของบิลนี้ทิ้ง
        if (custRes) {
          const newCusts = custRes.data || [];
          setFetchedCustomers((prev) => {
            const existingIds = new Set(newCusts.map((c: any) => c.id));
            const missing = prev.filter((c) => !existingIds.has(c.id));
            return [...newCusts, ...missing];
          });
        }
        
        if (assessRes) {
          const newAssess = assessRes.data || [];
          setFetchedAssessments((prev) => {
            const existingIds = new Set(newAssess.map((a: any) => a.id));
            const missing = prev.filter((a) => !existingIds.has(a.id));
            return [...newAssess, ...missing];
          });
        }

        if (catRes) setFetchedCategories(catRes.data || []);
        if (pkgRes) setFetchedPackages(pkgRes.data || []);
      } catch (err) {
        console.error('Error fetching initial data:', err);
      }
    };
    initData();
  }, []);

  // 🌟 2. ดึงข้อมูลใบเสนอราคาฉบับเต็ม ทันทีที่เปิด Form
  useEffect(() => {
    const fetchFullQuotation = async () => {
      if (mode !== 'create' && initialValues?.id) {
        setIsLoading(true);
        try {
          const res = await QuotationApi.getById(initialValues.id);
          // แกะ wrapper: API returns { status, success, data: QuotationObject }
          const actualData = (res as any).data || res;
          setFetchedQuotation(actualData);
        } catch (error) {
          console.error('Failed to fetch full quotation details:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchFullQuotation();
  }, [mode, initialValues?.id]);

  // 🌟 ตัวแปรหลักที่จะใช้
  const activeData = fetchedQuotation || initialValues;

  // Service Type Options derived from categories
  const serviceTypeOptions = useMemo(() => {
    const sourceCategories = fetchedCategories;
    return sourceCategories
      .filter((c: any) => c.type === 'SERVICE')
      .map((c: any) => ({
        value: c.name,
        label: c.name,
        id: c.id,
      }));
  }, [fetchedCategories]);

  // Customer info
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialValues?.customer_id || '');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCustomerSearch = useCallback(
    (query: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await CustomerApi.getCustomers({
            search: query,
            limit: 50,
          });
          if (res && res.data) {
            setFetchedCustomers((prev) => {
              const selected = prev.find((c) => c.id === selectedCustomerId);
              if (selected && !res.data.find((c) => c.id === selected.id)) {
                return [selected, ...res.data];
              }
              return res.data;
            });
          }
        } catch (error) {
          console.error('Error searching customers:', error);
        }
      }, 500);
    },
    [selectedCustomerId]
  );

  // Assessment reference
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(assessmentId || initialValues?.assessment_id || '');
  const assessmentSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState('');

  const handleAssessmentSearch = useCallback(
    (query: string) => {
      if (assessmentSearchTimeoutRef.current) {
        clearTimeout(assessmentSearchTimeoutRef.current);
      }
      assessmentSearchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await AssessmentApi.getAll({ search: query, limit: 10 });
          if (res && res.data) {
            setFetchedAssessments((prev) => {
              const selected = prev.find((a) => a.id === selectedAssessmentId);
              if (selected && !res.data.find((a) => a.id === selected.id)) {
                return [selected, ...res.data];
              }
              return res.data;
            });
          }
        } catch (error) {
          console.error('Error searching assessments:', error);
        }
      }, 500);
    },
    [selectedAssessmentId]
  );

  // Quotation info
  const [quotationDate, setQuotationDate] = useState(initialValues?.created_at ? new Date(initialValues.created_at).toISOString().substring(0, 10) : '');
  const [validityDays, setValidityDays] = useState(30);
  const [expiresAt, setExpiresAt] = useState(initialValues?.expires_at ? new Date(initialValues.expires_at).toISOString().substring(0, 10) : '');
  const [contactPhone, setContactPhone] = useState(initialValues?.contact_phone || '');
  const [serviceLocation, setServiceLocation] = useState(initialValues?.service_location || '');
  const [buildingType, setBuildingType] = useState(initialValues?.building_type || '');
  const [serviceArea, setServiceArea] = useState(initialValues?.service_area || '');
  const [serviceSystem, setServiceSystem] = useState(initialValues?.service_system || '');
  const [systemUsed, setSystemUsed] = useState(initialValues?.system_used || '');
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>(initialValues?.service_type ? initialValues.service_type.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const [serviceType, setServiceType] = useState(initialValues?.service_type || '');

  useEffect(() => {
    setServiceType(selectedServiceTypes.join(', '));
  }, [selectedServiceTypes]);

  const [paymentTerms, setPaymentTerms] = useState(initialValues?.payment_terms || 'ชำระเมื่อเข้าปฏิบัติงานครั้งแรกเสร็จเรียบร้อย');
  const [notes, setNotes] = useState(initialValues?.notes || '');
  const [contractDuration, setContractDuration] = useState(initialValues?.contract_duration || '1 ปี');
  const [serviceCount, setServiceCount] = useState(initialValues?.service_count || '7 ครั้ง');

  const initialPackageItem = useMemo(() => {
    return initialValues?.items?.find((item: any) =>
      item.unit === 'งาน/แพ็กเกจ' || item.description?.startsWith('แพ็กเกจ:')
    );
  }, [initialValues]);

  const [packagePrice, setPackagePrice] = useState(initialPackageItem ? Number(initialPackageItem.unit_price || initialPackageItem.amount || 0) : 0);
  const [packageName, setPackageName] = useState(initialPackageItem ? initialPackageItem.description?.replace('แพ็กเกจ: ', '') || '' : '');
  const [usePackagePricing, setUsePackagePricing] = useState(!!initialPackageItem);
  const [items, setItems] = useState<QuotationItem[]>([]);
  // Editable areas - local state for adding/editing/removing areas
  const [editableAreas, setEditableAreas] = useState<any[]>([]);
  const [hasInitializedAreas, setHasInitializedAreas] = useState(false);
  // Editable area prices - track per-area price overrides by index
  const [editableAreaPrices, setEditableAreaPrices] = useState<Record<number, number>>({});
  const [includeVat, setIncludeVat] = useState(initialValues?.include_vat ?? true);
  const vatRate = 0.07;
  const [paymentCondition, setPaymentCondition] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
  const [installments, setInstallments] = useState<any[]>([]);

  // 🌟 ซิงค์ข้อมูลทั้งหมดทันทีที่ Backend โหลดเสร็จ (รวมตัวที่ซ้ำให้ทำงานรอบเดียว)
  useEffect(() => {
    if (activeData && Object.keys(activeData).length > 0 && mode !== 'create') {
      
      if (activeData.customer_id) setSelectedCustomerId(activeData.customer_id);
      if (activeData.assessment_id) setSelectedAssessmentId(activeData.assessment_id);
      
      if ((activeData as any).customer) {
        setFetchedCustomers(prev => {
          if (!prev.some(c => c.id === activeData.customer_id)) return [...prev, (activeData as any).customer];
          return prev;
        });
      }
      if ((activeData as any).assessment) {
        setFetchedAssessments(prev => {
          if (!prev.some(a => a.id === activeData.assessment_id)) return [...prev, (activeData as any).assessment];
          return prev;
        });
      }

      if (activeData.service_location) setServiceLocation(activeData.service_location);
      if (activeData.building_type) setBuildingType(activeData.building_type);
      if (activeData.service_area) setServiceArea(activeData.service_area);
      if (activeData.service_system) setServiceSystem(activeData.service_system);
      if (activeData.system_used) setSystemUsed(activeData.system_used);
      if (activeData.payment_terms) setPaymentTerms(activeData.payment_terms);
      if (activeData.notes) setNotes(activeData.notes);
      if (activeData.contract_duration) setContractDuration(activeData.contract_duration);
      if (activeData.service_count) setServiceCount(activeData.service_count);
      if (activeData.contact_phone) setContactPhone(activeData.contact_phone);
      if (activeData.include_vat !== undefined) setIncludeVat(activeData.include_vat);

      if (activeData.created_at) setQuotationDate(new Date(activeData.created_at).toISOString().substring(0, 10));
      if (activeData.expires_at) setExpiresAt(new Date(activeData.expires_at).toISOString().substring(0, 10));

      const pkgItem = activeData.items?.find((item: any) =>
        item.unit === 'งาน/แพ็กเกจ' || item.description?.startsWith('แพ็กเกจ:')
      );
      if (pkgItem) {
        setUsePackagePricing(true);
        setPackageName(pkgItem.description?.replace('แพ็กเกจ: ', '') || '');
        setPackagePrice(Number(pkgItem.unit_price || pkgItem.amount || 0));
      }

      if (activeData.items && activeData.items.length > 0) {
        const normalItems = activeData.items
          .filter((item: any) => {
            if (item.unit === 'พื้นที่' && !item.product_id) return false;
            if (item.unit === 'งาน/แพ็กเกจ' || item.description?.startsWith('แพ็กเกจ:')) return false;
            return true;
          })
          .map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            productId: item.product_id || '',
            description: item.description || '',
            quantity: Number(item.quantity) || 1,
            unit: item.unit || 'ครั้ง',
            unitPrice: Number(item.unit_price) || 0,
            amount: Number(item.amount) || 0,
          }));

        if (normalItems.length > 0) {
          setItems(normalItems);
        } else {
          setItems([{ id: crypto.randomUUID(), productId: '', description: '', quantity: 1, unit: 'ครั้ง', unitPrice: 0, amount: 0 }]);
        }
      } else {
        setItems([{ id: crypto.randomUUID(), productId: '', description: '', quantity: 1, unit: 'ครั้ง', unitPrice: 0, amount: 0 }]);
      }

      if (activeData.installments && activeData.installments.length > 0) {
        setPaymentCondition(PaymentMethod.INSTALLMENT);
        
        const sumInitialAmt = activeData.installments.reduce((sum: number, curr: any) => sum + Number(curr.amount || 0), 0);
        const mappedInst = [...activeData.installments]
          .sort((a: any, b: any) => a.installment_no - b.installment_no)
          .map((inst: any) => {
            const pct = inst.percentage ? Math.round(Number(inst.percentage)) : (sumInitialAmt > 0 ? Math.round((Number(inst.amount) / sumInitialAmt) * 100) : 0);
            return {
              id: inst.id || crypto.randomUUID(),
              installment_no: inst.installment_no,
              amount: Number(inst.amount) || 0,
              percentage: pct,
              notes: inst.notes || inst.note || '', 
            };
          });

        setInstallments(mappedInst);
      }
    }
  }, [activeData, mode]);

  const standardServiceCounts = [
    '1 ครั้ง', '3 ครั้ง', '5 ครั้ง', '7 ครั้ง', '8 ครั้ง', '12 ครั้ง', '24 ครั้ง',
  ];

  const serviceCountOptions = useMemo(() => {
    const options = [...standardServiceCounts];
    if (serviceCount && !options.includes(serviceCount)) {
      options.push(serviceCount);
      options.sort((a, b) => {
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        return numA - numB;
      });
    }
    return options;
  }, [serviceCount]);

  const productOptions = useMemo(() => {
    return (
      products
        // @ts-ignore
        .filter((p) => p.type !== 'PACKAGE')
        .map((p) => ({
          value: p.id,
          label: `${p.code} - ${p.name}`,
          description: p.unit?.name || '',
        }))
    );
  }, [products]);

  const assessmentOptions = useMemo(() => {
    return (fetchedAssessments || []).map((a) => {
      const customerName = a.customer
        ? `${a.customer.first_name || ''} ${a.customer.last_name || ''}`.trim()
        : 'ไม่ระบุลูกค้า';
      return {
        value: a.id,
        label: `${a.code || 'No Code'} - ${customerName} [${a.status}]`,
        description: a.address || '',
      };
    });
  }, [fetchedAssessments]);

  const [fullAssessment, setFullAssessment] = useState<Assessment | null>(null);
  const [fetchedPackage, setFetchedPackage] = useState<Package | null>(null);

  const selectedAssessment = useMemo(() => {
    const assessment =
      fullAssessment && fullAssessment.id === selectedAssessmentId
        ? fullAssessment
        : fetchedAssessments?.find((a) => a.id === selectedAssessmentId);

    if (assessment && fetchedPackage) {
      const assessmentPkgId =
        assessment.package_id || (assessment.package && assessment.package.id);

      if (assessmentPkgId === fetchedPackage.id) {
        return {
          ...assessment,
          package: {
            ...assessment.package,
            ...fetchedPackage,
            package_prices:
              fetchedPackage.package_prices ||
              assessment.package?.package_prices,
          },
        };
      }
    }
    return assessment;
  }, [
    fetchedAssessments,
    selectedAssessmentId,
    fullAssessment,
    fetchedPackage,
  ]);

  const selectedCustomer = useMemo(() => {
    return fetchedCustomers.find((c) => c.id === selectedCustomerId);
  }, [fetchedCustomers, selectedCustomerId]);

  // Initialize editable areas from assessment or quotation data
  useEffect(() => {
    if (hasInitializedAreas) return;
    const source = (activeData?.quotation_areas && activeData.quotation_areas.length > 0)
      ? activeData.quotation_areas
      : selectedAssessment?.assessment_areas;
    if (source && source.length > 0) {
      setEditableAreas(source.map((a: any) => ({
        id: a.id || crypto.randomUUID(),
        area_name: a.area_name || '',
        building_type: a.building_type || '',
        service_system: a.service_system || '',
        area_size: Number(a.area_size) || 0,
        package_price: Number(a.package_price) || Number(a.total_price) || 0,
        total_price: Number(a.total_price) || 0,
        package_price_id: a.package_price_id || null,
        packagePriceRelation: a.packagePriceRelation || null,
        category_services: a.category_services || [],
        items: a.items || [],
      })));
      setHasInitializedAreas(true);
    }
  }, [activeData, selectedAssessment, hasInitializedAreas]);

  const addNewArea = () => {
    setEditableAreas(prev => [...prev, {
      id: crypto.randomUUID(),
      area_name: `พื้นที่ ${prev.length + 1}`,
      building_type: '',
      service_system: '',
      area_size: 0,
      package_price: 0,
      total_price: 0,
      package_price_id: null,
      packagePriceRelation: null,
      category_services: [],
      items: [],
    }]);
  };

  const removeArea = (index: number) => {
    if (editableAreas.length <= 1) return;
    setEditableAreas(prev => prev.filter((_, i) => i !== index));
    setEditableAreaPrices(prev => {
      const next: Record<number, number> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki < index) next[ki] = v;
        else if (ki > index) next[ki - 1] = v;
      });
      return next;
    });
  };

  const updateArea = (index: number, field: string, value: any) => {
    setEditableAreas(prev => prev.map((a, i) => {
      if (i !== index) return a;
      const updated = { ...a, [field]: value };
      if (field === 'package_price') {
        updated.total_price = Number(value);
        setEditableAreaPrices(p => ({ ...p, [index]: Number(value) }));
      }
      return updated;
    }));
  };

  useEffect(() => {
    if (mode === 'create' && !initialValues) {
      const today = new Date();
      const expiry = new Date();
      expiry.setDate(today.getDate() + validityDays);

      setQuotationDate(today.toISOString().substring(0, 10));
      setExpiresAt(expiry.toISOString().substring(0, 10));
    } else if (quotationDate) {
      const date = new Date(quotationDate);
      date.setDate(date.getDate() + validityDays);
      setExpiresAt(date.toISOString().substring(0, 10));
    }
  }, [quotationDate, validityDays, mode, initialValues]);

  useEffect(() => {
    if (fetchedPackage && !selectedAssessmentId) {
      setUsePackagePricing(true);
      setPackageName(fetchedPackage.name);

      if (fetchedPackage.visit_limit) {
        setServiceCount(`${fetchedPackage.visit_limit} ครั้ง`);
        const period = Number(fetchedPackage.visit_limit);
        if (period >= 12) {
          setContractDuration(`${period / 12} ปี`);
        } else {
          setContractDuration(`${period} เดือน`);
        }
      }

      let areaSize = 0;
      if (serviceArea) {
        areaSize = parseFloat(serviceArea.replace(/[^0-9.]/g, '')) || 0;
      }

      let masterPrice = 0;
      const pkgPrices = fetchedPackage.package_prices;

      if (areaSize > 0 && Array.isArray(pkgPrices) && pkgPrices.length > 0) {
        const sortedPrices = [...pkgPrices].sort((a: any, b: any) => Number(a.area_range) - Number(b.area_range));
        const condition = sortedPrices.find((p: any) => Number(p.area_range) >= areaSize);

        if (condition) {
          const hasTermite = selectedServiceTypes.some((s) => /ปลวก|termite/i.test(s));
          const priceWith = Number(condition.price_with_termite);
          const priceWithout = Number(condition.price_without_termite);

          masterPrice = hasTermite ? (priceWith > 0 ? priceWith : priceWithout) : (priceWithout > 0 ? priceWithout : priceWith);
        }
      }

      if (masterPrice > 0) {
        setPackagePrice(masterPrice);
      }
    }
  }, [fetchedPackage, selectedAssessmentId, serviceArea, selectedServiceTypes]);

  // Fetch full assessment (with packagePriceRelation) when assessment is selected
  useEffect(() => {
    if (!selectedAssessmentId) return;
    // Only fetch if we don't already have full data (packagePriceRelation)
    const currentAssessment = fetchedAssessments.find(a => a.id === selectedAssessmentId);
    const hasFullData = currentAssessment?.assessment_areas?.some((a: any) => a.packagePriceRelation);
    if (hasFullData) return;

    (async () => {
      try {
        const res = await AssessmentApi.getById(selectedAssessmentId);
        const fullData = (res as any).data || res;
        if (fullData?.id) {
          setFetchedAssessments(prev => {
            const others = prev.filter(a => a.id !== fullData.id);
            return [fullData, ...others];
          });
        }
      } catch (err) {
        console.error('Failed to fetch full assessment:', err);
      }
    })();
  }, [selectedAssessmentId]);

  // --- Logic แก้การโหลดข้อมูลใบประเมินทับโหมด Edit ---
  useEffect(() => {
    if (selectedAssessment) {
      // 🌟 ใช้ activeData ในการตรวจสอบ เพื่อให้รู้ว่ามาจากบิลที่กำลังแก้จริงๆ
      const isEditingOriginalAssessment = mode !== 'create' && selectedAssessmentId === activeData?.assessment_id;

      if (selectedAssessment.customer_id && (mode === 'create' || (!selectedCustomerId && !isEditingOriginalAssessment))) {
        setSelectedCustomerId(selectedAssessment.customer_id);
      }

      if (!isEditingOriginalAssessment) {
        if (!serviceLocation) {
          const address = [
            selectedAssessment.address,
            selectedAssessment.sub_district,
            selectedAssessment.district,
            selectedAssessment.province,
            selectedAssessment.zipcode,
          ].filter(Boolean).join(' ');
          setServiceLocation(address);
        }

        if (selectedAssessment.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
          const buildingTypes = selectedAssessment.assessment_areas.map((a) => a.building_type).filter(Boolean);
          if (buildingTypes.length > 0) setBuildingType([...new Set(buildingTypes)][0]);

          const totalArea = selectedAssessment.assessment_areas.reduce((sum, a) => sum + (Number(a.area_size) || 0), 0);
          if (totalArea > 0) setServiceArea(`${totalArea.toFixed(2)} ตร.ม.`);

          const systems = selectedAssessment.assessment_areas.map((a) => a.service_system).filter(Boolean);
          if (systems.length > 0) setServiceSystem([...new Set(systems)][0]);

          const allCategories = new Set<string>();
          selectedAssessment.assessment_areas.forEach((area) => {
            area.category_services?.forEach((cat) => {
              const categoryName = cat.category?.name || cat.name;
              if (categoryName) allCategories.add(categoryName);
            });
          });
          if (allCategories.size > 0) {
            const categoryString = Array.from(allCategories).join(', ');
            setServiceType(categoryString);
            setSelectedServiceTypes(Array.from(allCategories));
          }
        }

        if (selectedAssessment.package) {
          setUsePackagePricing(true);
          setPackageName(selectedAssessment.package.name);
          let masterPrice = 0;
          const pkg = fetchedPackage || selectedAssessment.package;

          if (pkg) {
            const pkgPrices = pkg.package_prices;
            let areaSize = 0;
            if (serviceArea) areaSize = parseFloat(serviceArea.replace(/[^0-9.]/g, '')) || 0;

            if (areaSize === 0 && selectedAssessment.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
              areaSize = Number(selectedAssessment.assessment_areas[0].area_size) || 0;
            }

            if (areaSize > 0 && Array.isArray(pkgPrices) && pkgPrices.length > 0) {
              if (pkg.visit_limit) setServiceCount(`${pkg.visit_limit} ครั้ง`);
              if (pkg.visit_limit) {
                const period = Number(pkg.visit_limit);
                setContractDuration(period >= 12 ? `${period / 12} ปี` : `${period} เดือน`);
              }

              const sortedPrices = [...pkgPrices].sort((a: any, b: any) => Number(a.area_range) - Number(b.area_range));
              const condition = sortedPrices.find((p: any) => Number(p.area_range) >= areaSize);

              if (condition) {
                let hasTermite = false;
                if (selectedAssessment.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
                  const area = selectedAssessment.assessment_areas[0];
                  hasTermite = area.category_services?.some((c: any) => {
                    if (c.name && /ปลวก|termite/i.test(c.name)) return true;
                    const masterCat = fetchedCategories.find((cat: any) => cat.id === c.category_id);
                    return masterCat && /ปลวก|termite/i.test(masterCat.name);
                  }) || false;
                }

                const priceWith = Number(condition.price_with_termite);
                const priceWithout = Number(condition.price_without_termite);
                masterPrice = hasTermite ? (priceWith > 0 ? priceWith : priceWithout) : (priceWithout > 0 ? priceWithout : priceWith);
              }
            }
          }

          if (masterPrice === 0 && selectedAssessment.total_price) {
            masterPrice = Number(selectedAssessment.total_price);
          }

          setPackagePrice(masterPrice);

          if (!items || items.length === 0) {
            if (selectedAssessment.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
              const newItems: QuotationItem[] = [];
              selectedAssessment.assessment_areas.forEach((area) => {
                if (area.items && area.items.length > 0) {
                  area.items.forEach((item) => {
                    if (!item.product_id) return;
                    const masterProduct = products.find((p) => p.id === item.product_id);
                    const unitPrice = masterProduct ? Number(masterProduct.price) || Number(masterProduct.cost_price) || 0 : Number(item.product_price) || 0;
                    newItems.push({
                      id: crypto.randomUUID(), productId: item.product_id, description: item.product_name, quantity: Number(item.quantity) || 1, unit: 'ครั้ง', unitPrice: unitPrice, amount: (Number(item.quantity) || 1) * unitPrice,
                    });
                  });
                }
              });
              if (newItems.length > 0) setItems(newItems);
            }
          }
        }

        if (selectedAssessment.installments && selectedAssessment.installments.length > 0) {
          setPaymentCondition(PaymentMethod.INSTALLMENT);
          const totalAssessmentAmount = selectedAssessment.installments.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
          let estimatedSubtotal = selectedAssessment.package ? (Number(selectedAssessment.total_price) || 0) : (Number(selectedAssessment.total_price) || totalAssessmentAmount);
          
          const shouldIncludeVat = mode === 'create' ? true : includeVat;
          const targetTotal = shouldIncludeVat ? estimatedSubtotal * 1.07 : estimatedSubtotal;
          const scale = totalAssessmentAmount > 0 ? targetTotal / totalAssessmentAmount : 1;
          let accumulatedAmount = 0;

          const sortedAssessmentInstallments = [...selectedAssessment.installments].sort((a: any, b: any) => a.installment_no - b.installment_no);
          const newInstallments = sortedAssessmentInstallments.map((inst: any, index: number) => {
            const originalAmount = Number(inst.amount);
            let newAmount = 0;
            if (index === sortedAssessmentInstallments.length - 1) {
              newAmount = targetTotal - accumulatedAmount;
            } else {
              newAmount = originalAmount * scale;
              newAmount = Math.round(newAmount * 100) / 100;
              accumulatedAmount += newAmount;
            }
            const pct = targetTotal > 0 ? (newAmount / targetTotal) * 100 : 0;
            return {
              id: inst.id || crypto.randomUUID(), installment_no: inst.installment_no, percentage: Math.round(pct), amount: newAmount > 0 ? newAmount : 0, notes: inst.note || `งวดที่ ${inst.installment_no}`,
            };
          });
          setInstallments(newInstallments);
        }
      }
    }
  }, [
    selectedAssessment,
    mode,
    fetchedCategories,
    fetchedPackage,
    serviceArea,
    activeData, 
    selectedAssessmentId
  ]);

  useEffect(() => {
    if (selectedCustomer) {
      if (!serviceLocation || mode === 'create') {
        if (!serviceLocation) {
          const address = [
            selectedCustomer.address_house_no, selectedCustomer.road_line, selectedCustomer.sub_district, selectedCustomer.district, selectedCustomer.province, selectedCustomer.postal_code,
          ].filter(Boolean).join(' ');
          setServiceLocation(address);
        }
      }
      if (!contactPhone) setContactPhone(selectedCustomer.primary_phone || '');
    }
  }, [selectedCustomer]);

  const handleItemChange = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') updated.amount = updated.quantity * updated.unitPrice;
      return updated;
    }));
  };

  const handleProductSelect = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    setItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item;
      if (product) {
        const unitPrice = Number(product.cost_price) || 0;
        return { ...item, productId: productId, description: product.name, unit: product.unit?.name || 'ครั้ง', unitPrice: unitPrice, amount: item.quantity * unitPrice };
      } else {
        return { ...item, productId: '', description: '', unit: 'ครั้ง', unitPrice: 0, amount: 0 };
      }
    }));
  };

  const addItem = () => setItems((prev) => [...prev, { id: crypto.randomUUID(), productId: '', description: '', quantity: 1, unit: 'ครั้ง', unitPrice: 0, amount: 0 }]);
  const removeItem = (id: string) => { if (items.length <= 1) return; setItems((prev) => prev.filter((item) => item.id !== id)); };

  const handlePackagePricingToggle = (e: ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setUsePackagePricing(isChecked);
    if (isChecked) {
      const pkg = selectedAssessment?.package || fetchedPackage;
      if (pkg) {
        setPackageName(pkg.name);
        if (selectedAssessment) setPackagePrice(Number(selectedAssessment.total_price) || 0);
      }
      setItems([]);
    } else {
      if (selectedAssessment?.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
        const newItems: QuotationItem[] = [];
        selectedAssessment.assessment_areas.forEach((area) => {
          if (area.items && area.items.length > 0) {
            area.items.forEach((item) => {
              if (!item.product_id) return;
              const masterProduct = products.find((p) => p.id === item.product_id);
              const unitPrice = masterProduct ? Number(masterProduct.price) || Number(masterProduct.cost_price) || 0 : Number(item.product_price) || 0;
              newItems.push({
                id: crypto.randomUUID(), productId: item.product_id, description: item.product_name, quantity: Number(item.quantity) || 1, unit: 'ครั้ง', unitPrice: unitPrice, amount: (Number(item.quantity) || 1) * unitPrice,
              });
            });
          }
        });
        setItems(newItems.length > 0 ? newItems : items);
      }
    }
  };

  // 🌟 ยอด Subtotal 
  const subtotal = useMemo(() => {
    let areaTotal = 0;
    if (usePackagePricing) {
      areaTotal = packagePrice;
    } else {
      const areas = (activeData?.quotation_areas && activeData.quotation_areas.length > 0)
        ? activeData.quotation_areas
        : selectedAssessment?.assessment_areas;

      if (areas && areas.length > 0) {
        areaTotal = areas.reduce((sum: number, area: any, idx: number) => {
          const price = editableAreaPrices[idx] !== undefined ? editableAreaPrices[idx] : (Number(area.total_price) || 0);
          return sum + price;
        }, 0);
      }
    }
    const extraItemsTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return areaTotal + extraItemsTotal;
  }, [items, usePackagePricing, packagePrice, selectedAssessmentId, selectedAssessment, activeData, editableAreaPrices]);

  const vatAmount = useMemo(() => includeVat ? subtotal * vatRate : 0, [subtotal, includeVat]);
  const netTotal = useMemo(() => subtotal + vatAmount, [subtotal, vatAmount]);

  const handleAddInstallment = () => {
    setInstallments((prev) => [...prev, { id: crypto.randomUUID(), installment_no: prev.length + 1, percentage: 0, amount: 0, notes: `งวดที่ ${prev.length + 1}` }]);
  };

  const handleRemoveInstallment = (index: number) => {
    setInstallments((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      const mapped = filtered.map((inst, i) => ({ ...inst, installment_no: i + 1, notes: inst.notes?.includes('งวดที่') ? `งวดที่ ${i + 1}` : inst.notes }));
      if (mapped.length > 0 && netTotal > 0) {
        let sumPct = 0;
        let sumAmt = 0;
        for (let i = 0; i < mapped.length - 1; i++) {
          sumPct += Number(mapped[i].percentage) || 0;
          sumAmt += Number(mapped[i].amount) || 0;
        }
        const lastIdx = mapped.length - 1;
        mapped[lastIdx].percentage = Math.round(Math.max(0, 100 - sumPct));
        mapped[lastIdx].amount = Number(Math.max(0, netTotal - sumAmt).toFixed(2));
      }
      return mapped;
    });
  };

  const handleInstallmentChange = (index: number, field: string, value: any) => {
    setInstallments((prev) => {
      const newInst = [...prev];
      const current = { ...newInst[index] };

      let pct = current.percentage;
      let amt = current.amount;

      if (field === 'percentage') {
        let inputPct = value === '' ? 0 : Math.round(Number(value));
        inputPct = Math.min(100, Math.max(0, inputPct)); 
        pct = inputPct;
        amt = netTotal > 0 ? Number(((pct / 100) * netTotal).toFixed(2)) : 0;
      } else if (field === 'amount') {
        let inputAmt = value === '' ? 0 : Number(value);
        inputAmt = Math.min(netTotal, Math.max(0, inputAmt));
        amt = inputAmt;
        pct = netTotal > 0 ? Math.round((amt / netTotal) * 100) : 0;
      } else {
        current[field] = value;
        newInst[index] = current;
        return newInst; 
      }

      current.percentage = pct;
      current.amount = amt;
      newInst[index] = current;

      if (newInst.length > 1) {
        const remainingPct = Math.max(0, 100 - pct);
        const remainingAmt = Math.max(0, netTotal - amt);
        const otherCount = newInst.length - 1;
        const splitPct = Math.floor(remainingPct / otherCount);
        const splitAmt = Number(((splitPct / 100) * netTotal).toFixed(2));

        let accumulatedPct = pct;
        let accumulatedAmt = amt;
        const lastUpdateIndex = index === newInst.length - 1 ? newInst.length - 2 : newInst.length - 1;

        for (let i = 0; i < newInst.length; i++) {
          if (i === index) continue;
          if (i === lastUpdateIndex) {
            newInst[i].percentage = Math.max(0, 100 - accumulatedPct);
            newInst[i].amount = Number(Math.max(0, netTotal - accumulatedAmt).toFixed(2));
          } else {
            newInst[i].percentage = splitPct;
            newInst[i].amount = splitAmt;
            accumulatedPct += splitPct;
            accumulatedAmt += splitAmt;
          }
        }
      }
      return newInst;
    });
  };

  useEffect(() => {
    if (paymentCondition === PaymentMethod.INSTALLMENT && installments.length === 0 && netTotal > 0) {
      setInstallments([
        { id: crypto.randomUUID(), installment_no: 1, percentage: 50, amount: Number((netTotal / 2).toFixed(2)), notes: 'งวดที่ 1' },
        { id: crypto.randomUUID(), installment_no: 2, percentage: 50, amount: Number((netTotal / 2).toFixed(2)), notes: 'งวดที่ 2' },
      ]);
    }
  }, [paymentCondition, netTotal, installments.length]);

  const prevNetTotalRef = useRef(netTotal);
  useEffect(() => {
    if (prevNetTotalRef.current === netTotal) return;
    prevNetTotalRef.current = netTotal;

    if (paymentCondition === PaymentMethod.INSTALLMENT && installments.length > 0 && netTotal > 0) {
      setInstallments((prev) => {
        let accumulatedAmt = 0;
        return prev.map((inst, index) => {
          const pct = inst.percentage || (netTotal > 0 ? Math.round((inst.amount / netTotal) * 100) : 0);

          if (index === prev.length - 1) {
            return { ...inst, percentage: pct, amount: Number((netTotal - accumulatedAmt).toFixed(2)) };
          } else {
            const amt = Number(((pct / 100) * netTotal).toFixed(2));
            accumulatedAmt += amt;
            return { ...inst, percentage: pct, amount: amt };
          }
        });
      });
    }
  }, [netTotal]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId || !selectedCustomer) { alert('กรุณาเลือกลูกค้า'); return; }
    if (!selectedAssessmentId) {
      if (!buildingType) { alert('กรุณาระบุประเภทสิ่งปลูกสร้าง (Building Type is required)'); return; }
      if (!serviceType) { alert('กรุณาระบุประเภทบริการ (Service Type is required)'); return; }
    }

    const hasValidItems = items.some((item) => item.description && item.amount > 0);
    const isAssessmentLinked = !!selectedAssessmentId;

    if (!hasValidItems && !usePackagePricing && !isAssessmentLinked) {
      alert('กรุณาเพิ่มรายการสินค้าหรือเลือกแพ็กเกจ');
      return;
    }

    if (paymentCondition === PaymentMethod.INSTALLMENT) {
      const totalInstallment = installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
      if (Math.abs(totalInstallment - netTotal) >= 1) {
        alert(`ยอดรวมงวดงาน (${totalInstallment.toLocaleString()}) ไม่ตรงกับยอดรวมสุทธิ (${netTotal.toLocaleString()})`);
        return;
      }
    }

    let finalItems = items.map((item, index) => ({
      id: '', quotation_id: '', sequence: index + 1, product_id: item.productId || null,
      description: item.description, quantity: item.quantity, unit: item.unit, unit_price: item.unitPrice, amount: item.amount,
    }));

    if (usePackagePricing) {
      const packageItem = { id: '', quotation_id: '', sequence: 1, product_id: null, description: `แพ็กเกจ: ${packageName || 'บริการหลัก'}`, quantity: 1, unit: 'งาน/แพ็กเกจ', unit_price: packagePrice, amount: packagePrice };
      finalItems = [packageItem, ...finalItems];
    } else {
      finalItems = finalItems.filter((i) => i.description || i.amount > 0);
    }

    finalItems = finalItems.map((item, idx) => ({ ...item, id: '', quotation_id: '', sequence: idx + 1 }));

    const quotationData: Partial<Quotation> = {
      ...initialValues,
      assessment_id: selectedAssessmentId || undefined,
      customer_id: selectedCustomerId,
      customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
      created_at: quotationDate,
      expires_at: expiresAt,
      status: initialValues?.status || QuotationStatus.DRAFT,
      total: netTotal,
      revision: mode === 'revise' ? (initialValues?.revision || 0) + 1 : initialValues?.revision || 1,
      google_map_link: selectedCustomer.google_map_link || '',
      payment_terms: paymentTerms,
      service_location: serviceLocation || undefined,
      building_type: buildingType || undefined,
      service_area: serviceArea || undefined,
      service_system: serviceSystem || undefined,
      system_used: systemUsed || undefined,
      service_type: serviceType || undefined,
      notes: notes,
      contract_duration: contractDuration,
      service_count: serviceCount,
      subtotal: subtotal,
      vat_amount: vatAmount,
      include_vat: includeVat,
      items: finalItems,
      installments: paymentCondition === PaymentMethod.INSTALLMENT ? installments.map((inst) => ({ ...inst, percentage: inst.percentage || 0 })) : [],
      is_installment: paymentCondition === PaymentMethod.INSTALLMENT,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(quotationData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string; }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
      <div className="p-1.5 bg-green-50 rounded-lg text-green-600"><Icon className="w-5 h-5" /></div>
      <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
    </div>
  );

  const getBuildingTypeName = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'HOUSE') return 'บ้าน';
    if (t === 'OFFICE') return 'ออฟฟิศ';
    if (t === 'CONDO') return 'คอนโด';
    if (t === 'TOWNHOUSE') return 'ทาวน์โฮม/ทาวน์เฮาส์';
    if (t === 'FACTORY') return 'โรงงาน';
    if (t === 'RESTAURANT') return 'ร้านอาหาร';
    return type || '-';
  };

  return (
    <div className="flex flex-col relative">
      {(isLoading || isSubmitting) && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl">
          <LoadingIcon className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'กำลังดึงข้อมูลใบเสนอราคา...'}
          </p>
        </div>
      )}
    <form id="quotation-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <SectionHeader icon={DocumentTextIcon} title="ข้อมูลทั่วไป" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">ลูกค้า <span className="text-red-500">*</span></label>
              <SearchableSelect
                value={selectedCustomerId}
                onChange={setSelectedCustomerId}
                onSearchChange={handleCustomerSearch}
                options={fetchedCustomers.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}`, description: c.primary_phone }))}
                placeholder="ค้นหาลูกค้า..."
                disabled={isReadOnly}
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <FormField label="ใบประเมินหน้างาน (อ้างอิง)">
                <SearchableSelect
                  value={selectedAssessmentId}
                  onChange={setSelectedAssessmentId}
                  onSearchChange={handleAssessmentSearch} /* 🌟 เติมบรรทัดนี้เข้าไปครับ */
                  options={fetchedAssessments.map((a: any) => ({ 
                    value: a.id, 
                    label: `${a.code} - ${a.customer_name || a.customer?.first_name || 'N/A'}`, 
                    description: a.service_location || 'N/A' 
                  }))}
                  placeholder="เลือกใบประเมิน (ถ้ามี)"
                  disabled={isReadOnly}
                />
              </FormField>
            </div>
            <div className="col-span-1 md:col-span-2">
              <FormField label="แพ็กเกจบริการ (Package)">
                <SearchableSelect
                  value={selectedPackageId}
                  onChange={(val) => { setSelectedPackageId(val); if (val) setSelectedAssessmentId(''); }}
                  options={fetchedPackages.map((p) => ({ value: p.id, label: `${p.name} (${p.code})`, description: `${p.visit_limit} ครั้ง / ${p.visit_limit} เดือน` }))}
                  placeholder="เลือกแพ็กเกจ (ถ้ามี)"
                  disabled={isReadOnly || !!selectedAssessmentId}
                />
              </FormField>
            </div>
            <FormField label="วันที่เสนอราคา"><Input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} disabled={isReadOnly} required /></FormField>
            <FormField label="ยืนราคา (วัน)"><Input type="number" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} disabled={isReadOnly} min={1} /></FormField>
            <FormField label="ใช้ได้ถึงวันที่"><Input type="date" value={expiresAt} disabled={true} className="bg-slate-50" /></FormField>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <SectionHeader icon={HomeIcon} title="ข้อมูลที่อยู่" />
          <div className="space-y-4">
            <FormField label="สถานที่ให้บริการ"><Textarea value={serviceLocation} onChange={(e) => setServiceLocation(e.target.value)} disabled={isReadOnly} rows={4} placeholder="ที่อยู่สำหรับเข้าให้บริการ..." required /></FormField>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">Google Map</h4>
              {selectedCustomer?.google_map_link ? (
                <a href={selectedCustomer.google_map_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1"><MapPinIcon className="w-4 h-4" /> เปิดแผนที่ลูกค้า</a>
              ) : (<span className="text-sm text-slate-500">ไม่พบลิงก์แผนที่ในข้อมูลลูกค้า</span>)}
            </div>
          </div>
        </div>

        {(() => {
          const areasToDisplay = editableAreas.length > 0
            ? editableAreas
            : (activeData?.quotation_areas && activeData.quotation_areas.length > 0)
              ? activeData.quotation_areas
              : selectedAssessment?.assessment_areas;
          const sectionTitle = 'รายละเอียดพื้นที่';

          if ((!areasToDisplay || areasToDisplay.length === 0) && isReadOnly) return null;

          // Helper: get min price from package for an area (uses min_price fields, same as assessment)
          const getMinPriceForArea = (area: any): number | null => {
            // Case 1: quotation_area or assessment_area with packagePriceRelation
            const pkgRelation = area.packagePriceRelation;
            if (pkgRelation) {
              // Prefer min_price fields (actual minimum threshold), fallback to regular price
              const minWith = Number(pkgRelation.min_price_with_termite) || 0;
              const minWithout = Number(pkgRelation.min_price_without_termite) || 0;
              if (minWith > 0 || minWithout > 0) {
                return Math.min(minWith > 0 ? minWith : Infinity, minWithout > 0 ? minWithout : Infinity);
              }
              // Fallback to regular price
              const pWith = Number(pkgRelation.price_with_termite) || 0;
              const pWithout = Number(pkgRelation.price_without_termite) || 0;
              if (pWith > 0 || pWithout > 0) {
                return Math.min(pWith > 0 ? pWith : Infinity, pWithout > 0 ? pWithout : Infinity);
              }
            }

            // Case 2: assessment_area - calc from selectedAssessment.package.package_prices
            const pkg = selectedAssessment?.package || fetchedPackage;
            if (!pkg?.package_prices || !Array.isArray(pkg.package_prices)) return null;

            const areaSize = Number(area.area_size) || 0;
            if (areaSize <= 0) return null;

            const sorted = [...pkg.package_prices].sort((a: any, b: any) => Number(a.area_range) - Number(b.area_range));
            const condition = sorted.find((p: any) => Number(p.area_range) >= areaSize);
            if (!condition) return null;

            // Prefer min_price fields
            const minWith = Number(condition.min_price_with_termite) || 0;
            const minWithout = Number(condition.min_price_without_termite) || 0;
            if (minWith > 0 || minWithout > 0) {
              return Math.min(minWith > 0 ? minWith : Infinity, minWithout > 0 ? minWithout : Infinity);
            }
            const pWith = Number(condition.price_with_termite) || 0;
            const pWithout = Number(condition.price_without_termite) || 0;
            if (pWith === 0 && pWithout === 0) return null;
            return Math.min(pWith > 0 ? pWith : Infinity, pWithout > 0 ? pWithout : Infinity);
          };

          return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 col-span-1 lg:col-span-2">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-50 rounded-lg text-green-600"><ClipboardDocumentListIcon className="w-5 h-5" /></div>
                  <h3 className="font-semibold text-slate-800 text-lg">{sectionTitle}</h3>
                </div>
                {!isReadOnly && (
                  <Button type="button" variant="outline" onClick={addNewArea} className="text-sm">
                    <PlusIcon className="w-4 h-4 mr-1" /> เพิ่มพื้นที่
                  </Button>
                )}
              </div>
              {(!areasToDisplay || areasToDisplay.length === 0) ? (
                <div className="text-center py-8 text-slate-400">
                  <ClipboardDocumentListIcon className="w-10 h-10 mx-auto mb-2" />
                  <p>ยังไม่มีพื้นที่ กด "เพิ่มพื้นที่" เพื่อเริ่มต้น</p>
                </div>
              ) : (
              <div className="space-y-4">
                {areasToDisplay.map((area: any, index: number) => {
                  const itemsTotal = area.items?.reduce((sum: number, item: any) => sum + (Number(item.total_price || item.amount) || 0), 0) || 0;
                  const basePrice = (Number(area.total_price) || 0) - itemsTotal;
                  return (
                    <div key={area.id || index} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                          {isReadOnly ? (
                            <h4 className="font-semibold text-slate-800">{area.area_name}</h4>
                          ) : (
                            <Input
                              type="text"
                              value={area.area_name}
                              onChange={(e) => updateArea(index, 'area_name', e.target.value)}
                              className="font-semibold text-slate-800 !py-1 !px-2 w-40"
                              placeholder="ชื่อพื้นที่"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full text-sm">฿{(editableAreaPrices[index] !== undefined ? editableAreaPrices[index] : Number(area.total_price || 0)).toLocaleString()}</div>
                          {!isReadOnly && areasToDisplay.length > 1 && (
                            <button type="button" onClick={() => removeArea(index)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="ลบพื้นที่">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-xs text-slate-500 mb-1">ประเภทสิ่งปลูกสร้าง</div>
                            {isReadOnly ? (
                              <div className="font-medium text-slate-800">{getBuildingTypeName(area.building_type)}</div>
                            ) : (
                              <select value={area.building_type} onChange={(e) => updateArea(index, 'building_type', e.target.value)} className="w-full rounded-lg border border-slate-300 text-sm py-1.5 px-2">
                                <option value="">เลือก...</option>
                                <option value="HOUSE">บ้าน</option>
                                <option value="OFFICE">ออฟฟิศ</option>
                                <option value="CONDO">คอนโด</option>
                                <option value="TOWNHOUSE">ทาวน์โฮม</option>
                                <option value="FACTORY">โรงงาน</option>
                                <option value="OTHER">อื่นๆ</option>
                              </select>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">พื้นที่ (ตร.ม.)</div>
                            {isReadOnly ? (
                              <div className="font-medium text-slate-800">{Number(area.area_size || 0).toLocaleString()}</div>
                            ) : (
                              <Input type="number" value={area.area_size || ''} onChange={(e) => updateArea(index, 'area_size', parseFloat(e.target.value) || 0)} className="!py-1.5" step="0.01" placeholder="0.00" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">ระบบที่ใช้</div>
                            {isReadOnly ? (
                              <div className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{area.service_system === 'PREY' ? 'เหยื่อ' : area.service_system === 'CHEMICAL' ? 'สารเคมี' : area.service_system || '-'}</div>
                            ) : (
                              <select value={area.service_system} onChange={(e) => updateArea(index, 'service_system', e.target.value)} className="w-full rounded-lg border border-slate-300 text-sm py-1.5 px-2">
                                <option value="">เลือก...</option>
                                <option value="PREY">ระบบเหยื่อ</option>
                                <option value="CHEMICAL">ระบบเคมี</option>
                                <option value="OTHER">อื่นๆ</option>
                              </select>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">ราคาบริการหลัก</div>
                            {isReadOnly ? (
                              <div className="font-medium text-slate-800">฿{Number(basePrice).toLocaleString()}</div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-slate-700 text-sm">฿</span>
                                  <Input
                                    type="number"
                                    className={`w-28 text-right font-bold text-sm h-9 !py-1 ${
                                      (() => {
                                        const minP = getMinPriceForArea(area);
                                        const curP = editableAreaPrices[index] !== undefined ? editableAreaPrices[index] : Number(area.package_price || area.total_price || 0);
                                        return minP && curP < minP
                                          ? 'text-red-600 border-red-500 bg-red-50'
                                          : 'text-primary border-slate-300 bg-white';
                                      })()
                                    }`}
                                    value={editableAreaPrices[index] !== undefined ? editableAreaPrices[index] : (area.package_price ?? basePrice ?? '')}
                                    onChange={(e) => {
                                      const newPrice = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                      setEditableAreaPrices(prev => ({ ...prev, [index]: newPrice }));
                                      if (usePackagePricing) setPackagePrice(newPrice);
                                    }}
                                    step="0.01"
                                    placeholder="0.00"
                                  />
                                </div>
                                {(() => {
                                  const minP = getMinPriceForArea(area);
                                  const currentP = editableAreaPrices[index] !== undefined ? editableAreaPrices[index] : Number(area.package_price || area.total_price || 0);
                                  if (minP && currentP < minP) {
                                    return (
                                      <div className="flex items-center mt-1 text-xs text-red-600 font-medium">
                                        <span>⚠️ ต่ำกว่าเกณฑ์แพ็กเกจ (ส่วนต่าง ฿{(minP - currentP).toLocaleString('th-TH')})</span>
                                      </div>
                                    );
                                  }
                                  if (minP) {
                                    return (
                                      <div className="text-xs text-slate-400 mt-1">ขั้นต่ำ ฿{minP.toLocaleString('th-TH')}</div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                        {area.packagePriceRelation && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><div className="text-sm font-semibold text-blue-900">แพ็กเกจที่เลือก</div></div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div><div className="text-xs text-blue-600 mb-1">ชื่อแพ็กเกจ</div><div className="font-medium text-blue-900">{area.packagePriceRelation.package?.name || area.packagePriceRelation.name || '-'}</div></div>
                              <div><div className="text-xs text-blue-600 mb-1">จำนวนครั้งบริการ</div><div className="font-medium text-blue-900">{area.packagePriceRelation.package?.visit_limit || '-'} ครั้ง</div></div>
                            </div>
                          </div>
                        )}
                        <div className="mb-4">
                          <label className="block text-xs text-slate-500 mb-2">ประเภทบริการ</label>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {serviceTypeOptions.map((option) => {
                                const serviceList = area.category_services || area.categories || [];
                                const isChecked = serviceList.some((cat: any) => {
                                  if (!cat) return false;
                                  const catString = typeof cat === 'string' ? cat : JSON.stringify(cat);
                                  return (option.id && catString.includes(String(option.id))) || (option.value && catString.includes(String(option.value)));
                                });
                                return (
                                  <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={!!isChecked} readOnly className="rounded border-slate-300 text-green-600 focus:ring-green-500 h-4 w-4" />
                                    <span className={`text-sm ${isChecked ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>{option.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        {area.items && area.items.length > 0 && (
                          <div className="mt-4 border rounded-lg overflow-hidden">
                            <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 border-b">สินค้า/บริการเพิ่มเติม</div>
                            <table className="w-full text-sm text-left">
                              <thead className="text-xs text-slate-500 bg-white border-b">
                                <tr><th className="px-4 py-2 font-medium">รายการ</th><th className="px-4 py-2 font-medium text-center w-20">จำนวน</th><th className="px-4 py-2 font-medium text-right w-32">ราคา/หน่วย</th><th className="px-4 py-2 font-medium text-right w-32">รวม</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {area.items.map((item: any, i: number) => (
                                  <tr key={i} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 text-slate-800">{item.product_name || item.description}</td>
                                    <td className="px-4 py-2 text-center text-slate-600">{item.quantity}</td>
                                    <td className="px-4 py-2 text-right text-slate-600">{Number(item.product_price || item.unit_price).toLocaleString()}</td>
                                    <td className="px-4 py-2 text-right font-medium text-slate-800">{Number(item.total_price || item.amount).toLocaleString()}</td>
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
              </div>
              )}
            </div>
          );
        })()}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 col-span-1 lg:col-span-2">
          <SectionHeader icon={CreditCardIcon} title="เงื่อนไขการชำระเงิน" />
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all ${paymentCondition === PaymentMethod.TRANSFER ? 'border-green-500 bg-green-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                <input type="radio" name="paymentCondition" value={PaymentMethod.TRANSFER} checked={paymentCondition === PaymentMethod.TRANSFER} onChange={() => setPaymentCondition(PaymentMethod.TRANSFER)} className="w-5 h-5 text-green-600 border-slate-300 focus:ring-green-500" disabled={isReadOnly} />
                <div className="ml-3"><span className="block text-sm font-bold text-slate-800">ชำระเต็มจำนวน</span><span className="block text-xs text-slate-500">เงินสด / โอนเงิน / เครดิต</span></div>
              </label>
              <label className={`relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all ${paymentCondition === PaymentMethod.INSTALLMENT ? 'border-green-500 bg-green-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                <input type="radio" name="paymentCondition" value={PaymentMethod.INSTALLMENT} checked={paymentCondition === PaymentMethod.INSTALLMENT} onChange={() => setPaymentCondition(PaymentMethod.INSTALLMENT)} className="w-5 h-5 text-green-600 border-slate-300 focus:ring-green-500" disabled={isReadOnly} />
                <div className="ml-3"><span className="block text-sm font-bold text-slate-800">แบ่งชำระ (งวดงาน)</span><span className="block text-xs text-slate-500">แบ่งจ่ายตามงวดงานที่กำหนด</span></div>
              </label>
            </div>
            {paymentCondition === PaymentMethod.INSTALLMENT && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-slate-700">รายละเอียดงวดงาน</h4>
                  {!isReadOnly && (<button type="button" onClick={handleAddInstallment} className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 font-medium"><PlusIcon className="w-4 h-4" />เพิ่มงวด</button>)}
                </div>
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr><th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase w-16">งวดที่</th><th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">รายละเอียด</th><th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase w-28">สัดส่วน (%)</th><th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase w-36">จำนวนเงิน</th>{!isReadOnly && <th className="px-2 py-3 w-10"></th>}</tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {installments.map((inst, idx) => (
                        <tr key={inst.id || idx}>
                          <td className="px-4 py-2 text-center text-sm font-medium text-slate-700">{inst.installment_no}</td>
                          <td className="px-4 py-2"><Input value={inst.notes || ''} onChange={(e) => handleInstallmentChange(idx, 'notes', e.target.value)} placeholder="รายละเอียด..." className="h-9 text-sm" disabled={isReadOnly} /></td>
                          <td className="px-4 py-2"><Input type="number" value={inst.percentage !== undefined && inst.percentage !== null ? inst.percentage : ''} onChange={(e) => handleInstallmentChange(idx, 'percentage', e.target.value)} className="h-9 text-right text-sm font-mono" disabled={isReadOnly} min={0} max={100} step="1" /></td>
                          <td className="px-4 py-2"><Input type="number" value={inst.amount || ''} onChange={(e) => handleInstallmentChange(idx, 'amount', e.target.value)} className="h-9 text-right text-sm font-mono" disabled={isReadOnly} /></td>
                          {!isReadOnly && (<td className="px-2 py-2 text-center"><button type="button" onClick={() => handleRemoveInstallment(idx)} className="text-slate-400 hover:text-red-500" disabled={installments.length <= 1}><TrashIcon className="w-4 h-4" /></button></td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {Math.abs(installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) - netTotal) >= 1 && (<p className="text-xs text-red-500 text-right">* ยอดรวมงวดงานต้องเท่ากับยอดรวมสุทธิ ({netTotal.toLocaleString()} บาท)</p>)}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          {!selectedAssessmentId && (
            <>
              <SectionHeader icon={CurrencyDollarIcon} title="รายการสินค้าและบริการ" />
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 relative group">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-1 flex items-center justify-center bg-white h-10 w-10 rounded-full border border-slate-200 text-slate-500 font-semibold text-sm">{index + 1}</div>
                      <div className="md:col-span-4"><label className="text-xs font-medium text-slate-500 mb-1 block">สินค้า/บริการ</label><SearchableSelect value={item.productId} onChange={(val) => handleProductSelect(item.id, val)} options={productOptions} placeholder="เลือกสินค้า..." disabled={isReadOnly || usePackagePricing} /></div>
                      <div className="md:col-span-3"><label className="text-xs font-medium text-slate-500 mb-1 block">รายละเอียดเพิ่มเติม</label><Input value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} placeholder="รายละเอียด..." disabled={isReadOnly} /></div>
                      <div className="md:col-span-2 grid grid-cols-2 gap-2">
                        <div><label className="text-xs font-medium text-slate-500 mb-1 block">จำนวน</label><Input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))} disabled={isReadOnly} className="text-center" /></div>
                        <div><label className="text-xs font-medium text-slate-500 mb-1 block">ราคา/หน่วย</label><Input type="number" min="0" value={item.unitPrice} onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))} disabled={isReadOnly} className="text-right" /></div>
                      </div>
                      <div className="md:col-span-2 text-right"><label className="text-xs font-medium text-slate-500 mb-1 block">รวม</label><div className="h-10 flex items-center justify-end px-3 font-semibold text-slate-900 bg-white rounded border border-slate-200">{item.amount.toLocaleString()}</div></div>
                      {!isReadOnly && items.length > 1 && (<button type="button" onClick={() => removeItem(item.id)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>)}
                    </div>
                  </div>
                ))}
                {!isReadOnly && !usePackagePricing && (<Button type="button" variant="outline" onClick={addItem} className="w-full border-dashed border-2 border-slate-300 text-slate-500 hover:text-green-600"><PlusIcon className="w-5 h-5 mr-2" /> เพิ่มรายการ</Button>)}
              </div>
            </>
          )}

          <div className={selectedAssessmentId ? 'pt-0' : 'mt-8 border-t border-slate-200 pt-6'}>
            <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
              <div className="flex-1 min-w-0 w-full flex flex-col">
                <label className="block text-sm font-semibold text-slate-700 mb-2">หมายเหตุ</label>
                <div className="w-full"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} disabled={isReadOnly} placeholder="หมายเหตุเพิ่มเติม..." className="!w-full !max-w-none resize-none" /></div>
              </div>
              <div className="w-full lg:w-80 shrink-0 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between text-sm"><span className="text-slate-600">รวมเป็นเงิน (Subtotal)</span><span className="font-medium text-slate-900">{subtotal.toLocaleString()} บาท</span></div>
                <div className="flex justify-between items-center text-sm">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600"><input type="checkbox" checked={includeVat} onChange={(e) => setIncludeVat(e.target.checked)} disabled={isReadOnly} className="rounded border-slate-300 text-green-600 h-4 w-4" />ภาษีมูลค่ารวม 7% (VAT)</label>
                  <span className="font-medium text-slate-900">{vatAmount.toLocaleString()} บาท</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center"><span className="text-base font-bold text-slate-800">จำนวนเงินรวมทั้งสิ้น</span><span className="text-xl font-bold text-green-600">{netTotal.toLocaleString()} บาท</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
    </div>
  );
};