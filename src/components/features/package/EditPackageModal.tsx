import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { Modal } from '../../common';
import {
  Package,
  PackagePrice,
  Category,
  CategoryType,
  Unit,
} from '@/src/types';
import { FormField, Input, Textarea, Select } from '../../common';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';

interface EditPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: Package | null;
  onUpdatePackage: (pkg: Package) => void;
  categories: Category[];
  units: Unit[];
}

export const EditPackageModal: React.FC<EditPackageModalProps> = ({
  isOpen,
  onClose,
  pkg,
  onUpdatePackage,
  categories,
  units,
}) => {
  const [formData, setFormData] = useState<Partial<Package>>({});
  const [conditions, setConditions] = useState<Partial<PackagePrice>[]>([]);

  const availableCategories = useMemo(
    () => categories.filter((c) => c.type === CategoryType.SERVICE),
    [categories]
  );

  const availableUnits = useMemo(
    () => units.filter((u) => ['เมตร', 'ตารางเมตร'].includes(u.name)),
    [units]
  );

  useEffect(() => {
    if (pkg) {
      setFormData(pkg);
      setConditions(pkg.package_prices?.map((c) => ({ ...c })) || []);
    }
  }, [pkg]);

  const invalidConditionIndices = useMemo(() => {
    const indices: number[] = [];
    conditions.forEach((cond, index) => {
      if (
        typeof cond.min_price_with_termite === 'number' &&
        typeof cond.price_without_termite === 'number' &&
        typeof cond.price_with_termite === 'number' &&
        cond.min_price_with_termite >
          Math.min(cond.price_without_termite, cond.price_with_termite)
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
    const isNumberField = ['visit_limit'].includes(name);
    setFormData((prev) => ({
      ...prev,
      [name]: isNumberField ? parseFloat(value) : value,
    }));
  };

  const handleAddCondition = () => {
    setConditions((prev) => [
      ...prev,
      {
        area_range: undefined,
        unit_id: undefined,
        price_without_termite: 0,
        price_with_termite: 0,
        minimum_price: 0,
      },
    ]);
  };

  const handleConditionChange = (
    index: number,
    field: keyof Omit<
      PackagePrice,
      'id' | 'created_at' | 'updated_at' | 'unit'
    >,
    value: string
  ) => {
    const newConditions = [...conditions];
    if (field === 'unit_id') {
      (newConditions[index] as any)[field] = value;
    } else {
      (newConditions[index] as any)[field] = value ? parseFloat(value) : 0;
    }
    setConditions(newConditions);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (invalidConditionIndices.length > 0) {
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาแก้ไขราคาให้ถูกต้อง: ราคาต่ำสุดต้องไม่สูงกว่าราคาเสนอ' });
      return;
    }

    if (pkg) {
      const updatedPackageData: Package = {
        ...pkg,
        ...formData,
        name: formData.name || pkg.name,
        category_id: formData.category_id || pkg.category_id,
        visit_limit:
          typeof formData.visit_limit === 'number'
            ? formData.visit_limit
            : pkg.visit_limit,
        remark: formData.remark || pkg.remark,
        package_prices: conditions.map((c) => ({
          id: c.id || '',
          created_at: c.created_at || '',
          updated_at: c.updated_at || '',
          area_range: c.area_range || 0,
          unit_id: c.unit_id || null,
          price_without_termite: c.price_without_termite || 0,
          price_with_termite: c.price_with_termite || 0,
          min_price_with_termite: c.min_price_with_termite || 0,
          min_price_without_termite: c.min_price_without_termite || 0,
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
              name="code" // Mapped to code
              type="text"
              value={formData.code || ''}
              readOnly
              className="bg-slate-100"
            />
          </FormField>
          <FormField label="หมวดหมู่" htmlFor="categoryId">
            <Select
              name="category_id"
              id="categoryId"
              value={formData.category_id || formData.category?.id || ''}
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
          <FormField label="จำนวนครั้งที่เข้าบริการ" htmlFor="visit_limit">
            <Input
              id="visit_limit"
              name="visit_limit"
              type="number"
              value={formData.visit_limit || ''}
              onChange={handleChange}
              required
              placeholder="เช่น 4"
            />
          </FormField>
        </div>
        <FormField label="หมายเหตุ" htmlFor="remark">
          <Textarea
            id="remark"
            name="remark"
            value={formData.remark || ''}
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
                    หน่วย
                  </th>
                  <th className="p-2 text-left font-medium text-slate-600">
                    ราคาเสนอ (มีปลวก)
                  </th>
                  <th className="p-2 text-left font-medium text-slate-600">
                    ราคาเสนอ (ไม่มีปลวก)
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
                          value={cond.area_range || ''}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              'area_range',
                              e.target.value
                            )
                          }
                          className={`${baseInputClasses} h-9 ${normalInputClasses}`}
                          placeholder="เช่น 150"
                          required
                        />
                      </td>
                      <td className="p-1">
                        <Select
                          value={cond.unit_id || cond.unit?.id || ''}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              'unit_id',
                              e.target.value
                            )
                          }
                          className={`${baseInputClasses} h-9 ${normalInputClasses}`}
                          required
                        >
                          <option value="">-- เลือกหน่วย --</option>
                          {availableUnits.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="p-1">
                        <Input
                          type="number"
                          value={cond.price_with_termite ?? ''}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              'price_with_termite',
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
                          value={cond.price_without_termite ?? ''}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              'price_without_termite',
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
                          value={cond.min_price_with_termite ?? ''}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              'min_price_with_termite',
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
                    <td colSpan={6} className="text-center py-6 text-slate-500">
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
