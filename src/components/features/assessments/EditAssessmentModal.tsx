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
  const [activeTab, setActiveTab] = useState<'info' | 'areas'>('info');
  const [formData, setFormData] = useState<Partial<Assessment>>({});
  const [workAreas, setWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [originalWorkAreas, setOriginalWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );
  // const [installments, setInstallments] = useState<Partial<AssessmentInstallment>[]>([]);

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

      // setInstallments([]);

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
      // setInstallments([]);
      setActiveTab('info');
    }
  }, [assessment, isOpen, products]);

  const totalEstimatedCost = useMemo(
    () => workAreas.reduce((sum, area) => sum + (area.total_price || 0), 0),
    [workAreas]
  );

  // Auto-calculate installments Effect (Removed)

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
      // installments: formData.payment_condition === PaymentMethod.INSTALLMENT ? installments as AssessmentInstallment[] : [],
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

        {/* TAB 3: Payment (Removed) */}
        {/* <div className={activeTab === 'payment' ? 'block' : 'hidden'}> ... </div> */}

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
