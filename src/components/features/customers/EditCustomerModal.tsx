import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import {
  FormField,
  Input,
  Textarea,
  Select,
  Button,
} from '../../common/FormControls';
import { Status } from '@/src/types/entity/app.interface';
import { Customer } from '@/src/types/entity/customer.interface';
import { CustomerType } from '@/src/types/enums/customer';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onUpdateCustomer: (updatedCustomer: Customer) => void;
}

// Define a type for the flat form state
type FlatCustomerFormData = Partial<Customer> & {
  name?: string;
  type?: CustomerType;
  contactPerson?: string;
  contactPersonPhone?: string;
  gender?: string;
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
  phone3?: string;
  phone4?: string;
  phone5?: string;
  googleMapLink?: string;
  taxId?: string;
  nickname?: string;
  email?: string;
  phone?: string;
};

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onUpdateCustomer,
}) => {
  const [formData, setFormData] = useState<FlatCustomerFormData>({});

  useEffect(() => {
    if (customer) {
      setFormData({
        ...customer,
        name:
          customer.first_name +
          (customer.last_name ? ` ${customer.last_name}` : ''),
        first_name: customer.first_name,
        last_name: customer.last_name,
        type: customer.type,
        'address-street': customer.address_house_no,
        'address-subdistrict': customer.sub_district,
        'address-district': customer.district,
        'address-province': customer.province,
        'address-postalcode': customer.postal_code,
        'address-country': customer.country,
        // Map other fields if they exist in ICustomer or extended interface
        googleMapLink: customer.google_map_link,
        taxId: customer.tax_id,
      });
    }
  }, [customer]);

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (customer) {
      const requiredFields = [
        // 'name',
        'phone',
        'address-street',
        'address-subdistrict',
        'address-district',
        'address-province',
        'address-postalcode',
      ];

      if (formData.type === CustomerType.INDIVIDUAL) {
        requiredFields.push('first_name', 'last_name');
      } else if (formData.type === CustomerType.CORPORATE) {
        requiredFields.push('name'); // Corporate name
      }

      // Check taxId manually since it's not in the requiredFields array for loop but is now required
      if (!formData.taxId) {
        alert('กรุณากรอกเลขประจำตัวผู้เสียภาษี');
        return;
      }

      for (const field of requiredFields) {
        if (!formData[field as keyof FlatCustomerFormData]) {
          alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
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

      const updatedData: Customer = {
        ...customer,
        first_name: firstName,
        last_name: lastName,
        type: formData.type,
        nickname: formData.nickname || '',
        email: formData.email || '',
        phone: formData.phone || '',

        address_house_no: formData['address-street'] || '',
        sub_district: formData['address-subdistrict'] || '',
        district: formData['address-district'] || '',
        province: formData['address-province'] || '',
        postal_code: formData['address-postalcode'] || '',
        country: formData['address-country'] || 'ประเทศไทย',

        tax_id: formData.taxId,
        google_map_link: formData.googleMapLink,
      };

      onUpdateCustomer(updatedData);
    }
    onClose();
  };

  if (!customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="แก้ไขข้อมูลลูกค้า"
      size="2xl"
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
            variant="outline"
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            form="edit-customer-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            variant="primary"
          >
            บันทึกการเปลี่ยนแปลง
          </Button>
        </div>
      }
    >
      <form id="edit-customer-form" onSubmit={handleSave} className="space-y-4">
        <FormField label="ประเภทลูกค้า">
          <div className="flex rounded-lg bg-slate-100 p-1 w-full">
            <label className="relative flex-1 cursor-pointer">
              <input
                type="radio"
                name="customerTypeRadio"
                value="บุคคลธรรมดา"
                className="sr-only peer"
                checked={formData.type === CustomerType.INDIVIDUAL}
                onChange={() => handleTypeChange(CustomerType.INDIVIDUAL)}
              />
              <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">
                บุคคลธรรมดา
              </span>
            </label>
            <label className="relative flex-1 cursor-pointer">
              <input
                type="radio"
                name="customerTypeRadio"
                value="นิติบุคคล"
                className="sr-only peer"
                checked={formData.type === CustomerType.CORPORATE}
                onChange={() => handleTypeChange(CustomerType.CORPORATE)}
              />
              <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">
                นิติบุคคล
              </span>
            </label>
          </div>
        </FormField>

        {formData.type === CustomerType.INDIVIDUAL ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ชื่อจริง" htmlFor="first_name">
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name || ''}
                  onChange={handleChange}
                  required
                />
              </FormField>
              <FormField label="นามสกุล" htmlFor="last_name">
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name || ''}
                  onChange={handleChange}
                  required
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ชื่อเล่น" htmlFor="nickname">
                <Input
                  id="nickname"
                  name="nickname"
                  type="text"
                  value={formData.nickname || ''}
                  onChange={handleChange}
                />
              </FormField>
              <FormField label="เพศ" htmlFor="gender">
                <Select
                  id="gender"
                  name="gender"
                  value={formData.gender || 'ไม่ระบุ'}
                  onChange={handleChange}
                >
                  <option>ไม่ระบุ</option>
                  <option>ชาย</option>
                  <option>หญิง</option>
                </Select>
              </FormField>
            </div>
          </>
        ) : formData.type === CustomerType.CORPORATE ? (
          <>
            <FormField label="ชื่อบริษัท" htmlFor="name">
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name || ''}
                onChange={handleChange}
                required
              />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ชื่อผู้ติดต่อ" htmlFor="contactPerson">
                <Input
                  id="contactPerson"
                  name="contactPerson"
                  type="text"
                  value={formData.contactPerson || ''}
                  onChange={handleChange}
                />
              </FormField>
              <FormField label="เบอร์ผู้ติดต่อ" htmlFor="contactPersonPhone">
                <Input
                  id="contactPersonPhone"
                  name="contactPersonPhone"
                  type="tel"
                  value={formData.contactPersonPhone || ''}
                  onChange={handleChange}
                  pattern="[0-9\+\-\(\) ]*"
                  title="กรุณากรอกเฉพาะตัวเลขและสัญลักษณ์ที่เกี่ยวข้องกับเบอร์โทรศัพท์"
                  maxLength={20}
                />
              </FormField>
            </div>
          </>
        ) : null}

        <FormField label="เลขประจำตัวผู้เสียภาษี" htmlFor="taxId">
          <Input
            name="taxId"
            type="text"
            value={formData.taxId || ''}
            onChange={handleChange}
            required
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="โทรศัพท์ (หลัก)" htmlFor="phone">
            <Input
              name="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={handleChange}
              required
              pattern="[0-9\+\-\(\) ]*"
              title="กรุณากรอกเฉพาะตัวเลขและสัญลักษณ์ที่เกี่ยวข้องกับเบอร์โทรศัพท์"
              maxLength={20}
            />
          </FormField>
          <FormField label="เบอร์มือถือ" htmlFor="mobilePhone">
            <Input
              name="mobilePhone"
              type="tel"
              value={formData.mobilePhone || ''}
              onChange={handleChange}
              pattern="[0-9\+\-\(\) ]*"
              title="กรุณากรอกเฉพาะตัวเลขและสัญลักษณ์ที่เกี่ยวข้องกับเบอร์โทรศัพท์"
              maxLength={20}
            />
          </FormField>
          <FormField label="อีเมล" htmlFor="email">
            <Input
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="เบอร์โทรศัพท์ 3 (เพิ่มเติม)" htmlFor="phone3">
            <Input
              name="phone3"
              type="tel"
              value={formData.phone3 || ''}
              onChange={handleChange}
              pattern="[0-9\+\-\(\) ]*"
              title="กรุณากรอกเฉพาะตัวเลขและสัญลักษณ์ที่เกี่ยวข้องกับเบอร์โทรศัพท์"
              maxLength={20}
            />
          </FormField>
          <FormField label="เบอร์โทรศัพท์ 4 (เพิ่มเติม)" htmlFor="phone4">
            <Input
              name="phone4"
              type="tel"
              value={formData.phone4 || ''}
              onChange={handleChange}
              pattern="[0-9\+\-\(\) ]*"
              title="กรุณากรอกเฉพาะตัวเลขและสัญลักษณ์ที่เกี่ยวข้องกับเบอร์โทรศัพท์"
              maxLength={20}
            />
          </FormField>
          <FormField label="เบอร์โทรศัพท์ 5 (เพิ่มเติม)" htmlFor="phone5">
            <Input
              name="phone5"
              type="tel"
              value={formData.phone5 || ''}
              onChange={handleChange}
              pattern="[0-9\+\-\(\) ]*"
              title="กรุณากรอกเฉพาะตัวเลขและสัญลักษณ์ที่เกี่ยวข้องกับเบอร์โทรศัพท์"
              maxLength={20}
            />
          </FormField>
        </div>

        <FormField label="บ้านเลขที่" htmlFor="address-street">
          <Textarea
            id="address-street"
            name="address-street"
            value={formData['address-street'] || ''}
            onChange={handleChange}
            required
          />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="ซอย" htmlFor="address-soi">
            <Input
              id="address-soi"
              name="address-soi"
              type="text"
              value={formData['address-soi'] || ''}
              onChange={handleChange}
            />
          </FormField>
          <FormField label="ถนน" htmlFor="address-road">
            <Input
              id="address-road"
              name="address-road"
              type="text"
              value={formData['address-road'] || ''}
              onChange={handleChange}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="แขวง/ตำบล" htmlFor="address-subdistrict">
            <Input
              id="address-subdistrict"
              name="address-subdistrict"
              type="text"
              value={formData['address-subdistrict'] || ''}
              onChange={handleChange}
              required
            />
          </FormField>
          <FormField label="เขต/อำเภอ" htmlFor="address-district">
            <Input
              id="address-district"
              name="address-district"
              type="text"
              value={formData['address-district'] || ''}
              onChange={handleChange}
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="จังหวัด" htmlFor="address-province">
            <Input
              id="address-province"
              name="address-province"
              type="text"
              value={formData['address-province'] || ''}
              onChange={handleChange}
              required
            />
          </FormField>
          <FormField label="รหัสไปรษณีย์" htmlFor="address-postalcode">
            <Input
              id="address-postalcode"
              name="address-postalcode"
              type="text"
              value={formData['address-postalcode'] || ''}
              onChange={handleChange}
              required
            />
          </FormField>
        </div>
        <FormField label="ประเทศ" htmlFor="address-country">
          <Input
            id="address-country"
            name="address-country"
            type="text"
            value={formData['address-country'] || ''}
            onChange={handleChange}
            required
          />
        </FormField>

        <div className="pt-4 mt-4 border-t">
          <h3 className="text-base font-semibold text-slate-800 mb-2">
            กลุ่มเส้นทาง/พื้นที่บริการ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField label="เขต (พื้นที่บริการ)" htmlFor="address-zone">
              <Input
                id="address-zone"
                name="address-zone"
                type="text"
                value={formData['address-zone'] || ''}
                onChange={handleChange}
              />
            </FormField>
            <FormField label="Group" htmlFor="address-group">
              <Input
                id="address-group"
                name="address-group"
                type="text"
                value={formData['address-group'] || ''}
                onChange={handleChange}
              />
            </FormField>
            <FormField label="สายถนนที่" htmlFor="address-roadLine">
              <Input
                id="address-roadLine"
                name="address-roadLine"
                type="text"
                value={formData['address-roadLine'] || ''}
                onChange={handleChange}
              />
            </FormField>
            <FormField label="ลำดับที่" htmlFor="address-sequence">
              <Input
                id="address-sequence"
                name="address-sequence"
                type="text"
                value={formData['address-sequence'] || ''}
                onChange={handleChange}
              />
            </FormField>
          </div>
        </div>

        <FormField label="Link Google Map" htmlFor="googleMapLink">
          <Input
            name="googleMapLink"
            type="url"
            value={formData.googleMapLink || ''}
            onChange={handleChange}
            placeholder="https://maps.app.goo.gl/..."
          />
        </FormField>
      </form>
    </Modal>
  );
};
