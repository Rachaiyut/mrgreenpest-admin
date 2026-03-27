import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  FormField,
  Input,
  Textarea,
  Select,
} from '../../common/FormControls';
import { Customer } from '@/src/types/entity/customer.interface';
import { PlusIcon, TrashIcon } from '@/src/assets/icons/Icons';
import { CustomerType } from '@/src/types';

export interface CustomerFormProps {
  mode: 'create' | 'edit';
  initialValues?: Customer | null;
  onSubmit: (data: Omit<Customer, 'id' | 'code'> | Customer) => void;
}

// Flat form data type
type FlatCustomerFormData = Partial<Customer> & {
  name?: string;
  type?: CustomerType;
  contactPerson?: string;
  contactPersonPhone?: string;
  gender?: string;
  primaryPhone?: string;
  mobilePhone?: string;
  'address-street'?: string;
  'address-soi'?: string;
  'address-road'?: string;
  'address-subdistrict'?: string;
  'address-district'?: string;
  'address-province'?: string;
  'address-postalcode'?: string;
  'address-country'?: string;
  'address-zone'?: string;
  'address-group'?: string;
  'address-roadLine'?: string;
  'address-sequence'?: string;
  googleMapLink?: string;
  taxId?: string;
  emaรl?: string;
};

const SectionHeader = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) => (
  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
    <div className="p-2 bg-primary/10 text-primary rounded-lg flex-shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="text-lg font-bold text-slate-800 leading-none">{title}</h3>
      {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
    </div>
  </div>
);

export const CustomerForm: React.FC<CustomerFormProps> = ({
  mode,
  initialValues,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<FlatCustomerFormData>({
    type: CustomerType.INDIVIDUAL,
    'address-country': 'ประเทศไทย',
  });

  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);

  useEffect(() => {
    if (mode === 'edit' && initialValues) {
      const phones: string[] = [];
      if (initialValues.phone_3) phones.push(initialValues.phone_3);
      if (initialValues.phone_4) phones.push(initialValues.phone_4);
      if (initialValues.phone_5) phones.push(initialValues.phone_5);
      if (initialValues.phone_6) phones.push(initialValues.phone_6);

      setAdditionalPhones(phones);

      setFormData({
        ...initialValues,
        name: initialValues.type === CustomerType.CORPORATE ? initialValues.first_name : '',
        type: initialValues.type,
        gender: (initialValues as any).gender || (initialValues as any).gendder || '',
        contactPerson: (initialValues as any).contact_person || '',
        contactPersonPhone: (initialValues as any).contact_person_phone || '',
        'address-street': initialValues.address_house_no,
        'address-soi': initialValues.address_soi || '',
        'address-road': initialValues.address_road || '',
        'address-subdistrict': initialValues.sub_district,
        'address-district': initialValues.district,
        'address-province': initialValues.province,
        'address-postalcode': initialValues.postal_code,
        'address-country': initialValues.country || 'ประเทศไทย',
        'address-zone': initialValues.service_area || '',
        'address-group': initialValues.service_group || '',
        'address-roadLine': initialValues.road_line || '',
        'address-sequence': initialValues.sequence_no || '',
        googleMapLink: initialValues.google_map_link,
        taxId: initialValues.tax_id,
        primaryPhone: initialValues.primary_phone || '',
        mobilePhone: (initialValues as any).mobile_phone || '',
      });
    } else if (mode === 'create') {
      setFormData({
        type: CustomerType.INDIVIDUAL,
        'address-country': 'ประเทศไทย',
      });
      setAdditionalPhones([]);
    }
  }, [mode, initialValues]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (type: CustomerType) => {
    setFormData((prev) => ({ ...prev, type: type }));
  };

  // 🟢 ฟังก์ชันกรองเฉพาะตัวเลข และจำกัด 10 หลัก (สำหรับเบอร์หลัก, มือถือ, เบอร์ผู้ติดต่อ)
  const handlePhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: string
  ) => {
    const value = e.target.value.slice(0, 20);
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleAddAdditionalPhone = () => {
    if (additionalPhones.length < 4) {
      setAdditionalPhones([...additionalPhones, '']);
    }
  };

  const handleRemoveAdditionalPhone = (index: number) => {
    setAdditionalPhones(additionalPhones.filter((_, i) => i !== index));
  };

  // 🟢 ฟังก์ชันกรองเฉพาะตัวเลข และจำกัด 10 หลัก (สำหรับเบอร์สำรอง)
  const handleAdditionalPhoneChange = (index: number, value: string) => {
    const newPhones = [...additionalPhones];
    newPhones[index] = value.slice(0, 20);
    setAdditionalPhones(newPhones);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields = [
      'primaryPhone',
      'address-street',
      'address-subdistrict',
      'address-district',
      'address-province',
      'address-postalcode',
    ];

    if (formData.type === CustomerType.INDIVIDUAL) {
      requiredFields.push('first_name', 'last_name');
    } else if (formData.type === CustomerType.CORPORATE) {
      requiredFields.push('name');
    }

    for (const field of requiredFields) {
      if (!formData[field as keyof FlatCustomerFormData]) {
        Swal.fire({ icon: 'warning', title: 'กรุณาตรวจสอบ', text: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (รวมถึงเบอร์หลักและอีเมล)' });
        return;
      }
    }

    let firstName = '';
    let lastName = '';

    if (formData.type === CustomerType.INDIVIDUAL) {
      firstName = formData.first_name || '';
      lastName = formData.last_name || '';
    } else {
      firstName = formData.name || '';
    }

    const payloadData: any = {
      ...initialValues,
      first_name: firstName,
      last_name: lastName,
      type: formData.type,
      nickname: formData.nickname || '',
      email: formData.email || undefined,
      phone: formData.primaryPhone || '',
      primary_phone: formData.primaryPhone || '',
      mobile_phone: formData.mobilePhone || '',
      phone_3: additionalPhones[0] || undefined,
      phone_4: additionalPhones[1] || undefined,
      phone_5: additionalPhones[2] || undefined,
      phone_6: additionalPhones[3] || undefined,
      address_house_no: formData['address-street'] || '',
      address_soi: formData['address-soi'] || '',
      address_road: formData['address-road'] || '',
      sub_district: formData['address-subdistrict'] || '',
      district: formData['address-district'] || '',
      province: formData['address-province'] || '',
      postal_code: formData['address-postalcode'] || '',
      country: formData['address-country'] || 'ประเทศไทย',
      tax_id: formData.taxId,
      google_map_link: formData.googleMapLink,
      gendder: formData.gender || 'ไม่ระบุ',
      road_line: formData['address-roadLine'] || '',
      sequence_no: formData['address-sequence'] ? Number(formData['address-sequence']) : null,
      service_area: formData['address-zone'] || '',
      service_group: formData['address-group'] || '',
    };

    // หากองค์กรมีข้อมูลผู้ติดต่อเพิ่มเติม
    if (formData.type === CustomerType.CORPORATE) {
      payloadData.contact_person = formData.contactPerson || '';
      payloadData.contact_person_phone = formData.contactPersonPhone || '';
    }

    if (mode === 'create') {
      payloadData.created_at = new Date().toISOString();
      payloadData.status = '';
      payloadData.updated_at = '';
      payloadData.assessments = [];
      payloadData.contracts = [];
    }

    onSubmit(payloadData);
  };

  return (
    <form id="customer-form" onSubmit={handleSave} className="space-y-6 bg-slate-50/50 p-2">
      
      {/* 📌 SECTION 1: ข้อมูลทั่วไป */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <SectionHeader
          title="ข้อมูลทั่วไป"
          description="ประเภทลูกค้าและรายละเอียดส่วนตัวหรือองค์กร"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />

        <div className="space-y-5">
          <FormField label="ประเภทลูกค้า">
            <div className={`flex rounded-xl bg-slate-100 p-1 w-full sm:w-80 ${mode === 'edit' ? 'opacity-60 pointer-events-none' : ''}`}>
              <label className={`relative flex-1 ${mode === 'edit' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="customerTypeRadio"
                  value={CustomerType.INDIVIDUAL}
                  className="sr-only peer"
                  checked={formData.type === CustomerType.INDIVIDUAL}
                  onChange={() => handleTypeChange(CustomerType.INDIVIDUAL)}
                  disabled={mode === 'edit'}
                />
                <span className="block w-full text-center py-2 px-3 rounded-lg text-sm font-semibold text-slate-600 peer-checked:bg-white peer-checked:text-primary peer-checked:shadow-sm transition-all duration-200">
                  บุคคลธรรมดา
                </span>
              </label>
              <label className={`relative flex-1 ${mode === 'edit' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="customerTypeRadio"
                  value={CustomerType.CORPORATE}
                  className="sr-only peer"
                  checked={formData.type === CustomerType.CORPORATE}
                  onChange={() => handleTypeChange(CustomerType.CORPORATE)}
                  disabled={mode === 'edit'}
                />
                <span className="block w-full text-center py-2 px-3 rounded-lg text-sm font-semibold text-slate-600 peer-checked:bg-white peer-checked:text-primary peer-checked:shadow-sm transition-all duration-200">
                  นิติบุคคล
                </span>
              </label>
            </div>
          </FormField>

          {formData.type === CustomerType.INDIVIDUAL ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField label="ชื่อจริง" htmlFor="first_name">
                  <Input id="first_name" name="first_name" type="text" value={formData.first_name || ''} onChange={handleChange} required />
                </FormField>
                <FormField label="นามสกุล" htmlFor="last_name">
                  <Input id="last_name" name="last_name" type="text" value={formData.last_name || ''} onChange={handleChange} required />
                </FormField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FormField label="ชื่อเล่น" htmlFor="nickname">
                  <Input id="nickname" name="nickname" type="text" value={formData.nickname || ''} onChange={handleChange} />
                </FormField>
                <FormField label="เพศ" htmlFor="gender">
                  <Select id="gender" name="gender" value={formData.gender || 'ไม่ระบุ'} onChange={handleChange}>
                    <option>ไม่ระบุ</option>
                    <option>ชาย</option>
                    <option>หญิง</option>
                  </Select>
                </FormField>
                <FormField label="เลขประจำตัวผู้เสียภาษี" htmlFor="taxId">
                  <Input name="taxId" type="text" value={formData.taxId || ''} onChange={handleChange} className="font-mono" />
                </FormField>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField label="ชื่อบริษัท" htmlFor="name">
                  <Input id="name" name="name" type="text" value={formData.name || ''} onChange={handleChange} required />
                </FormField>
                <FormField label="เลขประจำตัวผู้เสียภาษี" htmlFor="taxId">
                  <Input name="taxId" type="text" value={formData.taxId || ''} onChange={handleChange} className="font-mono" />
                </FormField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <FormField label="ชื่อผู้ติดต่อ " htmlFor="contactPerson">
                  <Input id="contactPerson" name="contactPerson" type="text" value={formData.contactPerson || ''} onChange={handleChange} />
                </FormField>
                <FormField label="เบอร์โทรผู้ติดต่อ" htmlFor="contactPersonPhone">
                  <Input 
                    id="contactPersonPhone" 
                    name="contactPersonPhone" 
                    type="tel" 
                    value={formData.contactPersonPhone || ''} 
                    onChange={(e) => handlePhoneChange(e, 'contactPersonPhone')} 
                    pattern="[0-9]{9,10}" 
                    maxLength={10} 
                    placeholder="08xxxxxxxx"
                    className="font-mono"
                  />
                </FormField>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 📌 SECTION 2: ข้อมูลการติดต่อ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <SectionHeader
          title="ข้อมูลการติดต่อ"
          description="เบอร์โทรศัพท์หลัก, มือถือ, อีเมล และเบอร์สำรอง"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <FormField label="เบอร์โทรศัพท์ (หลัก)" htmlFor="primaryPhone">
            <Input 
              name="primaryPhone" 
              type="text" 
              value={formData.primaryPhone || ''} 
              onChange={(e) => handlePhoneChange(e, 'primaryPhone')} 
              required 
              maxLength={20} 
              className="font-mono" 
              placeholder="08xxxxxxxx"
            />
          </FormField>
          <FormField label="เบอร์มือถือ" htmlFor="mobilePhone">
            <Input 
              name="mobilePhone" 
              type="text" 
              value={formData.mobilePhone || ''} 
              onChange={(e) => handlePhoneChange(e, 'mobilePhone')} 
              maxLength={20} 
              className="font-mono" 
              placeholder="08xxxxxxxx"
            />
          </FormField>
          <FormField label="อีเมล" htmlFor="email">
            <Input name="email" type="email" value={formData.email || ''} onChange={handleChange} />
          </FormField>
        </div>

        {/* 🟢 UI เบอร์โทรศัพท์เพิ่มเติม */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 mt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800">เบอร์โทรศัพท์เพิ่มเติม</h4>
              <p className="text-xs text-slate-500 mt-1">สามารถเพิ่มเบอร์สำรองได้สูงสุด 4 เบอร์</p>
            </div>
            {additionalPhones.length < 4 && (
              <button
                type="button"
                onClick={handleAddAdditionalPhone}
                className="text-sm text-primary hover:text-primary-dark font-semibold flex items-center gap-1.5 bg-white px-3 py-2 rounded-lg border border-primary/20 shadow-sm transition-all hover:bg-primary/5"
              >
                <PlusIcon className="w-4 h-4" /> เพิ่มเบอร์สำรอง
              </button>
            )}
          </div>

          {additionalPhones.length === 0 ? (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-white">
              <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 mb-4 font-medium">ยังไม่มีเบอร์โทรศัพท์สำรอง</p>
              <button
                type="button"
                onClick={handleAddAdditionalPhone}
                className="text-sm text-slate-600 hover:text-primary font-medium flex items-center gap-1.5 bg-slate-100 hover:bg-primary/10 px-5 py-2.5 rounded-lg transition-colors"
              >
                เพิ่มเบอร์โทรศัพท์ตอนนี้
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {additionalPhones.map((phone, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      value={phone}
                      onChange={(e) => handleAdditionalPhoneChange(index, e.target.value)}
                      placeholder="ระบุเบอร์โทรศัพท์สำรอง..."
                      maxLength={20}
                      className="w-full pl-10 font-mono bg-white" 
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAdditionalPhone(index)}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 bg-white border border-slate-200 hover:border-red-200 rounded-lg shadow-sm transition-all flex-shrink-0"
                    title="ลบเบอร์โทร"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 📌 SECTION 3: ข้อมูลที่อยู่ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <SectionHeader
          title="ที่อยู่"
          description="รายละเอียดสถานที่ตั้งของลูกค้า"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />

        <div className="space-y-5">
          <FormField label="บ้านเลขที่ / อาคาร / หมู่บ้าน" htmlFor="address-street">
            <Textarea id="address-street" name="address-street" rows={2} value={formData['address-street'] || ''} onChange={handleChange} required />
          </FormField>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="ซอย" htmlFor="address-soi">
              <Input id="address-soi" name="address-soi" type="text" value={formData['address-soi'] || ''} onChange={handleChange} />
            </FormField>
            <FormField label="ถนน" htmlFor="address-road">
              <Input id="address-road" name="address-road" type="text" value={formData['address-road'] || ''} onChange={handleChange} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="แขวง/ตำบล" htmlFor="address-subdistrict">
              <Input id="address-subdistrict" name="address-subdistrict" type="text" value={formData['address-subdistrict'] || ''} onChange={handleChange} required />
            </FormField>
            <FormField label="เขต/อำเภอ" htmlFor="address-district">
              <Input id="address-district" name="address-district" type="text" value={formData['address-district'] || ''} onChange={handleChange} required />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FormField label="จังหวัด" htmlFor="address-province">
              <Input id="address-province" name="address-province" type="text" value={formData['address-province'] || ''} onChange={handleChange} required />
            </FormField>
            <FormField label="รหัสไปรษณีย์" htmlFor="address-postalcode">
              <Input id="address-postalcode" name="address-postalcode" type="text" value={formData['address-postalcode'] || ''} onChange={handleChange} required className="font-mono" />
            </FormField>
            <FormField label="ประเทศ" htmlFor="address-country">
              <Input id="address-country" name="address-country" type="text" value={formData['address-country'] || ''} onChange={handleChange} required />
            </FormField>
          </div>
        </div>
      </div>

      {/* 📌 SECTION 4: พื้นที่บริการและพิกัด */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <SectionHeader
          title="พื้นที่บริการและพิกัด"
          description="การจัดกลุ่มเส้นทางและตำแหน่งบนแผนที่"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
          <FormField label="เขต (พื้นที่บริการ)" htmlFor="address-zone">
            <Input id="address-zone" name="address-zone" type="text" value={formData['address-zone'] || ''} onChange={handleChange} placeholder="เช่น Zone A" />
          </FormField>
          <FormField label="Group" htmlFor="address-group">
            <Input id="address-group" name="address-group" type="text" value={formData['address-group'] || ''} onChange={handleChange} placeholder="เช่น G1" />
          </FormField>
          <FormField label="สายถนนที่" htmlFor="address-roadLine">
            <Input id="address-roadLine" name="address-roadLine" type="text" value={formData['address-roadLine'] || ''} onChange={handleChange} placeholder="เช่น สาย 1" />
          </FormField>
          <FormField label="ลำดับที่" htmlFor="address-sequence">
            <Input id="address-sequence" name="address-sequence" type="text" value={formData['address-sequence'] || ''} onChange={handleChange} placeholder="เช่น 001" />
          </FormField>
        </div>

        <FormField label="ลิงก์แผนที่ (Google Map)" htmlFor="googleMapLink">
          <Input
            id="googleMapLink"
            name="googleMapLink"
            type="url"
            value={formData.googleMapLink || ''}
            onChange={handleChange}
            placeholder="https://maps.app.goo.gl/..."
            className="pl-10"
            required
          />
        </FormField>
      </div>
    </form>
  );
};