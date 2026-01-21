import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Select, Textarea } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import {
  Assessment,
  Product,
  AssessmentItem,
  PackageCondition,
  AssessmentWorkArea,
  Customer
} from '@/src/types/entity/app.interface';
import { CategoryType } from '@/src/types/enums/category.enum';
import { PlusIcon, TrashIcon, RefreshIcon } from '../../../assets/icons/Icons';
import { ProductSelectionModal } from '../../features/products/ProductSelectionModal';
import { WorkAreaForm } from './WorkAreaForm';
import { AsessmentStatus } from "@/src/types/enums/assessment.enum";

interface AddAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAssessment: (assessmentData: Omit<Assessment, 'id'>) => void;
  products: Product[];
  customers: Customer[];
}

const SERVICE_TYPES = [
  'กำจัดปลวก',
  'กำจัดมด',
  'กำจัดแมลงสาบ',
  'กำจัดหนู',
  'กำจัดยุง',
  'อื่นๆ',
];

export const AddAssessmentModal: React.FC<AddAssessmentModalProps> = ({
  isOpen,
  onClose,
  onCreateAssessment,
  products,
  customers,
}) => {
  const [formData, setFormData] = useState<
    Partial<Omit<Assessment, 'workAreas' | 'totalEstimatedCost'>>
  >({});
  const [workAreas, setWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );

  const servicePackages = useMemo(
    () => products.filter((p) => p.type === CategoryType.SERVICE),
    [products]
  );
  const maxAreaSize = useMemo(
    () => Math.max(0, ...workAreas.map((a) => a.area_size || 0)),
    [workAreas]
  );

  const suggestedPackageOptions = useMemo(() => {
    if (maxAreaSize === 0) return [];
    return servicePackages.filter(
      (pkg) =>
        pkg.conditions && pkg.conditions.some((c) => c.max_area >= maxAreaSize)
    );
  }, [maxAreaSize, servicePackages]);

  useEffect(() => {
    if (
      selectedPackageId &&
      !suggestedPackageOptions.some((p) => p.id === selectedPackageId)
    ) {
      handlePackageSelect(null);
    }
  }, [suggestedPackageOptions, selectedPackageId]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        created_at: new Date().toISOString().substring(0, 10),
        scheduled_at: new Date().toISOString().substring(0, 10),
      });
      setWorkAreas([
        {
          id: `area-${Date.now()}`,
          name: 'พื้นที่ 1',
          items: [],
          service_type: [],
          package_price: 0,
        },
      ]);
      setSelectedPackageId(null);
    }
  }, [isOpen]);

  const totalEstimatedCost = useMemo(
    () => workAreas.reduce((sum, area) => sum + (area.estimated_cost || 0), 0),
    [workAreas]
  );

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setFormData((prev) => ({
        ...prev,
        customerId: customer.id,
        customerName: `${customer.first_name} ${customer.last_name}`,
        address: customer.address_house_no,
        subdistrict: customer.sub_district,
        district: customer.district,
        province: customer.province,
        postalCode: customer.postal_code,
        googleMapLink: customer.google_map_link,
        zone: '',
        group: '',
        roadLine: '',
        sequence: '',
      }));
    }
  };

  const handleFieldChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'customerId') {
      const customer = customers.find((c) => c.id === value);
      if (customer) {
        setFormData((prev) => ({
          ...prev,
          customerName: `${customer.first_name} ${customer.last_name}`,
          address: customer.address_house_no,
          subdistrict: customer.sub_district,
          district: customer.district,
          province: customer.province,
          postalCode: customer.postal_code,
          googleMapLink: customer.google_map_link,
          zone: '',
          group: '',
          roadLine: '',
          sequence: '',
        }));
      }
    }
  };

  const handleNumberOfAreasChange = (count: number) => {
    setWorkAreas((currentAreas) => {
      const currentCount = currentAreas.length;
      if (count > currentCount) {
        const newAreas = Array.from(
          { length: count - currentCount },
          (_, i) => ({
            id: `area-${Date.now()}-${i}`,
            name: `พื้นที่ ${currentCount + i + 1}`,
            items: [],
            service_type: [],
            package_price: 0,
          })
        );
        return [...currentAreas, ...newAreas];
      } else if (count < currentCount) {
        return currentAreas.slice(0, count);
      }
      return currentAreas;
    });
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
          building_type: '',
          area_size: undefined,
          service_type: [],
          service_system: '',
          package_id: undefined,
          selected_condition_id: undefined,
          package_price: 0,
          estimated_cost: 0,
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
        if (!selectedPkg || !area.area_size || area.area_size <= 0) {
          const { package_id, selected_condition_id, package_price, ...rest } =
            area;
          return { ...rest, package_price: 0 };
        }
        const sortedConditions = [...(selectedPkg.conditions || [])].sort(
          (a, b) => a.max_area - b.max_area
        );
        const bestFit = sortedConditions.find(
          (c) => c.max_area >= area.area_size!
        );
        if (bestFit) {
          const hasTermites = (area.service_type || []).includes('กำจัดปลวก');
          const priceToUse = hasTermites
            ? bestFit.first_offer_price_with_termites
            : bestFit.first_offer_price_no_termites;
          return {
            ...area,
            package_id: pkgId,
            selected_condition_id: bestFit.id,
            package_price: priceToUse,
          };
        } else {
          const { package_id, selected_condition_id, package_price, ...rest } =
            area;
          return { ...rest, package_price: undefined };
        }
      })
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newAssessment: Omit<Assessment, 'id'> = {
      ...formData,
      status: AsessmentStatus.Draft,
      created_by: 'ผู้ดูแลระบบ', // Mock user
      updated_by: 'ผู้ดูแลระบบ', // Mock user
      work_areas: workAreas as AssessmentWorkArea[],
      total_estimated_cost: totalEstimatedCost,
      customer_name: formData.customer_name || '',
      address: formData.address || '',
      subdistrict: formData.subdistrict || '',
      district: formData.district || '',
      province: formData.province || '',
      postal_code: formData.postal_code || '',
      customer_id: formData.customer_id || '',
      created_at: formData.created_at || new Date().toISOString(),
      scheduled_at: formData.scheduled_at || new Date().toISOString(),
    };

    onCreateAssessment(newAssessment);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างใบประเมินใหม่"
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
              form="add-assessment-form"
              className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            >
              บันทึก
            </button>
          </div>
        </div>
      }
    >
      <form
        id="add-assessment-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="วันที่สร้าง" htmlFor="created_at">
            <Input
              name="created_at"
              type="date"
              value={formData.created_at?.substring(0, 10) || ''}
              onChange={handleFieldChange}
              required
            />
          </FormField>
          <div className="mb-4">
            <SearchableSelect
              label="ลูกค้า"
              options={customers.map((c) => ({
                value: c.id,
                label: `${c.first_name} ${c.last_name} (${c.phone})`,
                description: c.address_house_no,
              }))}
              value={formData.customer_id || ''}
              onChange={(val) => handleCustomerChange(val)}
              required
            />
          </div>
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
            <FormField label="รหัสไปรษณีย์" htmlFor="postal_code">
              <Input
                name="postal_code"
                value={formData.postal_code || ''}
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
            <FormField label="วันที่นัดหมาย" htmlFor="scheduled_at">
              <Input
                name="scheduled_at"
                type="date"
                value={formData.scheduled_at?.substring(0, 10) || ''}
                onChange={handleFieldChange}
                required
              />
            </FormField>
            <FormField label="เงื่อนไขการชำระเงิน" htmlFor="payment_conditions">
              <Input
                name="payment_conditions"
                value={formData.payment_conditions || ''}
                onChange={handleFieldChange}
                placeholder="เช่น เงินสด, โอน"
              />
            </FormField>
          </div>
        </div>

        <FormField
          label="จำนวนพื้นที่ที่ต้องการประเมิน"
          htmlFor="numberOfAreas"
        >
          <Select
            id="numberOfAreas"
            value={workAreas.length}
            onChange={(e) =>
              handleNumberOfAreasChange(parseInt(e.target.value, 10))
            }
          >
            {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </Select>
        </FormField>

        {maxAreaSize > 0 && suggestedPackageOptions.length > 0 && (
          <div className="pt-4 border-t">
            <FormField label="เลือกแพ็กเกจสำหรับทุกพื้นที่ (ไม่บังคับ)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <label
                  className={`relative block p-3 border rounded-lg cursor-pointer ${!selectedPackageId ? 'border-primary ring-2 ring-primary bg-primary/5' : 'bg-white hover:border-slate-400'}`}
                >
                  <input
                    type="radio"
                    name="packageId-main"
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
                      name="packageId-main"
                      value={option.id}
                      className="sr-only"
                      onChange={() => handlePackageSelect(option.id)}
                      checked={selectedPackageId === option.id}
                    />
                    <div className="font-semibold text-slate-800">
                      {option.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {option.number_of_visits} ครั้ง / {option.contract_duration}
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
      </form>
    </Modal>
  );
};
