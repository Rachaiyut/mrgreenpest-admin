import React, { useState, useEffect } from 'react';
import { FormField, Input } from '../../common/FormControls';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';
import { Supplier } from '@/src/types/entity/supplier.interface';
import { SupplierType } from '@/src/types/enums/customer';

interface SupplierFormProps {
  mode: 'create' | 'edit';
  initialValues?: Supplier | null;
  onSubmit: (data: Partial<Supplier>) => void | Promise<void>;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
  mode,
  initialValues,
  onSubmit,
}) => {
  const [supplierType, setSupplierType] = useState<'บุคคลธรรมดา' | 'นิติบุคคล'>('นิติบุคคล');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [phones, setPhones] = useState(['']);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name || '',
        tax_id: initialValues.tax_id || '',
        contact_name: (initialValues as unknown as Record<string, string>).contact_name || '',
        email: initialValues.email || '',
      });
      const loadedPhones = [initialValues.phone, initialValues.phone_2, initialValues.phone_3]
        .filter((p): p is string => !!p && p.trim().length > 0);
      setPhones(loadedPhones.length > 0 ? loadedPhones : ['']);
      setSupplierType(initialValues.type === 'INDIVIDUAL' ? 'บุคคลธรรมดา' : 'นิติบุคคล');
    } else {
      setFormData({});
      setPhones(['']);
      setSupplierType('นิติบุคคล');
    }
    setErrors({});
  }, [initialValues]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = value;
    setPhones(newPhones);
    if (index === 0 && errors.phone) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) {
      newErrors.name = supplierType === 'นิติบุคคล' ? 'กรุณากรอกชื่อบริษัท' : 'กรุณากรอกชื่อ-นามสกุล';
    }
    if (supplierType === 'นิติบุคคล' && !formData.tax_id?.trim()) {
      newErrors.tax_id = 'กรุณากรอกเลขประจำตัวผู้เสียภาษี';
    }
    if (!phones[0]?.trim()) {
      newErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => {
        const el = document.querySelector('.text-red-500.text-xs');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      name: formData.name,
      type: (supplierType === 'นิติบุคคล' ? 'CORPORATE' : 'INDIVIDUAL') as SupplierType,
      tax_id: formData.tax_id || undefined,
      phone: phones[0],
      phone_2: phones[1]?.trim() || undefined,
      phone_3: phones[2]?.trim() || undefined,
      email: formData.email,
      ...(supplierType === 'นิติบุคคล' ? { contact_name: formData.contact_name } : {}),
    });
  };

  return (
    <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label={supplierType === 'นิติบุคคล' ? 'เลขประจำตัวผู้เสียภาษี *' : 'เลขประจำตัวผู้เสียภาษี'} htmlFor="tax_id">
          <Input name="tax_id" type="text" value={formData.tax_id || ''} onChange={handleChange} />
          {errors.tax_id && <p className="text-red-500 text-xs mt-1">{errors.tax_id}</p>}
        </FormField>
        <FormField label="ประเภทผู้จัดจำหน่าย">
          <div className={`flex rounded-lg bg-slate-100 p-1 w-full ${mode === 'edit' ? 'opacity-60' : ''}`}>
            <label className={`relative flex-1 ${mode === 'edit' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="radio"
                className="sr-only peer"
                checked={supplierType === 'บุคคลธรรมดา'}
                onChange={() => setSupplierType('บุคคลธรรมดา')}
                disabled={mode === 'edit'}
              />
              <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">บุคคลธรรมดา</span>
            </label>
            <label className={`relative flex-1 ${mode === 'edit' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="radio"
                className="sr-only peer"
                checked={supplierType === 'นิติบุคคล'}
                onChange={() => setSupplierType('นิติบุคคล')}
                disabled={mode === 'edit'}
              />
              <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">นิติบุคคล</span>
            </label>
          </div>
        </FormField>
      </div>

      <FormField label={supplierType === 'นิติบุคคล' ? 'ชื่อบริษัท *' : 'ชื่อ-นามสกุล *'} htmlFor="name">
        <Input name="name" type="text" value={formData.name || ''} onChange={handleChange} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </FormField>

      {supplierType === 'นิติบุคคล' && (
        <FormField label="ชื่อผู้ติดต่อ" htmlFor="contact_name">
          <Input name="contact_name" type="text" value={formData.contact_name || ''} onChange={handleChange} />
        </FormField>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="เบอร์โทรศัพท์ *">
          <div className="space-y-2">
            {phones.map((phone, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input type="tel" value={phone} onChange={(e) => handlePhoneChange(index, e.target.value)} placeholder={`เบอร์โทรศัพท์ ${index + 1}`} />
                {index > 0 && (
                  <button type="button" onClick={() => setPhones(phones.filter((_, i) => i !== index))} className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
            {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
            {phones.length < 3 && (
              <button type="button" onClick={() => setPhones([...phones, ''])} className="text-sm text-primary hover:underline flex items-center gap-1">
                <PlusIcon className="h-4 w-4" />เพิ่มเบอร์โทรศัพท์
              </button>
            )}
          </div>
        </FormField>
        <FormField label="อีเมล" htmlFor="email">
          <Input name="email" type="email" value={formData.email || ''} onChange={handleChange} />
        </FormField>
      </div>
    </form>
  );
};
