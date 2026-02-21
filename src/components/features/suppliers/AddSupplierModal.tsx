import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Input } from '../../common/FormControls';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';

// Interface
import { Supplier } from '@/src/types/entity/supplier.interface';
import { SupplierType } from '@/src/types/enums/customer';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSupplier: (supplier: Partial<Supplier>) => void;
  suppliers: Supplier[];
}

export const AddSupplierModal: React.FC<AddSupplierModalProps> = ({
  isOpen,
  onClose,
  onCreateSupplier,
  suppliers,
}) => {
  const [supplierType, setSupplierType] = useState<'บุคคลธรรมดา' | 'นิติบุคคล'>(
    'นิติบุคคล'
  );
  const [phones, setPhones] = useState(['']);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSupplierType('นิติบุคคล');
      setPhones(['']);
      formRef.current?.reset();
    }
  }, [isOpen]);

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = value;
    setPhones(newPhones);
  };

  const addPhoneInput = () => {
    if (phones.length < 3) {
      setPhones([...phones, '']);
    }
  };

  const removePhoneInput = (index: number) => {
    if (phones.length > 1) {
      const newPhones = phones.filter((_, i) => i !== index);
      setPhones(newPhones);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (
      !data['supplier-name'] ||
      !phones[0].trim() ||
      (supplierType === 'นิติบุคคล' && !data['tax-id'])
    ) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    const typeValue = supplierType === 'นิติบุคคล' ? 'CORPORATE' : 'INDIVIDUAL';

    const newSupplier: Partial<Supplier> = {
      name: data['supplier-name'] as string,
      type: typeValue as SupplierType,
      tax_id: (data['tax-id'] as string) || undefined,
      phone: phones[0],
      email: data['email'] as string,
    };

    if (supplierType === 'นิติบุคคล') {
      (newSupplier as any).contact_name = data['contact-person'] as string;
    }

    onCreateSupplier(newSupplier);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างผู้จัดจำหน่ายใหม่"
      size="2xl"
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
            form="add-supplier-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
          >
            บันทึก
          </button>
        </div>
      }
    >
      <form
        id="add-supplier-form"
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="เลขประจำตัวผู้เสียภาษี" htmlFor="tax-id">
            <Input
              name="tax-id"
              id="tax-id"
              type="text"
              required={supplierType === 'นิติบุคคล'}
            />
          </FormField>
          <FormField label="ประเภทผู้จัดจำหน่าย">
            <div className="flex rounded-lg bg-slate-100 p-1 w-full">
              <label className="relative flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="supplierType"
                  value="บุคคลธรรมดา"
                  className="sr-only peer"
                  checked={supplierType === 'บุคคลธรรมดา'}
                  onChange={() => setSupplierType('บุคคลธรรมดา')}
                />
                <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">
                  บุคคลธรรมดา
                </span>
              </label>
              <label className="relative flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="supplierType"
                  value="นิติบุคคล"
                  className="sr-only peer"
                  checked={supplierType === 'นิติบุคคล'}
                  onChange={() => setSupplierType('นิติบุคคล')}
                />
                <span className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium text-slate-800 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm transition-colors">
                  นิติบุคคล
                </span>
              </label>
            </div>
          </FormField>
        </div>

        <FormField
          label={supplierType === 'นิติบุคคล' ? 'ชื่อบริษัท' : 'ชื่อ-นามสกุล'}
          htmlFor="supplier-name"
        >
          <Input name="supplier-name" id="supplier-name" type="text" required />
        </FormField>

        {supplierType === 'นิติบุคคล' && (
          <FormField label="ชื่อผู้ติดต่อ" htmlFor="contact-person">
            <Input name="contact-person" id="contact-person" type="text" />
          </FormField>
        )}

        <FormField label="โทรศัพท์">
          <div className="space-y-2">
            {phones.map((phone, index) => (
              <div key={index + 1} className="flex items-center gap-2">
                <Input
                  name={`phone-${index}`}
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(index, e.target.value)}
                  required={index === 0}
                  placeholder={`เบอร์โทรศัพท์ ${index + 1}${index === 0 ? '*' : ''}`}
                />
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removePhoneInput(index)}
                    className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
            {phones.length < 3 && (
              <button
                type="button"
                onClick={addPhoneInput}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                เพิ่มเบอร์โทรศัพท์
              </button>
            )}
          </div>
        </FormField>

        <FormField label="อีเมล" htmlFor="email">
          <Input name="email" id="email" type="email" />
        </FormField>
      </form>
    </Modal>
  );
};
