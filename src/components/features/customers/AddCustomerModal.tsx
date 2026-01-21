import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../common/Modal';
import {
  FormField,
  Input,
  Select,
  Textarea,
  Button,
} from '../../common/FormControls';
import { Customer } from '@/src/types/entity/customer.interface';
import { CustomerType } from '@/src/types/enums/customer.enum';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCustomer: (customerData: Omit<Customer, 'id' | 'code'>) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onCreateCustomer,
}) => {
  const [customerType, setCustomerType] = useState<'บุคคลธรรมดา' | 'นิติบุคคล'>(
    'บุคคลธรรมดา'
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomerType('บุคคลธรรมดา');
      formRef.current?.reset();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const requiredFields = [
      'name',
      'phone',
      'address-street',
      'address-subdistrict',
      'address-district',
      'address-province',
      'address-postalcode',
      'taxId',
    ];
    if (customerType === 'นิติบุคคล') {
      requiredFields.push('contactPerson', 'contactPersonPhone');
    }

    for (const field of requiredFields) {
      if (!data[field]) {
        alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
        return;
      }
    }

    let firstName = data.name as string;
    let lastName = '';

    if (customerType === 'บุคคลธรรมดา') {
      const parts = firstName.trim().split(/\s+/);
      if (parts.length > 1) {
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      }
    }

    const newCustomer: Omit<Customer, 'id' | 'code'> = {
      first_name: firstName,
      last_name: lastName,
      nickname: (data.nickname as string) || '',
      customer_type: customerType === 'บุคคลธรรมดา' ? CustomerType.INDIVIDUAL : CustomerType.CORPORATE,
      email: (data.email as string) || '',
      phone: (data.phone as string) || '',
      address_house_no: data['address-street'] as string,
      sub_district: data['address-subdistrict'] as string,
      district: data['address-district'] as string,
      province: data['address-province'] as string,
      postal_code: data['address-postalcode'] as string,
      country: (data['address-country'] as string) || 'ประเทศไทย',
      tax_id: data.taxId as string,
      created_at: new Date().toISOString(),
      google_map_link: data.googleMapLink as string | undefined,
      status: '' as any,
      updated_at: ''
    };

    onCreateCustomer(newCustomer);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างลูกค้าใหม่"
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
            form="add-customer-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            variant="primary"
          >
            บันทึก
          </Button>
        </div>
      }
    >
      <form
        id="add-customer-form"
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <FormField label="ประเภทลูกค้า">
          <div className="flex rounded-lg bg-slate-100 p-1 w-full">
            <label className="relative flex-1 cursor-pointer">
              <input
                type="radio"
                name="customerTypeRadio"
                value="บุคคลธรรมดา"
                className="sr-only peer"
                checked={customerType === 'บุคคลธรรมดา'}
                onChange={() => setCustomerType('บุคคลธรรมดา')}
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
                checked={customerType === 'นิติบุคคล'}
                onChange={() => setCustomerType('นิติบุคคล')}
              />
              <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">
                นิติบุคคล
              </span>
            </label>
          </div>
        </FormField>

        {customerType === 'บุคคลธรรมดา' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ชื่อ-นามสกุล" htmlFor="name">
                <Input id="name" name="name" type="text" required />
              </FormField>
              <FormField label="ชื่อเล่น" htmlFor="nickname">
                <Input id="nickname" name="nickname" type="text" />
              </FormField>
            </div>
            <FormField label="เพศ" htmlFor="gender">
              <Select id="gender" name="gender">
                <option>ไม่ระบุ</option>
                <option>ชาย</option>
                <option>หญิง</option>
              </Select>
            </FormField>
          </>
        ) : (
          <>
            <FormField label="ชื่อบริษัท" htmlFor="name">
              <Input id="name" name="name" type="text" required />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ชื่อผู้ติดต่อ" htmlFor="contact-person">
                <Input
                  id="contact-person"
                  name="contactPerson"
                  type="text"
                  required
                />
              </FormField>
              <FormField label="เบอร์ผู้ติดต่อ" htmlFor="contact-person-phone">
                <Input
                  id="contact-person-phone"
                  name="contactPersonPhone"
                  type="tel"
                  pattern="[0-9\+\-\(\) ]*"
                  title="กรุณากรอกเฉพาะตัวเลขและสัญลักษณ์ที่เกี่ยวข้องกับเบอร์โทรศัพท์"
                  maxLength={20}
                  required
                />
              </FormField>
            </div>
          </>
        )}

        <FormField label="เลขประจำตัวผู้เสียภาษี" htmlFor="tax-id">
          <Input id="tax-id" name="taxId" type="text" required />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="โทรศัพท์ (หลัก)" htmlFor="phone">
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              pattern="[0-9\+\-\(\) ]*"
              title="กรุณากรอกเฉพาะตัวเลขและสัญลักษณ์ที่เกี่ยวข้องกับเบอร์โทรศัพท์"
              maxLength={20}
            />
          </FormField>
          <FormField label="เบอร์มือถือ" htmlFor="mobilePhone">
            <Input
              id="mobilePhone"
              name="mobilePhone"
              type="tel"
              pattern="[0-9\+\-\(\) ]*"
              title="กรุณากรอกเฉพาะตัวเลขและสัญลักษณ์ที่เกี่ยวข้องกับเบอร์โทรศัพท์"
              maxLength={20}
            />
          </FormField>
          <FormField label="อีเมล" htmlFor="email">
            <Input id="email" name="email" type="email" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="เบอร์โทรศัพท์ 3 (เพิ่มเติม)" htmlFor="phone3">
            <Input
              id="phone3"
              name="phone3"
              type="tel"
              pattern="[0-9\+\-\(\) ]*"
              title="กรุณากรอกเฉพาะตัวเลขและสัญลักษณ์ที่เกี่ยวข้องกับเบอร์โทรศัพท์"
              maxLength={20}
            />
          </FormField>
          <FormField label="เบอร์โทรศัพท์ 4 (เพิ่มเติม)" htmlFor="phone4">
            <Input
              id="phone4"
              name="phone4"
              type="tel"
              pattern="[0-9\+\-\(\) ]*"
              title="กรุณากรอกเฉพาะตัวเลขและสัญลักษณ์ที่เกี่ยวข้องกับเบอร์โทรศัพท์"
              maxLength={20}
            />
          </FormField>
          <FormField label="เบอร์โทรศัพท์ 5 (เพิ่มเติม)" htmlFor="phone5">
            <Input
              id="phone5"
              name="phone5"
              type="tel"
              pattern="[0-9\+\-\(\) ]*"
              title="กรุณากรอกเฉพาะตัวเลขและสัญลักษณ์ที่เกี่ยวข้องกับเบอร์โทรศัพท์"
              maxLength={20}
            />
          </FormField>
        </div>

        <FormField label="บ้านเลขที่" htmlFor="address-street">
          <Textarea id="address-street" name="address-street" required />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="ซอย" htmlFor="address-soi">
            <Input id="address-soi" name="address-soi" type="text" />
          </FormField>
          <FormField label="ถนน" htmlFor="address-road">
            <Input id="address-road" name="address-road" type="text" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="แขวง/ตำบล" htmlFor="address-subdistrict">
            <Input
              id="address-subdistrict"
              name="address-subdistrict"
              type="text"
              required
            />
          </FormField>
          <FormField label="เขต/อำเภอ" htmlFor="address-district">
            <Input
              id="address-district"
              name="address-district"
              type="text"
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
              required
            />
          </FormField>
          <FormField label="รหัสไปรษณีย์" htmlFor="address-postalcode">
            <Input
              id="address-postalcode"
              name="address-postalcode"
              type="text"
              required
            />
          </FormField>
        </div>
        <FormField label="ประเทศ" htmlFor="address-country">
          <Input
            id="address-country"
            name="address-country"
            type="text"
            defaultValue="ประเทศไทย"
            required
          />
        </FormField>

        <div className="pt-4 mt-4 border-t">
          <h3 className="text-base font-semibold text-slate-800 mb-2">
            กลุ่มเส้นทาง/พื้นที่บริการ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField label="เขต (พื้นที่บริการ)" htmlFor="address-zone">
              <Input id="address-zone" name="address-zone" type="text" />
            </FormField>
            <FormField label="Group" htmlFor="address-group">
              <Input id="address-group" name="address-group" type="text" />
            </FormField>
            <FormField label="สายถนนที่" htmlFor="address-roadLine">
              <Input
                id="address-roadLine"
                name="address-roadLine"
                type="text"
              />
            </FormField>
            <FormField label="ลำดับที่" htmlFor="address-sequence">
              <Input
                id="address-sequence"
                name="address-sequence"
                type="text"
              />
            </FormField>
          </div>
        </div>

        <FormField label="Link Google Map" htmlFor="google-map-link">
          <Input
            id="google-map-link"
            name="googleMapLink"
            type="url"
            placeholder="https://maps.app.goo.gl/..."
          />
        </FormField>
      </form>
    </Modal>
  );
};
