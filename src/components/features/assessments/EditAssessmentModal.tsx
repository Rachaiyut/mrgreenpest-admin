import { useState, useEffect, useMemo, FC, ChangeEvent, FormEvent } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Textarea } from '../../common/FormControls';
import { AssessmentApi } from '@/src/api';
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
    const loadData = async () => {
      if (assessment && isOpen) {
        let loadedAssessment = assessment;
        try {
           const res = await AssessmentApi.getById(assessment.id);
           loadedAssessment = (res as any).data || res;
        } catch (error) {
           console.error("Failed to fetch assessment details", error);
        }

        const { assessment_areas, ...rest } = loadedAssessment;
        setFormData({
          ...rest,
          created_at: loadedAssessment.created_at
            ? new Date(loadedAssessment.created_at).toISOString().substring(0, 10)
            : '',
          appointment_date: loadedAssessment.appointment_date
            ? new Date(loadedAssessment.appointment_date)
            : undefined,
        });
        setSelectedPackageId(loadedAssessment.package_id || null);
        
        let loadedPaymentCondition = loadedAssessment.payment_condition || PaymentMethod.TRANSFER;
        
        // Fallback: If payment condition is TRANSFER but there are installments, assume INSTALLMENT
        // This handles legacy data where payment_condition might not have been saved correctly
        if (loadedAssessment.installments && loadedAssessment.installments.length > 0 && loadedPaymentCondition !== PaymentMethod.INSTALLMENT) {
           loadedPaymentCondition = PaymentMethod.INSTALLMENT;
        }

        setPaymentCondition(loadedPaymentCondition);

        if (loadedAssessment.installments && loadedAssessment.installments.length > 0) {
          setInstallments(loadedAssessment.installments.map(inst => ({
             ...inst
          })));
        } else {
          setInstallments([]);
        }

        const rawAreas = assessment_areas || loadedAssessment.assessment_areas || [];

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
    };
    loadData();
  }, [assessment?.id, isOpen, products]);

  const totalEstimatedCost = useMemo(
    () => workAreas.reduce((sum, area) => sum + (Number(area.total_price) || 0), 0),
    [workAreas]
  );

  // Handlers for Installments
  const handleAddInstallment = () => {
    setInstallments(prev => {
      const newCount = prev.length + 1;
      const baseAmount = Math.floor((totalEstimatedCost / newCount) * 100) / 100;
      const remainder = totalEstimatedCost - (baseAmount * newCount);
      
      const newInstallments = [
        ...prev,
        {
          id: crypto.randomUUID(),
          installment_no: newCount,
          amount: 0, // Will be updated below
          note: `งวดที่ ${newCount}`,
        }
      ];

      return newInstallments.map((inst, index) => {
        let amount = baseAmount;
        // Add remainder to the last installment to ensure total matches exactly
        if (index === newCount - 1) {
          amount = Number((baseAmount + remainder).toFixed(2));
        }
        
        return {
          ...inst,
          amount
        };
      });
    });
  };

  const handleRemoveInstallment = (index: number) => {
    setInstallments(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      const newCount = filtered.length;
      
      if (newCount === 0) return [];

      const baseAmount = Math.floor((totalEstimatedCost / newCount) * 100) / 100;
      const remainder = totalEstimatedCost - (baseAmount * newCount);

      return filtered.map((inst, i) => {
        let amount = baseAmount;
        if (i === newCount - 1) {
          amount = Number((baseAmount + remainder).toFixed(2));
        }

        return {
          ...inst,
          installment_no: i + 1,
          amount,
          note: inst.note?.includes('งวดที่') ? `งวดที่ ${i + 1}` : inst.note
        };
      });
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
  // Remove installments from dependencies to prevent loop
  useEffect(() => {
    if (paymentCondition === PaymentMethod.INSTALLMENT) {
      if (installments.length === 0 && totalEstimatedCost > 0) {
        // Default to 2 installments if none exist
        setInstallments([
          { 
              id: crypto.randomUUID(), 
              installment_no: 1, 
              amount: totalEstimatedCost / 2, 
              note: 'งวดที่ 1',
          },
          { 
              id: crypto.randomUUID(), 
              installment_no: 2, 
              amount: totalEstimatedCost / 2, 
              note: 'งวดที่ 2',
          }
        ]);
      } else if (installments.length > 0 && totalEstimatedCost > 0) {
        // Recalculate existing installments based on new total
        const currentTotal = installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        
        // Only update if the total doesn't match (precision issue tolerance)
        if (Math.abs(currentTotal - totalEstimatedCost) > 0.05) {
           const count = installments.length;
           const baseAmount = Math.floor((totalEstimatedCost / count) * 100) / 100;
           const remainder = totalEstimatedCost - (baseAmount * count);

           setInstallments(prev => prev.map((inst, index) => {
             let amount = baseAmount;
             if (index === count - 1) {
               amount = Number((baseAmount + remainder).toFixed(2));
             }
             return { ...inst, amount };
           }));
        }
      }
    } else {
      // Don't clear immediately on edit to prevent data loss if accidental switch, 
      // but if we follow Add logic, we should clear. 
      // Let's keep it consistent:
      setInstallments([]);
    }
  }, [paymentCondition, totalEstimatedCost]);

  const updateInstallmentCount = (count: number) => {
    const newCount = Math.max(1, Math.min(60, count));
    const baseAmount = Math.floor((totalEstimatedCost / newCount) * 100) / 100;
    const remainder = totalEstimatedCost - (baseAmount * newCount);

    const newInstallments = Array.from({ length: newCount }, (_, i) => {
      let amount = baseAmount;
      if (i === newCount - 1) {
        amount = Number((baseAmount + remainder).toFixed(2));
      }
      return {
        id: installments[i]?.id || crypto.randomUUID(),
        installment_no: i + 1,
        amount,
        note: installments[i]?.note || `งวดที่ ${i + 1}`,
      };
    });
    setInstallments(newInstallments);
  };

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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                 {/* Payment Condition Section */}
                 <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <CreditCardIcon className="w-5 h-5 text-primary" />
                        เงื่อนไขการชำระเงิน
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <label className={`
                            relative flex items-center justify-center p-4 cursor-pointer rounded-xl border-2 transition-all h-14
                            ${paymentCondition === PaymentMethod.TRANSFER 
                                ? 'border-primary bg-primary/5 shadow-sm' 
                                : 'border-slate-200 hover:border-slate-300 bg-white'}
                        `}>
                            <input 
                                type="radio" 
                                name="paymentCondition" 
                                value={PaymentMethod.TRANSFER}
                                checked={paymentCondition === PaymentMethod.TRANSFER}
                                onChange={() => setPaymentCondition(PaymentMethod.TRANSFER)}
                                className="sr-only"
                            />
                            <span className={`text-sm font-bold ${paymentCondition === PaymentMethod.TRANSFER ? 'text-primary' : 'text-slate-600'}`}>ชำระเต็มจำนวน</span>
                        </label>

                        <label className={`
                            relative flex items-center justify-center p-4 cursor-pointer rounded-xl border-2 transition-all h-14
                            ${paymentCondition === PaymentMethod.INSTALLMENT 
                                ? 'border-primary bg-primary/5 shadow-sm' 
                                : 'border-slate-200 hover:border-slate-300 bg-white'}
                        `}>
                            <input 
                                type="radio" 
                                name="paymentCondition" 
                                value={PaymentMethod.INSTALLMENT}
                                checked={paymentCondition === PaymentMethod.INSTALLMENT}
                                onChange={() => setPaymentCondition(PaymentMethod.INSTALLMENT)}
                                className="sr-only"
                            />
                            <span className={`text-sm font-bold ${paymentCondition === PaymentMethod.INSTALLMENT ? 'text-primary' : 'text-slate-600'}`}>แบ่งชำระ (งวด)</span>
                        </label>
                    </div>

                    {paymentCondition === PaymentMethod.INSTALLMENT && (
                        <div className="space-y-4 animate-fadeIn">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">
                                จำนวนงวด <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min={1}
                                  max={60}
                                  value={installments.length}
                                  onChange={(e) => updateInstallmentCount(Number(e.target.value))}
                                  className="font-semibold text-slate-700"
                                />
                              </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">รายละเอียดการแบ่งชำระ:</h4>
                                <div className="space-y-3">
                                  {installments.map((inst, idx) => (
                                    <div key={inst.id || idx} className="grid grid-cols-12 gap-3 items-start">
                                      <div className="col-span-2 pt-2 text-sm font-medium text-slate-600">
                                        งวดที่ {inst.installment_no}
                                      </div>
                                      <div className="col-span-5">
                                        <label className="block text-xs text-slate-400 mb-1">จำนวนเงิน</label>
                                        <Input 
                                          type="number"
                                          value={inst.amount}
                                          onChange={(e) => handleInstallmentChange(idx, 'amount', Number(e.target.value))}
                                          className="text-sm font-medium"
                                        />
                                      </div>
                                      <div className="col-span-5">
                                        <label className="block text-xs text-slate-400 mb-1">หมายเหตุ</label>
                                        <Input 
                                          value={inst.note || ''}
                                          onChange={(e) => handleInstallmentChange(idx, 'note', e.target.value)}
                                          className="text-sm"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200">
                                    <span className="text-sm font-bold text-slate-700">รวม</span>
                                    <span className={`text-sm font-bold ${
                                        Math.abs(installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) - totalEstimatedCost) < 1 
                                        ? 'text-red-600' 
                                        : 'text-red-600' // Using red per design requirement/image usually
                                    }`}>
                                        {installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0).toLocaleString()} / {totalEstimatedCost.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                 </div>

                 {/* Summary Side Card */}
                 <div className="lg:col-span-1">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm sticky top-6">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                            <h3 className="font-bold text-slate-800">สรุปค่าบริการ</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">พื้นที่ทั้งหมด</span>
                                <span className="font-medium text-slate-900">{workAreas.length} จุด</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">ประเภทราคา</span>
                                <span className="font-medium text-slate-900">{selectedPackageId ? 'Package' : 'Standard'}</span>
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center bg-green-50/50 -mx-4 px-4 py-3 mt-2 rounded-b-lg">
                                <span className="font-bold text-slate-800">รวมสุทธิ</span>
                                <span className="text-xl font-bold text-green-600">
                                    ฿{totalEstimatedCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
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
