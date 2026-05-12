import React, { useMemo, useState, useEffect, FC } from 'react';
import { FormField, Input, Textarea } from '../../common/FormControls';
import { DropdownSelect } from '../../common';
import { PlusIcon, TrashIcon, CurrencyDollarIcon } from '../../../assets/icons/Icons';
import { Package, PackagePrice, Category, CategoryType, Unit } from '@/src/types';
import { ContractDuration, ContractDurationLabel } from '@/src/types/enums/package';

interface PackageFormProps {
  mode: 'create' | 'edit' | 'view';
  initialValues?: Partial<Package>;
  categories: Category[];
  units: Unit[];
  onSubmit: (data: Partial<Package>) => void | Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  code?: string;
  categoryId?: string;
  name?: string;
  visitLimit?: string;
}

type PriceField =
  | 'area_range'
  | 'unit_id'
  | 'price_with_termite'
  | 'min_price_with_termite'
  | 'price_without_termite'
  | 'min_price_without_termite';

const PackageForm: FC<PackageFormProps> = ({
  mode,
  initialValues,
  categories,
  units,
  onSubmit,
  onCancel,
}) => {
  const readOnly = mode === 'view';
  const [code, setCode] = useState(initialValues?.code || '');
  const [name, setName] = useState(initialValues?.name || '');
  const [categoryId, setCategoryId] = useState(initialValues?.category_id || '');
  const [visitLimit, setVisitLimit] = useState<number>(initialValues?.visit_limit || 0);
  const [contractDuration, setContractDuration] = useState<ContractDuration>(
    initialValues?.contract_duration || ContractDuration.ONE_TIME
  );
  const [remark, setRemark] = useState(initialValues?.remark || '');
  const [conditions, setConditions] = useState<Partial<PackagePrice>[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

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

  const isPriceFieldEmpty = (cond: Partial<PackagePrice>, field: PriceField): boolean => {
    if (field === 'unit_id') return !cond.unit_id;
    const v = (cond as unknown as Record<string, unknown>)[field];
    return v === undefined || v === null || v === '' || Number.isNaN(v);
  };

  const priceFieldHasError = (idx: number, field: PriceField): boolean => {
    if (!submitted) return false;
    const cond = conditions[idx];

    // area_range and unit_id are always required
    if (field === 'area_range' || field === 'unit_id') {
      return isPriceFieldEmpty(cond, field);
    }

    const withTermiteTouched =
      !isPriceFieldEmpty(cond, 'price_with_termite') || !isPriceFieldEmpty(cond, 'min_price_with_termite');
    const withoutTermiteTouched =
      !isPriceFieldEmpty(cond, 'price_without_termite') || !isPriceFieldEmpty(cond, 'min_price_without_termite');

    // Nothing filled yet — highlight all 4 cells so user knows at least one pair is required
    if (!withTermiteTouched && !withoutTermiteTouched) return true;

    // Within a column, both cells must be present once user starts that column
    if (field === 'price_with_termite' || field === 'min_price_with_termite') {
      if (withTermiteTouched && isPriceFieldEmpty(cond, field)) return true;
    }
    if (field === 'price_without_termite' || field === 'min_price_without_termite') {
      if (withoutTermiteTouched && isPriceFieldEmpty(cond, field)) return true;
    }

    // min > price guard (existing rule)
    if (field === 'min_price_with_termite' || field === 'price_with_termite') {
      if (invalidIndices.includes(idx)) return true;
    }
    if (field === 'min_price_without_termite' || field === 'price_without_termite') {
      if (invalidIndices.includes(idx)) return true;
    }
    return false;
  };

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

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!code.trim()) errs.code = 'กรุณากรอกรหัสแพ็กเกจ';
    if (!categoryId) errs.categoryId = 'กรุณาเลือกหมวดหมู่';
    if (!name.trim()) errs.name = 'กรุณากรอกชื่อแพ็กเกจ';
    if (!visitLimit || visitLimit < 1) errs.visitLimit = 'กรุณากรอกจำนวนครั้งที่เข้าบริการ';
    return errs;
  };

  const conditionsIncomplete = useMemo(() => {
    return conditions.some((c) => {
      // area + unit are always required
      if (isPriceFieldEmpty(c, 'area_range') || isPriceFieldEmpty(c, 'unit_id')) return true;

      const withTermitePrice = !isPriceFieldEmpty(c, 'price_with_termite');
      const withTermiteMin = !isPriceFieldEmpty(c, 'min_price_with_termite');
      const withoutTermitePrice = !isPriceFieldEmpty(c, 'price_without_termite');
      const withoutTermiteMin = !isPriceFieldEmpty(c, 'min_price_without_termite');

      const withTermitePairFilled = withTermitePrice && withTermiteMin;
      const withoutTermitePairFilled = withoutTermitePrice && withoutTermiteMin;

      // Must fill at least one pair fully
      if (!withTermitePairFilled && !withoutTermitePairFilled) return true;

      // Within a column, can't fill only one side of the pair
      if (withTermitePrice !== withTermiteMin) return true;
      if (withoutTermitePrice !== withoutTermiteMin) return true;

      return false;
    });
  }, [conditions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate();
    setErrors(errs);
    const hasErrors = Object.keys(errs).length > 0 || invalidIndices.length > 0 || conditionsIncomplete;
    if (hasErrors) {
      setTimeout(() => {
        const el = document.querySelector('.text-red-500.text-xs, .text-xs.text-red-500');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    onSubmit({
      ...initialValues,
      code,
      name,
      category_id: categoryId,
      visit_limit: visitLimit,
      contract_duration: contractDuration,
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

  const errorText = (msg?: string) =>
    msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null;

  const inputErrCls = (_has?: boolean) => '';

  return (
    <form id="package-form" onSubmit={handleSubmit} noValidate className="space-y-6">
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
            <FormField label={readOnly ? 'รหัสแพ็กเกจ' : 'รหัสแพ็กเกจ *'}>
              <Input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (errors.code) setErrors((p) => ({ ...p, code: undefined }));
                }}
                placeholder="กรอกรหัสแพ็กเกจ"
                className={`${mode === 'edit' && !readOnly ? 'bg-slate-50' : ''} ${inputErrCls(!!errors.code)}`}
                readOnly={mode !== 'create' || readOnly}
              />
              {errorText(errors.code)}
            </FormField>
            <FormField label={readOnly ? 'หมวดหมู่' : 'หมวดหมู่ *'}>
              {readOnly ? (
                <Input
                  value={availableCategories.find((c) => c.id === categoryId)?.name || '-'}
                  readOnly
                />
              ) : (
                <DropdownSelect
                  value={categoryId}
                  onChange={(v) => {
                    setCategoryId(v);
                    if (errors.categoryId) setErrors((p) => ({ ...p, categoryId: undefined }));
                  }}
                  placeholder="เลือกหมวดหมู่"
                  options={availableCategories.map((cat) => ({ value: cat.id, label: cat.name }))}
                />
              )}
              {errorText(errors.categoryId)}
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label={readOnly ? 'ชื่อแพ็กเกจ' : 'ชื่อแพ็กเกจ *'}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                }}
                placeholder="เช่น แพ็กเกจกำจัดปลวกรายปี (บ้านเดี่ยว)"
                className={inputErrCls(!!errors.name)}
                readOnly={readOnly}
              />
              {errorText(errors.name)}
            </FormField>
            <FormField label={readOnly ? 'จำนวนครั้งที่เข้าบริการ' : 'จำนวนครั้งที่เข้าบริการ *'}>
              <Input
                type="number"
                value={visitLimit || ''}
                onChange={(e) => {
                  setVisitLimit(Number(e.target.value));
                  if (errors.visitLimit) setErrors((p) => ({ ...p, visitLimit: undefined }));
                }}
                placeholder="เช่น 4"
                min={1}
                className={inputErrCls(!!errors.visitLimit)}
                readOnly={readOnly}
              />
              {errorText(errors.visitLimit)}
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label={readOnly ? 'อายุสัญญา' : 'อายุสัญญา *'}>
              {readOnly ? (
                <Input value={ContractDurationLabel[contractDuration] || '-'} readOnly />
              ) : (
                <DropdownSelect
                  value={contractDuration}
                  onChange={(v) => setContractDuration(v as ContractDuration)}
                  placeholder="เลือกอายุสัญญา"
                  options={Object.values(ContractDuration).map((d) => ({ value: d, label: ContractDurationLabel[d] }))}
                />
              )}
            </FormField>
          </div>
          <FormField label="หมายเหตุ">
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับแพ็กเกจ"
              readOnly={readOnly}
            />
          </FormField>
        </div>
      </div>

      {/* Section 2: เงื่อนไขราคา */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
              <CurrencyDollarIcon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">เงื่อนไขราคาตามพื้นที่</h3>
          </div>
          {!readOnly && (
            <button type="button" onClick={handleAddCondition} className="flex items-center gap-1.5 px-4 py-2 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 hover:shadow-sm transition-all font-medium text-sm">
              <PlusIcon className="w-4 h-4" /> เพิ่มเงื่อนไข
            </button>
          )}
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
                    <th className="px-3 py-3 text-left text-sm font-semibold text-slate-600">ลำดับ</th>
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
                    const minMaxError = invalidIndices.includes(idx);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">{idx + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Input type="number" value={cond.area_range || ''} onChange={(e) => handleConditionChange(idx, 'area_range', e.target.value)} placeholder="150" className={`h-9 w-full ${inputErrCls(priceFieldHasError(idx, 'area_range'))}`} readOnly={readOnly} />
                        </td>
                        <td className="px-4 py-3">
                          {readOnly ? (
                            <Input value={availableUnits.find((u) => u.id === cond.unit_id)?.name || '-'} readOnly className="h-9 w-full" />
                          ) : (
                            <DropdownSelect
                              value={cond.unit_id || ''}
                              onChange={(v) => handleConditionChange(idx, 'unit_id', v)}
                              placeholder="เลือก"
                              options={availableUnits.map((u) => ({ value: u.id, label: u.name }))}
                              className="h-9 w-full"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Input type="number" value={cond.price_with_termite ?? ''} onChange={(e) => handleConditionChange(idx, 'price_with_termite', e.target.value)} onFocus={handlePriceFocus(idx, 'price_with_termite')} placeholder="0.00" step="0.01" className={`h-9 w-full ${inputErrCls(priceFieldHasError(idx, 'price_with_termite'))}`} style={{ textAlign: 'right' }} readOnly={readOnly} />
                        </td>
                        <td className="px-4 py-3">
                          <Input type="number" value={cond.min_price_with_termite ?? ''} onChange={(e) => handleConditionChange(idx, 'min_price_with_termite', e.target.value)} onFocus={handlePriceFocus(idx, 'min_price_with_termite')} placeholder="0.00" step="0.01" className={`h-9 w-full ${inputErrCls(priceFieldHasError(idx, 'min_price_with_termite'))}`} style={{ textAlign: 'right' }} readOnly={readOnly} />
                        </td>
                        <td className="px-4 py-3">
                          <Input type="number" value={cond.price_without_termite ?? ''} onChange={(e) => handleConditionChange(idx, 'price_without_termite', e.target.value)} onFocus={handlePriceFocus(idx, 'price_without_termite')} placeholder="0.00" step="0.01" className={`h-9 w-full ${inputErrCls(priceFieldHasError(idx, 'price_without_termite'))}`} style={{ textAlign: 'right' }} readOnly={readOnly} />
                        </td>
                        <td className="px-4 py-3">
                          <Input type="number" value={cond.min_price_without_termite ?? ''} onChange={(e) => handleConditionChange(idx, 'min_price_without_termite', e.target.value)} onFocus={handlePriceFocus(idx, 'min_price_without_termite')} placeholder="0.00" step="0.01" className={`h-9 w-full ${inputErrCls(priceFieldHasError(idx, 'min_price_without_termite'))}`} style={{ textAlign: 'right' }} readOnly={readOnly} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          {!readOnly && (
                            <button type="button" onClick={() => handleRemoveCondition(idx)} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
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
          {submitted && conditionsIncomplete && (
            <p className="text-xs text-red-500 text-right">กรุณากรอกราคาเสนอและราคาต่ำสุดให้ครบ อย่างน้อย 1 ฝั่ง (มีปลวก หรือ ไม่มีปลวก)</p>
          )}

        </div>
      </div>

    </form>
  );
};

export default PackageForm;
