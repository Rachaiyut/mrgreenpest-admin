import Swal from 'sweetalert2';
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
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import { Card } from '../../common/Card';
import {
  FormField,
  Input,
  Select,
  Textarea,
} from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import InstallmentSection, { InstallmentItem } from '../../common/InstallmentSection';
import ItemsSection from '../../common/ItemsSection';
import WorkAreasSection from '../../common/WorkAreasSection';
import { PaymentMethod } from '@/src/types/enums/financial';
import {
  PlusIcon,
  DocumentTextIcon,
  HomeIcon,
  MapIcon,
  ClipboardDocumentListIcon,
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
import { Package, PackagePrice } from '../../../types/entity/package.interface';
import { QuotationStatus } from '@/src/types/enums/quotaton';
import { QuotationApi } from '@/src/api';
import { WorkAreaForm } from '../assessments/WorkAreaForm';
import { AssessmentWorkArea } from '@/src/types/entity/assessment.interface';
import { formatThaiDate } from '@/src/utils/date';
import { ServiceProcedureTemplateApi, IServiceProcedureTemplate } from '../../../api/service-procedure-template';
import { ServiceScheduleApi } from '../../../api/service-schedule';
import type { ServiceSchedule } from '../../../api/service-schedule';

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
        const [custRes, assessRes, catRes, pkgRes, templatesRes, schedulesRes] = await Promise.all([
          CustomerApi.getCustomers({ limit: 10 }),
          AssessmentApi.getAll({ limit: 10, status: 'COMPLETE' }),
          CategoryApi.getCategories({ type: CategoryType.SERVICE, limit: 50 }),
          PackageApi.getPackages({ limit: 10 }),
          ServiceProcedureTemplateApi.getAll({ limit: 100, is_active: true }),
          ServiceScheduleApi.getAll(),
        ]);

        if (templatesRes?.data) setProcedureTemplates(templatesRes.data);
        if (schedulesRes) setSchedules(schedulesRes);

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

  // Reset state when switching quotation or mode
  useEffect(() => {
    setHasInitializedAreas(false);
    setEditableAreas([]);
    setFetchedQuotation(null);
  }, [initialValues?.id, mode]);

  // 🌟 2. ดึงข้อมูลใบเสนอราคาฉบับเต็ม ทันทีที่เปิด Form
  useEffect(() => {
    const fetchFullQuotation = async () => {
      if (mode !== 'create' && initialValues?.id) {
        setIsLoading(true);
        try {
          const res = await QuotationApi.getById(initialValues.id);
          // แกะ wrapper: API returns { status, success, data: QuotationObject }
          const actualData = ((res as unknown as Record<string, unknown>).data || res) as Record<string, any>;
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
          const params: any = { search: query, limit: 10, status: 'COMPLETE' };
          if (selectedCustomerId) params.customer_id = selectedCustomerId;
          const res = await AssessmentApi.getAll(params);
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
    [selectedAssessmentId, selectedCustomerId]
  );

  // Reload assessments when customer changes
  useEffect(() => {
    if (!selectedCustomerId) return;
    const loadAssessments = async () => {
      try {
        const params: any = { limit: 10, customer_id: selectedCustomerId };
        const res = await AssessmentApi.getAll(params);
        if (res && res.data) {
          setFetchedAssessments((prev) => {
            const selected = prev.find((a) => a.id === selectedAssessmentId);
            if (selected && !res.data.find((a: any) => a.id === selected.id)) {
              return [selected, ...res.data];
            }
            return res.data;
          });
        }
      } catch (error) {
        console.error('Error loading assessments for customer:', error);
      }
    };
    loadAssessments();
    // Clear assessment + work areas if the selected one doesn't belong to new customer
    if (selectedAssessmentId) {
      const currentAssessment = fetchedAssessments.find((a) => a.id === selectedAssessmentId);
      if (currentAssessment && currentAssessment.customer_id !== selectedCustomerId) {
        setSelectedAssessmentId('');
        setEditableAreas([]);
        setSelectedPackageId('');
        setFetchedPackage(null);
        setPackageName('');
        setUsePackagePricing(false);
      }
    }
  }, [selectedCustomerId]);

  // Quotation info
  const [quotationDate, setQuotationDate] = useState(initialValues?.created_at ? new Date(initialValues.created_at).toISOString().substring(0, 10) : '');
  const [validityDays, setValidityDays] = useState(30);
  const [expiresAt, setExpiresAt] = useState(initialValues?.expires_at ? new Date(initialValues.expires_at).toISOString().substring(0, 10) : '');
  const [contactPhone, setContactPhone] = useState(initialValues?.contact_phone || '');
  const [serviceLocation, setServiceLocation] = useState(initialValues?.service_location || '');
  // Removed: building_type, service_area, service_system, system_used, service_type
  // These are now derived from quotation_areas only

  const [paymentTerms, setPaymentTerms] = useState(initialValues?.payment_terms || 'ชำระเมื่อเข้าปฏิบัติงานครั้งแรกเสร็จเรียบร้อย');
  const [notes, setNotes] = useState(initialValues?.notes || '');

  // Attachments
  const [procedureTemplateId, setProcedureTemplateId] = useState(initialValues?.service_procedure_template_id || '');
  const [scheduleId, setScheduleId] = useState(initialValues?.service_schedule_id || '');
  const [procedureTemplates, setProcedureTemplates] = useState<IServiceProcedureTemplate[]>([]);
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
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
      
      if ((activeData as unknown as Record<string, unknown>).customer) {
        setFetchedCustomers(prev => {
          if (!prev.some(c => c.id === activeData.customer_id)) return [...prev, (activeData as unknown as Record<string, unknown>).customer as Customer];
          return prev;
        });
      }
      if ((activeData as unknown as Record<string, unknown>).assessment) {
        setFetchedAssessments(prev => {
          if (!prev.some(a => a.id === activeData.assessment_id)) return [...prev, (activeData as unknown as Record<string, unknown>).assessment as Assessment];
          return prev;
        });
      }

      if (activeData.service_location) setServiceLocation(activeData.service_location);
      // building_type, service_area, service_system, system_used removed - derived from areas
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
            description: item.product_name || item.description || '',
            quantity: Number(item.quantity) || 1,
            unit: item.unit || 'ครั้ง',
            unitPrice: Number(item.product_price || item.unit_price || 0),
            amount: Number(item.total_price || item.amount) || 0,
          }));

        if (normalItems.length > 0) {
          setItems(normalItems);
        } else {
          setItems([{ id: crypto.randomUUID(), productId: '', description: '', quantity: 1, unit: 'ครั้ง', unitPrice: 0, amount: 0 }]);
        }
      } else {
        setItems([{ id: crypto.randomUUID(), productId: '', description: '', quantity: 1, unit: 'ครั้ง', unitPrice: 0, amount: 0 }]);
      }

      // Set payment condition from installments or is_installment flag
      if (activeData.is_installment || (activeData.installments && activeData.installments.length > 0)) {
        setPaymentCondition(PaymentMethod.INSTALLMENT);
      }

      if (activeData.installments && activeData.installments.length > 0) {
        const sumInitialAmt = activeData.installments.reduce((sum: number, curr: any) => sum + Number(curr.amount || 0), 0);
        let accPct = 0;
        const sorted = [...activeData.installments].sort((a: any, b: any) => a.installment_no - b.installment_no);
        const mappedInst = sorted.map((inst: any, idx: number) => {
            let pct: number;
            if (idx === sorted.length - 1) {
              pct = Math.max(0, 100 - accPct);
            } else {
              pct = inst.percentage ? Math.round(Number(inst.percentage)) : (sumInitialAmt > 0 ? Math.round((Number(inst.amount) / sumInitialAmt) * 100) : 0);
              accPct += pct;
            }
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

  // Initialize editable areas from quotation data (edit/revise) or assessment (create)
  useEffect(() => {
    if (hasInitializedAreas) return;

    // For edit/revise: wait for fetchedQuotation (full data with quotation_areas)
    if (mode !== 'create' && !fetchedQuotation) return;

    // Priority: fetchedQuotation.quotation_areas > activeData.quotation_areas > assessment_areas
    const assessmentAreas = selectedAssessment?.assessment_areas || [];
    let source = (fetchedQuotation?.quotation_areas && fetchedQuotation.quotation_areas.length > 0)
      ? fetchedQuotation.quotation_areas
      : (activeData?.quotation_areas && activeData.quotation_areas.length > 0)
        ? activeData.quotation_areas
        : assessmentAreas;

    if (source && source.length > 0) {
      const sortedSource = [...source].sort((a: any, b: any) =>
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
      // Resolve package conditions for deriving missing package_price_id
      const assessmentPkg = selectedAssessment?.package;
      const pkgConditions = assessmentPkg?.package_prices
        ? [...assessmentPkg.package_prices].sort((x: PackagePrice, y: PackagePrice) => x.area_range - y.area_range)
        : [];

      setEditableAreas(sortedSource.map((a: any) => {
        // Auto-detect package_type from service_system or price match
        let packageType = a.package_type;
        if (!packageType && a.packagePriceRelation) {
          const pkgPrice = Number(a.package_price) || 0;
          const priceWith = Number(a.packagePriceRelation.price_with_termite) || 0;
          const priceWithout = Number(a.packagePriceRelation.price_without_termite) || 0;
          if (pkgPrice === priceWith) packageType = 'WITH_TERMITE';
          else if (pkgPrice === priceWithout) packageType = 'WITHOUT_TERMITE';
          else if (a.service_system === 'PREY') packageType = 'WITH_TERMITE';
          else packageType = 'WITHOUT_TERMITE';
        } else if (!packageType && a.service_system === 'PREY') {
          packageType = 'WITH_TERMITE';
        }

        // Derive package_price_id from current conditions if missing
        let pricePriceId = a.package_price_id || null;
        if (!pricePriceId && pkgConditions.length > 0 && a.area_size) {
          const fit = pkgConditions.find((c: PackagePrice) => c.area_range >= Number(a.area_size));
          if (fit) pricePriceId = fit.id;
        }

        return {
          id: a.id || crypto.randomUUID(),
          created_at: a.created_at,
          area_name: a.area_name || '',
          building_type: a.building_type || '',
          building_type_other: a.building_type_other || '',
          service_system: a.service_system || '',
          service_system_other: a.service_system_other || '',
          category_other: a.category_other || '',
          measurement_unit: a.measurement_unit || 'sqm',
          area_size: Number(a.area_size) || undefined,
          package_price: Number(a.package_price) || Number(a.total_price) || undefined,
          total_price: Number(a.total_price) || 0,
          package_price_id: pricePriceId,
          package_type: packageType,
          packagePriceRelation: a.packagePriceRelation || null,
          category_services: (a.category_services || []).map((cs: any) => {
            const catId = cs.category_id || cs.category?.id || cs.id;
            return { category_id: catId, name: cs.category?.name || cs.name || '' };
          }),
          items: a.items || [],
          site_image_id: a.site_image_id || null,
          site_image_url: a.site_image_url || null,
        };
      }));
      setHasInitializedAreas(true);

      // Extract package from packagePriceRelation for WorkAreaForm
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const areaWithPkg = source.find((a: any) => a.packagePriceRelation?.package);
      if (((areaWithPkg as unknown as Record<string, unknown>)?.packagePriceRelation as Record<string, unknown>)?.package) {
        const pkg = ((areaWithPkg as unknown as Record<string, Record<string, unknown>>).packagePriceRelation).package;
        // Fetch full package with package_prices
        PackageApi.getPackages({ limit: 50 }).then(res => {
          const fullPkg = (res.data || []).find((p: Package) => p.id === (pkg as Record<string, string>).id);
          if (fullPkg) {
            setFetchedPackage(fullPkg);
            setSelectedPackageId(fullPkg.id);
          }
        }).catch(() => {});
      }
    }
  }, [activeData, selectedAssessment, hasInitializedAreas, fetchedQuotation]);

  const addNewArea = () => {
    setEditableAreas(prev => [...prev, {
      id: crypto.randomUUID(),
      area_name: `พื้นที่ ${prev.length + 1}`,
      building_type: '',
      service_system: '',
      area_size: undefined,
      package_price: undefined,
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

      // Derive areaSize from editableAreas
      const areaSize = editableAreas.reduce((sum, a: any) => sum + (Number(a.area_size) || 0), 0);

      let masterPrice = 0;
      const pkgPrices = fetchedPackage.package_prices;

      if (areaSize > 0 && Array.isArray(pkgPrices) && pkgPrices.length > 0) {
        const sortedPrices = [...pkgPrices].sort((a: any, b: any) => Number(a.area_range) - Number(b.area_range));
        const condition = sortedPrices.find((p: any) => Number(p.area_range) >= areaSize);

        if (condition) {
          // Derive hasTermite from areas' category_services
          const allCatNames = editableAreas.flatMap((a: any) => (a.category_services || []).map((cs: any) => cs.name || cs.category?.name || ''));
          const hasTermite = allCatNames.some((s: string) => /ปลวก|termite/i.test(s));
          const priceWith = Number(condition.price_with_termite);
          const priceWithout = Number(condition.price_without_termite);

          masterPrice = hasTermite ? (priceWith > 0 ? priceWith : priceWithout) : (priceWithout > 0 ? priceWithout : priceWith);
        }
      }

      if (masterPrice > 0) {
        setPackagePrice(masterPrice);
      }
    }
  }, [fetchedPackage, selectedAssessmentId, editableAreas]);

  // Reset areas when assessment changes so they get re-initialized
  useEffect(() => {
    if (selectedAssessmentId) {
      setHasInitializedAreas(false);
    }
  }, [selectedAssessmentId]);

  // Fetch full assessment (with packagePriceRelation) when assessment is selected
  useEffect(() => {
    if (!selectedAssessmentId) return;
    // Only fetch if we don't already have full data (package with package_prices)
    if (fullAssessment?.id === selectedAssessmentId && fullAssessment?.package) return;
    const currentAssessment = fetchedAssessments.find(a => a.id === selectedAssessmentId);
    if (currentAssessment?.package?.package_prices?.length) return;

    (async () => {
      try {
        const res = await AssessmentApi.getById(selectedAssessmentId);
        const fullData = ((res as unknown as Record<string, unknown>).data || res) as Assessment;
        if (fullData?.id) {
          setFullAssessment(fullData);
          setFetchedAssessments(prev => {
            const others = prev.filter(a => a.id !== fullData.id);
            return [fullData, ...others];
          });
          // Re-initialize areas if they were initialized from partial list data (no package)
          if (hasInitializedAreas && fullData.package) {
            setHasInitializedAreas(false);
          }
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

        // ถ้าลูกค้าไม่อยู่ใน list ให้เพิ่มจาก assessment.customer
        const customerExists = fetchedCustomers.some(c => c.id === selectedAssessment.customer_id);
        if (!customerExists && (selectedAssessment as unknown as Record<string, unknown>).customer) {
          setFetchedCustomers(prev => [(selectedAssessment as unknown as Record<string, unknown>).customer as Customer, ...prev]);
        }
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

        // building_type, service_area, service_system, service_type derived from areas - no state needed

        if (selectedAssessment.package) {
          setUsePackagePricing(true);
          setPackageName(selectedAssessment.package.name);
          setSelectedPackageId(selectedAssessment.package.id);
          // Ensure fetchedPackage is set so WorkAreaForm receives it
          if (!fetchedPackage && selectedAssessment.package.package_prices) {
            setFetchedPackage(selectedAssessment.package as Package);
          }
          let masterPrice = 0;
          const pkg = fetchedPackage || selectedAssessment.package;

          if (pkg) {
            const pkgPrices = pkg.package_prices;
            let areaSize = 0;
            if (selectedAssessment.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
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
            let pct: number;
            if (index === sortedAssessmentInstallments.length - 1) {
              const prevPctSum = sortedAssessmentInstallments.slice(0, index).reduce((_s: number, _: unknown, i2: number) => {
                const a = Number(sortedAssessmentInstallments[i2].amount) * scale;
                return _s + Math.round(targetTotal > 0 ? (Math.round(a * 100) / 100 / targetTotal) * 100 : 0);
              }, 0);
              pct = 100 - prevPctSum;
            } else {
              pct = targetTotal > 0 ? Math.round((newAmount / targetTotal) * 100) : 0;
            }
            return {
              id: inst.id || crypto.randomUUID(), installment_no: inst.installment_no, percentage: pct, amount: Number((newAmount > 0 ? newAmount : 0).toFixed(2)), notes: inst.note || `งวดที่ ${inst.installment_no}`,
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
  // Track area prices for subtotal recalculation
  const areaPricesKey = editableAreas.map(a => `${Number(a.total_price)||0}`).join(',');

  const subtotal = useMemo(() => {
    if (editableAreas.length > 0) {
      // area.total_price already includes items within the area — don't add items again
      return editableAreas.reduce((sum, area) => sum + (Number(area.total_price) || Number(area.package_price) || 0), 0);
    } else if (usePackagePricing) {
      const extraItemsTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      return packagePrice + extraItemsTotal;
    }
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [items, usePackagePricing, packagePrice, editableAreas, areaPricesKey]);

  const vatAmount = useMemo(() => includeVat ? subtotal * vatRate : 0, [subtotal, includeVat]);
  const netTotal = useMemo(() => subtotal + vatAmount, [subtotal, vatAmount]);

  // Auto-recalculate installment amounts when netTotal changes
  const prevNetTotalRef = useRef(netTotal);
  useEffect(() => {
    if (prevNetTotalRef.current === netTotal) return;
    prevNetTotalRef.current = netTotal;
    if (paymentCondition !== PaymentMethod.INSTALLMENT || installments.length === 0 || netTotal <= 0) return;

    setInstallments(prev => {
      let accumulatedAmount = 0;
      let accumulatedPct = 0;
      return prev.map((inst, i) => {
        const isLast = i === prev.length - 1;
        let pct: number;
        let amount: number;
        if (isLast) {
          pct = Math.max(0, 100 - accumulatedPct);
          amount = Number((netTotal - accumulatedAmount).toFixed(2));
        } else {
          pct = inst.percentage || Math.floor(100 / prev.length);
          amount = Number((netTotal * pct / 100).toFixed(2));
        }
        accumulatedAmount += amount;
        accumulatedPct += pct;
        return { ...inst, percentage: pct, amount };
      });
    });
  }, [netTotal]);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId || !selectedCustomer) { Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาเลือกลูกค้า' }); return; }

    // Validate areas
    if (editableAreas.length > 0) {
      for (let i = 0; i < editableAreas.length; i++) {
        const area = editableAreas[i];
        if (!area.area_name?.trim()) { Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: `กรุณาระบุชื่อพื้นที่ ${i + 1}` }); return; }
        if (!area.building_type) { Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: `กรุณาระบุประเภทสิ่งปลูกสร้างในพื้นที่ "${area.area_name}"` }); return; }
      }
    }

    const hasValidItems = items.some((item) => item.description && item.amount > 0);
    const hasAreas = editableAreas.length > 0 && editableAreas.some((a: any) => (Number(a.total_price) || Number(a.package_price) || 0) > 0);
    const isAssessmentLinked = !!selectedAssessmentId;

    if (!hasValidItems && !hasAreas && !usePackagePricing && !isAssessmentLinked) {
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาเพิ่มพื้นที่หรือรายการสินค้า' });
      return;
    }

    if (paymentCondition === PaymentMethod.INSTALLMENT) {
      const totalInstallment = installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
      if (Math.abs(totalInstallment - netTotal) >= 1) {
        Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: `ยอดรวมงวดงาน (${totalInstallment.toLocaleString()}) ไม่ตรงกับยอดรวมสุทธิ (${netTotal.toLocaleString()})` });
        return;
      }
    }

    let finalItems: any[] = [];

    if (editableAreas.length > 0) {
      // Areas mode: items are inside quotation_areas.items — don't duplicate at quotation level
      finalItems = [];
    } else if (usePackagePricing) {
      const packageItem = { id: '', quotation_id: '', sequence: 1, product_id: null, product_name: `แพ็กเกจ: ${packageName || 'บริการหลัก'}`, quantity: 1, unit: 'งาน/แพ็กเกจ', product_price: packagePrice, total_price: packagePrice };
      const productItems = items.filter(i => i.productId).map((item, index) => ({
        id: '', quotation_id: '', sequence: index + 2, product_id: item.productId || null,
        product_name: item.description, quantity: item.quantity, unit: item.unit, product_price: item.unitPrice, total_price: item.amount,
      }));
      finalItems = [packageItem, ...productItems];
    } else {
      finalItems = items.filter(i => i.description || i.amount > 0).map((item, index) => ({
        id: '', quotation_id: '', sequence: index + 1, product_id: item.productId || null,
        product_name: item.description, quantity: item.quantity, unit: item.unit, product_price: item.unitPrice, total_price: item.amount,
      }));
    }

    finalItems = finalItems.map((item, idx) => ({ ...item, sequence: idx + 1 }));

    // Build quotation_areas from editableAreas
    const quotationAreas = editableAreas.map((a: any, idx: number) => ({
      sequence: idx + 1,
      area_name: a.area_name,
      building_type: a.building_type || undefined,
      building_type_other: a.building_type_other || undefined,
      service_system: a.service_system || undefined,
      service_system_other: a.service_system_other || undefined,
      category_other: a.category_other || undefined,
      area_size: Number(a.area_size) || 0,
      measurement_unit: a.measurement_unit || 'sqm',
      total_price: Number(a.total_price) || Number(a.package_price) || 0,
      package_price: Number(a.package_price) || Number(a.total_price) || 0,
      package_price_id: a.package_price_id || undefined,
      package_type: a.package_type || undefined,
      site_image_id: a.site_image_id || undefined,
      category_ids: (a.category_services || []).map((cs: any) => cs.category_id).filter(Boolean),
      items: (a.items || []).filter((item: any) => item.product_id).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name || item.description || '',
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'Unit',
        product_price: Number(item.product_price || item.unit_price || 0),
        total_price: Number(item.total_price || item.amount || 0),
      })),
    }));

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
      notes: notes,
      contract_duration: contractDuration,
      service_count: serviceCount,
      subtotal: subtotal,
      vat_amount: vatAmount,
      include_vat: includeVat,
      items: finalItems,
      quotation_areas: quotationAreas,
      installments: paymentCondition === PaymentMethod.INSTALLMENT ? installments.map((inst) => ({ ...inst, percentage: inst.percentage || 0 })) : [],
      is_installment: paymentCondition === PaymentMethod.INSTALLMENT,
      service_procedure_template_id: procedureTemplateId || undefined,
      service_schedule_id: scheduleId || undefined,
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  options={fetchedAssessments.map((a: Assessment) => ({
                    value: a.id,
                    label: `${a.code}${a.customer ? ` - ${a.customer.first_name || ''} ${a.customer.last_name || ''}` : ''}`,
                    description: formatThaiDate(a.appointment_date)
                  }))}
                  placeholder="เลือกใบประเมิน (ถ้ามี)"
                  disabled={isReadOnly}
                />
              </FormField>
            </div>
            <div className="col-span-1 md:col-span-2">
              <FormField label="แพ็กเกจบริการ">
                <SearchableSelect
                  value={selectedPackageId}
                  onChange={(val) => { setSelectedPackageId(val); if (val) setSelectedAssessmentId(''); }}
                  options={fetchedPackages.map((p) => ({ value: p.id, label: `${p.name} (${p.code})`, description: `${p.visit_limit} ครั้ง / ${p.visit_limit} เดือน` }))}
                  placeholder="เลือกแพ็กเกจ (ถ้ามี)"
                  disabled={isReadOnly || !!selectedAssessmentId}
                />
              </FormField>
            </div>
            <FormField label="วันที่เสนอราคา"><DatePicker selected={quotationDate ? new Date(quotationDate) : null} onChange={(date: Date | null) => setQuotationDate(date ? date.toISOString().substring(0, 10) : '')} dateFormat="dd/MM/yyyy" locale="th" placeholderText="dd/mm/yyyy" disabled={isReadOnly} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10" wrapperClassName="w-full" /></FormField>
            <FormField label="ยืนราคา (วัน)"><Input type="number" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} disabled={isReadOnly} min={1} /></FormField>
            <FormField label="ใช้ได้ถึงวันที่"><DatePicker selected={expiresAt ? new Date(expiresAt) : null} onChange={() => {}} dateFormat="dd/MM/yyyy" locale="th" disabled className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md shadow-sm text-sm h-10" wrapperClassName="w-full" /></FormField>
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

        {/* Work Areas Section */}
        <WorkAreasSection
          areas={editableAreas}
          onAreasChange={setEditableAreas}
          products={products}
          categories={fetchedCategories}
          packages={fetchedPackages}
          getSelectedPackage={() => selectedAssessment?.package || fetchedPackage || null}
          onSelectPackage={(pkgId) => {
            if (pkgId) {
              const pkg = fetchedPackages.find(p => p.id === pkgId);
              if (pkg) {
                setFetchedPackage(pkg);
                setUsePackagePricing(true);
                setPackageName(pkg.name);
                const sortedPrices = [...(pkg.package_prices || [])].sort((a: any, b: any) => a.area_range - b.area_range);
                setEditableAreas(prev => prev.map(area => {
                  if (!area.area_size || area.area_size <= 0) {
                    return { ...area, package_price: undefined, package_price_id: undefined, package_type: undefined as unknown };
                  }
                  const bestFit = sortedPrices.find((c: any) => c.area_range >= area.area_size!);
                  if (!bestFit) return { ...area, package_price: undefined, package_price_id: undefined, package_type: undefined as unknown };
                  return {
                    ...area,
                    package_price: undefined,
                    package_price_id: undefined,
                    package_type: undefined as unknown,
                    total_price: (area.items || []).reduce((sum: number, item: any) => sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0), 0),
                  };
                }));
              }
            }
          }}
          isReadOnly={isReadOnly}
          isEditing={mode === 'edit' || mode === 'revise'}
          title="รายละเอียดพื้นที่"
          notice={mode === 'create' && selectedAssessmentId ? 'ข้อมูลพื้นที่จากใบประเมิน (แก้ไขไม่ได้)' : undefined}
          sortByCreatedAt
          disabled={mode === 'create' && !!selectedAssessmentId}
        />

        <InstallmentSection
          installments={installments.map(i => ({
            id: i.id,
            no: i.installment_no,
            description: i.notes || '',
            percentage: i.percentage,
            amount: i.amount,
          }))}
          onChange={(items) => {
            setInstallments(items.map(i => ({
              ...i,
              installment_no: i.no,
              notes: i.description,
            } as Record<string, unknown>)));
          }}
          totalAmount={netTotal}
          isReadOnly={isReadOnly}
          showPaymentMethodToggle
          paymentMethod={paymentCondition === PaymentMethod.INSTALLMENT ? 'INSTALLMENT' : 'TRANSFER'}
          onPaymentMethodChange={(m) => setPaymentCondition(m === 'INSTALLMENT' ? PaymentMethod.INSTALLMENT : PaymentMethod.TRANSFER)}
        />

        {!selectedAssessmentId && (
          <ItemsSection
            items={items.map((item) => ({
              ...item,
              product_id: item.productId,
            }))}
            onItemsChange={(updated) =>
              setItems(
                updated.map((item) => ({
                  ...item,
                  productId: item.product_id || '',
                }))
              )
            }
            productOptions={productOptions}
            onProductSelect={handleProductSelect}
            isReadOnly={isReadOnly}
            disableProductSelect={usePackagePricing}
            hideAddRemove={usePackagePricing}
          />
        )}

        {/* เอกสารแนบ */}
        {!isReadOnly && (
          <Card className="lg:col-span-2">
            <h3 className="text-base font-semibold text-slate-800 mb-4">เอกสารแนบท้ายใบเสนอราคา</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="รายละเอียดงานโดยสังเขป">
                <SearchableSelect
                  options={[{ value: '', label: 'ไม่แนบ' }, ...procedureTemplates.map((t) => ({ value: t.id, label: t.name }))]}
                  value={procedureTemplateId}
                  onChange={(val) => setProcedureTemplateId(val)}
                  placeholder="เลือกรายละเอียดขั้นตอนบริการ..."
                />
              </FormField>
              <FormField label="ตารางเข้าปฏิบัติงาน">
                <SearchableSelect
                  options={[{ value: '', label: 'ไม่แนบ' }, ...schedules.map((s) => ({ value: s.id, label: s.name }))]}
                  value={scheduleId}
                  onChange={(val) => setScheduleId(val)}
                  placeholder="เลือกตารางปฏิบัติงาน..."
                />
              </FormField>
            </div>
          </Card>
        )}

        <div className="flex flex-col lg:flex-row items-stretch gap-6 w-full lg:col-span-2">
          <div className="w-full lg:flex-1 min-w-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">หมายเหตุ</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} disabled={isReadOnly} placeholder="หมายเหตุเพิ่มเติม..." className="!w-full !max-w-none resize-none flex-1" />
          </div>
          <div className="w-full lg:w-96 shrink-0 space-y-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between text-sm"><span className="text-slate-600">รวมเป็นเงิน (Subtotal)</span><span className="font-medium text-slate-900">{subtotal.toLocaleString()} บาท</span></div>
            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600"><input type="checkbox" checked={includeVat} onChange={(e) => setIncludeVat(e.target.checked)} disabled={isReadOnly} className="rounded border-slate-300 text-green-600 h-4 w-4" />ภาษีมูลค่ารวม 7% (VAT)</label>
              <span className="font-medium text-slate-900">{vatAmount.toLocaleString()} บาท</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between items-center"><span className="text-base font-bold text-slate-800">จำนวนเงินรวมทั้งสิ้น</span><span className="text-xl font-bold text-green-600">{netTotal.toLocaleString()} บาท</span></div>
          </div>
        </div>
      </div>
    </form>
    </div>
  );
};