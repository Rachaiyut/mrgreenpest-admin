import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input, Textarea, Button } from '../../common/FormControls';
import {
  Assessment,
  Product,
  AssessmentWorkArea,
  Customer,
  Category,
} from '@/src/types/entity/app.interface';
import { Package } from '@/src/types/entity/package.interface';
import { CategoryType } from '@/src/types/enums/category';
import { PlusIcon, LoadingIcon } from '../../../assets/icons/Icons';
import { WorkAreaForm } from './WorkAreaForm';
import { PackageApi, PriceEngineApi } from '@/src/api';

interface TechAssessmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
  onUpdateAssessment: (assessmentData: Assessment) => void;
  products: Product[];
  categories: Category[];
}

export const TechAssessmentEditModal: React.FC<TechAssessmentEditModalProps> = ({
  isOpen,
  onClose,
  assessment,
  onUpdateAssessment,
  products,
  categories = [],
}) => {
  const [formData, setFormData] = useState<Partial<Assessment>>({});
  const [workAreas, setWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [originalWorkAreas, setOriginalWorkAreas] = useState<Partial<AssessmentWorkArea>[]>([]);
  const [originalTotalPrice, setOriginalTotalPrice] = useState<number>(0);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);

  // Fetch packages
  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    setIsLoadingPackages(true);
    try {
      const res = await PackageApi.getPackages({ limit: 10 });
      const packagesData = (res as any).data || res || [];
      setPackages(Array.isArray(packagesData) ? packagesData : []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  // Filter packages that have price conditions
  // Also include the package from assessment if it has price data
  const packagesWithPrices = useMemo(() => {
    const filteredPackages = packages.filter(
      (pkg) => pkg.package_price && pkg.package_price.length > 0
    );

    // If assessment has a package with prices, ensure it's in the list
    const assessmentPackage = (assessment as any)?.package;
    if (assessmentPackage?.package_price?.length > 0) {
      const exists = filteredPackages.some(p => p.id === assessmentPackage.id);
      if (!exists) {
        filteredPackages.unshift(assessmentPackage);
      }
    }

    return filteredPackages;
  }, [packages, assessment]);

  const servicePackages = useMemo(
    () => products.filter((p) => p.category?.type === CategoryType.SERVICE),
    [products]
  );

  useEffect(() => {
    if (assessment && isOpen) {
      // Debug: Log assessment data to verify package is present
      console.log('TechAssessmentEditModal - Assessment:', assessment);
      console.log('TechAssessmentEditModal - Package from assessment:', (assessment as any).package);
      console.log('TechAssessmentEditModal - package_id:', assessment.package_id);

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

      const rawAreas = assessment_areas || assessment.assessment_areas || [];

      // Store original values for reference (deep copy to prevent mutations)
      const originalAreas = rawAreas.map((wa) => ({
        ...wa,
        items: [...(wa.items || [])],
        category_services: [...(wa.category_services || [])],
      }));
      setOriginalWorkAreas(originalAreas);
      setOriginalTotalPrice(assessment.total_price || 0);

      const initialWorkAreas = rawAreas.map((wa) => {
        const enrichedItems = (wa.items || []).map((item) => {
          if (item.product_id && (!item.product_name || !item.product_price)) {
            const product = products.find((p) => p.id === item.product_id);
            if (product) {
              return {
                ...item,
                product_name: product.name,
                product_price: product.cost_price
                  ? Number(product.cost_price)
                  : 0,
              };
            }
          }
          return item;
        });

        return {
          ...wa,
          items: enrichedItems,
          category_services: wa.category_services || [],
        };
      });
      setWorkAreas(initialWorkAreas || []);
    } else if (!isOpen) {
      setFormData({});
      setWorkAreas([]);
      setOriginalWorkAreas([]);
      setOriginalTotalPrice(0);
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
      ? packagesWithPrices.find((p) => p.id === pkgId)
      : null;

    // Update work areas with new prices based on selected package
    setWorkAreas((prevAreas) =>
      prevAreas.map((area) => {
        if (!selectedPkg || !area.area_size || area.area_size <= 0) {
          return { ...area };
        }

        const sortedConditions = [
          ...(selectedPkg.package_price || []),
        ].sort((a, b) => a.area_range - b.area_range);

        const bestFit = sortedConditions.find(
          (c) => c.area_range >= area.area_size!
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

          // Calculate total price including items
          const itemsTotal = (area.items || []).reduce(
            (sum, item) => sum + (item.product_price || 0) * (item.quantity || 0),
            0
          );

          return {
            ...area,
            base_service_price: priceToUse,
            package_price: priceToUse, // Set package price snapshot
            package_price_id: bestFit.id,
            total_price: priceToUse + itemsTotal,
          };
        } else {
          return { ...area };
        }
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assessment) return;

    const sanitizedWorkAreas = workAreas.map((area) => {
      const newArea: any = { ...area };
      if (newArea.id && newArea.id.startsWith('area-')) {
        delete newArea.id;
      }
      if (newArea.package_price !== undefined && newArea.package_price !== null) {
        newArea.package_price = Number(newArea.package_price);
      }
      delete newArea.base_service_price;
      return newArea;
    });

    const updatedAssessment: Assessment = {
      ...assessment,
      ...formData,
      package_id: selectedPackageId || undefined,
      updated_by: 'ช่างเทคนิค',
      assessment_areas: sanitizedWorkAreas as AssessmentWorkArea[],
      total_price: totalEstimatedCost,
    };

    onUpdateAssessment(updatedAssessment);
    onClose();
  };

  // Get selected package object for WorkAreaForm
  const selectedPackageForForm = useMemo(() => {
    if (!selectedPackageId) return null;
    // First check in packagesWithPrices (includes assessment's package if available)
    const fromPackages = packagesWithPrices.find((p) => p.id === selectedPackageId);
    if (fromPackages) return fromPackages;
    // Fallback to assessment's embedded package
    const assessmentPackage = (assessment as any)?.package;
    if (assessmentPackage?.id === selectedPackageId) return assessmentPackage;
    return null;
  }, [selectedPackageId, packagesWithPrices, assessment]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขใบประเมิน (สำหรับช่าง): ${assessment?.code || assessment?.id || ''}`}
      size="5xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <p className="text-lg font-semibold text-slate-800">
            ยอดรวมทั้งหมด:{' '}
            <span className="text-primary">
              ฿{totalEstimatedCost.toLocaleString('th-TH', {
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
              form="tech-edit-assessment-form"
              className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            >
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </div>
      }
    >
      <form
        id="tech-edit-assessment-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Basic Info (Read Only or Limited) */}
        <div className="border border-slate-200 p-4 rounded-lg space-y-4 bg-slate-50">
          <h3 className="text-lg font-semibold text-slate-800">
            ข้อมูลทั่วไป
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="ลูกค้า">
              <Input
                value={assessment?.customer?.first_name ? `${assessment.customer.first_name} ${assessment.customer.last_name}` : ''}
                readOnly
                className="bg-slate-100 text-slate-600"
              />
            </FormField>
            <FormField label="วันที่นัดหมาย">
              <Input
                type="date"
                value={
                  formData.appointment_date
                    ? new Date(formData.appointment_date)
                      .toISOString()
                      .substring(0, 10)
                    : ''
                }
                readOnly
                className="bg-slate-100 text-slate-600"
              />
            </FormField>
          </div>
          <FormField label="ที่อยู่">
            <Textarea
              value={formData.address || ''}
              readOnly
              className="bg-slate-100 text-slate-600"
              rows={2}
            />
          </FormField>
        </div>

        {/* Draft Data from Admin - Summary Section */}
        {originalWorkAreas.length > 0 && (
          <div className="border-2 border-blue-300 p-4 rounded-lg bg-blue-50">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                📋 ข้อมูล Draft จาก Admin
              </div>
              <span className="text-sm text-blue-700">
                (ข้อมูลที่ Admin สร้างไว้ - อ่านอย่างเดียว)
              </span>
            </div>

            {/* Package Info */}
            {(assessment as any)?.package && (
              <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">
                  แพ็กเกจที่เลือก
                </h4>
                <div className="text-slate-700">
                  <span className="font-medium">{(assessment as any).package?.name}</span>
                  {(assessment as any).package?.visit_limit && (
                    <span className="text-sm text-slate-500 ml-2">
                      ({(assessment as any).package.visit_limit} ครั้ง / {(assessment as any).package.contract_period} เดือน)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Original Work Areas Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-blue-800">
                พื้นที่สำรวจ ({originalWorkAreas.length} พื้นที่)
              </h4>

              {originalWorkAreas.map((area, index) => (
                <div key={area.id || index} className="bg-white p-3 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold text-slate-800">
                        {area.area_name || `พื้นที่ ${index + 1}`}
                      </span>
                      {area.building_type && (
                        <span className="text-sm text-slate-500 ml-2">
                          ({area.building_type})
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-700">
                        ฿{(area.total_price || 0).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {area.area_size && (
                      <div>
                        <span className="text-slate-500">ขนาด:</span>{' '}
                        <span className="font-medium">{area.area_size} ตร.ม.</span>
                      </div>
                    )}
                    {typeof area.base_service_price === 'number' && (
                      <div>
                        <span className="text-slate-500">ราคาบริการ:</span>{' '}
                        <span className="font-medium">
                          ฿{area.base_service_price.toLocaleString('th-TH')}
                        </span>
                      </div>
                    )}
                    {area.service_system && (
                      <div>
                        <span className="text-slate-500">ระบบ:</span>{' '}
                        <span className="font-medium">{area.service_system}</span>
                      </div>
                    )}
                  </div>

                  {/* Category Services */}
                  {area.category_services && area.category_services.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {area.category_services.map((cat, catIdx) => {
                        const categoryInfo = categories.find(c => c.id === cat.category_id);
                        return (
                          <span
                            key={catIdx}
                            className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full"
                          >
                            {categoryInfo?.name || cat.name || 'บริการ'}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Items */}
                  {area.items && area.items.length > 0 && (
                    <div className="mt-2 border-t pt-2">
                      <div className="text-xs text-slate-500 mb-1">สินค้า/บริการเพิ่มเติม:</div>
                      <div className="space-y-1">
                        {area.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex justify-between text-sm">
                            <span>{item.product_name} x{item.quantity}</span>
                            <span className="text-slate-600">
                              ฿{(item.total_price || 0).toLocaleString('th-TH')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Original Total */}
              <div className="flex justify-between items-center p-3 bg-blue-100 rounded-lg">
                <span className="font-semibold text-blue-800">ยอดรวมจาก Admin:</span>
                <span className="text-xl font-bold text-blue-700">
                  ฿{originalTotalPrice.toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Divider with edit indicator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 py-1 bg-white text-slate-600 text-sm font-medium rounded-full border border-slate-300">
              ✏️ แก้ไขข้อมูลด้านล่าง
            </span>
          </div>
        </div>

        {/* Package Selection */}
        <div className="border border-slate-200 p-4 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">
              เลือกแพ็กเกจบริการ
            </h3>
            {isLoadingPackages && (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <LoadingIcon className="h-4 w-4 animate-spin" />
                กำลังโหลด...
              </div>
            )}
          </div>

          {packagesWithPrices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* No package option */}
              <label
                className={`relative block p-4 border rounded-lg cursor-pointer transition-all ${!selectedPackageId
                  ? 'border-primary ring-2 ring-primary bg-primary/5'
                  : 'bg-white hover:border-slate-400 border-slate-200'
                  }`}
              >
                <input
                  type="radio"
                  name="packageId-tech"
                  className="sr-only"
                  onChange={() => handlePackageSelect(null)}
                  checked={!selectedPackageId}
                />
                <div className="font-semibold text-slate-800">ไม่ใช้แพ็กเกจ</div>
                <div className="text-xs text-slate-500 mt-1">
                  กำหนดราคาเอง
                </div>
              </label>

              {/* Package options */}
              {packagesWithPrices.map((pkg) => (
                <label
                  key={pkg.id}
                  className={`relative block p-4 border rounded-lg cursor-pointer transition-all ${selectedPackageId === pkg.id
                    ? 'border-primary ring-2 ring-primary bg-primary/5'
                    : 'bg-white hover:border-slate-400 border-slate-200'
                    }`}
                >
                  <input
                    type="radio"
                    name="packageId-tech"
                    value={pkg.id}
                    className="sr-only"
                    onChange={() => handlePackageSelect(pkg.id)}
                    checked={selectedPackageId === pkg.id}
                  />
                  <div className="font-semibold text-slate-800">{pkg.name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {pkg.visit_limit} ครั้ง / {pkg.contract_period} เดือน
                  </div>
                  {pkg.package_price && pkg.package_price.length > 0 && (
                    <div className="text-xs text-primary mt-2">
                      {pkg.package_price.length} ระดับราคา
                    </div>
                  )}
                </label>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500 text-center py-4">
              {isLoadingPackages ? 'กำลังโหลดแพ็กเกจ...' : 'ไม่พบแพ็กเกจที่มีเงื่อนไขราคา'}
            </div>
          )}
        </div>

        {/* Work Areas */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">
              พื้นที่สำรวจและบริการ
            </h3>
          </div>

          {workAreas.map((area, index) => (
            <WorkAreaForm
              key={area.id || index}
              area={area}
              index={index}
              onAreaChange={handleAreaChange}
              onRemoveArea={handleRemoveArea}
              onClearArea={handleClearArea}
              products={products}
              selectedPackage={selectedPackageForForm as any}
              categories={categories}
              isEditing={true}
              originalArea={originalWorkAreas[index]}
            />
          ))}
        </div>

        <div className="flex justify-center">
          <Button type="button" onClick={handleAddArea} variant="primary">
            <PlusIcon className="h-5 w-5" />
            เพิ่มพื้นที่สำรวจ
          </Button>
        </div>

        {/* Price Summary */}
        {workAreas.length > 0 && (
          <div className="border border-slate-200 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              สรุปราคา
            </h3>
            <div className="space-y-2">
              {workAreas.map((area, index) => {
                const originalArea = originalWorkAreas[index];
                const hasChanged = originalArea && originalArea.total_price !== area.total_price;

                return (
                  <div
                    key={area.id || index}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-slate-600">
                      {area.area_name || `พื้นที่ ${index + 1}`}
                      {area.area_size && (
                        <span className="text-slate-400 ml-1">
                          ({area.area_size} ตร.ม.)
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {hasChanged && originalArea && (
                        <span className="text-xs text-amber-600 line-through">
                          ฿{(originalArea.total_price || 0).toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                      <span className={`font-semibold ${hasChanged ? 'text-green-600' : 'text-slate-800'}`}>
                        ฿{(area.total_price || 0).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-slate-200 pt-2 mt-2">
                {/* Original Total Display */}
                {originalTotalPrice > 0 && originalTotalPrice !== totalEstimatedCost && (
                  <div className="flex justify-between items-center text-sm text-amber-600 mb-1">
                    <span>ยอดเดิม (ก่อนแก้ไข)</span>
                    <span className="line-through">
                      ฿{originalTotalPrice.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800">รวมทั้งหมด</span>
                  <span className="text-xl font-bold text-primary">
                    ฿{totalEstimatedCost.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
