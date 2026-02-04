import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Textarea, Button } from '../../common/FormControls';
import {
  Assessment,
  Product,
  AssessmentWorkAreaItem,
  PackageCondition,
  AssessmentWorkArea,
  Customer,
  Category,
} from '@/src/types/entity/app.interface';
import { ServiceSystem, AsessmentStatus } from '@/src/types/enums/assessment';
import { PaymentMethod } from '@/src/types/enums/financial';
import { PlusIcon, TrashIcon, RefreshIcon } from '../../../assets/icons/Icons';
import { WorkAreaForm } from './WorkAreaForm';
import { SearchableSelect } from '../../common/SearchableSelect';

// ... (existing imports)

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

const SERVICE_TYPES = [
  'กำจัดปลวก',
  'กำจัดมด',
  'กำจัดแมลงสาบ',
  'กำจัดหนู',
  'กำจัดยุง',
  'อื่นๆ',
];

export const EditAssessmentModal: React.FC<EditAssessmentModalProps> = ({
  isOpen,
  onClose,
  assessment,
  onUpdateAssessment,
  products,
  packages = [],
  customers = [],
  categories = [],
}) => {
  const [formData, setFormData] = useState<Partial<Assessment>>({});
  const [workAreas, setWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [originalWorkAreas, setOriginalWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );

  // Use packages prop directly - filter to only those with price tiers
  const suggestedPackageOptions = useMemo(() => {
    return packages.filter(
      (pkg) =>
        pkg.package_price &&
        pkg.package_price.length > 0
    );
  }, [packages]);

  const PAYMENT_LABELS: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'เงินสด',
    [PaymentMethod.TRANSFER]: 'โอนเงิน',
    [PaymentMethod.CREDIT_CARD]: 'บัตรเครดิต',
    [PaymentMethod.CHEQUE]: 'เช็ค',
    [PaymentMethod.QR_PAYMENT]: 'QR Payment',
    [PaymentMethod.DIVIDED]: 'แบ่งจ่าย',
    [PaymentMethod.INSTALLMENT]: 'งวด',
  };

  const paymentOptions = Object.values(PaymentMethod).map((value) => ({
    value,
    label: PAYMENT_LABELS[value as PaymentMethod] || value,
  }));

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        payment_condition: assessment.payment_condition,
        payment_installment_count: assessment.payment_installment_count,
      });
      // Assume package_id is on assessment level if we want to pre-select,
      // but if logic was work_area based, we might need to check work_areas.
      // Current interface has package_id on Assessment.
      setSelectedPackageId(assessment.package_id || null);

      const rawAreas = assessment_areas || assessment.assessment_areas || [];

      // Helper to derive base price
      const enrichArea = (wa: any) => {
        // Fetch missing details from product/package if available
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

        // Calculate base_service_price if not present
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

      // Apply logic to BOTH initial and original areas
      const enrichedAreas = rawAreas.map(enrichArea);

      setWorkAreas(enrichedAreas);
      setOriginalWorkAreas(enrichedAreas.map(a => ({ ...a }))); // Deep copy
    } else if (!isOpen) {
      setFormData({});
      setWorkAreas([]);
      setOriginalWorkAreas([]);
    }
  }, [assessment, isOpen, products]);

  const totalEstimatedCost = useMemo(
    () => workAreas.reduce((sum, area) => sum + (area.total_price || 0), 0),
    [workAreas]
  );

  const handleFieldChange = (
    e: React.ChangeEvent<
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
          // Check if any category service matches 'กำจัดปลวก'
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

    // Prepare work areas: remove temp IDs and ensure correct types
    const sanitizedWorkAreas = workAreas.map((area) => {
      // Create a shallow copy to avoid mutating state
      const newArea: any = { ...area };

      // Remove temporary IDs (starting with "area-") so backend creates new records
      if (newArea.id && newArea.id.startsWith('area-')) {
        delete newArea.id;
      }

      // Ensure area_size is a number (required by backend)
      if (newArea.area_size === undefined || newArea.area_size === '') {
        newArea.area_size = 0;
      } else {
        newArea.area_size = Number(newArea.area_size);
      }

      // Ensure total_price is calculated correctly
      const itemsCost = (newArea.items || []).reduce(
        (sum: number, item: any) => sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0),
        0
      );
      const baseCost = Number(newArea.base_service_price) || 0;
      newArea.total_price = baseCost + itemsCost;

      // Sanitize items - ensure correct field types and remove temp IDs
      newArea.items = (newArea.items || []).map((item: any, idx: number) => {
        const sanitizedItem: any = {
          product_id: item.product_id,
          product_name: item.product_name || '',
          product_price: Number(item.product_price) || 0,
          quantity: Number(item.quantity) || 1,
          total_price: (Number(item.product_price) || 0) * (Number(item.quantity) || 1),
        };
        // Keep existing item ID if valid UUID, otherwise remove
        if (item.id && !item.id.startsWith('item-') && item.id.includes('-')) {
          sanitizedItem.id = item.id;
        }
        return sanitizedItem;
      });

      // Sanitize category_services - keep only category_id
      newArea.category_services = (newArea.category_services || []).map((cat: any) => ({
        category_id: cat.category_id,
        ...(cat.id && !cat.id.startsWith('cat-') ? { id: cat.id } : {}),
      }));

      // Remove frontend-only fields that backend doesn't expect
      delete newArea.base_service_price;

      return newArea;
    });

    const updatedAssessment: Assessment = {
      ...assessment,
      ...formData,
      updated_by: 'ผู้ดูแลระบบ',
      assessment_areas: sanitizedWorkAreas as AssessmentWorkArea[],
      total_price: totalEstimatedCost,
      appointment_date: formData.appointment_date || new Date(),
      status: statusOverride || (formData.status as AsessmentStatus) || assessment.status,
    };

    onUpdateAssessment(updatedAssessment);

    // Only close if it's a normal save or explicit action usually implies closing or refreshing
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleSave();
  };

  if (!isOpen) return null; // Only return null if not open

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขใบประเมิน: ${assessment?.code || assessment?.id || ''
        }`}
      size="5xl"
      footer={
        <div className="flex w-full items-center justify-end gap-6">
          <p className="text-lg font-semibold text-slate-800">
            ยอดรวมทั้งหมด:{' '}
            <span className="text-green-600">
              ฿
              {totalEstimatedCost.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </p>
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
      <form
        id="edit-assessment-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="วันที่สร้าง" htmlFor="created_at">
            <Input
              name="created_at"
              type="date"
              value={formData.created_at || ''}
              onChange={handleFieldChange}
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
              className="bg-slate-100"
            />
          </FormField>
        </div>
        {/* Worksite Info */}
        <div className="border border-slate-200 p-4 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">
            ข้อมูลที่อยู่หลัก
          </h3>
          <FormField label="ที่อยู่ (บ้านเลขที่, ถนน)" htmlFor="address">
            <Textarea
              name="address"
              value={formData.address || ''}
              onChange={handleFieldChange}
              required
            />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="pt-4 border-t">
            <h3 className="text-base font-semibold text-slate-800 mb-2">
              กลุ่มเส้นทาง/พื้นที่บริการ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="เขต (พื้นที่บริการ)" htmlFor="zone">
                <Input
                  name="zone"
                  value={formData.zone || ''}
                  onChange={handleFieldChange}
                />
              </FormField>
              <FormField label="Group" htmlFor="route_group">
                <Input
                  name="route_group"
                  value={formData.route_group || ''}
                  onChange={handleFieldChange}
                />
              </FormField>
              <FormField label="สายถนนที่" htmlFor="road_line">
                <Input
                  name="road_line"
                  value={formData.road_line || ''}
                  onChange={handleFieldChange}
                />
              </FormField>
              <FormField label="ลำดับที่" htmlFor="sequence">
                <Input
                  name="sequence"
                  value={formData.sequence || ''}
                  onChange={handleFieldChange}
                />
              </FormField>
            </div>
          </div>
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
        {/* Common Info */}
        <div className="border border-slate-200 p-4 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">ข้อมูลภาพรวม</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Package Selection */}
        {suggestedPackageOptions.length > 0 && (
          <div className="pt-4 border-t">
            <FormField label="เลือกแพ็กเกจสำหรับทุกพื้นที่ (ไม่บังคับ)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <label
                  className={`relative block p-3 border rounded-lg cursor-pointer ${!selectedPackageId ? 'border-primary ring-2 ring-primary bg-primary/5' : 'bg-white hover:border-slate-400'}`}
                >
                  <input
                    type="radio"
                    name="packageId-main-edit"
                    className="sr-only"
                    onChange={() => handlePackageSelect(null)}
                    checked={!selectedPackageId}
                  />
                  <span className="font-semibold text-slate-800">
                    ไม่ใช้แพ็กเกจ
                  </span>
                </label>
                {suggestedPackageOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`relative block p-3 border rounded-lg cursor-pointer ${selectedPackageId === option.id ? 'border-primary ring-2 ring-primary bg-primary/5' : 'bg-white hover:border-slate-400'}`}
                  >
                    <input
                      type="radio"
                      name="packageId-main-edit"
                      value={option.id}
                      className="sr-only"
                      onChange={() => handlePackageSelect(option.id)}
                      checked={selectedPackageId === option.id}
                    />
                    <div className="font-semibold text-slate-800">
                      {option.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {(option as any).visits_per_month} ครั้ง /{' '}
                      {(option as any).contract_duration}
                    </div>
                  </label>
                ))}
              </div>
            </FormField>
          </div>
        )}



        <div className="space-y-4">
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
              categories={categories}
              isEditing={true}
              originalArea={originalWorkAreas[index]}
              onApprove={assessment?.status === AsessmentStatus.PENDING ? () => {
                if (window.confirm('ยืนยันการอนุมัติราคาและเปลี่ยนสถานะเป็น "นัดหมายบริการ" (Appointment)?\nConfirm approval and status change to Appointment?')) {
                  setFormData(prev => ({ ...prev, status: AsessmentStatus.APPOINTMENT }));
                  handleSave(AsessmentStatus.APPOINTMENT);
                }
              } : undefined}
            />
          ))}
        </div>

        <div className="mb-6">
          <button
            type="button"
            onClick={handleAddArea}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-primary hover:border-primary hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <PlusIcon className="h-5 w-5" />
            เพิ่มพื้นที่ใหม่
          </button>
        </div>

        {/* Payment Condition Section (Moved to Bottom) */}
        <div className="w-full md:w-1/2 ml-auto">
          <div className="border border-slate-200 p-4 rounded-lg space-y-4 bg-slate-50">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                เงื่อนไขการชำระเงิน
              </label>

              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_type_edit"
                    className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                    checked={!formData.payment_condition || (formData.payment_condition !== PaymentMethod.INSTALLMENT && formData.payment_condition !== PaymentMethod.DIVIDED)}
                    onChange={() => setFormData(prev => ({ ...prev, payment_condition: PaymentMethod.CASH }))}
                  />
                  <span className="text-slate-700">ชำระเต็มจำนวน</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_type_edit"
                    className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                    checked={formData.payment_condition === PaymentMethod.INSTALLMENT}
                    onChange={() => setFormData(prev => ({ ...prev, payment_condition: PaymentMethod.INSTALLMENT }))}
                  />
                  <span className="text-slate-700">แบ่งชำระ (งวด)</span>
                </label>
              </div>

              {formData.payment_condition === PaymentMethod.INSTALLMENT && (
                <div className="grid grid-cols-1 gap-4">
                  <FormField label="จำนวนงวด" htmlFor="payment_installment_count">
                    <Input
                      name="payment_installment_count"
                      type="number"
                      placeholder="ระบุจำนวนงวด"
                      value={formData.payment_installment_count || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          payment_installment_count: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      required
                    />
                  </FormField>
                </div>
              )}
            </div>
          </div>
        </div>


      </form>
    </Modal>
  );
};
