import React, { useState, useEffect, useMemo } from 'react';
import { FormField, Input, Select } from '../../common/FormControls';
import { ProductSelectionModal } from '../../features/products/ProductSelectionModal';
import { PlusIcon, TrashIcon, RefreshIcon } from '../../../assets/icons/Icons';
import {
  AssessmentWorkArea,
  AssessmentItem,
} from '@/src/types/entity/assessment.interface';
import { Package } from '@/src/types/entity/package.interface';
import { Product } from '@/src/types/entity/product.interface';

const SERVICE_TYPES = [
  'กำจัดปลวก',
  'กำจัดมด',
  'กำจัดแมลงสาบ',
  'กำจัดหนู',
  'กำจัดยุง',
  'อื่นๆ',
];

interface WorkAreaFormProps {
  area: Partial<AssessmentWorkArea>;
  index: number;
  onAreaChange: (
    index: number,
    updatedArea: Partial<AssessmentWorkArea>
  ) => void;
  onClearArea: (index: number) => void;
  onRemoveArea?: (index: number) => void;
  products: Product[];
  selectedPackage: Package | null;
}

export const WorkAreaForm: React.FC<WorkAreaFormProps> = ({
  area,
  index,
  onAreaChange,
  onClearArea,
  onRemoveArea,
  products,
  selectedPackage,
}) => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  // Derived logic for package conditions
  const sortedConditions = useMemo(() => {
    if (!selectedPackage) return [];
    return [...(selectedPackage.package_price || [])].sort(
      (a, b) => a.area_range - b.area_range
    );
  }, [selectedPackage]);

  const selectedCondition = useMemo(() => {
    if (!selectedPackage || !area.area_size) return null;
    return (
      sortedConditions.find((c) => c.area_range >= area.area_size!) || null
    );
  }, [selectedPackage, area.area_size, sortedConditions]);

  const renderPriceSection = () => {
    if (!selectedPackage) {
      return (
        <div className="pt-4 border-t">
          <FormField label="ราคาบริการหลัก" htmlFor={`manual-price-${index}`}>
            <Input
              id={`manual-price-${index}`}
              type="number"
              value={
                area.base_service_price === undefined
                  ? ''
                  : area.base_service_price
              }
              onChange={(e) => {
                onAreaChange(index, {
                  ...area,
                  base_service_price:
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

    if (selectedCondition) {
      return (
        <div className="pt-4 border-t">
          <h4 className="text-base font-semibold text-slate-700">
            แพ็กเกจที่เลือก
          </h4>
          <div className="p-3 border rounded-lg bg-primary/5 border-primary/20 mt-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-slate-800">
                  {selectedPackage.name}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {selectedPackage.visit_limit} ครั้ง /{' '}
                  {selectedPackage.contract_period} (เงื่อนไขที่ใช้: ไม่เกิน{' '}
                  {selectedCondition.area_range} ตร.ม.)
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-700">฿</span>
                  <Input
                    type="number"
                    className={`w-28 text-right font-bold text-lg h-9 !py-1 ${isPriceInvalid ? 'text-red-600 border-red-500 focus:ring-red-500' : 'text-primary border-slate-300 focus:ring-primary focus:border-primary'}`}
                    value={
                      area.base_service_price === undefined
                        ? ''
                        : area.base_service_price
                    }
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      onAreaChange(index, {
                        ...area,
                        base_service_price:
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
                {isPriceInvalid && (
                  <p className="text-xs text-red-600 mt-1">
                    ต่ำกว่าราคาขั้นต่ำ (฿
                    {selectedCondition?.minimum_price.toLocaleString('th-TH')})
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (area.area_size && area.area_size > 0) {
      return (
        <div className="pt-4 border-t">
          <FormField
            label="ราคาบริการแพ็กเกจ"
            htmlFor={`manual-package-price-${index}`}
          >
            <Input
              id={`manual-package-price-${index}`}
              type="number"
              value={
                area.base_service_price === undefined
                  ? ''
                  : area.base_service_price
              }
              onChange={(e) => {
                onAreaChange(index, {
                  ...area,
                  base_service_price:
                    e.target.value === ''
                      ? undefined
                      : parseFloat(e.target.value),
                });
              }}
              step="0.01"
              placeholder="0.00"
              required
            />
          </FormField>
          <p className="text-xs text-amber-600 mt-1">
            ขนาดพื้นที่ไม่อยู่ในเงื่อนไขแพ็กเกจ กรุณาระบุราคาเอง
          </p>
        </div>
      );
    }

    return null;
  };

  // Auto-calculate price when Area (condition) changes
  useEffect(() => {
    if (selectedPackage && area.area_size) {
      // Sort package prices by area_range ascending to find the best fit
      const sortedPrices = [...(selectedPackage.package_price || [])].sort(
        (a, b) => a.area_range - b.area_range
      );

      // Find the first package price condition where the area range covers the input area size
      // e.g. if input is 80, and ranges are 100, 200... it should match 100.
      const condition = sortedPrices.find(
        (c) => c.area_range >= area.area_size!
      );

      if (condition) {
        const hasTermites = (area.service_type || []).includes('กำจัดปลวก');
        const priceToUse = hasTermites
          ? condition.price_with_termite
          : condition.price_without_termite;

        if (area.base_service_price !== priceToUse) {
          onAreaChange(index, { ...area, base_service_price: priceToUse });
        }
      } else {
        if (area.base_service_price !== 0) {
          onAreaChange(index, { ...area, base_service_price: 0 });
        }
      }
    }
  }, [area.area_size, selectedPackage, area.service_type]);

  const isPriceInvalid = useMemo(() => {
    if (!selectedCondition || typeof area.base_service_price !== 'number')
      return false;
    return area.base_service_price < selectedCondition.minimum_price;
  }, [selectedCondition, area.base_service_price]);

  useEffect(() => {
    const itemsCost = (area.products || []).reduce(
      (sum, item) =>
        sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0
    );
    const packageCost = Number(area.base_service_price) || 0;
    const newTotalCost = packageCost + itemsCost;

    const currentEstimatedCost = area.total_price || 0;

    if (currentEstimatedCost !== newTotalCost) {
      onAreaChange(index, { ...area, total_price: newTotalCost });
    }
  }, [
    area.products,
    area.base_service_price,
    area.total_price,
    index,
    onAreaChange,
  ]);

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const updatedArea: Partial<AssessmentWorkArea> = { ...area };

    if (name === 'area_size' || name === 'perimeter') {
      updatedArea[name] = value === '' ? undefined : parseFloat(value);
    } else {
      (updatedArea as any)[name] = value;
    }

    onAreaChange(index, updatedArea);
  };

  // Specific handler for Radio change
  const handleAreaSizeRadioChange = (size: number) => {
    onAreaChange(index, { ...area, area_size: size });
  };

  const handleServiceTypeChange = (service: string) => {
    const currentTypes = area.service_type || [];
    const newTypes = currentTypes.includes(service)
      ? currentTypes.filter((s) => s !== service)
      : [...currentTypes, service];
    onAreaChange(index, { ...area, service_type: newTypes });
  };

  const handleAddProducts = (productIds: string[]) => {
    const newItems: AssessmentItem[] = productIds.map((pid) => {
      const product = productMap.get(pid);
      return {
        product_id: pid,
        quantity: 1,
        price: product?.cost_price ? Number(product.cost_price) : 0,
      };
    });

    // Calculate new total cost immediately
    const currentItems = [...(area.products || []), ...newItems];
    const itemsCost = currentItems.reduce(
      (sum, item) =>
        sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0
    );
    const packageCost = Number(area.base_service_price) || 0;

    onAreaChange(index, {
      ...area,
      products: currentItems,
      total_price: packageCost + itemsCost,
    });
  };

  const handleItemChange = (
    itemIndex: number,
    field: keyof Omit<AssessmentItem, 'id'>,
    value: string | number
  ) => {
    const newItems = [...(area.products || [])];
    const item = { ...newItems[itemIndex] };
    (item as any)[field] = value;
    newItems[itemIndex] = item;

    // Calculate new total cost immediately
    const itemsCost = newItems.reduce(
      (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
      0
    );
    const packageCost = Number(area.base_service_price) || 0;

    onAreaChange(index, {
      ...area,
      products: newItems,
      total_price: packageCost + itemsCost,
    });
  };

  const handleRemoveItem = (itemIndex: number) => {
    const newItems = (area.products || []).filter((_, i) => i !== itemIndex);

    // Calculate new total cost immediately
    const itemsCost = newItems.reduce(
      (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
      0
    );
    const packageCost = Number(area.base_service_price) || 0;

    onAreaChange(index, {
      ...area,
      products: newItems,
      total_price: packageCost + itemsCost,
    });
  };

  const [measurementType, setMeasurementType] = useState<'sqm' | 'meter'>(
    area.perimeter && !area.area_size ? 'meter' : 'sqm'
  );

  const handleMeasurementTypeChange = (type: 'sqm' | 'meter') => {
    setMeasurementType(type);
  };

  return (
    <>
      <div className="border border-slate-300 p-4 rounded-lg space-y-4 bg-slate-50 relative">
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onClearArea(index)}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-700 py-1 px-2 rounded-md hover:bg-slate-200 text-sm"
            title="ล้างค่าในพื้นที่นี้"
          >
            <RefreshIcon className="h-4 w-4" />
            <span>ล้างค่า</span>
          </button>
          {onRemoveArea && (
            <button
              type="button"
              onClick={() => onRemoveArea(index)}
              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
              title="ลบพื้นที่นี้"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        <FormField
          label={`ชื่อพื้นที่ #${index + 1}`}
          htmlFor={`areaName-${index}`}
        >
          <Input
            name="area_name"
            value={area.area_name || ''}
            onChange={handleFieldChange}
            placeholder="เช่น บ้าน A-1, อาคาร Lobby"
            required
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            label="ประเภทสิ่งปลูกสร้าง"
            htmlFor={`buildingType-${index}`}
          >
            <Input
              name="building_type"
              value={area.building_type || ''}
              onChange={handleFieldChange}
              placeholder="บ้านเดี่ยวชั้นเดียว ,บ้านเดี่ยว 2 ชั้น , ทาวโฮม , อาคารพาณิชย์"
            />
          </FormField>
          <FormField label="ระบบใช้บริการ" htmlFor={`serviceSystem-${index}`}>
            <Select
              name="service_system"
              value={area.service_system || ''}
              onChange={handleFieldChange}
            >
              <option value="">-- เลือกระบบ --</option>
              <option>เหยื่อ</option>
              <option>สารเคมีชีวภาพ</option>
            </Select>
          </FormField>
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
                ความยาวรอบรูป (เมตร)
              </span>
            </label>
          </div>

          {measurementType === 'meter' && (
            <FormField label="พื้นที่ (ม.)" htmlFor={`linearMeters-${index}`}>
              <div className="relative">
                <Input
                  id={`linearMeters-${index}`}
                  name="perimeter"
                  type="number"
                  value={area.perimeter || ''}
                  onChange={handleFieldChange}
                  placeholder="ความยาวรอบรูป (ม.)"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">ม.</span>
                </div>
              </div>
            </FormField>
          )}

          {measurementType === 'sqm' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                พื้นที่ (ตร.ม.) <span className="text-red-500">*</span>
              </label>

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

              {/* Show current package price if calculated */}
              {selectedPackage && area.area_size && area.area_size > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center">
                  <span className="text-sm text-blue-800 font-medium">
                    ราคาแพ็กเกจสำหรับ {area.area_size} ตร.ม.:
                  </span>
                  <span className="text-lg text-blue-900 font-bold">
                    ฿{(area.base_service_price || 0).toLocaleString()}
                  </span>
                </div>
              )}

              {selectedPackage && sortedConditions.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-2">
                    หรือเลือกจากขนาดมาตรฐาน:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {sortedConditions.map((condition, idx) => (
                      <label
                        key={condition.id || idx}
                        className={`relative block p-3 border rounded-lg cursor-pointer ${
                          selectedCondition?.id === condition.id
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
                            handleAreaSizeRadioChange(condition.area_range)
                          }
                          checked={area.area_size === condition.area_range}
                        />
                        <div className="font-semibold text-slate-800">
                          {condition.area_range.toLocaleString()} ตร.ม.
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <FormField label="ประเภทบริการ">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1 border p-2 rounded-md bg-white">
            {SERVICE_TYPES.map((service) => (
              <label key={service} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(area.service_type || []).includes(service)}
                  onChange={() => handleServiceTypeChange(service)}
                />
                <span className="text-sm text-slate-800">{service}</span>
              </label>
            ))}
          </div>
        </FormField>

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
                {(area.products || []).length > 0 ? (
                  area.products?.map((item, itemIndex) => {
                    const product = productMap.get(item.product_id!);
                    return (
                      <tr key={item.id || itemIndex}>
                        <td className="p-1 text-center text-slate-600">
                          {itemIndex + 1}
                        </td>
                        <td className="p-1 text-slate-600">{product?.code}</td>
                        <td className="p-1 font-medium text-slate-800">
                          {product?.name}
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
                            (item.price || 0) * (item.quantity || 0)
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
                    <td colSpan={7} className="text-center py-4 text-slate-700">
                      ยังไม่มีรายการ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="text-right font-semibold text-slate-800 pt-2 border-t">
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
        existingProductIds={(area.products || []).map((i) => i.product_id!)}
        products={products}
      />
    </>
  );
};
