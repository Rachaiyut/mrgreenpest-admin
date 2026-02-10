import { useState, useEffect, useMemo, FC, ChangeEvent, FormEvent } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Textarea } from '../../common/FormControls';
import {
  Assessment,
  Product,
  AssessmentWorkArea,
  Customer,
  Category,
  AssessmentInstallment,
} from '@/src/types/entity/app.interface';
import { AsessmentStatus } from '@/src/types/enums/assessment';
import { PaymentMethod } from '@/src/types/enums/financial';
import { PlusIcon, UserIcon, DocumentIcon, CreditCardIcon } from '../../../assets/icons/Icons';
import { WorkAreaForm } from './WorkAreaForm';

interface EditAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
  onUpdateAssessment: (assessmentData: Assessment) => void;
  products: Product[];
  packages: import('@/src/types/entity/package.interface').Package[];
  customers?: Customer[];
  categories: Category[];
}

export const EditAssessmentModal: FC<EditAssessmentModalProps> = ({
  isOpen,
  onClose,
  assessment,
  onUpdateAssessment,
  products,
  packages = [],
  customers = [],
  categories = [],
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'areas' | 'payment'>('info');
  const [formData, setFormData] = useState<Partial<Assessment>>({});
  const [workAreas, setWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [originalWorkAreas, setOriginalWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );
  const [paymentCondition, setPaymentCondition] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
  const [installments, setInstallments] = useState<Partial<AssessmentInstallment>[]>([]);

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: new Date(value) }));
  };

  useEffect(() => {
    if (assessment && isOpen) {
      const { assessment_areas, ...rest } = assessment;
      setFormData({
        ...rest,
        created_at: assessment.created_at
          ? new Date(assessment.created_at).toISOString().substring(0, 10)
          : '',
        appointment_date: assessment.appointment_date
          ? new Date(assessment.appointment_date)
          : undefined,
      });
      setSelectedPackageId(assessment.package_id || null);
      
      let loadedPaymentCondition = assessment.payment_condition || PaymentMethod.TRANSFER;
      
      // Fallback: If payment condition is TRANSFER but there are installments, assume INSTALLMENT
      // This handles legacy data where payment_condition might not have been saved correctly
      if (assessment.installments && assessment.installments.length > 0 && loadedPaymentCondition !== PaymentMethod.INSTALLMENT) {
         loadedPaymentCondition = PaymentMethod.INSTALLMENT;
      }

      setPaymentCondition(loadedPaymentCondition);

      if (assessment.installments && assessment.installments.length > 0) {
        setInstallments(assessment.installments.map(inst => ({
           ...inst,
           due_date: inst.due_date ? new Date(inst.due_date).toISOString().substring(0, 10) : undefined
        })));
      } else {
        setInstallments([]);
      }

      const rawAreas = assessment_areas || assessment.assessment_areas || [];

      // Helper to derive base price
      const enrichArea = (wa: any) => {
        const enrichedItems = (wa.items || []).map((item: any) => {
          if (item.product_id && (!item.product_name || !item.product_price)) {
            const product = products.find((p) => p.id === item.product_id);
            if (product) {
              return {
                ...item,
                product_name: product.name,
                product_price: product.cost_price ? Number(product.cost_price) : 0,
              };
            }
          }
          return item;
        });

        const itemsTotal = enrichedItems.reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0);
        const derivedBasePrice = wa.base_service_price !== undefined
          ? wa.base_service_price
          : (Number(wa.total_price) || 0) - itemsTotal;

        return {
          ...wa,
          items: enrichedItems,
          category_services: wa.category_services || [],
          base_service_price: derivedBasePrice > 0 ? derivedBasePrice : 0,
        };
      };

      const enrichedAreas = rawAreas.map(enrichArea);

      setWorkAreas(enrichedAreas);
      setOriginalWorkAreas(enrichedAreas.map(a => ({ ...a })));
    } else if (!isOpen) {
      setFormData({});
      setWorkAreas([]);
      setOriginalWorkAreas([]);
      setInstallments([]);
      setPaymentCondition(PaymentMethod.TRANSFER);
      setActiveTab('info');
    }
  }, [assessment, isOpen, products]);

  const totalEstimatedCost = useMemo(
    () => workAreas.reduce((sum, area) => sum + (Number(area.total_price) || 0), 0),
    [workAreas]
  );

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
      // Don't clear immediately on edit to prevent data loss if accidental switch, 
      // but if we follow Add logic, we should clear. 
      // Let's keep it consistent:
      setInstallments([]);
    }
  }, [paymentCondition, totalEstimatedCost]);

  const handleFieldChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddArea = () => {
    setWorkAreas((prev) => [
      ...prev,
      {
        id: `area-${Date.now()}`,
        area_name: `พื้นที่ ${prev.length + 1}`,
        items: [],
        category_services: [],
        base_service_price: 0,
        total_price: 0,
      },
    ]);
  };

  const handleRemoveArea = (index: number) => {
    if (workAreas.length > 1) {
      setWorkAreas((prev) => prev.filter((_, i) => i !== index));
    } else {
      alert('ต้องมีอย่างน้อย 1 พื้นที่ในใบประเมิน');
    }
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

  const handleSave = async (statusOverride?: AsessmentStatus) => {
    if (!assessment) return;

    const sanitizedWorkAreas = workAreas.map((area) => {
      const newArea: any = { ...area };
      if (newArea.id && newArea.id.startsWith('area-')) {
        delete newArea.id;
      }
      if (newArea.area_size === undefined || newArea.area_size === '') {
        newArea.area_size = 0;
      } else {
        newArea.area_size = Number(newArea.area_size);
      }
      const itemsCost = (newArea.items || []).reduce(
        (sum: number, item: any) => sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0),
        0
      );
      const baseCost = Number(newArea.base_service_price) || 0;
      newArea.total_price = baseCost + itemsCost;

      // Ensure package_price is number if present
      if (newArea.package_price !== undefined && newArea.package_price !== null) {
        newArea.package_price = Number(newArea.package_price);
      }

      newArea.items = (newArea.items || []).map((item: any) => {
        const sanitizedItem: any = {
          product_id: item.product_id,
          product_name: item.product_name || '',
          product_price: Number(item.product_price) || 0,
          quantity: Number(item.quantity) || 1,
          total_price: (Number(item.product_price) || 0) * (Number(item.quantity) || 1),
        };
        if (item.id && !item.id.startsWith('item-') && item.id.includes('-')) {
          sanitizedItem.id = item.id;
        }
        return sanitizedItem;
      });

      newArea.category_services = (newArea.category_services || []).map((cat: any) => ({
        category_id: cat.category_id,
        ...(cat.id && !cat.id.startsWith('cat-') ? { id: cat.id } : {}),
      }));

      delete newArea.base_service_price;

      return newArea;
    });

    const updatedAssessment: Assessment = {
      ...assessment,
      ...formData,
      updated_by: 'ผู้ดูแลระบบ',
      assessment_areas: sanitizedWorkAreas as AssessmentWorkArea[],
      installments: paymentCondition === PaymentMethod.INSTALLMENT ? installments as AssessmentInstallment[] : [],
      payment_condition: paymentCondition,
      total_price: totalEstimatedCost,
      appointment_date: formData.appointment_date || new Date(),
      status: statusOverride || (formData.status as AsessmentStatus) || assessment.status,
    };

    onUpdateAssessment(updatedAssessment);
    onClose();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleSave();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขใบประเมิน: ${assessment?.code || assessment?.id || ''}`}
      size="5xl"
      footer={
        <div className="flex w-full items-center justify-between">
            <div className="text-lg font-semibold text-slate-800">
            ยอดรวมทั้งหมด:{' '}
            <span className="text-primary font-bold">
              ฿
              {totalEstimatedCost.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
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
              form="edit-assessment-form"
              className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            >
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </div>
      }
    >
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`
              group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'info'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }
            `}
          >
            <UserIcon className={`
              -ml-0.5 mr-2 h-5 w-5
              ${activeTab === 'info' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-500'}
            `} />
            ข้อมูลทั่วไป
          </button>
          <button
            onClick={() => setActiveTab('areas')}
            className={`
              group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'areas'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }
            `}
          >
            <DocumentIcon className={`
              -ml-0.5 mr-2 h-5 w-5
              ${activeTab === 'areas' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-500'}
            `} />
            พื้นที่บริการ ({workAreas.length})
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`
              group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'payment'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }
            `}
          >
            <CreditCardIcon className={`
              -ml-0.5 mr-2 h-5 w-5
              ${activeTab === 'payment' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-500'}
            `} />
            การชำระเงิน
          </button>
        </nav>
      </div>

      <form
        id="edit-assessment-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* TAB 1: General Info */}
        <div className={activeTab === 'info' ? 'block' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">ข้อมูลเบื้องต้น</h3>
                        <FormField label="วันที่สร้าง" htmlFor="created_at">
                            <Input
                            name="created_at"
                            type="date"
                            value={formData.created_at || ''}
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
                        <FormField label="ลูกค้า" htmlFor="customer_id">
                            <Input
                            value={
                                customers.find((c) => c.id === formData.customer_id)
                                ? `${customers.find((c) => c.id === formData.customer_id)?.first_name} ${customers.find((c) => c.id === formData.customer_id)?.last_name}`
                                : formData.customer_id || ''
                            }
                            readOnly
                            className="bg-slate-200 text-slate-600"
                            />
                        </FormField>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-primary"></span>
                             ที่อยู่ให้บริการ
                        </h3>
                        <FormField label="ที่อยู่" htmlFor="address">
                            <Textarea
                            name="address"
                            value={formData.address || ''}
                            onChange={handleFieldChange}
                            required
                            className="min-h-[100px]"
                            />
                        </FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="แขวง/ตำบล" htmlFor="sub_district">
                            <Input
                                name="sub_district"
                                value={formData.sub_district || ''}
                                onChange={handleFieldChange}
                                required
                            />
                            </FormField>
                            <FormField label="เขต/อำเภอ" htmlFor="district">
                            <Input
                                name="district"
                                value={formData.district || ''}
                                onChange={handleFieldChange}
                                required
                            />
                            </FormField>
                            <FormField label="จังหวัด" htmlFor="province">
                            <Input
                                name="province"
                                value={formData.province || ''}
                                onChange={handleFieldChange}
                                required
                            />
                            </FormField>
                            <FormField label="รหัสไปรษณีย์" htmlFor="zipcode">
                            <Input
                                name="zipcode"
                                value={formData.zipcode || ''}
                                onChange={handleFieldChange}
                                required
                            />
                            </FormField>
                        </div>
                         <div className="pt-2">
                             <FormField label="Link Google Map" htmlFor="google_map_link">
                                <Input
                                name="google_map_link"
                                type="url"
                                placeholder="https://maps.app.goo.gl/..."
                                value={formData.google_map_link || ''}
                                onChange={handleFieldChange}
                                />
                            </FormField>
                         </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 border border-slate-200 p-4 rounded-xl bg-slate-50">
                 <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">ข้อมูลเส้นทาง (Routing)</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField label="เขต" htmlFor="zone">
                        <Input
                        name="zone"
                        value={formData.zone || ''}
                        onChange={handleFieldChange}
                        className="bg-white"
                        />
                    </FormField>
                    <FormField label="Group" htmlFor="route_group">
                        <Input
                        name="route_group"
                        value={formData.route_group || ''}
                        onChange={handleFieldChange}
                        className="bg-white"
                        />
                    </FormField>
                    <FormField label="สายถนน" htmlFor="road_line">
                        <Input
                        name="road_line"
                        value={formData.road_line || ''}
                        onChange={handleFieldChange}
                        className="bg-white"
                        />
                    </FormField>
                    <FormField label="ลำดับ" htmlFor="sequence">
                        <Input
                        name="sequence"
                        value={formData.sequence || ''}
                        onChange={handleFieldChange}
                        className="bg-white"
                        />
                    </FormField>
                 </div>
            </div>
        </div>

        {/* TAB 2: Work Areas */}
        <div className={activeTab === 'areas' ? 'block' : 'hidden'}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">พื้นที่ให้บริการ</h3>
                    <p className="text-sm text-slate-500">จัดการรายละเอียดพื้นที่และสินค้า/บริการ</p>
                </div>
                <button
                    type="button"
                    onClick={handleAddArea}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 shadow-sm transition-all font-medium"
                >
                    <PlusIcon className="w-5 h-5" />
                    เพิ่มพื้นที่
                </button>
            </div>

            <div className="space-y-4 animate-fadeIn">
                {workAreas.map((area, index) => (
                    <WorkAreaForm
                    key={area.id || index}
                    area={area}
                    index={index}
                    onAreaChange={handleAreaChange}
                    onRemoveArea={handleRemoveArea}
                    onClearArea={handleClearArea}
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
                    onApprove={assessment?.status === AsessmentStatus.PENDING ? () => {
                        if (window.confirm('ยืนยันการอนุมัติราคาและเปลี่ยนสถานะเป็น "นัดหมายบริการ" (Appointment)?\\nConfirm approval and status change to Appointment?')) {
                        setFormData(prev => ({ ...prev, status: AsessmentStatus.APPOINTMENT }));
                        handleSave(AsessmentStatus.APPOINTMENT);
                        }
                    } : undefined}
                    />
                ))}
                 {workAreas.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                        ยังไม่มีพื้นที่ให้บริการ กด "เพิ่มพื้นที่" เพื่อเริ่มต้น
                    </div>
                )}
            </div>
        </div>

        {/* TAB 3: Payment */}
        <div className={activeTab === 'payment' ? 'block' : 'hidden'}>
            <div className="space-y-6 animate-fadeIn">
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
            </div>
        </div>

        {/* Summary Card (Moved or Removed) */}
        <div className={activeTab === 'areas' ? 'block' : 'hidden'}>
            <div className="mt-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
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
      </form>
    </Modal>
  );
};
