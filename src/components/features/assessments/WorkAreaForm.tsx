import { useState, useEffect, useMemo, useRef, FC, ChangeEvent } from 'react';
import { FormField, Input, Select } from '../../common/FormControls';
import { ProductSelectionModal } from '../../features/products/ProductSelectionModal';
import {
  PlusIcon,
  TrashIcon,
  RefreshIcon,
  ChevronDownIcon,
} from '../../../assets/icons/Icons';
import {
  AssessmentWorkArea,
  AssessmentWorkAreaItem,
} from '@/src/types/entity/assessment.interface';
import { Package } from '@/src/types/entity/package.interface';
import { Product } from '@/src/types/entity/product.interface';
import { Category, ServiceSystem } from '@/src/types';
import { PackageType } from '@/src/types/enums/package';

interface WorkAreaFormProps {
  area: Partial<AssessmentWorkArea>;
  index: number;
  errors?: Record<string, string>;
  onAreaChange: (
    index: number,
    updatedArea: Partial<AssessmentWorkArea>
  ) => void;
  onClearArea: (index: number) => void;
  onRemoveArea?: (index: number) => void;
  products: Product[];
  selectedPackage: Package | null;
  availablePackages?: Package[];
  onSelectPackage?: (pkgId: string) => void;
  categories: Category[];
  originalArea?: Partial<AssessmentWorkArea>;
  isEditing?: boolean;
  onApprove?: (index: number) => void;
}

export const WorkAreaForm: FC<WorkAreaFormProps> = ({
  area,
  index,
  errors,
  onAreaChange,
  onClearArea,
  onRemoveArea,
  products,
  selectedPackage,
  availablePackages = [],
  onSelectPackage,
  categories,
  originalArea,
  isEditing = false,
  onApprove,
}) => {
  const isInitialLoad = useRef(true);
  const prevAreaSizeRef = useRef(area.area_size);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedStandardPrice, setSelectedStandardPrice] = useState<
    number | undefined
  >(area.package_price);

  const [optimisticPackageId, setOptimisticPackageId] = useState<string | null>(
    selectedPackage?.id || null
  );

  useEffect(() => {
    setOptimisticPackageId(selectedPackage?.id || null);
  }, [selectedPackage?.id]);

  const activePackageId = optimisticPackageId || selectedPackage?.id;
  const activePackage = useMemo(() => {
    return availablePackages.find((p) => p.id === activePackageId) || selectedPackage;
  }, [activePackageId, availablePackages, selectedPackage]);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const serviceLabels: Record<ServiceSystem, string> = {
    [ServiceSystem.PREY]: 'เหยื่อ',
    [ServiceSystem.CHEMICAL]: 'สารเคมีชีวภาพ',
    [ServiceSystem.OTHER]: 'อื่นๆ',
  };

  const sortedConditions = useMemo(() => {
    if (!activePackage) return [];
    return [...(activePackage.package_prices || [])].sort(
      (a, b) => a.area_range - b.area_range
    );
  }, [activePackage]);

  const selectedCondition = useMemo(() => {
    if (!activePackage || !area.area_size) return null;
    return (
      sortedConditions.find((c) => c.area_range >= area.area_size!) || null
    );
  }, [activePackage, area.area_size, sortedConditions]);

  const renderPriceSection = () => {
    if (!activePackage) {
      return (
        <div className="pt-4 border-t space-y-4">
          <FormField
            label="ราคาบริการหลัก (กำหนดเอง)"
            htmlFor={`manual-price-${index}`}
          >
            <Input
              id={`manual-price-${index}`}
              type="number"
              value={area.package_price === undefined ? '' : area.package_price}
              onChange={(e) => {
                onAreaChange(index, {
                  ...area,
                  package_price:
                    e.target.value === ''
                      ? undefined
                      : parseFloat(e.target.value),
                });
              }}
              step="0.01"
              placeholder="0.00"
            />
          </FormField>
        </div>
      );
    }

    return (
      <div className="pt-4 border-t mt-4">
        <div className="p-4 border rounded-xl bg-primary/5 border-primary/20">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-semibold text-slate-800">
                ราคาบริการหลัก
              </div>
              {selectedCondition && (
                <div className="text-xs text-slate-500 mt-1">
                  สามารถปรับราคาเองได้ (ขั้นต่ำ ฿
                  {Math.min(
                    selectedCondition.min_price_with_termite,
                    selectedCondition.min_price_without_termite
                  ).toLocaleString('th-TH')}
                  )
                </div>
              )}
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">฿</span>
                <Input
                  type="number"
                  className={`w-28 text-right font-bold text-sm h-10 !py-1 ${
                    isPriceInvalid
                      ? 'text-red-600 border-red-500 focus:ring-red-500 bg-red-50'
                      : 'text-primary border-slate-300 focus:ring-primary focus:border-primary bg-white'
                  }`}
                  value={
                    area.package_price === undefined ? '' : area.package_price
                  }
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    onAreaChange(index, {
                      ...area,
                      package_price:
                        e.target.value === ''
                          ? undefined
                          : parseFloat(e.target.value),
                    });
                  }}
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>
              {isPriceInvalid && selectedCondition && (
                <div className="flex items-center justify-end mt-2 text-xs text-red-600 font-medium">
                  <p>
                    ⚠️ ต่ำกว่าเกณฑ์ (ส่วนต่าง ฿
                    {(() => {
                      const minPrice = Math.min(
                        selectedCondition.min_price_with_termite,
                        selectedCondition.min_price_without_termite
                      );
                      return minPrice - (area.package_price || 0);
                    })().toLocaleString('th-TH')}
                    )
                  </p>
                  {onApprove && (
                    <button
                      type="button"
                      onClick={() => onApprove(index)}
                      className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-semibold hover:bg-red-200 transition-colors"
                    >
                      อนุมัติราคา
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      if (isEditing && typeof area.package_price === 'number' && area.package_price > 0) {
        return;
      }
    }

    if (area.area_size !== prevAreaSizeRef.current) {
      prevAreaSizeRef.current = area.area_size;

      if (activePackage && area.area_size) {
        const condition = sortedConditions.find(
          (c) => c.area_range >= area.area_size!
        );

        if (condition) {
          if (area.package_type) {
            const isWithTermite = area.package_type === PackageType.WITH_TERMITE;
            const defaultPrice = isWithTermite ? condition.price_with_termite : condition.price_without_termite;
            
            onAreaChange(index, {
              ...area,
              package_price: defaultPrice,
              package_price_id: condition.id,
              total_price: defaultPrice + (area.items || []).reduce((sum, item) => sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0), 0),
            });
          }
        } else {
          onAreaChange(index, {
            ...area,
            package_price: undefined, // ✅ เปลี่ยนจาก 0 เป็น undefined
            package_price_id: undefined,
            package_type: undefined as any,
            total_price: (area.items || []).reduce((sum, item) => sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0), 0),
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area.area_size, area.package_type, activePackage, sortedConditions, index]);

  const isPriceInvalid = useMemo(() => {
    if (!selectedCondition || typeof area.package_price !== 'number')
      return false;

    const minPrice = Math.min(
      selectedCondition.min_price_with_termite,
      selectedCondition.min_price_without_termite
    );

    return area.package_price < minPrice;
  }, [selectedCondition, area.package_price]);

  useEffect(() => {
    const itemsCost = (area.items || []).reduce(
      (sum, item) =>
        sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0),
      0
    );
    const packageCost = Number(area.package_price) || 0;
    const newTotalCost = packageCost + itemsCost;

    const currentEstimatedCost = area.total_price || 0;

    if (Math.abs(currentEstimatedCost - newTotalCost) > 0.001) {
      onAreaChange(index, { ...area, total_price: newTotalCost });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    area.items,
    area.package_price,
    index,
  ]);

  const handleFieldChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const updatedArea: Partial<AssessmentWorkArea> = { ...area };

    if (name === 'area_size') {
      updatedArea[name] = value === '' ? undefined : parseFloat(value);
    } else {
      (updatedArea as any)[name] = value;
    }

    onAreaChange(index, updatedArea);
  };

  const handleAreaSizeRadioChange = (size: number) => {
    onAreaChange(index, { ...area, area_size: size });
  };

  const handlePriceOptionChange = (
    price: number,
    hasTermiteProtection: PackageType,
    priceConditionId?: string,
    pkgId?: string
  ) => {
    setSelectedStandardPrice(price);
    
    if (pkgId) {
      setOptimisticPackageId(pkgId);
    }

    onAreaChange(index, {
      ...area,
      package_price: price,
      package_type: hasTermiteProtection,
      ...(priceConditionId ? { package_price_id: priceConditionId } : {}),
      total_price:
        price +
        (area.items || []).reduce(
          (sum, item) =>
            sum +
            (Number(item.product_price) || 0) * (Number(item.quantity) || 0),
          0
        ),
    });
  };

  const handleServiceTypeChange = (categoryId: string) => {
    const currentCategories = area.category_services || [];
    const exists = currentCategories.some((c) => c.category_id === categoryId);

    const newCategories = exists
      ? currentCategories.filter((c) => c.category_id !== categoryId)
      : [...currentCategories, { category_id: categoryId } as any];

    onAreaChange(index, { ...area, category_services: newCategories });
  };

  const handleAddProducts = (productIds: string[]) => {
    const newItems: AssessmentWorkAreaItem[] = productIds.map((pid) => {
      const product = productMap.get(pid);
      return {
        product_id: pid,
        quantity: 1,
        product_name: product?.name || '',
        product_price: product?.cost_price ? Number(product.cost_price) : 0,
        total_price: product?.cost_price ? Number(product.cost_price) : 0,
      } as any;
    });

    const currentItems = [...(area.items || []), ...newItems];

    onAreaChange(index, {
      ...area,
      items: currentItems,
      total_price:
        currentItems.reduce((sum, i) => sum + (i.total_price || 0), 0) +
        (area.package_price || 0),
    });
    setIsProductModalOpen(false);
  };

  const handleItemChange = (
    itemIndex: number,
    field: keyof AssessmentWorkAreaItem,
    value: any
  ) => {
    const currentItems = area.items || [];
    const newItems = currentItems.map((item, idx) => {
      if (idx === itemIndex) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity') {
          updatedItem.total_price =
            (updatedItem.product_price || 0) * (Number(value) || 0);
        }
        return updatedItem;
      }
      return item;
    });

    const productsTotal = newItems.reduce(
      (sum, item) => sum + (item.product_price || 0) * (item.quantity || 0),
      0
    );
    const newTotalPrice = (area.package_price || 0) + productsTotal;

    onAreaChange(index, {
      ...area,
      items: newItems,
      total_price: newTotalPrice,
    });
  };

  const handleRemoveItem = (itemIndex: number) => {
    const currentItems = area.items || [];
    const newItems = currentItems.filter((_, idx) => idx !== itemIndex);

    const productsTotal = newItems.reduce(
      (sum, item) => sum + (item.product_price || 0) * (item.quantity || 0),
      0
    );
    const newTotalPrice = (area.package_price || 0) + productsTotal;

    onAreaChange(index, {
      ...area,
      items: newItems,
      total_price: newTotalPrice,
    });
  };

  const [measurementType, setMeasurementType] = useState<'sqm' | 'meter'>(
    'sqm'
  );

  const handleMeasurementTypeChange = (type: 'sqm' | 'meter') => {
    setMeasurementType(type);
  };

  const displayIndex = useMemo(() => {
    const idx = typeof index === 'number' ? index : parseInt(index as any, 10);
    return isNaN(idx) ? index : idx + 1;
  }, [index]);

  return (
    <>
      <div className="border border-slate-300 rounded-lg bg-slate-50 relative transition-all duration-200 shadow-sm hover:shadow-md mb-4">
        {/* Header Section */}
        <div
          className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 transition-colors ${!isCollapsed ? 'rounded-t-lg' : 'rounded-lg'}`}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-3">
            <div
              className={`transform transition-transform duration-200 text-slate-400 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
            >
              <ChevronDownIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                พื้นที่ {displayIndex}
                {(area.total_price || 0) > 0 && isCollapsed && (
                  <span className="text-sm font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                    ฿{area.total_price?.toLocaleString()}
                  </span>
                )}
              </h3>
              {isCollapsed && (
                <div className="text-xs text-slate-500 mt-1 flex gap-3">
                  <span>{area.area_name || `พื้นที่ #${displayIndex}`}</span>
                  <span>
                    {area.area_size ? `${area.area_size} ตร.ม.` : 'ไม่ระบุขนาด'}
                  </span>
                  {area.building_type && <span>• {area.building_type}</span>}
                  {activePackage && <span>• {activePackage.name}</span>}
                </div>
              )}
            </div>
          </div>

          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onClearArea(index)}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 p-2 rounded-md hover:bg-slate-200 transition-colors"
              title="ล้างค่าในพื้นที่นี้"
            >
              <RefreshIcon className="h-4 w-4" />
            </button>
            {onRemoveArea && (
              <button
                type="button"
                onClick={() => onRemoveArea(index)}
                className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                title="ลบพื้นที่นี้"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-4 pt-0 border-t border-slate-200 animate-fadeIn">
            <div className="mt-4 space-y-4">
              <FormField
                label={`ชื่อพื้นที่ #${displayIndex}`}
                htmlFor={`areaName-${index}`}
              >
                <Input
                  name="area_name"
                  value={area.area_name || ''}
                  onChange={handleFieldChange}
                  placeholder="เช่น บ้าน A-1, อาคาร Lobby"
                  className={errors?.[`area_${index}_area_name`] ? 'border-red-500 bg-red-50/50' : ''}
                  required
                />
                {errors?.[`area_${index}_area_name`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`area_${index}_area_name`]}</p>
                )}
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  label="ประเภทสิ่งปลูกสร้าง"
                  htmlFor={`buildingType-${index}`}
                >
                  <Select
                    name="building_type"
                    value={area.building_type || ''}
                    onChange={handleFieldChange}
                    className={errors?.[`area_${index}_building_type`] ? 'border-red-500 bg-red-50/50' : ''}
                    required
                  >
                    <option value="">เลือกประเภท</option>
                    <option value="OFFICE">ออฟฟิศ</option>
                    <option value="HOUSE">บ้าน</option>
                    <option value="OTHER">อื่นๆ</option>
                  </Select>
                  {errors?.[`area_${index}_building_type`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`area_${index}_building_type`]}</p>
                  )}
                </FormField>

                {area.building_type === 'OTHER' && (
                  <FormField label="ระบุประเภท" htmlFor={`buildingTypeOther-${index}`}>
                    <Input
                      name="building_type_other"
                      value={area.building_type_other || ''}
                      onChange={handleFieldChange}
                      placeholder="ระบุประเภทสิ่งปลูกสร้าง"
                      required
                    />
                  </FormField>
                )}

                <FormField
                  label="ระบบใช้บริการ"
                  htmlFor={`serviceSystem-${index}`}
                >
                  <Select
                    name="service_system"
                    value={area.service_system || ''}
                    onChange={handleFieldChange}
                    className={errors?.[`area_${index}_service_system`] ? 'border-red-500 bg-red-50/50' : ''}
                    required
                  >
                    <option value="">เลือกระบบ</option>
                    {Object.values(ServiceSystem).map((type) => (
                      <option key={type} value={type}>
                        {serviceLabels[type]}
                      </option>
                    ))}
                  </Select>
                  {errors?.[`area_${index}_service_system`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`area_${index}_service_system`]}</p>
                  )}
                </FormField>

                {area.service_system === 'OTHER' && (
                  <FormField label="ระบุระบบ" htmlFor={`serviceSystemOther-${index}`}>
                    <Input
                      name="service_system_other"
                      value={(area as any).service_system_other || ''}
                      onChange={handleFieldChange}
                      placeholder="ระบุระบบที่ใช้บริการ"
                      required
                    />
                  </FormField>
                )}
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <FormField label="ประเภทบริการ *">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                    {categories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          className={`h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary ${errors?.[`area_${index}_category_services`] ? 'border-red-500' : ''}`}
                          checked={(area.category_services || []).some(
                            (s) => s.category_id === cat.id
                          )}
                          onChange={() => handleServiceTypeChange(cat.id)}
                        />
                        <span className="text-slate-700">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </FormField>
                {errors?.[`area_${index}_category_services`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`area_${index}_category_services`]}</p>
                )}
              </div>

              {/* Measurement Selection */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  เลือกหน่วยวัดพื้นที่ <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-4 mb-4">
                  <label
                    className={`flex items-center p-2 rounded-md cursor-pointer border ${measurementType === 'sqm' ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'hover:bg-slate-50 border-slate-200'}`}
                  >
                    <input
                      type="radio"
                      name={`measurementType-${index}`}
                      checked={measurementType === 'sqm'}
                      onChange={() => handleMeasurementTypeChange('sqm')}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="ml-2 text-sm font-medium text-slate-700">
                      พื้นที่ (ตร.ม.)
                    </span>
                  </label>
                  <label
                    className={`flex items-center p-2 rounded-md cursor-pointer border ${measurementType === 'meter' ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'hover:bg-slate-50 border-slate-200'}`}
                  >
                    <input
                      type="radio"
                      name={`measurementType-${index}`}
                      checked={measurementType === 'meter'}
                      onChange={() => handleMeasurementTypeChange('meter')}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="ml-2 text-sm font-medium text-slate-700">
                      พื้นที่ (เมตร)
                    </span>
                  </label>
                </div>

                {measurementType === 'sqm' && (
                  <div className="space-y-2">
                    {/* Package Selection Cards */}
                    {area.area_size &&
                      area.area_size > 0 &&
                      availablePackages.length > 0 && (
                        <>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            แพ็คเก็จ <span className="text-red-500">*</span>
                          </label>
                          <div className="mb-4 animate-fadeIn">
                            {/* แสดงข้อความล็อกแพ็คเกจ เมื่อมีการเลือกแพ็คเกจจากพื้นที่อื่นแล้ว */}
                          {selectedPackage && activePackageId === selectedPackage.id && (
                            <div className="mb-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                              ใช้แพ็คเกจเดียวกันทุกพื้นที่: <span className="font-semibold">{selectedPackage.name}</span>
                            </div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
                              {availablePackages.map((pkg) => {
                                const conditions = [
                                  ...(pkg.package_prices || []),
                                ].sort((a, b) => a.area_range - b.area_range);
                                const fit = area.area_size
                                  ? conditions.find(
                                    (c) => c.area_range >= area.area_size!
                                  )
                                  : null;

                                const isSelected = activePackageId === pkg.id;

                                // ล็อกแพ็คเกจ: ถ้ามีการเลือกแพ็คเกจจากพื้นที่อื่นแล้ว ไม่ให้เลือกแพ็คเกจอื่น
                                const isLockedByOtherArea = !!selectedPackage && selectedPackage.id !== pkg.id;

                                const isWithTermiteSelected = isSelected && area.package_price_id === fit?.id && (
                                  area.package_type === PackageType.WITH_TERMITE ||
                                  (!area.package_type && area.package_price === fit?.price_with_termite)
                                );

                                const isWithoutTermiteSelected = isSelected && area.package_price_id === fit?.id && (
                                  area.package_type === PackageType.WITHOUT_TERMITE ||
                                  (!area.package_type && area.package_price === fit?.price_without_termite)
                                );

                                return (
                                  <div
                                    key={pkg.id}
                                    role="button"
                                    tabIndex={isLockedByOtherArea ? -1 : 0}
                                    aria-disabled={isLockedByOtherArea}
                                    onClick={() => {
                                      // ถ้าถูกล็อกจากพื้นที่อื่น ไม่ให้เปลี่ยน
                                      if (isLockedByOtherArea) return;

                                      if (activePackageId !== pkg.id) {
                                        setOptimisticPackageId(pkg.id);
                                        onSelectPackage?.(pkg.id);

                                        // บังคับล้างเป็น undefined แทน 0 เพื่อไม่ให้เกิด Error ราคาต่ำกว่าเกณฑ์
                                        onAreaChange(index, {
                                          ...area,
                                          package_price: undefined,
                                          package_price_id: undefined,
                                          package_type: undefined as any,
                                          total_price: (area.items || []).reduce(
                                            (sum, item) => sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0),
                                            0
                                          ),
                                        });
                                      }
                                    }}
                                    className={`group relative flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left w-full ${
                                      isLockedByOtherArea
                                        ? 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
                                        : isSelected
                                          ? 'border-primary bg-primary/5 ring-1 ring-primary cursor-pointer'
                                          : 'border-slate-200 hover:border-primary hover:bg-primary/5 bg-white cursor-pointer'
                                    }`}
                                  >
                                    <div
                                      className={`font-semibold ${isSelected ? 'text-primary' : 'text-slate-800'} group-hover:text-primary`}
                                    >
                                      {pkg.name}
                                    </div>
                                    {fit ? (
                                      <div
                                        className={`w-full mt-2 text-lg font-bold ${isSelected ? 'text-primary' : 'text-slate-700'} group-hover:text-primary`}
                                      >
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                          เงื่อนไขราคา
                                          <span className="text-red-500">
                                            *
                                          </span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-2 w-full">
                                          {/* Option 1: With Termites */}
                                          <label
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!isSelected && onSelectPackage) {
                                                onSelectPackage(pkg.id);
                                              }
                                              handlePriceOptionChange(
                                                fit.price_with_termite,
                                                PackageType.WITH_TERMITE,
                                                fit.id,
                                                pkg.id
                                              );
                                            }}
                                            className={`p-2 border rounded-md cursor-pointer transition-all flex flex-col items-start justify-center w-full flex-1 ${isWithTermiteSelected
                                                ? 'bg-green-50 border-green-500'
                                                : 'bg-white border-slate-300 hover:border-slate-400'
                                              }`}
                                          >
                                            <div className="text-[10px] text-slate-500">
                                              มีปลวก
                                            </div>
                                            <div className="flex items-center mt-1">
                                              <div
                                                className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isWithTermiteSelected
                                                    ? 'border-green-600'
                                                    : 'border-slate-400'
                                                  }`}
                                              >
                                                {isWithTermiteSelected && (
                                                  <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                                                )}
                                              </div>
                                              <div className="font-semibold text-sm text-slate-800 ml-2">
                                                ฿
                                                {fit.price_with_termite.toLocaleString()}
                                              </div>
                                            </div>
                                          </label>

                                          {/* Option 2: Without Termites */}
                                          <label
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!isSelected && onSelectPackage) {
                                                onSelectPackage(pkg.id);
                                              }
                                              handlePriceOptionChange(
                                                fit.price_without_termite,
                                                PackageType.WITHOUT_TERMITE,
                                                fit.id,
                                                pkg.id
                                              );
                                            }}
                                            className={`p-2 border rounded-md cursor-pointer transition-all flex flex-col items-start justify-center w-full flex-1 ${isWithoutTermiteSelected
                                                ? 'bg-green-50 border-green-500'
                                                : 'bg-white border-slate-300 hover:border-slate-400'
                                              }`}
                                          >
                                            <div className="text-[10px] text-slate-500">
                                              ไม่มีปลวก
                                            </div>
                                            <div className="flex items-center mt-1">
                                              <div
                                                className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isWithoutTermiteSelected
                                                    ? 'border-green-600'
                                                    : 'border-slate-400'
                                                  }`}
                                              >
                                                {isWithoutTermiteSelected && (
                                                  <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                                                )}
                                              </div>
                                              <div className="font-semibold text-sm text-slate-800 ml-2">
                                                ฿
                                                {fit.price_without_termite.toLocaleString()}
                                              </div>
                                            </div>
                                          </label>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="mt-2 text-xs text-slate-400">
                                        ระบุขนาดเพื่อคำนวณราคา
                                      </div>
                                    )}
                                    <div className="text-[10px] text-slate-400 mt-3">
                                      {fit
                                        ? `สำหรับพื้นที่ไม่เกิน ${fit.area_range} ตร.ม.`
                                        : 'ดูเงื่อนไขราคาตามขนาดพื้นที่'}
                                    </div>
                                    {isSelected && (
                                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}

                    {/* Standard Size Options */}
                    {activePackage && sortedConditions.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-slate-800 mb-2">
                          เลือกจากขนาดมาตรฐาน:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {sortedConditions.map((condition, idx) => (
                            <label
                              key={condition.id || idx}
                              className={`relative block p-3 border rounded-lg cursor-pointer ${selectedCondition?.id === condition.id
                                  ? 'border-primary ring-2 ring-primary bg-primary/5'
                                  : 'bg-white hover:border-slate-400'
                                }`}
                            >
                              <input
                                type="radio"
                                name={`areaSize-${index}`}
                                value={condition.area_range}
                                className="sr-only"
                                onChange={() =>
                                  handleAreaSizeRadioChange(
                                    condition.area_range
                                  )
                                }
                                checked={
                                  area.area_size === condition.area_range
                                }
                              />
                              <div className="font-semibold text-slate-800 text-sm">
                                {condition.area_range.toLocaleString()} ตร.ม.
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {area.area_size && area.area_size > 0 && (
                      <p className="text-xs text-slate-500 mb-2">
                        หรือระบุขนาดเอง:
                      </p>
                    )}
                    {/* Always show input for custom area size */}
                    <div className="relative mb-3">
                      <Input
                        name="area_size"
                        type="number"
                        value={area.area_size || ''}
                        onChange={handleFieldChange}
                        placeholder="ระบุขนาดพื้นที่ (ตร.ม.)"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">ตร.ม.</span>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {renderPriceSection()}

              <div className="border border-slate-200 p-2 rounded-lg bg-white">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-slate-800">
                    รายการสินค้า/บริการ (เพิ่มเติม)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(true)}
                    className="flex items-center gap-1 bg-primary/10 text-primary font-semibold py-1 px-2 rounded-md text-sm"
                  >
                    <PlusIcon className="h-4 w-4" />
                    เพิ่ม
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-2 text-left font-medium text-slate-600 w-10">
                          ลำดับ
                        </th>
                        <th className="p-2 text-left font-medium text-slate-600">
                          รหัสสินค้า
                        </th>
                        <th className="p-2 text-left font-medium text-slate-600">
                          สินค้า/บริการ
                        </th>
                        <th className="p-2 text-center font-medium text-slate-600">
                          จำนวน
                        </th>
                        <th className="p-2 text-left font-medium text-slate-600">
                          หน่วย
                        </th>
                        <th className="p-2 text-right font-medium text-slate-600">
                          ราคารวม
                        </th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(area.items || []).length > 0 ? (
                        area.items?.map((item, itemIndex) => {
                          const product = productMap.get(item.product_id!);
                          return (
                            <tr key={item.id || itemIndex}>
                              <td className="p-1 text-center text-slate-600">
                                {itemIndex + 1}
                              </td>
                              <td className="p-1 text-slate-600">
                                {product?.code}
                              </td>
                              <td className="p-1 font-medium text-slate-800">
                                {product?.name || item.product_name}
                              </td>
                              <td className="p-1 w-24">
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleItemChange(
                                      itemIndex,
                                      'quantity',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="h-8 text-center"
                                  min="1"
                                />
                              </td>
                              <td className="p-1 text-slate-600">
                                {product?.unit?.name || '-'}
                              </td>
                              <td className="p-1 w-32 text-right text-slate-800">
                                ฿
                                {(
                                  (item.product_price || 0) *
                                  (item.quantity || 0)
                                ).toLocaleString('th-TH', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="p-1 w-10 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(itemIndex)}
                                  className="text-red-500"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-4 text-slate-700"
                          >
                            ยังไม่มีรายการ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Original Values Display (when editing) */}
              {isEditing && originalArea && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold text-amber-800 mb-2">
                    📋 ค่าก่อนหน้า (Previous Values)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {originalArea.area_size && (
                      <div>
                        <span className="text-amber-600">พื้นที่:</span>{' '}
                        <span className="font-medium text-amber-900">
                          {originalArea.area_size} ตร.ม.
                        </span>
                      </div>
                    )}
                    {typeof originalArea.package_price === 'number' && (
                      <div>
                        <span className="text-amber-600">ราคาบริการ:</span>{' '}
                        <span className="font-medium text-amber-900">
                          ฿
                          {originalArea.package_price.toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                    {typeof originalArea.total_price === 'number' && (
                      <div>
                        <span className="text-amber-600">ยอดรวม:</span>{' '}
                        <span className="font-medium text-amber-900">
                          ฿
                          {originalArea.total_price.toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-right font-semibold text-slate-800 pt-2 border-t">
                ยอดรวมพื้นที่นี้: ฿
                {(area.total_price || 0).toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      <ProductSelectionModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onAddProducts={handleAddProducts}
        existingProductIds={(area.items || []).map((i) => i.product_id!)}
        products={products}
      />
    </>
  );
};