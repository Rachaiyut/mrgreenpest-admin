import { useState, useEffect, useMemo, useRef, FC, ChangeEvent } from 'react';
import { BUILDING_TYPE_LABELS } from '@/src/constants';
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
  AssessmentWorkAreaCategory,
} from '@/src/types/entity/assessment.interface';
import { Package, PackagePrice } from '@/src/types/entity/package.interface';
import { Product } from '@/src/types/entity/product.interface';
import { Category, ServiceSystem } from '@/src/types';
import { PackageType } from '@/src/types/enums/package';
import PackageSelectionGrid from '../../common/PackageSelectionGrid';

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
  const [isAreaSizeFocused, setIsAreaSizeFocused] = useState(false);
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

  // filteredPackages moved below selectedUnitId declaration

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const serviceLabels: Record<ServiceSystem, string> = {
    [ServiceSystem.PREY]: 'เหยื่อ',
    [ServiceSystem.CHEMICAL]: 'สารเคมีชีวภาพ',
    [ServiceSystem.OTHER]: 'อื่นๆ',
  };

  // หา unique units จาก ALL packages' prices (not just active)
  const availableUnitOptions = useMemo(() => {
    const unitMap = new Map<string, string>();
    availablePackages.forEach((pkg: Package) => {
      (pkg.package_prices || []).forEach((p: PackagePrice) => {
        if (p.unit_id) {
          unitMap.set(p.unit_id, p.unit?.name || p.unit?.symbol || p.unit_id);
        }
      });
    });
    return Array.from(unitMap, ([id, name]) => ({ id, name }));
  }, [availablePackages]);

  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  useEffect(() => {
    if (availableUnitOptions.length === 1) {
      setSelectedUnitId(availableUnitOptions[0].id);
    } else if (area.package_price_id && activePackage?.package_prices) {
      const matched = (activePackage.package_prices || []).find((p) => p.id === area.package_price_id);
      if (matched?.unit_id) setSelectedUnitId(matched.unit_id);
    } else if (availableUnitOptions.length > 1 && !selectedUnitId) {
      // Default: set selectedUnitId ตาม measurementType โดยไม่ reset area data
      const matched = availableUnitOptions.find(u => {
        const name = u.name.toLowerCase();
        if (measurementType === 'meter') {
          return name.includes('เมตร') && !name.includes('ตาราง') && !name.includes('ตร.');
        } else {
          return name.includes('ตาราง') || name.includes('ตร.');
        }
      });
      if (matched) setSelectedUnitId(matched.id);
    }
  }, [availableUnitOptions, area.package_price_id, activePackage]);

  const selectedUnitName = useMemo(() => {
    return availableUnitOptions.find(u => u.id === selectedUnitId)?.name || 'ตร.ม.';
  }, [selectedUnitId, availableUnitOptions]);

  const sortedConditions = useMemo(() => {
    if (!activePackage) return [];
    let prices = [...(activePackage.package_prices || [])];
    if (selectedUnitId) {
      prices = prices.filter((p) => p.unit_id === selectedUnitId);
    }
    return prices.sort((a, b) => a.area_range - b.area_range);
  }, [activePackage, selectedUnitId]);

  // Filter packages by selected measurement type unit AND area size
  const filteredPackages = useMemo(() => {
    let result = availablePackages;
    if (selectedUnitId) {
      result = result.filter((pkg: Package) => {
        const prices = pkg.package_prices || [];
        return prices.some((p: PackagePrice) => p.unit_id === selectedUnitId);
      });
    }
    if (area.area_size && area.area_size > 0) {
      result = result.filter((pkg: Package) => {
        const prices = selectedUnitId
          ? (pkg.package_prices || []).filter((p: PackagePrice) => p.unit_id === selectedUnitId)
          : (pkg.package_prices || []);
        return prices.some((p: PackagePrice) => p.area_range >= area.area_size!);
      });
    }
    return result;
  }, [availablePackages, selectedUnitId, area.area_size]);

  const selectedCondition = useMemo(() => {
    if (!activePackage || !area.area_size) return null;
    return (
      sortedConditions.find((c) => c.area_range >= area.area_size!) || null
    );
  }, [activePackage, area.area_size, sortedConditions]);

  const effectiveMinPrice = useMemo(() => {
    if (!selectedCondition) return 0;
    if (area.package_type === PackageType.WITH_TERMITE) {
      return selectedCondition.min_price_with_termite;
    }
    return selectedCondition.min_price_without_termite;
  }, [selectedCondition, area.package_type]);

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
                  {effectiveMinPrice.toLocaleString('th-TH')}
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
                    {(effectiveMinPrice - (area.package_price || 0)).toLocaleString('th-TH')}
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
            package_type: undefined!,
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

    return area.package_price < effectiveMinPrice;
  }, [selectedCondition, area.package_price, effectiveMinPrice]);

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
      (updatedArea as Record<string, unknown>)[name] = value;
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
      : [...currentCategories, { category_id: categoryId } as AssessmentWorkAreaCategory];

    onAreaChange(index, { ...area, category_services: newCategories });
  };

  const handleAddProducts = (productIds: string[]) => {
    const newItems: AssessmentWorkAreaItem[] = productIds.map((pid) => {
      const product = productMap.get(pid);
      return {
        product_id: pid,
        quantity: 1,
        product_name: product?.name || '',
        unit: (product as unknown as Record<string, Record<string, string>>)?.unit?.name || '',
        product_price: product?.cost_price ? Number(product.cost_price) : 0,
        total_price: product?.cost_price ? Number(product.cost_price) : 0,
      } as unknown as AssessmentWorkAreaItem;
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
    value: string | number
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
    (area as unknown as Record<string, string>).measurement_unit === 'meter' ? 'meter' : 'sqm'
  );

  const handleMeasurementTypeChange = (type: 'sqm' | 'meter') => {
    setMeasurementType(type);
    // เชื่อม unit filter กับ measurement type — match แบบ flexible
    const matched = availableUnitOptions.find(u => {
      const name = u.name.toLowerCase();
      if (type === 'meter') {
        return name.includes('เมตร') && !name.includes('ตาราง') && !name.includes('ตร.');
      } else {
        return name.includes('ตาราง') || name.includes('ตร.');
      }
    });
    if (matched) setSelectedUnitId(matched.id);
    // Reset area size + package selection เพื่อให้ user เลือกใหม่ตาม unit ใหม่
    onAreaChange(index, {
      ...area,
      measurement_unit: type,
      area_size: undefined,
      package_price: undefined,
      package_price_id: undefined,
      package_type: undefined!,
      total_price: (area.items || []).reduce((sum: number, item: AssessmentWorkAreaItem) => sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0), 0),
    });
  };

  const displayIndex = useMemo(() => {
    const idx = typeof index === 'number' ? index : parseInt(String(index), 10);
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
                    {area.area_size ? `${area.area_size} ${selectedUnitName}` : 'ไม่ระบุขนาด'}
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
                    {Object.entries(BUILDING_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
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
                      value={(area as unknown as Record<string, string>).service_system_other || ''}
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
                    {categories.map((cat) => {
                      const isOther = cat.name === 'อื่นๆ';
                      const isChecked = (area.category_services || []).some(
                        (s) => s.category_id === cat.id
                      );
                      return (
                        <div key={cat.id} className={isOther ? 'col-span-2 md:col-span-2' : ''}>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center space-x-2 shrink-0">
                              <input
                                type="checkbox"
                                className={`h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary ${errors?.[`area_${index}_category_services`] ? 'border-red-500' : ''}`}
                                checked={isChecked}
                                onChange={() => handleServiceTypeChange(cat.id)}
                              />
                              <span className="text-slate-700">{cat.name}</span>
                            </label>
                            {isOther && isChecked && (
                              <input
                                type="text"
                                placeholder="ระบุประเภทบริการอื่นๆ..."
                                value={(area as Record<string, unknown>).category_other as string || ''}
                                onChange={(e) =>
                                  onAreaChange(index, { ...area, category_other: e.target.value } as typeof area)
                                }
                                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm text-slate-900"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                    <PackageSelectionGrid
                      packages={filteredPackages}
                      areaSize={area.area_size}
                      activePackageId={activePackageId}
                      selectedPackageId={selectedPackage?.id}
                      area={area}
                      unitName={selectedUnitName}
                      selectedUnitId={selectedUnitId}
                      error={errors?.[`area_${index}_package`]}
                      onSelectPackage={onSelectPackage}
                      onPackageCardClick={(pkgId) => {
                        if (activePackageId !== pkgId) {
                          setOptimisticPackageId(pkgId);
                          onSelectPackage?.(pkgId);
                          onAreaChange(index, { ...area, package_price: undefined, package_price_id: undefined, package_type: undefined!, total_price: (area.items || []).reduce((sum: number, item) => sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0), 0) });
                        }
                      }}
                      onPriceOptionChange={handlePriceOptionChange}
                    />

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
                                {condition.area_range.toLocaleString()} {(condition as unknown as Record<string, Record<string, string>>).unit?.name || selectedUnitName}
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
                        type="text"
                        inputMode="decimal"
                        value={isAreaSizeFocused ? (area.area_size ?? '') : (area.area_size ? Number(area.area_size).toLocaleString('th-TH') : '')}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, '');
                          if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                            onAreaChange(index, { ...area, area_size: raw === '' ? undefined : parseFloat(raw) });
                          }
                        }}
                        onFocus={() => setIsAreaSizeFocused(true)}
                        onBlur={() => setIsAreaSizeFocused(false)}
                        placeholder={`ระบุขนาดพื้นที่ (${selectedUnitName})`}
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">{selectedUnitName}</span>
                      </div>
                    </div>

                  </div>
                )}

                {measurementType === 'meter' && (
                  <div className="space-y-2">
                    <PackageSelectionGrid
                      packages={filteredPackages}
                      areaSize={area.area_size}
                      activePackageId={activePackageId}
                      selectedPackageId={selectedPackage?.id}
                      area={area}
                      unitName="เมตร"
                      selectedUnitId={selectedUnitId}
                      error={errors?.[`area_${index}_package`]}
                      onSelectPackage={onSelectPackage}
                      onPackageCardClick={(pkgId) => {
                        if (activePackageId !== pkgId) {
                          setOptimisticPackageId(pkgId);
                          onSelectPackage?.(pkgId);
                          onAreaChange(index, { ...area, package_price: undefined, package_price_id: undefined, package_type: undefined!, total_price: (area.items || []).reduce((sum: number, item) => sum + (Number(item.product_price) || 0) * (Number(item.quantity) || 0), 0) });
                        }
                      }}
                      onPriceOptionChange={handlePriceOptionChange}
                    />

                    {/* Standard Size Options for meter */}
                    {activePackage && sortedConditions.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-slate-800 mb-2">เลือกจากขนาดมาตรฐาน:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {sortedConditions.map((condition, idx) => (
                            <label key={condition.id || idx} className={`relative block p-3 border rounded-lg cursor-pointer ${selectedCondition?.id === condition.id ? 'border-primary ring-2 ring-primary bg-primary/5' : 'bg-white hover:border-slate-400'}`}>
                              <input type="radio" name={`areaSize-${index}`} value={condition.area_range} className="sr-only" onChange={() => handleAreaSizeRadioChange(condition.area_range)} checked={area.area_size === condition.area_range} />
                              <div className="font-semibold text-slate-800 text-sm">{condition.area_range.toLocaleString()} {(condition as unknown as Record<string, Record<string, string>>).unit?.name || 'เมตร'}</div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {area.area_size && area.area_size > 0 && (
                      <p className="text-xs text-slate-500 mb-2">หรือระบุขนาดเอง:</p>
                    )}
                    <div className="relative mb-3">
                      <Input
                        name="area_size"
                        type="text"
                        inputMode="decimal"
                        value={isAreaSizeFocused ? (area.area_size ?? '') : (area.area_size ? Number(area.area_size).toLocaleString('th-TH') : '')}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, '');
                          if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                            onAreaChange(index, { ...area, area_size: raw === '' ? undefined : parseFloat(raw) });
                          }
                        }}
                        onFocus={() => setIsAreaSizeFocused(true)}
                        onBlur={() => setIsAreaSizeFocused(false)}
                        placeholder="ระบุขนาดพื้นที่ (เมตร)"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">เมตร</span>
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
                                {(item as unknown as Record<string, string>).unit || product?.unit?.name || '-'}
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

            </div>
          </div>
        )}
        {/* รูปภาพพื้นที่ */}
        <div className="border border-slate-200 p-3 rounded-lg bg-white mb-4 mx-4">
          <h3 className="font-semibold text-slate-800 mb-2">รูปภาพพื้นที่ <span className="text-xs font-normal text-slate-400">(สูงสุด 5 รูป)</span></h3>
          {(() => {
            const areaAny = area as unknown as Record<string, any>;
            const existingUrls: string[] = Array.isArray(areaAny.site_image_urls) ? areaAny.site_image_urls : (areaAny.site_image_url ? [areaAny.site_image_url] : []);
            const existingIds: string[] = Array.isArray(areaAny.site_image_ids) ? areaAny.site_image_ids : (areaAny.site_image_id ? [areaAny.site_image_id] : []);
            const previewUrls: string[] = Array.isArray(areaAny.siteImagePreviews) ? areaAny.siteImagePreviews : (areaAny.siteImagePreview ? [areaAny.siteImagePreview] : []);
            const files: File[] = Array.isArray(areaAny.siteImageFiles) ? areaAny.siteImageFiles : (areaAny.siteImageFile ? [areaAny.siteImageFile] : []);
            const allImages = [
              ...existingUrls.map((url, i) => ({ src: url, type: 'existing' as const, id: existingIds[i] || null, idx: i })),
              ...previewUrls.map((url, i) => ({ src: url, type: 'new' as const, id: null, idx: i })),
            ];
            const totalCount = allImages.length;
            const canAddMore = totalCount < 5;

            if (totalCount === 0) {
              return (
                <label className="block border-2 border-dashed border-slate-200 rounded-lg p-6 text-center bg-slate-50 cursor-pointer hover:border-primary/30 transition-colors">
                  <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" /></svg>
                  <span className="text-sm text-primary font-medium">เลือกรูปภาพ</span>
                  <p className="text-xs text-slate-400 mt-0.5">PNG, JPG (ไม่เกิน 5MB)</p>
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const selectedFiles = Array.from(e.target.files || []);
                      const filesToAdd = selectedFiles.slice(0, 5);
                      if (filesToAdd.length === 0) return;
                      const newPreviews = filesToAdd.map(f => URL.createObjectURL(f));
                      onAreaChange(index, {
                        ...area,
                        siteImageFiles: filesToAdd,
                        siteImagePreviews: newPreviews,
                      } as Partial<AssessmentWorkArea>);
                      e.target.value = '';
                    }}
                  />
                </label>
              );
            }

            return (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {allImages.map((img, imgIdx) => (
                  <div key={`${img.type}-${imgIdx}`} className="relative group aspect-square">
                    <img
                      src={img.src}
                      alt={`${area.area_name} ${imgIdx + 1}`}
                      className="w-full h-full rounded-lg border border-slate-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (img.type === 'existing') {
                          const newUrls = existingUrls.filter((_, i) => i !== img.idx);
                          const newIds = existingIds.filter((_, i) => i !== img.idx);
                          onAreaChange(index, {
                            ...area,
                            site_image_urls: newUrls,
                            site_image_ids: newIds,
                            site_image_url: newUrls[0] || null,
                            site_image_id: newIds[0] || null,
                          } as Partial<AssessmentWorkArea>);
                        } else {
                          const newPreviews = previewUrls.filter((_, i) => i !== img.idx);
                          const newFiles = files.filter((_, i) => i !== img.idx);
                          onAreaChange(index, {
                            ...area,
                            siteImagePreviews: newPreviews,
                            siteImageFiles: newFiles,
                            siteImagePreview: newPreviews[0] || null,
                            siteImageFile: newFiles[0] || null,
                          } as Partial<AssessmentWorkArea>);
                        }
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="ลบรูป"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {canAddMore && (
                  <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 cursor-pointer hover:border-primary/30 transition-colors">
                    <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" /></svg>
                    <span className="text-xs text-primary font-medium mt-1">เพิ่มรูป</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        const remaining = 5 - totalCount;
                        const filesToAdd = selectedFiles.slice(0, remaining);
                        if (filesToAdd.length === 0) return;
                        const newPreviews = filesToAdd.map(f => URL.createObjectURL(f));
                        onAreaChange(index, {
                          ...area,
                          siteImageFiles: [...files, ...filesToAdd],
                          siteImagePreviews: [...previewUrls, ...newPreviews],
                        } as Partial<AssessmentWorkArea>);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            );
          })()}
        </div>

        <div className="text-right font-semibold text-slate-800 pt-2 pb-3 border-t mx-2">
          ยอดรวมพื้นที่นี้: ฿
          {(area.total_price || 0).toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
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