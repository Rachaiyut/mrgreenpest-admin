import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import {
  FormField,
  Input,
  Select,
  Textarea,
  Button,
} from '../../common/FormControls';
import {
  Assessment,
  Status,
  Product,
  AssessmentItem,
  PackageCondition,
  AssessmentWorkArea,
} from '../../../types';
import { MOCK_CUSTOMERS } from '../../../constants';
import { PlusIcon, TrashIcon, RefreshIcon } from '../../../assets/icons/Icons';
import { ProductSelectionModal } from '../../features/products/ProductSelectionModal';
import { WorkAreaForm } from './WorkAreaForm';

interface EditAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
  onUpdateAssessment: (assessmentData: Assessment) => void;
  products: Product[];
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
}) => {
  const [formData, setFormData] = useState<Partial<Assessment>>({});
  const [workAreas, setWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );

  const servicePackages = useMemo(
    () => products.filter((p) => p.type === 'บริการ'),
    [products]
  );
  const maxAreaSize = useMemo(
    () => Math.max(0, ...workAreas.map((a) => a.areaSize || 0)),
    [workAreas]
  );

  const suggestedPackageOptions = useMemo(() => {
    if (maxAreaSize === 0) return [];
    return servicePackages.filter(
      (pkg) =>
        pkg.conditions && pkg.conditions.some((c) => c.maxArea >= maxAreaSize)
    );
  }, [maxAreaSize, servicePackages]);

  useEffect(() => {
    if (assessment && isOpen) {
      const { workAreas, ...rest } = assessment;
      setFormData({
        ...rest,
        createdAt: assessment.createdAt
          ? new Date(assessment.createdAt).toISOString().substring(0, 10)
          : '',
        scheduledAt: assessment.scheduledAt
          ? new Date(assessment.scheduledAt).toISOString().substring(0, 10)
          : '',
      });
      const initialPackageId =
        assessment.workAreas?.find((wa) => wa.packageId)?.packageId || null;
      setSelectedPackageId(initialPackageId);
      const initialWorkAreas = workAreas.map((wa) => {
        const itemsCost = (wa.items || []).reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        const packageCost = wa.estimatedCost - itemsCost;
        return {
          ...wa,
          packagePrice: wa.packageId ? packageCost : 0,
        };
      });
      setWorkAreas(initialWorkAreas || []);
    } else if (!isOpen) {
      setFormData({});
      setWorkAreas([]);
    }
  }, [assessment, isOpen]);

  const totalEstimatedCost = useMemo(
    () => workAreas.reduce((sum, area) => sum + (area.estimatedCost || 0), 0),
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
        name: `พื้นที่ ${prev.length + 1}`,
        items: [],
        serviceType: [],
        packagePrice: 0,
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
          name: areaToClear.name,
          buildingType: '',
          areaSize: undefined,
          serviceType: [],
          serviceSystem: '',
          packageId: undefined,
          selectedConditionId: undefined,
          packagePrice: 0,
          estimatedCost: 0,
          items: [],
        };
      }
      return newAreas;
    });
  };

  const handlePackageSelect = (pkgId: string | null) => {
    setSelectedPackageId(pkgId);
    const selectedPkg = pkgId
      ? servicePackages.find((p) => p.id === pkgId)
      : null;
    setWorkAreas((prevAreas) =>
      prevAreas.map((area) => {
        if (!selectedPkg || !area.areaSize || area.areaSize <= 0) {
          const { packageId, selectedConditionId, packagePrice, ...rest } =
            area;
          return { ...rest, packagePrice: 0 };
        }
        const sortedConditions = [...(selectedPkg.conditions || [])].sort(
          (a, b) => a.maxArea - b.maxArea
        );
        const bestFit = sortedConditions.find(
          (c) => c.maxArea >= area.areaSize!
        );
        if (bestFit) {
          const hasTermites = (area.serviceType || []).includes('กำจัดปลวก');
          const priceToUse = hasTermites
            ? bestFit.firstOfferPriceWithTermites
            : bestFit.firstOfferPriceNoTermites;
          return {
            ...area,
            packageId: pkgId,
            selectedConditionId: bestFit.id,
            packagePrice: priceToUse,
          };
        } else {
          const { packageId, selectedConditionId, packagePrice, ...rest } =
            area;
          return { ...rest, packagePrice: undefined };
        }
      })
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assessment) return;

    const updatedAssessment: Assessment = {
      ...assessment,
      ...formData,
      updatedBy: 'ผู้ดูแลระบบ',
      workAreas: workAreas as AssessmentWorkArea[],
      totalEstimatedCost,
    };
    onUpdateAssessment(updatedAssessment);
  };

  if (!assessment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขใบประเมิน: ${assessment.id}`}
      size="5xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <p className="text-lg font-semibold text-slate-800">
            ยอดรวมทั้งหมด:{' '}
            <span className="text-primary">
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
          <FormField label="วันที่สร้าง" htmlFor="createdAt">
            <Input
              name="createdAt"
              type="date"
              value={formData.createdAt || ''}
              onChange={handleFieldChange}
              required
            />
          </FormField>
          <FormField label="ลูกค้า" htmlFor="customerId">
            <Input
              value={`${formData.customerName} (${formData.customerId})`}
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
            <FormField label="แขวง/ตำบล" htmlFor="subdistrict">
              <Input
                name="subdistrict"
                value={formData.subdistrict || ''}
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
            <FormField label="รหัสไปรษณีย์" htmlFor="postalCode">
              <Input
                name="postalCode"
                value={formData.postalCode || ''}
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
              <FormField label="Group" htmlFor="group">
                <Input
                  name="group"
                  value={formData.group || ''}
                  onChange={handleFieldChange}
                />
              </FormField>
              <FormField label="สายถนนที่" htmlFor="roadLine">
                <Input
                  name="roadLine"
                  value={formData.roadLine || ''}
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
          <FormField label="Link Google Map" htmlFor="googleMapLink">
            <Input
              name="googleMapLink"
              type="url"
              placeholder="https://maps.app.goo.gl/..."
              value={formData.googleMapLink || ''}
              onChange={handleFieldChange}
            />
          </FormField>
        </div>
        {/* Common Info */}
        <div className="border border-slate-200 p-4 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">ข้อมูลภาพรวม</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="วันที่นัดหมาย" htmlFor="scheduledAt">
              <Input
                name="scheduledAt"
                type="date"
                value={formData.scheduledAt?.substring(0, 10) || ''}
                onChange={handleFieldChange}
                required
              />
            </FormField>
            <FormField label="เงื่อนไขการชำระเงิน" htmlFor="paymentConditions">
              <Input
                name="paymentConditions"
                value={formData.paymentConditions || ''}
                onChange={handleFieldChange}
                placeholder="เช่น เงินสด, โอน"
              />
            </FormField>
          </div>
        </div>

        {maxAreaSize > 0 && suggestedPackageOptions.length > 0 && (
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
                      {option.numberOfVisits} ครั้ง / {option.contractDuration}
                    </div>
                  </label>
                ))}
              </div>
            </FormField>
          </div>
        )}

        {/* Work Areas */}
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
                  ? servicePackages.find((p) => p.id === selectedPackageId)!
                  : null
              }
            />
          ))}
        </div>

        <div className="flex justify-center">
          <Button type="button" onClick={handleAddArea} variant="primary">
            <PlusIcon className="h-5 w-5" />
            เพิ่มพื้นที่ใหม่
          </Button>
        </div>
      </form>
    </Modal>
  );
};
