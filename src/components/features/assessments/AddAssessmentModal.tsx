import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

interface AddAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAssessment: (assessmentData: Omit<Assessment, 'id' | 'code'> & { installments?: Partial<AssessmentInstallment>[] }) => void;
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [installments, setInstallments] = useState<Partial<AssessmentInstallment>[]>([]);
  const [workAreas, setWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
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

  const handleNumberOfAreasChange = (num: number) => {
    setWorkAreas(prev => {
      const current = [...prev];
      if (num > current.length) {
        const added = Array.from({ length: num - current.length }, (_, i) => ({
          id: `area-${Date.now()}-${i}`,
          area_name: `พื้นที่ ${current.length + i + 1}`,
          items: [],
          category_services: [],
          base_service_price: 0,
          total_price: 0
        }));
        return [...current, ...added];
      } else {
        return current.slice(0, num);
      }
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


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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

  // Set search query state
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างใบประเมินใหม่"
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

          {suggestedPackageOptions.length > 0 && (
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

        {/* Payment Condition Section (Moved to Bottom) */}
        <div className="w-full">
          <div className="border border-slate-200 p-6 rounded-xl space-y-6 bg-slate-50 shadow-sm">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-3">
                เงื่อนไขการชำระเงิน
              </h3>

              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_type"
                    className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                    checked={formData.payment_condition !== PaymentMethod.INSTALLMENT && formData.payment_condition !== PaymentMethod.DIVIDED}
                    onChange={() => setFormData(prev => ({ ...prev, payment_condition: PaymentMethod.CASH }))}
                  />
                  <span className="text-slate-700">ชำระเต็มจำนวน</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_type"
                    className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
                    checked={formData.payment_condition === PaymentMethod.INSTALLMENT}
                    onChange={() => setFormData(prev => ({ ...prev, payment_condition: PaymentMethod.INSTALLMENT }))}
                  />
                  <span className="text-slate-700">แบ่งชำระ (งวด)</span>
                </label>
              </div>

              {formData.payment_condition === PaymentMethod.INSTALLMENT && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField label="จำนวนงวด" htmlFor="payment_installment_count">
                      <Input
                        name="payment_installment_count"
                        type="number"
                        placeholder="ระบุจำนวนงวด"
                        value={formData.payment_installment_count || ''}
                        onChange={(e) => {
                          const count = parseInt(e.target.value, 10) || 0;
                          setFormData((prev) => ({
                            ...prev,
                            payment_installment_count: count,
                          }));
                        }}
                        required
                        min={2}
                      />
                    </FormField>
                  </div>

                  {/* Installment Details */}
                  {installments.length > 0 && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                      <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-5 bg-primary rounded-full"></span>
                        รายละเอียดการแบ่งชำระ
                      </h4>
                      <div className="space-y-4">
                        {installments.map((inst, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-4 items-end pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                            <div className="col-span-2 pt-2 text-sm font-medium text-slate-700">
                              งวดที่ {inst.installment_no}
                            </div>
                            <div className="col-span-5">
                              <label className="block text-xs font-medium text-slate-500 mb-1">จำนวนเงิน</label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={inst.amount}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    handleInstallmentAmountChange(idx, val);
                                  }}
                                  step="0.01"
                                  className="pr-8 font-medium text-slate-800"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">฿</span>
                              </div>
                            </div>
                            <div className="col-span-5">
                              <label className="block text-xs font-medium text-slate-500 mb-1">หมายเหตุ</label>
                              <Input
                                type="text"
                                value={inst.note || ''}
                                placeholder="เช่น มัดจำ"
                                onChange={(e) => {
                                  handleInstallmentNoteChange(idx, e.target.value);
                                }}
                                className="text-slate-600"
                              />
                            </div>
                          </div>
                        ))}
                        
                        <div className="pt-4 mt-2 flex justify-between items-center bg-slate-50 -mx-4 -mb-4 px-4 py-3 rounded-b-xl border-t border-slate-100">
                          <span className="text-sm font-semibold text-slate-700">รวมทั้งหมด</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${
                              Math.abs(installments.reduce((sum, i) => sum + (i.amount || 0), 0) - totalEstimatedCost) < 1 
                                ? 'text-green-600' 
                                : 'text-red-500'
                            }`}>
                              {installments.reduce((sum, i) => sum + (i.amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-slate-400 text-sm font-medium">/</span>
                            <span className="text-slate-500 text-sm font-medium">
                              {totalEstimatedCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
