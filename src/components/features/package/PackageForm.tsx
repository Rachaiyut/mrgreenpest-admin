import React, { useMemo, useState, useEffect, FC } from 'react';
import Swal from 'sweetalert2';
import { FormField, Input, Textarea, Select } from '../../common/FormControls';
import { PlusIcon, TrashIcon, CurrencyDollarIcon } from '../../../assets/icons/Icons';
import { Package, PackagePrice, Category, CategoryType, Unit } from '@/src/types';

interface PackageFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<Package>;
  categories: Category[];
  units: Unit[];
  onSubmit: (data: Partial<Package>) => void | Promise<void>;
  onCancel: () => void;
}

const PackageForm: FC<PackageFormProps> = ({
  mode,
  initialValues,
  categories,
  units,
  onSubmit,
  onCancel,
}) => {
  const [code, setCode] = useState(initialValues?.code || '');
  const [name, setName] = useState(initialValues?.name || '');
  const [categoryId, setCategoryId] = useState(initialValues?.category_id || '');
  const [visitLimit, setVisitLimit] = useState<number>(initialValues?.visit_limit || 0);
  const [remark, setRemark] = useState(initialValues?.remark || '');
  const [conditions, setConditions] = useState<Partial<PackagePrice>[]>([]);

  useEffect(() => {
    if (initialValues?.package_prices && initialValues.package_prices.length > 0) {
      setConditions(initialValues.package_prices.map((p) => ({
        id: p.id,
        unit_id: p.unit_id,
        area_range: p.area_range,
        price_with_termite: p.price_with_termite,
        price_without_termite: p.price_without_termite,
        min_price_with_termite: p.min_price_with_termite,
        min_price_without_termite: p.min_price_without_termite,
      })));
    }
  }, [initialValues]);

  const availableCategories = useMemo(
    () => categories.filter((c) => c.type === CategoryType.SERVICE),
    [categories]
  );

  const availableUnits = useMemo(
    () => units.filter((u) => ['เมตร', 'ตารางเมตร'].includes(u.name)),
    [units]
  );

  const invalidIndices = useMemo(() => {
    const indices: number[] = [];
    conditions.forEach((c, i) => {
      if (
        typeof c.min_price_without_termite === 'number' &&
        typeof c.price_without_termite === 'number' &&
        c.min_price_without_termite > c.price_without_termite
      ) indices.push(i);
      if (
        typeof c.min_price_with_termite === 'number' &&
        typeof c.price_with_termite === 'number' &&
        c.min_price_with_termite > c.price_with_termite
      ) if (!indices.includes(i)) indices.push(i);
    });
    return indices;
  }, [conditions]);

  const handleConditionChange = (index: number, field: string, value: string) => {
    setConditions((prev) => prev.map((c, i) => {
      if (i !== index) return c;
      if (field === 'unit_id') return { ...c, [field]: value };
      return { ...c, [field]: value === '' ? '' : parseFloat(value) };
    }));
  };

  const handlePriceFocus = (index: number, field: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    const val = ((conditions[index] as unknown as Record<string, unknown>))?.[field];
    if (val === 0 || val === '0') {
      handleConditionChange(index, field, '');
    } else {
      e.target.select();
    }
  };

  const handleAddCondition = () => {
    setConditions((prev) => [...prev, {
      area_range: undefined,
      unit_id: availableUnits[0]?.id || undefined,
      price_with_termite: undefined,
      price_without_termite: undefined,
      min_price_with_termite: undefined,
      min_price_without_termite: undefined,
    }]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invalidIndices.length > 0) {
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'ราคาต่ำสุดต้องไม่สูงกว่าราคาเสนอ' });
      return;
    }
    if (!name.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาระบุชื่อแพ็กเกจ' });
      return;
    }
    if (!categoryId) {
      Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณาเลือกหมวดหมู่' });
      return;
    }

    onSubmit({
      ...initialValues,
      code,
      name,
      category_id: categoryId,
      visit_limit: visitLimit,
      remark,
      package_prices: conditions.map((c) => ({
        ...(c.id ? { id: c.id } : {}),
        area_range: c.area_range || 0,
        unit_id: c.unit_id || null,
        price_with_termite: c.price_with_termite || 0,
        price_without_termite: c.price_without_termite || 0,
        min_price_with_termite: c.min_price_with_termite || 0,
        min_price_without_termite: c.min_price_without_termite || 0,
      }) as PackagePrice),
    });
  };

  return (
    <form id="package-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: ข้อมูลทั่วไป */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
            <CurrencyDollarIcon className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-800 text-lg">ข้อมูลแพ็กเกจ</h3>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="รหัสแพ็กเกจ *">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ระบุรหัสแพ็กเกจ"
                className={mode === 'edit' ? 'bg-slate-50 font-mono' : 'font-mono'}
                readOnly={mode === 'edit'}
                required
              />
            </FormField>
            <FormField label="หมวดหมู่ *">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                <option value="">เลือกหมวดหมู่</option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="ชื่อแพ็กเกจ *">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น แพ็กเกจกำจัดปลวกรายปี (บ้านเดี่ยว)"
                required
              />
            </FormField>
            <FormField label="จำนวนครั้งที่เข้าบริการ *">
              <Input
                type="number"
                value={visitLimit || ''}
                onChange={(e) => setVisitLimit(Number(e.target.value))}
                placeholder="เช่น 4"
                min={1}
                required
              />
            </FormField>
          </div>
          <FormField label="หมายเหตุ">
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับแพ็กเกจ"
            />
          </FormField>
        </div>
      </div>

      {/* Section 2: เงื่อนไขราคา */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
            <CurrencyDollarIcon className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-800 text-lg">เงื่อนไขราคาตามพื้นที่</h3>
        </div>
        <div className="p-6 space-y-4">
          {conditions.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 bg-slate-50">
              <CurrencyDollarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">ยังไม่มีเงื่อนไขราคา กดปุ่ม "เพิ่มเงื่อนไข" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200 table-fixed">
                <colgroup>
                  <col className="w-[4%]" />
                  <col className="w-[10%]" />
                  <col className="w-[16%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[3%]" />
                </colgroup>
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-slate-600">#</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-slate-600">พื้นที่</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-slate-600">หน่วย</th>
                    <th className="px-3 py-3 text-right text-sm font-semibold text-blue-600">ราคาเสนอ (มีปลวก)</th>
                    <th className="px-3 py-3 text-right text-sm font-semibold text-blue-600">ราคาต่ำสุด (มีปลวก)</th>
                    <th className="px-3 py-3 text-right text-sm font-semibold text-emerald-600">ราคาเสนอ (ไม่มีปลวก)</th>
                    <th className="px-3 py-3 text-right text-sm font-semibold text-emerald-600">ราคาต่ำสุด (ไม่มีปลวก)</th>
                    <th className="px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conditions.map((cond, idx) => {
                    const hasError = invalidIndices.includes(idx);
                    return (
                      <tr key={idx} className={hasError ? 'bg-red-50/50' : 'hover:bg-slate-50/50'}>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">{idx + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Input type="number" value={cond.area_range || ''} onChange={(e) => handleConditionChange(idx, 'area_range', e.target.value)} placeholder="150" className="h-9 w-full" required />
                        </td>
                        <td className="px-4 py-3">
                          <Select value={cond.unit_id || ''} onChange={(e) => handleConditionChange(idx, 'unit_id', e.target.value)} className="h-9 w-full" required>
                            <option value="">เลือก</option>
                            {availableUnits.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Input type="number" value={cond.price_with_termite ?? ''} onChange={(e) => handleConditionChange(idx, 'price_with_termite', e.target.value)} onFocus={handlePriceFocus(idx, 'price_with_termite')} placeholder="0.00" step="0.01" className="h-9 w-full" style={{ textAlign: 'right' }} required />
                        </td>
                        <td className="px-4 py-3">
                          <Input type="number" value={cond.min_price_with_termite ?? ''} onChange={(e) => handleConditionChange(idx, 'min_price_with_termite', e.target.value)} onFocus={handlePriceFocus(idx, 'min_price_with_termite')} placeholder="0.00" step="0.01" className={`h-9 w-full ${hasError ? 'border-red-300' : ''}`} style={{ textAlign: 'right' }} required />
                        </td>
                        <td className="px-4 py-3">
                          <Input type="number" value={cond.price_without_termite ?? ''} onChange={(e) => handleConditionChange(idx, 'price_without_termite', e.target.value)} onFocus={handlePriceFocus(idx, 'price_without_termite')} placeholder="0.00" step="0.01" className="h-9 w-full" style={{ textAlign: 'right' }} required />
                        </td>
                        <td className="px-4 py-3">
                          <Input type="number" value={cond.min_price_without_termite ?? ''} onChange={(e) => handleConditionChange(idx, 'min_price_without_termite', e.target.value)} onFocus={handlePriceFocus(idx, 'min_price_without_termite')} placeholder="0.00" step="0.01" className={`h-9 w-full ${hasError ? 'border-red-300' : ''}`} style={{ textAlign: 'right' }} required />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button type="button" onClick={() => handleRemoveCondition(idx)} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Error summary */}
          {invalidIndices.length > 0 && (
            <p className="text-xs text-red-500 text-right">{invalidIndices.length} รายการมีข้อผิดพลาด: ราคาต่ำสุดสูงกว่าราคาเสนอ</p>
          )}

          {/* Add button */}
          <div className="flex justify-center mt-2">
            <button type="button" onClick={handleAddCondition} className="flex items-center gap-2 px-6 py-2.5 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 hover:shadow-sm transition-all font-medium">
              <PlusIcon className="w-5 h-5" /> เพิ่มเงื่อนไข
            </button>
          </div>
        </div>
      </div>

    </form>
  );
};

export default PackageForm;
