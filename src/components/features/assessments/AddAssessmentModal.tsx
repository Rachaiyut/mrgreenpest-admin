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
  const [installments, setInstallments] = useState<Partial<AssessmentInstallment>[]>([]);
  const [workAreas, setWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      const fetchData = async () => {
        try {
          const [customersRes, packagesRes, productsRes, categoriesRes] = await Promise.all([
            CustomerApi.getCustomers({ limit: 1000 }),
            PackageApi.getPackages({ limit: 100 }),
            ProductApi.getProducts({ limit: 100 }),
            CategoryApi.getCategories({ limit: 100, type: CategoryType.SERVICE })
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
        payment_condition: PaymentMethod.CASH,
      });
      setWorkAreas([{
        id: `area-${Date.now()}`,
        area_name: 'พื้นที่ 1',
        items: [],
        category_services: [],
        base_service_price: 0,
        total_price: 0
      }]);
      setInstallments([]);
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
    () => workAreas.reduce((sum, area) => sum + (area.total_price || 0), 0),
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
          };
        } else {
          return { ...area };
        }
      })
    );
  };

  // Handlers for Installments
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

  // Auto-calculate installments logic
  useEffect(() => {
    if (formData.payment_condition === PaymentMethod.INSTALLMENT && formData.payment_installment_count && formData.payment_installment_count > 0) {
      const count = formData.payment_installment_count;
      const total = totalEstimatedCost || 0;

      const currentSum = installments.reduce((s, i) => s + (i.amount || 0), 0);
      const isSumMismatch = Math.abs(currentSum - total) > 1;
      const isCountMismatch = installments.length !== count;

      if (isSumMismatch || isCountMismatch) {
        const amountPerInst = Math.floor((total / count) * 100) / 100;
        const lastAmount = total - (amountPerInst * (count - 1));

        setInstallments(prev => {
          const newInst: Partial<AssessmentInstallment>[] = [];
          for (let i = 0; i < count; i++) {
            newInst.push({
              installment_no: i + 1,
              amount: i === count - 1 ? lastAmount : amountPerInst,
              note: prev[i]?.note || '',
            });
          }
          return newInst;
        });
      }
    } else {
      if (installments.length > 0 && formData.payment_condition !== PaymentMethod.INSTALLMENT) {
        setInstallments([]);
      }
    }
  }, [formData.payment_condition, formData.payment_installment_count, totalEstimatedCost]);


  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();

    const newAssessment: Omit<Assessment, 'id' | 'code'> & { installments?: Partial<AssessmentInstallment>[] } = {
      // Defaults
      status: AsessmentStatus.DRAFT,
      created_by: 'ผู้ดูแลระบบ',
      updated_by: 'ผู้ดูแลระบบ',

      // Spread form data
      ...formData,

      // Overrides/Calculated
      assessment_areas: workAreas as AssessmentWorkArea[],
      total_price: totalEstimatedCost,

      // Installments
      installments: formData.payment_condition === PaymentMethod.INSTALLMENT ? (installments as AssessmentInstallment[]) : [],

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
      payment_condition: formData.payment_condition as PaymentMethod,

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
                                formData.appointment_date
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
                    <button
                        type="button"
                        onClick={handleAddArea}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 shadow-sm transition-all"
                    >
                        <PlusIcon className="w-5 h-5" />
                        เพิ่มพื้นที่
                    </button>
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
                 </div>
             </div>
        )}

        {/* STEP 3: PAYMENT & REVIEW */}
        {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Payment Config */}
                    <div className="lg:col-span-2 space-y-6">
                         <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <CreditCardIcon className="w-5 h-5 text-primary" />
                                เงื่อนไขการชำระเงิน
                            </h3>
                            
                            <div className="flex gap-4 mb-6">
                                <label className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.payment_condition !== PaymentMethod.INSTALLMENT ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <input
                                        type="radio"
                                        name="payment_type"
                                        className="hidden"
                                        checked={formData.payment_condition !== PaymentMethod.INSTALLMENT}
                                        onChange={() => setFormData(prev => ({ ...prev, payment_condition: PaymentMethod.CASH }))}
                                    />
                                    <div className="font-semibold">ชำระเต็มจำนวน</div>
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.payment_condition === PaymentMethod.INSTALLMENT ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <input
                                        type="radio"
                                        name="payment_type"
                                        className="hidden"
                                        checked={formData.payment_condition === PaymentMethod.INSTALLMENT}
                                        onChange={() => setFormData(prev => ({ ...prev, payment_condition: PaymentMethod.INSTALLMENT }))}
                                    />
                                    <div className="font-semibold">แบ่งชำระ (งวด)</div>
                                </label>
                            </div>

                            {formData.payment_condition === PaymentMethod.INSTALLMENT && (
                                <div className="space-y-4 animate-fadeIn">
                                    <FormField label="จำนวนงวด" htmlFor="payment_installment_count">
                                        <Input
                                            name="payment_installment_count"
                                            type="number"
                                            value={formData.payment_installment_count || ''}
                                            onChange={(e) => {
                                                const count = parseInt(e.target.value, 10) || 0;
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    payment_installment_count: count,
                                                }));
                                            }}
                                            min={2}
                                            className="max-w-[200px]"
                                        />
                                    </FormField>

                                    {installments.length > 0 && (
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
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
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
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
                                
                                {formData.payment_condition === PaymentMethod.INSTALLMENT && (
                                     <div className={`text-xs text-right mt-1 ${
                                        Math.abs(installments.reduce((sum, i) => sum + (i.amount || 0), 0) - totalEstimatedCost) < 1 
                                          ? 'text-green-600' 
                                          : 'text-red-500'
                                      }`}>
                                        ยอดแบ่งชำระ: ฿{installments.reduce((sum, i) => sum + (i.amount || 0), 0).toLocaleString()}
                                     </div>
                                )}
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
