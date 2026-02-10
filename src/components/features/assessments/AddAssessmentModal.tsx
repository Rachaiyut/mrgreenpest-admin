// Re-trigger build
import { useState, useEffect, useMemo, useCallback, FC, ChangeEvent, FormEvent, Fragment } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Select, Textarea } from '../../common/FormControls';
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
import { AsessmentStatus, ServiceSystem } from '@/src/types/enums/assessment';
import { CategoryApi, CustomerApi, PackageApi, ProductApi } from '@/src/api';
import { PaymentMethod } from '@/src/types/enums/financial';
import { CategoryType } from '@/src/types';
import { UserIcon, DocumentIcon, CreditCardIcon, CheckCircleIcon, ArrowRightIcon, ArrowLeftIcon, PlusIcon } from '../../../assets/icons/Icons';

interface AddAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAssessment: (assessmentData: Omit<Assessment, 'id' | 'code'> & { installments?: Partial<AssessmentInstallment>[] }) => void;
}

const STEPS = [
  { id: 0, label: 'ข้อมูลลูกค้า', icon: UserIcon },
  { id: 1, label: 'พื้นที่บริการ', icon: DocumentIcon },
  { id: 2, label: 'การชำระเงิน', icon: CreditCardIcon },
];

export const AddAssessmentModal: FC<AddAssessmentModalProps> = ({
  isOpen,
  onClose,
  onCreateAssessment,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<
    Partial<Omit<Assessment, 'workAreas' | 'totalEstimatedCost'>>
  >({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [workAreas, setWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [paymentCondition, setPaymentCondition] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
  const [installments, setInstallments] = useState<Partial<AssessmentInstallment>[]>([]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      const fetchData = async () => {
        try {
          const [customersRes, packagesRes, productsRes, categoriesRes] = await Promise.all([
            CustomerApi.getCustomers({ limit: 10 }),
            PackageApi.getPackages({ limit: 10 }),
            ProductApi.getProducts({ limit: 10 }),
            CategoryApi.getCategories({ type: CategoryType.SERVICE })
          ]);
          setCustomers(customersRes.data);
          setPackages(packagesRes.data);
          setProducts(productsRes.data);
          setCategories(categoriesRes.data);
        } catch (error) {
          console.error("Error fetching data for assessment modal", error);
        }
      };
      fetchData();

      // Reset form
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
        base_service_price: 0,
        total_price: 0
      }]);
      setInstallments([]);
      setPaymentCondition(PaymentMethod.TRANSFER);
      setSelectedPackageId(null);
    }
  }, [isOpen]);

  const suggestedPackageOptions = useMemo(() => {
    return packages.filter(
      (pkg) =>
        pkg.package_price &&
        pkg.package_price.length > 0
    );
  }, [packages]);

  const totalEstimatedCost = useMemo(
    () => workAreas.reduce((sum, area) => sum + (Number(area.total_price) || 0), 0),
    [workAreas]
  );

  const handleFieldChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: new Date(value) }));
  };

  const handleCustomerSelect = (customerId: string | null) => {
    if (!customerId) {
      setFormData(prev => ({ ...prev, customer_id: '' }));
      return;
    }
    setFormData(prev => ({ ...prev, customer_id: customerId }));
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      // Auto-fill address if available and empty
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        address: prev.address || customer.address_house_no || '',
        sub_district: prev.sub_district || customer.sub_district || '',
        district: prev.district || customer.district || '',
        province: prev.province || customer.province || '',
        zipcode: prev.zipcode || customer.postal_code || '',
      }));
    }
  };

  const handleAddArea = () => {
    setWorkAreas(prev => [
      ...prev,
      {
        id: `area-${Date.now()}`,
        area_name: `พื้นที่ ${prev.length + 1}`,
        building_type: '',
        items: [],
        category_services: [],
        base_service_price: 0,
        total_price: 0
      }
    ]);
  };

  const handleAreaChange = (
    index: number,
    updatedArea: Partial<AssessmentWorkArea>
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
          area_name: areaToClear.area_name,
          building_type: '',
          area_size: undefined,
          category_services: [],
          service_system: undefined,
          base_service_price: 0,
          total_price: 0,
        };
      }
      return newAreas;
    });
  };

  const handleRemoveArea = (index: number) => {
      if (workAreas.length > 1) {
          setWorkAreas(prev => prev.filter((_, i) => i !== index));
      }
  };

  const handlePackageSelect = (pkgId: string | null) => {
    setSelectedPackageId(pkgId);
    setFormData((prev) => ({ ...prev, package_id: pkgId || '' }));

    const selectedPkg = pkgId
      ? packages.find((p) => p.id === pkgId)
      : null;

    setWorkAreas((prevAreas) =>
      prevAreas.map((area) => {
        if (!selectedPkg || !area.area_size || area.area_size <= 0) {
          return { ...area };
        }
        const sortedConditions = [
          ...((selectedPkg as any).package_price || []),
        ].sort((a: any, b: any) => a.area_range - b.area_range);
        const bestFit = sortedConditions.find(
          (c: any) => c.area_range >= area.area_size!
        );
        if (bestFit) {
          const termiteCategory = categories.find((c) =>
            c.name.includes('กำจัดปลวก')
          );
          const hasTermites = (area.category_services || []).some(
            (s) => s.category_id === termiteCategory?.id
          );
          const priceToUse = hasTermites
            ? bestFit.price_with_termite
            : bestFit.price_without_termite;
          return {
            ...area,
            base_service_price: priceToUse,
            package_price: priceToUse, // Set package price snapshot
            package_price_id: bestFit.id,
            total_price: priceToUse + (area.items || []).reduce(
              (sum, item) => sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0),
              0
            ),
          };
        } else {
          return { ...area };
        }
      })
    );
  };

  // Handlers for Installments
  const handleAddInstallment = () => {
    setInstallments(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        installment_no: prev.length + 1,
        amount: 0,
        note: `งวดที่ ${prev.length + 1}`,
      }
    ]);
  };

  const handleRemoveInstallment = (index: number) => {
    setInstallments(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((inst, i) => ({
        ...inst,
        installment_no: i + 1,
        note: inst.note?.includes('งวดที่') ? `งวดที่ ${i + 1}` : inst.note
      }));
    });
  };

  const handleInstallmentChange = (index: number, field: keyof AssessmentInstallment, value: any) => {
    setInstallments(prev => prev.map((inst, i) => {
      if (i === index) {
        return { ...inst, [field]: value };
      }
      return inst;
    }));
  };

  // Auto-calculate installments when total price changes or payment condition changes
  useEffect(() => {
    if (paymentCondition === PaymentMethod.INSTALLMENT && installments.length === 0 && totalEstimatedCost > 0) {
      // Default to 2 installments if none exist
      // Calculate dates: 1st installment on appointment date (or today), 2nd installment next month
      const date1 = formData.appointment_date ? new Date(formData.appointment_date) : new Date();
      const date2 = new Date(date1);
      date2.setMonth(date2.getMonth() + 1);

      setInstallments([
        { 
            id: crypto.randomUUID(), 
            installment_no: 1, 
            amount: totalEstimatedCost / 2, 
            note: 'งวดที่ 1',
            due_date: date1.toISOString().substring(0, 10)
        },
        { 
            id: crypto.randomUUID(), 
            installment_no: 2, 
            amount: totalEstimatedCost / 2, 
            note: 'งวดที่ 2',
            due_date: date2.toISOString().substring(0, 10)
        }
      ]);
    } else if (paymentCondition !== PaymentMethod.INSTALLMENT) {
      setInstallments([]);
    }
  }, [paymentCondition, totalEstimatedCost]);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();

    // Sanitize work areas before submission
    const sanitizedWorkAreas = (workAreas as AssessmentWorkArea[]).map(area => {
      const newArea = { ...area };
      if (newArea.package_price !== undefined && newArea.package_price !== null) {
        newArea.package_price = Number(newArea.package_price);
      }
      delete newArea.base_service_price;
      return newArea;
    });

    const newAssessment: Omit<Assessment, 'id' | 'code'> & { installments?: Partial<AssessmentInstallment>[] } = {
      // Defaults
      status: AsessmentStatus.DRAFT,
      created_by: 'ผู้ดูแลระบบ',
      updated_by: 'ผู้ดูแลระบบ',

      // Spread form data
      ...formData,

      // Overrides/Calculated
      assessment_areas: sanitizedWorkAreas,
      total_price: totalEstimatedCost,
      payment_condition: paymentCondition,
      installments: paymentCondition === PaymentMethod.INSTALLMENT ? installments as any : [],

      // Ensure required fields
      customer_id: formData.customer_id || '',
      address: formData.address || '',
      sub_district: formData.sub_district || '',
      district: formData.district || '',
      province: formData.province || '',
      zipcode: formData.zipcode || '',
      created_at: formData.created_at
        ? new Date(formData.created_at).toISOString()
        : new Date().toISOString(),
      appointment_date: formData.appointment_date,

      // Other fields
      zone: formData.zone || '',
      route_group: formData.route_group || '',
      road_line: formData.road_line || '',
      sequence: formData.sequence || '',
      google_map_link: formData.google_map_link || '',
    };

    onCreateAssessment(newAssessment);
    onClose();
  };

  const handleNext = () => {
    if (currentStep === 0) {
      // Validate Step 1
      if (!formData.created_at || !formData.appointment_date || !formData.customer_id || !formData.address || !formData.sub_district || !formData.district || !formData.province || !formData.zipcode) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }
    } else if (currentStep === 1) {
        // Validate Step 2: Work Areas
        const invalidArea = workAreas.find(area => {
            // Check for required fields in each area
            // 1. Must have an area name (usually auto-filled, but good to check)
            if (!area.area_name) return true;
            
            // 2. Must have a building type selected
            if (!area.building_type) return true;

            // 3. Must have a service system (usually from package or manual selection, but in UI it's inside WorkAreaForm and might not be directly in 'area' object if not lifted up properly, 
            //    BUT looking at WorkAreaForm, it updates 'area' via 'onAreaChange'. 
            //    Wait, 'service_system' is NOT in the top-level WorkAreaForm props, it seems it might be part of the package logic or just missing?
            //    Let's check AssessmentWorkArea interface. It usually has 'service_system'.
            //    However, the user asked to validate "input every step".
            //    In WorkAreaForm, we added 'required' to building_type select and service categories checkboxes.
            //    We need to check if 'category_services' has at least one item.
            
            if (!area.category_services || area.category_services.length === 0) return true;

            // 4. Must have area_size or perimeter depending on measurement type?
            //    The interface has 'area_size'. If it's 0, it might be invalid if it's required.
            //    Let's enforce area_size > 0 for now as a basic check.
            if (!area.area_size || area.area_size <= 0) return true;

            return false;
        });

        if (invalidArea) {
            alert(`กรุณากรอกข้อมูลพื้นที่ "${invalidArea.area_name}" ให้ครบถ้วน (ประเภทสิ่งปลูกสร้าง, ประเภทบริการ, ขนาดพื้นที่)`);
            return;
        }
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
      if (currentStep > 0) {
          setCurrentStep(prev => prev - 1);
      }
  };

  // Set search query state
  const [searchQuery, setSearchQuery] = useState('');

  const renderStepIndicator = () => (
      <div className="flex items-center justify-center mb-8 px-4">
          {STEPS.map((step, index) => (
              <Fragment key={step.id}>
                  <div className="flex flex-col items-center relative z-10">
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 border-2 ${
                            currentStep === index 
                                ? 'bg-primary text-white border-primary shadow-md' 
                                : currentStep > index 
                                    ? 'bg-green-500 text-white border-green-500' 
                                    : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                          {currentStep > index ? <CheckCircleIcon className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
                      </div>
                      <span className={`text-xs font-medium mt-2 absolute -bottom-6 w-32 text-center ${currentStep === index ? 'text-primary' : 'text-slate-500'}`}>
                          {step.label}
                      </span>
                  </div>
                  {index < STEPS.length - 1 && (
                      <div className={`h-0.5 w-16 md:w-32 -mx-2 mb-4 transition-colors duration-300 ${currentStep > index ? 'bg-green-500' : 'bg-slate-200'}`} />
                  )}
              </Fragment>
          ))}
      </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างใบประเมินใหม่"
      size="5xl"
      footer={
        <div className="flex w-full items-center justify-between">
           <div className="text-sm text-slate-500">
               ขั้นตอนที่ {currentStep + 1} จาก {STEPS.length}
           </div>
           <div className="flex items-center gap-3">
            {currentStep > 0 && (
                <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 py-2 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    ย้อนกลับ
                </button>
            )}
            
            {currentStep < STEPS.length - 1 ? (
                 <button
                 type="button"
                 onClick={handleNext}
                 className="flex items-center gap-2 py-2 px-6 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm transition-colors"
             >
                 ถัดไป
                 <ArrowRightIcon className="w-4 h-4" />
             </button>
            ) : (
                <button
                type="button"
                onClick={() => handleSubmit()}
                className="flex items-center gap-2 py-2 px-6 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm transition-colors"
            >
                <CheckCircleIcon className="w-4 h-4" />
                บันทึกใบประเมิน
            </button>
            )}
           </div>
        </div>
      }
    >
      <div className="pt-2 pb-6">
        {renderStepIndicator()}
      </div>

      <div className="min-h-[400px]">
        {/* STEP 1: CUSTOMER INFO */}
        {currentStep === 0 && (
            <div className="space-y-6 animate-fadeIn">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">ข้อมูลเบื้องต้น</h3>
                        <FormField label="วันที่สร้าง" htmlFor="created_at">
                            <Input
                            name="created_at"
                            type="date"
                            value={formData.created_at?.substring(0, 10) || ''}
                            onChange={handleFieldChange}
                            required
                            />
                        </FormField>
                        <FormField label="วันที่นัดหมาย" htmlFor="appointment_date">
                            <Input
                                name="appointment_date"
                                type="date"
                                value={
                                formData.appointment_date && !isNaN(new Date(formData.appointment_date).getTime())
                                    ? new Date(formData.appointment_date)
                                    .toISOString()
                                    .substring(0, 10)
                                    : ''
                                }
                                onChange={handleDateChange}
                                required
                            />
                        </FormField>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">เลือกลูกค้า</h3>
                        <SearchableSelect
                            label="ค้นหาลูกค้า"
                            options={(customers || []).map((c) => ({
                                value: c.id,
                                label: `${c.code} : ${c.first_name} ${c.last_name} ${c.nickname ? `(${c.nickname})` : ''
                                } - ${c.phone}`,
                                description: `${c.address_house_no} ${c.sub_district} ${c.district} ${c.province}`,
                            }))}
                            value={formData.customer_id || ''}
                            onChange={handleCustomerSelect}
                            onSearchChange={setSearchQuery}
                            required
                        />
                    </div>
                 </div>

                 <div className="border border-slate-200 p-5 rounded-xl bg-slate-50 space-y-4 mt-4">
                    <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        ข้อมูลที่อยู่ให้บริการ
                    </h3>
                    <FormField label="ที่อยู่ (บ้านเลขที่, ถนน)" htmlFor="address">
                        <Textarea
                        name="address"
                        value={formData.address || ''}
                        onChange={handleFieldChange}
                        required
                        className="bg-white"
                        />
                    </FormField>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="แขวง/ตำบล" htmlFor="sub_district">
                        <Input
                            name="sub_district"
                            value={formData.sub_district || ''}
                            onChange={handleFieldChange}
                            required
                            className="bg-white"
                        />
                        </FormField>
                        <FormField label="เขต/อำเภอ" htmlFor="district">
                        <Input
                            name="district"
                            value={formData.district || ''}
                            onChange={handleFieldChange}
                            required
                            className="bg-white"
                        />
                        </FormField>
                        <FormField label="จังหวัด" htmlFor="province">
                        <Input
                            name="province"
                            value={formData.province || ''}
                            onChange={handleFieldChange}
                            required
                            className="bg-white"
                        />
                        </FormField>
                        <FormField label="รหัสไปรษณีย์" htmlFor="zipcode">
                        <Input
                            name="zipcode"
                            value={formData.zipcode || ''}
                            onChange={handleFieldChange}
                            required
                            className="bg-white"
                        />
                        </FormField>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                        <FormField label="เขต (Zone)" htmlFor="zone">
                            <Input name="zone" value={formData.zone || ''} onChange={handleFieldChange} className="bg-white" />
                        </FormField>
                        <FormField label="Group" htmlFor="route_group">
                            <Input name="route_group" value={formData.route_group || ''} onChange={handleFieldChange} className="bg-white" />
                        </FormField>
                        <FormField label="สายถนน" htmlFor="road_line">
                            <Input name="road_line" value={formData.road_line || ''} onChange={handleFieldChange} className="bg-white" />
                        </FormField>
                        <FormField label="ลำดับ" htmlFor="sequence">
                            <Input name="sequence" value={formData.sequence || ''} onChange={handleFieldChange} className="bg-white" />
                        </FormField>
                    </div>

                    <FormField label="Link Google Map" htmlFor="google_map_link">
                        <Input
                        name="google_map_link"
                        type="url"
                        placeholder="https://maps.app.goo.gl/..."
                        value={formData.google_map_link || ''}
                        onChange={handleFieldChange}
                        className="bg-white"
                        />
                    </FormField>
                </div>
            </div>
        )}

        {/* STEP 2: WORK AREAS */}
        {currentStep === 1 && (
             <div className="space-y-6 animate-fadeIn">
                 <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">พื้นที่ให้บริการ</h3>
                        <p className="text-sm text-slate-500">จัดการพื้นที่และเลือกแพ็กเกจบริการ</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    {workAreas.map((area, index) => (
                        <WorkAreaForm
                        key={area.id || index}
                        area={area}
                        index={index}
                        onAreaChange={handleAreaChange}
                        onClearArea={handleClearArea}
                        onRemoveArea={handleRemoveArea}
                        products={products}
                        categories={categories}
                        selectedPackage={
                            selectedPackageId
                            ? packages.find((p) => p.id === selectedPackageId)!
                            : null
                        }
                        availablePackages={packages}
                        onSelectPackage={handlePackageSelect}
                        />
                    ))}
                    {workAreas.length === 0 && (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                            ยังไม่มีพื้นที่ให้บริการ กด "เพิ่มพื้นที่" เพื่อเริ่มต้น
                        </div>
                    )}

                    <div className="flex justify-center mt-6">
                        <button
                            type="button"
                            onClick={handleAddArea}
                            className="flex items-center gap-2 px-6 py-2.5 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 hover:shadow-sm transition-all font-medium"
                        >
                            <PlusIcon className="h-5 w-5" />
                            เพิ่มพื้นที่ให้บริการ
                        </button>
                    </div>
                 </div>
             </div>
        )}

        {/* STEP 3: REVIEW */}
        {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Summary (Left Column) */}
                    <div className="lg:col-span-2 space-y-6">
                         {/* Payment Condition Section */}
                         <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <CreditCardIcon className="w-5 h-5 text-primary" />
                                เงื่อนไขการชำระเงิน
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <label className={`
                                    relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all
                                    ${paymentCondition === PaymentMethod.TRANSFER 
                                        ? 'border-primary bg-primary/5 shadow-md' 
                                        : 'border-slate-200 hover:border-slate-300 bg-white'}
                                `}>
                                    <input 
                                        type="radio" 
                                        name="paymentCondition" 
                                        value={PaymentMethod.TRANSFER}
                                        checked={paymentCondition === PaymentMethod.TRANSFER}
                                        onChange={() => setPaymentCondition(PaymentMethod.TRANSFER)}
                                        className="w-5 h-5 text-primary border-slate-300 focus:ring-primary"
                                    />
                                    <div className="ml-3">
                                        <span className="block text-sm font-bold text-slate-800">ชำระเต็มจำนวน</span>
                                        <span className="block text-xs text-slate-500">เงินสด / โอนเงิน / เครดิต</span>
                                    </div>
                                </label>

                                <label className={`
                                    relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all
                                    ${paymentCondition === PaymentMethod.INSTALLMENT 
                                        ? 'border-primary bg-primary/5 shadow-md' 
                                        : 'border-slate-200 hover:border-slate-300 bg-white'}
                                `}>
                                    <input 
                                        type="radio" 
                                        name="paymentCondition" 
                                        value={PaymentMethod.INSTALLMENT}
                                        checked={paymentCondition === PaymentMethod.INSTALLMENT}
                                        onChange={() => setPaymentCondition(PaymentMethod.INSTALLMENT)}
                                        className="w-5 h-5 text-primary border-slate-300 focus:ring-primary"
                                    />
                                    <div className="ml-3">
                                        <span className="block text-sm font-bold text-slate-800">แบ่งชำระ (งวดงาน)</span>
                                        <span className="block text-xs text-slate-500">แบ่งจ่ายตามงวดงานที่กำหนด</span>
                                    </div>
                                </label>
                            </div>

                            {paymentCondition === PaymentMethod.INSTALLMENT && (
                                <div className="space-y-4 animate-fadeIn">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-semibold text-slate-700">รายละเอียดงวดงาน</h4>
                                        <button 
                                            type="button" 
                                            onClick={handleAddInstallment}
                                            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            เพิ่มงวด
                                        </button>
                                    </div>

                                    <div className="overflow-hidden border border-slate-200 rounded-lg">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase w-16">งวดที่</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">รายละเอียด</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase w-32">จำนวนเงิน</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase w-32">กำหนดชำระ</th>
                                                    <th className="px-2 py-3 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-200">
                                                {installments.map((inst, idx) => (
                                                    <tr key={inst.id || idx}>
                                                        <td className="px-4 py-2 text-center text-sm font-medium text-slate-700">
                                                            {inst.installment_no}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <Input 
                                                                value={inst.note || ''}
                                                                onChange={(e) => handleInstallmentChange(idx, 'note', e.target.value)}
                                                                placeholder="รายละเอียด..."
                                                                className="h-9 text-sm"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <Input 
                                                                type="number"
                                                                value={inst.amount}
                                                                onChange={(e) => handleInstallmentChange(idx, 'amount', Number(e.target.value))}
                                                                className="h-9 text-right text-sm font-mono"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <Input 
                                                                type="date"
                                                                value={inst.due_date ? new Date(inst.due_date).toISOString().substring(0, 10) : ''}
                                                                onChange={(e) => handleInstallmentChange(idx, 'due_date', new Date(e.target.value))}
                                                                className="h-9 text-sm"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2 text-center">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleRemoveInstallment(idx)}
                                                                className="text-slate-400 hover:text-red-500"
                                                                disabled={installments.length <= 1}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-slate-50">
                                                <tr>
                                                    <td colSpan={2} className="px-4 py-2 text-right text-xs font-bold text-slate-600">รวม</td>
                                                    <td className={`px-4 py-2 text-right text-sm font-bold ${
                                                        Math.abs(installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) - totalEstimatedCost) < 1 
                                                        ? 'text-green-600' 
                                                        : 'text-red-600'
                                                    }`}>
                                                        {installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0).toLocaleString()}
                                                    </td>
                                                    <td colSpan={2}></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                    {Math.abs(installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) - totalEstimatedCost) >= 1 && (
                                        <p className="text-xs text-red-500 text-right">
                                            * ยอดรวมงวดงานต้องเท่ากับยอดรวมสุทธิ ({totalEstimatedCost.toLocaleString()} บาท)
                                        </p>
                                    )}
                                </div>
                            )}
                         </div>

                         <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">สรุปรายการพื้นที่</h3>
                            <div className="space-y-3">
                                {workAreas.map((area, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                        <div>
                                            <div className="font-medium text-slate-700">{area.area_name}</div>
                                            <div className="text-sm text-slate-500">{area.items?.length || 0} รายการ</div>
                                        </div>
                                        <div className="font-semibold text-slate-700">
                                            {area.total_price?.toLocaleString()} บาท
                                        </div>
                                    </div>
                                ))}
                            </div>
                         </div>
                    </div>

                    {/* Summary Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm sticky top-4">
                            <div className="p-4 border-b bg-slate-50 rounded-t-xl">
                                <h3 className="font-bold text-slate-800">สรุปรายการ</h3>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">จำนวนพื้นที่บริการ</span>
                                    <span className="font-medium">{workAreas.length} แห่ง</span>
                                </div>
                                <div className="space-y-2">
                                    {workAreas.map((area, idx) => (
                                        <div key={idx} className="flex justify-between text-xs text-slate-500 pl-2 border-l-2 border-slate-100">
                                            <span className="truncate max-w-[150px]">{area.area_name}</span>
                                            <span>฿{(area.total_price || 0).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t flex justify-between items-end">
                                    <span className="font-semibold text-slate-700">ยอดรวมสุทธิ</span>
                                    <span className="text-2xl font-bold text-primary">
                                        ฿{totalEstimatedCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
        )}
      </div>
    </Modal>
  );
};
