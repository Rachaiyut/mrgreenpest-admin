import {
  useState,
  useEffect,
  useMemo,
  FC,
  ChangeEvent,
  FormEvent,
} from 'react';
import {
  FormField,
  Input,
  Textarea,
  Button,
} from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import {
  Assessment,
  Product,
  AssessmentWorkArea,
  Customer,
  Category,
  AssessmentInstallment,
} from '@/src/types/entity/app.interface';
import { Package } from '@/src/types/entity/package.interface';
import { WorkAreaForm } from './WorkAreaForm';
import { AsessmentStatus } from '@/src/types/enums/assessment';
import { AssessmentApi, CategoryApi, CustomerApi, PackageApi, ProductApi } from '@/src/api';
import { PaymentMethod } from '@/src/types/enums/financial';
import { CategoryType, Role } from '@/src/types';
import {
  UserIcon,
  DocumentIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  PlusIcon,
  CalendarIcon,
  MapPinIcon,
  PhoneIcon,
  LoadingIcon,
} from '../../../assets/icons/Icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface AssessmentFormProps {
  isOpen: boolean;
  initialData?: Assessment | null;
  currentUserRole: Role;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 0, label: 'ข้อมูลลูกค้า', icon: UserIcon },
  { id: 1, label: 'พื้นที่บริการ', icon: DocumentIcon },
  { id: 2, label: 'การชำระเงิน', icon: CreditCardIcon },
];

export const AssessmentForm: FC<AssessmentFormProps> = ({
  isOpen,
  initialData,
  currentUserRole,
  onSubmit,
  onCancel,
}) => {
  const isEdit = !!initialData?.id;
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([0]);
  const [formData, setFormData] = useState<Partial<Assessment>>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [workAreas, setWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [paymentCondition, setPaymentCondition] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
  const [installments, setInstallments] = useState<Partial<AssessmentInstallment>[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    const initializeData = async () => {
      setIsLoading(true);
      try {
        setCurrentStep(0);
        setVisitedSteps([0]);
        setErrors({});

        if (isEdit && initialData?.id) {
          const res = await AssessmentApi.getById(initialData.id);
          const loadedAssessment = (res as any).data || res;

          const productIds = new Set<string>();
          (loadedAssessment.assessment_areas || []).forEach((area: any) => {
            (area.items || []).forEach((item: any) => {
              if (item.product_id) productIds.add(item.product_id);
            });
          });

          const [categoriesRes, customerRes, packageRes, ...productResults] = await Promise.all([
            CategoryApi.getCategories({ type: CategoryType.SERVICE }),
            loadedAssessment.customer_id ? CustomerApi.getCustomerById(loadedAssessment.customer_id).catch(() => null) : Promise.resolve(null),
            loadedAssessment.package_id ? PackageApi.getPackages() : Promise.resolve(null),
            ...Array.from(productIds).map(pid => ProductApi.getProductById(pid).catch(() => null))
          ]);

          const fetchedCategories = categoriesRes?.data || [];

          const fetchedCustomers = customerRes ? [(customerRes as any).data || customerRes] : [];
          const fetchedPackages = packageRes ? ((packageRes as any).data || packageRes) : [];
          const fetchedProducts = productResults.map(pr => (pr as any)?.data || pr).filter(Boolean);

          setCustomers(fetchedCustomers);
          setPackages(Array.isArray(fetchedPackages) ? fetchedPackages : []);
          setProducts(fetchedProducts);
          setCategories(fetchedCategories);

          // เซ็ตข้อมูลลงฟอร์ม
          const { assessment_areas, ...rest } = loadedAssessment;
          setFormData({
            ...rest,
            created_at: loadedAssessment.created_at ? new Date(loadedAssessment.created_at).toISOString() : '',
            appointment_date: loadedAssessment.appointment_date ? new Date(loadedAssessment.appointment_date).toISOString() : undefined,
            google_map_link: loadedAssessment.google_map_link || (loadedAssessment.customer && loadedAssessment.customer.google_map_link) || '',
          });

          setSelectedPackageId(loadedAssessment.package_id || null);

          const foundCustomer = fetchedCustomers[0] || loadedAssessment.customer;
          setSelectedCustomerData((foundCustomer as Customer) || null);

          let loadedPaymentCondition = loadedAssessment.payment_condition || PaymentMethod.TRANSFER;
          if (loadedAssessment.installments && loadedAssessment.installments.length > 0 && loadedPaymentCondition !== PaymentMethod.INSTALLMENT) {
            loadedPaymentCondition = PaymentMethod.INSTALLMENT;
          }
          setPaymentCondition(loadedPaymentCondition);
          setInstallments(loadedAssessment.installments || []);

          const rawAreas = assessment_areas || [];
          const enrichedAreas = rawAreas.map((wa: any) => {
            const enrichedItems = (wa.items || []).map((item: any) => {
              if (item.product_id && (!item.product_name || !item.product_price)) {
                const product = fetchedProducts.find((p: any) => p.id === item.product_id);
                if (product) return { ...item, product_name: product.name, product_price: Number(product.cost_price || 0) };
              }
              return item;
            });

            let packagePrice = wa.package_price !== undefined && wa.package_price !== null ? Number(wa.package_price) : 0;
            const itemsTotal = enrichedItems.reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0);

            return {
              ...wa,
              items: enrichedItems,
              category_services: wa.category_services || [],
              package_price: packagePrice,
              total_price: (wa.total_price !== undefined && wa.total_price !== null) ? Number(wa.total_price) : (packagePrice + itemsTotal),
            };
          });

          setWorkAreas(enrichedAreas);

        } else {
          const [customersRes, packagesRes, productsRes, categoriesRes] = await Promise.all([
            CustomerApi.getCustomers({ limit: 50 }),
            PackageApi.getPackages(),
            ProductApi.getProducts({ limit: 50 }),
            CategoryApi.getCategories({ type: CategoryType.SERVICE }),
          ]);

          setCustomers(customersRes.data || []);
          setPackages(packagesRes.data || []);
          setProducts(productsRes.data || []);
          setCategories(categoriesRes.data || []);

          // เซ็ตค่าตั้งต้น
          setFormData({
            status: AsessmentStatus.DRAFT,
            created_at: new Date().toISOString(),
          });
          setWorkAreas([{
            id: `area-${Date.now()}`,
            area_name: 'พื้นที่ 1',
            building_type: '',
            items: [],
            category_services: [],
            total_price: 0,
          }]);
          setInstallments([]);
          setPaymentCondition(PaymentMethod.TRANSFER);
          setSelectedPackageId(null);
          setSelectedCustomerData(null);
        }
      } catch (error) {
        console.error('Error initializing form data', error);
      } finally {
        setIsLoading(false); // ปิด Loading เสมอ
      }
    };

    initializeData();
  }, [isOpen, initialData, isEdit]);

  const totalEstimatedCost = useMemo(
    () => workAreas.reduce((sum, area) => sum + (Number(area.total_price) || 0), 0),
    [workAreas]
  );

  const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleDateChange = (name: string, date: Date | null) => {
    setFormData((prev) => ({ ...prev, [name]: date ? date.toISOString() : null }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCustomerSelect = (customerId: string | null) => {
    if (!customerId) {
      setFormData((prev) => ({ ...prev, customer_id: '' }));
      setSelectedCustomerData(null);
      return;
    }
    setFormData((prev) => ({ ...prev, customer_id: customerId }));
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomerData(customer);
      setFormData((prev) => ({
        ...prev,
        customer_id: customerId,
        address: customer.address_house_no || '',
        sub_district: customer.sub_district || '',
        district: customer.district || '',
        province: customer.province || '',
        zipcode: customer.postal_code || '',
        google_map_link: customer.google_map_link || '',
      }));
      setErrors((prev) => ({ ...prev, customer_id: '', address: '' }));
    }
  };

  const handleAddArea = () => {
    setWorkAreas((prev) => [
      ...prev,
      {
        id: `area-${Date.now()}`,
        area_name: `พื้นที่ ${prev.length + 1}`,
        building_type: '',
        items: [],
        category_services: [],
        base_service_price: 0,
        total_price: 0,
      },
    ]);
  };

  const handleAreaChange = (index: number, updatedArea: Partial<AssessmentWorkArea>) => {
    setWorkAreas((prev) => prev.map((area, i) => (i === index ? updatedArea : area)));
    setErrors((prev) => {
      const newErrs = { ...prev };
      if (updatedArea.area_name) delete newErrs[`area_${index}_area_name`];
      if (updatedArea.building_type) delete newErrs[`area_${index}_building_type`];
      if (updatedArea.service_system) delete newErrs[`area_${index}_service_system`];
      if (updatedArea.category_services?.length) delete newErrs[`area_${index}_category_services`];
      return newErrs;
    });
  };

  const handleClearArea = (index: number) => {
    setWorkAreas((prev) => {
      const newAreas = [...prev];
      if (newAreas[index]) {
        newAreas[index] = {
          id: newAreas[index].id,
          area_name: newAreas[index].area_name,
          building_type: '',
          area_size: undefined,
          category_services: [],
          service_system: undefined,
          total_price: 0,
        };
      }
      return newAreas;
    });
  };

  const handleRemoveArea = (index: number) => {
    if (workAreas.length > 1) {
      setWorkAreas((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handlePackageSelect = (pkgId: string | null) => {
    setSelectedPackageId(pkgId);
    setFormData((prev) => ({ ...prev, package_id: pkgId || '' }));

    const selectedPkg = pkgId ? packages.find((p) => p.id === pkgId) : null;

    setWorkAreas((prevAreas) =>
      prevAreas.map((area) => {
        if (!selectedPkg || !area.area_size || area.area_size <= 0) return { ...area };

        const sortedConditions = [...((selectedPkg as any).package_price || (selectedPkg as any).package_prices || [])].sort((a: any, b: any) => a.area_range - b.area_range);
        const bestFit = sortedConditions.find((c: any) => c.area_range >= area.area_size!);

        if (bestFit) {
          const termiteCategory = categories.find((c) => c.name.includes('กำจัดปลวก'));
          const hasTermites = (area.category_services || []).some((s) => s.category_id === termiteCategory?.id);
          const priceToUse = hasTermites ? bestFit.price_with_termite : bestFit.price_without_termite;

          return {
            ...area,
            base_service_price: priceToUse,
            package_price: priceToUse,
            package_price_id: bestFit.id,
            total_price: priceToUse + (area.items || []).reduce((sum, item) => sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0), 0),
          };
        }
        return { ...area };
      })
    );
  };

  const handleAddInstallment = () => {
    setInstallments((prev) => {
      const newCount = prev.length + 1;
      const baseAmount = Math.floor((totalEstimatedCost / newCount) * 100) / 100;
      const remainder = totalEstimatedCost - baseAmount * newCount;

      const newInstallments = [...prev, { id: crypto.randomUUID(), installment_no: newCount, amount: 0, note: `งวดที่ ${newCount}` }];
      return newInstallments.map((inst, index) => ({
        ...inst,
        amount: index === newCount - 1 ? Number((baseAmount + remainder).toFixed(2)) : baseAmount,
      }));
    });
  };

  const handleRemoveInstallment = (index: number) => {
    setInstallments((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      const newCount = filtered.length;
      if (newCount === 0) return [];

      const baseAmount = Math.floor((totalEstimatedCost / newCount) * 100) / 100;
      const remainder = totalEstimatedCost - baseAmount * newCount;

      return filtered.map((inst, i) => ({
        ...inst,
        installment_no: i + 1,
        amount: i === newCount - 1 ? Number((baseAmount + remainder).toFixed(2)) : baseAmount,
        note: inst.note?.includes('งวดที่') ? `งวดที่ ${i + 1}` : inst.note,
      }));
    });
  };

  const handleInstallmentChange = (index: number, field: keyof AssessmentInstallment, value: any) => {
    setInstallments((prev) => prev.map((inst, i) => (i === index ? { ...inst, [field]: value } : inst)));
  };

  useEffect(() => {
    if (paymentCondition === PaymentMethod.INSTALLMENT) {
      if (installments.length === 0 && totalEstimatedCost > 0) {
        setInstallments([
          { id: crypto.randomUUID(), installment_no: 1, amount: totalEstimatedCost / 2, note: 'งวดที่ 1' },
          { id: crypto.randomUUID(), installment_no: 2, amount: totalEstimatedCost / 2, note: 'งวดที่ 2' },
        ]);
      } else if (installments.length > 0 && totalEstimatedCost > 0) {
        const currentTotal = installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        if (Math.abs(currentTotal - totalEstimatedCost) > 0.05) {
          const count = installments.length;
          const baseAmount = Math.floor((totalEstimatedCost / count) * 100) / 100;
          const remainder = totalEstimatedCost - baseAmount * count;
          setInstallments((prev) => prev.map((inst, index) => ({
            ...inst,
            amount: index === count - 1 ? Number((baseAmount + remainder).toFixed(2)) : baseAmount
          })));
        }
      }
    } else {
      if (installments.length > 0) setInstallments([]);
    }
  }, [paymentCondition, totalEstimatedCost]);

  const validateStep = (): boolean => {
    if (currentStep === 0) {
      const newErrors: Record<string, string> = {};
      if (!formData.customer_id) newErrors.customer_id = 'กรุณาเลือกลูกค้า';
      if (!formData.created_at) newErrors.created_at = 'กรุณาระบุวันที่สร้าง';
      if (!formData.appointment_date) newErrors.appointment_date = 'กรุณาระบุวันที่นัดหมาย';
      if (!formData.address?.trim()) newErrors.address = 'กรุณากรอกที่อยู่';
      if (!formData.google_map_link?.trim()) newErrors.google_map_link = 'กรุณากรอก Link Google Map';
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    if (currentStep === 1) {
      if (workAreas.length === 0) return false;
      let isValid = true;
      const newErrors: Record<string, string> = {};
      workAreas.forEach((area, index) => {
        if (!area.area_name?.trim()) { newErrors[`area_${index}_area_name`] = 'กรุณาระบุชื่อพื้นที่'; isValid = false; }
        if (!area.building_type) { newErrors[`area_${index}_building_type`] = 'กรุณาระบุประเภทสิ่งปลูกสร้าง'; isValid = false; }
        if (!area.service_system) { newErrors[`area_${index}_service_system`] = 'กรุณาระบุระบบใช้บริการ'; isValid = false; }
        if (!area.category_services || area.category_services.length === 0) { newErrors[`area_${index}_category_services`] = 'กรุณาระบุประเภทบริการ'; isValid = false; }
      });
      setErrors(newErrors);
      return isValid;
    }

    if (currentStep === 2) {
      if (paymentCondition === PaymentMethod.INSTALLMENT) {
        const totalInstallment = installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        return Math.abs(totalInstallment - totalEstimatedCost) < 1;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => {
        const next = prev + 1;
        setVisitedSteps((v) => [...new Set([...v, next])]);
        return next;
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const getSubmitButtonText = () => {
    if (isEdit && formData.status === AsessmentStatus.PENDING) {
      const roleStr = typeof currentUserRole === 'object' ? (currentUserRole as any)?.name : String(currentUserRole);
      const formattedRole = String(roleStr || '').toUpperCase();

      if (formattedRole === 'SUPERADMIN' || formattedRole === 'ADMIN') {
        return 'บันทึกและตรวจสอบ';
      }
      if (formattedRole === 'COO') {
        return 'อนุมัติและตรวจสอบ';
      }
    }
    if (!isEdit || formData.status === AsessmentStatus.DRAFT) {
      return 'ยืนยันและส่งประเมิน';
    }
    return 'บันทึกการแก้ไข';
  };

  const handleSubmitData = async (e?: FormEvent | React.MouseEvent, targetStatus?: AsessmentStatus) => {
    if (e && e.preventDefault) e.preventDefault();

    // 🟢 1. ดูว่าผ่าน validateStep ไหม
    const isValid = validateStep();
    console.log('--- Is Form Valid? ---', isValid);
    console.log('--- Current Errors ---', errors); // 🟢 2. พิมพ์ Error ออกมาดู

    if (!isValid) return; // 👈 ถ้ามี Error มันจะจบการทำงานบรรทัดนี้ทันที!
    
    if (!validateStep()) return;

    setIsSubmitting(true);
    try {
      const sanitizedWorkAreas = workAreas.map((area) => {
        const newArea: any = { ...area };
        if (newArea.id && newArea.id.startsWith('area-')) newArea.id = crypto.randomUUID();
        if (newArea.package_price !== undefined && newArea.package_price !== null) newArea.package_price = Number(newArea.package_price);

        newArea.items = (newArea.items || []).map((item: any) => {
          const sanitizedItem: any = {
            product_id: item.product_id,
            product_name: item.product_name || '',
            product_price: Number(item.product_price) || 0,
            quantity: Number(item.quantity) || 1,
            total_price: (Number(item.product_price) || 0) * (Number(item.quantity) || 1),
          };
          if (item.id && !item.id.startsWith('item-') && item.id.includes('-')) sanitizedItem.id = item.id;
          return sanitizedItem;
        });

        newArea.category_services = (newArea.category_services || []).map((cat: any) => ({
          category_id: cat.category_id,
          ...(cat.id && !cat.id.startsWith('cat-') ? { id: cat.id } : {}),
        }));

        return newArea;
      });

      const payload: any = {
        ...formData,
        status: targetStatus || formData.status || AsessmentStatus.DRAFT,
        updated_by: 'ผู้ดูแลระบบ',
        assessment_areas: sanitizedWorkAreas,
        total_price: totalEstimatedCost,
        payment_condition: paymentCondition,
        installments: paymentCondition === PaymentMethod.INSTALLMENT ? installments : [],
        customer_id: formData.customer_id || '',
        created_at: formData.created_at ? new Date(formData.created_at).toISOString() : new Date().toISOString(),
      };

      // created_by จะถูก set โดย @BodyWithUser ฝั่ง backend อัตโนมัติ

      await onSubmit(payload);
    } catch (error) {
      console.error('Submit Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col relative">
      {(isLoading || isSubmitting) && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl">
          <LoadingIcon className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {/* HEADER: STEPPER */}
      <div className="mb-8">
        <div className="relative after:absolute after:inset-x-0 after:top-1/2 after:block after:h-0.5 after:-translate-y-1/2 after:rounded-lg after:bg-slate-100">
          <ol className="relative z-10 flex justify-between text-sm font-medium text-slate-500">
            {STEPS.map((step, index) => {
              const isCompleted = visitedSteps.includes(index) && currentStep > index;
              const isCurrent = currentStep === index;
              return (
                <li key={step.id} className="flex items-center gap-2 bg-white p-2">
                  <span className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${isCurrent ? 'border-primary bg-primary text-white' : isCompleted ? 'border-green-500 bg-green-500 text-white' : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}>
                    {isCompleted ? <CheckCircleIcon className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
                  </span>
                  <span className={`${isCurrent ? 'text-primary font-bold' : isCompleted ? 'text-green-600' : 'text-slate-500'}`}>{step.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* BODY: STEPS CONTENT */}
      <div className="min-h-[400px]">
        {/* STEP 1 */}
        {currentStep === 0 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary"><UserIcon className="w-5 h-5" /></div>ข้อมูลลูกค้า
                </h3>
                <div className="space-y-6 flex-1 flex flex-col">
                  <div>
                    <SearchableSelect
                      label="ค้นหาลูกค้า *"
                      options={(customers || []).map((c) => ({
                        value: c.id,
                        label: `${c.code} : ${c.first_name} ${c.last_name} ${c.nickname ? `(${c.nickname})` : ''} - ${c.primary_phone}`,
                        description: `${c.address_house_no} ${c.sub_district} ${c.district} ${c.province}`,
                      }))}
                      value={formData.customer_id || ''}
                      onChange={handleCustomerSelect}
                    />
                    {errors.customer_id && <p className="text-red-500 text-xs mt-1 font-medium">{errors.customer_id}</p>}
                  </div>
                  {selectedCustomerData ? (
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-700 shadow-sm">
                            {selectedCustomerData.first_name?.[0]}
                          </div>
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
                      </div>
                    </div>
                  ) : (
                    <div className={`flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed text-center flex-1 ${errors.customer_id ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-300'}`}>
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3"><UserIcon className="w-6 h-6 text-slate-300" /></div>
                      <p className="text-slate-500 font-medium">กรุณาเลือกลูกค้า</p>
                      <p className="text-xs text-slate-400 mt-1">เพื่อดำเนินการต่อ</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><CalendarIcon className="w-5 h-5" /></div>ข้อมูลนัดหมาย
                </h3>
                <div className="space-y-6">
                  <div className={`p-4 rounded-xl border transition-colors ${errors.created_at ? 'border-red-500 bg-red-50/50' : 'border-slate-200/60 bg-slate-50/50'}`}>
                    <FormField label="วันที่สร้าง *" htmlFor="created_at" className="mb-0">
                      <div className="relative">
                        <DatePicker selected={formData.created_at ? new Date(formData.created_at) : new Date()} onChange={(date) => handleDateChange('created_at', date)} placeholderText="dd/mm/yyyy" dateFormat="dd/MM/yy" locale="th" wrapperClassName="w-full" className={`h-10 border text-sm rounded-md p-2 w-full transition-colors ${errors.created_at ? 'border-red-500 focus:ring-red-500' : 'bg-white'}`} />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                      </div>
                    </FormField>
                    {errors.created_at && <p className="text-red-500 text-xs mt-1 font-medium">{errors.created_at}</p>}
                  </div>
                  <div className={`p-4 rounded-xl border transition-colors ${errors.appointment_date ? 'border-red-500 bg-red-50/50' : 'border-slate-200/60 bg-slate-50/50'}`}>
                    <FormField label="วันที่นัดหมาย *" htmlFor="appointment_date" className="mb-0">
                      <div className="relative">
                        <DatePicker selected={formData.appointment_date ? new Date(formData.appointment_date) : null} onChange={(date) => handleDateChange('appointment_date', date)} minDate={new Date()} placeholderText="dd/mm/yyyy" dateFormat="dd/MM/yy" locale="th" wrapperClassName="w-full" className={`h-10 border text-sm rounded-md p-2 w-full transition-colors ${errors.appointment_date ? 'border-red-500 focus:ring-red-500' : 'bg-white'}`} />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                      </div>
                    </FormField>
                    {errors.appointment_date && <p className="text-red-500 text-xs mt-1 font-medium">{errors.appointment_date}</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-4">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-4"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span>ที่อยู่สำหรับเข้าประเมิน (สามารถแก้ไขได้)</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">ที่อยู่ (บ้านเลขที่, ถนน) <span className="text-red-500">*</span></label>
                <Textarea name="address" value={formData.address || ''} onChange={handleFieldChange} className={`transition-colors ${errors.address ? 'border-red-500 focus:ring-red-500 bg-red-50/30' : 'bg-slate-50 focus:bg-white'}`} rows={2} />
                {errors.address && <p className="text-red-500 text-xs mt-1 font-medium">{errors.address}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="แขวง/ตำบล" htmlFor="sub_district"><Input name="sub_district" value={formData.sub_district || ''} onChange={handleFieldChange} className="bg-slate-50 focus:bg-white" /></FormField>
                <FormField label="เขต/อำเภอ" htmlFor="district"><Input name="district" value={formData.district || ''} onChange={handleFieldChange} className="bg-slate-50 focus:bg-white" /></FormField>
                <FormField label="จังหวัด" htmlFor="province"><Input name="province" value={formData.province || ''} onChange={handleFieldChange} className="bg-slate-50 focus:bg-white" /></FormField>
                <FormField label="รหัสไปรษณีย์" htmlFor="zipcode"><Input name="zipcode" value={formData.zipcode || ''} onChange={handleFieldChange} className="bg-slate-50 focus:bg-white" /></FormField>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t mt-4 border-slate-100">
                <FormField label="เขต (Zone)" htmlFor="zone"><Input name="zone" value={formData.zone || ''} onChange={handleFieldChange} className="bg-slate-50 focus:bg-white" /></FormField>
                <FormField label="Group" htmlFor="route_group"><Input name="route_group" value={formData.route_group || ''} onChange={handleFieldChange} className="bg-slate-50 focus:bg-white" /></FormField>
                <FormField label="สายถนน" htmlFor="road_line"><Input name="road_line" value={formData.road_line || ''} onChange={handleFieldChange} className="bg-slate-50 focus:bg-white" /></FormField>
                <FormField label="ลำดับ" htmlFor="sequence"><Input name="sequence" value={formData.sequence || ''} onChange={handleFieldChange} className="bg-slate-50 focus:bg-white" /></FormField>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Link Google Map <span className="text-red-500">*</span></label>
                <Input
                  name="google_map_link"
                  type="url"
                  placeholder="https://maps.app.goo.gl/..."
                  value={formData.google_map_link || ''}
                  onChange={handleFieldChange}
                  className={`transition-colors ${errors.google_map_link ? 'border-red-500 focus:ring-red-500 bg-red-50/30' : 'bg-slate-50 focus:bg-white'}`}
                />
                {errors.google_map_link && <p className="text-red-500 text-xs mt-1 font-medium">{errors.google_map_link}</p>}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">พื้นที่ให้บริการ</h3>
                <p className="text-sm text-slate-500">จัดการพื้นที่และเลือกแพ็กเกจบริการ</p>
              </div>
            </div>
            <div className="space-y-4">
              {workAreas
                .map((area, originalIndex) => ({ area, originalIndex }))
                .sort((a, b) => (a.area.area_name || '').localeCompare(b.area.area_name || '', 'th'))
                .map(({ area, originalIndex }) => (
                <WorkAreaForm
                  key={area.id || originalIndex}
                  area={area}
                  index={originalIndex}
                  // @ts-ignore
                  errors={errors}
                  onAreaChange={handleAreaChange}
                  onClearArea={handleClearArea}
                  onRemoveArea={handleRemoveArea}
                  products={products}
                  categories={categories}
                  selectedPackage={selectedPackageId ? packages.find((p) => p.id === selectedPackageId)! : null}
                  availablePackages={packages}
                  onSelectPackage={handlePackageSelect}
                />
              ))}
              {workAreas.length === 0 && <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">ยังไม่มีพื้นที่ให้บริการ กด "เพิ่มพื้นที่" เพื่อเริ่มต้น</div>}
              <div className="flex justify-center mt-6">
                <button type="button" onClick={handleAddArea} className="flex items-center gap-2 px-6 py-2.5 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 hover:shadow-sm transition-all font-medium"><PlusIcon className="h-5 w-5" />เพิ่มพื้นที่ให้บริการ</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><CreditCardIcon className="w-5 h-5 text-primary" />เงื่อนไขการชำระเงิน</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <label className={`relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all ${paymentCondition === PaymentMethod.TRANSFER ? 'border-primary bg-primary/5 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <input type="radio" name="paymentCondition" value={PaymentMethod.TRANSFER} checked={paymentCondition === PaymentMethod.TRANSFER} onChange={() => setPaymentCondition(PaymentMethod.TRANSFER)} className="w-5 h-5 text-primary border-slate-300 focus:ring-primary" />
                      <div className="ml-3"><span className="block text-sm font-bold text-slate-800">ชำระเต็มจำนวน</span><span className="block text-xs text-slate-500">เงินสด / โอนเงิน / เครดิต</span></div>
                    </label>
                    <label className={`relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all ${paymentCondition === PaymentMethod.INSTALLMENT ? 'border-primary bg-primary/5 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <input type="radio" name="paymentCondition" value={PaymentMethod.INSTALLMENT} checked={paymentCondition === PaymentMethod.INSTALLMENT} onChange={() => setPaymentCondition(PaymentMethod.INSTALLMENT)} className="w-5 h-5 text-primary border-slate-300 focus:ring-primary" />
                      <div className="ml-3"><span className="block text-sm font-bold text-slate-800">แบ่งชำระ (งวดงาน)</span><span className="block text-xs text-slate-500">แบ่งจ่ายตามงวดงานที่กำหนด</span></div>
                    </label>
                  </div>
                  {paymentCondition === PaymentMethod.INSTALLMENT && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-slate-700">รายละเอียดงวดงาน</h4>
                        <Button type="button" onClick={handleAddInstallment} variant="ghost" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium hover:bg-primary/5"><PlusIcon className="w-4 h-4" />เพิ่มงวด</Button>
                      </div>
                      <div className="overflow-hidden border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr><th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 uppercase w-16">งวดที่</th><th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 uppercase">รายละเอียด</th><th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 uppercase w-32">จำนวนเงิน</th><th className="px-2 py-3 w-10"></th></tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {installments.map((inst, idx) => (
                              <tr key={inst.id || idx}>
                                <td className="px-4 py-2 text-center text-sm font-medium text-slate-700"><div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-xs font-bold text-slate-600">{inst.installment_no}</div></td>
                                <td className="px-4 py-2"><Input value={inst.note || ''} onChange={(e) => handleInstallmentChange(idx, 'note', e.target.value)} placeholder="รายละเอียด..." className="h-9 text-sm border-slate-200 focus:border-primary" /></td>
                                <td className="px-4 py-2"><Input type="number" value={inst.amount} onChange={(e) => handleInstallmentChange(idx, 'amount', Number(e.target.value))} className="h-9 text-right text-sm font-mono font-medium border-slate-200 focus:border-primary" /></td>
                                <td className="px-2 py-2 text-center"><button type="button" onClick={() => handleRemoveInstallment(idx)} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors" disabled={installments.length <= 1}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" /></svg></button></td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50">
                            <tr><td colSpan={2} className="px-4 py-2 text-right text-xs font-bold text-slate-600">รวม</td><td className={`px-4 py-2 text-right text-sm font-bold ${Math.abs(installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) - totalEstimatedCost) < 1 ? 'text-green-600' : 'text-red-600'}`}>{installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0).toLocaleString()}</td><td colSpan={2}></td></tr>
                          </tfoot>
                        </table>
                      </div>
                      {Math.abs(installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) - totalEstimatedCost) >= 1 && <p className="text-xs text-red-500 text-right">* ยอดรวมงวดงานต้องเท่ากับยอดรวมสุทธิ ({totalEstimatedCost.toLocaleString()} บาท)</p>}
                    </div>
                  )}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">สรุปรายการพื้นที่</h3>
                  <div className="space-y-3">
                    {workAreas.map((area, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div><div className="font-medium text-slate-700">{area.area_name}</div><div className="text-sm text-slate-500">{area.items?.length || 0} รายการ</div></div>
                        <div className="font-semibold text-slate-700">{area.total_price?.toLocaleString()} บาท</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm sticky top-4">
                  <div className="p-4 border-b bg-slate-50 rounded-t-xl"><h3 className="font-bold text-slate-800">สรุปรายการ</h3></div>
                  <div className="p-4 space-y-4">
                    <div className="flex justify-between text-sm"><span className="text-slate-500">จำนวนพื้นที่บริการ</span><span className="font-medium">{workAreas.length} แห่ง</span></div>
                    <div className="space-y-2">{workAreas.map((area, idx) => (<div key={idx} className="flex justify-between text-xs text-slate-500 pl-2 border-l-2 border-slate-100"><span className="truncate max-w-[150px]">{area.area_name}</span><span>฿{(area.total_price || 0).toLocaleString()}</span></div>))}</div>
                    <div className="pt-4 border-t flex justify-between items-end"><span className="font-semibold text-slate-700">ยอดรวมสุทธิ</span><span className="text-2xl font-bold text-primary">฿{totalEstimatedCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER: BUTTONS */}
      <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center w-full px-2">
        <div className="text-slate-500 font-medium">ขั้นตอนที่ {currentStep + 1} จาก {STEPS.length}</div>
        <div className="flex items-center gap-3">
          {currentStep > 0 && (
            <Button type="button" onClick={handleBack} variant="outline" className="px-6 !h-10 border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 text-base font-bold rounded-lg" disabled={isSubmitting}>
              <ArrowLeftIcon className="w-4 h-4" />ย้อนกลับ
            </Button>
          )}

          {currentStep < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNext} variant="primary" className="px-8 !h-10 bg-green-600 hover:bg-green-700 text-white border-transparent flex items-center justify-center gap-2 shadow-md text-lg font-bold rounded-xl" disabled={isSubmitting}>
              ถัดไป<ArrowRightIcon className="w-4 h-4 stroke-[2] mt-0.5" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={(e) => {
                // 🌟 แก้ไข: 
                // 1. ถ้าสร้างใหม่ (!isEdit) -> ให้ส่งเป็น DRAFT
                // 2. ถ้าแก้ไขและสถานะเป็น DRAFT อยู่ -> ให้ดันเป็น PENDING (ส่งประเมิน)
                // 3. สถานะอื่นๆ ให้คงเดิม
                const targetStatus = !isEdit
                  ? AsessmentStatus.DRAFT
                  : (formData.status === AsessmentStatus.DRAFT
                    ? AsessmentStatus.PENDING
                    : (formData.status as AsessmentStatus));

                handleSubmitData(e, targetStatus);
              }}
              variant="primary"
              className="px-8 !h-10 bg-green-600 hover:bg-green-700 text-white border-transparent flex items-center justify-center gap-2 shadow-md text-lg font-bold rounded-xl"
              disabled={isSubmitting}
            >
              {getSubmitButtonText()}<CheckCircleIcon className="w-4 h-4 stroke-[2] mt-0.5" />
            </Button>
          )}
        </div>
      </div>

    </div>
  );
};