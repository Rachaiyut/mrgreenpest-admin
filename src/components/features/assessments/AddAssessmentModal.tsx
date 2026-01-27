import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Select, Textarea } from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import {
  Assessment,
  Product,
  AssessmentWorkArea,
  Customer,
  Category
} from '@/src/types/entity/app.interface';
import { Package } from '@/src/types/entity/package.interface';
import { WorkAreaForm } from './WorkAreaForm';
import { AsessmentStatus, ServiceSystem } from '@/src/types/enums/assessment';
import { CategoryApi, CustomerApi, PackageApi, ProductApi } from '@/src/api';
import { PaymentMethod } from '@/src/types/enums/financial';
import { CategoryType } from '@/src/types';

interface AddAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAssessment: (assessmentData: Omit<Assessment, 'id' | 'code'>) => void;
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
}) => {
  const [formData, setFormData] = useState<
    Partial<Omit<Assessment, 'workAreas' | 'totalEstimatedCost'>>
  >({});
  const [customers, setCustomer] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([])

  const [searchQuery, setSearchQuery] = useState('');

  const [workAreas, setWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );

  const PAYMENT_LABELS: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'เงินสด',
    [PaymentMethod.TRANSFER]: 'โอนเงิน',
  };

  const paymentOptions = Object.values(PaymentMethod).map((value) => ({
    value,
    label: PAYMENT_LABELS[value as PaymentMethod] || value,
  }));

  const fetchCategories = useCallback(async () => {
    try {
      const response = await CategoryApi.getCategories({ 
        page: 1, 
        limit: 10, 
        type: CategoryType.SERVICE 
      })

      setCategories(response.data)
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await CustomerApi.getCustomers({
        page: 1,
        limit: 10,
        search: searchQuery,
      });

      setCustomer(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, [searchQuery]);

  const fetchPackages = useCallback(async () => {
    try {
      const response = await PackageApi.getPackages({
        page: 1,
        limit: 10,
      });
      setPackages(response.data);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await ProductApi.getProducts({
        page: 1,
        limit: 100,
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories();
      fetchCustomers();
      fetchPackages();
      fetchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchCustomers, fetchPackages, fetchProducts, fetchCategories]);

  const maxAreaSize = useMemo(
    () => Math.max(0, ...workAreas.map((a) => a.area_size || 0)),
    [workAreas]
  );

  const suggestedPackageOptions = useMemo(() => {
    if (maxAreaSize === 0) return [];
    return packages.filter(
      (pkg) =>
        pkg.package_price &&
        pkg.package_price.some((c) => c.area_range >= maxAreaSize)
    );
  }, [maxAreaSize, packages]);

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
        appointment_date: new Date(),
      });
      setWorkAreas([
        {
          area_name: 'พื้นที่ 1',
          items: [],
        },
      ]);
      setSelectedPackageId(null);
    }
  }, [isOpen]);

  const totalEstimatedCost = useMemo(
    () => workAreas.reduce((sum, area) => sum + (area.total_price || 0), 0),
    [workAreas]
  );

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setFormData((prev) => ({
        ...prev,
        customer_id: customerId,
        address: customer.address_house_no,
        sub_district: customer.sub_district,
        status: AsessmentStatus.DRAFT,
        district: customer.district,
        province: customer.province,
        zipcode: customer.postal_code,
        google_map_link: customer.google_map_link,
        zone: customer.service_area || '',
        route_group: customer.service_group || '',
        road_line: customer.road_line || '',
        sequence: customer.sequence_no || '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, customer_id: customerId }));
    }
  };

  const handleFieldChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: new Date(value) }));
  };

  const handleNumberOfAreasChange = (count: number) => {
    setWorkAreas((currentAreas) => {
      const currentCount = currentAreas.length;
      if (count > currentCount) {
        const newAreas = Array.from(
          { length: count - currentCount },
          (_, i) => ({
            area_name: `พื้นที่ ${currentCount + i + 1}`,
            items: [],
            categories: [],
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
            area_name: areaToClear.area_name,
            area_size: undefined,
          service_system: undefined,
          total_price: 0,
          items: [],
          category_services: [],
        };
      }
      return newAreas;
    });
  };

  const handlePackageSelect = (pkgId: string | null) => {
    setSelectedPackageId(pkgId);
    const selectedPkg = pkgId ? packages.find((p) => p.id === pkgId) : null;

    // Update form data
    setFormData((prev) => ({ ...prev, package_id: pkgId || '' }));

    setWorkAreas((prevAreas) =>
      prevAreas.map((area) => {
        if (!selectedPkg || !area.area_size || area.area_size <= 0) {
          return { ...area };
        }
        const sortedConditions = [...(selectedPkg.package_price || [])].sort(
          (a, b) => a.area_range - b.area_range
        );
        const bestFit = sortedConditions.find(
          (c) => c.area_range >= area.area_size!
        );
        if (bestFit) {
          const termiteCategory = categories.find(c => c.name.includes('กำจัดปลวก'));
          const hasTermites = (area.category_services || []).some(
            (s) => s.category_id === termiteCategory?.id
          );
          const priceToUse = hasTermites
            ? bestFit.price_with_termite
            : bestFit.price_without_termite;
          return {
            ...area,
            base_service_price: priceToUse,
            package_price_id: bestFit.id,
          };
        } else {
          return { ...area, package_price_id: undefined };
        }
      })
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newAssessment: Omit<Assessment, 'id' | 'code'> = {
      // Defaults
      status: AsessmentStatus.DRAFT,
      created_by: 'ผู้ดูแลระบบ',
      updated_by: 'ผู้ดูแลระบบ',

      // Spread form data
      ...formData,

      // Overrides/Calculated
      assessment_areas: workAreas as AssessmentWorkArea[],
      total_price: totalEstimatedCost,

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
      appointment_date: formData.appointment_date || new Date(),
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
              options={(customers || []).map((c) => ({
                value: c.id,
                label: `${c.code} : ${c.first_name} ${c.last_name} ${
                  c.nickname ? `(${c.nickname})` : ''
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
            <FormField label="เงื่อนไขการชำระเงิน" htmlFor="payment_condition">
              <SearchableSelect
                options={paymentOptions}
                value={formData.payment_condition || ''}
                onChange={(val: any) => setFormData((prev) => ({ ...prev, payment_condition: val }))}
                required
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
                      {option.visit_limit} ครั้ง / {option.contract_period} ปี
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
              categories={categories}
              selectedPackage={
                selectedPackageId
                  ? packages.find((p) => p.id === selectedPackageId)!
                  : null
              }
            />
          ))}
        </div>
      </form>
    </Modal>
  );
};
