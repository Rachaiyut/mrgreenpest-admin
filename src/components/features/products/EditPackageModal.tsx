import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { IProduct, IPackageCondition } from '../../../libs/common/interface/entity/product.interface';
import { ICategory } from '../../../libs/common/interface/entity/category.interface';
import { FormField, Input, Textarea, Select } from '../../common/FormControls';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';

interface EditPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: IProduct | null;
  onUpdatePackage: (pkg: IProduct) => void;
  categories: ICategory[];
}

export const EditPackageModal: React.FC<EditPackageModalProps> = ({
  isOpen,
  onClose,
  pkg,
  onUpdatePackage,
  categories,
}) => {
  const [formData, setFormData] = useState<Partial<IProduct>>({});
  const [conditions, setConditions] = useState<Partial<IPackageCondition>[]>([]);

  const availableCategories = useMemo(
    () => categories.filter((c) => c.type === 'บริการ'),
    [categories]
  );

  useEffect(() => {
    if (pkg) {
      setFormData(pkg);
      setConditions(pkg.conditions?.map((c) => ({ ...c })) || []);
    }
  }, [pkg]);

  const invalidConditionIndices = useMemo(() => {
    const indices: number[] = [];
    conditions.forEach((cond, index) => {
      if (
        typeof cond.min_price === 'number' &&
        typeof cond.first_offer_price_no_termites === 'number' &&
        typeof cond.first_offer_price_with_termites === 'number' &&
        cond.min_price >
          Math.min(
            cond.first_offer_price_no_termites,
            cond.first_offer_price_with_termites
          )
      ) {
        indices.push(index);
      }
    });
    return indices;
  }, [conditions]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    // Map camelCase names from inputs to snake_case state if needed, or update inputs to use snake_case
    // Let's update inputs to use snake_case
    const isNumberField = ['number_of_visits'].includes(name);
    setFormData((prev) => ({
      ...prev,
      [name]: isNumberField ? parseFloat(value) : value,
    }));
  };

  const handleAddCondition = () => {
    setConditions((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        max_area: undefined,
        first_offer_price_no_termites: 0,
        first_offer_price_with_termites: 0,
        min_price: 0,
      },
    ]);
  };

  const handleConditionChange = (
    index: number,
    field: keyof Omit<IPackageCondition, 'id'>,
    value: string
  ) => {
    const newConditions = [...conditions];
    (newConditions[index] as any)[field] = value ? parseFloat(value) : 0;
    setConditions(newConditions);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (invalidConditionIndices.length > 0) {
      alert('กรุณาแก้ไขราคาให้ถูกต้อง: ราคาต่ำสุดต้องไม่สูงกว่าราคาเสนอ');
      return;
    }

    if (pkg) {
      const updatedPackageData: IProduct = {
        ...pkg,
        ...formData,
        name: formData.name || pkg.name,
        category_id: formData.category_id || pkg.category_id,
        number_of_visits:
          typeof formData.number_of_visits === 'number'
            ? formData.number_of_visits
            : pkg.number_of_visits,
        contract_duration: formData.contract_duration || pkg.contract_duration,
        // updated_by: 'ผู้ดูแลระบบ', // removed as not in interface
        conditions: conditions.map((c) => ({
          id: c.id || `cond-${Date.now()}-${Math.random()}`,
          max_area: c.max_area || 0,
          first_offer_price_no_termites: c.first_offer_price_no_termites || 0,
          first_offer_price_with_termites: c.first_offer_price_with_termites || 0,
          min_price: c.min_price || 0,
        })),
      };
      onUpdatePackage(updatedPackageData);
    }
    onClose();
  };

  if (!pkg) return null;

  const baseInputClasses =
    'w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none sm:text-sm text-slate-900';
  const normalInputClasses =
    'border-slate-300 focus:ring-primary focus:border-primary';
  const errorInputClasses =
    'border-red-500 focus:ring-red-500 focus:border-red-500';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`แก้ไขแพ็กเกจ: ${pkg.name}`}
      size="3xl"
      footer={
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
            form="edit-package-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
            disabled={invalidConditionIndices.length > 0}
            title={
              invalidConditionIndices.length > 0
                ? 'ราคาต่ำสุดต้องไม่สูงกว่าราคาเสนอ'
                : ''
            }
          >
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>
      }
    >
      <form
        id="edit-package-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="รหัสแพ็กเกจ" htmlFor="package-id">
            <Input
              id="package-id"
              name="id"
              type="text"
              value={formData.id || ''}
              readOnly
              className="bg-slate-100"
            />
          </FormField>
          <FormField label="หมวดหมู่" htmlFor="categoryId">
            <Select
              name="category_id"
              id="categoryId"
              value={formData.category_id || ''}
              onChange={handleChange}
              required
            >
              <option value="">-- เลือกหมวดหมู่ --</option>
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="ชื่อแพ็กเกจ" htmlFor="name">
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name || ''}
            onChange={handleChange}
            required
            placeholder="เช่น แพ็กเกจกำจัดปลวกรายปี (บ้านเดี่ยว)"
          />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="จำนวนครั้งที่เข้าบริการ" htmlFor="numberOfVisits">
            <Input
              id="numberOfVisits"
              name="number_of_visits"
              type="number"
              value={formData.number_of_visits || ''}
              onChange={handleChange}
              required
              placeholder="เช่น 4"
            />
          </FormField>
          <FormField label="อายุสัญญา" htmlFor="contractDuration">
            <Select
              id="contractDuration"
              name="contract_duration"
              value={formData.contract_duration || ''}
              onChange={handleChange}
              required
            >
              <option>ครั้งเดียว</option>
              <option>3 เดือน</option>
              <option>6 เดือน</option>
              <option>1 ปี</option>
            </Select>
          </FormField>
        </div>
        <FormField label="หมายเหตุ" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={3}
            placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับแพ็กเกจ"
          />
        </FormField>
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-base font-semibold text-slate-800">
              เงื่อนไขราคา
            </h4>
            <button
              type="button"
              onClick={handleAddCondition}
              className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
            >
              <PlusIcon className="h-5 w-5" />
              เพิ่มเงื่อนไข
            </button>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left font-medium text-slate-600">
                    พื้นที่ฯ (ตร.ม.)
                  </th>
                  <th className="p-2 text-left font-medium text-slate-600">
                    ราคาเสนอ (ไม่มีปลวก)
                  </th>
                  <th className="p-2 text-left font-medium text-slate-600">
                    ราคาเสนอ (มีปลวก)
                  </th>
                  <th className="p-2 text-left font-medium text-slate-600">
                    ราคาต่ำสุด
                  </th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {conditions.length > 0 ? (
                  conditions.map((cond, index) => (
                    <tr
                      key={cond.id || index}
                      className="border-b border-slate-200 last:border-b-0"
                    >
                      <td className="p-1">
                        <Input
                          type="number"
                          value={cond.max_area || ''}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              'max_area',
                              e.target.value
                            )
                          }
                          className={`${baseInputClasses} h-9 ${normalInputClasses}`}
                          placeholder="เช่น 150"
                          required
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          type="number"
                          value={cond.first_offer_price_no_termites ?? ''}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              'first_offer_price_no_termites',
                              e.target.value
                            )
                          }
                          className={`${baseInputClasses} h-9 ${normalInputClasses}`}
                          placeholder="0.00"
                          step="0.01"
                          required
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          type="number"
                          value={cond.first_offer_price_with_termites ?? ''}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              'first_offer_price_with_termites',
                              e.target.value
                            )
                          }
                          className={`${baseInputClasses} h-9 ${normalInputClasses}`}
                          placeholder="0.00"
                          step="0.01"
                          required
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          type="number"
                          value={cond.min_price ?? ''}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              'min_price',
                              e.target.value
                            )
                          }
                          className={`${baseInputClasses} h-9 ${invalidConditionIndices.includes(index) ? errorInputClasses : normalInputClasses}`}
                          placeholder="0.00"
                          step="0.01"
                          required
                        />
                      </td>
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-500">
                      ยังไม่มีเงื่อนไข
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {invalidConditionIndices.length > 0 && (
            <p className="text-sm text-red-600 mt-2">
              ข้อผิดพลาด: ราคาต่ำสุดต้องไม่สูงกว่าราคาเสนอ
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};
