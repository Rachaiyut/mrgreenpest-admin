import React, { useState, useEffect, useMemo } from 'react';
import { FormField, Input, Select } from '../../common/FormControls';
import { ProductSelectionModal } from '../../features/products/ProductSelectionModal';
import { PlusIcon, TrashIcon, RefreshIcon } from '../../../assets/icons/Icons';
import { AssessmentWorkArea, Product, AssessmentItem } from '../../../types';

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
  selectedPackage: Product | null;
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
    return [...(selectedPackage.conditions || [])].sort(
      (a, b) => a.maxArea - b.maxArea
    );
  }, [selectedPackage]);

  const selectedCondition = useMemo(() => {
    if (!selectedPackage || !area.areaSize) return null;
    // Logic to find condition based on exact match of maxArea (since we use it as the value for radio)
    // or finding the range if manually entered (though radio enforces exact match usually)
    return sortedConditions.find((c) => c.maxArea === area.areaSize) || null;
  }, [selectedPackage, area.areaSize, sortedConditions]);

  // Auto-calculate price when Area (condition) changes
  useEffect(() => {
    if (selectedPackage && area.areaSize) {
      const condition = sortedConditions.find(
        (c) => c.maxArea === area.areaSize
      );
      if (condition) {
        const hasTermites = (area.serviceType || []).includes('กำจัดปลวก');
        const priceToUse = hasTermites
          ? condition.firstOfferPriceWithTermites
          : condition.firstOfferPriceNoTermites;

        // Update only if price is different to avoid infinite loops
        if (area.packagePrice !== priceToUse) {
          onAreaChange(index, { ...area, packagePrice: priceToUse });
        }
      }
    }
  }, [area.areaSize, selectedPackage, area.serviceType, sortedConditions]);

  const isPriceInvalid = useMemo(() => {
    if (!selectedCondition || typeof area.packagePrice !== 'number')
      return false;
    return area.packagePrice < selectedCondition.minPrice;
  }, [selectedCondition, area.packagePrice]);

  useEffect(() => {
    const itemsCost = (area.items || []).reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const packageCost = area.packagePrice || 0;
    const newTotalCost = packageCost + itemsCost;

    const currentEstimatedCost = area.estimatedCost || 0;

    if (currentEstimatedCost !== newTotalCost) {
      onAreaChange(index, { ...area, estimatedCost: newTotalCost });
    }
  }, [area.items, area.packagePrice]);

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const updatedArea: Partial<AssessmentWorkArea> = { ...area };

    if (name === 'areaSize' || name === 'linearMeters') {
      updatedArea[name] = value === '' ? undefined : parseFloat(value);
    } else {
      (updatedArea as any)[name] = value;
    }

    onAreaChange(index, updatedArea);
  };

  // Specific handler for Radio change
  const handleAreaSizeRadioChange = (size: number) => {
    onAreaChange(index, { ...area, areaSize: size });
  };

  const handleServiceTypeChange = (service: string) => {
    const currentTypes = area.serviceType || [];
    const newTypes = currentTypes.includes(service)
      ? currentTypes.filter((s) => s !== service)
      : [...currentTypes, service];
    onAreaChange(index, { ...area, serviceType: newTypes });
  };

  const handleAddProducts = (productIds: string[]) => {
    const newItems: AssessmentItem[] = productIds.map((pid) => {
      const product = productMap.get(pid);
      return {
        id: `item-${Date.now()}-${Math.random()}`,
        productId: pid,
        quantity: 1,
        price: product?.price || 0,
      };
    });
    onAreaChange(index, {
      ...area,
      items: [...(area.items || []), ...newItems],
    });
  };

  const handleItemChange = (
    itemIndex: number,
    field: keyof Omit<AssessmentItem, 'id'>,
    value: string | number
  ) => {
    const newItems = [...(area.items || [])];
    const item = { ...newItems[itemIndex] };
    (item as any)[field] = value;
    newItems[itemIndex] = item;
    onAreaChange(index, { ...area, items: newItems });
  };

  const handleRemoveItem = (itemIndex: number) => {
    const newItems = (area.items || []).filter((_, i) => i !== itemIndex);
    onAreaChange(index, { ...area, items: newItems });
  };

  const [measurementType, setMeasurementType] = useState<'sqm' | 'meter'>(
    area.linearMeters && !area.areaSize ? 'meter' : 'sqm'
  );

  // ... existing effect hooks ...

  const handleMeasurementTypeChange = (type: 'sqm' | 'meter') => {
    setMeasurementType(type);
    // Optional: clear the other value? kept for safety or clear it?
    // User might toggle back and forth, keeping data is safer until save.
  };

  // ... existing handlers ...

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
            name="name"
            value={area.name || ''}
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
              name="buildingType"
              value={area.buildingType || ''}
              onChange={handleFieldChange}
              placeholder="บ้านเดี่ยวชั้นเดียว ,บ้านเดี่ยว 2 ชั้น , ทาวโฮม , อาคารพาณิชย์"
            />
          </FormField>
          <FormField label="ระบบใช้บริการ" htmlFor={`serviceSystem-${index}`}>
            <Select
              name="serviceSystem"
              value={area.serviceSystem || ''}
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
            <FormField label="พื้นที่ (เมตร)" htmlFor={`linearMeters-${index}`}>
              <Input
                id={`linearMeters-${index}`}
                name="linearMeters"
                type="number"
                value={area.linearMeters || ''}
                onChange={handleFieldChange}
                placeholder="ความยาวรอบรูป (ม.)"
                required
              />
            </FormField>
          )}

          {measurementType === 'sqm' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                พื้นที่ (ตร.ม.) <span className="text-red-500">*</span>
              </label>
              {selectedPackage && sortedConditions.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {sortedConditions.map((condition) => (
                    <label
                      key={condition.id}
                      className={`flex items-center p-2 border rounded-md cursor-pointer transition-colors ${area.areaSize === condition.maxArea ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'bg-slate-50 hover:bg-slate-100'}`}
                    >
                      <input
                        type="radio"
                        name={`areaSizeRadio-${index}`}
                        value={condition.maxArea}
                        checked={area.areaSize === condition.maxArea}
                        onChange={() =>
                          handleAreaSizeRadioChange(condition.maxArea)
                        }
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <span className="ml-2 text-sm text-slate-700">
                        ไม่เกิน {condition.maxArea} ตร.ม.
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <Input
                  name="areaSize"
                  type="number"
                  value={area.areaSize || ''}
                  onChange={handleFieldChange}
                  placeholder="ระบุขนาดพื้นที่ (ตร.ม.)"
                  required
                />
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
                  checked={(area.serviceType || []).includes(service)}
                  onChange={() => handleServiceTypeChange(service)}
                />
                <span className="text-sm text-slate-800">{service}</span>
              </label>
            ))}
          </div>
        </FormField>

        {selectedPackage ? (
          selectedCondition ? (
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
                      {selectedPackage.numberOfVisits} ครั้ง /{' '}
                      {selectedPackage.contractDuration} (เงื่อนไขที่ใช้:
                      ไม่เกิน {selectedCondition.maxArea} ตร.ม.)
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-700">฿</span>
                      <Input
                        type="number"
                        className={`w-28 text-right font-bold text-lg h-9 !py-1 ${isPriceInvalid ? 'text-red-600 border-red-500 focus:ring-red-500' : 'text-primary border-slate-300 focus:ring-primary focus:border-primary'}`}
                        value={
                          area.packagePrice === undefined
                            ? ''
                            : area.packagePrice
                        }
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          onAreaChange(index, {
                            ...area,
                            packagePrice:
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
                        {selectedCondition?.minPrice.toLocaleString('th-TH')})
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : area.areaSize && area.areaSize > 0 ? (
            <div className="pt-4 border-t">
              <FormField
                label="ราคาบริการแพ็กเกจ"
                htmlFor={`manual-package-price-${index}`}
              >
                <Input
                  id={`manual-package-price-${index}`}
                  type="number"
                  value={
                    area.packagePrice === undefined ? '' : area.packagePrice
                  }
                  onChange={(e) => {
                    onAreaChange(index, {
                      ...area,
                      packagePrice:
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
          ) : null
        ) : (
          <div className="pt-4 border-t">
            <FormField label="ราคาบริการหลัก" htmlFor={`manual-price-${index}`}>
              <Input
                id={`manual-price-${index}`}
                type="number"
                value={area.packagePrice === undefined ? '' : area.packagePrice}
                onChange={(e) => {
                  onAreaChange(index, {
                    ...area,
                    packagePrice:
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
        )}

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
                    const product = productMap.get(item.productId);
                    return (
                      <tr key={item.id || itemIndex}>
                        <td className="p-1 text-center text-slate-600">
                          {itemIndex + 1}
                        </td>
                        <td className="p-1 text-slate-600">{product?.id}</td>
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
                                parseInt(e.target.value)
                              )
                            }
                            className="h-8 text-center"
                            min="1"
                          />
                        </td>
                        <td className="p-1 text-slate-600">{product?.unit}</td>
                        <td className="p-1 w-32 text-right text-slate-800">
                          ฿
                          {(item.price * (item.quantity || 0)).toLocaleString(
                            'th-TH',
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
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
          {(area.estimatedCost || 0).toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
      <ProductSelectionModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onAddProducts={handleAddProducts}
        existingProductIds={(area.items || []).map((i) => i.productId!)}
      />
    </>
  );
};
